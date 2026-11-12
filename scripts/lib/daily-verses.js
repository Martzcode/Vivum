/**
 * Utilitaires partagés par les scripts du « verset du jour » :
 * validation du pool embarqué et import d'exports OpenBible.info.
 *
 * Node.js uniquement (scripts de développement/build), jamais exécuté dans
 * l'application. Aucune dépendance externe.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const BIBLES_DIR = path.join(ROOT, 'public', 'bibles');
const MANIFEST_PATH = path.join(BIBLES_DIR, 'manifest.json');
const POOL_PATH = path.join(ROOT, 'public', 'data', 'daily-verses.json');

/** Identifiants OSIS → slugs internes (dossier de chaque livre). */
const OSIS_BOOKS = {
  Gen: 'genesis',
  Exod: 'exodus',
  Lev: 'leviticus',
  Num: 'numbers',
  Deut: 'deuteronomy',
  Josh: 'joshua',
  Judg: 'judges',
  Ruth: 'ruth',
  '1Sam': '1-samuel',
  '2Sam': '2-samuel',
  '1Kgs': '1-kings',
  '2Kgs': '2-kings',
  '1Chr': '1-chronicles',
  '2Chr': '2-chronicles',
  Ezra: 'ezra',
  Neh: 'nehemiah',
  Esth: 'esther',
  Job: 'job',
  Ps: 'psalms',
  Prov: 'proverbs',
  Eccl: 'ecclesiastes',
  Song: 'song-of-solomon',
  Isa: 'isaiah',
  Jer: 'jeremiah',
  Lam: 'lamentations',
  Ezek: 'ezekiel',
  Dan: 'daniel',
  Hos: 'hosea',
  Joel: 'joel',
  Amos: 'amos',
  Obad: 'obadiah',
  Jonah: 'jonah',
  Mic: 'micah',
  Nah: 'nahum',
  Hab: 'habakkuk',
  Zeph: 'zephaniah',
  Hag: 'haggai',
  Zech: 'zechariah',
  Mal: 'malachi',
  Matt: 'matthew',
  Mark: 'mark',
  Luke: 'luke',
  John: 'john',
  Acts: 'acts',
  Rom: 'romans',
  '1Cor': '1-corinthians',
  '2Cor': '2-corinthians',
  Gal: 'galatians',
  Eph: 'ephesians',
  Phil: 'philippians',
  Col: 'colossians',
  '1Thess': '1-thessalonians',
  '2Thess': '2-thessalonians',
  '1Tim': '1-timothy',
  '2Tim': '2-timothy',
  Titus: 'titus',
  Phlm: 'philemon',
  Heb: 'hebrews',
  Jas: 'james',
  '1Pet': '1-peter',
  '2Pet': '2-peter',
  '1John': '1-john',
  '2John': '2-john',
  '3John': '3-john',
  Jude: 'jude',
  Rev: 'revelation',
};

/**
 * Ordre canonique protestant (1–66), identique aux dossiers de
 * `public/bibles`. Sert à décoder les identifiants OpenBible `bbcccvvv`.
 */
