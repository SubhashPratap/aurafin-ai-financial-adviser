// --- State Management ---
let state = {
  income: 5000,
  needs: 2500,
  wants: 1000,
  savings: 1500,
  apiKey: localStorage.getItem('aura_gemini_key') || '',
  goals: [
    { id: 1, name: 'Emergency Capital Reserve', target: 15000, current: 9500 },
    { id: 2, name: 'Vehicle Replacement Reserve', target: 8000, current: 3200 },
    { id: 3, name: 'Property Down Payment', target: 25000, current: 12500 }
  ]
};

// --- Font Awesome Icons ---
const ICONS = {
  user: `<i class="fa-solid fa-user"></i>`,
  bot: `<i class="fa-solid fa-robot"></i>`
};

// --- DOM Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initBudgetCalculator();
  initGoals();
  initChat();
  initSettingsModal();
  updateDashboard();
});

// --- Navigation ---
function initTabs() {
  const navItems = document.querySelectorAll('.nav-item');
  const tabPages = document.querySelectorAll('.tab-page');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabTarget = item.getAttribute('data-tab');

      navItems.forEach(n => n.classList.remove('active'));
      tabPages.forEach(p => p.classList.remove('active'));

      item.classList.add('active');
      document.getElementById(`tab-${tabTarget}`).classList.add('active');
    });
  });
}

// --- Dashboard Metrics ---
function updateDashboard() {
  const totalExpenses = state.needs + state.wants;
  const netSavings = state.income - totalExpenses;
  const savingsPct = Math.round((netSavings / state.income) * 100) || 0;
  const expensesPct = Math.round((totalExpenses / state.income) * 100) || 0;

  let score = 100;
  if (expensesPct > 70) score -= (expensesPct - 70) * 1.5;
  if (savingsPct < 20) score -= (20 - savingsPct) * 1.5;
  score = Math.max(20, Math.min(100, Math.round(score)));

  document.getElementById('disp-income').textContent = formatCurrency(state.income);
  document.getElementById('disp-expenses').textContent = formatCurrency(totalExpenses);
  document.getElementById('disp-expenses-pct').textContent = `${expensesPct}% of income`;
  document.getElementById('disp-savings').textContent = formatCurrency(netSavings);
  document.getElementById('disp-savings-pct').textContent = `${savingsPct}% savings rate`;
  document.getElementById('disp-score').textContent = `${score}/100`;

  document.getElementById('rule-needs-val').textContent = formatCurrency(state.income * 0.5);
  document.getElementById('rule-wants-val').textContent = formatCurrency(state.income * 0.3);
  document.getElementById('rule-savings-val').textContent = formatCurrency(state.income * 0.2);
}

function initBudgetCalculator() {
  document.getElementById('update-budget-btn').addEventListener('click', () => {
    state.income = Number(document.getElementById('input-income').value) || 0;
    state.needs = Number(document.getElementById('input-needs').value) || 0;
    state.wants = Number(document.getElementById('input-wants').value) || 0;
    state.savings = Number(document.getElementById('input-savings').value) || 0;

    updateDashboard();
  });
}

// --- Capital Reserve Goals ---
function initGoals() {
  renderGoals();

  const goalForm = document.getElementById('goal-form');
  goalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('goal-name').value;
    const target = Number(document.getElementById('goal-target').value);
    const current = Number(document.getElementById('goal-current').value);

    state.goals.push({
      id: Date.now(),
      name,
      target,
      current
    });

    renderGoals();
    goalForm.reset();
  });
}

