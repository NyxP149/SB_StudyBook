"""Provider hors-ligne, sans aucune IA : utile pour tester le pipeline
(audio -> transcription -> fichier) sans avoir Ollama ou une cle API.

Ne "comprend" rien : il recopie juste la transcription brute dans le
gabarit, a completer manuellement.
"""

from __future__ import annotations


class StubProvider:
    def generate(self, prompt: str) -> str:
        transcript_marker = "TRANSCRIPTION :\n"
        idx = prompt.find(transcript_marker)
        transcript = prompt[idx + len(transcript_marker):].strip() if idx != -1 else prompt

        return (
            "## Thème / idée principale\n"
            "_(a completer manuellement — provider stub, pas d'IA branchee)_\n\n"
            "## Résumé\n"
            "_(a completer)_\n\n"
            "## Versets cités\n"
            "_(a completer)_\n\n"
            "## Perles spirituelles\n"
            "_(a completer)_\n\n"
            "## Applications personnelles\n"
            "_(a completer)_\n\n"
            "## Transcription brute\n"
            f"{transcript}"
        )
