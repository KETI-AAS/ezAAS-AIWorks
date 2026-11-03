"""의미정보 처리부: 의미사전 · 지식그래프 · 해석기(LLM) · 의미 보완."""
from .dictionary import SemanticDictionary, tokenize  # noqa: F401
from .enricher import SemanticContext, enrich_column, enrich_requirement  # noqa: F401
from .interpreter import build_interpreter  # noqa: F401
from .knowledge_graph import InMemoryKnowledgeGraph, Relation, build_knowledge_graph  # noqa: F401
