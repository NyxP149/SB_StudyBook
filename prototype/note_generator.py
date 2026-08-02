"""Transcription -> note d'etude structuree, via un provider LLM interchangeable."""

from __future__ import annotations

from providers import NoteProvider

PROMPT_TEMPLATE = """Tu es un assistant qui transforme la transcription d'un discours \
(reunion, assemblee, etude biblique) en une fiche de note d'etude structuree, claire \
et fidele au contenu original. N'invente rien qui ne soit pas dans la transcription.

Produis exactement les sections suivantes, en Markdown :

## Thème / idée principale
Une ou deux phrases resumant le sujet central du discours.

## Résumé
Un resume structure par sections/points (avec des sous-titres si le discours a \
plusieurs parties), qui reprend les idees et l'enchainement du discours.

## Versets cités
La liste des references bibliques citees, avec pour chacune une courte note sur \
son role dans le discours (ex: "Jean 3:16 — utilise pour illustrer l'amour de Dieu").

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
