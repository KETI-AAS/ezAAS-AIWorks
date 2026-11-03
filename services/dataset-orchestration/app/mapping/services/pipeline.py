"""서비스 오케스트레이션: 사용자 확인부(8절) · 매핑·변환 명세 구성부(9절) · 생성/재사용(10~11절).

흐름
  1. parse_requirements      AAS → 모델 입력 요구조건
  2. register_legacy         레거시 데이터 수집·분석(원본 보존)
  3. create_build            Top-K 후보 검색 → 요구조건 기반 적합성 판단 → 우선 추천
  4. review / apply_decisions 추천 근거 제공, 수락/다른 후보 선택/정보 보완(재판단)
  5. confirm                 확정 매핑 → 매핑 명세(MappingSpec)
  6. generate                명세 기반 추출·변환·검증 → AI-Ready 데이터셋
  7. reuse_spec              동일 구조 데이터에 기존 명세 재사용, 변경 영향 항목 재검토
"""
from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

import pandas as pd

from app.mapping.config import Settings
from app.mapping.core import dataset_builder, legacy_analyzer
from app.mapping.core.aas_parser import parse_requirements, requirement_hash
from app.mapping.core.embedding import build_embedding_provider
from app.mapping.core.evaluator import ATTR_LABEL_KO, Evaluator
from app.mapping.core.retriever import resolve_top_k, retrieve_top_k, similarity_for
from app.mapping.core.semantic import (
    SemanticContext,
    SemanticDictionary,
    build_interpreter,
    build_knowledge_graph,
)
from app.mapping.schemas.build import AIReadyDataset, BuildStep, DatasetBuild, GenerateRequest, ValidationReport
from app.mapping.schemas.candidate import CandidateEvaluation, CheckStatus, InputCandidates, Tier, UnitConversion
from app.mapping.schemas.legacy import ColumnMetadataInput, LegacyDataset
from app.mapping.schemas.mapping import (
    ConfirmationInfo,
    DecisionRequest,
    DecisionType,
    InputMappingState,
    MappingEntry,
    MappingSpec,
    PreviewRow,
    ReviewItem,
    ReviewResponse,
    SourceInfo,
    TargetInfo,
    TransformSpec,
    UserDecision,
)
from app.mapping.schemas.requirement import Attr, ModelInputRequirement, RequirementSet
from app.mapping.storage.repository import FileRepository


class NotFound(KeyError):
    pass


class DecisionError(ValueError):
    """사용자 결정이 정책상 허용되지 않음 (409)."""


class NotReady(ValueError):
    """확정/생성 조건 미충족 (409)."""

    def __init__(self, message: str, issues: list[str] | None = None):
        super().__init__(message)
        self.issues = issues or []


def _now() -> datetime:
    return datetime.now(timezone.utc)


