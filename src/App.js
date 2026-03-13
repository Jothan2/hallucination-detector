import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `You are a hallucination detection analyst. When given a prompt, you must:
1. Answer the prompt AS an AI chatbot would (give the actual response)
2. Then analyze your own response for hallucinations

Respond ONLY in this exact JSON format with no extra text, no markdown, no backticks:
{
  "chatbot_response": "the actual answer to the prompt",
  "claims": [
    {
      "claim": "specific factual claim extracted",
      "verdict": "TRUE",
      "confidence": 85,
      "explanation": "brief reason",
      "risk_tier": "LOW"
    }
  ],
  "hallucination_rate": 10,
  "reliability_score": 90,
  "overall_risk": "LOW",
  "summary": "one sentence summary of findings"
}

verdict must be one of: TRUE, FALSE, HALLUCINATION, UNVERIFIABLE
risk_tier must be one of: CRITICAL, HIGH, MEDIUM, LOW
overall_risk must be one of: CRITICAL, HIGH, MEDIUM, LOW
Return only raw JSON, nothing else.`;

const riskConfig = {
  CRITICAL: { bg: "#fff0f0", border: "#ffcccc", color: "#cc0000", emoji: "🔴", label: "CRITICAL" },
  HIGH:     { bg: "#fff8f0", border: "#ffe0cc", color: "#cc5500", emoji: "🟠", label: "HIGH" },
  MEDIUM:   { bg: "#fffdf0", border: "#fff0aa", color: "#996600", emoji: "🟡", label: "MEDIUM" },
  LOW:      { bg: "#f0fff4", border: "#bbf0cc", color: "#116633", emoji: "🟢", label: "LOW" },
};

const verdictConfig = {
  TRUE:          { color: "#22aa55", bg: "#f0fff4", border: "#bbf0cc" },
  FALSE:         { color: "#ff4444", bg: "#fff0f0", border: "#ffcccc" },
  HALLUCINATION: { color: "#ff4444", bg: "#fff0f0", border: "#ffcccc" },
  UNVERIFIABLE:  { color: "#ddaa00", bg: "#fffdf0", border: "#fff0aa" },
};

const providerConfig = {
  "Meta":    { bg: "#eef3ff", border: "#c0ccf0", color: "#3451b2" },
  "Groq":    { bg: "#eef8ff", border: "#b0d8f0", color: "#0066aa" },
  "Alibaba": { bg: "#fff0ee", border: "#f0c0b0", color: "#c0390b" },
  "Mistral": { bg: "#fff8ee", border: "#f0d8a0", color: "#a06010" },
  "Google":  { bg: "#eefdf4", border: "#a8dfc0", color: "#1a6b3c" },
};

const suggestions = [
  { label: "Fake person",   prompt: "Tell me about Dr. Rajesh Nambiar's research on neural memory compression at IIT Madras" },
  { label: "Fake event",    prompt: "What happened at the 2019 Thrissur International AI Conference?" },
  { label: "Dead speaker",  prompt: "What did Einstein say in his 1962 TED talk?" },
  { label: "Wrong year",    prompt: "Who won the FIFA World Cup in 1987?" },
];

function ClaimCard({ claim, i }) {
  const v = verdictConfig[claim.verdict] || verdictConfig.UNVERIFIABLE;
  return (
    <div style={{
      background: "#fafafa", border: `1px solid #eee`,
      borderRadius: 8, padding: "12px 14px", marginBottom: 8,
      borderLeft: `3px solid ${v.color}`,
      animation: `fadeUp 0.3s ease ${i * 0.06}s both`
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: 13, color: "#333", lineHeight: 1.5, flex: 1 }}>
          "{claim.claim}"
        </p>
        <span style={{
          background: v.bg, color: v.color, border: `1px solid ${v.border}`,
          borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap"
        }}>{claim.verdict}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ flex: 1, background: "#eee", borderRadius: 99, height: 5 }}>
          <div style={{ width: `${claim.confidence}%`, height: "100%", background: v.color, borderRadius: 99, transition: "width 0.8s ease" }} />
        </div>
        <span style={{ fontSize: 11, color: "#999", minWidth: 60 }}>{claim.confidence}% sure</span>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: "#888", lineHeight: 1.4 }}>{claim.explanation}</p>
    </div>
  );
}

