/**
 * Anki .apkg import/export utilities.
 *
 * .apkg format:
 *   ZIP archive containing:
 *   - collection.anki21 (or collection.anki2) — SQLite database
 *   - media — JSON map of { "0": "filename.jpg", ... }
 *   - 0, 1, 2, ... — media files (optional)
 *
 * We support basic two-field notes (Front / Back) only.
 * Media attachments are ignored on import; not included on export.
 */

import JSZip from "jszip";

export type AnkiCard = {
  front: string;
  back: string;
  tags: string[];
};

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/** Load sql.js (WASM-backed SQLite) lazily. */
async function loadSqlJs() {
  // Dynamic import avoids bundling ~2 MB WASM in the main chunk.
  const initSqlJs = (await import("sql.js")).default;
  return initSqlJs({
    locateFile: (filename: string) => `/${filename}`,
  });
}

/** Parse Anki's space-padded tag string → string[] */
function parseTags(raw: string): string[] {
  return raw
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/** Format tags for Anki storage: " tag1 tag2 " */
function formatTags(tags: string[]): string {
  if (tags.length === 0) return " ";
  return " " + tags.join(" ") + " ";
}

/** Strip basic HTML tags (Anki fields may contain HTML). */
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

/** Generate a simple 10-char guid for Anki notes. */
function generateGuid(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 10 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length)),
  ).join("");
}

// --------------------------------------------------------------------------
// IMPORT
// --------------------------------------------------------------------------

/**
 * Parse an .apkg file and return an array of basic cards.
 * Only notes with at least 2 fields (Front, Back) are returned.
 * HTML is stripped from field content.
 */
export async function importApkg(buffer: ArrayBuffer): Promise<AnkiCard[]> {
  // 1. Unzip
  const zip = await JSZip.loadAsync(buffer);

  // Try anki21 first, fall back to anki2
  const dbFile = zip.file("collection.anki21") ?? zip.file("collection.anki2");
  if (!dbFile) {
    throw new Error(
      "Invalid .apkg: missing collection.anki21 or collection.anki2",
    );
  }

  const dbBuffer = await dbFile.async("arraybuffer");
  const SQL = await loadSqlJs();
  const db = new SQL.Database(new Uint8Array(dbBuffer));

  const cards: AnkiCard[] = [];

  try {
    // Each note stores all fields joined by the ASCII unit separator (0x1f).
    // For basic note types: field[0] = Front, field[1] = Back.
    const result = db.exec("SELECT flds, tags FROM notes");
    if (result.length === 0) return [];

    const rows = result[0].values;
    for (const row of rows) {
      const flds = String(row[0] ?? "");
      const tagsRaw = String(row[1] ?? "");

      const fields = flds.split("\x1f");
      if (fields.length < 2) continue;

      const front = stripHtml(fields[0]).trim();
      const back = stripHtml(fields[1]).trim();

      if (!front || !back) continue;

      cards.push({
        front,
        back,
        tags: parseTags(tagsRaw),
      });
    }
  } finally {
    db.close();
  }

  return cards;
}

// --------------------------------------------------------------------------
// EXPORT
// --------------------------------------------------------------------------

/** Minimal Anki models JSON — one "Basic" model. */
function buildModelsJson(modelId: number, deckId: number): string {
  const now = Math.floor(Date.now() / 1000);
  return JSON.stringify({
    [modelId]: {
      id: modelId,
      name: "Basic",
      type: 0,
      mod: now,
      usn: -1,
      sortf: 0,
      did: deckId,
      tmpls: [
        {
          name: "Card 1",
          ord: 0,
          qfmt: "{{Front}}",
          afmt: "{{FrontSide}}\n\n<hr id=answer>\n\n{{Back}}",
          bqfmt: "",
          bafmt: "",
          did: null,
          bfont: "",
          bsize: 0,
        },
      ],
      flds: [
        {
          name: "Front",
          ord: 0,
          sticky: false,
          rtl: false,
          font: "Arial",
          size: 20,
          media: [],
        },
        {
          name: "Back",
          ord: 1,
          sticky: false,
          rtl: false,
          font: "Arial",
          size: 20,
          media: [],
        },
      ],
      css: ".card { font-family: arial; font-size: 20px; text-align: center; color: black; background-color: white; }",
      latexPre: "",
      latexPost: "",
      tags: [],
      vers: [],
    },
  });
}

/** Minimal Anki decks JSON — one deck. */
function buildDecksJson(deckId: number, deckName: string): string {
  const now = Math.floor(Date.now() / 1000);
  return JSON.stringify({
    [deckId]: {
      id: deckId,
      name: deckName,
      desc: "",
      mod: now,
      usn: -1,
      lrnToday: [0, 0],
      revToday: [0, 0],
      newToday: [0, 0],
      timeToday: [0, 0],
      conf: 1,
      extendNew: 10,
      extendRev: 50,
      collapsed: false,
      browserCollapsed: false,
      dyn: 0,
    },
  });
}

