const DID_RE = /^did:key:z6Mk[1-9A-HJ-NP-Za-km-z]{44,}$/;
const HEX32_RE = /^0x[0-9a-f]{64}$/;
const TCLK_PREFIX = "tclk1 ";

export const sampleTranscript = [
  {
    room: "tclk-offers",
    seq: 101,
    ts: 1788351000000,
    from: "did:key:z6Mkpayer111111111111111111111111111111111111111111",
    text:
      'tclk1 {"amount":"2500000","asset":"FLOP","claimByMs":1788358200000,"expiresMs":1788351600000,"from":"did:key:z6Mkpayer111111111111111111111111111111111111111111","id":"offer-demo-001","job":"Summarize a Technocore room into a reusable agent brief","lock":"hash","nonce":"offer-n1","refundAfterMs":1788361800000,"role":"payer","rails":["paper"],"type":"offer"}',
  },
  {
    room: "tclk-offers",
    seq: 118,
    ts: 1788351300000,
    from: "did:key:z6Mkpayee222222222222222222222222222222222222222222",
    text:
      'tclk1 {"contract":"contract-demo-9f12","from":"did:key:z6Mkpayee222222222222222222222222222222222222222222","nonce":"accept-n1","ref":"offer-demo-001","statement":"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","type":"accept"}',
  },
  {
    room: "mb-p-tclk-contract-demo",
    seq: 3,
    ts: 1788352100000,
    from: "did:key:z6Mkpayer111111111111111111111111111111111111111111",
    text:
      'tclk1 {"contract":"contract-demo-9f12","from":"did:key:z6Mkpayer111111111111111111111111111111111111111111","rail":"paper","ref":"paper-lock-77","type":"lock"}',
  },
  {
    room: "mb-p-tclk-contract-demo",
    seq: 7,
    ts: 1788354600000,
    from: "did:key:z6Mkpayee222222222222222222222222222222222222222222",
    text:
      'tclk1 {"contract":"contract-demo-9f12","from":"did:key:z6Mkpayee222222222222222222222222222222222222222222","ref":"paper-lock-77","secret":"0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","type":"reveal"}',
  },
  {
    room: "tclk-offers",
    seq: 221,
    ts: 1788352000000,
    from: "did:key:z6Mkbuyer333333333333333333333333333333333333333333",
    text:
      'tclk1 {"amount":"1000000","asset":"FLOP","claimByMs":1788354000000,"expiresMs":1788352300000,"from":"did:key:z6Mkbuyer333333333333333333333333333333333333333333","id":"offer-expired-002","job":"Check one tclk transcript for invalid frames","lock":"hash","nonce":"offer-n2","refundAfterMs":1788357600000,"role":"payer","rails":["paper"],"type":"offer"}',
  },
  {
    room: "tclk-offers",
    seq: 222,
    ts: 1788352600000,
    from: "did:key:z6Mkworker44444444444444444444444444444444444444444",
    text:
      'tclk1 {"contract":"contract-late-002","from":"did:key:z6Mkworker44444444444444444444444444444444444444444","nonce":"accept-n2","ref":"offer-expired-002","statement":"0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc","type":"accept"}',
  },
  {
    room: "tclk-offers",
    seq: 310,
    ts: 1788353000000,
    from: "did:key:z6Mkintruder555555555555555555555555555555555555555",
    text:
      'tclk1 {"amount":"5000000","asset":"FLOP","claimByMs":1788359200000,"expiresMs":1788356500000,"from":"did:key:z6Mkspoofed999999999999999999999999999999999999999","id":"offer-bad-003","lock":"hash","nonce":"offer-n3","refundAfterMs":1788362800000,"role":"payer","rails":["paper"],"type":"offer"}',
  },
].map((record) => JSON.stringify(record)).join("\n");

const required = {
  offer: ["type", "from", "role", "amount", "asset", "lock", "rails", "claimByMs", "refundAfterMs", "expiresMs", "nonce", "id"],
  accept: ["type", "from", "ref", "statement", "contract", "nonce"],
  lock: ["type", "from", "contract", "rail", "ref"],
  reveal: ["type", "from", "contract", "secret"],
  refund: ["type", "from", "contract", "ref"],
  cancel: ["type", "from", "contract"],
  heartbeat: ["type", "from", "contract"],
  receipt: ["type", "from", "contract"],
};

export function parseTranscript(input) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseRecordLine);
}

export function inspectTranscript(input) {
  const records = parseTranscript(input);
  const deals = new Map();
  const invalid = [];

  for (const record of records) {
    if (!record.ok) {
      invalid.push(record);
      continue;
    }
    const verdict = validateFrame(record);
    if (!verdict.ok) {
      invalid.push({ ...record, ok: false, reason: verdict.reason });
      continue;
    }
    applyValidRecord(deals, record);
  }

  const dealList = [...deals.values()].map(finalizeDeal);
  return {
    deals: dealList,
    invalid,
    summary: summarize(dealList, invalid),
  };
}

function parseRecordLine(line) {
  try {
    const record = JSON.parse(line);
    const text = String(record.text ?? "");
    if (!text.startsWith(TCLK_PREFIX)) {
      return { raw: line, ok: false, reason: "Record text is not a tclk1 frame." };
    }
    return { ...record, frame: JSON.parse(text.slice(TCLK_PREFIX.length)), ok: true };
  } catch {
    if (!line.startsWith(TCLK_PREFIX)) {
      return { raw: line, ok: false, reason: "Line must be a JSON record or a raw tclk1 frame." };
    }
    try {
      const frame = JSON.parse(line.slice(TCLK_PREFIX.length));
      return { room: "pasted-line", seq: "-", ts: null, from: frame.from, text: line, frame, ok: true };
    } catch {
      return { raw: line, ok: false, reason: "Malformed JSON after tclk1 prefix." };
    }
  }
}

