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
  document.querySelector("#totalDeals").textContent = result.summary.totalDeals;
  document.querySelector("#needsAction").textContent = result.summary.open + result.summary.accepted + result.summary.locked;
  document.querySelector("#terminalDeals").textContent = result.summary.terminal;
  document.querySelector("#invalidFrames").textContent = result.summary.invalid;
  renderDeals(result.deals);
  renderInvalid(result.invalid, result.deals);
}

function renderDeals(deals) {
  if (!deals.length) {
    dealsEl.innerHTML = '<p class="empty">No valid tclk deals found yet.</p>';
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
      <p class="next">${escapeHtml(deal.next)}</p>
      <ol>
        ${deal.events.map((item) => `
          <li>
            <strong>${escapeHtml(item.label)}</strong>
            <span>${escapeHtml(shortDid(item.from))} · ${escapeHtml(item.room)} #${escapeHtml(String(item.seq))}</span>
          </li>
        `).join("")}
      </ol>
      ${deal.rejections.length ? `<div class="warning">${deal.rejections.map((item) => escapeHtml(item.label)).join("<br>")}</div>` : ""}
    </article>
  `).join("");
}

function renderInvalid(invalid, deals) {
  const rejected = deals.flatMap((deal) => deal.rejections.map((item) => ({
    reason: item.label,
    room: item.room,
    seq: item.seq,
  })));
  const all = [...invalid, ...rejected];
  if (!all.length) {
    invalidEl.innerHTML = '<p class="empty">No invalid frames in this transcript.</p>';
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
