# SB_StudyBook — Implémentation, étape par étape

> Historique chronologique des fonctionnalités livrées, avec les difficultés/bugs rencontrés et comment ils ont été résolus. Voir [SB_conception.md](SB_conception.md) pour l'architecture d'ensemble et [SB_deploy.md](SB_deploy.md) pour la mise en production.
>
> Chaque section correspond à un ou plusieurs commits réels du dépôt (référencés entre parenthèses).

## Phase 0 — Prototype et validation du concept (02–04/08)

### Prototype Python (`c260e00`)
Avant d'écrire la moindre ligne de Java, le cœur du produit (audio → transcription Whisper → note structurée via LLM) a été validé en local avec `faster-whisper` et un système de providers interchangeables (Ollama, Anthropic, stub). Objectif : prouver que le pipeline produit un résultat correct avant d'investir dans le backend/frontend.

**Difficultés rencontrées et corrigées à ce stade :**
- **Notes polluées par du texte de remplissage** (`ca98925`) — Ollama (llama3.1) enveloppait la note structurée dans des phrases comme "Voici la fiche..." ou "Laissez-moi savoir...". *Fix* : instruction explicite dans le prompt de ne produire que le Markdown demandé, rien d'autre.
- **Références bibliques halluciné­es** (`7855758`) — le petit modèle Ollama inventait une référence "Jean 3:16" jamais prononcée dans la transcription, vraisemblablement amorcé par l'exemple donné dans le prompt lui-même. *Fix* : suppression de cet exemple et ajout d'une règle explicite : ne lister que les références **littéralement dites** dans la transcription, sinon indiquer qu'aucune n'a été citée. Première leçon retenue sur les prompts LLM de ce projet : un exemple dans le prompt peut devenir un biais de génération.

### Backend Spring Boot (`969d08a`)
API REST (Java 21, Spring Boot 4.1, PostgreSQL) qui **encapsule** le prototype Python plutôt que de le réécrire : `POST /api/notes` accepte un fichier audio, lance Whisper + le générateur de note via `ProcessBuilder`, persiste transcription/note. PostgreSQL tourne en local via docker-compose sur le port 5433 (5432 déjà pris par un autre projet sur la machine de dev).

### Traitement asynchrone (`0f6d12a`)
Un pipeline complet peut prendre plusieurs minutes (modèle `large-v3` + Ollama). `POST /api/notes` a été rendu asynchrone : réponse 202 immédiate avec statut `PENDING`, traitement sur un thread pool dédié (max 2 concurrents), le client poll `GET /api/notes/{id}`.

**Piège Spring rencontré** : la méthode `@Async` ne pouvait pas être une méthode de `NoteService` s'appelant elle-même — le proxy AOP de Spring n'intercepte pas le self-invocation, ce qui aurait exécuté le traitement de façon synchrone malgré l'annotation. *Fix* : extraction dans un bean séparé, `NotePipelineRunner`.

### Frontend React (`dbffe25`)
Vite + React + TypeScript, design "journal" fait sur mesure (polices Fraunces/Inter, palette papier chaud) plutôt qu'une librairie de composants générique. Trois écrans initiaux : upload/enregistrement, liste des notes (cartes façon fiches), détail d'une note. Le serveur de dev tourne sur le port 5174 (5173 déjà utilisé par LFM_LanguegesForMe sur la même machine) et proxy `/api` vers `localhost:8080` pour éviter le CORS en dev.

### Templates de notes personnalisables (`a9960ad`, `f813b18`, `a27fdb6`)
Passage d'une structure de note figée (5 sections codées en dur) à une liste configurable de sections (titre + instructions), consommée par le prompt LLM. Nouvelle API CRUD `/api/templates`, stockage via `@ElementCollection` JPA. `POST /api/notes` accepte un `templateId` optionnel ; le backend sérialise les sections en JSON temporaire, le passe au script Python via `--template-file`, puis nettoie le fichier temporaire. Écran `/templates` dédié côté frontend, testé end-to-end (création → apparaît au choix à l'upload → édition pré-remplit → suppression fonctionne).

**Piège de version rencontré** : Spring Boot 4 embarque Jackson 3, dont l'`ObjectMapper` vit sous `tools.jackson.databind` et non `com.fasterxml.jackson.databind` — a cassé la sérialisation JSON du template au premier essai avec les imports habituels.

## Phase 1 — Fonctionnalités cœur (06/08)

### Édition, export et recherche (`fe5b537`)
`PATCH /api/notes/{id}` pour corriger le markdown d'une note DONE. Édition inline côté frontend, téléchargement `.md`, vue impression/PDF navigateur. Recherche par nom de fichier + filtres statut/template sur la liste.

### Import texte/PDF (`ff6cfad`)
Alternative à l'enregistrement audio : `main.py` accepte `--transcript-file` pour sauter Whisper, nouvel endpoint `POST /api/notes/from-text` (texte collé, `.txt`, ou `.pdf` via PDFBox), routé dans le même pipeline par templates que les notes audio.

### Dossiers et niveaux d'importance (`408a233`)
Entité `Folder` + CRUD, `Note` gagne `folderId` et `importance` (NORMALE/IMPORTANTE/URGENTE), `PATCH /api/notes/{id}/organize`.

