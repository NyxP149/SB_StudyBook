# SB_StudyBook — Conception

> Vue d'ensemble du projet : vision, architecture technique et décisions structurantes.
> Pour l'historique pas-à-pas des fonctionnalités (avec bugs et correctifs), voir [SB_implementation.md](SB_implementation.md).
> Pour la mise en production, voir [SB_deploy.md](SB_deploy.md).

## 1. Concept

StudyBook (nom de code interne, "powered by JarVyX") est une application qui permet d'**enregistrer un discours** (réunion, assemblée, étude biblique), de le **transcrire automatiquement**, puis de **transformer cette transcription en note d'étude structurée** — sur le modèle des fiches produites manuellement jusque-là (thème, résumé, versets cités, perles spirituelles, applications personnelles...).

Objectifs déclarés dès le départ (`fiche.md`, doc de concept initiale) :
- Progresser en Java / Spring Boot.
- Pratiquer le développement full-stack.
- Apprendre à intégrer l'IA dans une vraie application.
- Créer un outil réellement utilisé au quotidien.

Le projet a largement dépassé son MVP initial (audio → transcription → note) pour devenir une véritable application de prise de notes et d'étude personnelle : dossiers, modèles de notes, comptes utilisateurs, mode hors-ligne, thèmes, programmes d'étude personnelle datés, mise en forme riche du texte, export multi-format.

## 2. Stack technique

| Composant | Techno | Notes |
|---|---|---|
| Backend | Spring Boot 4.1 (Java 21) | REST API, JPA/Hibernate |
| Base de données | PostgreSQL | Neon (serverless) en prod, Docker local en dev (port 5433) |
| Frontend | React 19 + TypeScript + Vite | SPA, pas de framework meta (pas de Next.js) |
| Routing | react-router-dom v7 | |
| i18n | i18next / react-i18next | FR/EN/IT |
| PWA | vite-plugin-pwa | installable, service worker, cache API |
| Transcription | faster-whisper (local) ou Gemini (cloud) | interchangeable |
| LLM (génération de note) | Ollama / Anthropic / Gemini / stub | interchangeable via un système de providers Python |
| Pipeline audio→note | Script Python (`prototype/`) | invoqué par le backend via `ProcessBuilder` |

Pas de monorepo tooling (pnpm workspaces, Turborepo...) : trois dossiers indépendants au niveau du repo — `prototype/` (Python), `backend/` (Java), `frontend/` (TypeScript) — reliés uniquement par convention de chemins et par le `Dockerfile` du backend qui embarque `prototype/` au build.

## 3. Architecture générale

```
┌─────────────┐      HTTP (Bearer token)      ┌──────────────────┐
│   Frontend   │ ─────────────────────────────▶│     Backend       │
│ React SPA    │◀───────────────────────────── │  Spring Boot API  │
└─────────────┘                                └──────┬───────────┘
                                                        │ ProcessBuilder
                                                        ▼
                                                ┌──────────────────┐
                                                │  prototype/*.py   │
                                                │ Whisper / Gemini  │
                                                │ transcription +   │
                                                │ génération note   │
                                                └──────────────────┘
                                                        │
                                                        ▼
                                                ┌──────────────────┐
                                                │   PostgreSQL      │
                                                └──────────────────┘
```

Le backend ne réimplémente pas la logique de transcription/génération en Java : il **shelle out** vers le script Python existant (`prototype/main.py`) pour chaque note, en lui passant fichier audio/texte, provider LLM, taille de modèle Whisper et éventuellement un fichier de template JSON. Ce choix a été fait dès la première fonctionnalité (commit `969d08a`) pour ne pas dupliquer un pipeline déjà validé et fonctionnel en Python, plutôt que de le réécrire en Java.

### 3.1 Pipeline asynchrone

`POST /api/notes` répond immédiatement (202, statut `PENDING`) plutôt que de bloquer le temps du pipeline complet (jusqu'à plusieurs minutes avec `large-v3` + Ollama). Le traitement tourne sur un thread pool dédié (max 2 traitements concurrents — Whisper et le LLM sont tous deux CPU-intensifs), et le frontend poll `GET /api/notes/{id}` jusqu'à `DONE`/`FAILED`.

Point d'implémentation notable : la méthode `@Async` vit dans un bean séparé (`NotePipelineRunner`), pas directement dans `NoteService` — le proxy AOP de Spring ne peut pas intercepter un self-invocation (un bean qui appelle sa propre méthode `@Async` l'exécuterait de façon synchrone).

### 3.2 Modèle de données (entités principales)

