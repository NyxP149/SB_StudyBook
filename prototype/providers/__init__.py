"""Providers interchangeables pour la generation de note structuree.

Chaque provider recoit un prompt (str) et renvoie le texte genere (str).
Ainsi on peut brancher Ollama (local, gratuit), l'API Claude (payant, meilleure
qualite), ou un stub hors-ligne, sans toucher au reste du pipeline.
"""

from __future__ import annotations

from typing import Protocol


class NoteProvider(Protocol):
    def generate(self, prompt: str) -> str: ...


def get_provider(name: str) -> NoteProvider:
    name = name.lower()
    if name == "ollama":
        from .ollama_provider import OllamaProvider

        return OllamaProvider()
    if name == "anthropic":
        from .anthropic_provider import AnthropicProvider

        return AnthropicProvider()
    if name == "stub":
        from .stub_provider import StubProvider

        return StubProvider()
    raise ValueError(f"Provider inconnu : {name!r}. Choix possibles: ollama, anthropic, stub.")
