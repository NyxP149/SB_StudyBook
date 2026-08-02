"""Audio -> texte, via faster-whisper (local, gratuit, pas de cle API)."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from faster_whisper import WhisperModel

# Tailles dispo: tiny, base, small, medium, large-v3.
# "small" est un bon compromis vitesse/qualite en CPU pour du francais.
DEFAULT_MODEL_SIZE = "small"


@dataclass
class TranscriptSegment:
    start: float
    end: float
    text: str


@dataclass
class TranscriptionResult:
    text: str
    language: str
    segments: list[TranscriptSegment]


def transcribe(
    audio_path: str | Path,
    model_size: str = DEFAULT_MODEL_SIZE,
    language: str | None = "fr",
) -> TranscriptionResult:
    """Transcrit un fichier audio en texte.

    Le modele tourne en local sur CPU par defaut (aucune cle API requise).
    Le premier appel telecharge le modele depuis Hugging Face et le met en cache.
    """
    audio_path = Path(audio_path)
    if not audio_path.exists():
        raise FileNotFoundError(f"Fichier audio introuvable : {audio_path}")

    model = WhisperModel(model_size, device="cpu", compute_type="int8")

    segments_iter, info = model.transcribe(
        str(audio_path),
        language=language,
        vad_filter=True,
    )

    segments = [
        TranscriptSegment(start=s.start, end=s.end, text=s.text.strip())
        for s in segments_iter
    ]
    full_text = " ".join(s.text for s in segments)

    return TranscriptionResult(
        text=full_text,
        language=info.language,
        segments=segments,
    )
