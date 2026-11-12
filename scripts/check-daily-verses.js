#!/usr/bin/env node

/**
 * Vérifie le pool « verset du jour » contre le corpus embarqué.
 *
 * Contrôles :
 *  - identifiants uniques et champs cohérents ;
 *  - chaque passage existe dans TOUTES les versions installées ;
 *  - longueur du texte dans des bornes raisonnables (évite les versets
 *    trop courts, hors contexte, et les blocs qui cassent la mise en page) ;
 *  - thèmes présents dans les traductions (`dailyVerse.themes.*`) ;
 *  - taille minimale du pool pour une release (`--min-readings`, défaut 367).
 *
 * Usage :
 *   node scripts/check-daily-verses.js [--min=30] [--max=700] [--min-readings=367]
 *
 * Code de sortie 1 si une erreur est détectée (utilisable en CI).
 */

'use strict';

const path = require('path');
const {
  ROOT,
  POOL_PATH,
  loadManifest,
  loadPool,
  listVersions,
  validateEntry,
  readJson,
} = require('./lib/daily-verses');

const args = process.argv.slice(2);
const minChars = readNumberArg(args, '--min', 30);
const maxChars = readNumberArg(args, '--max', 700);
const minReadings = readNumberArg(args, '--min-readings', 367);

function readNumberArg(list, name, fallback) {
  const prefix = `${name}=`;
  const found = list.find(arg => arg.startsWith(prefix));
  if (!found) return fallback;
  const value = Number(found.slice(prefix.length));
  return Number.isFinite(value) ? value : fallback;
}

function main() {
  const pool = loadPool();
  const books = loadManifest().books;
  const versions = listVersions();
  const themes = loadThemes();

  const errors = [];
  const warnings = [];
  const seen = new Set();

  if (!Array.isArray(pool.readings) || pool.readings.length === 0) {
    fail(['le pool ne contient aucun passage']);
    return;
  }

  if (pool.readings.length < minReadings) {
    errors.push(
      `le pool doit contenir au moins ${minReadings} passages (actuellement ${pool.readings.length})`,
    );
  }

  for (const entry of pool.readings) {
    const label = entry.id || '(sans id)';
    if (!entry.id) errors.push(`${label} : identifiant manquant`);
    if (seen.has(entry.id)) errors.push(`${label} : identifiant dupliqué`);
    seen.add(entry.id);

    if (themes.size > 0 && !themes.has(entry.theme)) {
      errors.push(`${label} : thème « ${entry.theme} » absent des traductions`);
    }

    const result = validateEntry(entry, { books, versions, minChars, maxChars });
    for (const message of result.errors) errors.push(`${label} : ${message}`);
    for (const message of result.warnings) warnings.push(`${label} : ${message}`);
  }

  const byTheme = new Map();
  for (const entry of pool.readings) {
    byTheme.set(entry.theme, (byTheme.get(entry.theme) ?? 0) + 1);
  }

  console.log(`Passages : ${pool.readings.length}`);
  console.log(`Release  : ${minReadings} passages minimum`);
  console.log(`Versions  : ${versions.join(', ')}`);
  console.log(
    `Thèmes    : ${[...byTheme.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([theme, count]) => `${theme} (${count})`)
      .join(', ')}`,
  );

  if (warnings.length > 0) {
    console.warn(`\n${warnings.length} avertissement(s) :`);
    for (const warning of warnings) console.warn(`  - ${warning}`);
  }

  if (errors.length > 0) {
    console.error(`\n${errors.length} erreur(s) :`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log('\nPool valide.');
}

/** Thèmes connus d'après la locale de référence (`fr.json`). */
function loadThemes() {
  const file = path.join(ROOT, 'public', 'locale', 'fr.json');
  try {
    const locale = readJson(file);
    const themes = locale?.dailyVerse?.themes;
    return themes && typeof themes === 'object' ? new Set(Object.keys(themes)) : new Set();
  } catch {
    return new Set();
  }
}

function fail(messages) {
  console.error('Pool invalide :');
  for (const message of messages) console.error(`  - ${message}`);
  process.exitCode = 1;
}

main();