function renderGoals() {
  const container = document.getElementById('goals-container');
  container.innerHTML = '';

  state.goals.forEach(goal => {
    const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
    const card = document.createElement('div');
    card.className = 'goal-card';
    card.innerHTML = `
      <div class="goal-header">
        <span class="goal-title">${escapeHtml(goal.name)}</span>
        <span class="text-success font-weight-bold">${pct}%</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width: ${pct}%"></div>
      </div>
      <div class="goal-stats">
        <span>Accumulated: ${formatCurrency(goal.current)}</span>
        <span>Target: ${formatCurrency(goal.target)}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// --- Dynamic AI Advisory Engine ---
function initChat() {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    addChatMessage(text, 'user');
    input.value = '';

    processAiQuery(text);
  });
}

function askQuickQuestion(questionText) {
  const input = document.getElementById('chat-input');
  input.value = questionText;
  document.getElementById('chat-form').dispatchEvent(new Event('submit'));
}

function addChatMessage(text, sender) {
  const container = document.getElementById('chat-messages');
  const msg = document.createElement('div');
  msg.className = `msg ${sender}`;

  const avatarIcon = sender === 'user' ? ICONS.user : ICONS.bot;
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  msg.innerHTML = `
    <div class="msg-avatar">${avatarIcon}</div>
    <div class="msg-bubble">
      <div class="msg-text">${escapeHtml(text)}</div>
      <div class="msg-time">${time}</div>
    </div>
  `;

  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

async function processAiQuery(userQuery) {
  addChatMessage("Querying AI model...", 'bot');

  const container = document.getElementById('chat-messages');
  const thinkingMsg = container.lastChild;

  if (!state.apiKey || state.apiKey.trim().length === 0) {
    container.removeChild(thinkingMsg);
    addChatMessage("Please configure your Gemini API Key in Settings (⚙️) to enable live real-time AI responses.", 'bot');
    return;
  }

  try {
    const responseText = await callGeminiApi(userQuery);
    container.removeChild(thinkingMsg);
    addChatMessage(responseText, 'bot');
  } catch (error) {
    container.removeChild(thinkingMsg);
    addChatMessage(`API Error: ${error.message || 'Unable to connect to AI API. Please verify your Gemini API key in Settings.'}`, 'bot');
  }
}

async function callGeminiApi(prompt) {
  const cleanKey = state.apiKey.trim();
  const systemInstruction = `You are AuraFin, an expert AI financial adviser. Provide clear, direct, structured financial advice tailored to the user's question and monthly profile (Monthly Income: $${state.income}, Needs: $${state.needs}, Wants: $${state.wants}, Savings: $${state.savings}).`;

  const payload = {
    contents: [{
      parts: [
        { text: `${systemInstruction}\n\nUser Question: ${prompt}` }
      ]
    }]
  };

  // Step 1: Dynamically query Google Gemini ListModels API to discover compatible models for this key
  let targetModelPath = null;
  try {
    const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`);
    const modelsData = await modelsRes.json();
    if (modelsData.models && Array.isArray(modelsData.models)) {
      const compatibleModel = modelsData.models.find(m => 
        m.supportedGenerationMethods && 
        m.supportedGenerationMethods.includes("generateContent") &&
        (m.name.includes("gemini") || m.name.includes("flash") || m.name.includes("pro"))
      );
      if (compatibleModel && compatibleModel.name) {
        targetModelPath = compatibleModel.name; // e.g. "models/gemini-1.5-flash-latest" or "models/gemini-pro"
      }
    }
  } catch (e) {
    console.warn("Dynamic ListModels check failed, falling back to static endpoints:", e);
  }

  // Step 2: Build candidate list with dynamically discovered model first
  const modelsToTry = targetModelPath 
    ? [targetModelPath, 'models/gemini-1.5-flash-latest', 'models/gemini-2.0-flash', 'models/gemini-pro']
    : ['models/gemini-1.5-flash-latest', 'models/gemini-2.0-flash', 'models/gemini-pro'];

  let lastError = null;

  for (const modelPath of modelsToTry) {
    try {
      const cleanPath = modelPath.startsWith('models/') ? modelPath : `models/${modelPath}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/${cleanPath}:generateContent?key=${cleanKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
        return data.candidates[0].content.parts[0].text;
      }
      if (data.error) {
        lastError = data.error.message;
      }
    } catch (err) {
      lastError = err.message;
    }
  }

  throw new Error(lastError || 'Invalid API Key or HTTP error from Google Gemini endpoint');
}

function initSettingsModal() {
  const modal = document.getElementById('settings-modal');
  const openBtn = document.getElementById('open-settings-btn');
  const closeBtn = document.getElementById('close-settings-btn');
  const cancelBtn = document.getElementById('cancel-settings-btn');
  const saveBtn = document.getElementById('save-settings-btn');
  const keyInput = document.getElementById('gemini-api-key');

  if (state.apiKey) keyInput.value = state.apiKey;

  const openModal = () => modal.classList.add('active');
  const closeModal = () => modal.classList.remove('active');

  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);

  saveBtn.addEventListener('click', () => {
    state.apiKey = keyInput.value.trim();
    localStorage.setItem('aura_gemini_key', state.apiKey);
    closeModal();
  });
}

function formatCurrency(num) {
  return '$' + Number(num).toLocaleString('en-US');
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
