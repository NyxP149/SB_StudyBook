# S&R — SB_StudyBook

*Analyse de sécurité et de résilience appliquant la grille du document de référence [`Secure&Resilent.md`](../../Secure&Resilent.md) (projet "Faille de Sécurités et Robustesse").*
*Date de l'analyse : 2026-08-25*
*Portée : dépôt `SB_StudyBook` (backend Spring Boot, frontend React/Vite, pipeline Python `prototype/`).*

## Contexte de l'application

StudyBook enregistre un discours audio (réunion, assemblée, étude biblique), le transcrit avec Whisper (`faster-whisper`), puis génère une note d'étude structurée via un LLM au choix (Ollama local, Anthropic, ou Gemini). Le backend Spring Boot orchestre tout, délègue la transcription/génération à un script Python en sous-processus, et stocke les notes dans PostgreSQL. D'après le README, le projet est explicitement conçu en Phase 1 comme "mono-utilisateur, sans compte" — un choix de conception assumé pour le MVP, mais qui devient un vrai risque dès que `DEPLOY.md` prévoit un déploiement public (Render + Neon, avec URL publique en `https://studybook-backend.onrender.com`).

## 1. Surface d'attaque

Les points d'entrée exposés par l'API (`/api/notes`, `/api/notes/from-text`, `/api/folders`, `/api/templates`, et leurs sous-routes) acceptent tous des requêtes non authentifiées, dès lors qu'on connaît (ou devine) l'URL du backend. Trois entrées méritent une attention particulière : l'upload audio (`multipart/form-data`, jusqu'à 200 Mo, contenu non validé), l'upload de fichier texte/PDF pour `from-text` (parsé par Apache PDFBox sur des octets entièrement fournis par l'appelant), et le champ `noteMarkdown` modifiable via `PATCH /api/notes/{id}` (texte libre stocké tel quel puis réaffiché à quiconque consulte la note). Le pipeline Python lui-même n'est pas directement exposé au réseau : il n'est atteint qu'en sous-processus depuis le backend, ce qui réduit sa propre surface d'attaque directe.

## 2. Authentification et autorisation

**Constat central de cette analyse : il n'existe aucune authentification, aucune autorisation, et aucune notion d'utilisateur dans tout le backend.** Une recherche exhaustive dans `backend/src/main/java` pour les termes *security*, *authentication*, *password*, *secret*, *apikey* ne retourne aucun résultat, et `pom.xml` ne déclare aucune dépendance `spring-boot-starter-security` ni équivalent. Chaque endpoint REST (création, lecture, modification, suppression de notes, dossiers et templates) est donc accessible à quiconque peut atteindre l'URL du backend, sans aucun jeton, cookie de session ou clé API à présenter.

La configuration CORS (`CorsConfig.java`) restreint quelles origines *navigateur* peuvent appeler l'API, mais CORS est une protection appliquée par le navigateur, pas par le serveur : un client qui n'est pas un navigateur (script, `curl`, Postman, un autre serveur) contourne cette restriction sans effort dès qu'il connaît l'URL. Sur un déploiement local (`localhost`), le risque reste limité au réseau local. Sur le déploiement Render décrit dans `DEPLOY.md`, l'API et son contenu (notes d'étude personnelles, potentiellement à caractère religieux/personnel) sont exposés à quiconque sur Internet trouve ou devine l'URL — y compris via le endpoint de health-check `/api/notes`, volontairement public pour Render, qui retourne la liste de toutes les notes.

Ce constat correspond exactement à la catégorie "authentification et gestion de session faibles" et "contrôle d'accès défaillant" du document de référence : ici il ne s'agit pas d'une implémentation faible, mais de son absence totale.

## 3. Gestion des données sensibles

Aucun secret n'est codé en dur dans le dépôt : `.env` (backend Python) est correctement ignoré par Git (`prototype/.env.example` sert de modèle, aucun `.env` réel n'a été committé, y compris dans l'historique). Les identifiants Postgres codés en dur dans `application.yml` (`studybook` / `studybook`) ne concernent que la base locale de développement (`docker-compose.yml`), et la configuration Render utilise des variables d'environnement (`sync: false`) pour les vraies valeurs (Neon, `GEMINI_API_KEY`) — bonne pratique.

En revanche, les données elles-mêmes (transcriptions et notes, potentiellement des réflexions personnelles) sont stockées en clair dans PostgreSQL, sans chiffrement applicatif, et les fichiers audio/texte uploadés restent sur le disque du conteneur (`prototype/samples/uploads`) sans purge automatique après traitement — accumulation de contenu potentiellement sensible tant que le disque n'est pas nettoyé (à noter, `DEPLOY.md` mentionne que le disque Render est éphémère et perdu à chaque redeploy, ce qui limite l'accumulation en production, mais pas en local/Docker).

## 4. Dépendances