class MappingService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.dictionary = SemanticDictionary.load(settings.extra_dictionaries)
        self.kg = build_knowledge_graph(
            self.dictionary, settings.kg_backend,
            uri=settings.neo4j_uri, user=settings.neo4j_user, password=settings.neo4j_password,
        )
        self.interpreter = build_interpreter(settings.interpreter_backend, self.dictionary, self.kg)
        self.ctx = SemanticContext(self.dictionary, self.kg, self.interpreter)
        self.embedding = build_embedding_provider(settings.embedding_backend, settings.embedding_model)
        self.evaluator = Evaluator(self.dictionary, self.kg, settings.allow_numeric_string_cast)
        self.repo = FileRepository(settings.data_dir)
        self._df_cache: dict[str, pd.DataFrame] = {}

    # ===================================================================== 조회 헬퍼
    def get_requirements(self, rid: str) -> RequirementSet:
        r = self.repo.load("requirements", rid)
        if not r:
            raise NotFound(f"requirement set {rid}")
        return r

    def get_legacy(self, lid: str) -> LegacyDataset:
        r = self.repo.load("legacy", lid)
        if not r:
            raise NotFound(f"legacy dataset {lid}")
        return r

    def get_build(self, bid: str) -> DatasetBuild:
        r = self.repo.load("builds", bid)
        if not r:
            raise NotFound(f"build {bid}")
        return r

    def get_spec(self, sid: str) -> MappingSpec:
        r = self.repo.load("specs", sid)
        if not r:
            raise NotFound(f"spec {sid}")
        return r

    def get_dataset(self, did: str) -> AIReadyDataset:
        r = self.repo.load("datasets", did)
        if not r:
            raise NotFound(f"dataset {did}")
        return r

    def load_df(self, lds: LegacyDataset) -> pd.DataFrame:
        if lds.legacy_dataset_id not in self._df_cache:
            if not lds.stored_path:
                raise NotFound("원천 데이터 파일이 보존되어 있지 않습니다")
            self._df_cache[lds.legacy_dataset_id] = legacy_analyzer.read_table(lds.stored_path, lds.file_format or "csv")
        return self._df_cache[lds.legacy_dataset_id]

    # ===================================================================== 1. 요구조건
    def parse_requirements(self, env: dict) -> RequirementSet:
        rs = parse_requirements(env, self.ctx)
        self.repo.save("requirements", rs.requirement_set_id, rs)
        self.repo.log("requirements.parsed", "requirement_set", rs.requirement_set_id,
                      {"inputs": [r.name for r in rs.inputs], "hash": rs.content_hash, "warnings": rs.warnings})
        return rs

    # ===================================================================== 2. 레거시
    def register_legacy(self, data: bytes, filename: str, metadata: Any = None, name: Optional[str] = None) -> LegacyDataset:
        tmp_id = f"lds_{uuid.uuid4().hex[:12]}"
        raw_path = self.repo.raw_path(tmp_id, filename)
        raw_path.write_bytes(data)  # 원천 보존
        ds, df = legacy_analyzer.analyze_legacy_file(self.ctx, data, filename, metadata, name=name, stored_path=str(raw_path))
        ds.legacy_dataset_id = tmp_id
        self._df_cache[tmp_id] = df
        self.repo.save("legacy", tmp_id, ds)
        self.repo.log("legacy.registered", "legacy_dataset", tmp_id,
                      {"file": filename, "rows": ds.record_count, "columns": ds.column_count, "schema_hash": ds.schema_hash})
        return ds

    def supplement_column(self, lid: str, column: str, supplement: ColumnMetadataInput, actor: str | None = None) -> LegacyDataset:
        ds = self.get_legacy(lid)
        if not ds.column(column):
            raise NotFound(f"column {column}")
        ds = legacy_analyzer.reanalyze_with_supplement(self.ctx, ds, self.load_df(ds), column, supplement)
        self.repo.save("legacy", lid, ds)
        self.repo.log("legacy.column_supplemented", "legacy_dataset", lid,
                      {"column": column, "supplement": supplement.model_dump(exclude_none=True)}, actor)
        return ds

    # ===================================================================== 3. 후보 검색·판단
    def _generate_candidates(self, rs: RequirementSet, ds: LegacyDataset, top_k: int) -> dict[str, InputCandidates]:
        retrieved = retrieve_top_k(self.embedding, rs.inputs, ds.columns, top_k, min_similarity=self.settings.min_similarity)
        return {r.input_id: self.evaluator.rank_candidates(r, retrieved.get(r.input_id, []), top_k) for r in rs.inputs}

    def create_build(self, requirement_set_id: str, legacy_dataset_id: str, top_k: Optional[int] = None) -> DatasetBuild:
        rs = self.get_requirements(requirement_set_id)
        ds = self.get_legacy(legacy_dataset_id)
        k = resolve_top_k(top_k, ds.column_count, self.settings.default_top_k)
        build = DatasetBuild(
            build_id=f"bld_{uuid.uuid4().hex[:12]}",
            requirement_set_id=rs.requirement_set_id,
            legacy_dataset_id=ds.legacy_dataset_id,
            top_k=k,
            candidates=self._generate_candidates(rs, ds, k),
            states={r.input_id: InputMappingState(input_id=r.input_id) for r in rs.inputs},
        )
        self.repo.save("builds", build.build_id, build)
        self.repo.log("build.created", "dataset_build", build.build_id, {
            "requirement_set_id": rs.requirement_set_id, "legacy_dataset_id": ds.legacy_dataset_id, "top_k": k,
            "primary": {i: c.primary for i, c in build.candidates.items()},
        })
        return build

    # ===================================================================== 4. 사용자 확인
    def _eval_column(self, req: ModelInputRequirement, ds: LegacyDataset, column: str) -> CandidateEvaluation:
        col = ds.column(column)
        if not col:
            raise DecisionError(f"컬럼 '{column}' 이(가) 레거시 데이터에 없습니다")
        return self.evaluator.evaluate(req, col, similarity_for(self.embedding, req, col), 0)

    def _transform_for(self, req: ModelInputRequirement, ds: LegacyDataset, ev: CandidateEvaluation, state: InputMappingState) -> TransformSpec:
        col = ds.column(ev.column_name)
        src_dtype = col.profile.inferred_dtype if col else "unknown"
        target_dtype = req.attr(Attr.DATA_TYPE).value or (col.attr(Attr.DATA_TYPE).value if col else None) or "string"
        conv = ev.unit_conversion
        req_unit = req.attr(Attr.UNIT).value
        if conv is None and req_unit and state.supplemented.get("unit_assumption") == req_unit:
            q = req.attr(Attr.QUANTITY).value or "unknown"
            conv = UnitConversion(source_unit=req_unit, target_unit=req_unit, quantity=str(q), scale=1.0)
        return TransformSpec(source_dtype=src_dtype, target_dtype=str(target_dtype), unit_conversion=conv, output_column=req.name)

    def _blocking_for(self, req: ModelInputRequirement, ev: CandidateEvaluation, state: InputMappingState) -> list[str]:
        """처리 조건 미해결 → 생성 보류 사유."""
        issues = []
        unit_chk = next(c for c in ev.checks if c.attribute == Attr.UNIT)
        if req.attr(Attr.UNIT).known and unit_chk.status == CheckStatus.INSUFFICIENT and state.supplemented.get("unit_assumption") is None:
            issues.append(f"[{req.name}] 원천 단위 미확인 — 단위 보완 또는 '요구 단위와 동일' 승인 필요")
        if unit_chk.status == CheckStatus.MISMATCH:
            issues.append(f"[{req.name}] 단위 변환 불가 — 처리 조건을 정의할 수 없음 ({unit_chk.message})")
        dt = next(c for c in ev.checks if c.attribute == Attr.DATA_TYPE)
        if dt.status == CheckStatus.MISMATCH:
            issues.append(f"[{req.name}] 자료형 변환 불가 ({dt.message})")
        return issues

    def _apply_one(self, build: DatasetBuild, rs: RequirementSet, ds: LegacyDataset, d: UserDecision, actor: Optional[str]) -> None:
        req = next((r for r in rs.inputs if r.input_id == d.input_id), None)
        if not req:
            raise DecisionError(f"입력항목 '{d.input_id}' 없음")
        cands = build.candidates[d.input_id]
        state = build.states[d.input_id]

        if d.decision == DecisionType.LEAVE_UNMAPPED:
            if req.is_required_input:
                raise DecisionError(f"필수 입력항목 '{req.name}' 은(는) 미매핑으로 둘 수 없습니다")
            build.states[d.input_id] = InputMappingState(input_id=d.input_id, status="unmapped", decision=d, decided_at=_now())
            return

        if d.decision == DecisionType.ACCEPT_RECOMMENDATION:
            if not cands.primary:
                raise DecisionError(f"'{req.name}': 우선 추천 후보가 없습니다 — 다른 후보를 선택하거나 정보를 보완하세요")
            column = cands.primary
        else:
            if not d.column_name:
                raise DecisionError("column_name 이 필요합니다")
            column = d.column_name
            if d.decision == DecisionType.SELECT_CANDIDATE and column not in {c.column_name for c in cands.candidates}:
                raise DecisionError(f"'{column}' 은(는) Top-K 후보가 아닙니다 — select_column 을 사용하세요")

        ev = next((c for c in cands.candidates if c.column_name == column), None) or self._eval_column(req, ds, column)
        supplemented = dict(state.supplemented)
        if d.assume_target_unit and req.attr(Attr.UNIT).known:
            supplemented["unit_assumption"] = req.attr(Attr.UNIT).value

        acknowledged: list[str] = []
        if ev.tier in (Tier.EXCLUDED, Tier.SUSPECTED_MISMATCH):
            if not d.acknowledge_mismatch:
                raise DecisionError(
                    f"'{column}' 은(는) 요구조건 불일치 후보입니다({'; '.join(ev.mismatches)}). "
                    "선택하려면 acknowledge_mismatch=true 로 불일치를 확인했음을 명시하세요"
                )
            acknowledged += ev.mismatches
        acknowledged += [f"미확인: {u}" for u in ev.unknowns]

        new_state = InputMappingState(
            input_id=d.input_id,
            status="confirmed",
            column_name=column,
            decision=d.model_copy(update={"decided_by": d.decided_by or actor}),
            evaluation=ev,
            acknowledged_mismatches=acknowledged,  # 사용자 선택과 별도로 불일치 정보 유지
            supplemented=supplemented,
            decided_at=_now(),
        )
        new_state.blocking_issues = self._blocking_for(req, ev, new_state)
        build.states[d.input_id] = new_state
        # 사용자 선택 컬럼이 후보 목록에 없으면 추가하여 근거 유지
        if column not in {c.column_name for c in cands.candidates}:
            cands.candidates.append(ev)
            build.candidates[d.input_id] = self.evaluator.finalize(req, cands.candidates, cands.top_k)

    def apply_decisions(self, build_id: str, req_body: DecisionRequest) -> ReviewResponse:
        build = self.get_build(build_id)
        if build.current_step == BuildStep.COMPLETED:
            raise DecisionError("이미 데이터셋 생성이 완료된 빌드입니다 — reuse 로 새 빌드를 만드세요")
        rs = self.get_requirements(build.requirement_set_id)
        ds = self.get_legacy(build.legacy_dataset_id)
        actor = req_body.decided_by

        # (a) 정보 보완 먼저 반영 → 전체 재판단
        supplements = [d for d in req_body.decisions if d.supplement is not None]
        for d in supplements:
            if not d.column_name:
                raise DecisionError("정보 보완에는 column_name 이 필요합니다")
            ds = self.supplement_column(ds.legacy_dataset_id, d.column_name, d.supplement, actor)
        if supplements:
            self._refresh_candidates(build, rs, ds)

        # (b) 매핑 결정
        for d in req_body.decisions:
            if d.decision == DecisionType.SUPPLEMENT:
                continue
            self._apply_one(build, rs, ds, d, actor)

        build.current_step = BuildStep.CANDIDATES_READY
        build.spec_id = None  # 결정이 바뀌면 기존 명세는 더 이상 이 빌드의 현재 상태가 아님 → 재확정 필요
        build.updated_at = _now()
        self.repo.save("builds", build.build_id, build)
        self.repo.log("build.decisions", "dataset_build", build.build_id,
                      {"decisions": [d.model_dump(mode="json", exclude_none=True) for d in req_body.decisions]}, actor)
        return self.review(build.build_id)

    def _refresh_candidates(self, build: DatasetBuild, rs: RequirementSet, ds: LegacyDataset) -> None:
        build.candidates = self._generate_candidates(rs, ds, build.top_k)
        for iid, st in build.states.items():
            if st.status != "confirmed" or not st.column_name:
                continue
            req = next(r for r in rs.inputs if r.input_id == iid)
            ev = self._eval_column(req, ds, st.column_name)
            st.evaluation = ev
            st.blocking_issues = self._blocking_for(req, ev, st)
            if ev.tier in (Tier.EXCLUDED, Tier.SUSPECTED_MISMATCH) and not (st.decision and st.decision.acknowledge_mismatch):
                st.status = "pending"
                st.blocking_issues.append(f"[{req.name}] 보완 정보 반영 결과 불일치가 확인되어 재확인 필요: {'; '.join(ev.mismatches)}")
            if st.column_name not in {c.column_name for c in build.candidates[iid].candidates}:
                build.candidates[iid].candidates.append(ev)
                build.candidates[iid] = self.evaluator.finalize(req, build.candidates[iid].candidates, build.top_k)

    def _preview(self, req: ModelInputRequirement, ds: LegacyDataset, ev: Optional[CandidateEvaluation], state: InputMappingState) -> list[PreviewRow]:
        if not ev:
            return []
        try:
            df = self.load_df(ds)
        except NotFound:
            return []
        if ev.column_name not in df.columns:
            return []
        entry = MappingEntry(
            input_id=req.input_id, input_name=req.name, order_index=req.order_index, is_required_input=req.is_required_input,
            source_column=ev.column_name, transform=self._transform_for(req, ds, ev, state),
            confirmation=ConfirmationInfo(decision_type=DecisionType.ACCEPT_RECOMMENDATION, decided_at=_now()),
        )
        try:
            rows = dataset_builder.preview_conversion(df[ev.column_name], entry, self.settings.preview_rows)
        except Exception:
            return []
        return [PreviewRow(**r) for r in rows]

    def review(self, build_id: str) -> ReviewResponse:
        build = self.get_build(build_id)
        rs = self.get_requirements(build.requirement_set_id)
        ds = self.get_legacy(build.legacy_dataset_id)
        items: list[ReviewItem] = []
        blocking: list[str] = []
        for req in rs.inputs:
            cands = build.candidates[req.input_id]
            st = build.states[req.input_id]
            ev = st.evaluation if st.status == "confirmed" else next(
                (c for c in cands.candidates if c.column_name == cands.primary), None)
            requirement = {
                k.value: {
                    "value": a.value,
                    "label": (self.dictionary.get(str(a.value)).label if a.known and self.dictionary.get(str(a.value)) else a.value),
                    "status": a.status.value,
                    "required": a.required,
                    "required_reason": a.required_reason,
                    "evidence": [e.detail for e in a.evidence],
                }
                for k, a in req.attributes.items()
            }
            if req.is_required_input and st.status != "confirmed":
                blocking.append(f"[{req.name}] 필수 입력항목 매핑 미확정 ({cands.message})")
            if st.status == "confirmed":
                blocking += st.blocking_issues
            elif st.status == "pending" and st.blocking_issues:
                blocking += st.blocking_issues
            items.append(ReviewItem(
                input_id=req.input_id,
                input_name=req.name,
                order_index=req.order_index,
                is_required_input=req.is_required_input,
                requirement=requirement,
                requirement_unknowns=[ATTR_LABEL_KO[a] for a in req.missing_attributes],
                candidates=cands,
                state=st,
                preview=self._preview(req, ds, ev, st),
            ))
        blocking = list(dict.fromkeys(blocking))
        return ReviewResponse(build_id=build_id, items=items, ready_to_confirm=not blocking, blocking_issues=blocking)

    # ===================================================================== 5. 매핑 명세
    def confirm(self, build_id: str, decided_by: Optional[str] = None) -> MappingSpec:
        review = self.review(build_id)
        if not review.ready_to_confirm:
            raise NotReady("필수 입력항목의 매핑 또는 처리 조건이 해결되지 않아 매핑 명세를 확정할 수 없습니다", review.blocking_issues)
        build = self.get_build(build_id)
        rs = self.get_requirements(build.requirement_set_id)
        ds = self.get_legacy(build.legacy_dataset_id)
        entries: list[MappingEntry] = []
        for req in rs.inputs:
            st = build.states[req.input_id]
            if st.status == "confirmed" and st.evaluation:
                ev = st.evaluation
                d = st.decision
                entries.append(MappingEntry(
                    input_id=req.input_id,
                    input_name=req.name,
                    order_index=req.order_index,
                    is_required_input=req.is_required_input,
                    target_semantic_id=req.semantic_id,
                    target_aas_path=req.aas_path,
                    source_column=st.column_name,
                    checks=ev.checks,
                    category=ev.category.value,
                    tier=ev.tier.value,
                    similarity=ev.similarity,
                    transform=self._transform_for(req, ds, ev, st),
                    confirmation=ConfirmationInfo(
                        decision_type=d.decision if d else DecisionType.ACCEPT_RECOMMENDATION,
                        decided_by=(d.decided_by if d else None) or decided_by,
                        decided_at=st.decided_at or _now(),
                        acknowledged_mismatches=st.acknowledged_mismatches,
                        supplemented_info={**st.supplemented, **self._user_supplied_info(ds, st.column_name)},
                        comment=d.comment if d else None,
                    ),
                ))
            else:  # 선택 입력 미매핑
                d = st.decision
                entries.append(MappingEntry(
                    input_id=req.input_id, input_name=req.name, order_index=req.order_index,
                    is_required_input=req.is_required_input, target_semantic_id=req.semantic_id,
                    target_aas_path=req.aas_path, source_column=None,
                    confirmation=ConfirmationInfo(
                        decision_type=DecisionType.LEAVE_UNMAPPED, decided_by=(d.decided_by if d else None) or decided_by,
                        decided_at=st.decided_at or _now(),
                    ),
                ))
        prev_version = 0
        if build.reused_from_spec_id:
            prev = self.repo.load("specs", build.reused_from_spec_id)
            prev_version = prev.version if prev else 0
        spec = MappingSpec(
            spec_id=f"spec_{uuid.uuid4().hex[:12]}",
            version=prev_version + 1,
            build_id=build.build_id,
            target=TargetInfo(
                model_name=rs.model_name, model_version=rs.model_version, aas_identifier=rs.aas_identifier,
                submodel_id=rs.submodel_id, requirement_set_id=rs.requirement_set_id, requirement_hash=rs.content_hash,
            ),
            source=SourceInfo(
                legacy_dataset_id=ds.legacy_dataset_id, name=ds.name, source_uri=ds.source_uri,
                connection_type=ds.connection_type, content_hash=ds.content_hash, schema_hash=ds.schema_hash,
            ),
            time_column=ds.time_column,
            entries=entries,
            parent_spec_id=build.reused_from_spec_id,
        )
        spec.spec_hash = self._spec_hash(spec)
        self.repo.save("specs", spec.spec_id, spec)
        build.spec_id = spec.spec_id
        build.current_step = BuildStep.MAPPING_CONFIRMED
        build.updated_at = _now()
        self.repo.save("builds", build.build_id, build)
        self.repo.log("spec.confirmed", "mapping_spec", spec.spec_id, {"build_id": build.build_id, "spec_hash": spec.spec_hash}, decided_by)
        return spec

    @staticmethod
    def _user_supplied_info(ds: LegacyDataset, column: Optional[str]) -> dict:
        col = ds.column(column) if column else None
        if not col:
            return {}
        fields = col.metadata.extra.get("_user_fields", [])
        return {f: getattr(col.metadata, f, None) for f in fields}

    @staticmethod
    def _spec_hash(spec: MappingSpec) -> str:
        payload = {
            "target": spec.target.model_dump(mode="json"),
            "source_schema": spec.source.schema_hash,
            "entries": [
                {"input": e.input_id, "order": e.order_index, "src": e.source_column,
                 "transform": e.transform.model_dump(mode="json") if e.transform else None}
                for e in sorted(spec.entries, key=lambda e: e.order_index)
            ],
            "time_column": spec.time_column,
        }
        return hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest()

    # ===================================================================== 6. 생성·검증
    def generate(self, build_id: str, body: GenerateRequest) -> tuple[Optional[AIReadyDataset], ValidationReport]:
        build = self.get_build(build_id)
        if not build.spec_id:
            raise NotReady("확정된 매핑 명세가 없습니다 — 먼저 confirm 하세요")
        spec = self.get_spec(build.spec_id)
        rs = self.get_requirements(spec.target.requirement_set_id)
        ds = self.get_legacy(spec.source.legacy_dataset_id)
        df = self.load_df(ds)
        processing = body.processing or spec.processing
        out, report, log = dataset_builder.build_dataset(spec, df, rs, processing)
        build.last_validation = report
        build.updated_at = _now()
        if not report.passed:
            build.current_step = BuildStep.VALIDATION_FAILED
            self.repo.save("builds", build.build_id, build)
            self.repo.log("dataset.validation_failed", "dataset_build", build.build_id,
                          {"issues": [i.model_dump() for i in report.issues if i.severity == "error"]})
            return None, report

        fmt = body.output_format.lower()
        did = f"ard_{uuid.uuid4().hex[:12]}"
        path = self.repo.output_path(did, fmt)
        if fmt == "csv":
            out.to_csv(path, index=False)
        elif fmt == "parquet":
            out.to_parquet(path, index=False)
        elif fmt == "json":
            out.to_json(path, orient="records", force_ascii=False, date_format="iso")
        else:
            raise NotReady(f"지원하지 않는 출력 형식: {fmt}")
        content_hash = hashlib.sha256(path.read_bytes()).hexdigest()
        version = str(1 + sum(1 for d in self.repo.list("datasets") if d.spec_id == spec.spec_id))
        dataset = AIReadyDataset(
            ai_ready_dataset_id=did,
            build_id=build.build_id,
            spec_id=spec.spec_id,
            spec_hash=spec.spec_hash,
            name=body.name or f"{ds.name}-ai-ready",
            format=fmt,
            version=version,
            stored_path=str(path),
            content_hash=content_hash,
            record_count=int(len(out)),
            column_count=int(out.shape[1]),
            columns=[str(c) for c in out.columns],
            validation=report,
            lineage={
                "requirement_set_id": rs.requirement_set_id,
                "requirement_hash": rs.content_hash,
                "model": {"name": rs.model_name, "version": rs.model_version, "aas": rs.aas_identifier, "submodel": rs.submodel_id},
                "legacy_dataset_id": ds.legacy_dataset_id,
                "source_content_hash": ds.content_hash,
                "source_schema_hash": ds.schema_hash,
                "spec_id": spec.spec_id,
                "spec_version": spec.version,
                "processing": processing.model_dump(mode="json"),
                "applied": log,
            },
        )
        self.repo.save("datasets", did, dataset)
        build.ai_ready_dataset_id = did
        build.current_step = BuildStep.COMPLETED
        build.completed_at = _now()
        self.repo.save("builds", build.build_id, build)
        self.repo.log("dataset.generated", "ai_ready_dataset", did,
                      {"build_id": build.build_id, "spec_id": spec.spec_id, "rows": dataset.record_count, "hash": content_hash})
        return dataset, report

    # ===================================================================== 7. 재사용·변경 영향
    def reuse_spec(self, spec_id: str, legacy_dataset_id: str, requirement_set_id: Optional[str] = None) -> dict:
        """기존 매핑 명세를 새 데이터(또는 갱신된 요구조건)에 재사용.
        변경되지 않은 항목은 확정 상태를 승계하고, 영향받는 항목만 재검토(pending)로 둔다."""
        spec = self.get_spec(spec_id)
        rs = self.get_requirements(requirement_set_id or spec.target.requirement_set_id)
        ds = self.get_legacy(legacy_dataset_id)
        old_rs = self.repo.load("requirements", spec.target.requirement_set_id)
        old_ds = self.repo.load("legacy", spec.source.legacy_dataset_id)

        build = self.create_build(rs.requirement_set_id, ds.legacy_dataset_id)
        build.reused_from_spec_id = spec.spec_id
        old_entries = {e.input_name: e for e in spec.entries}
        impact: list[dict] = []
        for req in rs.inputs:
            e = old_entries.get(req.name)
            reasons: list[str] = []
            if e is None:
                reasons.append("신규 입력항목 (기존 명세에 없음)")
            else:
                old_req = next((r for r in (old_rs.inputs if old_rs else []) if r.name == req.name), None)
                if old_req and requirement_hash([old_req]) != requirement_hash([req]):
                    reasons.append("모델 입력 요구조건 변경")
                if e.source_column:
                    new_col = ds.column(e.source_column)
                    old_col = old_ds.column(e.source_column) if old_ds else None
                    if not new_col:
                        reasons.append(f"원천 컬럼 '{e.source_column}' 이(가) 새 데이터에 없음")
                    elif old_col:
                        if new_col.profile.inferred_dtype != old_col.profile.inferred_dtype:
                            reasons.append(f"원천 컬럼 자료형 변경 {old_col.profile.inferred_dtype}→{new_col.profile.inferred_dtype}")
                        if new_col.attr(Attr.UNIT).value != old_col.attr(Attr.UNIT).value:
                            reasons.append(f"원천 컬럼 단위 변경 {old_col.attr(Attr.UNIT).value}→{new_col.attr(Attr.UNIT).value}")
            if e is not None and not reasons:
                st = build.states[req.input_id]
                if e.source_column:
                    ev = self._eval_column(req, ds, e.source_column)
                    st.status, st.column_name, st.evaluation = "confirmed", e.source_column, ev
                    st.acknowledged_mismatches = e.confirmation.acknowledged_mismatches
                    st.supplemented = {k: v for k, v in e.confirmation.supplemented_info.items() if k == "unit_assumption"}
                    st.decision = UserDecision(input_id=req.input_id, decision=e.confirmation.decision_type,
                                               column_name=e.source_column,
                                               acknowledge_mismatch=bool(e.confirmation.acknowledged_mismatches),
                                               comment=f"reused from {spec.spec_id}")
                    st.decided_at = _now()
                    st.blocking_issues = self._blocking_for(req, ev, st)
                    if ev.tier == Tier.EXCLUDED and not e.confirmation.acknowledged_mismatches:
                        st.status = "pending"
                        reasons.append("재평가 결과 확인된 불일치")
                else:
                    st.status = "unmapped"
            impact.append({"input_id": req.input_id, "input_name": req.name,
                           "reused": not reasons, "reasons": reasons,
                           "source_column": e.source_column if e else None})
        self.repo.save("builds", build.build_id, build)
        self.repo.log("spec.reused", "dataset_build", build.build_id, {"spec_id": spec.spec_id, "impact": impact})
        return {"build_id": build.build_id, "reused_from_spec_id": spec.spec_id, "impact": impact,
                "needs_review": [i for i in impact if not i["reused"]]}

    def find_reusable_specs(self, requirement_set_id: str, legacy_dataset_id: str) -> list[MappingSpec]:
        ds = self.get_legacy(legacy_dataset_id)
        return self.repo.find_specs(requirement_set_id, ds.schema_hash)
