"""Provider hors-ligne, sans aucune IA : utile pour tester le pipeline
(audio -> transcription -> fichier) sans avoir Ollama ou une cle API.

Ne "comprend" rien : il repère les sections demandées dans le prompt (peu
importe le template utilisé) et recopie juste la transcription brute, le
tout à completer manuellement.
"""

from __future__ import annotations

import re


class StubProvider:
    def generate(self, prompt: str) -> str:
        transcript_marker = "TRANSCRIPTION :\n"
        idx = prompt.find(transcript_marker)
        transcript = prompt[idx + len(transcript_marker):].strip() if idx != -1 else prompt
        body_part = prompt[:idx] if idx != -1 else prompt

        titles = re.findall(r"^##\s+(.+)$", body_part, flags=re.MULTILINE)
        if not titles:
            titles = ["Thème / idée principale", "Résumé", "Versets cités", "Perles spirituelles", "Applications personnelles"]

        sections = "\n\n".join(
            f"## {title}\n_(a completer manuellement — provider stub, pas d'IA branchee)_"
            if i == 0
            else f"## {title}\n_(a completer)_"
            for i, title in enumerate(titles)
        )

        return f"{sections}\n\n## Transcription brute\n{transcript}"
