from __future__ import annotations

import hashlib
import math
from importlib import import_module

import numpy as np
import requests

from app.core.config import settings


class EmbeddingEngine:
    @staticmethod
    def _vector_to_list(vector) -> list[float]:
        if vector is None:
            return []
        if isinstance(vector, np.ndarray):
            print("Embedding array shape:", vector.shape)
            print("Embedding array values:", vector)
            return vector.astype(float).tolist()
        return list(vector)

    @staticmethod
    def _normalize_vector(vector: list[float]) -> list[float]:
        vector_values = EmbeddingEngine._vector_to_list(vector)
        if len(vector_values) == 0:
            return []

        array = np.array(vector_values, dtype=float)
        norm = np.linalg.norm(array)
        if norm == 0:
            return array.tolist()
        return (array / norm).tolist()

    @staticmethod
    def _fit_dimension(vector: list[float]) -> list[float]:
        target_dimension = settings.embedding_dimension
        if len(vector) == target_dimension:
            return vector
        if len(vector) > target_dimension:
            return vector[:target_dimension]
        return vector + [0.0] * (target_dimension - len(vector))

    @staticmethod
    def _generate_with_sentence_transformers(text: str) -> list[float]:
        module = import_module("sentence_transformers")
        model = module.SentenceTransformer(settings.sentence_transformer_model)
        vector = model.encode(text, normalize_embeddings=True).tolist()
        return EmbeddingEngine._fit_dimension(vector)

    @staticmethod
    def _embedding_endpoint() -> tuple[str, str] | None:
        if settings.openai_api_key:
            return settings.openai_base_url, settings.openai_api_key
        if settings.openrouter_api_key:
            return settings.openrouter_base_url, settings.openrouter_api_key
        return None

    @staticmethod
    def _build_model_name() -> str:
        if settings.openai_api_key and settings.embedding_model.startswith("openai/"):
            return settings.embedding_model.split("/", 1)[1]
        return settings.embedding_model

    @staticmethod
    def _generate_with_api(text: str) -> list[float]:
        endpoint = EmbeddingEngine._embedding_endpoint()
        if endpoint is None:
            return []

        base_url, api_key = endpoint
        response = requests.post(
            f"{base_url}/embeddings",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": EmbeddingEngine._build_model_name(),
                "input": text[:8000],
            },
            timeout=30,
        )
        response.raise_for_status()
        payload = response.json()
        vector = payload["data"][0]["embedding"]
        return EmbeddingEngine._fit_dimension(EmbeddingEngine._normalize_vector(vector))

    @staticmethod
    def _generate_hash_embedding(text: str) -> list[float]:
        dimension = settings.embedding_dimension
        vector = np.zeros(dimension, dtype=float)

        for token in text.lower().split():
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % dimension
            sign = -1.0 if digest[4] % 2 else 1.0
            vector[index] += sign * (1.0 + math.log1p(len(token)))

        normalized = EmbeddingEngine._normalize_vector(vector.tolist())
        return EmbeddingEngine._fit_dimension(normalized)

    @staticmethod
    def generate(text: str) -> list[float]:
        if not text or not text.strip():
            return []

        provider = settings.embedding_provider
        if provider == "sentence-transformers":
            try:
                return EmbeddingEngine._generate_with_sentence_transformers(text)
            except Exception:
                pass

        if provider in {"api", "openai", "openrouter"}:
            try:
                api_vector = EmbeddingEngine._generate_with_api(text)
                if api_vector:
                    return api_vector
            except Exception:
                pass

        if provider in {"sentence-transformers", "local"}:
            try:
                return EmbeddingEngine._generate_with_sentence_transformers(text)
            except Exception:
                pass

        return EmbeddingEngine._generate_hash_embedding(text)

    @staticmethod
    def generate_safe(text: str) -> list[float]:
        try:
            return EmbeddingEngine.generate(text)
        except Exception:
            return []

    @staticmethod
    def generate_batch(texts: list[str]) -> list[list[float]]:
        return [EmbeddingEngine.generate_safe(text) for text in texts]

    @staticmethod
    def validate_embedding(embedding: list[float], expected_dim: int | None = None) -> bool:
        embedding_values = EmbeddingEngine._vector_to_list(embedding)
        if len(embedding_values) == 0:
            return False
        return len(embedding_values) == (expected_dim or settings.embedding_dimension)
