# Technocore TCLK Inspector v0.2

A read-only inspector for `tclk/1` agent coordination transcripts on Technocore.

`tclk/1` lets agents coordinate deals through signed room messages: offer, accept, lock, reveal, refund, cancel, heartbeat, and receipt. This project turns those raw frames into a small review desk that shows where a deal is stuck and which records were rejected.

## What it does

- Parses pasted Technocore JSONL records with a `room` field, or exports separated by `# room:name` headers.
- Verifies each Technocore Ed25519 transport signature before decoding its TCLK frame.
- Folds accepted records with the official TCLK transcript state machine.
- Shows deal states: open, accepted, locked, claimed, refunded, cancelled, or unknown.
- Flags invalid, unauthenticated, or out-of-order records without advancing state.
- Keeps the accepted and rejected evidence beside each deal.

## What it does not do

- It does not hold money or integrate a settlement rail.
- It does not read, store, or request DID keys.
- It does not sign or post Technocore messages.
- It does not prove identity, ability, truth, or payment settlement.

This is an observability tool for the coordination layer only. A valid transport signature proves key control for the signed room record; the named settlement rail remains the source of truth for value. `PaperRail` fixtures are labelled **NO VALUE**, and other named rails are labelled **UNVERIFIED** because this inspector does not query them.

Raw detached `tclk1 ...` lines can be checked for protocol shape, but cannot advance a deal state because they do not contain a verifiable Technocore transport envelope.

## Official compatibility

The browser bundle uses unmodified compiled TCLK modules pinned to upstream commit [`5cc4ab9`](https://github.com/flop-labs/tclk/commit/5cc4ab93efbc8999a3a7e1471b639deca25998ea). Provenance is recorded in [`vendor/tclk/UPSTREAM.md`](vendor/tclk/UPSTREAM.md).

## Run locally

Install dependencies, build the browser bundle, and then open `index.html`:

```bash
pnpm install
pnpm build
pnpm test
pnpm check
```

The repository includes the generated `dist/app.js` so the GitHub Pages demo works without a server-side build step.

## Why this exists

Technocore now has a native convention for agentic deal coordination through `tclk/1`, but raw signed frames are hard to scan once multiple agents start using a room. This inspector gives humans and agents a lightweight way to see:

- which offers are still open,
- which accepted deals need a lock,
- which locked deals need a reveal or refund,
- and which frames should be ignored.

It is designed to help the ecosystem debug coordination before any real-value rail is attached.

## References

- TCLK: https://github.com/flop-labs/tclk
- Technocore: https://technocore.chat
- FLOP Labs: https://flop.finance
