(() => {
  const STORAGE_KEY = "meat-outs-2026-11-18-v1";
  const LEFT = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
  const RIGHT = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
  const board = document.querySelector("#board");
  const viewer = document.querySelector("#viewer");
  let filter = "all";
  let state = loadState();

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[char]);
  }

  function upcA(raw) {
    const digits = String(raw).replace(/\D/g, "");
    if (!digits || digits.length > 12) return null;
    if (digits.length === 12) return digits;
    const body = digits.padStart(11, "0");
    const weighted = [...body].reduce((sum, digit, index) => sum + Number(digit) * (index % 2 === 0 ? 3 : 1), 0);
    return body + ((10 - weighted % 10) % 10);
  }

  function barcodeSvg(raw) {
    const digits = upcA(raw);
    if (!digits) return "";
    const bits = "101"
      + [...digits.slice(0, 6)].map(digit => LEFT[Number(digit)]).join("")
      + "01010"
      + [...digits.slice(6)].map(digit => RIGHT[Number(digit)]).join("")
      + "101";
    const moduleWidth = 3;
    const quiet = 10;
    const width = (bits.length + quiet * 2) * moduleWidth;
    const bars = [...bits].map((bit, index) => bit === "1"
      ? `<rect x="${(index + quiet) * moduleWidth}" y="3" width="${moduleWidth}" height="76"/>`
      : "").join("");
    return `<svg viewBox="0 0 ${width} 103" role="img" aria-label="UPC barcode ${digits}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white"/><g fill="black">${bars}</g>
      <text x="50%" y="97" text-anchor="middle" fill="black" font-family="monospace" font-size="15" letter-spacing="3">${digits}</text>
    </svg>`;
  }

  function visibleItems() {
    return window.OUT_ITEMS.filter(item => {
      if (filter === "back") return item.back > 0;
      if (filter === "zero") return item.onHand === 0;
      if (filter === "open") return !state[item.item]?.done;
      return true;
    });
  }

  function cardHtml(item) {
    const saved = state[item.item] || {};
    return `<article class="card${saved.done ? " done" : ""}" data-item="${item.item}">
      <button class="shot" type="button" aria-label="Open original screenshot for ${escapeHtml(item.name)}">
        <img src="assets/thumb/${escapeHtml(item.image)}" alt="${escapeHtml(item.name)} screenshot" loading="lazy" decoding="async">
      </button>
      <div class="body">
        <div class="title-row"><h2>${escapeHtml(item.name)}</h2><div class="price">${escapeHtml(item.price || "Price not read")}</div></div>
        <div class="ids">Item ${item.item} · shown UPC ${item.upc}</div>
        <div class="inventory">
          <div class="count"><strong>${item.floor}</strong><span>floor</span></div>
          <div class="count back"><strong>${item.back}</strong><span>backroom</span></div>
          <div class="count"><strong>${item.onHand}</strong><span>on hand</span></div>
        </div>
        <div class="meta"><span>${escapeHtml(item.size)}</span><span>case ${item.pack}</span><span>${escapeHtml(item.shelf)}</span></div>
        ${item.inferredBack ? '<div class="inferred">Backroom 17 inferred from 31 on hand − 14 floor; verify on the device.</div>' : ""}
        <div class="barcode-wrap">${barcodeSvg(item.upc)}<div class="barcode-note">UPC-A padded/check-digit completed for scanning · source UPC ${item.upc}</div></div>
        <div class="controls">
          <label class="status"><input type="checkbox" ${saved.done ? "checked" : ""}><span>Checked</span></label>
          <textarea placeholder="Quick note…" aria-label="Note for ${escapeHtml(item.name)}">${escapeHtml(saved.note || "")}</textarea>
        </div>
      </div>
    </article>`;
  }

  function render() {
    const items = visibleItems();
    board.innerHTML = items.length ? items.map(cardHtml).join("") : '<div class="empty">Nothing left in this view. Nice work.</div>';
    bindCards();
  }

  function bindCards() {
    board.querySelectorAll(".card").forEach(card => {
      const id = card.dataset.item;
      const item = window.OUT_ITEMS.find(candidate => candidate.item === id);
      card.querySelector(".shot").addEventListener("click", () => {
        viewer.querySelector("img").src = `assets/web/${item.image}`;
        viewer.showModal();
      });
      card.querySelector("input").addEventListener("change", event => {
        state[id] = { ...state[id], done: event.target.checked };
        saveState();
        render();
      });
      card.querySelector("textarea").addEventListener("input", event => {
        state[id] = { ...state[id], note: event.target.value };
        saveState();
      });
    });
  }

  document.querySelectorAll("nav button").forEach(button => button.addEventListener("click", () => {
    filter = button.dataset.filter;
    document.querySelectorAll("nav button").forEach(candidate => candidate.classList.toggle("active", candidate === button));
    render();
  }));
  document.querySelector("#reset").addEventListener("click", () => {
    if (!confirm("Clear all checks and notes for today?")) return;
    state = {};
    saveState();
    render();
  });
  viewer.querySelector(".close").addEventListener("click", () => viewer.close());
  viewer.addEventListener("click", event => { if (event.target === viewer) viewer.close(); });
  render();
})();
