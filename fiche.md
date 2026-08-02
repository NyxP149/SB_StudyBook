# 📖 SB_StudyBook — powered by JarVyX

## 🎯 Concept

Application qui permet d'**enregistrer un discours**, de le **transcrire automatiquement**, puis de **transformer cette transcription en note d'étude structurée** (thème, résumé, versets, perles spirituelles, applications personnelles, etc.), sur le modèle des fiches produites manuellement jusqu'ici.

---

## 🧩 Fonctionnalités principales (MVP)

1. **Enregistrement audio**
   - Enregistrer un discours en direct (assemblée, réunion, étude).
   - Import possible d'un fichier audio existant.

2. **Transcription automatique**
   - Conversion audio → texte.
   - Correction/nettoyage du texte brut.

3. **Génération de note d'étude structurée**
   - À partir de la transcription, générer automatiquement une fiche organisée :
     - 🎯 Thème / idée principale
     - 📝 Résumé par sections
     - 📖 Versets cités (avec leur rôle dans le discours)
     - 💎 Perles spirituelles / phrases marquantes
     - ❤️ Applications personnelles
     - ✍️ Espace notes personnelles

---

## 🚀 Fonctionnalités avancées (V2+)

- 📅 **Programme interactif** (organisation par assemblée/jour/discours)
- 🔎 **Recherche** par mot-clé, thème ou référence biblique
- 🤖 **IA intégrée** pour interroger l'ensemble des notes ("Quels discours parlent de la foi ?")
- 🎧 **Audio synchronisé** (texte défile avec l'audio, clic = saut à la position)
- 📈 **Statistiques** (discours étudiés, versets consultés, notes prises, temps d'étude)
- 🌍 **Bibliothèque évolutive** (plusieurs assemblées, années, discours publics, Tour de Garde, culte familial...)
- ⭐ Système de favoris

---

## 🏗️ Architecture technique envisagée

| Composant | Techno |
|---|---|
| Frontend | React + TypeScript (ou React Native pour le mobile) |
| Backend | Spring Boot (Java) |
| Base de données | PostgreSQL |
| Recherche | Elasticsearch ou recherche plein texte intégrée |
| Transcription | API de speech-to-text (à définir) |
| IA / génération de notes | OpenAI (ou modèle local) |

---

## 💡 Pourquoi ce projet

- Progresser en Java / Spring Boot
- Pratiquer le développement full-stack
- Apprendre à intégrer l'IA dans une vraie application
- Créer un outil réellement utilisé au quotidien

---

## 🗺️ Roadmap suggérée

1. **Phase 1** — MVP : enregistrement + transcription + génération de note structurée (mono-utilisateur, sans compte)
2. **Phase 2** — Organisation par programme/assemblée + recherche
3. **Phase 3** — IA conversationnelle sur les notes + audio synchronisé
4. **Phase 4** — Statistiques + bibliothèque multi-années + mobile
