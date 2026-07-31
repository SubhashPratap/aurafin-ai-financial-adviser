/* ==========================================================================
   AuraFin — State & Utility Module (js/state.js)
   ========================================================================== */

// Load saved budget from localStorage or default to empty initial budget
const savedBudget = JSON.parse(localStorage.getItem('aura_budget_data')) || {
  income: 0,
  needs: 0,
  wants: 0,
  savings: 0
};

// Load saved goals from localStorage or default to empty goals list
const savedGoals = JSON.parse(localStorage.getItem('aura_goals_data')) || [];

// Load saved chat history from localStorage or default welcome message
const savedChatHistory = JSON.parse(localStorage.getItem('aura_chat_history')) || [
  { text: "Welcome to AuraFin Advisory. How can I assist you with your financial planning today?", sender: "bot", time: "Just now" }
];

// Global Application State Object
window.state = {
  income: savedBudget.income,
  needs: savedBudget.needs,
  wants: savedBudget.wants,
  savings: savedBudget.savings,
  currency: localStorage.getItem('aura_currency') || '₹',
  language: localStorage.getItem('aura_language') || 'English',
  apiKey: localStorage.getItem('aura_gemini_key') || '',
  activeModelPath: null,
  goals: savedGoals,
  chatHistory: savedChatHistory
};

// Global Font Awesome Icon Templates
window.ICONS = {
  user: '<i class="fa-solid fa-user"></i>',
  bot: '<i class="fa-solid fa-robot"></i>'
};

// Format numbers according to active currency
window.formatCurrency = function(num) {
  const symbol = window.state.currency || '₹';
  const val = Number(num) || 0;
  
  if (symbol === '₹') {
    return symbol + ' ' + val.toLocaleString('en-IN');
  }
  return symbol + ' ' + val.toLocaleString('en-US');
};

// Escape HTML characters for XSS prevention
window.escapeHtml = function(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
};
