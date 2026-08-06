"""Provider via l'API Gemini (Google AI Studio). Necessite GEMINI_API_KEY.

Cle gratuite sur https://aistudio.google.com/apikey — le tier gratuit suffit
largement pour un usage perso (quotas par minute/jour, pas de carte requise).

Gemini sert aussi de moteur de transcription audio (transcribe_audio),
alternative a Whisper local qui evite de charger faster-whisper/PyTorch en
memoire — utile sur un hebergement contraint en RAM (ex: Render free tier).
"""

from __future__ import annotations

import base64
import os
from pathlib import Path

import httpx

DEFAULT_MODEL = os.environ.get("GEMINI_MODEL", "gemini-flash-latest")
API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

# generateContent accepte l'audio en inline_data (base64 dans le corps JSON),
# limite a ~20 Mo au total cote API. Au-dela, il faudrait passer par la Files
# API (upload + reference par URI) — hors scope pour l'instant.
MAX_INLINE_AUDIO_BYTES = 15 * 1024 * 1024

_AUDIO_MIME_TYPES = {
    ".webm": "audio/webm",
    ".mp3": "audio/mp3",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".mp4": "audio/mp4",
    ".ogg": "audio/ogg",
    ".oga": "audio/ogg",
    ".aac": "audio/aac",
    ".flac": "audio/flac",
}


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
        return self._call_generate_content({"parts": [{"text": prompt}]})

    def transcribe_audio(self, audio_path: str | Path, language: str = "fr") -> str:
        audio_path = Path(audio_path)
        audio_bytes = audio_path.read_bytes()
        if len(audio_bytes) > MAX_INLINE_AUDIO_BYTES:
            raise RuntimeError(
                f"Fichier audio trop volumineux pour la transcription Gemini "
                f"({len(audio_bytes) / 1024 / 1024:.1f} Mo, max "
                f"{MAX_INLINE_AUDIO_BYTES / 1024 / 1024:.0f} Mo). "
                "Utilise un enregistrement plus court, ou le moteur Whisper local."
            )
        mime_type = _AUDIO_MIME_TYPES.get(audio_path.suffix.lower(), "audio/webm")
        encoded = base64.b64encode(audio_bytes).decode("ascii")
        prompt = (
            "Transcris integralement et fidelement l'audio suivant en texte brut, "
            f"dans la langue parlee (code langue attendu : {language}). Ne resume "
            "pas, ne reformule pas : renvoie uniquement la transcription mot a "
            "mot, sans commentaire ni introduction ni horodatage."
        )
        return self._call_generate_content(
            {
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": mime_type, "data": encoded}},
                ]
            }
        )

    def _call_generate_content(self, content: dict) -> str:
        response = httpx.post(
            f"{API_BASE}/{self.model}:generateContent",
            params={"key": self.api_key},
            json={"contents": [content]},
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
