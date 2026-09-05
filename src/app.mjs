import { inspectTranscript, sampleTranscript } from "./tclk.mjs";

const input = document.querySelector("#transcript");
const sampleButton = document.querySelector("#sampleButton");
const dealsEl = document.querySelector("#deals");
const invalidEl = document.querySelector("#invalidList");

input.value = sampleTranscript;
sampleButton.addEventListener("click", () => {
  input.value = sampleTranscript;
  render();
});
input.addEventListener("input", render);
render();

function render() {
  const result = inspectTranscript(input.value);
  document.querySelector("#totalRecords").textContent = result.summary.records;
  document.querySelector("#verifiedRecords").textContent = result.summary.verified;
  document.querySelector("#needsAction").textContent = result.summary.needsAction;
  document.querySelector("#invalidFrames").textContent = result.summary.invalid;
  renderDeals(result.deals);
  renderInvalid(result.invalid);
}

function renderDeals(deals) {
  if (!deals.length) {
    dealsEl.innerHTML = '<p class="empty">No authenticated tclk deals found yet.</p>';
    return;
  }
  dealsEl.innerHTML = deals.map((deal) => `
    <article class="deal ${deal.status}">
      <div class="deal-top">
        <div>
          <p class="label">${escapeHtml(deal.contract ?? "contract pending")}</p>
          <h3>${escapeHtml(deal.id)}</h3>
        </div>
        <span>${escapeHtml(deal.status)}</span>
      </div>
      <div class="verdict-strip" aria-label="Verification results">
        <span class="pass">FORMAT · OFFICIAL</span>
        <span class="pass">SIGNATURES · VERIFIED</span>
        <span class="pass">STATE · ${escapeHtml(deal.status)}</span>
        <span class="${deal.settlement.code === "NO VALUE" ? "neutral" : "warn"}">SETTLEMENT · ${escapeHtml(deal.settlement.code)}</span>
      </div>
      ${deal.job ? `<p class="job">JOB · ${escapeHtml(deal.job.proto)} / ${escapeHtml(deal.job.id)}</p>` : ""}
      <p class="next">${escapeHtml(deal.next)}</p>
      <p class="settlement-note">${escapeHtml(deal.settlement.detail)}</p>
      <ol>
        ${deal.events.map((item) => `
          <li class="${item.ok ? "step-pass" : "step-fail"}">
            <strong>${escapeHtml(item.type ?? "record")} · ${item.ok ? "accepted" : "rejected"}</strong>
            <span>${escapeHtml(shortDid(item.from))} · ${escapeHtml(item.room)} #${escapeHtml(String(item.seq))}</span>
          </li>
        `).join("")}
      </ol>
    </article>
  `).join("");
}

function renderInvalid(all) {
  if (!all.length) {
    invalidEl.innerHTML = '<p class="empty">No invalid records in this transcript.</p>';
    return;
  }
  invalidEl.innerHTML = all.map((item) => `
    <article>
      <strong>${escapeHtml(item.reason ?? "Rejected record")}</strong>
      <span>${escapeHtml(item.room ?? "unknown room")} #${escapeHtml(String(item.seq ?? "-"))}</span>
    </article>
  `).join("");
}

function shortDid(did) {
  if (!did) return "unknown sender";
  return did.length > 18 ? `${did.slice(0, 11)}...${did.slice(-6)}` : did;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
