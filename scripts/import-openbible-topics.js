#!/usr/bin/env node

/**
 * Importe un export de l'index topique OpenBible.info vers le pool
 * « verset du jour » embarqué.
 *
 * OpenBible propose des exports de thèmes (CC BY 4.0) au format tabulé :
 * `Topic <TAB> Verse(OSIS) <TAB> Rank`. Les CSV et les fichiers sans en-tête
 * sont aussi acceptés ; la colonne de référence est détectée automatiquement.
 *
 * Seuls les passages présents dans TOUTES les versions installées et dont la
 * longueur reste raisonnable sont conservés. Le texte biblique n'est jamais
 * importé : il est déjà dans le corpus public-domain de l'application.
 *
 * Usage :
 *   node scripts/import-openbible-topics.js topics.txt
 *   node scripts/import-openbible-topics.js topics.txt --themes=Peace,Hope
 *   node scripts/import-openbible-topics.js topics.txt --themes=Peace,Love \
 *       --per-theme=30 --merge
 *
 * Options :
 *   --themes=a,b      filtre les sujets (nom ou clé, insensible à la casse)
 *   --per-theme=N     nombre max de passages par thème (défaut : 25)
 *   --min=N --max=N   bornes de longueur du texte (défaut : 30 / 700)
 *   --out=FILE        fichier de sortie (défaut : public/data/daily-verses.json)
 *   --merge           ajoute au pool existant au lieu de le remplacer
 *   --dry-run         affiche le résultat sans écrire
 *
 * Attribution : les associations thème → verset proviennent d'OpenBible.info
 * (CC BY 4.0). Conserver la mention `source` dans le pool et un lien vers
 * https://www.openbible.info/topics/ dans l'interface.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const {
  POOL_PATH,
  loadManifest,
  loadPool,
  listVersions,
  validateEntry,
  parseOsisRef,
  slugifyTopic,
  entryId,
} = require('./lib/daily-verses');

const args = process.argv.slice(2);
const input = args.find(arg => !arg.startsWith('--'));
const options = {
  themes: readListArg(args, '--themes'),
  perTheme: readNumberArg(args, '--per-theme', 25),
  minChars: readNumberArg(args, '--min', 30),
  maxChars: readNumberArg(args, '--max', 700),
  out: readValueArg(args, '--out') || POOL_PATH,
  merge: args.includes('--merge'),
  dryRun: args.includes('--dry-run'),
};

function readValueArg(list, name) {
  const prefix = `${name}=`;
  const found = list.find(arg => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

function readNumberArg(list, name, fallback) {
  const value = Number(readValueArg(list, name));
  return Number.isFinite(value) ? value : fallback;
}

function readListArg(list, name) {
  const value = readValueArg(list, name);
  if (!value) return null;
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function main() {
  if (!input) {
    console.error('Usage : node scripts/import-openbible-topics.js <export.txt> [options]');
    process.exitCode = 1;
    return;
  }

  const file = path.resolve(process.cwd(), input);
  if (!fs.existsSync(file)) {
    console.error(`Fichier introuvable : ${file}`);
    process.exitCode = 1;
    return;
  }

  const books = loadManifest().books;
  const versions = listVersions();
  const rows = parseRows(fs.readFileSync(file, 'utf8'));

  const filter = options.themes
    ? new Set(options.themes.map(topic => slugifyTopic(topic)))
    : null;

  const selected = [];
  const rejected = { unknownBook: 0, invalidRef: 0, outOfCorpus: 0, tooShort: 0, tooLong: 0 };
  const perTheme = new Map();
  const seen = new Set();

  for (const row of rows) {
    const theme = slugifyTopic(row.topic);
    if (!theme) continue;
    if (filter && !filter.has(theme)) continue;

    const ref = parseOsisRef(row.ref);
    if (!ref) {
      rejected.invalidRef++;
      continue;
    }
    if (!books.some(book => book.id === ref.bookId)) {
      rejected.unknownBook++;
      continue;
    }

    const check = validateEntry(ref, {
      books,
      versions,
      minChars: options.minChars,
      maxChars: options.maxChars,
    });
    if (check.errors.length > 0) {
      rejected.outOfCorpus++;
      continue;
    }
    const lengthWarning = check.warnings.find(warning => warning.includes('caractères'));
    if (lengthWarning?.includes('très court')) {
      rejected.tooShort++;
      continue;
    }
    if (lengthWarning?.includes('passage long')) {
      rejected.tooLong++;
      continue;
    }

    const id = entryId(theme, ref);
    if (seen.has(id)) continue;
    seen.add(id);

    const count = perTheme.get(theme) ?? 0;
    if (count >= options.perTheme) continue;
    perTheme.set(theme, count + 1);

    selected.push({ id, ...ref, theme, rank: row.rank });
  }

  const existing = options.merge ? safeLoadPool() : { schema: 1, readings: [] };
  const merged = new Map();
  for (const entry of existing.readings) merged.set(entry.id, entry);

  for (const entry of selected) {
    const { rank, ...clean } = entry;
    merged.set(clean.id, clean);
  }

  const readings = [...merged.values()].sort(
    (a, b) => a.theme.localeCompare(b.theme) || a.bookId.localeCompare(b.bookId),
  );

  const pool = {
    schema: 1,
    source:
      existing.source ||
      'Thèmes inspirés de l’index topique OpenBible.info (CC BY 4.0)',
    readings,
  };

  console.log(`Lignes lues        : ${rows.length}`);
  console.log(`Passages retenus   : ${selected.length}`);
  console.log(`Pool final         : ${readings.length} passage(s)`);
  console.log(
    `Rejetés            : ${rejected.invalidRef} référence(s) invalide(s), ` +
      `${rejected.outOfCorpus} hors corpus, ${rejected.tooShort} trop court(s), ` +
      `${rejected.tooLong} trop long(s)`,
  );

  const filteredThemes = [...perTheme.keys()].sort();
  if (filteredThemes.length > 0) {
    console.log(
      `Thèmes importés    : ${filteredThemes
        .map(theme => `${theme} (${perTheme.get(theme)})`)
        .join(', ')}`,
    );
  }

  if (options.dryRun) {
    console.log('\n--dry-run : aucun fichier écrit.');
    return;
  }

  fs.mkdirSync(path.dirname(options.out), { recursive: true });
  fs.writeFileSync(options.out, `${JSON.stringify(pool, null, 2)}\n`, 'utf8');
  console.log(`\nÉcrit : ${options.out}`);
  console.log('Vérifiez ensuite avec : npm run validate:daily-verses');
}

/** Détecte le séparateur et la colonne de référence OSIS. */
function parseRows(content) {
  const lines = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));

  const rows = [];
  for (const line of lines) {
    const cells = line.includes('\t') ? line.split('\t') : line.split(',');
    const cleaned = cells.map(cell => cell.trim().replace(/^"|"$/g, ''));

    const refIndex = cleaned.findIndex(cell => parseOsisRef(cell) !== null);
    if (refIndex === -1) continue;

    const topic = cleaned[0] && cleaned[0] !== cleaned[refIndex] ? cleaned[0] : '';
    if (!topic) continue;

    const rankCells = cleaned.filter((cell, index) => index !== refIndex && /^\d+$/.test(cell));
    rows.push({ topic, ref: cleaned[refIndex], rank: Number(rankCells[0] ?? 0) });
  }
  return rows;
}

function safeLoadPool() {
  try {
    return loadPool(options.out);
  } catch {
    return { schema: 1, readings: [] };
  }
}

main();
