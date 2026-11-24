#!/usr/bin/env node

/**
 * Converts Bible SuperSearch JSON (array of verses) into per-book/chapter JSON files.
 * Usage: node scripts/convert-bible.js
 */

const fs = require('fs');
const path = require('path');

const RAW_DIR = path.join(__dirname, 'raw');
const OUT_DIR = path.join(__dirname, '..', 'public', 'bibles');

const VERSIONS = {
  ls1910: { file: 'segond_1910.json', locale: 'fr' },
  kjv: { file: 'kjv.json', locale: 'en' },
  rv1909: { file: 'rv_1909.json', locale: 'es' },
  luther1912: { file: 'luther_1912.json', locale: 'de' },
};

const OT_BOOKS = [
  { id: 'genesis', num: 1, name: { fr: 'Genèse', en: 'Genesis', es: 'Génesis', de: '1. Mose' } },
  { id: 'exodus', num: 2, name: { fr: 'Exode', en: 'Exodus', es: 'Éxodo', de: '2. Mose' } },
  { id: 'leviticus', num: 3, name: { fr: 'Lévitique', en: 'Leviticus', es: 'Levítico', de: '3. Mose' } },
  { id: 'numbers', num: 4, name: { fr: 'Nombres', en: 'Numbers', es: 'Números', de: '4. Mose' } },
  { id: 'deuteronomy', num: 5, name: { fr: 'Deutéronome', en: 'Deuteronomy', es: 'Deuteronomio', de: '5. Mose' } },
  { id: 'joshua', num: 6, name: { fr: 'Josué', en: 'Joshua', es: 'Josué', de: 'Josua' } },
  { id: 'judges', num: 7, name: { fr: 'Juges', en: 'Judges', es: 'Jueces', de: 'Richter' } },
  { id: 'ruth', num: 8, name: { fr: 'Ruth', en: 'Ruth', es: 'Rut', de: 'Ruth' } },
  { id: '1-samuel', num: 9, name: { fr: '1 Samuel', en: '1 Samuel', es: '1 Samuel', de: '1. Samuel' } },
  { id: '2-samuel', num: 10, name: { fr: '2 Samuel', en: '2 Samuel', es: '2 Samuel', de: '2. Samuel' } },
  { id: '1-kings', num: 11, name: { fr: '1 Rois', en: '1 Kings', es: '1 Reyes', de: '1. Könige' } },
  { id: '2-kings', num: 12, name: { fr: '2 Rois', en: '2 Kings', es: '2 Reyes', de: '2. Könige' } },
  { id: '1-chronicles', num: 13, name: { fr: '1 Chroniques', en: '1 Chronicles', es: '1 Crónicas', de: '1. Chronik' } },
  { id: '2-chronicles', num: 14, name: { fr: '2 Chroniques', en: '2 Chronicles', es: '2 Crónicas', de: '2. Chronik' } },
  { id: 'ezra', num: 15, name: { fr: 'Esdras', en: 'Ezra', es: 'Esdras', de: 'Esra' } },
  { id: 'nehemiah', num: 16, name: { fr: 'Néhémie', en: 'Nehemiah', es: 'Nehemías', de: 'Nehemia' } },
  { id: 'esther', num: 17, name: { fr: 'Esther', en: 'Esther', es: 'Ester', de: 'Esther' } },
  { id: 'job', num: 18, name: { fr: 'Job', en: 'Job', es: 'Job', de: 'Hiob' } },
  { id: 'psalms', num: 19, name: { fr: 'Psaumes', en: 'Psalms', es: 'Salmos', de: 'Psalmen' } },
  { id: 'proverbs', num: 20, name: { fr: 'Proverbes', en: 'Proverbs', es: 'Proverbios', de: 'Sprüche' } },
  { id: 'ecclesiastes', num: 21, name: { fr: 'Ecclésiaste', en: 'Ecclesiastes', es: 'Eclesiastés', de: 'Prediger' } },
  { id: 'song-of-solomon', num: 22, name: { fr: 'Cantique des Cantiques', en: 'Song of Solomon', es: 'Cantar', de: 'Hohelied' } },
  { id: 'isaiah', num: 23, name: { fr: 'Ésaïe', en: 'Isaiah', es: 'Isaías', de: 'Jesaja' } },
  { id: 'jeremiah', num: 24, name: { fr: 'Jérémie', en: 'Jeremiah', es: 'Jeremías', de: 'Jeremia' } },
  { id: 'lamentations', num: 25, name: { fr: 'Lamentations', en: 'Lamentations', es: 'Lamentaciones', de: 'Klagelieder' } },
  { id: 'ezekiel', num: 26, name: { fr: 'Ézéchiel', en: 'Ezekiel', es: 'Ezequiel', de: 'Hesekiel' } },
  { id: 'daniel', num: 27, name: { fr: 'Daniel', en: 'Daniel', es: 'Daniel', de: 'Daniel' } },
  { id: 'hosea', num: 28, name: { fr: 'Osée', en: 'Hosea', es: 'Oseas', de: 'Hosea' } },
  { id: 'joel', num: 29, name: { fr: 'Joël', en: 'Joel', es: 'Joel', de: 'Joel' } },
  { id: 'amos', num: 30, name: { fr: 'Amos', en: 'Amos', es: 'Amós', de: 'Amos' } },
  { id: 'obadiah', num: 31, name: { fr: 'Abdias', en: 'Obadiah', es: 'Abdías', de: 'Obadja' } },
  { id: 'jonah', num: 32, name: { fr: 'Jonas', en: 'Jonah', es: 'Jonás', de: 'Jona' } },
  { id: 'micah', num: 33, name: { fr: 'Michée', en: 'Micah', es: 'Miqueas', de: 'Micha' } },
  { id: 'nahum', num: 34, name: { fr: 'Nahum', en: 'Nahum', es: 'Nahúm', de: 'Nahum' } },
  { id: 'habakkuk', num: 35, name: { fr: 'Habacuc', en: 'Habakkuk', es: 'Habacuc', de: 'Habakuk' } },
  { id: 'zephaniah', num: 36, name: { fr: 'Sophonie', en: 'Zephaniah', es: 'Sofonías', de: 'Zefanja' } },
  { id: 'haggai', num: 37, name: { fr: 'Aggée', en: 'Haggai', es: 'Ageo', de: 'Haggai' } },
  { id: 'zechariah', num: 38, name: { fr: 'Zacharie', en: 'Zechariah', es: 'Zacarías', de: 'Sacharja' } },
  { id: 'malachi', num: 39, name: { fr: 'Malachie', en: 'Malachi', es: 'Malaquías', de: 'Maleachi' } },
];

