/* ==========================================================================
   AuraFin — State & Utility Module (js/state.js)
   ========================================================================== */

// Load saved budget from localStorage or default to INR benchmarks
const savedBudget = JSON.parse(localStorage.getItem('aura_budget_data')) || {
  income: 80000,
  needs: 40000,
  wants: 16000,
  savings: 24000
};

// Load saved goals from localStorage or default
const savedGoals = JSON.parse(localStorage.getItem('aura_goals_data')) || [
  { id: 1, name: 'Emergency Capital Reserve', target: 300000, current: 180000 },
  { id: 2, name: 'Vehicle Replacement Reserve', target: 150000, current: 60000 },
  { id: 3, name: 'Property Down Payment', target: 500000, current: 250000 }
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
  goals: savedGoals
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
