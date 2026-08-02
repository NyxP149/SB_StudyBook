# Prototype — audio → transcription → note d'étude

Petit script pour valider le cœur du concept de SB_StudyBook avant de construire
toute l'architecture (backend Spring Boot, frontend React, etc.) : on prend un
fichier audio, on le transcrit avec Whisper (local, gratuit), puis on génère une
note d'étude structurée à partir de la transcription.

## Installation

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

Aucune installation de `ffmpeg` n'est nécessaire : `faster-whisper` embarque
son propre décodage audio via PyAV.

## Utilisation

Sans aucune IA branchée (juste transcription + gabarit à remplir à la main) :

```bash
python main.py samples/mon_discours.mp3
```

Avec génération automatique de la note via un LLM local gratuit (Ollama) :

```bash
# installer Ollama (https://ollama.com), puis :
ollama pull llama3.1
python main.py samples/mon_discours.mp3 --provider ollama
```

Avec l'API Claude (meilleure qualité, payant à l'usage) :

```bash
copy .env.example .env
# renseigner ANTHROPIC_API_KEY dans .env
python main.py samples/mon_discours.mp3 --provider anthropic
```

Options utiles :

- `--model-size tiny|base|small|medium|large-v3` — taille du modèle Whisper
  (défaut `small` ; `tiny`/`base` pour tester vite, `medium`/`large-v3` pour la
  meilleure qualité si le CPU/GPU suit).
- `--language fr` — langue de la transcription (défaut français).

## Résultat

Les fichiers générés arrivent dans `output/` :

- `<nom>.transcript.txt` — transcription brute
- `<nom>.note.md` — note structurée (Thème, Résumé, Versets cités, Perles
  spirituelles, Applications personnelles, Espace notes personnelles)

## Étape suivante

Une fois que la qualité de transcription + génération convient, on construit
l'app autour de ce cœur (backend Spring Boot exposant ces mêmes étapes comme
service, frontend React/PWA, PostgreSQL pour stocker les notes).
