import test from "node:test";
import assert from "node:assert/strict";
import { inspectTranscript, sampleTranscript } from "../src/tclk.mjs";

test("folds sample transcript into visible deal states", () => {
  const result = inspectTranscript(sampleTranscript);
  assert.equal(result.summary.totalDeals, 2);
  assert.equal(result.summary.terminal, 1);
  assert.equal(result.summary.invalid, 2);
  assert.equal(result.deals.find((deal) => deal.id === "offer-demo-001").status, "claimed");
});

test("rejects transport sender mismatch", () => {
  const result = inspectTranscript(JSON.stringify({
    room: "tclk-offers",
    seq: 1,
    ts: 1788351000000,
    from: "did:key:z6Mkreal111111111111111111111111111111111111111111",
    text: 'tclk1 {"amount":"1","asset":"FLOP","claimByMs":3,"expiresMs":1,"from":"did:key:z6Mkfake111111111111111111111111111111111111111111","id":"x","lock":"hash","nonce":"n","refundAfterMs":4,"role":"payer","rails":["paper"],"type":"offer"}',
  }));
  assert.equal(result.invalid[0].reason, "Frame from does not match signed record sender.");
});

test("late accept does not advance the deal", () => {
  const result = inspectTranscript(sampleTranscript);
  const deal = result.deals.find((item) => item.id === "offer-expired-002");
  assert.equal(deal.status, "open");
  assert.equal(deal.rejections[0].label, "Accept arrived after offer expiry");
});