/** Minimal deck config JSON. */
function buildDconfJson(): string {
  return JSON.stringify({
    "1": {
      id: 1,
      name: "Default",
      replayq: true,
      lapse: {
        delays: [10],
        mult: 0,
        minInt: 1,
        leechFails: 8,
        leechAction: 0,
      },
      rev: {
        perDay: 200,
        ease4: 1.3,
        fuzz: 0.05,
        minSpace: 1,
        ivlFct: 1,
        maxIvl: 36500,
        bury: true,
        hardFactor: 1.2,
      },
      new: {
        perDay: 20,
        delays: [1, 10],
        separate: true,
        ints: [1, 4, 7],
        initialFactor: 2500,
        bury: false,
        order: 1,
      },
      timer: 0,
      maxTaken: 60,
      usn: 0,
      mod: 0,
      autoplay: true,
    },
  });
}

/**
 * Build a minimal Anki SQLite database and return it as Uint8Array.
 * Uses a fixed model/deck ID based on the current timestamp.
 */
async function buildAnkiDb(
  cards: AnkiCard[],
  deckName: string,
): Promise<Uint8Array> {
  const SQL = await loadSqlJs();
  const db = new SQL.Database();

  const now = Math.floor(Date.now() / 1000);
  const deckId = now;
  const modelId = now + 1;

  // Create schema
  db.run(`
    CREATE TABLE col (
      id    integer primary key,
      crt   integer not null,
      mod   integer not null,
      scm   integer not null,
      ver   integer not null,
      dty   integer not null,
      usn   integer not null,
      ls    integer not null,
      conf  text not null,
      models text not null,
      decks text not null,
      dconf text not null,
      tags  text not null
    );
  `);

  db.run(`
    CREATE TABLE notes (
      id    integer primary key,
      guid  text not null,
      mid   integer not null,
      mod   integer not null,
      usn   integer not null,
      tags  text not null,
      flds  text not null,
      sfld  text not null,
      csum  integer not null,
      flags integer not null,
      data  text not null
    );
  `);

  db.run(`
    CREATE TABLE cards (
      id    integer primary key,
      nid   integer not null,
      did   integer not null,
      ord   integer not null,
      mod   integer not null,
      usn   integer not null,
      type  integer not null,
      queue integer not null,
      due   integer not null,
      ivl   integer not null,
      factor integer not null,
      reps  integer not null,
      lapses integer not null,
      left  integer not null,
      odue  integer not null,
      odid  integer not null,
      flags integer not null,
      data  text not null
    );
  `);

  db.run(
    `CREATE TABLE revlog (id integer primary key, cid integer not null, usn integer not null, ease integer not null, ivl integer not null, lastIvl integer not null, factor integer not null, time integer not null, type integer not null);`,
  );
  db.run(
    `CREATE TABLE graves (usn integer not null, oid integer not null, type integer not null);`,
  );

  // Insert collection metadata
  db.run(
    `INSERT INTO col VALUES (1, ?, ?, ?, 11, 0, -1, 0, '{}', ?, ?, ?, '{}')`,
    [
      now,
      now,
      now,
      buildModelsJson(modelId, deckId),
      buildDecksJson(deckId, deckName),
      buildDconfJson(),
    ],
  );

  // Insert notes + cards
  const insertNote = db.prepare(
    `INSERT INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data) VALUES (?, ?, ?, ?, -1, ?, ?, ?, 0, 0, '')`,
  );
  const insertCard = db.prepare(
    `INSERT INTO cards (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data) VALUES (?, ?, ?, 0, ?, -1, 0, 0, ?, 0, 0, 0, 0, 0, 0, 0, 0, '')`,
  );

  let cardSeq = 1;
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const noteId = now * 1000 + i;
    const cardId = now * 1000 + cardSeq++;
    const flds = `${card.front}\x1f${card.back}`;
    const tags = formatTags(card.tags);

    insertNote.run([
      noteId,
      generateGuid(),
      modelId,
      now,
      tags,
      flds,
      card.front,
    ]);
    insertCard.run([cardId, noteId, deckId, now, i + 1]);
  }

  insertNote.free();
  insertCard.free();

  const data = db.export();
  db.close();
  return data;
}

/**
 * Export cards to an Anki-compatible .apkg blob.
 * Returns a Blob that can be downloaded as a .apkg file.
 */
export async function exportApkg(
  cards: AnkiCard[],
  deckName = "Flashcards Export",
): Promise<Blob> {
  const dbBytes = await buildAnkiDb(cards, deckName);

  const zip = new JSZip();
  zip.file("collection.anki21", dbBytes);
  zip.file("media", "{}");

  return zip.generateAsync({ type: "blob" });
}

/**
 * Trigger a browser download of an .apkg file.
 */
export function downloadApkg(blob: Blob, fileName = "flashcards-export.apkg") {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
