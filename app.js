const STORAGE_KEY = "scorecard_state_v1";

const DEFAULT_STATE = {
  groups: [
    {
      id: createId(),
      name: "Sample group",
      scores: [
        {
          id: createId(),
          name: "Focus",
          value: 7,
          labels: createDefaultLabels(),
        },
        {
          id: createId(),
          name: "Energy",
          value: 6,
          labels: createDefaultLabels(),
        },
      ],
    },
  ],
};

const app = document.getElementById("app");
let state = loadState();
const uiState = {
  configOpen: false,
};

render();
registerServiceWorker();

app.addEventListener("click", (event) => {
  const action = event.target?.dataset?.action;
  if (!action) {
    return;
  }

  if (action === "add-group") {
    state.groups.push({
      id: createId(),
      name: "New group",
      scores: [],
    });
    saveState();
    render();
  }

  if (action === "open-config") {
    setConfigOpen(true);
  }

  if (action === "close-config") {
    setConfigOpen(false);
  }

  if (action === "remove-group") {
    const groupId = event.target.dataset.groupId;
    state.groups = state.groups.filter((group) => group.id !== groupId);
    saveState();
    render();
  }

  if (action === "add-score") {
    const groupId = event.target.dataset.groupId;
    const group = state.groups.find((item) => item.id === groupId);
    if (!group) {
      return;
    }
    group.scores.push({
      id: createId(),
      name: "New score",
      value: 5,
      labels: createDefaultLabels(),
    });
    saveState();
    render();
  }

  if (action === "remove-score") {
    const groupId = event.target.dataset.groupId;
    const scoreId = event.target.dataset.scoreId;
    const group = state.groups.find((item) => item.id === groupId);
    if (!group) {
      return;
    }
    group.scores = group.scores.filter((score) => score.id !== scoreId);
    saveState();
    render();
  }
});

app.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  if (target.classList.contains("group-name")) {
    const groupId = target.dataset.groupId;
    const group = state.groups.find((item) => item.id === groupId);
    if (!group) {
      return;
    }
    group.name = target.value.trim() || "Untitled group";
    saveState();
    updateGroupName(groupId, group.name);
    return;
  }

  if (target.classList.contains("score-name")) {
    const groupId = target.dataset.groupId;
    const scoreId = target.dataset.scoreId;
    const group = state.groups.find((item) => item.id === groupId);
    if (!group) {
      return;
    }
    const score = group.scores.find((item) => item.id === scoreId);
    if (!score) {
      return;
    }
    score.name = target.value.trim() || "Untitled score";
    saveState();
    updateScoreName(groupId, scoreId, score.name);
    return;
  }

  if (target.classList.contains("score-slider")) {
    const groupId = target.dataset.groupId;
    const scoreId = target.dataset.scoreId;
    const group = state.groups.find((item) => item.id === groupId);
    if (!group) {
      return;
    }
    const score = group.scores.find((item) => item.id === scoreId);
    if (!score) {
      return;
    }
    score.value = Number(target.value);
    updateScoreRow(target.closest(".score-row"), score);
    updateGroupAverage(groupId);
    saveState();
    return;
  }

  if (target.classList.contains("label-input")) {
    const groupId = target.dataset.groupId;
    const scoreId = target.dataset.scoreId;
    const value = target.dataset.value;
    const group = state.groups.find((item) => item.id === groupId);
    if (!group) {
      return;
    }
    const score = group.scores.find((item) => item.id === scoreId);
    if (!score) {
      return;
    }
    score.labels[value] = target.value;
    updateScoreLabel(groupId, scoreId);
    saveState();
  }
});

function render() {
  const groupsMarkup = state.groups
    .map((group, index) => renderGroup(group, index))
    .join("");

  const configClass = uiState.configOpen ? "config-modal is-open" : "config-modal";

  app.innerHTML = `
    <div class="app-shell fade-in">
      <header class="hero">
        <div>
          <h1>Balanced Score Card</h1>
        </div>
      </header>

      <section class="groups">
        ${groupsMarkup || "<p class=\"text-center text-muted\">Add a group to start scoring.</p>"}
      </section>

      <div class="app-actions">
        <button class="btn btn-outline-dark" data-action="open-config">Configure</button>
      </div>
    </div>

    <div class="${configClass}" data-action="close-config">
      <div class="config-card" role="dialog" aria-modal="true" aria-labelledby="config-title">
        <div class="config-header">
          <div>
            <h2 id="config-title">Score configuration</h2>
            <p>Label each quartile to match how you score.</p>
          </div>
          <button class="btn btn-outline-secondary btn-sm" data-action="close-config">Close</button>
        </div>
        <div class="config-body">
          ${renderConfig()}
        </div>
      </div>
    </div>
  `;

  setConfigOpen(uiState.configOpen);
}

