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
  const { userPrompt, state, userApiKey } = req.body;

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
    const savings = (state && state.savings) || 24000;

    const systemInstruction = `You are AuraFin, a friendly financial adviser. Explain everything simply in plain everyday language without complex financial jargon.
Always reply strictly in the ${targetLanguage} language.
Use the ${targetCurrency} currency format for all amounts.

User Financial Profile:
- Monthly Income: ${targetCurrency} ${Number(income).toLocaleString()}
- Essential Needs: ${targetCurrency} ${Number(needs).toLocaleString()}
- Monthly Savings: ${targetCurrency} ${Number(savings).toLocaleString()}

Provide direct, practical advice in 2-3 simple steps. Use bullet points and bold numbers for key amounts. If the question is not about personal finance, politely state in ${targetLanguage} that you can only answer financial questions.`;

    for (const m of candidateModels) {
      try {
        const model = client.getGenerativeModel({
          model: m,
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1000
          }
        });

        result = await model.generateContent({
          contents: [
            { role: "user", parts: [{ text: systemInstruction }] },
            { role: "model", parts: [{ text: "Understood. I will act as AuraFin financial adviser." }] },
            { role: "user", parts: [{ text: userPrompt }] }
          ]
        });
        
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
