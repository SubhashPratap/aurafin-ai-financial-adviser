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

// --- AI Advisory Engine ---
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
  addChatMessage("Processing financial query...", 'bot');

  const container = document.getElementById('chat-messages');
  const thinkingMsg = container.lastChild;

  try {
    let responseText = "";

    // Accept ANY API Key length > 5
    if (state.apiKey && state.apiKey.trim().length > 5) {
      responseText = await callGeminiApi(userQuery);
    } else {
      responseText = await getBuiltinFinancialAdvisorReply(userQuery);
    }

    container.removeChild(thinkingMsg);
    addChatMessage(responseText, 'bot');
  } catch (error) {
    container.removeChild(thinkingMsg);
    const fallback = await getBuiltinFinancialAdvisorReply(userQuery);
    addChatMessage(fallback, 'bot');
  }
}

function getBuiltinFinancialAdvisorReply(query) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const q = query.toLowerCase();

      if (q.includes('emergency fund') || q.includes('reserve')) {
        resolve(`Emergency Reserve Strategy:\n\n1. Target 3 to 6 months of essential living expenses ($${(state.needs * 3).toLocaleString()} – $${(state.needs * 6).toLocaleString()}).\n2. Place capital in a High-Yield Savings Account (HYSA) with 4.0%+ APY.\n3. Automate recurring transfers immediately following payroll.`);
      } else if (q.includes('snowball') || q.includes('avalanche') || q.includes('debt')) {
        resolve(`Debt Reduction Models:\n\n• Debt Avalanche: Prioritize high-APR balances to minimize total interest paid.\n• Debt Snowball: Pay smallest balances first to gain momentum.\n\nRecommendation: Use Avalanche for debts carrying >8% interest.`);
      } else if (q.includes('invest') || q.includes('stock') || q.includes('crypto')) {
        resolve(`Investment Framework:\n\n1. Maximize 401(k)/employer match first.\n2. Maximize Roth IRA ($7,000/year limit) into broad market index funds (e.g. VTI / S&P 500).\n3. Maintain disciplined long-term dollar-cost averaging.`);
      } else if (q.includes('grocery') || q.includes('cut') || q.includes('save money')) {
        resolve(`Expense Reduction Action Plan:\n\n1. Audit recurring monthly subscriptions.\n2. Implement a 48-hour cool-off period before non-essential purchases over $50.\n3. Track discretionary spending against your $${state.wants.toLocaleString()} budget.`);
      } else {
        // Dynamic custom response generation based on actual user query
        resolve(`Financial Guidance for: "${query}"\n\nBased on your current monthly profile (Income: $${state.income.toLocaleString()}, Savings: $${(state.income - state.needs - state.wants).toLocaleString()}):\n\n1. Strategy: Ensure essential needs stay under 50% ($${(state.income * 0.5).toLocaleString()}).\n2. Capital Allocation: Direct surplus funds toward your active target savings goals.\n3. Action Step: Review allocation limits weekly to maintain financial stability.`);
      }
    }, 600);
  });
}

async function callGeminiApi(prompt) {
  const cleanKey = state.apiKey.trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanKey}`;
  const systemInstruction = `You are AuraFin, an expert AI financial adviser. Provide clear, direct, structured financial advice tailored to the user's question.`;

  const payload = {
    contents: [{
      parts: [
        { text: `${systemInstruction}\n\nUser Question: ${prompt}` }
      ]
    }]
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
    return data.candidates[0].content.parts[0].text;
  } else {
    throw new Error(data.error ? data.error.message : 'Invalid API response');
  }
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
