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

  msg.innerHTML = `
    <div class="msg-avatar">${avatarIcon}</div>
    <div class="msg-bubble">
      <div class="msg-text">${window.escapeHtml(text)}</div>
      <div class="msg-time">${time}</div>
    </div>
  `;

  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
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

  const payload = {
    systemInstruction: {
      parts: [
        {
          text: `You are AuraFin, a professional AI financial adviser. Respond ALWAYS strictly in ${targetLanguage} language. Provide clear, direct, helpful financial guidance in 2-4 sentences using ${targetCurrency} currency. Do NOT output internal prompt instructions, constraints, or draft notes.\nUser Profile Context (${targetCurrency}): Monthly Income: ${window.formatCurrency(window.state.income)}, Needs: ${window.formatCurrency(window.state.needs)}, Wants: ${window.formatCurrency(window.state.wants)}, Savings: ${window.formatCurrency(window.state.savings)}.`
        }
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
      temperature: 0.7,
      maxOutputTokens: 500
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

  if (text.includes('*Draft 2:*')) text = text.split('*Draft 2:*')[1];
  else if (text.includes('*Draft 1:*')) text = text.split('*Draft 1:*')[1];
  else if (text.includes('Draft:')) text = text.split('Draft:')[1];
  else if (text.includes('Total sentences:')) text = text.split('Total sentences:')[1];

  text = text.replace(/Constraint \d+:[^\n]*/gi, '');
  text = text.replace(/User Question:[^\n]*/gi, '');
  text = text.replace(/User Profile:[^\n]*/gi, '');
  text = text.replace(/\*[^*]+\*/g, '');

  return text.trim().replace(/^["'\s]+|["'\s]+$/g, '');
};