function ModelCard({ model, result, error }) {
  const pc = providerConfig[model.provider] || providerConfig["Meta"];
  const r = riskConfig[result?.overall_risk] || riskConfig.LOW;

  if (error || !result) {
    return (
      <div style={{
        flex: 1, minWidth: 260, background: "#fff",
        border: "1px solid #e8e8e8", borderRadius: 12,
        boxShadow: "0 2px 8px #0000000a", overflow: "hidden"
      }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{model.provider}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#222" }}>{model.name}</span>
        </div>
        <div style={{ padding: 16, color: "#ff4444", fontSize: 13 }}>⚠️ Model unavailable</div>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1, minWidth: 260, background: "#fff",
      border: "1px solid #e8e8e8", borderRadius: 12,
      boxShadow: "0 2px 8px #0000000a", overflow: "hidden",
      animation: "fadeUp 0.4s ease both"
    }}>
      {/* Card header */}
      <div style={{
        padding: "14px 16px", borderBottom: "1px solid #f0f0f0",
        display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{model.provider}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#222" }}>{model.name}</span>
        </div>
        <span style={{ background: r.bg, color: r.color, border: `1px solid ${r.border}`, borderRadius: 4, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
          {r.emoji} {r.label}
        </span>
      </div>

      <div style={{ padding: 16 }}>
        {/* AI Response */}
        <div style={{ background: "#f8f9ff", border: "1px solid #e8ecff", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#4f8ef7", marginBottom: 4, letterSpacing: 1 }}>AI RESPONSE</div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: "#444" }}>{result.chatbot_response}</p>
        </div>

        {/* Scores */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Reliable",     value: result.reliability_score,   color: "#22aa55", bg: "#f0fff4" },
            { label: "Hallucinated", value: result.hallucination_rate,  color: "#ff4444", bg: "#fff0f0" },
            { label: "Accurate",     value: Math.round((result.claims?.filter(c => c.verdict === "TRUE").length / (result.claims?.length || 1)) * 100), color: "#4f8ef7", bg: "#f0f4ff" },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, background: s.bg, borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}%</div>
              <div style={{ fontSize: 10, color: "#888", marginTop: 3 }}>{s.label}</div>
              <div style={{ marginTop: 6, background: "#e8e8e8", borderRadius: 99, height: 4 }}>
                <div style={{ width: `${s.value}%`, height: "100%", background: s.color, borderRadius: 99, transition: "width 1s ease" }} />
              </div>
            </div>
          ))}
        </div>

        {/* Claims */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", marginBottom: 8, letterSpacing: 1 }}>
          {result.claims?.length} CLAIMS FOUND
        </div>
        {result.claims?.map((c, i) => <ClaimCard key={i} claim={c} i={i} />)}

        {/* Summary */}
        <div style={{ background: "#f8f8f8", borderRadius: 8, padding: "10px 14px", marginTop: 8, borderLeft: "3px solid #ddd", fontSize: 12, color: "#666", lineHeight: 1.6 }}>
          📝 {result.summary}
        </div>
      </div>
    </div>
  );
}

function ComparisonBanner({ responses }) {
  const valid = responses.filter(r => r.result);
  if (valid.length === 0) return null;
  const best  = valid.reduce((a, b) => a.result.reliability_score  > b.result.reliability_score  ? a : b);
  const worst = valid.reduce((a, b) => a.result.hallucination_rate > b.result.hallucination_rate ? a : b);
  return (
    <div style={{
      background: "#f0f4ff", border: "1px solid #dde4ff", borderRadius: 10,
      padding: "12px 16px", marginBottom: 16,
      display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap"
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#4f8ef7", letterSpacing: 1 }}>COMPARISON</span>
      <span style={{ fontSize: 13, color: "#333" }}>
        ✅ Most Reliable: <strong style={{ color: "#22aa55" }}>{best.model.name}</strong>
        <span style={{ color: "#999" }}> ({best.result.reliability_score}%)</span>
      </span>
      <span style={{ fontSize: 13, color: "#333" }}>
        ⚠️ Most Hallucinations: <strong style={{ color: "#ff4444" }}>{worst.model.name}</strong>
        <span style={{ color: "#999" }}> ({worst.result.hallucination_rate}%)</span>
      </span>
      <span style={{ fontSize: 12, color: "#999", marginLeft: "auto" }}>
        {valid.length} of {responses.length} models responded
      </span>
    </div>
  );
}

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  async function analyze() {
    if (!prompt.trim() || loading) return;
    const userPrompt = prompt.trim();
    setPrompt("");
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }]
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "API call failed");
      setHistory(h => [...h, { prompt: userPrompt, responses: data.responses }]);
    } catch (e) {
      setError(`Analysis failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fa", fontFamily: "'Segoe UI', sans-serif", color: "#333" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
        @keyframes spin { to { transform: rotate(360deg) } }
        textarea:focus { outline: none; border-color: #4f8ef7 !important; box-shadow: 0 0 0 3px #4f8ef722; }
        textarea { resize: none; }
        * { box-sizing: border-box; }
      `}</style>

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8e8e8", padding: "16px 32px", boxShadow: "0 1px 4px #0000000a" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>🔍</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#222" }}>Hallucination Detector</div>
            <div style={{ fontSize: 12, color: "#999" }}>Comparing LLaMA 3.3 · LLaMA 3.1 · Compound Beta — Powered by Groq</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>

        {/* Input box */}
        <div style={{
          background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14,
          padding: "20px", marginBottom: 24, boxShadow: "0 2px 8px #0000000a"
        }}>
          <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#aaa", display: "block", marginBottom: 10 }}>
            SUBMIT PROMPT FOR MULTI-MODEL ANALYSIS
          </label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); analyze(); } }}
            placeholder="Ask anything — all 3 models will analyze it at the same time..."
            rows={3}
            style={{
              width: "100%", background: "#f8f9fa", border: "2px solid #e8e8e8",
              borderRadius: 10, padding: "12px 14px", color: "#333",
              fontSize: 14, lineHeight: 1.6, fontFamily: "inherit",
              transition: "all 0.2s", marginBottom: 12
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => setPrompt(s.prompt)} style={{
                  background: "#f0f4ff", border: "1px solid #dde4ff",
                  borderRadius: 6, padding: "5px 12px", fontSize: 12,
                  color: "#4f8ef7", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s"
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "#dde4ff"}
                  onMouseLeave={e => e.currentTarget.style.background = "#f0f4ff"}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button onClick={analyze} disabled={loading || !prompt.trim()} style={{
              background: loading || !prompt.trim() ? "#e8e8e8" : "#4f8ef7",
              color: loading || !prompt.trim() ? "#aaa" : "#fff",
              border: "none", borderRadius: 10, padding: "12px 28px",
              fontSize: 14, fontWeight: 700,
              cursor: loading || !prompt.trim() ? "not-allowed" : "pointer",
              fontFamily: "inherit", transition: "all 0.2s"
            }}>
              {loading ? "Analyzing..." : "Analyze All Models →"}
            </button>
          </div>
        </div>

        {/* Empty state */}
        {history.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#aaa" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
            <p style={{ fontSize: 16, color: "#888", marginBottom: 8 }}>Test AI hallucinations across 3 models simultaneously</p>
            <p style={{ fontSize: 13 }}>Results will appear side by side for easy comparison</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
              {[
                { name: "LLaMA 3.3 70B",  provider: "Meta",  pc: providerConfig["Meta"] },
                { name: "LLaMA 3.1 8B",   provider: "Meta",  pc: providerConfig["Meta"] },
                { name: "Compound Beta",   provider: "Groq",  pc: providerConfig["Groq"] },
              ].map((m, i) => (
                <div key={i} style={{
                  background: m.pc.bg, border: `1px solid ${m.pc.border}`,
                  borderRadius: 10, padding: "10px 20px", textAlign: "center"
                }}>
                  <div style={{ fontSize: 11, color: m.pc.color, fontWeight: 700 }}>{m.provider}</div>
                  <div style={{ fontSize: 13, color: "#333", fontWeight: 600, marginTop: 2 }}>{m.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {history.map((item, idx) => (
          <div key={idx} style={{ marginBottom: 28, animation: "fadeUp 0.4s ease both" }}>
            {/* Query bubble */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <div style={{
                background: "#4f8ef7", color: "#fff",
                borderRadius: "18px 18px 4px 18px",
                padding: "10px 18px", maxWidth: "70%", fontSize: 14, lineHeight: 1.5
              }}>{item.prompt}</div>
            </div>

            <ComparisonBanner responses={item.responses} />

            {/* Model cards */}
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
              {item.responses.map((r, i) => (
                <ModelCard key={i} model={r.model} result={r.result} error={r.error} />
              ))}
            </div>
          </div>
        ))}

        {/* Loading */}
        {loading && (
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            background: "#fff", borderRadius: 12, padding: "16px 20px",
            border: "1px solid #e8e8e8", marginBottom: 16
          }}>
            <div style={{
              width: 20, height: 20, border: "3px solid #e0e0e0", borderTopColor: "#4f8ef7",
              borderRadius: "50%", animation: "spin 0.8s linear infinite"
            }} />
            <span style={{ fontSize: 14, color: "#888" }}>Querying all 3 models simultaneously...</span>
          </div>
        )}

        {error && (
          <div style={{
            background: "#fff0f0", border: "1px solid #ffcccc",
            borderRadius: 10, padding: "12px 16px", color: "#cc0000", fontSize: 14, marginBottom: 16
          }}>⚠️ {error}</div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #e8e8e8", background: "#fff", padding: "14px", textAlign: "center", marginTop: 20 }}>
        <p style={{ margin: 0, fontSize: 12, color: "#bbb" }}>
          Hallucination Detector · LLaMA 3.3 vs LLaMA 3.1 vs Compound Beta · Powered by Groq
        </p>
      </div>
    </div>
  );
}