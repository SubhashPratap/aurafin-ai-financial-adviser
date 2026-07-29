/* ==========================================================================
   AuraFin — AI Financial Adviser Module (js/ai-adviser.js)
   ========================================================================== */

window.initChat = function() {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  if (!form || !input) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    window.addChatMessage(text, 'user');
    input.value = '';

    window.processAiQuery(text);
  });
};

window.askQuickQuestion = function(questionText) {
  const input = document.getElementById('chat-input');
  if (!input) return;
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
  window.addChatMessage("Thinking...", 'bot');

  const container = document.getElementById('chat-messages');
  const thinkingMsg = container.lastChild;

  if (!window.state.apiKey || window.state.apiKey.trim().length === 0) {
    container.removeChild(thinkingMsg);
    window.addChatMessage("Please configure your Gemini API Key in Settings (⚙️) to enable live real-time AI responses.", 'bot');
    return;
  }

  try {
    const responseText = await window.callGeminiApi(userQuery);
    container.removeChild(thinkingMsg);
    window.addChatMessage(responseText, 'bot');
  } catch (error) {
    container.removeChild(thinkingMsg);
    window.addChatMessage(`API Error: ${error.message || 'Unable to connect to Google Gemini API. Please check your API key in Settings.'}`, 'bot');
  }
};

window.callGeminiApi = async function(userPrompt) {
  const cleanKey = window.state.apiKey.trim();
  const targetLanguage = window.state.language || 'English';
  const targetCurrency = window.state.currency || '₹';

  const systemInstructionText = `You are AuraFin, a friendly financial adviser. Explain everything simply in plain everyday language without complex financial jargon.
Always reply strictly in ${targetLanguage} language.
Use ${targetCurrency} currency format for amounts.

User Financial Context:
- Income: ${window.formatCurrency(window.state.income)}
- Needs: ${window.formatCurrency(window.state.needs)}
- Wants: ${window.formatCurrency(window.state.wants)}
- Monthly Savings: ${window.formatCurrency(window.state.savings)}

Give direct, practical advice in 2-3 simple steps. Use bullet points and bold numbers for key amounts.`;

  const payload = {
    systemInstruction: {
      parts: [
        { text: systemInstructionText }
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
      temperature: 0.5,
      maxOutputTokens: 400
    }
  };

  const candidateModels = window.state.activeModelPath 
    ? [window.state.activeModelPath, 'models/gemini-1.5-flash-latest', 'models/gemini-2.0-flash', 'models/gemma-4-26b-a4b-it', 'models/gemini-pro']
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
        window.state.activeModelPath = cleanPath;
        return window.sanitizeAiOutput(data.candidates[0].content.parts[0].text);
      }

      if (data.error) {
        lastError = data.error.message;
      }
    } catch (err) {
      lastError = err.message;
    }
  }

  throw new Error(lastError || 'Invalid API key or HTTP response error from Google Gemini.');
};

window.sanitizeAiOutput = function(rawText) {
  if (!rawText) return '';
  let text = rawText.trim();

  // If model output contains quoted answer (e.g. "To cover six months..."), extract quote
  const quoteMatches = text.match(/"([^"]{20,})"/);
  if (quoteMatches && quoteMatches[1] && !quoteMatches[1].includes('User Context:')) {
    return quoteMatches[1].trim();
  }

  // Strip scratchpad lines & self-check markers
  text = text.replace(/^User Context:[^\n]*/gi, '');
  text = text.replace(/Time to reach goal[^\n]*/gi, '');
  text = text.replace(/Strategy:[^\n]*/gi, '');
  text = text.replace(/Constraint \d+:[^\n]*/gi, '');
  text = text.replace(/User Question:[^\n]*/gi, '');
  text = text.replace(/User Profile:[^\n]*/gi, '');
  text = text.replace(/currency used\?[^\n]*/gi, '');
  text = text.replace(/No internal instructions\?[^\n]*/gi, '');

  // Strip remaining metadata
  text = text.replace(/\*[^*]+\*/g, '').trim();

  return text.replace(/^["'\s]+|["'\s]+$/g, '');
};
