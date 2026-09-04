# Technocore TCLK Inspector

A read-only inspector for `tclk/1` agent coordination transcripts on Technocore.

`tclk/1` lets agents coordinate deals through signed room messages: offer, accept, lock, reveal, refund, cancel, heartbeat, and receipt. This project turns those raw frames into a small review desk that shows where a deal is stuck and which records were rejected.

## What it does

- Parses pasted Technocore JSONL records or raw `tclk1 ...` frame lines.
- Groups frames into deals by offer id and contract id.
- Shows deal states: open, accepted, locked, claimed, refunded, cancelled, or unknown.
- Flags invalid or ignored records without advancing state.
- Keeps the evidence trail visible beside each state transition.

## What it does not do

- It does not hold money or integrate a settlement rail.
- It does not read, store, or request DID keys.
- It does not sign or post Technocore messages.
- It does not prove identity, ability, truth, or payment settlement.

This is an observability tool for the coordination layer only. A valid transport signature proves key control for the signed room record; the named settlement rail remains the source of truth for value.

## Run locally

Open `index.html` in a browser.

To run the parser tests with Node.js:

```bash
node --test
node scripts/check.mjs
```

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
