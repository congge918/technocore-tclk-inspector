import {
  decodeFrame,
  foldTranscript,
  transcriptRecord,
  verifyTranscriptRecord,
} from "../vendor/tclk/index.js";

export const TCLK_UPSTREAM_COMMIT = "5cc4ab93efbc8999a3a7e1471b639deca25998ea";

export const sampleTranscript = String.raw`{"room":"tclk-offers","seq":101,"ts":"2026-09-05T08:00:00.000Z","from":"did:key:z6MktwupdmLXVVqTzCw4i46r4uGyosGXRnR3XjN4Zq7oMMsw","nonce":"9101","sig":"NeEfT76d3iuOZKeqJ6ZgfTAzchdvqjL1mNJUB7S_x8aSQTtMIeXinkR96yijX20-AFAHntYaW_7Suavv035OAg","text":"tclk1 {\"amount\":\"2500000\",\"asset\":\"FLOP\",\"claimByMs\":1788598800000,\"expiresMs\":1788595800000,\"from\":\"did:key:z6MktwupdmLXVVqTzCw4i46r4uGyosGXRnR3XjN4Zq7oMMsw\",\"id\":\"0x59c52b366f30a62794d94640b179ea54b0b8068b5bd76db861c0766731fa4d56\",\"job\":{\"id\":\"inspector-audit-001\",\"proto\":\"a2a\"},\"lock\":\"hash\",\"nonce\":\"0011223344556677\",\"rails\":[\"paper\"],\"refundAfterMs\":1788602400000,\"role\":\"payer\",\"type\":\"offer\"}"}
{"room":"tclk-offers","seq":102,"ts":"2026-09-05T08:01:00.000Z","from":"did:key:z6MkiaMbhXHNA4eJVCCj8dbzKzTgYDKf6crKgHVHid1F1WCT","nonce":"9102","sig":"mu2JzyzJDatledrNVBBGHDMqzgoCvAx9XftYRzNFiJIR7iJqlF0m8YpGSSedj3fAkfeCCTpfn3j6O2FHRE05CQ","text":"tclk1 {\"contract\":\"0xa6f403e2823021762d8f8b153bbfadc58514c9c8ebb582b21263663c326297bd\",\"from\":\"did:key:z6MkiaMbhXHNA4eJVCCj8dbzKzTgYDKf6crKgHVHid1F1WCT\",\"nonce\":\"8899aabbccddeeff\",\"ref\":\"0x59c52b366f30a62794d94640b179ea54b0b8068b5bd76db861c0766731fa4d56\",\"statement\":\"0x425ed4e4a36b30ea21b90e21c712c649e8214c29b7eaf68089d1039c6e55384c\",\"type\":\"accept\"}"}
{"room":"mb-p-tclk-a6f403e282302176","seq":1,"ts":"2026-09-05T08:02:00.000Z","from":"did:key:z6MktwupdmLXVVqTzCw4i46r4uGyosGXRnR3XjN4Zq7oMMsw","nonce":"9001","sig":"cAHBpDympXLjmXEKO1NGPYIEQKLkNA0iED06qR423m6K_lYbUzdxAAXeS5QVGyVRg1x4OOxM7mrqTjwSLGmwAQ","text":"tclk1 {\"contract\":\"0xa6f403e2823021762d8f8b153bbfadc58514c9c8ebb582b21263663c326297bd\",\"from\":\"did:key:z6MktwupdmLXVVqTzCw4i46r4uGyosGXRnR3XjN4Zq7oMMsw\",\"rail\":\"paper\",\"ref\":\"paper-rehearsal-001\",\"type\":\"lock\"}"}
{"room":"mb-p-tclk-a6f403e282302176","seq":2,"ts":"2026-09-05T08:03:00.000Z","from":"did:key:z6MkiaMbhXHNA4eJVCCj8dbzKzTgYDKf6crKgHVHid1F1WCT","nonce":"9002","sig":"cutnjKqLUwaYdoYa-cabLSf5eSGd-KbgWgeNozvRLdsVNDzXuKCzuTI1lpVdoXjtv5mtxtRs8yeX0QFzyMcIDA","text":"tclk1 {\"contract\":\"0xa6f403e2823021762d8f8b153bbfadc58514c9c8ebb582b21263663c326297bd\",\"from\":\"did:key:z6MkiaMbhXHNA4eJVCCj8dbzKzTgYDKf6crKgHVHid1F1WCT\",\"ref\":\"paper-rehearsal-001\",\"secret\":\"0x4242424242424242424242424242424242424242424242424242424242424242\",\"type\":\"reveal\"}"}
{"room":"mb-p-tclk-a6f403e282302176","seq":3,"ts":"2026-09-05T08:04:00.000Z","from":"did:key:z6MktwupdmLXVVqTzCw4i46r4uGyosGXRnR3XjN4Zq7oMMsw","nonce":"9003","sig":"LENYOWTx2yB1DsmkPNTljlg6y8MpQpkzvBlewKVLzaEtqImLx2_gwXNSI4rVELETFPWmzRzp-sM1nXrDeEbxBw","text":"tclk1 {\"contract\":\"0xa6f403e2823021762d8f8b153bbfadc58514c9c8ebb582b21263663c326297bd\",\"from\":\"did:key:z6MktwupdmLXVVqTzCw4i46r4uGyosGXRnR3XjN4Zq7oMMsw\",\"outcome\":\"claimed\",\"rail\":\"paper\",\"ref\":\"paper-rehearsal-001\",\"type\":\"receipt\"}"}`;

