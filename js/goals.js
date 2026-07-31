// Savings Goals module: handles goal creation, deletion, rendering, and progress update modal
let activeUpdatingGoalId = null;

window.initGoals = function() {
  window.renderGoals();

  const goalForm = document.getElementById('goal-form');
  if (goalForm) {
    goalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('goal-name').value;
      const target = Number(document.getElementById('goal-target').value);
      const current = Number(document.getElementById('goal-current').value);

      window.state.goals.push({
        id: Date.now(),
        name,
        target,
        current
      });

      window.saveGoalsToLocalStorage();
      window.renderGoals();
      goalForm.reset();
    });
  }

  // Initialize Goal Update Modal Controller
  initGoalUpdateModal();
};

function initGoalUpdateModal() {
  const modal = document.getElementById('goal-update-modal');
  const closeBtn = document.getElementById('close-goal-modal-btn');
  const cancelBtn = document.getElementById('cancel-goal-modal-btn');
  const saveBtn = document.getElementById('save-goal-modal-btn');
  const input = document.getElementById('goal-update-input');

  if (!modal || !saveBtn) return;

  const closeModal = () => {
    modal.classList.remove('active');
    activeUpdatingGoalId = null;
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  saveBtn.addEventListener('click', () => {
    if (!activeUpdatingGoalId) return;
    const goal = window.state.goals.find(g => g.id === activeUpdatingGoalId);
    if (goal && input) {
      const newSaved = Number(input.value.trim());
      if (!isNaN(newSaved) && newSaved >= 0) {
        goal.current = newSaved;
        window.saveGoalsToLocalStorage();
        window.renderGoals();
        closeModal();
      }
    }
  });
}

window.saveGoalsToLocalStorage = function() {
  localStorage.setItem('aura_goals_data', JSON.stringify(window.state.goals));
};

window.deleteGoal = function(goalId) {
  window.state.goals = window.state.goals.filter(g => g.id !== goalId);
  window.saveGoalsToLocalStorage();
  window.renderGoals();
};

window.updateGoalProgress = function(goalId) {
  const goal = window.state.goals.find(g => g.id === goalId);
  if (!goal) return;

  activeUpdatingGoalId = goalId;
  const modal = document.getElementById('goal-update-modal');
  const subtitle = document.getElementById('goal-update-subtitle');
  const input = document.getElementById('goal-update-input');

  if (modal && subtitle && input) {
    subtitle.textContent = `Update total saved capital for "${goal.name}"`;
    input.value = goal.current;
    modal.classList.add('active');
    setTimeout(() => input.focus(), 100);
  }
};

window.renderGoals = function() {
  const container = document.getElementById('goals-container');
  if (!container) return;

  container.innerHTML = '';

  if (!window.state.goals || window.state.goals.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="text-align: center; padding: 24px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-md); grid-column: 1 / -1;">
        <i class="fa-solid fa-bullseye" style="font-size: 1.8rem; color: var(--text-muted); margin-bottom: 6px;"></i>
        <p style="color: var(--text-muted); font-size: 0.84rem;">No active savings goals yet. Add your first goal below to start tracking your capital!</p>
      </div>
    `;
    return;
  }

  window.state.goals.forEach(goal => {
    const pct = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
    const card = document.createElement('div');
    card.className = 'goal-card';
    card.innerHTML = `
      <div class="goal-header">
        <span class="goal-title">${window.escapeHtml(goal.name)}</span>
        <div class="goal-actions">
          <span class="text-success font-weight-bold" style="font-size: 0.84rem; margin-right: 4px;">${pct}%</span>
          <button class="btn-icon-subtle" onclick="window.updateGoalProgress(${goal.id})" title="Update Saved Amount" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px 5px; font-size: 0.88rem;">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn-icon-danger" onclick="window.deleteGoal(${goal.id})" title="Delete Goal">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width: ${pct}%"></div>
      </div>
      <div class="goal-stats">
        <span>Saved: ${window.formatCurrency(goal.current)}</span>
        <span>Target: ${window.formatCurrency(goal.target)}</span>
      </div>
    `;
    container.appendChild(card);
  });
};