| Entité | Rôle |
|---|---|
| `User` / `AuthToken` | comptes, tokens opaques (pas de JWT) |
| `Note` | note générée (transcription + markdown structuré), statut PENDING/PROCESSING/DONE/FAILED |
| `NoteImage` | images intégrées dans le markdown d'une note, référencées par `note-image:{id}` |
| `Folder` | dossiers pour organiser les notes |
| `NoteTemplate` / `TemplateSection` | structure de sections personnalisée pour la génération de note |
| `StudyProgram` | programme d'étude personnelle (rythme WEEKLY/MONTHLY/YEARLY/DAILY) |
| `StudyArgument` | un sujet daté à l'intérieur d'un programme |
| `StudyArgumentNote` | notes personnelles multiples attachées à un argument |
| `StudyImage` | images attachées à un argument d'étude |

Toutes les entités « contenu utilisateur » (`Note`, `Folder`, `NoteTemplate`, `StudyProgram`...) portent un `userId` et sont scoping systématiquement par utilisateur courant : un accès croisé entre comptes renvoie 404 (jamais les données de l'autre compte), jamais un 403 qui confirmerait l'existence de la ressource.

### 3.3 Auth

Tokens bearer opaques stockés en base (`AuthToken`), pas de JWT ni de secret partagé — choix volontairement simple pour une appli mono-serveur sans besoin de vérification stateless. `AuthInterceptor` exige un token valide sur toutes les routes `/api/**` sauf les routes d'auth elles-mêmes et `/api/health` (nécessairement public, utilisé par le health check Render qui ne peut pas s'authentifier).

### 3.4 Frontend

SPA React classique (pas de SSR). Design "journal" fait sur mesure (Fraunces/Inter, palette papier chaud) plutôt qu'une librairie de composants générique. Architecture de theming à deux axes indépendants :
- **Accent** (8 couleurs, dont l'or par défaut) — recolore uniquement les boutons/accents.
- **Mode** (Default/Light/Dark) — recolore fond de page/texte/lignes/ombres/couleurs sémantiques.

Les deux axes sont combinables, stockés en `localStorage`, appliqués via un attribut `data-theme` sur `<html>` avant le premier paint (dans `main.tsx`) pour éviter un flash de thème par défaut.

### 3.5 Offline / PWA

Contrairement à LFM_LanguegesForMe (voir sa propre doc), StudyBook n'a **pas** d'architecture offline-first généralisée avec outbox de synchronisation : la création de note nécessite toujours une connexion (le pipeline tourne côté serveur). Le seul flux qui fonctionne hors-ligne est l'**enregistrement audio** : un enregistrement réalisé sans réseau est stocké en IndexedDB (`frontend/src/offline/pendingRecordings.ts`, IndexedDB brut — pas de Dexie) et apparaît dans une liste « enregistrements en attente » sur la page d'upload. L'envoi reste toujours une action manuelle explicite par enregistrement, jamais automatique à la reconnexion (choix demandé explicitement).

Les GET (`notes`, `folders`, `templates`, `study` — programmes, arguments, notes et images d'étude personnelle) sont mis en cache par le service worker (stratégie StaleWhileRevalidate) pour que le contenu déjà consulté reste lisible hors-ligne. Le cache API est vidé à la déconnexion pour qu'un appareil partagé ne conserve pas les données d'un utilisateur précédent.

## 4. Providers interchangeables (pipeline Python)

`prototype/providers/` définit une interface commune implémentée par 4 providers :
- `stub_provider` — pour tester sans appeler de vraie API.
- `ollama_provider` — LLM local (dev uniquement, indisponible en prod).
- `anthropic_provider` — Claude, qualité payante.
- `gemini_provider` — gratuit, provider par défaut en production (voir [SB_deploy.md](SB_deploy.md) pour les contraintes de quota rencontrées).

Le choix du provider (LLM) et du moteur de transcription (Whisper local vs Gemini) sont indépendants et configurables par variable d'environnement ou paramètre de requête — nécessaire car Whisper local est trop gourmand en RAM pour l'hébergement gratuit retenu (voir [SB_deploy.md](SB_deploy.md) §Limites).

## 5. Roadmap d'origine vs état actuel

La roadmap initiale (`fiche.md`) prévoyait 4 phases : MVP mono-utilisateur → organisation/recherche → IA conversationnelle + audio synchronisé → statistiques/multi-années/mobile.

Réalisé à date : phases 1 et 2 complètes et dépassées (comptes utilisateurs, dossiers, modèles, recherche/filtres, i18n, thèmes, PWA), plus une fonctionnalité non prévue initialement — **Étude personnelle** (programmes/arguments datés, indépendants du flux audio→note, avec liaison automatique par IA entre les deux). Non fait à date : IA conversationnelle sur l'ensemble des notes, audio synchronisé au texte, statistiques d'usage, version mobile native.
