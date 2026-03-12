const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config({ path: "../.env" });

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  console.log("KEY loaded:", process.env.REACT_APP_ANTHROPIC_KEY ? "✅ Found" : "❌ MISSING");
  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: req.body.system },
          ...req.body.messages
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
    res.json(response.data);
  } catch (error) {
    console.error("❌ API Error:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

app.listen(5000, () => console.log("✅ Backend running on http://localhost:5000"));