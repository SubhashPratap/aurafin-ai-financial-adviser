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
  const sysText = `You are AuraFin, a friendly financial adviser. Reply in ${targetLanguage}. Use ${targetCurrency}. User: ${contextLine} Give 2-3 bullet points of simple, direct, practical advice. No jargon. No explanations about your role.`;

  const candidateModels = window.state.activeModelPath
    ? [window.state.activeModelPath, 'models/gemini-1.5-flash-latest', 'models/gemini-2.0-flash', 'models/gemma-4-26b-a4b-it', 'models/gemini-pro']
    : ['models/gemini-1.5-flash-latest', 'models/gemini-2.0-flash', 'models/gemma-4-26b-a4b-it', 'models/gemini-pro'];

  let lastError = null;

  for (const modelPath of candidateModels) {
    try {
      const cleanPath = modelPath.startsWith('models/') ? modelPath : `models/${modelPath}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/${cleanPath}:generateContent?key=${cleanKey}`;

      const isGemma = cleanPath.includes('gemma');
      // Gemma models don't support systemInstruction — use few-shot turn injection
      const payload = isGemma ? {
        contents: [
          { role: "model", parts: [{ text: `Hi! I'm AuraFin, your simple financial adviser. I'll answer in ${targetLanguage} with ${targetCurrency}. Your monthly profile: ${contextLine}` }] },
          { role: "user", parts: [{ text: userPrompt }] }
        ],
        generationConfig: { temperature: 0.5, maxOutputTokens: 400 }
      } : {
        systemInstruction: { parts: [{ text: sysText }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 400 }
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

// Thinking-header keywords Gemma always puts in planning lines
const THINKING_KEYWORDS = /^\s*\*+\s*(Topic|Role|Goal|Constraint\s*\d*|User\s*(Question|Goal|Context|asks|wants|is)?|Persona|Target\s*(Audience)?|Amount|Style|Tone|Format|Phase\s*\d*|Step\s*0|Draft\s*\d*|Check|Note\b|Context\b|Question\b|Audience|Mechanism|Definition|Concept|Who\s|What\s|Likely\s|Provide\s|Explain\s|Build\s|Practical|Core\s*Question)\s*[:\.\*]/i;

window.sanitizeAiOutput = function(rawText) {
  if (!rawText) return '';

  // Split into paragraphs on blank lines
  const paragraphs = rawText.trim().split(/\n[ \t]*\n/);

  const isThinkingParagraph = (para) => {
    const lines = para.split('\n').filter(l => l.trim().length > 0);
    if (!lines.length) return true;
    const thinkingLines = lines.filter(l => THINKING_KEYWORDS.test(l));
    // If 50%+ of lines are thinking lines, whole paragraph is junk
    return thinkingLines.length / lines.length >= 0.5;
  };

  // Collect answer paragraphs (skip all leading thinking-header blocks)
  const answerParagraphs = [];
  let foundFirst = false;
  for (const para of paragraphs) {
    if (!foundFirst && isThinkingParagraph(para)) continue;
    foundFirst = true;
    // Remove any stray Draft/Check lines inside answer paragraphs
    const cleaned = para
      .split('\n')
      .filter(l => !/^\s*\*+\s*\*?(Draft\s*\d*|Check\s|Constraint\s*\d+:)/i.test(l))
      .join('\n')
      .trim();
    if (cleaned) answerParagraphs.push(cleaned);
  }

  // If we stripped everything, fall back to raw text with just italic-star metadata removed
  if (!answerParagraphs.length) {
    return rawText.replace(/\*[^*\n]+\*/g, '').replace(/\s{2,}/g, ' ').trim();
  }

  // Join and remove leading 4-space indentation from the extracted answer lines
  return answerParagraphs
    .join('\n\n')
    .replace(/^    \*/gm, '*')      // Remove 4-space indent from indented bullets
    .replace(/^\s{4}/gm, '')        // Remove any remaining 4-space indent
    .trim();
};
