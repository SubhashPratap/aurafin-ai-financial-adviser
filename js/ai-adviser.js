/* ==========================================================================
   AuraFin — AI Financial Adviser Module (js/ai-adviser.js)
   ========================================================================== */window.initChat = function() {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');

  // Floating chat elements
  const floatToggle = document.getElementById('floating-chat-toggle');
  const floatDrawer = document.getElementById('floating-chat-drawer');
  const floatClose = document.getElementById('floating-chat-close');
  const floatForm = document.getElementById('floating-chat-form');
  const floatInput = document.getElementById('floating-chat-input');

  // Initialize status dot based on existing key
  window.updateApiStatusIndicator();

  // Render initial persistent chat history
  window.renderChatHistory();

  if (form && input) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      window.addChatMessage(text, 'user');
      input.value = '';
      window.processAiQuery(text);
    });
  }

  // Floating Chat Event Handlers
  if (floatToggle && floatDrawer) {
    floatToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      floatDrawer.classList.toggle('active');
    });
  }

  if (floatClose && floatDrawer) {
    floatClose.addEventListener('click', (e) => {
      e.stopPropagation();
      floatDrawer.classList.remove('active');
    });
  }

  // Minimize floating chat when tapping anywhere outside the widget
  document.addEventListener('click', (e) => {
    const floatContainer = document.querySelector('.floating-chat-container');
    if (floatDrawer && floatDrawer.classList.contains('active')) {
      if (floatContainer && !floatContainer.contains(e.target)) {
        floatDrawer.classList.remove('active');
      }
    }
  });

  if (floatForm && floatInput) {
    floatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = floatInput.value.trim();
      if (!text) return;

      window.addChatMessage(text, 'user');
      floatInput.value = '';
      window.processAiQuery(text);
    });
  }
};

window.updateFloatingFabVisibility = function(activeTab) {
  const fabContainer = document.querySelector('.floating-chat-container');
  if (!fabContainer) return;
  if (activeTab === 'advisor') {
    fabContainer.style.display = 'none';
    const floatDrawer = document.getElementById('floating-chat-drawer');
    if (floatDrawer) floatDrawer.classList.remove('active');
  } else {
    fabContainer.style.display = 'block';
  }
};

window.updateApiStatusIndicator = function() {
  const dot = document.querySelector('.api-status .status-dot');
  const text = document.querySelector('.api-status .status-text');
  if (!dot || !text) return;
  if (window.state.apiKey && window.state.apiKey.trim().length > 0) {
    dot.classList.add('active');
    text.textContent = 'AI Adviser Ready';
  } else {
    dot.classList.remove('active');
    text.textContent = 'Configure API Key';
  }
};

window.askQuickQuestion = function(questionText) {
  const input = document.getElementById('chat-input');
  if (!input || input.disabled) return;
  input.value = questionText;
  document.getElementById('chat-form').dispatchEvent(new Event('submit'));
};

window.renderChatHistory = function() {
  const containers = [
    document.getElementById('chat-messages'),
    document.getElementById('floating-chat-messages')
  ].filter(Boolean);

  if (containers.length === 0) return;

  containers.forEach(container => {
    container.innerHTML = '';
    (window.state.chatHistory || []).forEach(msgData => {
      const avatarIcon = msgData.sender === 'user' ? window.ICONS.user : window.ICONS.bot;
      const formattedContent = msgData.sender === 'bot' ? window.formatMarkdownText(msgData.text) : window.escapeHtml(msgData.text);
      const msg = document.createElement('div');
      msg.className = `msg ${msgData.sender}`;
      msg.innerHTML = `
        <div class="msg-avatar">${avatarIcon}</div>
        <div class="msg-bubble">
          <div class="msg-text">${formattedContent}</div>
          <div class="msg-time">${msgData.time || 'Just now'}</div>
        </div>
      `;
      container.appendChild(msg);
    });
    container.scrollTop = container.scrollHeight;
  });
};

window.addChatMessage = function(text, sender, isTemporary = false) {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!isTemporary) {
    if (!window.state.chatHistory) window.state.chatHistory = [];
    window.state.chatHistory.push({ text, sender, time });
    localStorage.setItem('aura_chat_history', JSON.stringify(window.state.chatHistory));
  }

  const containers = [
    document.getElementById('chat-messages'),
    document.getElementById('floating-chat-messages')
  ].filter(Boolean);

  if (containers.length === 0) return;

  const avatarIcon = sender === 'user' ? window.ICONS.user : window.ICONS.bot;
  const formattedContent = sender === 'bot' ? window.formatMarkdownText(text) : window.escapeHtml(text);

  containers.forEach(container => {
    const msg = document.createElement('div');
    msg.className = `msg ${sender}`;
    msg.innerHTML = `
      <div class="msg-avatar">${avatarIcon}</div>
      <div class="msg-bubble">
        <div class="msg-text">${formattedContent}</div>
        <div class="msg-time">${time}</div>
      </div>
    `;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
  });
};

// Format Markdown Bold (**text**), Bullet points, and Linebreaks
window.formatMarkdownText = function(text) {
  if (!text) return '';
  let html = window.escapeHtml(text);

  // Convert **bold** to <strong>bold</strong>
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Format bullet points
  html = html.replace(/^[\*\-\•]\s+(.*)$/gm, '• $1');

  // Convert newlines to <br>
  html = html.replace(/\n/g, '<br>');

  return html;
};