const NT_BOOKS = [
  { id: 'matthew', num: 40, name: { fr: 'Matthieu', en: 'Matthew', es: 'Mateo', de: 'Matthäus' } },
  { id: 'mark', num: 41, name: { fr: 'Marc', en: 'Mark', es: 'Marcos', de: 'Markus' } },
  { id: 'luke', num: 42, name: { fr: 'Luc', en: 'Luke', es: 'Lucas', de: 'Lukas' } },
  { id: 'john', num: 43, name: { fr: 'Jean', en: 'John', es: 'Juan', de: 'Johannes' } },
  { id: 'acts', num: 44, name: { fr: 'Actes', en: 'Acts', es: 'Hechos', de: 'Apostelgeschichte' } },
  { id: 'romans', num: 45, name: { fr: 'Romains', en: 'Romans', es: 'Romanos', de: 'Römer' } },
  { id: '1-corinthians', num: 46, name: { fr: '1 Corinthiens', en: '1 Corinthians', es: '1 Corintios', de: '1. Korinther' } },
  { id: '2-corinthians', num: 47, name: { fr: '2 Corinthiens', en: '2 Corinthians', es: '2 Corintios', de: '2. Korinther' } },
  { id: 'galatians', num: 48, name: { fr: 'Galates', en: 'Galatians', es: 'Gálatas', de: 'Galater' } },
  { id: 'ephesians', num: 49, name: { fr: 'Éphésiens', en: 'Ephesians', es: 'Efesios', de: 'Epheser' } },
  { id: 'philippians', num: 50, name: { fr: 'Philippiens', en: 'Philippians', es: 'Filipenses', de: 'Philipper' } },
  { id: 'colossians', num: 51, name: { fr: 'Colossiens', en: 'Colossians', es: 'Colosenses', de: 'Kolosser' } },
  { id: '1-thessalonians', num: 52, name: { fr: '1 Thessaloniciens', en: '1 Thessalonians', es: '1 Tesalonicenses', de: '1. Thessalonicher' } },
  { id: '2-thessalonians', num: 53, name: { fr: '2 Thessaloniciens', en: '2 Thessalonians', es: '2 Tesalonicenses', de: '2. Thessalonicher' } },
  { id: '1-timothy', num: 54, name: { fr: '1 Timothée', en: '1 Timothy', es: '1 Timoteo', de: '1. Timotheus' } },
  { id: '2-timothy', num: 55, name: { fr: '2 Timothée', en: '2 Timothy', es: '2 Timoteo', de: '2. Timotheus' } },
  { id: 'titus', num: 56, name: { fr: 'Tite', en: 'Titus', es: 'Tito', de: 'Titus' } },
  { id: 'philemon', num: 57, name: { fr: 'Philémon', en: 'Philemon', es: 'Filemón', de: 'Philemon' } },
  { id: 'hebrews', num: 58, name: { fr: 'Hébreux', en: 'Hebrews', es: 'Hebreos', de: 'Hebräer' } },
  { id: 'james', num: 59, name: { fr: 'Jacques', en: 'James', es: 'Santiago', de: 'Jakobus' } },
  { id: '1-peter', num: 60, name: { fr: '1 Pierre', en: '1 Peter', es: '1 Pedro', de: '1. Petrus' } },
  { id: '2-peter', num: 61, name: { fr: '2 Pierre', en: '2 Peter', es: '2 Pedro', de: '2. Petrus' } },
  { id: '1-john', num: 62, name: { fr: '1 Jean', en: '1 John', es: '1 Juan', de: '1. Johannes' } },
  { id: '2-john', num: 63, name: { fr: '2 Jean', en: '2 John', es: '2 Juan', de: '2. Johannes' } },
  { id: '3-john', num: 64, name: { fr: '3 Jean', en: '3 John', es: '3 Juan', de: '3. Johannes' } },
  { id: 'jude', num: 65, name: { fr: 'Jude', en: 'Jude', es: 'Judas', de: 'Judas' } },
  { id: 'revelation', num: 66, name: { fr: 'Apocalypse', en: 'Revelation', es: 'Apocalipsis', de: 'Offenbarung' } },
];

