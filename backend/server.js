const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config({ path: "../.env" });

const app = express();
app.use(cors());
app.use(express.json());

const MODELS = [
  { id: "llama-3.3-70b-versatile",  name: "LLaMA 3.3 70B",    provider: "Meta" },
  { id: "llama-3.1-8b-instant",     name: "LLaMA 3.1 8B",     provider: "Meta" },
  { id: "groq/compound-mini",       name: "Compound Mini",     provider: "Groq" },
];
async function queryModel(modelId, systemPrompt, userMessage) {
  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: modelId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userMessage  }
      ],
      max_tokens: 1000,
    },
    {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.REACT_APP_ANTHROPIC_KEY}`,
      },
    }
  );
  return response.data.choices?.[0]?.message?.content || "";
}

app.post("/api/chat", async (req, res) => {
  console.log("KEY loaded:", process.env.REACT_APP_ANTHROPIC_KEY ? "✅ Found" : "❌ MISSING");
  try {
    const { system, messages } = req.body;
    const userMessage = messages[messages.length - 1].content;

    // Query all models in parallel
    const results = await Promise.allSettled(
      MODELS.map(async (model) => {
        const raw = await queryModel(model.id, system, userMessage);
        const clean = raw.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        return { model, result: parsed };
      })
    );

    const responses = results.map((r, i) => ({
      model: MODELS[i],
      result: r.status === "fulfilled" ? r.value.result : null,
      error: r.status === "rejected" ? r.reason?.message : null,
    }));

    res.json({ responses });
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

app.listen(5000, () => console.log("✅ Backend running on http://localhost:5000"));