Aucune dépendance à haut risque connu n'a été identifiée par une revue manuelle (les versions n'ont pas été vérifiées contre une base CVE en ligne dans cette analyse — recommandé en complément via `mvn dependency-check` et `npm audit`). Points notables : Apache PDFBox 3.0.3 parse des PDF entièrement fournis par des appelants non authentifiés — n'importe quelle vulnérabilité future de ce parseur devient directement exploitable à distance sans compte. De même, `faster-whisper`/ffmpeg traitent des fichiers audio non validés (l'extension est extraite du nom de fichier mais son contenu réel n'est jamais vérifié) — un fichier renommé en `.mp3` mais contenant autre chose atteint directement le décodeur audio. Le frontend (React 19, Vite 8, TypeScript 6) utilise des versions récentes, sans dépendance suspecte identifiée.

## 5. Configuration et déploiement

Le sous-processus Python est lancé via `ProcessBuilder` avec une liste d'arguments (pas d'interprétation shell), ce qui évite l'injection de commande classique — bon point de conception. Le paramètre `--provider` transmis à l'utilisateur est validé côté Python par une liste blanche (`argparse choices=[...]`), donc une valeur arbitraire échoue proprement plutôt que d'être exploitée. Le paramètre `--model-size`, lui, n'a pas cette validation côté Python et est transmis tel quel à `faster-whisper` — impact limité (échec probable, pas d'exécution de code), mais à valider par whitelist par cohérence.

Le stockage des fichiers uploadés utilise un nom aléatoire (UUID) et ne réutilise jamais le nom original du fichier pour construire un chemin — donc pas de path traversal identifié sur l'upload. Le pool de threads du pipeline (`AsyncConfig`) est borné (1 thread de base, 2 max, file de 50), ce qui limite la saturation CPU par Whisper/LLM, mais rien n'empêche un appelant non authentifié de remplir cette file avec des requêtes bidons (jusqu'à 200 Mo chacune) : combiné à l'absence totale d'authentification et de limitation de débit, c'est un vecteur de déni de service trivial (saturation disque + CPU) sur un déploiement public.

## 6. Mécanismes de mise à jour

Il n'y a pas d'auto-updater dans cette application (c'est un backend web classique, pas un logiciel desktop distribué) — cette catégorie de risque ne s'applique pas directement. Le build Docker (`backend/Dockerfile`) télécharge les dépendances Maven et pip à la construction de l'image sans épinglage de version pour les paquets système (`apt-get install python3 python3-venv ffmpeg` sans version figée), ce qui signifie que deux builds à des dates différentes peuvent obtenir des versions différentes de ces paquets — un risque mineur de reproductibilité plutôt qu'un risque de sécurité direct.

## 7. Logging et détection

Le pipeline journalise les échecs (`ApiExceptionHandler`, logs `log.error` dans `NotePipelineRunner` et `TranscriptionPipelineService`), ce qui aide au diagnostic mais reste minimal : aucune journalisation des accès à l'API (qui a appelé quel endpoint, depuis quelle IP), ce qui est cohérent avec l'absence d'authentification — sans notion d'identité, la traçabilité d'un abus est de toute façon limitée à l'adresse IP brute des logs du serveur web/plateforme d'hébergement (Render), pas de l'application elle-même.

## 8. Constats et recommandations priorisées

**Critique — absence totale d'authentification.** Tant que l'API reste accessible sans compte, tout déploiement public expose en lecture/écriture/suppression la totalité des notes, dossiers et templates à n'importe qui connaît l'URL. Avant tout déploiement public durable, ajouter au minimum une protection d'accès simple (clé API partagée en en-tête HTTP, Basic Auth devant un reverse proxy, ou véritable authentification applicative type Spring Security + JWT si une V2 multi-utilisateur est envisagée). Pour un usage strictement personnel non public, une alternative acceptable à court terme est de restreindre l'accès réseau (VPN, IP allowlist côté Render/proxy) plutôt que de compter sur le secret de l'URL.

**Élevé — absence de limitation de débit et de quota d'upload par appelant.** Ajouter une limite de requêtes par IP (ou par clé, une fois l'authentification en place) sur les endpoints d'upload, pour éviter qu'un appelant unique sature le disque et la file de traitement.

**Moyen — validation de contenu des fichiers uploadés.** Vérifier le type réel du fichier (magic bytes) plutôt que de faire confiance à l'extension déclarée, avant de le transmettre à PDFBox ou à Whisper/ffmpeg, afin de réduire la surface d'attaque des parseurs tiers.

**Moyen — nettoyage des fichiers uploadés après traitement.** `prototype/samples/uploads` n'est jamais purgé automatiquement après qu'une note passe en `DONE` ou `FAILED` ; ajouter une suppression ou une rotation pour limiter l'accumulation de contenu potentiellement sensible sur disque.

**Faible — whitelist du paramètre `--model-size`.** Par cohérence avec `--provider`, valider `modelSize` côté Java ou Python contre une liste de valeurs attendues (`tiny, base, small, medium, large-v3`).

**Faible — épingler les versions système dans le Dockerfile.** Fixer une version pour `python3`/`ffmpeg` dans `backend/Dockerfile` pour des builds reproductibles.

## Prochaine étape suggérée

Décider explicitement, avant tout déploiement public : soit ajouter une authentification minimale (recommandé si l'app doit rester accessible depuis Internet), soit documenter et assumer que l'app doit rester derrière un accès réseau restreint (VPN, tunnel, IP allowlist) tant qu'elle reste mono-utilisateur sans compte.