const OPENBIBLE_BOOKS = [
  'genesis',
  'exodus',
  'leviticus',
  'numbers',
  'deuteronomy',
  'joshua',
  'judges',
  'ruth',
  '1-samuel',
  '2-samuel',
  '1-kings',
  '2-kings',
  '1-chronicles',
  '2-chronicles',
  'ezra',
  'nehemiah',
  'esther',
  'job',
  'psalms',
  'proverbs',
  'ecclesiastes',
  'song-of-solomon',
  'isaiah',
  'jeremiah',
  'lamentations',
  'ezekiel',
  'daniel',
  'hosea',
  'joel',
  'amos',
  'obadiah',
  'jonah',
  'micah',
  'nahum',
  'habakkuk',
  'zephaniah',
  'haggai',
  'zechariah',
  'malachi',
  'matthew',
  'mark',
  'luke',
  'john',
  'acts',
  'romans',
  '1-corinthians',
  '2-corinthians',
  'galatians',
  'ephesians',
  'philippians',
  'colossians',
  '1-thessalonians',
  '2-thessalonians',
  '1-timothy',
  '2-timothy',
  'titus',
  'philemon',
  'hebrews',
  'james',
  '1-peter',
  '2-peter',
  '1-john',
  '2-john',
  '3-john',
  'jude',
  'revelation',
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadManifest() {
  return readJson(MANIFEST_PATH);
}

function loadPool(file = POOL_PATH) {
  return readJson(file);
}

/** Versions installées = sous-dossiers de `public/bibles`. */
function listVersions() {
  return fs
    .readdirSync(BIBLES_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
}

function readChapter(version, bookId, chapter) {
  const file = path.join(BIBLES_DIR, version, bookId, `${chapter}.json`);
  if (!fs.existsSync(file)) return null;
  return readJson(file);
}

/**
 * Valide une entrée du pool pour toutes les versions présentes.
 * Retourne `{ errors: string[], warnings: string[] }`.
 */
function validateEntry(entry, options = {}) {
  const versions = options.versions || listVersions();
  const books = options.books || loadManifest().books;
  const minChars = options.minChars ?? 30;
  const maxChars = options.maxChars ?? 700;
  const errors = [];
  const warnings = [];

  const book = books.find(item => item.id === entry.bookId);
  if (!book) {
    errors.push(`livre inconnu « ${entry.bookId} »`);
    return { errors, warnings };
  }
  if (!Number.isInteger(entry.chapter) || entry.chapter < 1 || entry.chapter > book.chapters) {
    errors.push(`chapitre hors bornes (${entry.chapter})`);
    return { errors, warnings };
  }
  if (entry.endVerse < entry.startVerse) {
    errors.push(`plage inversée (${entry.startVerse}-${entry.endVerse})`);
    return { errors, warnings };
  }

  for (const version of versions) {
    const chapter = readChapter(version, entry.bookId, entry.chapter);
    if (!chapter) {
      errors.push(`${version} : chapitre ${entry.chapter} introuvable`);
      continue;
    }

    const byNumber = new Map(chapter.verses.map(verse => [verse.verse, verse]));
    const missing = [];
    for (let number = entry.startVerse; number <= entry.endVerse; number++) {
      if (!byNumber.has(number)) missing.push(number);
    }
    if (missing.length > 0) {
      errors.push(`${version} : versets absents ${missing.join(', ')}`);
      continue;
    }

    const text = [];
    for (let number = entry.startVerse; number <= entry.endVerse; number++) {
      text.push(byNumber.get(number).text);
    }
    const length = text.join(' ').length;
    if (length < minChars) {
      warnings.push(`${version} : passage très court (${length} caractères)`);
    }
    if (length > maxChars) {
      warnings.push(`${version} : passage long (${length} caractères)`);
    }
  }

  return { errors, warnings };
}

/**
 * Parse une référence OSIS : `Gen.1.1`, `Gen.1.1-Gen.1.3`, `Gen.1.1-3`.
 * Retourne `null` si le format n'est pas reconnu.
 */
function parseOsisRef(value) {
  if (typeof value !== 'string') return null;

  const normalized = value.trim().replace(/\u2013|\u2014/g, '-');
  const single = /^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)$/.exec(normalized);
  if (single) {
    const bookId = OSIS_BOOKS[single[1]];
    if (!bookId) return null;
    return {
      bookId,
      chapter: Number(single[2]),
      startVerse: Number(single[3]),
      endVerse: Number(single[3]),
    };
  }

  const range = /^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)(?:-([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)|-(\d+))$/.exec(
    normalized,
  );
  if (!range) return null;

  const bookId = OSIS_BOOKS[range[1]];
  if (!bookId) return null;

  const chapter = Number(range[2]);
  const startVerse = Number(range[3]);

  if (range[7] !== undefined) {
    return { bookId, chapter, startVerse, endVerse: Number(range[7]) };
  }

  if (OSIS_BOOKS[range[4]] !== bookId || Number(range[5]) !== chapter) {
    return null;
  }
  return { bookId, chapter, startVerse, endVerse: Number(range[6]) };
}

/** Décode un identifiant OpenBible `bbcccvvv` (livre, chapitre, verset). */
function parseOpenBibleId(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!/^\d{8}$/.test(normalized)) return null;

  const book = Number(normalized.slice(0, 2));
  const chapter = Number(normalized.slice(2, 5));
  const verse = Number(normalized.slice(5, 8));
  const bookId = OPENBIBLE_BOOKS[book - 1];
  if (!bookId || chapter < 1 || verse < 1) return null;

  return { bookId, chapter, verse };
}

/**
 * Parse une ligne de l'export `topic-votes.txt` d'OpenBible :
 * `Start Verse ID` (`01001001`) et `End Verse ID` optionnel. Les plages qui
 * traversent deux chapitres ne sont pas prises en charge (retour `null`).
 */
function parseOpenBibleRef(startValue, endValue) {
  const start = parseOpenBibleId(startValue);
  if (!start) return null;

  if (!endValue || String(endValue).trim() === '') {
    return {
      bookId: start.bookId,
      chapter: start.chapter,
      startVerse: start.verse,
      endVerse: start.verse,
    };
  }

  const end = parseOpenBibleId(endValue);
  if (!end) return null;
  if (end.bookId !== start.bookId || end.chapter !== start.chapter) return null;
  if (end.verse < start.verse) return null;

  return {
    bookId: start.bookId,
    chapter: start.chapter,
    startVerse: start.verse,
    endVerse: end.verse,
  };
}

/** « Peace », « Peur et anxiété » → clé de thème stable (`peace`, `peur-et-anxiete`). */
function slugifyTopic(topic) {
  return topic
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function entryId(theme, ref) {
  const suffix =
    ref.endVerse === ref.startVerse ? `${ref.startVerse}` : `${ref.startVerse}-${ref.endVerse}`;
  return `${theme}-${ref.bookId}-${ref.chapter}-${suffix}`;
}

module.exports = {
  ROOT,
  BIBLES_DIR,
  MANIFEST_PATH,
  POOL_PATH,
  OSIS_BOOKS,
  OPENBIBLE_BOOKS,
  readJson,
  loadManifest,
  loadPool,
  listVersions,
  readChapter,
  validateEntry,
  parseOsisRef,
  parseOpenBibleId,
  parseOpenBibleRef,
  slugifyTopic,
  entryId,
};
