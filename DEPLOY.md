# Déployer StudyBook

Architecture retenue :

- **Backend** (Spring Boot + pipeline Python) → Render, en Docker
- **Frontend** (Vite/React) → Render, en site statique
- **Base de données** → Neon (Postgres serverless, gratuit)
- **LLM en production** → Gemini (gratuit), Ollama n'étant pas exécutable sur ce type d'hébergement.
  Anthropic (Claude) reste utilisable en remplaçant `GEMINI_API_KEY`/`gemini`
  par `ANTHROPIC_API_KEY`/`anthropic` si tu préfères payer pour la qualité.

`render.yaml` à la racine du dépôt décrit les deux services. Le déploiement via
Blueprint (`New > Blueprint` dans Render, en pointant sur ce repo GitHub) devrait
préremplir la config — vérifie quand même chaque champ dans l'UI Render au moment
de connecter le repo, la syntaxe des blueprints évolue.

## 1. Créer la base sur Neon

1. Crée un compte sur https://neon.tech et un nouveau projet (ex. `studybook`).
2. Dans le dashboard Neon, récupère la **connection string** — elle ressemble à :
   `postgresql://<user>:<password>@<host>/<db>?sslmode=require`
3. Découpe-la en trois valeurs pour Render (voir étape 3) :
   - `SPRING_DATASOURCE_URL` = `jdbc:postgresql://<host>/<db>?sslmode=require`
   - `SPRING_DATASOURCE_USERNAME` = `<user>`
   - `SPRING_DATASOURCE_PASSWORD` = `<password>`

## 2. Créer une clé API Gemini (gratuite)

1. https://aistudio.google.com/apikey → Create API key. Pas de carte bancaire requise.
2. Garde-la de côté pour l'étape 3 (`GEMINI_API_KEY`). Le tier gratuit a des
   quotas par minute/jour (largement suffisants pour un usage perso) — si tu
   les dépasses, l'appel échoue proprement et la note passe en statut `FAILED`.

## 3. Déployer le backend sur Render

1. Render → **New > Web Service** → connecte le repo GitHub `SB_StudyBook`.
2. Environnement : **Docker**. Dockerfile : `backend/Dockerfile`.
   Docker build context : **racine du repo** (pas `backend/`) — le Dockerfile a
   besoin du dossier `prototype/` à côté.
3. Variables d'environnement à ajouter :
   | Clé | Valeur |
   |---|---|
   | `SPRING_DATASOURCE_URL` | depuis Neon (voir étape 1) |
   | `SPRING_DATASOURCE_USERNAME` | depuis Neon |
   | `SPRING_DATASOURCE_PASSWORD` | depuis Neon |
   | `GEMINI_API_KEY` | depuis Google AI Studio |
   | `STUDYBOOK_PIPELINE_PROVIDER` | `gemini` |
   | `STUDYBOOK_PIPELINE_MODEL_SIZE` | `small` (compromis vitesse/qualité en CPU) |
   | `STUDYBOOK_CORS_ALLOWED_ORIGIN` | l'URL du frontend (étape 4, à revenir remplir) |
4. Déploie. Note l'URL attribuée par Render (ex. `https://studybook-backend.onrender.com`).

## 4. Déployer le frontend sur Render

1. Render → **New > Static Site** → même repo.
2. Root directory : `frontend`. Build command : `npm ci && npm run build`.
   Publish directory : `dist`.
3. Variable d'environnement : `VITE_API_BASE_URL` = l'URL du backend (étape 3).
   ⚠️ Elle est figée au build — un changement nécessite un redeploy.
4. Ajoute une règle de réécriture `/* → /index.html` (nécessaire pour le
   routing côté client de React Router) — section **Redirects/Rewrites**.
5. Déploie, note l'URL (ex. `https://studybook-frontend.onrender.com`).

## 5. Boucler la config CORS

Retourne dans les variables d'env du **backend** et mets à jour
`STUDYBOOK_CORS_ALLOWED_ORIGIN` avec l'URL réelle du frontend obtenue à
l'étape 4, puis redeploie le backend.

## Limites connues de cette config

- **Whisper tourne en CPU** sur l'instance Render — plus lent qu'en local avec GPU.
  Le modèle `small` est un compromis raisonnable ; `large-v3` sera très lent.
- **Premier appel plus lent** : `faster-whisper` télécharge le modèle choisi au
  premier lancement (pas de cache persistant entre deploys sur le plan gratuit).
- **Pas de mise à l'échelle automatique du stockage audio** : les fichiers uploadés
  vivent sur le disque éphémère du conteneur Render — perdus à chaque redeploy.
  Suffisant pour un usage perso, à revoir (S3/Neon storage) si le volume grandit.
