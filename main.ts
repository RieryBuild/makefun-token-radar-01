// Token Radar: the sealed snapshot in, the ranked board and its dashboard out.
//
//   node main.ts
//
// Reads /input/snapshot.json, scores every protocol with the radar-2 model in lib/model.ts, and
// writes to /output: board.json (the ranked board), data.js (the dashboard's dataset), dashboard/
// and screenshots/ copied verbatim, and dossier.json (the dossier buildDossier writes for them).
// Standard library only, no network, no randomness: the same snapshot always yields the same bytes.

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { buildDossier } from './vendor/makefun-board.ts';
import {
  MODEL,
  MODEL_VERSION,
  boardIssue,
  buildRadar,
  dataScript,
  parseSnapshot,
} from './lib/model.ts';

const INPUT = '/input/snapshot.json';
const OUT = '/output';
const MAX_DOSSIER_TEXT_BYTES = 65_536;
const MAX_SCREENSHOTS = 4;
const MAX_SCREENSHOT_BYTES = 524_288;
const MAX_DASHBOARD_FILES = 400;
const MAX_DASHBOARD_BYTES = 4 * 1024 * 1024;

/** Canonical JSON: sorted keys, no whitespace — one spelling per value, so the output is stable. */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`canonicalJson: ${value} is not a finite number`);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v)).join(',')}]`;
  if (typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw new TypeError('canonicalJson: only plain objects and arrays');
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`)
      .join(',')}}`;
  }
  throw new TypeError(`canonicalJson: a ${typeof value} has no JSON form`);
}

function main(): void {
  if (!existsSync(INPUT)) throw new Error('missing /input/snapshot.json');
  const text = readFileSync(INPUT, 'utf8');
  const snapshot = parseSnapshot(text);
  const { board, radar } = buildRadar(snapshot, MODEL);

  const issue = boardIssue(board, snapshot);
  if (issue !== null) throw new Error(`board rejected: ${issue}`);
  if (board.length < 100) throw new Error(`board rejected: ${board.length} rows is below the 100-row floor`);

  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/board.json`, `${canonicalJson(board)}\n`, 'utf8');
  writeFileSync(`${OUT}/data.js`, dataScript(radar), 'utf8');
  cpSync('dashboard', `${OUT}/dashboard`, { recursive: true });
  cpSync('screenshots', `${OUT}/screenshots`, { recursive: true });

  const dossier = buildDossier(OUT, {
    text_max_bytes: MAX_DOSSIER_TEXT_BYTES,
    screenshots: { max: MAX_SCREENSHOTS, max_bytes: MAX_SCREENSHOT_BYTES },
    dashboard: { max_files: MAX_DASHBOARD_FILES, max_bytes: MAX_DASHBOARD_BYTES },
  });
  writeFileSync(`${OUT}/dossier.json`, dossier);

  const top = board[0]!;
  console.log(
    [
      `token-radar ${MODEL_VERSION}: ${snapshot.protocols.length} protocols in the snapshot`,
      `${board.length} board rows (${radar.watchlist_size} watchlist + ${radar.early_size} early), ${radar.live_size} live-token rows`,
      `top: ${top.name} at $${top.implied_value_usd.toLocaleString('en-US')} implied, rank 1 of ${board.length}`,
      `board.json ${board.length} rows, dossier.json ${dossier.length} bytes`,
    ].join('\n'),
  );
}

main();