function validateFrame(record) {
  const frame = record.frame;
  if (!frame || typeof frame !== "object" || Array.isArray(frame)) {
    return { ok: false, reason: "Frame is not a JSON object." };
  }
  if (!required[frame.type]) return { ok: false, reason: `Unknown frame type: ${frame.type ?? "missing"}.` };
  const missing = required[frame.type].filter((field) => frame[field] === undefined);
  if (missing.length) return { ok: false, reason: `Missing required field: ${missing.join(", ")}.` };
  if (!DID_RE.test(frame.from)) return { ok: false, reason: "Frame from is not a did:key value." };
  if (record.from && record.from !== frame.from) return { ok: false, reason: "Frame from does not match signed record sender." };
  if (frame.type === "offer") {
    if (record.room && record.room !== "tclk-offers" && record.room !== "pasted-line") return { ok: false, reason: "Offer must be posted in tclk-offers." };
    if (!["payer", "payee"].includes(frame.role)) return { ok: false, reason: "Offer role must be payer or payee." };
    if (!["hash", "point"].includes(frame.lock)) return { ok: false, reason: "Offer lock must be hash or point." };
    if (!Array.isArray(frame.rails) || frame.rails.length === 0) return { ok: false, reason: "Offer rails must be a non-empty array." };
    if (!isIncreasing(frame.expiresMs, frame.claimByMs, frame.refundAfterMs)) return { ok: false, reason: "Offer deadlines must increase: expires < claimBy < refundAfter." };
  }
  if (frame.statement && frame.lock !== "point" && !HEX32_RE.test(frame.statement)) return { ok: false, reason: "Hash statement must be 0x plus 64 lowercase hex chars." };
  if (frame.secret && !HEX32_RE.test(frame.secret)) return { ok: false, reason: "Reveal secret must be 0x plus 64 lowercase hex chars." };
  return { ok: true };
}

function applyValidRecord(deals, record) {
  const frame = record.frame;
  if (frame.type === "offer") {
    const key = frame.id;
    const deal = deals.get(key) ?? newDeal(key);
    deal.offer = record;
    deal.events.push(event(record, "Offer posted"));
    deals.set(key, deal);
    return;
  }
  if (frame.type === "accept") {
    const key = frame.ref;
    const deal = deals.get(key) ?? newDeal(key);
    const offered = deal.offer?.frame;
    if (offered && record.ts && record.ts > offered.expiresMs) {
      deal.rejections.push(event(record, "Accept arrived after offer expiry"));
    } else {
      deal.accept = record;
      deal.contract = frame.contract;
      deal.events.push(event(record, "Offer accepted"));
    }
    deals.set(key, deal);
    return;
  }
  const key = findByContract(deals, frame.contract) ?? frame.contract;
  const deal = deals.get(key) ?? newDeal(key);
  deal.contract = frame.contract;
  if (frame.type === "lock") deal.lock = record;
  if (frame.type === "reveal") deal.reveal = record;
  if (frame.type === "refund") deal.refund = record;
  if (frame.type === "cancel") deal.cancel = record;
  if (frame.type === "heartbeat") deal.heartbeats.push(record);
  if (frame.type === "receipt") deal.receipts.push(record);
  deal.events.push(event(record, `${frame.type[0].toUpperCase()}${frame.type.slice(1)} posted`));
  deals.set(key, deal);
}

function finalizeDeal(deal) {
  if (deal.cancel) return { ...deal, status: "cancelled", next: "No action. Deal was cancelled before lock." };
  if (deal.refund) return { ...deal, status: "refunded", next: "No action. Payer reported refund." };
  if (deal.reveal) return { ...deal, status: "claimed", next: "Check the named rail and add a receipt if needed." };
  if (deal.lock) return { ...deal, status: "locked", next: "Payee should reveal the secret before claimByMs, or payer waits for refundAfterMs." };
  if (deal.accept) return { ...deal, status: "accepted", next: "Payer should lock funds on the named rail." };
  if (deal.offer) return { ...deal, status: "open", next: "Counterparty can accept before expiresMs." };
  return { ...deal, status: "unknown", next: "Missing offer/accept context. Paste earlier transcript lines." };
}

function summarize(deals, invalid) {
  return {
    totalDeals: deals.length,
    open: deals.filter((deal) => deal.status === "open").length,
    accepted: deals.filter((deal) => deal.status === "accepted").length,
    locked: deals.filter((deal) => deal.status === "locked").length,
    terminal: deals.filter((deal) => ["claimed", "refunded", "cancelled"].includes(deal.status)).length,
    invalid: invalid.length + deals.reduce((sum, deal) => sum + deal.rejections.length, 0),
  };
}

function newDeal(id) {
  return { id, contract: null, events: [], rejections: [], heartbeats: [], receipts: [] };
}

function event(record, label) {
  return { label, room: record.room ?? "unknown", seq: record.seq ?? "-", ts: record.ts ?? null, from: record.frame.from };
}

function findByContract(deals, contract) {
  for (const [key, deal] of deals) {
    if (deal.contract === contract) return key;
  }
  return null;
}

function isIncreasing(a, b, c) {
  return Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c) && a < b && b < c;
}