const ALL_BOOKS = [
  ...OT_BOOKS.map(b => ({ ...b, testament: 'ot' })),
  ...NT_BOOKS.map(b => ({ ...b, testament: 'nt' })),
];

// Build lookup by book number
const BOOK_BY_NUM = new Map();
for (const book of ALL_BOOKS) {
  BOOK_BY_NUM.set(book.num, book);
}

// Also build by name for matching
const BOOK_BY_NAME = new Map();
for (const book of ALL_BOOKS) {
  for (const [locale, name] of Object.entries(book.name)) {
    BOOK_BY_NAME.set(name.toLowerCase(), book);
  }
}

/**
 * Nettoie le texte d'un verset. Dans la KJV, les mots ajoutés par les
 * traducteurs (italiques à l'impression) sont entre crochets : on retire
 * les crochets et on garde les mots.
 */
function cleanText(text, versionKey) {
  if (versionKey !== 'kjv') return text;
  return text.replace(/[[]]/g, '').replace(/ {2,}/g, ' ').trim();
}

function processData(verses, versionKey) {
  // Group verses by book+chapter
  const grouped = new Map();

  for (const v of verses) {
    const bookNum = v.book;
    const book = BOOK_BY_NUM.get(bookNum);
    if (!book) {
      console.warn(`  [${versionKey}] Unknown book number: ${bookNum} (${v.book_name}), skipping`);
      continue;
    }

    const chapNum = v.chapter;
    const key = `${book.id}:${chapNum}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        book: book.name['en'] || book.id,
        bookId: book.id,
        chapter: chapNum,
        verses: [],
      });
    }

    grouped.get(key).verses.push({
      verse: v.verse,
      text: cleanText(v.text, versionKey),
    });
  }

  let chaptersCount = 0;
  let versesCount = 0;

  // Write files
  for (const [key, chapterData] of grouped) {
    const bookDir = path.join(OUT_DIR, versionKey, chapterData.bookId);
    fs.mkdirSync(bookDir, { recursive: true });

    chapterData.verses.sort((a, b) => a.verse - b.verse);

    fs.writeFileSync(
      path.join(bookDir, `${chapterData.chapter}.json`),
      JSON.stringify(chapterData),
      'utf-8',
    );
    chaptersCount++;
    versesCount += chapterData.verses.length;
  }

  return { chaptersCount, versesCount };
}

// ─── MAIN ───────────────────────────────────────────────────────────────
console.log('Bible Data Converter\n');

if (!fs.existsSync(RAW_DIR)) {
  console.error(`Raw directory not found: ${RAW_DIR}`);
  process.exit(1);
}

const manifestBooks = ALL_BOOKS.map(b => ({
  id: b.id,
  name: b.name,
  testament: b.testament,
  chapters: 0,
}));

for (const [versionKey, config] of Object.entries(VERSIONS)) {
  const filePath = path.join(RAW_DIR, config.file);
  if (!fs.existsSync(filePath)) {
    console.warn(`Missing: ${filePath} — skipping ${versionKey}`);
    continue;
  }

  console.log(`Processing ${versionKey} (${config.file})...`);
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  let verses;
  if (Array.isArray(raw)) {
    verses = raw;
  } else if (raw.verses && Array.isArray(raw.verses)) {
    verses = raw.verses;
  } else {
    console.warn(`  Unknown format for ${versionKey}, skipping`);
    continue;
  }

  const { chaptersCount, versesCount } = processData(verses, versionKey);
  console.log(`  → ${chaptersCount} chapters, ${versesCount} verses\n`);

  // Update chapter counts in manifest
  for (const book of manifestBooks) {
    const bookDir = path.join(OUT_DIR, versionKey, book.id);
    if (fs.existsSync(bookDir)) {
      const count = fs.readdirSync(bookDir).filter(f => f.endsWith('.json')).length;
      book.chapters = Math.max(book.chapters, count);
    }
  }
}

// Write manifest
const manifest = { books: manifestBooks };
fs.writeFileSync(
  path.join(OUT_DIR, 'manifest.json'),
  JSON.stringify(manifest, null, 2),
  'utf-8',
);
console.log(`Wrote manifest.json with ${manifestBooks.length} books`);
