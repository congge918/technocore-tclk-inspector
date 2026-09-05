import { ed25519 } from "@noble/curves/ed25519.js";
import { base58, base64urlnopad } from "@scure/base";
import {
  dealRoom,
  encodeFrame,
  hashLockFromPreimage,
  makeAccept,
  makeOffer,
} from "../vendor/tclk/index.js";

const now = Date.parse("2026-09-05T08:00:00Z");

function identity(seedHex) {
  const seed = Uint8Array.from(seedHex.match(/../g).map((part) => Number.parseInt(part, 16)));
  const publicKey = ed25519.getPublicKey(seed);
  return {
    seed,
    did: `did:key:z${base58.encode(Uint8Array.from([0xed, 0x01, ...publicKey]))}`,
  };
}

function signedRecord(room, seq, timestampMs, signer, frame) {
  const text = encodeFrame(frame);
  const nonce = String(9000 + seq);
  const canonical = `${room}|${nonce}|${text}`;
  return {
    room,
    seq,
    ts: new Date(timestampMs).toISOString(),
    from: signer.did,
    nonce,
    sig: base64urlnopad.encode(ed25519.sign(new TextEncoder().encode(canonical), signer.seed)),
    text,
  };
}

const payer = identity("9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60");
const payee = identity("4ccd089b28ff96da9db6c346ec114e0f5b8a319f35aba624da8cf6ed4fb8a6fb");
const secret = hashLockFromPreimage(`0x${"42".repeat(32)}`);
const offer = makeOffer({
  from: payer.did,
  role: "payer",
  amount: "2500000",
  asset: "FLOP",
  lock: "hash",
  rails: ["paper"],
  claimByMs: now + 3_600_000,
  refundAfterMs: now + 7_200_000,
  expiresMs: now + 600_000,
  nonce: "0011223344556677",
  job: { proto: "a2a", id: "inspector-audit-001" },
});
const accept = makeAccept(offer, {
  from: payee.did,
  statement: secret.hash,
  nonce: "8899aabbccddeeff",
});
const lock = {
  type: "lock",
  from: payer.did,
  contract: accept.contract,
  rail: "paper",
  ref: "paper-rehearsal-001",
};
const reveal = {
  type: "reveal",
  from: payee.did,
  contract: accept.contract,
  ref: lock.ref,
  secret: secret.preimage,
};
const receipt = {
  type: "receipt",
  from: payer.did,
  contract: accept.contract,
  outcome: "claimed",
  rail: "paper",
  ref: lock.ref,
};

const records = [
  signedRecord("tclk-offers", 101, now, payer, offer),
  signedRecord("tclk-offers", 102, now + 60_000, payee, accept),
  signedRecord(dealRoom(accept.contract), 1, now + 120_000, payer, lock),
  signedRecord(dealRoom(accept.contract), 2, now + 180_000, payee, reveal),
  signedRecord(dealRoom(accept.contract), 3, now + 240_000, payer, receipt),
];

process.stdout.write(records.map((record) => JSON.stringify(record)).join("\n"));
