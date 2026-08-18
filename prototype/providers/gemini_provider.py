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
import time
from pathlib import Path

import httpx

DEFAULT_MODEL = os.environ.get("GEMINI_MODEL", "gemini-flash-latest")
API_ROOT = "https://generativelanguage.googleapis.com/v1beta"
API_BASE = f"{API_ROOT}/models"
UPLOAD_URL = "https://generativelanguage.googleapis.com/upload/v1beta/files"

# Gemini renvoie parfois une indisponibilite transitoire (surcharge cote
# Google) sans lien avec la requete elle-meme ; un simple nouvel essai suffit
# generalement. Les erreurs 4xx restantes (cle invalide, requete malformee...)
# ne sont pas transitoires et sont propagees immediatement.
_RETRYABLE_STATUS = {429, 500, 502, 503, 504}
_MAX_ATTEMPTS = 3
_RETRY_BACKOFF_SECONDS = (2, 6)

# generateContent accepte l'audio en inline_data (base64 dans le corps JSON),
# mais c'est limite a ~20 Mo au total cote API. Au-dela, on passe par la Files
# API (upload prealable, puis reference par URI) — jusqu'a 2 Go par fichier,
# les fichiers uploades expirent automatiquement au bout de 48h cote Google.
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
        mime_type = _AUDIO_MIME_TYPES.get(audio_path.suffix.lower(), "audio/webm")
        size = audio_path.stat().st_size

        if size <= MAX_INLINE_AUDIO_BYTES:
            audio_part = {
                "inline_data": {
                    "mime_type": mime_type,
                    "data": base64.b64encode(audio_path.read_bytes()).decode("ascii"),
                }
            }
        else:
            file_info = self._upload_audio_file(audio_path, mime_type)
            audio_part = {"file_data": {"mime_type": mime_type, "file_uri": file_info["uri"]}}

        prompt = (
            "Transcris integralement et fidelement l'audio suivant en texte brut, "
            f"dans la langue parlee (code langue attendu : {language}). Ne resume "
            "pas, ne reformule pas : renvoie uniquement la transcription mot a "
            "mot, sans commentaire ni introduction ni horodatage."
        )
        return self._call_generate_content({"parts": [{"text": prompt}, audio_part]})

    def _upload_audio_file(self, audio_path: Path, mime_type: str) -> dict:
        size = audio_path.stat().st_size
        start = httpx.post(
            UPLOAD_URL,
            params={"key": self.api_key},
            headers={
                "X-Goog-Upload-Protocol": "resumable",
                "X-Goog-Upload-Command": "start",
                "X-Goog-Upload-Header-Content-Length": str(size),
                "X-Goog-Upload-Header-Content-Type": mime_type,
                "Content-Type": "application/json",
            },
            json={"file": {"display_name": audio_path.name}},
            timeout=60,
        )
        start.raise_for_status()
        upload_url = start.headers.get("x-goog-upload-url")
        if not upload_url:
            raise RuntimeError("Gemini n'a pas renvoye d'URL d'upload pour le fichier audio.")

        upload = httpx.post(
            upload_url,
            headers={
                "Content-Length": str(size),
                "X-Goog-Upload-Offset": "0",
                "X-Goog-Upload-Command": "upload, finalize",
            },
            content=audio_path.read_bytes(),
            timeout=300,
        )
        upload.raise_for_status()
        file_info = upload.json()["file"]

        deadline = time.time() + 120
        while file_info.get("state") == "PROCESSING" and time.time() < deadline:
            time.sleep(2)
            check = httpx.get(f"{API_ROOT}/{file_info['name']}", params={"key": self.api_key}, timeout=30)
            check.raise_for_status()
            file_info = check.json()

        if file_info.get("state") != "ACTIVE":
            raise RuntimeError(
                f"Le fichier audio n'a pas pu etre traite par Gemini (etat: {file_info.get('state')})."
            )
        return file_info

    def _call_generate_content(self, content: dict) -> str:
        response = None
        for attempt in range(_MAX_ATTEMPTS):
            response = httpx.post(
                f"{API_BASE}/{self.model}:generateContent",
                params={"key": self.api_key},
                json={"contents": [content]},
                timeout=300,
            )
            if response.status_code in _RETRYABLE_STATUS and attempt < _MAX_ATTEMPTS - 1:
                time.sleep(_RETRY_BACKOFF_SECONDS[attempt])
                continue
            break

        response.raise_for_status()
        data = response.json()
        candidates = data.get("candidates") or []
        if not candidates:
            reason = data.get("promptFeedback", {}).get("blockReason", "raison inconnue")
            raise RuntimeError(f"Gemini n'a renvoye aucune reponse (blocage : {reason}).")
        parts = candidates[0]["content"]["parts"]
        return "".join(part.get("text", "") for part in parts).strip()