**Bug de concurrence anticipé et corrigé avant même d'apparaître en prod** : des changements rapides et successifs de dossier/importance sur la même note pouvaient partir en parallèle et se faire écraser l'un l'autre côté serveur (race condition). *Fix* : sérialisation client-side des requêtes d'organisation (file d'attente, une seule requête en vol à la fois).

## Phase 2 — Mise en production (06/08)

Voir [SB_deploy.md](SB_deploy.md) pour le détail complet de cette phase (Dockerfile, Render, Neon, Gemini, et tous les bugs de production rencontrés : OOM 512MB, colonne réservée `user`, modèle Gemini sans quota, plan Render payant par erreur...).

Résumé des étapes livrées ici : Dockerfile multi-stage (`5055e28`), provider Gemini gratuit (`0a10823`), comptes utilisateurs avec tokens opaques (`4712eb6`), fix crash mémoire en forçant `gemini`/`tiny` par défaut (`0f7f0ab`), transcription audio via Gemini pour éviter l'OOM Whisper (`f132306`), upload de gros fichiers audio via l'API Files de Gemini (`0ecfa68`).

## Phase 3 — Fiabilisation et confort d'usage (08/08)

### Suppression de notes, suppression en masse (`0ecfa68`, `7efc473`)
Ajouté après avoir dû nettoyer manuellement des notes restées bloquées en `PROCESSING` suite à un crash backend qui avait orphelin leur tâche async. La suppression en masse (`7efc473`) a été demandée directement après avoir dû supprimer ces notes une par une.

### PWA et mode hors-ligne (`5210bf9`)
Application installable (manifest + icônes + service worker via `vite-plugin-pwa`). Les GET (notes/dossiers/templates) sont mis en cache (StaleWhileRevalidate) pour rester lisibles hors-ligne. Le cache est vidé à la déconnexion pour éviter qu'un appareil partagé garde les données d'un utilisateur précédent.

Décision de conception : la création de note reste toujours en ligne (le pipeline tourne côté serveur), mais **l'enregistrement audio** fonctionne hors-ligne — sauvegardé en IndexedDB, affiché dans une liste "enregistrements en attente", envoi toujours manuel et explicite (jamais automatique à la reconnexion, sur demande explicite).

### Détection des enregistrements silencieux (`abbfee3`)
**Bug découvert par l'usage réel, pas par un test** : Whisper et Gemini ne renvoient pas une transcription vide pour un silence — ils **hallucinent** la suite statistiquement probable d'après leurs données d'entraînement, ce qui donne souvent des phrases de type "abonnez-vous à la chaîne" (les phrases de fin de vidéo YouTube sont surreprésentées dans les corpus d'entraînement ASR). *Fix* : décodage du blob audio via la Web Audio API côté client, rejet avant envoi (erreur claire, aucune requête réseau) si la durée est sous 0.5s ou si l'amplitude crête ne dépasse jamais un seuil de quasi-silence. Validé directement contre des blobs WAV synthétiques (silence, court, tonalité).

