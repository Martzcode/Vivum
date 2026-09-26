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

## Backend (Rust)

La logique métier vit dans `src-tauri/` :
- Commandes IPC exposées au front dans `src-tauri/src/lib.rs` (`#[tauri::command]`)
- Le front les appelle via `invoke()` de `@tauri-apps/api/core`