export function inspectTranscript(input) {
  const parsed = parseInput(input);
  const invalid = parsed.filter((item) => !item.ok).map((item) => toFinding(item));
  const authenticated = parsed.filter((item) => item.ok);
  const deals = foldDeals(authenticated, invalid);

  return {
    deals,
    invalid,
    summary: {
      records: parsed.length,
      verified: authenticated.length,
      needsAction: deals.filter((deal) => ["proposed", "accepted", "locked"].includes(deal.status)).length,
      terminal: deals.filter((deal) => ["claimed", "refunded", "cancelled"].includes(deal.status)).length,
      invalid: invalid.length,
    },
  };
}

function parseInput(input) {
  let currentRoom = null;
  const rows = [];

  input.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;
    const roomHeader = line.match(/^#\s*room:\s*([a-z0-9][a-z0-9_-]{0,47})$/i);
    if (roomHeader) {
      currentRoom = roomHeader[1].toLowerCase();
      return;
    }
    if (line.startsWith("tclk1 ")) {
      rows.push(protocolOnly(line, index));
      return;
    }

    try {
      const value = JSON.parse(line);
      const room = value.room ?? currentRoom;
      if (!room) throw new Error("room is required; add a room field or a '# room:name' header");
      const record = transcriptRecord(room, value);
      const verification = verifyTranscriptRecord(record);
      const frame = decodeFrameSafely(record.line);
      if (!verification.ok) {
        rows.push({ index, record, frame: frame.value, ok: false, reason: verification.reason });
      } else if (!frame.ok) {
        rows.push({ index, record, ok: false, reason: frame.reason });
      } else if (frame.value.from !== record.sender) {
        rows.push({ index, record, frame: frame.value, ok: false, reason: `${frame.value.type}.from does not match the record sender` });
      } else {
        rows.push({ index, record, frame: frame.value, ok: true });
      }
    } catch (error) {
      rows.push({ index, raw: line, ok: false, reason: message(error) });
    }
  });

  return rows;
}

function protocolOnly(line, index) {
  const decoded = decodeFrameSafely(line);
  return {
    index,
    raw: line,
    frame: decoded.value,
    ok: false,
    reason: decoded.ok
      ? "Frame format is valid, but signed Technocore metadata is missing. State was not advanced."
      : decoded.reason,
  };
}

function decodeFrameSafely(line) {
  try {
    return { ok: true, value: decodeFrame(line) };
  } catch (error) {
    return { ok: false, reason: message(error) };
  }
}

function foldDeals(rows, invalid) {
  const offers = rows.filter((row) => row.frame.type === "offer");
  const assigned = new Set();

  const deals = offers.map((offerRow) => {
    const offer = offerRow.frame;
    let contract = null;
    const relevant = rows.filter((row) => {
      if (row === offerRow) return true;
      if (row.index <= offerRow.index) return false;
      if (row.frame.type === "accept" && row.frame.ref === offer.id) {
        contract ??= row.frame.contract;
        return row.frame.contract === contract;
      }
      return contract !== null && row.frame.contract === contract;
    });
    relevant.forEach((row) => assigned.add(row));

    const result = foldTranscript(relevant.map((row) => row.record));
    result.steps.forEach((step, index) => {
      if (!step.ok) invalid.push(toFinding(relevant[index], step.reason));
    });
    const state = result.state;
    const status = state?.status ?? "invalid";
    const rail = state?.rail ?? null;

    return {
      id: offer.id,
      contract: state?.contract ?? contract,
      status,
      next: nextAction(status),
      settlement: settlementVerdict(rail),
      job: offer.job ?? null,
      events: result.steps.map((step, index) => ({
        ...step,
        from: relevant[index].record.sender,
        timestampMs: relevant[index].record.timestampMs,
      })),
    };
  });

  rows.filter((row) => !assigned.has(row)).forEach((row) => {
    invalid.push(toFinding(row, `${row.frame.type} has no matching preceding authenticated offer`));
  });
  return deals;
}

function settlementVerdict(rail) {
  if (rail === "paper") return { code: "NO VALUE", detail: "PaperRail is a protocol rehearsal only; it does not prove payment." };
  if (rail) return { code: "UNVERIFIED", detail: `The transcript names ${rail}; verify value independently on that rail.` };
  return { code: "NOT LOCKED", detail: "No settlement rail lock has been established." };
}

function nextAction(status) {
  const actions = {
    proposed: "A counterparty may accept before the offer expires.",
    accepted: "The payer must lock on a mutually supported settlement rail.",
    locked: "The payee may reveal before refundAfterMs; otherwise the payer waits to refund.",
    claimed: "Coordination reached claimed. Verify the named rail before treating value as paid.",
    refunded: "Coordination reached refunded. Verify the named rail independently.",
    cancelled: "The deal ended before a lock was established.",
  };
  return actions[status] ?? "The authenticated records did not open a valid contract.";
}

function toFinding(item, override) {
  return {
    reason: override ?? item.reason ?? "Rejected record",
    room: item.record?.room ?? "input",
    seq: item.record?.seq ?? item.index + 1,
  };
}

function message(error) {
  return error instanceof Error ? error.message.replace(/^tclk:\s*/, "") : "Invalid input";
}
