import test from "node:test";
import assert from "node:assert/strict";
import { inspectTranscript, sampleTranscript } from "../src/tclk.mjs";

test("folds the signed official-format fixture to claimed", () => {
  const result = inspectTranscript(sampleTranscript);
  assert.equal(result.summary.records, 5);
  assert.equal(result.summary.verified, 5);
  assert.equal(result.summary.invalid, 0);
  assert.equal(result.summary.terminal, 1);
  assert.equal(result.deals[0].status, "claimed");
  assert.equal(result.deals[0].settlement.code, "NO VALUE");
  assert.deepEqual(result.deals[0].events.map((event) => event.ok), [true, true, true, true, true]);
});

test("rejects a record after its signed message is changed", () => {
  const rows = sampleTranscript.split("\n");
  const offer = JSON.parse(rows[0]);
  offer.text = offer.text.replace("2500000", "2500001");
  rows[0] = JSON.stringify(offer);

  const result = inspectTranscript(rows.join("\n"));
  assert.equal(result.deals.length, 0);
  assert.match(result.invalid[0].reason, /signature does not verify/);
});

test("does not advance state from a detached raw frame", () => {
  const rawFrame = JSON.parse(sampleTranscript.split("\n")[0]).text;
  const result = inspectTranscript(rawFrame);
  assert.equal(result.deals.length, 0);
  assert.equal(result.summary.verified, 0);
  assert.match(result.invalid[0].reason, /signed Technocore metadata is missing/);
});

test("preserves append order instead of moving an early accept behind its offer", () => {
  const rows = sampleTranscript.split("\n");
  [rows[0], rows[1]] = [rows[1], rows[0]];
  const result = inspectTranscript(rows.join("\n"));
  assert.equal(result.deals[0].status, "proposed");
  assert.ok(result.invalid.some((finding) => /no matching preceding authenticated offer/.test(finding.reason)));
});
