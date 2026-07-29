/* ==========================================================================
   AuraFin — Dashboard & Budget Calculator Module (js/dashboard.js)
   ========================================================================== */

window.initCurrencySelector = function() {
  const select = document.getElementById('currency-select');
  if (!select) return;

  select.value = window.state.currency;

  select.addEventListener('change', (e) => {
    window.state.currency = e.target.value;
    localStorage.setItem('aura_currency', window.state.currency);

    // Update all currency symbol labels across DOM
    document.querySelectorAll('.curr-sym').forEach(el => {
      el.textContent = window.state.currency;
    });

    window.updateDashboard();
    if (window.renderGoals) window.renderGoals();
  });

  // Initial symbol sync
  document.querySelectorAll('.curr-sym').forEach(el => {
    el.textContent = window.state.currency;
  });
};

window.initLanguageSelector = function() {
  const select = document.getElementById('language-select');
  if (!select) return;

  select.value = window.state.language;

  select.addEventListener('change', (e) => {
    window.state.language = e.target.value;
    localStorage.setItem('aura_language', window.state.language);
  });
};

window.updateDashboard = function() {
  const totalExpenses = window.state.needs + window.state.wants;
  const netSavings = window.state.income - totalExpenses;
  const savingsPct = window.state.income > 0 ? Math.round((netSavings / window.state.income) * 100) : 0;
  const expensesPct = window.state.income > 0 ? Math.round((totalExpenses / window.state.income) * 100) : 0;

  // Financial Health Index Score calculation
  let score = 100;
  if (expensesPct > 70) score -= (expensesPct - 70) * 1.5;
  if (savingsPct < 20) score -= (20 - savingsPct) * 1.5;
  score = Math.max(20, Math.min(100, Math.round(score)));

  // Update DOM Display Elements
  document.getElementById('disp-income').textContent = window.formatCurrency(window.state.income);
  document.getElementById('disp-expenses').textContent = window.formatCurrency(totalExpenses);
  document.getElementById('disp-expenses-pct').textContent = `${expensesPct}% of income`;
  document.getElementById('disp-savings').textContent = window.formatCurrency(netSavings);
  document.getElementById('disp-savings-pct').textContent = `${savingsPct}% savings rate`;
  document.getElementById('disp-score').textContent = `${score}/100`;

  // Update 50/30/20 Rule Breakdown
  document.getElementById('rule-needs-val').textContent = window.formatCurrency(window.state.income * 0.5);
  document.getElementById('rule-wants-val').textContent = window.formatCurrency(window.state.income * 0.3);
  document.getElementById('rule-savings-val').textContent = window.formatCurrency(window.state.income * 0.2);
};

window.initBudgetCalculator = function() {
  const updateBtn = document.getElementById('update-budget-btn');
  const inputIncome = document.getElementById('input-income');
  const inputNeeds = document.getElementById('input-needs');
  const inputWants = document.getElementById('input-wants');
  const inputSavings = document.getElementById('input-savings');

  // Populate inputs from saved state
  if (inputIncome) inputIncome.value = window.state.income;
  if (inputNeeds) inputNeeds.value = window.state.needs;
  if (inputWants) inputWants.value = window.state.wants;
  if (inputSavings) inputSavings.value = window.state.savings;

  if (!updateBtn) return;

  updateBtn.addEventListener('click', () => {
    window.state.income = Number(inputIncome.value) || 0;
    window.state.needs = Number(inputNeeds.value) || 0;
    window.state.wants = Number(inputWants.value) || 0;
    window.state.savings = Number(inputSavings.value) || 0;

    // Persist budget in localStorage
    localStorage.setItem('aura_budget_data', JSON.stringify({
      income: window.state.income,
      needs: window.state.needs,
      wants: window.state.wants,
      savings: window.state.savings
    }));

    window.updateDashboard();
  });
};
