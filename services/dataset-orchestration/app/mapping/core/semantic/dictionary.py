"""의미사전 (특허 5절).

용어·정의·동의어·약어·단위·개념 식별자를 보관하고, 문자열/토큰을 개념에 연결한다.
기본 시드는 app/resources/semantic_dictionary.json 이며, SEMANTIC_DICTIONARY_PATH 로
기관별 사전(ECLASS/IEC CDD/AAS CD 에서 추출한 사전)을 추가 로드할 수 있다.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, Optional

_DEFAULT_PATH = Path(__file__).resolve().parents[2] / "resources" / "semantic_dictionary.json"

_TOKEN_RE = re.compile(r"[A-Z]+(?=[A-Z][a-z])|[A-Z]?[a-z]+|[A-Z]+|\d+|[가-힣]+|[µμ°%]+")
_HANGUL = re.compile(r"[가-힣]")


def tokenize(text: str) -> list[str]:
    """컬럼명/식별자 토큰화: 구분자, camelCase, 영문-숫자 경계를 분리."""
    if not text:
        return []
    return _TOKEN_RE.findall(str(text))


@dataclass
class Concept:
    concept_id: str
    category: str
    quantity: Optional[str] = None
    default_unit: Optional[str] = None
    names: dict[str, str] = field(default_factory=dict)
    definition: Optional[str] = None
    synonyms: list[str] = field(default_factory=list)
    abbreviations: list[str] = field(default_factory=list)
    external_ids: list[str] = field(default_factory=list)

    @property
    def label(self) -> str:
        return self.names.get("en") or self.concept_id

    def all_names(self) -> list[str]:
        out = list(dict.fromkeys([*self.names.values(), *self.synonyms]))
        return out


@dataclass
class TermMatch:
    concept: Concept
    matched_term: str
    method: str            # exact / synonym / abbreviation / semantic_id / composition
    span: tuple[int, int] = (0, 0)


class SemanticDictionary:
    def __init__(self, data: dict):
        self.version = data.get("version", "0")
        self.concepts: dict[str, Concept] = {}
        for c in data.get("concepts", []):
            c = {k: v for k, v in c.items() if not k.startswith("_")}
            concept = Concept(**c)
            self.concepts[concept.concept_id] = concept
        self.compositions: list[tuple[frozenset[str], str]] = [
            (frozenset(x["parts"]), x["result"]) for x in data.get("compositions", [])
        ]
        self.relations: list[tuple[str, str, str]] = [tuple(r) for r in data.get("relations", [])]
        self._build_index()

    # ------------------------------------------------------------------ load
    @classmethod
    def load(cls, extra_paths: Iterable[str | Path] = ()) -> "SemanticDictionary":
        data = json.loads(_DEFAULT_PATH.read_text(encoding="utf-8"))
        for p in extra_paths:
            if not p:
                continue
            extra = json.loads(Path(p).read_text(encoding="utf-8"))
            data["concepts"] = _merge_concepts(data.get("concepts", []), extra.get("concepts", []))
            data["compositions"] = data.get("compositions", []) + extra.get("compositions", [])
            data["relations"] = data.get("relations", []) + extra.get("relations", [])
        return cls(data)

    def _build_index(self) -> None:
        self._by_external: dict[str, Concept] = {}
        self._phrase: dict[str, Concept] = {}     # 정규화된 동의어 구 → 개념
        self._abbr: dict[str, Concept] = {}       # 약어 → 개념
        for c in self.concepts.values():
            for eid in c.external_ids:
                self._by_external[eid.strip().lower()] = c
            for n in c.all_names():
                self._phrase.setdefault(_norm_phrase(n), c)
            for a in c.abbreviations:
                self._abbr.setdefault(a.lower(), c)
        # 긴 용어 우선 매칭용
        self._phrases_sorted = sorted(self._phrase.items(), key=lambda kv: -len(kv[0]))

    # ------------------------------------------------------------------ lookup
    def get(self, concept_id: Optional[str]) -> Optional[Concept]:
        return self.concepts.get(concept_id) if concept_id else None

    def by_semantic_id(self, semantic_id: Optional[str]) -> Optional[Concept]:
        if not semantic_id:
            return None
        return self._by_external.get(semantic_id.strip().lower())

    def lookup_term(self, term: str) -> Optional[TermMatch]:
        """단일 용어(값) → 개념. AAS 속성값(예: '구동측', 'RMS') 해석에 사용."""
        if not term:
            return None
        key = _norm_phrase(term)
        if key in self._phrase:
            return TermMatch(self._phrase[key], term, "synonym")
        if key.replace(" ", "") in self._abbr:
            return TermMatch(self._abbr[key.replace(" ", "")], term, "abbreviation")
        # 문장형 값이면 텍스트 매칭으로 첫 개념
        found = self.match_text(term)
        return found[0] if found else None

    def match_tokens(self, tokens: list[str]) -> list[TermMatch]:
        """컬럼명 토큰 → 개념 (n-gram 동의어 우선, 이후 약어)."""
        low = [t.lower() for t in tokens]
        used = [False] * len(low)
        out: list[TermMatch] = []
        for n in (3, 2, 1):
            for i in range(0, len(low) - n + 1):
                if any(used[i : i + n]):
                    continue
                gram = low[i : i + n]
                spaced, joined = " ".join(gram), "".join(gram)
                c, method = None, None
                if spaced in self._phrase:
                    c, method = self._phrase[spaced], "synonym"
                elif joined in self._phrase:
                    c, method = self._phrase[joined], "synonym"
                elif joined in self._abbr:
                    c, method = self._abbr[joined], "abbreviation"
                if c:
                    for j in range(i, i + n):
                        used[j] = True
                    out.append(TermMatch(c, "_".join(tokens[i : i + n]), method, (i, i + n)))
        out.sort(key=lambda m: m.span[0])
        return out

    def match_text(self, text: str) -> list[TermMatch]:
        """자연어 설명/정의 → 개념. 긴 용어 우선·비중첩.

        - 한글 용어: 부분문자열 매칭 (띄어쓰기 변형 허용)
        - 영문 용어: 단어 경계 매칭
        - 대문자 약어(예: RMS, DE, NDE)만 약어 사전으로 해석
        """
        if not text:
            return []
        low = text.lower()
        taken = [False] * len(low)
        out: list[TermMatch] = []
        for phrase, c in self._phrases_sorted:
            if len(phrase) < 2:
                continue
            if _HANGUL.search(phrase):
                pattern = re.escape(phrase).replace(r"\ ", r"\s*")
            else:
                pattern = r"(?<![a-z0-9])" + re.escape(phrase).replace(r"\ ", r"[\s\-_]*") + r"(?![a-z0-9])"
            for m in re.finditer(pattern, low):
                s, e = m.span()
                if any(taken[s:e]):
                    continue
                for k in range(s, e):
                    taken[k] = True
                out.append(TermMatch(c, text[s:e], "synonym", (s, e)))
        for m in re.finditer(r"\b[A-Z]{2,5}\b", text):
            s, e = m.span()
            if any(taken[s:e]):
                continue
            c = self._abbr.get(m.group(0).lower())
            if c:
                for k in range(s, e):
                    taken[k] = True
                out.append(TermMatch(c, m.group(0), "abbreviation", (s, e)))
        out.sort(key=lambda m: m.span[0])
        return out

    def compose(self, concept_ids: set[str]) -> list[tuple[str, frozenset[str]]]:
        """조합 규칙: 예) vibration + qw_velocity → vibration_velocity"""
        return [(res, parts) for parts, res in self.compositions if parts <= concept_ids and res not in concept_ids]

    def expand_token(self, token: str) -> str:
        """임베딩 의미 표현용: 약어 토큰을 대표 명칭으로 확장."""
        c = self._abbr.get(token.lower()) or self._phrase.get(token.lower())
        return c.label if c else token


def _norm_phrase(s: str) -> str:
    s = str(s).strip().lower()
    s = re.sub(r"[\s\-_]+", " ", s)
    return s


def _merge_concepts(base: list[dict], extra: list[dict]) -> list[dict]:
    idx = {c["concept_id"]: dict(c) for c in base}
    for c in extra:
        if c["concept_id"] in idx:
            cur = idx[c["concept_id"]]
            for k in ("synonyms", "abbreviations", "external_ids"):
                cur[k] = list(dict.fromkeys(cur.get(k, []) + c.get(k, [])))
            for k, v in c.items():
                if k not in ("synonyms", "abbreviations", "external_ids") and v is not None:
                    cur[k] = v
        else:
            idx[c["concept_id"]] = dict(c)
    return list(idx.values())
