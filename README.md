# Token Radar

[![make.fun](https://img.shields.io/badge/make.fun-token--radar--01-blue)](https://make.fun/competitions/token-radar-01)

Every protocol with no token, ranked by the launch value its own numbers imply — and a farm plan for each one.

## What it does

Token Radar reads the sealed DefiLlama snapshot, finds every protocol whose record carries no token (no market cap, no CoinGecko id, no symbol), and ranks them by **implied launch value** under the `radar-2` model:

```
implied value = TVL × category multiple × size tier × growth × maturity × chains
```

- **Category multiple** (0.10–0.35) — the launch multiple for the protocol's own category.
- **Size tier** — 1.00 below $100M TVL, 0.85 to $1B, 0.70 to $10B, 0.55 above it.
- **Growth** — the protocol's 7-day change, clamped to −60%…+120%, half weight.
- **Maturity** — 0.60 at listing, rising to 1.00 after 3 years running with no token.
- **Chains** — +2% per extra chain, capped at +10%.

No protocol's name ever changes its score. The board carries the whole watchlist plus every other pre-token protocol below the watchlist floor that the same rule admits — no wrapped, staked or bridged product, no exchange, no versioned pool — 178 rows in this snapshot. Protocols whose token already trades are shown apart in the Live view, at their own market value, never mixed into the ranked board.

## How to use

```bash
node main.ts
```

It reads `/input/snapshot.json` and writes to `/output`:

- `board.json` — the ranked board: rank, protocol, TVL, 7-day growth, age, implied value, the model's multipliers, and a 6-step farm plan per row.
- `data.js` — the dashboard's whole dataset as one script.
- `dashboard/` — the static dashboard: the board (search, filter by category and chain, watchlist-only, sortable), a detail view with the model's working and the farm plan, and the Live view.
- `screenshots/` — the dashboard in three states.
- `dossier.json` — the dossier `vendor/makefun-board.ts` writes for the dashboard and screenshots.

Requirements: Node 22.18+ (tested on 24.22.1). Standard library only — no install, no network.

## Why

A token launch is a liquidity event whose size is roughly predictable from the protocol it comes from: big TVL, a category that launches well, growth, and a long run with no token. The radar makes that ranking explicit and checkable — every factor is a figure from the snapshot, and the dashboard shows the model's working for each row, so a reader can see why one protocol outranks another.

## License

[MIT](LICENSE)
