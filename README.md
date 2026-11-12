# Vivum

Application desktop **Tauri** : front **Angular**, backend et shell applicatif en **Rust** (`src-tauri`).

## Structure

```
Vivum/
├── src/                    # Code source Angular (front)
├── public/                 # Assets statiques
├── src-tauri/              # Backend Rust : shell Tauri, fenêtre, IPC, logique métier
├── angular.json            # Config Angular CLI
└── package.json            # Dépendances et scripts npm
```

## Prérequis

- [Node.js](https://nodejs.org/) >= 22 + npm
- [Rust](https://rustup.rs/) (stable)
- Dépendances système Tauri (Linux : `webkit2gtk-4.1`, `gtk3`, ...) — voir [docs Tauri](https://tauri.app/start/prerequisites/)

## Démarrage

```bash
npm install
npm start                  # serveur Angular seul sur http://localhost:4200
npm run tauri:dev          # application desktop complète (ng serve + fenêtre native)
```

## Build de production

```bash
npm run tauri:build        # bundle natif dans src-tauri/target/release/bundle/
```

## Verset du jour

Le pool de 460 passages est embarqué (`public/data/daily-verses.json`) : la
sélection est déterministe, thématique et fonctionne hors ligne, sans
répétition pendant plus d'une année.

```bash
npm run validate:daily-verses   # vérifie les passages et le minimum de 367
npm run import:daily-verses -- topic-votes.txt --themes=Peace,Hope --merge
```

Conception, format des données et procédure d'import détaillés dans la
documentation locale `docs/feature-verset-du-jour.md` (dossier `docs/` non
versionné). Les associations thème → verset s'inspirent de l'[index topique
d'OpenBible.info](https://www.openbible.info/topics/), publié sous licence
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Attribution :
OpenBible.info.

## Backend (Rust)

La logique métier vit dans `src-tauri/` :
- Commandes IPC exposées au front dans `src-tauri/src/lib.rs` (`#[tauri::command]`)
- Le front les appelle via `invoke()` de `@tauri-apps/api/core`
