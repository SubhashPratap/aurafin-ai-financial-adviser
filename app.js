// App bootstrapper and UI controllers
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initMobileMenu();
  if (window.initCurrencySelector) window.initCurrencySelector();
  if (window.initLanguageSelector) window.initLanguageSelector();
  if (window.initBudgetCalculator) window.initBudgetCalculator();
  if (window.initGoals) window.initGoals();
  if (window.initChat) window.initChat();
  initSettingsModal();
  if (window.updateDashboard) window.updateDashboard();
});

// --- Mobile Hamburger Menu Controller ---
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const navMenu = document.querySelector('.nav-menu');
  const navItems = document.querySelectorAll('.nav-item');

  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navMenu.classList.toggle('mobile-active');
      const icon = toggleBtn.querySelector('i');
      if (icon) {
        if (navMenu.classList.contains('mobile-active')) {
          icon.className = 'fa-solid fa-xmark';
        } else {
          icon.className = 'fa-solid fa-bars';
        }
      }
    });

    // Close mobile menu when a tab item is clicked
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        navMenu.classList.remove('mobile-active');
        const icon = toggleBtn.querySelector('i');
        if (icon) icon.className = 'fa-solid fa-bars';
      });
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
      const sidebar = document.querySelector('.sidebar');
      if (navMenu.classList.contains('mobile-active') && sidebar && !sidebar.contains(e.target)) {
        navMenu.classList.remove('mobile-active');
        const icon = toggleBtn.querySelector('i');
        if (icon) icon.className = 'fa-solid fa-bars';
      }
    });
  }
}

// --- Tab Navigation Controller ---
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

      if (window.updateFloatingFabVisibility) {
        window.updateFloatingFabVisibility(tabTarget);
      }
    });
  });
}

// --- Settings Modal Controller ---
function initSettingsModal() {
  const modal = document.getElementById('settings-modal');
  const openBtn = document.getElementById('open-settings-btn');
  const closeBtn = document.getElementById('close-settings-btn');
  const cancelBtn = document.getElementById('cancel-settings-btn');
  const saveBtn = document.getElementById('save-settings-btn');
  const keyInput = document.getElementById('gemini-api-key');

  if (!modal || !openBtn) return;

  if (window.state && window.state.apiKey && keyInput) {
    keyInput.value = window.state.apiKey;
  }

  const openModal = () => modal.classList.add('active');
  const closeModal = () => modal.classList.remove('active');

  openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      window.state.apiKey = keyInput.value.trim();
      window.state.activeModelPath = null;
      localStorage.setItem('aura_gemini_key', window.state.apiKey);
      if (window.updateApiStatusIndicator) window.updateApiStatusIndicator();
      closeModal();
    });
  }
}
