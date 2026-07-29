/* ==========================================================================
   AuraFin — Financial Intelligence Platform (Core Application State & AI Engine)
   ========================================================================== */

// Load saved data from localStorage or default to Rupee benchmarks
const savedBudget = JSON.parse(localStorage.getItem('aura_budget_data')) || {
  income: 80000,
  needs: 40000,
  wants: 16000,
  savings: 24000
};

const savedGoals = JSON.parse(localStorage.getItem('aura_goals_data')) || [
  { id: 1, name: 'Emergency Capital Reserve', target: 300000, current: 180000 },
  { id: 2, name: 'Vehicle Replacement Reserve', target: 150000, current: 60000 },
  { id: 3, name: 'Property Down Payment', target: 500000, current: 250000 }
];

// --- Global Application State ---
const state = {
  income: savedBudget.income,
  needs: savedBudget.needs,
  wants: savedBudget.wants,
  savings: savedBudget.savings,
  currency: localStorage.getItem('aura_currency') || '₹',
  apiKey: localStorage.getItem('aura_gemini_key') || '',
  activeModelPath: null,
  goals: savedGoals
};

// --- Font Awesome Icon Templates ---
const ICONS = {
  user: '<i class="fa-solid fa-user"></i>',
  bot: '<i class="fa-solid fa-robot"></i>'
};

// --- Application Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initCurrencySelector();
  initBudgetCalculator();
  initGoals();
  initChat();
  initSettingsModal();
  updateDashboard();
});

// --- Currency Selector Controller ---
function initCurrencySelector() {
  const select = document.getElementById('currency-select');
  if (!select) return;

  select.value = state.currency;

  select.addEventListener('change', (e) => {
    state.currency = e.target.value;
    localStorage.setItem('aura_currency', state.currency);

    // Update all currency symbol labels across DOM
    document.querySelectorAll('.curr-sym').forEach(el => {
      el.textContent = state.currency;
    });

    updateDashboard();
    renderGoals();
  });

  // Initial symbol sync
  document.querySelectorAll('.curr-sym').forEach(el => {
    el.textContent = state.currency;
  });
}

// --- Tab Navigation ---
function initTabs() {
  const navItems = document.querySelectorAll('.nav-item');
  const tabPages = document.querySelectorAll('.tab-page');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabTarget = item.getAttribute('data-tab');

      navItems.forEach(n => n.classList.remove('active'));
      tabPages.forEach(p => p.classList.remove('active'));

      item.classList.add('active');
      const targetPage = document.getElementById(`tab-${tabTarget}`);
      if (targetPage) {
        targetPage.classList.add('active');
      }
    });
  });
}

// --- Dashboard & Metrics Engine ---
function updateDashboard() {
  const totalExpenses = state.needs + state.wants;
  const netSavings = state.income - totalExpenses;
  const savingsPct = state.income > 0 ? Math.round((netSavings / state.income) * 100) : 0;
  const expensesPct = state.income > 0 ? Math.round((totalExpenses / state.income) * 100) : 0;

  // Calculate Financial Health Score (0-100)
  let score = 100;
  if (expensesPct > 70) score -= (expensesPct - 70) * 1.5;
  if (savingsPct < 20) score -= (20 - savingsPct) * 1.5;
  score = Math.max(20, Math.min(100, Math.round(score)));

  // Update DOM Elements
  document.getElementById('disp-income').textContent = formatCurrency(state.income);
  document.getElementById('disp-expenses').textContent = formatCurrency(totalExpenses);
  document.getElementById('disp-expenses-pct').textContent = `${expensesPct}% of income`;
  document.getElementById('disp-savings').textContent = formatCurrency(netSavings);
  document.getElementById('disp-savings-pct').textContent = `${savingsPct}% savings rate`;
  document.getElementById('disp-score').textContent = `${score}/100`;

  // Update 50/30/20 Rule Breakdown
  document.getElementById('rule-needs-val').textContent = formatCurrency(state.income * 0.5);
  document.getElementById('rule-wants-val').textContent = formatCurrency(state.income * 0.3);
  document.getElementById('rule-savings-val').textContent = formatCurrency(state.income * 0.2);
}

function initBudgetCalculator() {
  const updateBtn = document.getElementById('update-budget-btn');
  const inputIncome = document.getElementById('input-income');
  const inputNeeds = document.getElementById('input-needs');
  const inputWants = document.getElementById('input-wants');
  const inputSavings = document.getElementById('input-savings');

  // Populate inputs from saved state
  if (inputIncome) inputIncome.value = state.income;
  if (inputNeeds) inputNeeds.value = state.needs;
  if (inputWants) inputWants.value = state.wants;
  if (inputSavings) inputSavings.value = state.savings;

  if (!updateBtn) return;

  updateBtn.addEventListener('click', () => {
    state.income = Number(inputIncome.value) || 0;
    state.needs = Number(inputNeeds.value) || 0;
    state.wants = Number(inputWants.value) || 0;
    state.savings = Number(inputSavings.value) || 0;

    // Persist budget in localStorage
    localStorage.setItem('aura_budget_data', JSON.stringify({
      income: state.income,
      needs: state.needs,
      wants: state.wants,
      savings: state.savings
    }));

    updateDashboard();
  });
}

// --- Savings Goals Manager ---
function initGoals() {
  renderGoals();

  const goalForm = document.getElementById('goal-form');
  if (!goalForm) return;

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

    saveGoalsToLocalStorage();
    renderGoals();
    goalForm.reset();
  });
}

