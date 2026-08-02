"""Provider local et gratuit via Ollama (http://localhost:11434)."""

from __future__ import annotations

import os

import httpx

DEFAULT_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.1")
DEFAULT_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")


class OllamaProvider:
    def __init__(self, model: str = DEFAULT_MODEL, host: str = DEFAULT_HOST) -> None:
        self.model = model
        self.host = host

    def generate(self, prompt: str) -> str:
        try:
            response = httpx.post(
                f"{self.host}/api/generate",
                json={"model": self.model, "prompt": prompt, "stream": False},
                timeout=300,
            )
            response.raise_for_status()
        except httpx.ConnectError as exc:
            raise RuntimeError(
                "Impossible de joindre Ollama sur "
                f"{self.host}. Installe-le (https://ollama.com) et lance "
                f"`ollama pull {self.model}` puis `ollama serve`."
            ) from exc
        return response.json()["response"].strip()
