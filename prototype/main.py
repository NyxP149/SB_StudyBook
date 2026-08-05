"""CLI : audio -> transcription (Whisper) -> note d'etude structuree (LLM).

Usage:
    python main.py chemin/vers/audio.mp3
    python main.py chemin/vers/audio.mp3 --provider ollama
    python main.py chemin/vers/audio.mp3 --provider stub --model-size tiny
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

from note_generator import DEFAULT_SECTIONS, Section, generate_note
from providers import get_provider
from transcriber import DEFAULT_MODEL_SIZE, transcribe

DEFAULT_OUTPUT_DIR = Path(__file__).parent / "output"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("audio", nargs="?", help="Chemin vers le fichier audio a traiter")
    parser.add_argument(
        "--transcript-file",
        help="Chemin vers un texte deja transcrit (.txt). Remplace l'etape audio/Whisper.",
    )
    parser.add_argument(
        "--name",
        help="Nom de base pour les fichiers de sortie (deduit de la source si absent)",
    )
    parser.add_argument(
        "--provider",
        default="stub",
        choices=["ollama", "anthropic", "stub"],
        help="Moteur de generation de note (defaut: stub, sans IA)",
    )
    parser.add_argument(
        "--model-size",
        default=DEFAULT_MODEL_SIZE,
        help="Taille du modele Whisper : tiny, base, small, medium, large-v3 (defaut: small)",
    )
    parser.add_argument(
        "--language",
        default="fr",
        help="Code langue pour la transcription (defaut: fr)",
    )
    parser.add_argument(
        "--output-dir",
        help="Dossier ou ecrire la transcription et la note generees "
        "(defaut: dossier 'output' a cote de ce script).",
    )
    parser.add_argument(
        "--template-file",
        help="Chemin vers un JSON {\"sections\": [{\"title\":..., \"instructions\":...}, ...]} "
        "definissant la structure de la note. Sans cette option, la structure par defaut est utilisee.",
    )
    return parser.parse_args()


def load_sections(template_file: str | None) -> list[Section]:
    if not template_file:
        return DEFAULT_SECTIONS

    data = json.loads(Path(template_file).read_text(encoding="utf-8"))
    sections = [Section(s["title"], s["instructions"]) for s in data["sections"]]
    if not sections:
        raise ValueError("Le template ne definit aucune section.")
    return sections


def main() -> int:
    load_dotenv()
    args = parse_args()

    if not args.audio and not args.transcript_file:
        print("Fournir soit un fichier audio, soit --transcript-file.", file=sys.stderr)
        return 1

    if args.transcript_file:
        transcript_source = Path(args.transcript_file)
        if not transcript_source.exists():
            print(f"Fichier introuvable : {transcript_source}", file=sys.stderr)
            return 1
        stem = args.name or transcript_source.stem
        print(f"[1/3] Lecture de la transcription fournie ({transcript_source.name})...")
        text = transcript_source.read_text(encoding="utf-8")
        print(f"      -> {len(text)} caracteres")
    else:
        audio_path = Path(args.audio)
        if not audio_path.exists():
            print(f"Fichier introuvable : {audio_path}", file=sys.stderr)
            return 1
        stem = args.name or audio_path.stem

        print(f"[1/3] Transcription de {audio_path.name} (modele={args.model_size})...")
        t0 = time.time()
        result = transcribe(audio_path, model_size=args.model_size, language=args.language)
        text = result.text
        print(f"      -> {len(text)} caracteres, langue detectee={result.language} "
              f"({time.time() - t0:.1f}s)")

    output_dir = Path(args.output_dir) if args.output_dir else DEFAULT_OUTPUT_DIR
    output_dir.mkdir(parents=True, exist_ok=True)
    transcript_path = output_dir / f"{stem}.transcript.txt"
    transcript_path.write_text(text, encoding="utf-8")
    print(f"      -> transcription brute sauvee dans {transcript_path}")

    print(f"[2/3] Generation de la note structuree (provider={args.provider})...")
    t0 = time.time()
    provider = get_provider(args.provider)
    sections = load_sections(args.template_file)
    note = generate_note(text, provider, sections)
    print(f"      -> termine ({time.time() - t0:.1f}s)")

    print("[3/3] Sauvegarde...")
    note_path = output_dir / f"{stem}.note.md"
    note_path.write_text(note, encoding="utf-8")
    print(f"      -> note sauvee dans {note_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
