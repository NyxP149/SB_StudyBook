"""Transcription -> note d'etude structuree, via un provider LLM interchangeable."""

from __future__ import annotations

from providers import NoteProvider

PROMPT_TEMPLATE = """Tu es un assistant qui transforme la transcription d'un discours \
(reunion, assemblee, etude biblique) en une fiche de note d'etude structuree, claire \
et fidele au contenu original.

RÈGLE ABSOLUE : n'invente et ne déduis RIEN qui ne soit pas explicitement dans la \
transcription. Si une information demandée n'est pas présente, dis-le clairement au \
lieu de la supposer, l'impliquer ou la compléter à partir de connaissances externes \
(par exemple sur la Bible en général). Il vaut toujours mieux une section vide ou \
"non mentionné" qu'une information ajoutée.

Réponds uniquement avec le contenu Markdown demandé ci-dessous, sans phrase \
d'introduction ni de conclusion, sans commentaire sur ta propre réponse.

Produis exactement les sections suivantes, en Markdown :

## Thème / idée principale
Une ou deux phrases resumant le sujet central du discours.

## Résumé
Un resume structure par sections/points (avec des sous-titres si le discours a \
plusieurs parties), qui reprend les idees et l'enchainement du discours.

## Versets cités
Uniquement les références bibliques (livre + chapitre + verset) prononcées \
explicitement et textuellement dans la transcription, avec pour chacune une courte \
note sur son rôle dans le discours. N'ajoute AUCUNE référence que tu déduirais du \
sujet, du contexte ou de ta connaissance générale de la Bible — seulement celles \
réellement dites. Si aucune référence chiffrée (livre, chapitre, verset) n'est \
prononcée dans la transcription, écris exactement : "Aucun verset n'est cité \
explicitement dans la transcription." et n'ajoute rien d'autre.

## Perles spirituelles
Les phrases ou idees marquantes, formulations fortes ou citations dignes d'etre \
retenues telles quelles.

## Applications personnelles
2 a 4 applications concretes suggerees ou implicites dans le discours, formulees \
comme des pistes d'action pour l'auditeur.

TRANSCRIPTION :
{transcript}
"""


def build_prompt(transcript: str) -> str:
    return PROMPT_TEMPLATE.format(transcript=transcript.strip())


def generate_note(transcript: str, provider: NoteProvider) -> str:
    prompt = build_prompt(transcript)
    body = provider.generate(prompt)
    return f"# ✍️ Espace notes personnelles\n_(a completer par toi)_\n\n---\n\n{body}\n"
