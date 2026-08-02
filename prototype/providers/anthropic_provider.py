"""Provider via l'API Claude (Anthropic). Necessite ANTHROPIC_API_KEY."""

from __future__ import annotations

import os

DEFAULT_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-5")


class AnthropicProvider:
    def __init__(self, model: str = DEFAULT_MODEL) -> None:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY manquante. Ajoute-la dans le fichier .env "
                "(voir .env.example)."
            )
        from anthropic import Anthropic

        self.client = Anthropic(api_key=api_key)
        self.model = model

    def generate(self, prompt: str) -> str:
        message = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
        return "".join(
            block.text for block in message.content if block.type == "text"
        ).strip()
