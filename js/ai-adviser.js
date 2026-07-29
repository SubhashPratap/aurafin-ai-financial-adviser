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

  // Shared short system context
  const contextLine = `Income ${window.formatCurrency(window.state.income)}, Needs ${window.formatCurrency(window.state.needs)}, Savings ${window.formatCurrency(window.state.savings)}.`;
  const sysText = `You are AuraFin, a friendly financial adviser. Reply in ${targetLanguage}. Use ${targetCurrency}. User context: ${contextLine} Give 2-3 short bullet points of simple, direct, practical advice. No jargon. If the question is not about personal finance, politely state in ${targetLanguage} that you can only answer financial questions.`;

  // Discard any cached Gemma model paths to prevent locking onto Gemma
  if (window.state.activeModelPath && window.state.activeModelPath.includes('gemma')) {
    window.state.activeModelPath = null;
  }

  const candidateModels = window.state.activeModelPath
    ? [window.state.activeModelPath, 'models/gemini-flash-latest', 'models/gemini-2.0-flash-lite', 'models/gemini-2.0-flash', 'models/gemini-flash-lite-latest']
    : ['models/gemini-flash-latest', 'models/gemini-2.0-flash-lite', 'models/gemini-2.0-flash', 'models/gemini-flash-lite-latest'];


  let lastError = null;

  for (const modelPath of candidateModels) {
    try {
      const cleanPath = modelPath.startsWith('models/') ? modelPath : `models/${modelPath}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/${cleanPath}:generateContent?key=${cleanKey}`;

      const payload = {
        systemInstruction: { parts: [{ text: sysText }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 600 }
      };

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

// A "thinking line" is a bullet where a plain (non-bold) Title-Case label is followed by colon.
// e.g. "*   Role: Adviser", "*   User's context: ...", "*   Task: ..."
// Answer lines start with bold labels: "*   *Snowball:* Focus..." — the extra * means skip them.
const THINKING_KEYWORDS = /^\s*\*+\s*(?!\*)([A-Z][A-Za-z0-9'\s]{0,35}):\s/;


window.sanitizeAiOutput = function(rawText) {
  if (!rawText) return '';

  // Split into paragraphs on blank lines
  const paragraphs = rawText.trim().split(/\n[ \t]*\n/);

  const isThinkingParagraph = (para) => {
    const lines = para.split('\n').filter(l => l.trim().length > 0);
    if (!lines.length) return true;
    const thinkingLines = lines.filter(l => THINKING_KEYWORDS.test(l));
    return thinkingLines.length / lines.length >= 0.5;
  };

  // Check if response starts with a Gemma-like thinking header block
  const startsWithThinking = paragraphs.length > 0 && isThinkingParagraph(paragraphs[0]);

  const cleanedParagraphs = [];
  for (const para of paragraphs) {
    // If Gemma starts with thinking, we skip thinking paragraphs. 
    // If it's a standard Gemini response, we don't skip anything!
    if (startsWithThinking && isThinkingParagraph(para)) {
      continue;
    }

    // Remove stray Draft/Check lines
    const cleaned = para
      .split('\n')
      .filter(l => !/^\s*\*+\s*\*?(Draft|Bullet\s*\d|Check\s)/i.test(l))
      .join('\n')
      .replace(/^    \*/gm, '*')   // Remove 4-space indent
      .replace(/^\s{4}/gm, '')
      .trim();

    if (cleaned) {
      cleanedParagraphs.push(cleaned);
      // For Gemma, we only want the first clean answer block (the rest are drafts)
      if (startsWithThinking) {
        break;
      }
    }
  }

  if (cleanedParagraphs.length) {
    return cleanedParagraphs.join('\n\n');
  }

  // Fallback: strip italic-style metadata markers and return raw
  return rawText.replace(/\*[^*\n]+\*/g, '').replace(/\s{2,}/g, ' ').trim();
};
