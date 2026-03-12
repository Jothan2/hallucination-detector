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
  CRITICAL: { bg: "#fff0f0", border: "#ffcccc", badge: "#ff4444", text: "#cc0000", emoji: "🔴" },
  HIGH:     { bg: "#fff8f0", border: "#ffe0cc", badge: "#ff8800", text: "#cc5500", emoji: "🟠" },
  MEDIUM:   { bg: "#fffdf0", border: "#fff0aa", badge: "#ddaa00", text: "#996600", emoji: "🟡" },
  LOW:      { bg: "#f0fff4", border: "#bbf0cc", badge: "#22aa55", text: "#116633", emoji: "🟢" },
};

const verdictConfig = {
  TRUE:          { bg: "#f0fff4", border: "#bbf0cc", color: "#22aa55" },
  FALSE:         { bg: "#fff0f0", border: "#ffcccc", color: "#ff4444" },
  HALLUCINATION: { bg: "#fff0f0", border: "#ffcccc", color: "#ff4444" },
  UNVERIFIABLE:  { bg: "#fffdf0", border: "#fff0aa", color: "#ddaa00" },
};

function ScoreCard({ value, label, color, bg }) {
  return (
    <div style={{
      background: bg, borderRadius: 12, padding: "16px 24px",
      textAlign: "center", flex: 1, border: `2px solid ${color}33`
    }}>
      <div style={{ fontSize: 32, fontWeight: 800, color, fontFamily: "sans-serif" }}>{value}%</div>
      <div style={{ fontSize: 12, color: "#888", marginTop: 4, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function ClaimCard({ claim, i }) {
  const v = verdictConfig[claim.verdict] || verdictConfig.UNVERIFIABLE;
  const r = riskConfig[claim.risk_tier] || riskConfig.LOW;
  return (
    <div style={{
      background: "#fff", border: `1px solid #e8e8e8`, borderRadius: 10,
      padding: "14px 16px", marginBottom: 10,
      borderLeft: `4px solid ${v.color}`,
      animation: `fadeUp 0.3s ease ${i * 0.07}s both`
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <span style={{ color: "#333", fontSize: 14, lineHeight: 1.5, flex: 1, paddingRight: 12, fontWeight: 500 }}>
          "{claim.claim}"
        </span>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <span style={{
            background: v.bg, color: v.color, border: `1px solid ${v.border}`,
            borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700
          }}>{claim.verdict}</span>
          <span style={{
            background: r.bg, color: r.text, border: `1px solid ${r.border}`,
            borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700
          }}>{r.emoji} {claim.risk_tier}</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{ flex: 1, background: "#f0f0f0", borderRadius: 99, height: 6 }}>
          <div style={{
            width: `${claim.confidence}%`, background: v.color,
            borderRadius: 99, height: "100%", transition: "width 0.8s ease"
          }} />
        </div>
        <span style={{ color: "#999", fontSize: 12, minWidth: 90 }}>{claim.confidence}% confident</span>
      </div>
      <p style={{ color: "#777", fontSize: 12, margin: 0, lineHeight: 1.5 }}>{claim.explanation}</p>
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
      const raw = data.choices?.[0]?.message?.content || "";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setHistory(h => [...h, { prompt: userPrompt, result: parsed }]);
    } catch (e) {
      setError(`Analysis failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#f5f7fa",
      fontFamily: "'Segoe UI', sans-serif", color: "#333"
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
        @keyframes spin { to { transform: rotate(360deg) } }
        textarea:focus { outline: none; border-color: #4f8ef7 !important; box-shadow: 0 0 0 3px #4f8ef722; }
        textarea { resize: none; }
        * { box-sizing: border-box; }
      `}</style>

      {/* Header */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #e8e8e8",
        padding: "16px 32px", display: "flex", alignItems: "center", gap: 12,
        boxShadow: "0 1px 4px #0000000a"
      }}>
        <span style={{ fontSize: 24 }}>🔍</span>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#222" }}>Hallucination Detector</div>
          <div style={{ fontSize: 12, color: "#999" }}>Powered by Groq · LLaMA 3.3 70B</div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>

        {/* Empty state */}
        {history.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
            <h2 style={{ color: "#333", marginBottom: 8 }}>Test AI for Hallucinations</h2>
            <p style={{ color: "#888", marginBottom: 24 }}>Type any prompt below — the AI will answer and analyze its own response for false claims.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
              <p style={{ color: "#aaa", fontSize: 13, margin: 0 }}>Try these examples:</p>
              {[
                "Tell me about Dr. Rajesh Nambiar's research on neural memory compression at IIT Madras",
                "What happened at the 2019 Thrissur International AI Conference?",
                "What did Einstein say in his 1962 TED talk?",
                "Who won the FIFA World Cup in 1987?"
              ].map((s, i) => (
                <div key={i} onClick={() => setPrompt(s)} style={{
                  background: "#fff", border: "1px solid #e0e0e0", borderRadius: 8,
                  padding: "10px 18px", fontSize: 13, color: "#555", cursor: "pointer",
                  transition: "all 0.2s", maxWidth: 500, width: "100%", textAlign: "left"
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#4f8ef7"; e.currentTarget.style.color = "#4f8ef7"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e0e0e0"; e.currentTarget.style.color = "#555"; }}
                >
                  💬 {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        {history.map((item, idx) => {
          const r = riskConfig[item.result.overall_risk] || riskConfig.LOW;
          return (
            <div key={idx} style={{ marginBottom: 24, animation: "fadeUp 0.4s ease both" }}>

              {/* User bubble */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <div style={{
                  background: "#4f8ef7", color: "#fff", borderRadius: "18px 18px 4px 18px",
                  padding: "10px 16px", maxWidth: "75%", fontSize: 14, lineHeight: 1.5
                }}>{item.prompt}</div>
              </div>

              {/* Result card */}
              <div style={{
                background: "#fff", border: `1px solid ${r.border}`,
                borderRadius: 16, overflow: "hidden",
                boxShadow: "0 2px 12px #0000000a"
              }}>
                {/* Risk banner */}
                <div style={{
                  background: r.bg, borderBottom: `1px solid ${r.border}`,
                  padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between"
                }}>
                  <span style={{ fontWeight: 700, color: r.text, fontSize: 14 }}>
                    {r.emoji} Overall Risk: {item.result.overall_risk}
                  </span>
                  <span style={{ fontSize: 12, color: "#999" }}>
                    {item.result.claims?.length || 0} claims analyzed
                  </span>
                </div>

                <div style={{ padding: 20 }}>
                  {/* AI Response */}
                  <div style={{
                    background: "#f8f9ff", border: "1px solid #e8ecff",
                    borderRadius: 10, padding: "12px 16px", marginBottom: 20
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#4f8ef7", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>AI Response</div>
                    <p style={{ fontSize: 14, lineHeight: 1.7, color: "#444", margin: 0 }}>{item.result.chatbot_response}</p>
                  </div>

                  {/* Score cards */}
                  <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                    <ScoreCard value={item.result.reliability_score} label="Reliability" color="#22aa55" bg="#f0fff4" />
                    <ScoreCard value={item.result.hallucination_rate} label="Hallucination Rate" color="#ff4444" bg="#fff0f0" />
                    <ScoreCard
                      value={Math.round((item.result.claims?.filter(c => c.verdict === "TRUE").length / (item.result.claims?.length || 1)) * 100)}
                      label="Accuracy" color="#4f8ef7" bg="#f0f4ff"
                    />
                  </div>

                  {/* Claims */}
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#999", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
                    Claim Breakdown
                  </div>
                  {item.result.claims?.map((c, i) => <ClaimCard key={i} claim={c} i={i} />)}

                  {/* Summary */}
                  <div style={{
                    background: "#f8f8f8", borderRadius: 8, padding: "12px 16px", marginTop: 8,
                    fontSize: 13, color: "#666", lineHeight: 1.6, borderLeft: "3px solid #ddd"
                  }}>
                    📝 {item.result.summary}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

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
            <span style={{ fontSize: 14, color: "#888" }}>Analyzing claims...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: "#fff0f0", border: "1px solid #ffcccc", borderRadius: 10,
            padding: "12px 16px", color: "#cc0000", fontSize: 14, marginBottom: 16
          }}>⚠️ {error}</div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{
        position: "sticky", bottom: 0, background: "#fff",
        borderTop: "1px solid #e8e8e8", padding: "16px 24px",
        boxShadow: "0 -2px 12px #0000000a"
      }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", gap: 12, alignItems: "flex-end" }}>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); analyze(); } }}
            placeholder="Type a prompt to test for hallucinations... (Enter to send)"
            rows={2}
            style={{
              flex: 1, background: "#f8f9fa", border: "2px solid #e8e8e8",
              borderRadius: 12, padding: "12px 16px", color: "#333",
              fontSize: 14, lineHeight: 1.5, fontFamily: "inherit",
              transition: "all 0.2s"
            }}
          />
          <button
            onClick={analyze}
            disabled={loading || !prompt.trim()}
            style={{
              background: loading || !prompt.trim() ? "#e8e8e8" : "#4f8ef7",
              color: loading || !prompt.trim() ? "#aaa" : "#fff",
              border: "none", borderRadius: 12, padding: "14px 24px",
              fontSize: 14, fontWeight: 700,
              cursor: loading || !prompt.trim() ? "not-allowed" : "pointer",
              fontFamily: "inherit", transition: "all 0.2s",
              height: 56
            }}
          >
            {loading ? "..." : "Analyze →"}
          </button>
        </div>
        <p style={{ fontSize: 11, color: "#bbb", margin: "8px auto 0", maxWidth: 800, textAlign: "center" }}>
          Shift+Enter for new line · Try fake people, impossible dates, or fabricated events
        </p>
      </div>
    </div>
  );
}