function saveGoalsToLocalStorage() {
  localStorage.setItem('aura_goals_data', JSON.stringify(state.goals));
}

function deleteGoal(goalId) {
  state.goals = state.goals.filter(g => g.id !== goalId);
  saveGoalsToLocalStorage();
  renderGoals();
}

function renderGoals() {
  const container = document.getElementById('goals-container');
  if (!container) return;

  container.innerHTML = '';

  state.goals.forEach(goal => {
    const pct = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
    const card = document.createElement('div');
    card.className = 'goal-card';
    card.innerHTML = `
      <div class="goal-header">
        <span class="goal-title">${escapeHtml(goal.name)}</span>
        <div class="goal-actions">
          <span class="text-success font-weight-bold">${pct}%</span>
          <button class="btn-icon-danger" onclick="deleteGoal(${goal.id})" title="Delete Goal">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width: ${pct}%"></div>
      </div>
      <div class="goal-stats">
        <span>Saved: ${formatCurrency(goal.current)}</span>
        <span>Target: ${formatCurrency(goal.target)}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// --- AI Chatbot Interface ---
function initChat() {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  if (!form || !input) return;

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
  if (!input) return;
  input.value = questionText;
  document.getElementById('chat-form').dispatchEvent(new Event('submit'));
}

function addChatMessage(text, sender) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

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

// --- AI Query Controller ---
async function processAiQuery(userQuery) {
  addChatMessage("Thinking...", 'bot');

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
    addChatMessage(`API Error: ${error.message || 'Unable to connect to Google Gemini API. Please check your API key in Settings.'}`, 'bot');
  }
}

// --- Official Google Gemini API Endpoint Integration ---
async function callGeminiApi(userPrompt) {
  const cleanKey = state.apiKey.trim();

  const payload = {
    systemInstruction: {
      parts: [
        {
          text: `You are AuraFin, a professional AI financial adviser. Provide clear, direct, helpful financial guidance in 2-4 sentences in terms of ${state.currency} currency. Do NOT output internal prompt instructions, constraints, or draft notes.\nUser Profile Context (${state.currency}): Monthly Income: ${formatCurrency(state.income)}, Needs: ${formatCurrency(state.needs)}, Wants: ${formatCurrency(state.wants)}, Savings: ${formatCurrency(state.savings)}.`
        }
      ]
    },
    contents: [
      {
        role: "user",
        parts: [
          { text: userPrompt }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 500
    }
  };

  const candidateModels = state.activeModelPath 
    ? [state.activeModelPath, 'models/gemini-1.5-flash-latest', 'models/gemini-2.0-flash', 'models/gemma-4-26b-a4b-it', 'models/gemini-pro']
    : ['models/gemini-1.5-flash-latest', 'models/gemini-2.0-flash', 'models/gemma-4-26b-a4b-it', 'models/gemini-pro'];

  let lastError = null;

  for (const modelPath of candidateModels) {
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
        state.activeModelPath = cleanPath;
        return sanitizeAiOutput(data.candidates[0].content.parts[0].text);
      }

      if (data.error) {
        lastError = data.error.message;
      }
    } catch (err) {
      lastError = err.message;
    }
  }

  throw new Error(lastError || 'Invalid API key or HTTP response error from Google Gemini.');
}

// --- Clean AI Text Output Sanitize Function ---
function sanitizeAiOutput(rawText) {
  if (!rawText) return '';
  let text = rawText.trim();

  if (text.includes('*Draft 2:*')) text = text.split('*Draft 2:*')[1];
  else if (text.includes('*Draft 1:*')) text = text.split('*Draft 1:*')[1];
  else if (text.includes('Draft:')) text = text.split('Draft:')[1];
  else if (text.includes('Total sentences:')) text = text.split('Total sentences:')[1];

  text = text.replace(/Constraint \d+:[^\n]*/gi, '');
  text = text.replace(/User Question:[^\n]*/gi, '');
  text = text.replace(/User Profile:[^\n]*/gi, '');
  text = text.replace(/\*[^*]+\*/g, '');

  return text.trim().replace(/^["'\s]+|["'\s]+$/g, '');
}

// --- Settings Modal ---
function initSettingsModal() {
  const modal = document.getElementById('settings-modal');
  const openBtn = document.getElementById('open-settings-btn');
  const closeBtn = document.getElementById('close-settings-btn');
  const cancelBtn = document.getElementById('cancel-settings-btn');
  const saveBtn = document.getElementById('save-settings-btn');
  const keyInput = document.getElementById('gemini-api-key');

  if (!modal || !openBtn) return;

  if (state.apiKey && keyInput) {
    keyInput.value = state.apiKey;
  }

  const openModal = () => modal.classList.add('active');
  const closeModal = () => modal.classList.remove('active');

  openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      state.apiKey = keyInput.value.trim();
      state.activeModelPath = null;
      localStorage.setItem('aura_gemini_key', state.apiKey);
      closeModal();
    });
  }
}

// --- Utility Helpers ---
function formatCurrency(num) {
  const symbol = state.currency || '₹';
  const val = Number(num) || 0;
  
  if (symbol === '₹') {
    return symbol + ' ' + val.toLocaleString('en-IN');
  }
  return symbol + ' ' + val.toLocaleString('en-US');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