window.processAiQuery = async function(userQuery) {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

  const floatForm = document.getElementById('floating-chat-form');
  const floatInput = document.getElementById('floating-chat-input');
  const floatSubmitBtn = floatForm ? floatForm.querySelector('button[type="submit"]') : null;

  const chips = document.querySelectorAll('.suggestion-chips button');

  // Prevent double-submit by disabling all UI controls
  [input, submitBtn, floatInput, floatSubmitBtn].forEach(el => { if (el) el.disabled = true; });
  chips.forEach(chip => chip.disabled = true);

  window.addChatMessage("Thinking...", 'bot');

  const removeThinkingMessages = () => {
    [document.getElementById('chat-messages'), document.getElementById('floating-chat-messages')].forEach(container => {
      if (container && container.lastChild && container.lastChild.innerText && container.lastChild.innerText.includes("Thinking...")) {
        container.removeChild(container.lastChild);
      }
    });
  };

  const enableControls = () => {
    [input, submitBtn, floatInput, floatSubmitBtn].forEach(el => { if (el) el.disabled = false; });
    chips.forEach(chip => chip.disabled = false);
  };

  if (!window.state.apiKey || window.state.apiKey.trim().length === 0) {
    removeThinkingMessages();
    window.addChatMessage("Please configure your Gemini API Key in Settings (⚙️) to enable live real-time AI responses.", 'bot');
    enableControls();
    return;
  }

  try {
    const responseText = await window.callGeminiApi(userQuery);
    removeThinkingMessages();
    window.addChatMessage(responseText, 'bot');
  } catch (error) {
    removeThinkingMessages();
    window.addChatMessage(`API Error: ${error.message || 'Unable to connect to Google Gemini API. Please check your API key in Settings.'}`, 'bot');
  } finally {
    enableControls();
  }
};

window.callGeminiApi = async function(userPrompt) {
  const payload = {
    userPrompt: userPrompt,
    userApiKey: window.state.apiKey,
    chatHistory: window.state.chatHistory || [],
    state: {
      income: window.state.income,
      needs: window.state.needs,
      wants: window.state.wants,
      savings: window.state.savings,
      currency: window.state.currency,
      language: window.state.language
    }
  };

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const text = await res.text();
      if (text && text.trim().length > 0) {
        const data = JSON.parse(text);
        if (data.text) {
          return window.sanitizeAiOutput(data.text);
        }
        if (data.error) {
          throw new Error(data.error);
        }
      }
    }
    // If response is OK but body is empty, it means we are on a static site host. Force fallback.
    throw new Error("STATIC_FALLBACK");
  } catch (serverError) {
    // If it's a real API key error from the backend, bubble it up instead of falling back
    if (serverError.message && serverError.message !== "STATIC_FALLBACK" && !serverError.message.includes("Unexpected token")) {
      throw serverError;
    }

    // Perform direct client-side API request fallback
    return await window.callGeminiDirectly(userPrompt);
  }
};

window.callGeminiDirectly = async function(userPrompt) {
  const cleanKey = window.state.apiKey.trim();
  const targetLanguage = window.state.language || 'English';
  const targetCurrency = window.state.currency || '₹';

  const contextLine = `Income ${window.formatCurrency(window.state.income)}, Needs ${window.formatCurrency(window.state.needs)}, Savings ${window.formatCurrency(window.state.savings)}.`;
  const sysText = `You are AuraFin, a friendly financial adviser. Reply in ${targetLanguage}. Use ${targetCurrency}. User context: ${contextLine} Give 2-3 short bullet points of simple, direct, practical advice. No jargon. If the question is not about personal finance, politely state in ${targetLanguage} that you can only answer financial questions.`;

  const candidateModels = ['models/gemini-flash-latest', 'models/gemini-3.5-flash', 'models/gemini-2.0-flash-lite', 'models/gemini-2.0-flash', 'models/gemini-flash-lite-latest'];

  let lastError = null;

  for (const modelPath of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${cleanKey}`;
      const payload = {
        systemInstruction: { parts: [{ text: sysText }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 2000 }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        try {
          const errJson = JSON.parse(errText);
          throw new Error(errJson.error?.message || `HTTP ${res.status}`);
        } catch (_) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
      }

      const data = await res.json();
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
        return window.sanitizeAiOutput(data.candidates[0].content.parts[0].text);
      }
    } catch (err) {
      lastError = err.message;
    }
  }

  throw new Error(lastError || 'Invalid API key or HTTP response error from Google Gemini.');
};

window.sanitizeAiOutput = function(rawText) {
  if (!rawText) return '';

  // Split into paragraphs on blank lines
  const paragraphs = rawText.trim().split(/\n[ \t]*\n/);

  const cleanedParagraphs = [];
  for (const para of paragraphs) {
    // Remove any stray formatting/metadata lines
    const cleaned = para
      .split('\n')
      .filter(l => !/^\s*\*+\s*\*?(Draft|Bullet\s*\d|Check\s|Constraint\s*\d+:)/i.test(l))
      .join('\n')
      .replace(/^    \*/gm, '*')   // Remove 4-space indent
      .replace(/^\s{4}/gm, '')
      .trim();

    if (cleaned) {
      cleanedParagraphs.push(cleaned);
    }
  }

  if (cleanedParagraphs.length) {
    return cleanedParagraphs.join('\n\n');
  }

  return rawText.replace(/\*[^*\n]+\*/g, '').replace(/\s{2,}/g, ' ').trim();
};