### Trois bugs hors-ligne (`2f8264e`)
Trois symptômes remontés (faux verrouillage de connexion, statut de connexion peu fiable, rechargement mort hors-ligne) qui partageaient en réalité **une seule cause racine** : l'effet de montage d'`AuthContext` appelait `getMe()` pour valider le token stocké, et son `catch` déconnectait l'utilisateur sur **n'importe quelle** erreur — y compris une simple erreur réseau hors-ligne, indistinguable d'un vrai 401 avec l'`Error` générique levée jusque-là.
- *Fix 1* : ajout d'un `ApiError` avec un champ `status` — seul un vrai 401 déclenche la déconnexion ; une panne réseau laisse la session en cache intacte, et le nom d'utilisateur en cache s'affiche immédiatement sans attendre l'aller-retour réseau.
- *Fix 2* : `useOnlineStatus` reposait uniquement sur `navigator.onLine`, qui ne reflète que l'état de l'interface réseau, pas l'accessibilité réelle du backend (ex. wifi connecté mais pas d'internet, DNS/serveur down). Passé à un ping actif de `/api/health` (timeout généreux de 8s / intervalle 20s, car le tier gratuit Render peut prendre 20-30s à se réveiller d'un cold start).
- *Fix 3* : `navigateFallback` du service worker rendu explicite pour qu'un rechargement forcé hors-ligne serve `index.html` précaché plutôt que la page d'erreur réseau du navigateur.

## Phase 4 — i18n et navigation (11/08)

### Sidebar repliable + traductions FR/EN/IT (`6057dfe`)
La navigation passe du header vers une sidebar gauche entièrement repliable (état persisté en `localStorage`, en overlay sur mobile plutôt qu'en poussant le contenu). Mise en place complète d'i18next : toutes les chaînes de l'UI traduites dans les 3 langues, y compris pluriels et formatage de dates localisé. Choix de langue persisté, avec repli sur la langue du navigateur puis le français.

**Bugs UI mineurs corrigés dans la foulée** :
- Bouton de bascule sidebar repliée qui chevauchait le titre de page (`422ae8b`).
- Bouton logout devenu invisible une fois la sidebar repliée (comportement par défaut sur mobile) puisqu'il vivait désormais dans la sidebar elle-même — plus aucun moyen de se déconnecter sans d'abord trouver le bouton ☰. *Fix* (`8a6e8a2`) : petit bouton power fixe en haut à droite, visible uniquement quand la sidebar est repliée, miroir du toggle ☰ existant côté opposé.

## Phase 5 — Étude personnelle (11/08)

Fonctionnalité non prévue dans la roadmap initiale : programmes d'étude personnelle indépendants du flux audio→note.

### Fondations (`968b185`)
`StudyProgram` (nom + rythme indicatif WEEKLY/MONTHLY/YEARLY) contient des `StudyArgument`, chacun daté manuellement, avec son propre contenu libre et des images attachées (stockées en `bytea` Postgres, plafonnées à 5MB — pas de disque persistant sur le tier gratuit Render, donc pas de stockage externe simple à ce stade). `GET /api/study/upcoming` alimente un panneau de rappel (arguments en retard + à échéance sous 7 jours).

Les images sont servies derrière l'authentification (`GET /api/study/images/{id}`), donc le frontend les récupère via `authFetch` + URL `blob:` (composant `AuthedImage`) plutôt qu'une balise `<img src>` classique, qui ne peut pas porter de bearer token.

### Bugs de production sur les images (`9ab474c`, `574df48`)
**Découverts en testant le cycle upload→fetch→delete sur le déploiement réel**, pas seulement l'upload isolé :
- `@Lob` sur un `byte[]` fait stocker Hibernate en objet large PostgreSQL (OID) plutôt qu'en colonne `bytea` classique — lire/supprimer un OID nécessite un streaming dans une transaction active, ce que les appels `findByIdAndUserId()`/`deleteById()` simples utilisés ici ne fournissaient pas. Chaque fetch ou delete d'image renvoyait donc un 500. *Fix* : abandon de `@Lob`, colonne `columnDefinition="bytea"` explicite (champ renommé pour que Hibernate crée une colonne fraîche via `ddl-auto` plutôt que de tenter d'altérer l'ancienne colonne mal typée — l'ancienne colonne reste orpheline, sans conséquence puisque rien ne la référençait en dehors de cette fonctionnalité encore non annoncée).
- Une fois ce premier fix en place : `ddl-auto=update` ne peut pas ajouter une colonne `NOT NULL` sans valeur par défaut sur une table qui a déjà des lignes (présentes ici à cause du test précédent) — Postgres refuse, la migration ne s'appliquait donc jamais silencieusement, et chaque upload d'image continuait de planter en 500. *Fix* : suppression de la contrainte `NOT NULL` en base (la couche service garantit déjà une valeur non nulle à chaque insertion, donc la contrainte n'était pas structurellement nécessaire).

### Affichage de date incorrect (`2844c79`)
`scheduledDate` est un `LocalDate` pur (sans heure), mais les pages l'affichaient avec des fonctions de formatage incluant heure/minute — un artefact de `new Date(iso)` qui traite la chaîne comme minuit UTC puis la localise, faisant apparaître par exemple "11 août, 2h00" pour une simple date. *Fix* : nouvelle fonction `formatDateOnly` qui parse la date par composants année/mois/jour locaux (évite aussi qu'elle recule d'un jour dans les fuseaux UTC négatifs) et formate sans heure.

### Liaison automatique note↔argument par IA (`3e661f6`)
Dernière brique d'Étude personnelle : quand le pipeline d'une note se termine, `NoteLinkingService` compare son contenu aux arguments d'étude de l'utilisateur via un appel Gemini direct côté Java (pas via le pipeline Python — nécessite un accès DB à la liste des arguments). Si Gemini identifie un candidat, il est stocké en `suggestedArgumentId` et proposé à l'utilisateur avec confirmer/écarter ; la confirmation le déplace en `linkedArgumentId`, affiché comme badge permanent.

Conçu **best-effort** de bout en bout : absence de clé Gemini, absence d'arguments à comparer, ou échec d'appel API — dans tous les cas, la suggestion est simplement ignorée silencieusement, sans jamais affecter la complétion de la note elle-même.

### Thèmes et images inline (`75f35a5`, `739f4b0`)
7 thèmes d'accent (noir, vert, violet, orange, cyan, bleu, fuchsia) en plus de l'or par défaut. Seules `--gold`/`--gold-bright` sont redéfinies par thème pour ne pas avoir à auditer chaque usage de couleur dans l'app.

Images inline dans les notes (`NoteImage`, store générique découplé de `Note`/`StudyArgument`, référencé par `note-image:{id}` inséré à la position du curseur), et passage à plusieurs notes personnelles par argument d'étude (`StudyArgumentNote` remplace le champ `content` unique). Page argument réorganisée en deux onglets ("Mes notes" / "Notes liées") pour ne pas surcharger l'écran mobile.

**Bugs découverts en testant en live sur le déploiement, pas via tsc/build :**
- `bfb04a7` — react-markdown vide par défaut tout `src`/`href` dont le schéma d'URI n'est pas reconnu (protection XSS sur les liens), ce qui effaçait silencieusement les placeholders `note-image:{id}` avant même que le renderer d'image ne les voie. *Fix* : `urlTransform` qui laisse passer spécifiquement le préfixe `note-image:` et délègue au sanitizer par défaut de react-markdown pour le reste.
- `7c2eeb8` — `StudyProgramService.delete()` purgeait déjà les images de chaque argument avant de cascade-supprimer les arguments, mais oubliait la nouvelle table `study_argument_note` ajoutée en même temps que le cascade (correct, lui) de `StudyArgumentService` — repéré en nettoyant les données de test après la vérification live de la fonctionnalité multi-notes.

### Vrais modes clair/sombre (`bcc6018`, `593fb97`)
Avant ce commit, les "thèmes" ne recoloraient que les boutons — pas un vrai changement de thème. Ajout d'un second axe indépendant (Défaut/Clair/Sombre) qui override fond de page/texte/lignes/ombres/couleurs sémantiques, combinable avec n'importe quel accent. Introduction de `--on-accent` : couleur fixe pour le texte posé sur un fond accent plein (boutons, onglets, badges), découplée de `--ink` qui elle-même s'inverse en mode sombre.

**Bug de contraste découvert en mesurant réellement, pas en jugeant à l'œil** : `--teal` servait deux rôles contradictoires — couleur de texte/bordure sur fond de page (veut s'éclaircir en mode sombre) et fond plein sous texte blanc (veut rester sombre pour le contraste, quel que soit le mode). Contraste mesuré : 2,28:1, sous le seuil WCAG AA. *Fix* (`593fb97`) : rôle de fond séparé en `--teal-solid`, inchangé du mode par défaut en mode Clair, plus sombre que le `--teal` éclairci en mode Sombre. Appliqué aux 5 boutons pleins teal+texte blanc du site.

## Phase 6 — Personnalisation visuelle des notes (12/08)

### Fonds de note (`a4e1aa9`, `e959963`)
`Note.background` : clé nullable additive, `null` = papier par défaut. 7 couleurs plates + 6 "chemises" décorées (parchemin ancien, nuit étoilée, lin naturel, feuille d'olivier, aquarelle poudrée, ardoise minérale), implémentées comme overrides de custom properties CSS scopées à une classe `.note-bg-{key}`, appliquées à la fois sur `.note-card` et `.note-markdown` — comme les deux rendent déjà via `background: var(--paper-card)` etc., la cascade CSS gère tous les descendants gratuitement.

**Bug de contraste découvert en mesurant en live, même schéma que le bug teal** : les 7 couleurs plates ne redéfinissaient que `--paper-card`/`--line`, laissant `--ink` à la couleur du mode d'app courant. En mode Sombre, `--ink` est une couleur claire pensée pour un fond sombre — combinée à ces papiers pastel clairs, le contraste mesuré tombait à ~1,5:1. *Fix* (`e959963`) : `--ink`/`--ink-soft`/`--ink-faint`/`--gold` épinglés par preset, comme le faisaient déjà les chemises.

**Refonte des chemises (18/08, plus tard) : 6 dégradés unis → 8 fonds illustrés.** Retour utilisateur après captures d'écran d'exemples (autre appli de notes) : les 6 chemises d'origine (parchemin, nuit étoilée, lin naturel, feuille d'olivier, aquarelle poudrée, ardoise minérale) étaient jugées trop plates comparées à des fonds illustrés/aquarelle avec motif. Direction validée sur un aperçu (maquette HTML dédiée) avant intégration, pour éviter de construire dans le vide. Remplacées par 8 : `nuit-etoilee` (conservée), `seve-de-sauge`, `poudre-rose`, `feuille-tropicale`, `lin-dore`, `facettes-sombres`, `aube-corail`, `marbre-clair` — toujours de purs dégradés/motifs CSS (pas d'image ni de SVG externe, pour rester dans l'architecture "juste des custom properties" et éviter tout risque de reproduction d'assets protégés vus en référence).

Les fonds au motif le plus chargé (`seve-de-sauge`, `poudre-rose`, `lin-dore`) posent en plus un panneau translucide (`backdrop-filter: blur`) derrière `.note-card-head`/`.note-card-meta`, mais **seulement sur `NoteCard`** — sur `NoteDetailPage`, la chemise ne colore que `.note-markdown` (le corps), jamais `.note-detail-header` qui reste sur le fond de page normal, donc aucun panneau n'y est nécessaire.

Les 5 chemises supprimées ne sont plus dans `CHEMISE_BACKGROUNDS`/`isNoteBackground` : une note existante qui utilisait l'une d'elles perd silencieusement son fond personnalisé (retour au papier par défaut, `backgroundClassName` renvoyant `''` pour une clé inconnue) — pas de crash, mais pas de migration automatique vers un nouveau fond équivalent.

**Correctif (18/08, plus tard) : 3 chemises rendaient mal en vrai.** Après test utilisateur, `feuille-tropicale`/`lin-dore` (dégradés radiaux à faible opacité) étaient quasi invisibles sur leur fond, et `facettes-sombres` (bandes en dégradé linéaire à arrêts francs, étirées sur toute la carte) ressemblait à un dégradé cassé plutôt qu'à des facettes. Cause : contrainte de départ « uniquement des custom properties CSS, pas de nouveau markup » avait poussé à approximer en dégradés ce qui, dans l'aperçu validé, était de vraies formes (div `border-radius`/`clip-path`). Remplacé par de vrais motifs — feuille (chemin à 2 courbes), bouquet de 3 petites feuilles, polygones anguleux — encodés en SVG inline dans `background-image: url("data:image/svg+xml,...")`, positionnés par coin (`background-position`/`background-size`, pas de `background-repeat`). Ça reste zéro nouveau markup React (le SVG vit entièrement dans la valeur CSS de `--paper-card`), donc l'architecture initiale est préservée. Vérifié en injectant `noteBackgrounds.css` dans une page du dev server et en décodant chaque data-URI via `new Image()` + lecture de pixels sur `<canvas>` (confirmé : bonnes dimensions/ratio, pixels non transparents aux positions attendues) — la meilleure vérification possible sans connexion utilisateur.

**Deuxième correctif (19/08) : accents en `%` = énormes sur une note large.** Nouveau retour utilisateur avec capture d'écran : sur `lin-dore`, le rendu réel ne ressemblait plus du tout à l'aperçu validé (grosses taches pleines dispersées au lieu d'une fine brindille). Cause réelle : `background-size` en pourcentage (ex. `42% auto`) sur `.note-markdown`, qui peut faire toute la largeur d'un écran desktop — un accent censé rester petit grossissait proportionnellement à la note et devenait un amas de formes massives. Le motif `lin-dore` lui-même avait aussi dévié de l'aperçu (3 feuilles pointues pleines sans tige, au lieu d'une brindille fine avec petites feuilles ovales). *Fix* : toutes les tailles d'accents décoratifs (`feuille-tropicale`, `lin-dore`, `facettes-sombres`) passées en **pixels fixes** plutôt qu'en `%` (un accent de coin doit rester petit quelle que soit la largeur de la note), et `lin-dore` redessiné pour correspondre à l'aperçu (tige fine en `<line>` + 3 petites feuilles ovales). Ajout au passage d'un petit accent SVG (feuille pour `seve-de-sauge`, fleur à 5 pétales pour `poudre-rose`) en coin bas-droit sur ces deux chemises, qui n'avaient jusque-là qu'un lavis de dégradés sans aucune forme dessinée — même demande utilisateur, appliquée aux chemises restées "juste un dégradé". `aube-corail` et `marbre-clair` restent volontairement de purs dégradés (c'est ce qui était montré et validé dans l'aperçu pour ces deux-là, un accent en plus n'aurait pas de sens thématique).

**Troisième correctif (19/08) : silhouette de sommets ajoutée à `nuit-etoilee`.** C'était la seule chemise de l'aperçu original jamais mise à jour — les étoiles (dégradés radiaux, rayon en px fixe) étaient déjà correctes et inchangées, mais la ligne d'horizon en dents de scie visible dans l'aperçu (un `clip-path` sur un `<div>` dans la maquette) n'avait jamais été portée en CSS pur, un dégradé seul ne pouvant pas dessiner un contour irrégulier. Ajoutée en SVG (`<polygon>`), hauteur fixe (`70px`, pas `%`, même principe que les autres correctifs) mais largeur `100%` volontairement — contrairement aux accents de coin, une ligne d'horizon doit couvrir toute la largeur de la note.

## Phase 7 — Programmes d'étude enrichis (12/08)

- **Grille de création en masse** (`ba093b1`) — choix d'un rythme (jour/semaine/mois/année) + un nombre, remplissage d'une grille de titres en une fois plutôt qu'ajouter les arguments un par un. Fonctionne pour un nouveau programme ou pour ajouter en masse à un programme existant. Nouvel endpoint `POST /api/study/programs/{id}/arguments/bulk`.
- **Export .ics** (`5012bb1`) — calendrier RFC 5545 (un VEVENT jour entier par argument), généré et téléchargé entièrement côté client, sans OAuth.
- **Encouragement + progression** (`7a0bacb`) — marquer un argument comme terminé appelle un endpoint dédié qui génère un message d'encouragement Gemini (best-effort, repli sur un message fixe si l'API échoue). Barre de progression X/Y calculée côté client à partir des arguments déjà chargés, sans endpoint supplémentaire.

## Phase 8 — Import/export de documents (12/08)

- **.docx** (`0d4de96`) — import via Apache POI (`XWPFDocument`), même schéma que l'extraction PDFBox existante ; export via la librairie `docx` côté client (headings, listes, gras/italique, images inline), même schéma que les exports `.md`/`.ics` déjà en place.
- **.pdf natif** (`5bf28b6`) — export via `jsPDF` côté client, remplace le recours au dialogue d'impression du navigateur pour ce format.

## Phase 9 — Barre de mise en forme riche (12/08)

### Fonctionnalité (`a43803b`)
Nouvelle barre d'outils au-dessus de chaque zone de texte de note (notes transcrites et notes d'étude personnelle) : gras, italique, souligné, majuscules, titre, liste à puces, et un sélecteur 4 couleurs de surlignage — chaque bouton enveloppe/préfixe la sélection courante par manipulation d'index de chaîne pure (`toggleWrap`, `toggleLinePrefix`, `uppercaseSelection`). Souligné/surlignage passent par `<u>`/`<mark>` autorisés dans le rendu markdown via `rehype-raw` + une allowlist `rehype-sanitize` (classe restreinte aux 4 couleurs `hl-*` prédéfinies).

**Deux bugs préexistants, révélés uniquement par cette fonctionnalité** (parce qu'elle est la première à faire des calculs d'index bruts sur le contenu des notes) :

1. **Désynchronisation CRLF des index de sélection.** `<textarea>.value` normalise toujours les retours ligne en LF pur (norme HTML), mais du contenu venant du serveur pouvait contenir des CRLF (ex. texte extrait de fichiers créés sous Windows). Amorcer l'état d'édition avec du CRLF non normalisé faisait diverger `selectionStart`/`selectionEnd` (DOM, en LF) des calculs d'index faits sur la chaîne React — un clic "gras" sur "Résumé" enveloppait par exemple 4 caractères au mauvais endroit, produisant un résultat corrompu.
   *Diagnostic* : élimination méthodique de plusieurs hypothèses (imprécision du double-clic, perte de sélection au blur du bouton, double invocation du handler) via des logs de debug attachés à `window` (plus fiables ici que `console.log` + lecture de la console, dont le tampon s'est révélé retourner des entrées obsolètes entre rechargements de page) — jusqu'à confirmer que la chaîne React contenait des `\r\n` invisibles dans le `.value` du DOM.
   *Fix* : `frontend/src/utils/text.ts` → `normalizeLineEndings()`, appelée partout où l'état d'un textarea est initialisé depuis du contenu serveur (`NoteDetailPage.startEditing`, et l'état initial + `startEditing` de `StudyArgumentDetailPage`).

2. **Mise en forme perdue dans les titres.** Une fois le premier bug corrigé, des notes sauvegardées avec par ex. `## **Résumé**` ou `## <mark>Perles</mark> <u>spirituelles</u>` s'affichaient avec un titre complètement vide. Cause : le renderer de titre de `NoteMarkdown.tsx` aplatissait `children` en texte brut pour en extraire l'icône de section, puis **réaffichait ce texte aplati** au lieu des vrais nœuds React — perdant toute balise `<strong>`/`<mark>`/`<u>` imbriquée.
   *Fix* : réécriture de la fonction d'extraction de texte pour parcourir récursivement l'arbre de `ReactNode` (via `isValidElement`), et rendu de `{children}` (les vrais nœuds) plutôt que du texte aplati.

Les deux corrections ont été vérifiées indépendamment en navigateur avant de considérer la fonctionnalité terminée.

## Phase 10 — Étude personnelle disponible hors-ligne (16/08)

En documentant l'architecture offline (§3.5 de [SB_conception.md](SB_conception.md)), il est apparu que la règle de cache du service worker (`frontend/vite.config.ts`) ne couvrait que `/api/(notes|folders|templates)` — les routes `/api/study/*` (programmes, arguments, notes et images d'étude personnelle) en étaient absentes malgré le même besoin de lecture hors-ligne. *Fix* : ajout de `study` au regex de la règle `runtimeCaching` existante (même stratégie StaleWhileRevalidate, même cache `studybook-api-cache`, aucune règle nouvelle nécessaire puisque toutes les routes d'étude personnelle vivent déjà sous le préfixe unique `/api/study`).

Vérifié après build de production : le regex mis à jour est bien injecté dans le `sw.js` généré par `vite-plugin-pwa`, et testé en isolation (`/api/study`, `/api/study/programs/5/arguments`, `/api/study/upcoming`, `/api/study/images/9` matchent ; `/api/auth/login` et `/api/note-images/3` restent exclus, comme avant). Le comportement réel de mise en cache (contenu réellement lisible après coupure réseau) n'a pas pu être vérifié de bout en bout en environnement de preview faute de backend attaché — à confirmer manuellement : ouvrir un programme d'étude en ligne, couper le réseau, recharger.

## Phase 11 — Import brut, extraction de template, dossiers multiples (18/08)

### Bug rapporté : crash lors de l'import d'une fiche déjà rédigée
Signalé avec une capture d'écran montrant `httpx.HTTPStatusError: Server error '503 Service Unavailable'` sur `gemini_provider.py`, lors de l'import d'un `.docx` contenant une fiche déjà entièrement structurée (thème, plan, versets...). Diagnostic : le contenu du fichier n'était pas en cause — `_call_generate_content()` n'avait **aucune logique de nouvel essai**, donc la moindre indisponibilité transitoire côté Gemini (503, ou 429/500/502/504) faisait échouer la note immédiatement, sans deuxième chance. *Fix* : jusqu'à 3 tentatives avec backoff (2s, 6s) sur ces codes précis ; les autres erreurs (ex. 400, clé invalide) sont toujours propagées immédiatement, sans retry inutile.

Ceci dit, regénérer une fiche déjà rédigée par IA reste un vrai gaspillage (appel API inutile, risque de reformulation d'un texte déjà bon) — d'où les deux fonctionnalités suivantes, demandées dans la foulée.

### Import texte sans passer par l'IA
Nouveau choix sur l'onglet Texte de la page d'upload : « Générer une fiche avec l'IA » (comportement existant) vs « Ajouter tel quel (sans IA) ». En mode brut, `POST /api/notes/from-text` reçoit `generate=false`, propagé jusqu'au script Python (`--no-generate`) qui saute entièrement l'étape LLM — le texte extrait (du `.txt`/`.pdf`/`.docx`) devient directement le contenu de la note. Le sélecteur de provider/modèle/template est masqué dans ce mode puisqu'aucun des trois ne s'applique. Scope volontairement limité au texte (pas à l'audio), qui a de toute façon besoin d'une transcription.

### Extraire la structure d'une note en template réutilisable
Nouveau bouton « Enregistrer comme modèle » sur une note terminée : parcourt les titres markdown (`#`/`##`/`###`) de la note via une regex (`extractTemplateSections.ts`), nettoie le balisage inline (`**gras**`, `<u>`, `<mark>`), et crée un `NoteTemplate` dont chaque section reprend un titre trouvé avec une instruction générique (« Rédige cette section comme dans le discours. »), modifiable ensuite comme n'importe quel template existant. Entièrement client-side — aucun nouvel endpoint backend, réutilise `POST /api/templates` déjà en place.

**Mise à jour (18/08, plus tard) : extraction par IA.** La regex ratait toute note qui ne suit pas la convention `#`/`##`/`###` (ex. import brut d'un document déjà mis en forme différemment), donné en retour par l'utilisateur après test manuel. Remplacé par un appel Gemini côté backend (`TemplateExtractionService`, même patron que `NoteLinkingService`/`EncouragementService` : appel HTTP direct à l'API Gemini, prompt + parsing JSON de la réponse) exposé via `POST /api/templates/extract-sections` (body `{markdown}`, retourne `TemplateSectionDto[]`). Contrairement aux deux services existants, celui-ci n'avale pas ses erreurs : une `TemplateExtractionException` (mappée en 502 par `ApiExceptionHandler`) remonte volontairement au frontend, qui **retombe silencieusement sur l'ancienne extraction par regex** (`extractTemplateSections.ts`, conservée comme filet de sécurité) si l'appel IA échoue — clé absente, quota, erreur réseau. Aucune régression possible : au pire, comportement identique à avant.

### Dossiers multiples par note + vue de contenu d'un dossier
Jusque-là une note n'appartenait qu'à un seul dossier (`Note.folderId`, `UUID` simple). Remplacé par `Note.folderIds` (`@ElementCollection<UUID>`, table `note_folders`) pour permettre à une note d'appartenir à plusieurs dossiers à la fois. Migration des données historiques via un `ApplicationRunner` (`LegacyFolderMigration`) qui copie au démarrage `note.folder_id` (colonne héritée, laissée en place) vers `note_folders`, en ne réinsérant jamais un doublon — sûr à rejouer à chaque démarrage.

Nouvelles routes sous `/api/folders/{id}` : `GET /notes` (contenu du dossier), `POST /notes/{noteId}` (ajouter), `DELETE /notes/{noteId}` (retirer, sans supprimer la note). `PATCH /api/notes/{id}/organize` accepte désormais `folderIds: UUID[]` au lieu d'un `folderId` unique.

Côté frontend : le sélecteur de dossier unique de `NoteDetailPage` devient `NoteFolderPicker`, un panneau à cases à cocher (même patron que `NoteBackgroundPicker`). `NoteCard` affiche un badge par dossier au lieu d'un seul. Nouvelle page `FolderDetailPage` (`/folders/:id`, accessible depuis une carte de `FoldersPage`, désormais scindée en un lien "ouvrir" + un bouton "modifier" séparé) : liste les notes du dossier avec « Retirer du dossier » (désaffectation) et « Supprimer définitivement » (suppression réelle, avec confirmation) sur chaque ligne, plus un sélecteur pour ajouter une note existante au dossier.

### Bugs trouvés lors du test manuel réel
Le flux complet a ensuite été testé manuellement (instance locale dédiée, base Postgres jetable sur le port 5434 puisque le port habituel 5433 était occupé par le conteneur d'un autre projet sur la même machine). Deux régressions réelles sont ressorties, invisibles au typecheck/build :

- **500 sur toute consultation de note** (`GET /api/notes`, `GET /api/notes/{id}`) : `Note.folderIds` (`@ElementCollection`) est chargé en lazy par défaut, mais les endpoints qui sérialisent `NoteResponse`/`NoteSummaryResponse` ne gardent pas de session Hibernate ouverte à ce moment → `LazyInitializationException`. *Fix* : `@ElementCollection(fetch = FetchType.EAGER)` sur `Note.folderIds` — collection minuscule (quelques UUID par note), sans impact perf mesurable.
- **Pipeline en échec systématique en mode « Ajouter tel quel »** : `NoteService.submitText` passait `"none"` comme `--provider` au script Python quand `generateNote=false`, mais l'argparse de `main.py` n'accepte que `{ollama,anthropic,gemini,stub}` — rejeté avant même d'atteindre `--no-generate`. *Fix* : passer `"stub"` (valeur inerte, jamais réellement invoquée dans ce mode) à la place.
- **Fond du chip de fichier attaché codé en dur** (`#fdf6e8`, crème) dans `UploadPage.css` : illisible en thème sombre où `--ink` devient un texte quasi blanc. *Fix* : `background: var(--paper-card)`, qui s'adapte aux 3 modes.

**Vérification** : `mvn compile` et `tsc -b`/`vite build`/`oxlint` propres sur les deux applications ; bundle chargé en navigateur sans erreur console ; backend recompilé et redémarré proprement après les correctifs (health check OK) ; flux réel (import brut, dossiers multiples) confirmé fonctionnel par test manuel de l'utilisateur sur l'instance locale.

## Phase 12 — Correction UX : fermeture des panneaux au clic extérieur (19/08)

Bug rapporté par l'utilisateur : les trois panneaux flottants de type "bouton bascule + panneau" (`SaveAsTemplateButton`, `NoteFolderPicker`, `NoteBackgroundPicker`) ne se refermaient qu'en recliquant sur le bouton qui les avait ouverts — un clic n'importe où ailleurs sur la page n'avait aucun effet, contrairement au comportement standard attendu d'un menu déroulant.

Cause : chacun implémentait indépendamment le même patron minimal (`useState` + `onClick` qui bascule l'état), sans jamais écouter les clics en dehors du panneau. *Fix* : nouveau hook partagé `frontend/src/hooks/useClickOutside.ts` (écoute `pointerdown` sur `document`, ferme si la cible n'est pas contenue dans le conteneur référencé), branché dans les trois composants sur un `ref` posé sur leur `<div>` racine (qui englobe à la fois le bouton et le panneau, donc un clic sur le bouton déclencheur lui-même n'est jamais traité comme "extérieur").

Vérifié par `tsc -b` et `vite build` propres sur les trois composants modifiés. Test du comportement réel non effectué en navigateur (fonctionnalité protégée par connexion, hors de portée de l'automatisation ici) — à confirmer manuellement : ouvrir un des trois panneaux, cliquer ailleurs sur la page, vérifier qu'il se referme.

## Phase 13 — Import .docx "tel quel" : conservation de la mise en forme (19/08)

Bug rapporté avec capture d'écran d'un document source structuré (titre, sous-titre en gras, sections avec icône colorée, liste à puces) : importé en mode « Ajouter tel quel », la note résultante était un unique bloc de texte plat, sans titres ni puces ni gras.

Cause : `NoteService.extractText()` utilisait `XWPFWordExtractor.getText()` pour les `.docx`, qui ne renvoie que le texte brut paragraphe par paragraphe — aucune info de style n'est conservée. Ce texte plat devient directement la note en mode "tel quel" (`--no-generate` sauté toute génération LLM qui aurait pu, sinon, réintroduire une structure), d'où le bloc unique observé.

*Fix* : remplacement par `convertDocxToMarkdown()`, qui parcourt les paragraphes du document via l'API structurée d'Apache POI (déjà une dépendance existante) et reconstruit du vrai markdown :
- Style de paragraphe `Title` → `#` ; `HeadingN` → `#` répété `N+1` fois (le style Word "Titre 1", le plus courant en pratique, devient ainsi `##` — même niveau visuel que les sections `## Titre` des notes générées par IA, cf. `note_generator.py DEFAULT_SECTIONS`, pour un rendu cohérent entre note importée et note générée).
- Runs en gras/italique/souligné → enveloppés en `**gras**`/`*italique*`/`<u>souligné</u>` (le rendu markdown du frontend accepte déjà `<u>`, ajouté pour la barre de formatage — voir Phase 7).
- Paragraphe avec numérotation Word (`numId` présent) → préfixé `- ` (liste à puces ; la distinction numérotée/à puces n'est pas conservée, jugée hors scope).

Volontairement limité au `.docx` : le `.pdf` n'a aucune notion native de "titre" (tout n'est que texte positionné par police/taille), une récupération fiable de structure y demanderait une heuristique nettement plus lourde et moins fiable — laissé de côté après discussion avec l'utilisateur, qui a préféré ne corriger que le cas `.docx`.

**Vérification** : test unitaire jetable (non conservé) construit un `.docx` de test via le paquet `docx` (déjà utilisé côté frontend pour l'export) avec titre/heading1 gras/paragraphe gras+italique/heading2/liste à puces avec gras inline, invoqué `convertDocxToMarkdown()` par réflexion (méthode privée, aucune dépendance Spring nécessaire), et vérifié par assertions que chaque élément de mise en forme survit à la conversion. Toutes les assertions passent après un aller-retour de correction (le premier essai avait mal cartographié Heading1→`#` au lieu de `##`, repéré par le test lui-même). Le flux HTTP complet (upload réel via l'UI) n'a pas pu être testé de bout en bout, l'écran d'upload étant derrière l'authentification.

## Enseignements transverses

Quelques motifs récurrents observés sur l'ensemble de ces phases :

- **Beaucoup de bugs n'ont été détectés qu'en testant le flux réel en navigateur** (parfois sur le déploiement lui-même), pas par le typecheck ni le build — en particulier tout ce qui touche au rendu markdown, au contraste de couleurs, et aux calculs d'index sur `<textarea>`. Le typecheck/build attrape les erreurs de types, pas les erreurs de comportement.
- **Les prompts LLM peuvent s'auto-biaiser** : un exemple donné dans un prompt de génération peut être repris littéralement par le modèle (références bibliques hallucinées) — éviter les exemples concrets dans les prompts de génération de contenu factuel.
- **Chaque fonctionnalité "best-effort" liée à l'IA (Gemini) est conçue pour échouer silencieusement** sans jamais bloquer le flux principal (liaison note↔argument, message d'encouragement) — un choix de robustesse répété volontairement à chaque ajout d'IA.
- **Les contraintes du tier gratuit Render (512MB RAM, pas de disque persistant, cold start 20-30s) ont concrètement façonné plusieurs décisions d'architecture** : transcription Gemini plutôt que Whisper local en prod, images en `bytea` Postgres plutôt que sur disque, ping actif de `/api/health` côté frontend pour détecter un backend réellement joignable.
