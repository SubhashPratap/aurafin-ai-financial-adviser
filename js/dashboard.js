// Currency & language selectors, dashboard metrics recalculation, and Chart.js integration
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

  // Determine status message and color class based on score
  let statusText = "Excellent";
  let statusClass = "text-success";
  if (score < 40) {
    statusText = "Critical";
    statusClass = "text-danger";
  } else if (score < 60) {
    statusText = "Needs Attention";
    statusClass = "text-warning";
  } else if (score < 80) {
    statusText = "Good";
    statusClass = "text-success";
  }

  // Update DOM Display Elements
  const scoreEl = document.getElementById('disp-score');
  const scoreStatusEl = document.getElementById('disp-score-status');
  
  if (scoreEl) {
    scoreEl.textContent = `${score}/100`;
    // Update score text color class dynamically
    scoreEl.className = `stat-value font-mono ${statusClass}`;
  }
  if (scoreStatusEl) {
    scoreStatusEl.textContent = `Status: ${statusText}`;
    scoreStatusEl.className = `stat-sub ${statusClass}`;
  }

  document.getElementById('disp-income').textContent = window.formatCurrency(window.state.income);
  document.getElementById('disp-expenses').textContent = window.formatCurrency(totalExpenses);
  document.getElementById('disp-expenses-pct').textContent = `${expensesPct}% of income`;
  document.getElementById('disp-savings').textContent = window.formatCurrency(netSavings);
  document.getElementById('disp-savings-pct').textContent = `${savingsPct}% savings rate`;

  // Update 50/30/20 Rule Breakdown
  document.getElementById('rule-needs-val').textContent = window.formatCurrency(window.state.income * 0.5);
  document.getElementById('rule-wants-val').textContent = window.formatCurrency(window.state.income * 0.3);
  document.getElementById('rule-savings-val').textContent = window.formatCurrency(window.state.income * 0.2);

  // Render or Update Chart.js Donut Chart
  const ctx = document.getElementById('budget-chart');
  if (ctx) {
    const needs = window.state.needs || 0;
    const wants = window.state.wants || 0;
    const savings = window.state.savings || 0;
    const totalAllocated = needs + wants + savings;

    const needsPct = totalAllocated > 0 ? (needs / totalAllocated) * 100 : 0;
    const wantsPct = totalAllocated > 0 ? (wants / totalAllocated) * 100 : 0;
    const savingsPct = totalAllocated > 0 ? (savings / totalAllocated) * 100 : 0;

    const dataValues = [needs, wants, savings];
    const categoryColors = ['#3b82f6', '#8b5cf6', '#10b981'];

    // Populate Custom Allocation Table below Chart
    const legendList = document.getElementById('allocation-legend-list');
    if (legendList) {
      const categories = [
        { name: 'Needs & Essential Bills', amount: needs, pct: needsPct, color: categoryColors[0] },
        { name: 'Wants & Discretionary', amount: wants, pct: wantsPct, color: categoryColors[1] },
        { name: 'Savings & Investments', amount: savings, pct: savingsPct, color: categoryColors[2] }
      ];

      legendList.innerHTML = categories.map(cat => {
        const pctFormatted = Number.isInteger(cat.pct) ? `${cat.pct}%` : `${cat.pct.toFixed(1)}%`;
        return `
          <div class="allocation-row">
            <div class="allocation-category">
              <span class="color-pill" style="background-color: ${cat.color}"></span>
              <span class="category-name">${cat.name}</span>
            </div>
            <div class="allocation-val">
              <span>${pctFormatted}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    const centerTextPlugin = {
      id: 'centerTextPlugin',
      beforeDraw(chart) {
        const { width, height, ctx } = chart;
        ctx.save();

        const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
        const formattedTotal = window.formatCurrency(total);

        const centerX = width / 2;
        const centerY = height / 2;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.font = '500 10px Inter, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('Total Budget', centerX, centerY - 8);

        ctx.font = '700 13px "Fira Code", monospace';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(formattedTotal, centerX, centerY + 8);

        ctx.restore();
      }
    };

    if (!window.budgetChartInstance) {
      window.budgetChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Needs', 'Wants', 'Savings'],
          datasets: [{
            data: dataValues,
            backgroundColor: categoryColors,
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        plugins: [centerTextPlugin],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false // Using custom allocation table below chart
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const val = context.raw;
                  return ` ${context.label}: ${window.formatCurrency(val)}`;
                }
              }
            }
          },
          cutout: '70%'
        }
      });
    } else {
      window.budgetChartInstance.data.datasets[0].data = dataValues;
      window.budgetChartInstance.update();
    }
  }
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