function renderConfig() {
  if (!state.groups.length) {
    return `
      <div class="config-empty">
        <p class="text-muted mb-3">Add a group to configure scores.</p>
        <button class="btn btn-outline-primary btn-sm" data-action="add-group">Add group</button>
      </div>
    `;
  }

  const groupsMarkup = state.groups
    .map((group) => {
      const scoresMarkup = group.scores
        .map((score) => renderConfigScore(group.id, score))
        .join("");

      return `
        <div class="config-group">
          <div class="config-group-header">
            <div class="config-group-name">
              <label class="config-label" for="group-name-${group.id}">Group name</label>
              <input
                id="group-name-${group.id}"
                class="form-control group-name"
                data-group-id="${group.id}"
                value="${escapeHtml(group.name)}"
                placeholder="Group name"
              />
            </div>
            <button
              class="btn btn-outline-danger btn-sm"
              data-action="remove-group"
              data-group-id="${group.id}"
            >
              Remove group
            </button>
          </div>
          <div class="config-scores">
            ${scoresMarkup || "<p class=\"text-muted mb-0\">No scores yet.</p>"}
          </div>
          <button
            class="btn btn-outline-primary btn-sm add-score-btn"
            data-action="add-score"
            data-group-id="${group.id}"
          >
            Add score
          </button>
        </div>
      `;
    })
    .join("");

  return `
    ${groupsMarkup}
    <button class="btn btn-outline-primary btn-sm" data-action="add-group">Add group</button>
  `;
}

function renderConfigScore(groupId, score) {
  return `
    <div class="config-score">
      <div class="config-score-header">
        <div class="config-score-name">
          <label class="config-label" for="score-name-${score.id}">Score name</label>
          <input
            id="score-name-${score.id}"
            class="form-control score-name"
            data-group-id="${groupId}"
            data-score-id="${score.id}"
            value="${escapeHtml(score.name)}"
            placeholder="Score name"
          />
        </div>
        <button
          class="btn btn-outline-danger btn-sm"
          data-action="remove-score"
          data-group-id="${groupId}"
          data-score-id="${score.id}"
        >
          Remove score
        </button>
      </div>
      <div class="labels-grid">
        ${renderScoreLabels(groupId, score)}
      </div>
    </div>
  `;
}

function renderScoreLabels(groupId, score) {
  return Array.from({ length: 4 }, (_, index) => {
    const value = index + 1;
    const percentile = value * 25;
    const rangeText = value === 1
      ? "Bottom 25%"
      : value === 4
        ? "Top 25%"
        : `Quartile ${value} (${percentile}%)`;
    const labelValue = score.labels?.[String(value)] || "";
    return `
      <div class="label-card">
        <label for="label-${score.id}-${value}">${rangeText}</label>
        <input
          id="label-${score.id}-${value}"
          class="form-control label-input"
          data-group-id="${groupId}"
          data-score-id="${score.id}"
          data-value="${value}"
          value="${escapeHtml(labelValue)}" 
          placeholder="Label"
        />
      </div>
    `;
  }).join("");
}

function renderGroup(group, index) {
  const average = calculateAverage(group.scores);
  const scoresMarkup = group.scores
    .map((score) => renderScore(group.id, score))
    .join("");

  return `
    <article class="group-card" data-group-id="${group.id}" style="animation-delay: ${index * 80}ms;">
      <div class="group-header">
        <h3 class="group-title">${escapeHtml(group.name)}</h3>
      </div>
      <div class="group-average">
        Average: <strong class="group-average-value">${formatAverage(average)}</strong>
      </div>

      <div class="scores">
        ${scoresMarkup || "<p class=\"text-muted mb-0\">No scores yet. Add your first score.</p>"}
      </div>
    </article>
  `;
}

