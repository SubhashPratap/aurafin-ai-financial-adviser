require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Prevent server crashes from unhandled promise rejections/uncaught exceptions
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception caught:", error);
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve all static UI assets directly from the root workspace
app.use(express.static(path.join(__dirname)));
app.use("/js", express.static(path.join(__dirname, "js")));

// Safe initialization of Google Generative AI client
const getGeminiClient = (userApiKey) => {
  const apiKey = (userApiKey && userApiKey.trim()) || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
};

// Temporary test API endpoint
app.post("/api/test", (req, res) => {
  res.json({ message: "POST OK", received: req.body });
});

// API Endpoint to process financial adviser prompts on the server side
app.post("/api/chat", async (req, res) => {
  const { userPrompt, state, userApiKey, chatHistory } = req.body;

  if (!userPrompt) {
    return res.status(400).json({ error: "User prompt is required." });
  }

  const client = getGeminiClient(userApiKey);
  if (!client) {
    return res.status(400).json({ 
      error: "API key is missing. Please set GEMINI_API_KEY environment variable or enter your key in the UI settings." 
    });
  }

  try {
    const candidateModels = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-1.5-flash"];
    let result = null;
    let lastError = null;

    const targetLanguage = (state && state.language) || "English";
    const targetCurrency = (state && state.currency) || "₹";
    const income = (state && state.income) || 80000;
    const needs = (state && state.needs) || 40000;
    const wants = (state && state.wants) || 16000;
    const savings = (state && state.savings) || 24000;
    const totalExpenses = needs + wants;
    const netSavings = income - totalExpenses;
    const savingsRate = income > 0 ? Math.round((netSavings / income) * 100) : 0;

    const systemInstruction = `You are AuraFin, a certified personal wealth adviser. Provide precise, personalized, non-random financial guidance based on the user's real financial profile.

Rules:
1. Reply strictly in the ${targetLanguage} language.
2. Use ${targetCurrency} currency formatting for all monetary amounts (e.g., ${targetCurrency} ${Number(income).toLocaleString()}).
3. Incorporate the user's actual Live Financial Context:
   - Monthly Income: ${targetCurrency} ${Number(income).toLocaleString()}
   - Essential Needs & Bills: ${targetCurrency} ${Number(needs).toLocaleString()}
   - Discretionary Wants: ${targetCurrency} ${Number(wants).toLocaleString()}
   - Net Monthly Savings: ${targetCurrency} ${Number(netSavings).toLocaleString()} (${savingsRate}% savings rate)
4. Response Format:
   - **Executive Summary**: 1 clear, direct answer sentence.
   - **Personalized Breakdown**: Show exact calculations using the user's figures.
   - **Action Plan**: 3 concrete, step-by-step actions with bold numbers.
5. Tone: Professional, structured, encouraging, and clear. Avoid vague fluff, repetitive disclaimers, or generic responses.`;

    const contents = [
      { role: "user", parts: [{ text: systemInstruction }] },
      { role: "model", parts: [{ text: `Understood. I am AuraFin financial adviser. I will strictly follow your language (${targetLanguage}), currency (${targetCurrency}), structured response format, and live profile data.` }] }
    ];

    if (Array.isArray(chatHistory) && chatHistory.length > 0) {
      const recentHistory = chatHistory.slice(-6);
      recentHistory.forEach(msg => {
        if (msg.sender === 'user') {
          contents.push({ role: "user", parts: [{ text: msg.text }] });
        } else if (msg.sender === 'bot') {
          contents.push({ role: "model", parts: [{ text: msg.text }] });
        }
      });
    }

    if (contents[contents.length - 1].parts[0].text !== userPrompt) {
      contents.push({ role: "user", parts: [{ text: userPrompt }] });
    }

    for (const m of candidateModels) {
      try {
        const model = client.getGenerativeModel({
          model: m,
          generationConfig: {
            temperature: 0.2, // Low temperature for deterministic, consistent answers
            topP: 0.8,
            maxOutputTokens: 2000
          }
        });

        result = await model.generateContent({ contents });
        
        if (result && result.response) {
          break;
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    if (!result || !result.response) {
      throw new Error(lastError || "All candidate models returned empty responses.");
    }

    const responseText = result.response.text();
    if (responseText) {
      res.json({ text: responseText });
    } else {
      res.status(500).json({ error: "No response received from the Gemini model." });
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json({ error: error.message || "Failed to query the Gemini API." });
  }
});

// Fallback to serve index.html for SPA routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
