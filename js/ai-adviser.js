/* ==========================================================================
   AuraFin — AI Financial Adviser Module (js/ai-adviser.js)
   ========================================================================== */

window.initChat = function() {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  if (!form || !input) return;

  // Initialize status dot based on existing key
  window.updateApiStatusIndicator();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    window.addChatMessage(text, 'user');
    input.value = '';

    window.processAiQuery(text);
  });
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

window.addChatMessage = function(text, sender) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const msg = document.createElement('div');
  msg.className = `msg ${sender}`;

  const avatarIcon = sender === 'user' ? window.ICONS.user : window.ICONS.bot;
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Format markdown for bot messages (bold, bullet points, linebreaks)
  const formattedContent = sender === 'bot' ? window.formatMarkdownText(text) : window.escapeHtml(text);

  msg.innerHTML = `
    <div class="msg-avatar">${avatarIcon}</div>
    <div class="msg-bubble">
      <div class="msg-text">${formattedContent}</div>
      <div class="msg-time">${time}</div>
    </div>
  `;

  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
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
  const chips = document.querySelectorAll('.suggestion-chips button');

  // Prevent double-submit by disabling UI controls
  if (input) input.disabled = true;
  if (submitBtn) submitBtn.disabled = true;
  chips.forEach(chip => chip.disabled = true);

  window.addChatMessage("Thinking...", 'bot');

  const container = document.getElementById('chat-messages');
  const thinkingMsg = container.lastChild;

  if (!window.state.apiKey || window.state.apiKey.trim().length === 0) {
    container.removeChild(thinkingMsg);
    window.addChatMessage("Please configure your Gemini API Key in Settings (⚙️) to enable live real-time AI responses.", 'bot');
    
    // Enable controls back
    if (input) input.disabled = false;
    if (submitBtn) submitBtn.disabled = false;
    chips.forEach(chip => chip.disabled = false);
    if (input) input.focus();
    return;
  }

  try {
    const responseText = await window.callGeminiApi(userQuery);
    container.removeChild(thinkingMsg);
    window.addChatMessage(responseText, 'bot');
  } catch (error) {
    container.removeChild(thinkingMsg);
    window.addChatMessage(`API Error: ${error.message || 'Unable to connect to Google Gemini API. Please check your API key in Settings.'}`, 'bot');
  } finally {
    // Enable controls back
    if (input) input.disabled = false;
    if (submitBtn) submitBtn.disabled = false;
    chips.forEach(chip => chip.disabled = false);
    if (input) input.focus();
  }
};

window.callGeminiApi = async function(userPrompt) {
  const payload = {
    userPrompt: userPrompt,
    userApiKey: window.state.apiKey,
    state: {
      income: window.state.income,
      needs: window.state.needs,
      wants: window.state.wants,
      savings: window.state.savings,
      currency: window.state.currency,
      language: window.state.language
    }
  };

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorText = await res.text();
    let errorMessage = "Server error occurred.";
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorMessage;
    } catch (_) {
      errorMessage = errorText || `HTTP ${res.status}: ${res.statusText}`;
    }
    throw new Error(errorMessage);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }

  if (data.text) {
    return window.sanitizeAiOutput(data.text);
  }

  throw new Error("Invalid or empty response from backend adviser server.");
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
