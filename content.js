(() => {
  const TOKEN_ENDPOINT = "/api/cad/check-generation-limit";
  const SR_ENDPOINT = "/api/super-resolution/check-limits";
  const BOX_ID = "pp-token-box";
  const TOGGLE_ID = "pp-token-toggle";
  const SR_BOX_ID = "pp-sr-box";
  const SR_TOGGLE_ID = "pp-sr-toggle";

  function inject() {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("injected.js");
    script.async = false;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  function formatNumber(value) {
    if (typeof value !== "number") return "-";
    return value.toLocaleString();
  }

  function ensureBox() {
    let box = document.getElementById(BOX_ID);
    if (box) return box;

    box = document.createElement("div");
    box.id = BOX_ID;
    box.innerHTML = `
      <div class="pp-token-header">
        <div>
          <div class="pp-token-title">Printpal Tokens</div>
          <div class="pp-token-sub">Listening for generation limit…</div>
        </div>
        <div class="pp-token-actions">
          <button class="pp-token-refresh" title="Refresh">⟳</button>
          <button class="pp-token-close" title="Hide">×</button>
        </div>
      </div>
      <div class="pp-token-body">
        <div class="pp-token-row"><span>Remaining</span><strong id="pp-remaining">-</strong></div>
        <div class="pp-token-row"><span>Used</span><strong id="pp-used">-</strong></div>
        <div class="pp-token-row"><span>Limit</span><strong id="pp-limit">-</strong></div>
        <div class="pp-token-row"><span>Concurrent Limit</span><strong id="pp-concurrent">-</strong></div>
        <div class="pp-token-row"><span>Active Tasks</span><strong id="pp-active">-</strong></div>
        <div class="pp-token-row"><span>Plan</span><strong id="pp-plan">-</strong></div>
        <div class="pp-token-row"><span>Pro Access</span><strong id="pp-pro">-</strong></div>
      </div>
      <div class="pp-token-footer">
        <span id="pp-last">No data yet</span>
      </div>
    `;

    document.documentElement.appendChild(box);

    let toggle = document.getElementById(TOGGLE_ID);
    if (!toggle) {
      toggle = document.createElement("button");
      toggle.id = TOGGLE_ID;
      toggle.textContent = "Tokens";
      toggle.title = "Show token details";
      toggle.classList.add("pp-hidden");
      document.documentElement.appendChild(toggle);
      toggle.addEventListener("click", () => {
        box.classList.remove("pp-hidden");
        toggle.classList.add("pp-hidden");
        chrome.storage.local.set({ ppTokenHidden: false });
      });
    }

    const closeBtn = box.querySelector(".pp-token-close");
    const refreshBtn = box.querySelector(".pp-token-refresh");
    closeBtn.addEventListener("click", () => {
      box.classList.add("pp-hidden");
      toggle.classList.remove("pp-hidden");
      chrome.storage.local.set({ ppTokenHidden: true });
    });
    refreshBtn.addEventListener("click", () => {
      window.postMessage({ type: "PRINTPAL_TOKEN_REFRESH" }, "*");
    });

    chrome.storage.local.get(["ppTokenHidden"], (res) => {
      if (res.ppTokenHidden) {
        box.classList.add("pp-hidden");
        toggle.classList.remove("pp-hidden");
      } else {
        toggle.classList.add("pp-hidden");
      }
    });

    return box;
  }

  function ensureSuperBox() {
    let box = document.getElementById(SR_BOX_ID);
    if (box) return box;

    box = document.createElement("div");
    box.id = SR_BOX_ID;
    box.innerHTML = `
      <div class="pp-token-header">
        <div>
          <div class="pp-token-title">Super Resolution</div>
          <div class="pp-token-sub">Listening for limits…</div>
        </div>
        <div class="pp-token-actions">
          <button class="pp-token-refresh" title="Refresh">⟳</button>
          <button class="pp-token-close" title="Hide">×</button>
        </div>
      </div>
      <div class="pp-token-body">
        <div class="pp-token-row"><span>Remaining</span><strong id="pp-sr-remaining">-</strong></div>
        <div class="pp-token-row"><span>Used</span><strong id="pp-sr-used">-</strong></div>
        <div class="pp-token-row"><span>Limit</span><strong id="pp-sr-limit">-</strong></div>
        <div class="pp-token-row"><span>Plan</span><strong id="pp-sr-plan">-</strong></div>
        <div class="pp-token-row"><span>Can Use</span><strong id="pp-sr-can">-</strong></div>
        <div class="pp-token-row"><span>Reset Date</span><strong id="pp-sr-reset">-</strong></div>
        <div class="pp-token-row"><span>Reason</span><strong id="pp-sr-reason">-</strong></div>
      </div>
      <div class="pp-token-footer">
        <span id="pp-sr-message">No data yet</span>
      </div>
    `;

    document.documentElement.appendChild(box);

    let toggle = document.getElementById(SR_TOGGLE_ID);
    if (!toggle) {
      toggle = document.createElement("button");
      toggle.id = SR_TOGGLE_ID;
      toggle.textContent = "Super Res";
      toggle.title = "Show super resolution details";
      toggle.classList.add("pp-hidden");
      document.documentElement.appendChild(toggle);
      toggle.addEventListener("click", () => {
        box.classList.remove("pp-hidden");
        toggle.classList.add("pp-hidden");
        chrome.storage.local.set({ ppSrHidden: false });
      });
    }

    const closeBtn = box.querySelector(".pp-token-close");
    const refreshBtn = box.querySelector(".pp-token-refresh");
    closeBtn.addEventListener("click", () => {
      box.classList.add("pp-hidden");
      toggle.classList.remove("pp-hidden");
      chrome.storage.local.set({ ppSrHidden: true });
    });
    refreshBtn.addEventListener("click", () => {
      window.postMessage({ type: "PRINTPAL_SR_REFRESH" }, "*");
    });

    chrome.storage.local.get(["ppSrHidden"], (res) => {
      if (res.ppSrHidden) {
        box.classList.add("pp-hidden");
        toggle.classList.remove("pp-hidden");
      } else {
        toggle.classList.add("pp-hidden");
      }
    });

    return box;
  }

  function updateBox(payload) {
    const box = ensureBox();
    const remaining = payload.generations_limit - payload.generations_used;

    const remainingEl = box.querySelector("#pp-remaining");
    const usedEl = box.querySelector("#pp-used");
    const limitEl = box.querySelector("#pp-limit");
    const concurrentEl = box.querySelector("#pp-concurrent");
    const activeEl = box.querySelector("#pp-active");
    const planEl = box.querySelector("#pp-plan");
    const proEl = box.querySelector("#pp-pro");
    const lastEl = box.querySelector("#pp-last");
    const subEl = box.querySelector(".pp-token-sub");

    remainingEl.textContent = formatNumber(remaining);
    usedEl.textContent = formatNumber(payload.generations_used);
    limitEl.textContent = formatNumber(payload.generations_limit);
    concurrentEl.textContent = formatNumber(payload.concurrent_limit);
    activeEl.textContent = formatNumber(payload.active_tasks);
    planEl.textContent = payload.plan_tier != null ? `Tier ${payload.plan_tier}` : "-";
    proEl.textContent = payload.has_pro_access ? "Yes" : "No";

    const time = new Date(payload._capturedAt || Date.now());
    lastEl.textContent = `Updated ${time.toLocaleTimeString()}`;
    subEl.textContent = payload.input_modality
      ? `Modality: ${payload.input_modality}`
      : "Generation limit";

    box.classList.remove("pp-hidden");
  }

  function updateSuperBox(payload) {
    const box = ensureSuperBox();
    const remainingEl = box.querySelector("#pp-sr-remaining");
    const usedEl = box.querySelector("#pp-sr-used");
    const limitEl = box.querySelector("#pp-sr-limit");
    const planEl = box.querySelector("#pp-sr-plan");
    const canEl = box.querySelector("#pp-sr-can");
    const resetEl = box.querySelector("#pp-sr-reset");
    const reasonEl = box.querySelector("#pp-sr-reason");
    const messageEl = box.querySelector("#pp-sr-message");
    const subEl = box.querySelector(".pp-token-sub");

    remainingEl.textContent = formatNumber(payload.remaining);
    usedEl.textContent = formatNumber(payload.used);
    limitEl.textContent = formatNumber(payload.limit);
    planEl.textContent = payload.plan || "-";
    canEl.textContent = payload.can_use ? "Yes" : "No";
    resetEl.textContent = payload.reset_date || "-";
    reasonEl.textContent = payload.reason || "-";
    messageEl.textContent = payload.message || "Updated";
    subEl.textContent = "Super resolution limit";

    box.classList.remove("pp-hidden");
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const { type, url, data } = event.data || {};
    if (type !== "PRINTPAL_TOKEN_DATA") return;
    if (!data || typeof data !== "object") return;

    if (url && url.includes(TOKEN_ENDPOINT) && data.success) {
      updateBox(data);
      return;
    }

    if (url && url.includes(SR_ENDPOINT)) {
      updateSuperBox(data);
    }
  });

  // Inject as early as possible to catch requests fired during initial page load.
  inject();

  ensureBox();
  ensureSuperBox();
})();
