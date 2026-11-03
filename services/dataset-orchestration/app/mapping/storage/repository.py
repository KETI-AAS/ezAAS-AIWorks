"""저장·이력 관리부 (특허 11절).

요구조건, 레거시 분석 결과, 빌드(매핑 상태), 매핑 명세, 생성 데이터셋, 이력 이벤트를 저장한다.
기본 구현은 로컬 파일(JSON) 저장소이며, DB 스키마(ERD)의 다음 테이블과 1:1 대응되도록 설계했다.

    requirement_set   ↔ model_version.inputs (+ serving_feature)
    legacy_dataset    ↔ legacy_dataset (column_schema = columns)
    dataset_build     ↔ dataset_build (mapping_result = states/candidates)
    mapping_spec      ↔ dataset_build.mapping_result.spec (또는 별도 테이블)
    ai_ready_dataset  ↔ ai_ready_dataset
    history           ↔ audit_log

PostgreSQL/MinIO 로 교체할 때는 Repository 인터페이스만 구현하면 된다.
"""
from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional, Type, TypeVar

from pydantic import BaseModel

from app.mapping.schemas.build import AIReadyDataset, DatasetBuild
from app.mapping.schemas.legacy import LegacyDataset
from app.mapping.schemas.mapping import MappingSpec
from app.mapping.schemas.requirement import RequirementSet

T = TypeVar("T", bound=BaseModel)


class FileRepository:
    COLLECTIONS = {
        "requirements": RequirementSet,
        "legacy": LegacyDataset,
        "builds": DatasetBuild,
        "specs": MappingSpec,
        "datasets": AIReadyDataset,
    }

    def __init__(self, root: Path):
        self.root = Path(root)
        self._lock = threading.RLock()
        for c in (*self.COLLECTIONS, "raw", "outputs", "history"):
            (self.root / c).mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------ 일반
    def _path(self, collection: str, key: str) -> Path:
        safe = "".join(ch for ch in key if ch.isalnum() or ch in "-_.")
        return self.root / collection / f"{safe}.json"

    def save(self, collection: str, key: str, obj: BaseModel) -> None:
        with self._lock:
            p = self._path(collection, key)
            tmp = p.with_suffix(".tmp")
            tmp.write_text(obj.model_dump_json(indent=2), encoding="utf-8")
            tmp.replace(p)

    def load(self, collection: str, key: str, model: Optional[Type[T]] = None) -> Optional[T]:
        p = self._path(collection, key)
        if not p.exists():
            return None
        model = model or self.COLLECTIONS[collection]
        return model.model_validate_json(p.read_text(encoding="utf-8"))

    def list(self, collection: str) -> list[Any]:
        model = self.COLLECTIONS[collection]
        out = []
        for p in sorted((self.root / collection).glob("*.json")):
            try:
                out.append(model.model_validate_json(p.read_text(encoding="utf-8")))
            except Exception:
                continue
        return out

    # ------------------------------------------------------------------ 원천 보존 / 산출물
    def raw_path(self, legacy_dataset_id: str, filename: str) -> Path:
        d = self.root / "raw" / legacy_dataset_id
        d.mkdir(parents=True, exist_ok=True)
        return d / Path(filename).name

    def output_path(self, dataset_id: str, ext: str) -> Path:
        d = self.root / "outputs" / dataset_id
        d.mkdir(parents=True, exist_ok=True)
        return d / f"ai_ready.{ext}"

    # ------------------------------------------------------------------ 이력
    def log(self, action: str, target: str, target_id: str, detail: dict | None = None, actor: str | None = None) -> None:
        rec = {
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "action": action,
            "target": target,
            "target_id": target_id,
            "actor": actor,
            "detail": detail or {},
        }
        with self._lock:
            with open(self.root / "history" / "events.jsonl", "a", encoding="utf-8") as f:
                f.write(json.dumps(rec, ensure_ascii=False, default=str) + "\n")

    def history(self, target_id: Optional[str] = None, limit: int = 200) -> list[dict]:
        p = self.root / "history" / "events.jsonl"
        if not p.exists():
            return []
        rows = [json.loads(l) for l in p.read_text(encoding="utf-8").splitlines() if l.strip()]
        if target_id:
            rows = [r for r in rows if r["target_id"] == target_id or target_id in json.dumps(r["detail"], default=str)]
        return rows[-limit:]

    # ------------------------------------------------------------------ 재사용 검색
    def find_specs(self, requirement_set_id: Optional[str] = None, schema_hash: Optional[str] = None) -> list[MappingSpec]:
        specs = [s for s in self.list("specs") if s.status == "confirmed"]
        if requirement_set_id:
            specs = [s for s in specs if s.target.requirement_set_id == requirement_set_id]
        if schema_hash:
            specs = [s for s in specs if s.source.schema_hash == schema_hash]
        return sorted(specs, key=lambda s: s.created_at, reverse=True)
