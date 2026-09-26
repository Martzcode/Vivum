# Changelog

Toutes les versions notables de Vivum sont documentées dans ce fichier.
Le format est basé sur [Keep a Changelog](https://keepachangelog.com/).

## [2026.09.01]

L'application est désormais nommée **Vivum**.

> Le changement d'identifiant Tauri (`com.vivum.app`) et de clés de stockage local font de cette version une application distincte pour le système d'exploitation et pour les données du navigateur : les favoris et la langue mémorisés depuis `Verbum` ne sont pas repris.

### Added
- Nouveau logo de l'application : favicon web, icônes desktop (Windows, macOS, Linux) et barre de titre
- Dossier `docs/` local, exclu du suivi Git

### Changed
- Renommage de l'application **Verbum** → **Vivum** : nom du produit, titre de la fenêtre, textes des cinq langues, noms de paquets (`npm`, Angular, crate Rust) et dossier de build (`dist/vivum`)
- Clés de stockage local : `verbum-favorites` → `vivum-favorites` et `verbum-locale` → `vivum-locale`

### Fixed
- Lien « Aide » du menu de la barre de titre, qui pointait vers une URL inexistante
- Défilement des pages : le conteneur principal gère désormais le scroll, la barre de titre et l'en-tête du lecteur restent fixes et seul le texte des versets défile

## [2026.08.01]

Première release publique.

### Added
- Application de lecture de la Bible multi-langues (français, anglais, espagnol, allemand, malgache)
- Navigation par livres, chapitres et versets
- Recherche textuelle dans les Écritures
- Système de favoris pour sauvegarder des passages
- Interface avec barre de titre personnalisée
- Thème sépia pour une lecture confortable
- Support i18n (français, anglais, espagnol, allemand, malgache)
- Builds Windows (MSI + EXE), Linux (DEB + RPM), macOS (DMG universal)
