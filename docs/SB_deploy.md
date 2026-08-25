# SB_StudyBook — Déploiement

> Comment l'application est hébergée, comment la déployer, et les problèmes de production déjà rencontrés (avec leur résolution). Voir [SB_conception.md](SB_conception.md) pour l'architecture et [SB_implementation.md](SB_implementation.md) pour l'historique fonctionnel.

## 1. Architecture d'hébergement

| Composant | Hébergeur | Type |
|---|---|---|
| Backend (Spring Boot + pipeline Python) | Render | Web Service, Docker, plan **free** |
| Frontend (Vite/React) | Render | Site statique |
| Base de données | Neon | Postgres serverless, gratuit |
| LLM / transcription en production | Google Gemini | gratuit (Anthropic reste utilisable en remplaçant la clé/provider) |

URLs actuelles :
- Backend : `https://studybook-backend.onrender.com`
- Frontend : `https://studybook-frontend.onrender.com`

`render.yaml` à la racine du dépôt décrit les deux services (déploiement via Blueprint : `New > Blueprint` dans Render, en pointant sur le repo GitHub). La syntaxe des blueprints Render évolue — vérifier chaque champ dans l'UI au moment de connecter le repo plutôt que de faire une confiance aveugle au fichier.

**Déploiement automatique** : push sur la branche par défaut du repo → redeploy automatique de chaque service Render qui le suit.

## 2. Étapes de déploiement (première installation)

### 2.1 Base de données (Neon)
1. Compte sur https://neon.tech, nouveau projet (ex. `studybook`).
2. Récupérer la connection string du dashboard : `postgresql://<user>:<password>@<host>/<db>?sslmode=require`.
3. La découper en trois variables pour Render :
   - `SPRING_DATASOURCE_URL` = `jdbc:postgresql://<host>/<db>?sslmode=require`
   - `SPRING_DATASOURCE_USERNAME` = `<user>`
   - `SPRING_DATASOURCE_PASSWORD` = `<password>`

### 2.2 Clé API Gemini (gratuite)
1. https://aistudio.google.com/apikey → Create API key (pas de carte bancaire requise).
2. La garder pour l'étape suivante (`GEMINI_API_KEY`).
3. ⚠️ Le tier gratuit a des quotas par minute/jour — largement suffisants pour un usage perso, mais un dépassement échoue proprement (la note passe en statut `FAILED`, pas de crash).

### 2.3 Backend sur Render
1. **New > Web Service**, connecter le repo GitHub `SB_StudyBook`.
2. Environnement **Docker**, Dockerfile `backend/Dockerfile`, **contexte de build = racine du repo** (pas `backend/`) — le Dockerfile a besoin d'accéder au dossier `prototype/` à côté.
3. Variables d'environnement :

   | Clé | Valeur |
   |---|---|
   | `SPRING_DATASOURCE_URL` | depuis Neon |
   | `SPRING_DATASOURCE_USERNAME` | depuis Neon |
   | `SPRING_DATASOURCE_PASSWORD` | depuis Neon |
   | `GEMINI_API_KEY` | depuis Google AI Studio |
   | `STUDYBOOK_PIPELINE_PROVIDER` | `gemini` |
   | `STUDYBOOK_PIPELINE_MODEL_SIZE` | `tiny` (voir §4 — `small`/`medium` a fait OOM en prod) |
   | `STUDYBOOK_PIPELINE_TRANSCRIPTION_ENGINE` | `auto` (utilise Gemini pour transcrire, pas Whisper local — voir §4) |
   | `STUDYBOOK_CORS_ALLOWED_ORIGIN` | URL du frontend (étape 2.4, à revenir remplir) |
4. **Plan : free**, pas *starter* (voir bug §4).
5. Déployer, noter l'URL attribuée.

### 2.4 Frontend sur Render
1. **New > Static Site**, même repo.
2. Root directory `frontend`. Build command `npm ci && npm run build`. Publish directory `dist`.
3. Variable d'environnement `VITE_API_BASE_URL` = URL du backend (étape 2.3). ⚠️ Figée au build — un changement nécessite un redeploy, pas juste un changement de variable.
4. Règle de réécriture `/* → /index.html` (section Redirects/Rewrites) — nécessaire pour le routing côté client de React Router.
5. Déployer, noter l'URL.

### 2.5 Boucler CORS
Retourner dans les variables d'env du **backend**, mettre à jour `STUDYBOOK_CORS_ALLOWED_ORIGIN` avec l'URL réelle du frontend obtenue à l'étape 2.4, puis redéployer le backend.

## 3. Développement local

- Postgres via `docker compose up -d` — identifiants `lfm`... non, pour ce projet : voir `.env.example` / `docker-compose.yml` du repo (port **5433**, choisi car 5432 est pris par un autre projet sur la machine de dev).
- Backend : `./mvnw spring-boot:run` (ou `mvnw.cmd` sous Windows) — nécessite Postgres démarré, sinon `JDBCConnectionException`.
- Frontend : `npm run dev` dans `frontend/` (port 5174 — 5173 déjà pris par LFM_LanguegesForMe sur la même machine).
- Prototype Python : environnement virtuel dans `prototype/.venv` (ou `.venv` à la racine selon la machine), `pip install -r requirements.txt`.

## 4. Bugs de production déjà rencontrés

Tous ont été détectés en environnement réel (logs Render, test live sur le déploiement) plutôt qu'en local, et sont documentés ici pour ne pas les redécouvrir.

