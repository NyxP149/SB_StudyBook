"""Provider via l'API Gemini (Google AI Studio). Necessite GEMINI_API_KEY.

Cle gratuite sur https://aistudio.google.com/apikey — le tier gratuit suffit
largement pour un usage perso (quotas par minute/jour, pas de carte requise).
"""

from __future__ import annotations

import os

import httpx

DEFAULT_MODEL = os.environ.get("GEMINI_MODEL", "gemini-flash-latest")
API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


class GeminiProvider:
    def __init__(self, model: str = DEFAULT_MODEL) -> None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY manquante. Cree une cle gratuite sur "
                "https://aistudio.google.com/apikey et ajoute-la dans le "
                "fichier .env (voir .env.example)."
            )
        self.api_key = api_key
        self.model = model

    def generate(self, prompt: str) -> str:
        response = httpx.post(
            f"{API_BASE}/{self.model}:generateContent",
            params={"key": self.api_key},
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=300,
        )
        response.raise_for_status()
        data = response.json()
        candidates = data.get("candidates") or []
        if not candidates:
            reason = data.get("promptFeedback", {}).get("blockReason", "raison inconnue")
            raise RuntimeError(f"Gemini n'a renvoye aucune reponse (blocage : {reason}).")
        parts = candidates[0]["content"]["parts"]
        return "".join(part.get("text", "") for part in parts).strip()