function renderScore(groupId, score) {
  return `
    <div class="score-row" data-group-id="${groupId}" data-score-id="${score.id}">
      <div class="score-main">
        <div class="score-title">
          <span class="score-name-text">${escapeHtml(score.name)}</span>
          <span class="score-value">${score.value}</span>
        </div>
        <div class="score-controls">
          <input
            class="form-range score-slider"
            type="range"
            min="1"
            max="10"
            step="0.5"
            value="${score.value}"
            data-group-id="${groupId}"
            data-score-id="${score.id}"
          />
          <table class="quartile-table">
            <tbody>
              <tr>
                ${renderInlineLabels(score)}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="score-actions">
      </div>
    </div>
  `;
}

function renderInlineLabels(score) {
  return Array.from({ length: 4 }, (_, index) => {
    const value = index + 1;
    const label = getLabel(score, value);
    return `
      <td class="quartile-cell" data-value="${value}">
        <span class="quartile-text">${escapeHtml(label)}</span>
      </td>
    `;
  }).join("");
}

function updateScoreRow(row, score) {
  if (!row) {
    return;
  }
  const valueEl = row.querySelector(".score-value");
  if (valueEl) {
    valueEl.textContent = String(score.value);
  }
}

function updateScoreLabel(groupId, scoreId) {
  const group = state.groups.find((item) => item.id === groupId);
  if (!group) {
    return;
  }
  const score = group.scores.find((item) => item.id === scoreId);
  if (!score) {
    return;
  }
  const row = document.querySelector(
    `.score-row[data-group-id="${groupId}"][data-score-id="${scoreId}"]`
  );
  if (!row) {
    return;
  }
  const inlineLabels = row.querySelectorAll(".quartile-cell");
  inlineLabels.forEach((label) => {
    const value = Number(label.dataset.value);
    label.querySelector(".quartile-text").textContent = getLabel(score, value);
  });
}

function updateScoreName(groupId, scoreId, name) {
  const row = document.querySelector(
    `.score-row[data-group-id="${groupId}"][data-score-id="${scoreId}"]`
  );
  if (!row) {
    return;
  }
  const nameEl = row.querySelector(".score-name-text");
  if (nameEl) {
    nameEl.textContent = name;
  }
}

function updateGroupName(groupId, name) {
  const groupEl = document.querySelector(
    `.group-card[data-group-id="${groupId}"]`
  );
  if (!groupEl) {
    return;
  }
  const titleEl = groupEl.querySelector(".group-title");
  if (titleEl) {
    titleEl.textContent = name;
  }
}

function updateGroupAverage(groupId) {
  const group = state.groups.find((item) => item.id === groupId);
  if (!group) {
    return;
  }
  const average = calculateAverage(group.scores);
  const groupEl = document.querySelector(
    `.group-card[data-group-id="${groupId}"]`
  );
  if (!groupEl) {
    return;
  }
  const averageEl = groupEl.querySelector(".group-average-value");
  if (averageEl) {
    averageEl.textContent = formatAverage(average);
  }
}

function calculateAverage(scores) {
  if (!scores || scores.length === 0) {
    return 0;
  }
  const total = scores.reduce((sum, score) => sum + score.value, 0);
  return total / scores.length;
}

function formatAverage(value) {
  return value ? value.toFixed(1) : "0.0";
}

function getLabel(score, value) {
  const label = score.labels?.[String(value)] || "No label";
  return label.trim() ? label : "No label";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return structuredClone(DEFAULT_STATE);
  }
  try {
    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  } catch (error) {
    return structuredClone(DEFAULT_STATE);
  }
}

function normalizeState(parsed) {
  const normalized = {
    groups: Array.isArray(parsed.groups) ? parsed.groups : [],
  };

  normalized.groups = normalized.groups.map((group) => ({
    id: group.id || createId(),
    name: group.name || "Untitled group",
    scores: Array.isArray(group.scores)
      ? group.scores.map((score) => ({
          id: score.id || createId(),
          name: score.name || "Untitled score",
          value: clampScore(score.value),
          labels: { ...createDefaultLabels(), ...(score.labels || {}) },
        }))
      : [],
  }));

  return normalized;
}

function clampScore(value) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return 5;
  }
  const clamped = Math.min(10, Math.max(1, numeric));
  return Math.round(clamped * 2) / 2;
}


function createDefaultLabels() {
  return Object.fromEntries(
    Array.from({ length: 4 }, (_, index) => [String(index + 1), ""])
  );
}

function setConfigOpen(isOpen) {
  uiState.configOpen = isOpen;
  const modal = document.querySelector(".config-modal");
  if (modal) {
    modal.classList.toggle("is-open", isOpen);
  }
  document.body.classList.toggle("modal-open", isOpen);
}

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js");
  });
}