### 4.1 Crash mémoire (OOM) sur upload audio
Le tier gratuit Render alloue 512MB de RAM. Le formulaire d'upload avait par défaut `provider=ollama` (indisponible en prod) et un modèle Whisper `medium` (besoin RAM largement supérieur à ce qui est disponible), ce qui faisait planter le backend en plein milieu de requête au premier vrai upload audio — visible côté navigateur comme de fausses erreurs CORS/réseau (le symptôme n'indiquait pas du tout la vraie cause).
*Fix immédiat* : défaut forcé à `gemini`/`tiny`.
*Fix structurel* : transcription déportée sur l'API Gemini plutôt que sur Whisper local — juste importer `faster-whisper`/PyTorch en plus de la JVM dépassait déjà le plafond mémoire du tier gratuit, indépendamment de la taille du modèle choisi (confirmé via les logs Render : "Ran out of memory (used over 512MB)"). Le pipeline n'importe désormais le module de transcription lourd que si Whisper local est explicitement demandé (`--transcription-engine local`), utile si le plan Render est un jour upgradé avec plus de RAM.

### 4.2 Modèle Gemini sans quota gratuit
`gemini-2.0-flash` avait perdu son quota gratuit (testé le 05/08/2026 avec une clé fraîche → `429 RESOURCE_EXHAUSTED`, limite à 0). *Fix* : bascule sur `gemini-flash-latest`, confirmé fonctionnel avec une vraie clé. Si Google déprécie encore un modèle gratuit, ajuster `GEMINI_MODEL` (`.env` en local, variable d'env sur Render) — ce n'est pas la première fois que ça arrive, donc à surveiller à chaque incident de génération en prod.

### 4.3 Plan Render payant par erreur
`render.yaml` spécifiait le plan `starter` (payant) au lieu de `free` pour le backend — corrigé avant que ça n'entraîne une facturation.

### 4.4 Colonne réservée `user`
La table générée pour l'entité `User` entrait en collision avec `user`, mot-clé réservé PostgreSQL. *Fix* : renommée en `app_user`.

### 4.5 Images d'étude : 500 sur fetch/delete
`@Lob` sur un champ `byte[]` fait stocker Hibernate en objet large PostgreSQL (OID) plutôt qu'en `bytea` classique — lire/supprimer un OID nécessite un streaming dans une transaction active, absent des appels JPA simples utilisés ici. Chaque fetch/delete d'image renvoyait un 500, détecté en testant le cycle complet upload→fetch→delete **sur le déploiement réel**. *Fix* : abandon de `@Lob`, colonne `bytea` explicite via `columnDefinition`.

Effet de bord : une fois ce fix appliqué, la nouvelle colonne `NOT NULL` sans défaut n'a pas pu s'ajouter par `ddl-auto=update` sur une table qui avait déjà des lignes (créées en testant le bug précédent) — Postgres refuse ce type de migration. *Fix* : suppression de la contrainte `NOT NULL` (déjà garantie au niveau service).

## 5. Limites connues de cette configuration

- **Whisper tourne en CPU** sur l'instance Render (si jamais réactivé) — nettement plus lent qu'en local avec GPU.
- **Cold start ~20-30s** : le plan gratuit Render met le service en veille après 15 minutes d'inactivité ; la première requête suivante réveille le conteneur. C'est la cause principale d'un login "très lent" signalé notamment sur mobile (usage plus sporadique → plus de chances de taper un backend endormi). Deux options pour l'éliminer : upgrader vers un plan Render payant, ou accepter le compromis du tier gratuit. Un ping de "réveil" périodique n'est pas recommandé : ça va à l'encontre de l'esprit du tier gratuit et Render peut le limiter.
- **Pas de mise à l'échelle du stockage audio** : les fichiers uploadés vivent sur le disque éphémère du conteneur — perdus à chaque redeploy. Suffisant pour un usage perso ; à revoir (S3, Neon storage) si le volume grandit.
- **`faster-whisper` télécharge son modèle au premier lancement**, pas de cache persistant entre deploys sur le plan gratuit.

## 6. Vérifier qu'un déploiement est bien live

Comme il n'existe pas de moyen automatisé (pas de CI/CD configuré, pas d'accès API Render dans ce projet), la vérification post-déploiement se fait manuellement :

1. **Le service répond** : ouvrir `https://studybook-frontend.onrender.com` (ou naviguer dessus) et confirmer que la page de login s'affiche.
2. **Le bon build est servi** : le nom des fichiers `assets/index-*.js`/`*.css` change à chaque build Vite (hash de contenu) — si on cherche à confirmer qu'une fonctionnalité précise est bien dans le build livré sans se connecter, on peut fetcher ces deux fichiers depuis la console du navigateur et grep une chaîne caractéristique du code ajouté (nom de classe CSS, clé de traduction...). Exemple utilisé pour vérifier le déploiement de la barre de formatage (`a43803b`) :
   ```js
   Promise.all([
     fetch('/assets/index-XXXX.js').then(r => r.text()),
     fetch('/assets/index-XXXX.css').then(r => r.text()),
   ]).then(([js, css]) => ({
     jsHasFeature: js.includes('formatting-toolbar'),
     cssHasFeature: css.includes('hl-yellow'),
   }))
   ```
3. **Le flux applicatif réel** (login, création de note...) nécessite de se connecter avec un vrai compte — à faire manuellement par l'utilisateur du projet, pas par un agent automatisé (saisie de mot de passe exclue par principe).
