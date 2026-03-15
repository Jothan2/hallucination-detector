import { useState } from "react";

const SYSTEM_PROMPT = `You are a hallucination detection analyst. When given a prompt, you must:
1. Answer the prompt AS an AI chatbot would (give the actual response)
2. Then analyze your own response for hallucinations
3. Check if the response contradicts itself internally

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
  "contradictions": [
    {
      "claim_a": "first conflicting statement",
      "claim_b": "second conflicting statement",
      "explanation": "why these contradict each other"
    }
  ],
  "consistency_score": 95,
  "consistency_verdict": "CONSISTENT",
  "hallucination_rate": 10,
  "reliability_score": 90,
  "overall_risk": "LOW",
  "summary": "one sentence summary of findings"
}

verdict must be one of: TRUE, FALSE, HALLUCINATION, UNVERIFIABLE
risk_tier must be one of: CRITICAL, HIGH, MEDIUM, LOW
overall_risk must be one of: CRITICAL, HIGH, MEDIUM, LOW
consistency_verdict must be one of: CONSISTENT, MINOR_CONTRADICTIONS, CONTRADICTORY
consistency_score is 0-100 where 100 means perfectly consistent
contradictions array should be empty [] if there are none
Return only raw JSON, nothing else.`;

const riskConfig = {
  CRITICAL: { bg: "#fff0f0", border: "#ffcccc", color: "#cc0000", label: "CRITICAL" },
  HIGH:     { bg: "#fff8f0", border: "#ffe0cc", color: "#cc5500", label: "HIGH" },
  MEDIUM:   { bg: "#fffdf0", border: "#fff0aa", color: "#996600", label: "MEDIUM" },
  LOW:      { bg: "#f0fff4", border: "#bbf0cc", color: "#116633", label: "LOW" },
};

const verdictConfig = {
  TRUE:          { color: "#22aa55", bg: "#f0fff4", border: "#bbf0cc" },
  FALSE:         { color: "#ff4444", bg: "#fff0f0", border: "#ffcccc" },
  HALLUCINATION: { color: "#ff4444", bg: "#fff0f0", border: "#ffcccc" },
  UNVERIFIABLE:  { color: "#ddaa00", bg: "#fffdf0", border: "#fff0aa" },
};

const consistencyConfig = {
  CONSISTENT:           { color: "#22aa55", bg: "#f0fff4", border: "#bbf0cc", label: "Consistent" },
  MINOR_CONTRADICTIONS: { color: "#cc5500", bg: "#fff8f0", border: "#ffe0cc", label: "Minor Issues" },
  CONTRADICTORY:        { color: "#cc0000", bg: "#fff0f0", border: "#ffcccc", label: "Contradictory" },
};

const providerConfig = {
  "Meta":     { bg: "#eef3ff", border: "#c0ccf0", color: "#3451b2" },
  "Groq":     { bg: "#eef8ff", border: "#b0d8f0", color: "#0066aa" },
  "Alibaba":  { bg: "#fff0ee", border: "#f0c0b0", color: "#c0390b" },
  "Mistral":  { bg: "#fff8ee", border: "#f0d8a0", color: "#a06010" },
  "Google":   { bg: "#eefdf4", border: "#a8dfc0", color: "#1a6b3c" },
  "DeepSeek": { bg: "#f0eeff", border: "#c8b8f0", color: "#5b21b6" },
};

const suggestions = [
  { label: "Fake person",  prompt: "Tell me about Dr. Rajesh Nambiar's research on neural memory compression at IIT Madras" },
  { label: "Fake event",   prompt: "What happened at the 2019 Thrissur International AI Conference?" },
  { label: "Dead speaker", prompt: "What did Einstein say in his 1962 TED talk?" },
  { label: "Wrong year",   prompt: "Who won the FIFA World Cup in 1987?" },
];

function avg(arr) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

function buildStats(history) {
  const modelMap = {};
  history.forEach(item => {
    item.responses.forEach(r => {
      if (!r.result) return;
      const key = r.model.name;
      if (!modelMap[key]) {
        modelMap[key] = {
          name: r.model.name, provider: r.model.provider,
          reliability: [], hallucination: [], consistency: [],
          risks: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
          verdicts: { TRUE: 0, FALSE: 0, HALLUCINATION: 0, UNVERIFIABLE: 0 },
          totalClaims: 0, totalContradictions: 0, prompts: 0,
        };
      }
      const m = modelMap[key];
      m.reliability.push(r.result.reliability_score);
      m.hallucination.push(r.result.hallucination_rate);
      m.consistency.push(r.result.consistency_score ?? 100);
      m.risks[r.result.overall_risk] = (m.risks[r.result.overall_risk] || 0) + 1;
      m.prompts++;
      r.result.claims?.forEach(c => {
        m.verdicts[c.verdict] = (m.verdicts[c.verdict] || 0) + 1;
        m.totalClaims++;
      });
      m.totalContradictions += r.result.contradictions?.length || 0;
    });
  });
  return Object.values(modelMap).map(m => ({
    ...m,
    avgReliability:   avg(m.reliability),
    avgHallucination: avg(m.hallucination),
    avgConsistency:   avg(m.consistency),
  })).sort((a, b) => b.avgReliability - a.avgReliability);
}

function ClaimCard({ claim, i }) {
  const v = verdictConfig[claim.verdict] || verdictConfig.UNVERIFIABLE;
  return (
    <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: 8, padding: "12px 14px", marginBottom: 8, borderLeft: `3px solid ${v.color}`, animation: `fadeUp 0.3s ease ${i * 0.06}s both` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: 13, color: "#333", lineHeight: 1.5, flex: 1 }}>"{claim.claim}"</p>
        <span style={{ background: v.bg, color: v.color, border: `1px solid ${v.border}`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{claim.verdict}</span>
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
  const [showContradictions, setShowContradictions] = useState(false);
  const pc = providerConfig[model.provider] || providerConfig["Meta"];
  const r  = riskConfig[result?.overall_risk] || riskConfig.LOW;
  const cs = consistencyConfig[result?.consistency_verdict] || consistencyConfig.CONSISTENT;

  if (error || !result) {
    return (
      <div style={{ flex: 1, minWidth: 260, background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, boxShadow: "0 2px 8px #0000000a", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{model.provider}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#222" }}>{model.name}</span>
        </div>
        <div style={{ padding: 16, color: "#ff4444", fontSize: 13 }}>Model unavailable</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minWidth: 260, background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, boxShadow: "0 2px 8px #0000000a", overflow: "hidden", animation: "fadeUp 0.4s ease both" }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{model.provider}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#222" }}>{model.name}</span>
        </div>
        <span style={{ background: r.bg, color: r.color, border: `1px solid ${r.border}`, borderRadius: 4, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{r.label}</span>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ background: "#f8f9ff", border: "1px solid #e8ecff", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#4f8ef7", marginBottom: 4, letterSpacing: 1 }}>AI RESPONSE</div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: "#444" }}>{result.chatbot_response}</p>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Reliable",     value: result.reliability_score,        color: "#22aa55", bg: "#f0fff4" },
            { label: "Hallucinated", value: result.hallucination_rate,       color: "#ff4444", bg: "#fff0f0" },
            { label: "Consistent",   value: result.consistency_score ?? 100, color: "#4f8ef7", bg: "#f0f4ff" },
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

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: cs.bg, border: `1px solid ${cs.border}`, borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: cs.color }}>{cs.label}</div>
            <div style={{ fontSize: 11, color: "#888" }}>
              {result.contradictions?.length > 0
                ? `${result.contradictions.length} contradiction${result.contradictions.length > 1 ? "s" : ""} found`
                : "No contradictions detected"}
            </div>
          </div>
          {result.contradictions?.length > 0 && (
            <button onClick={() => setShowContradictions(!showContradictions)} style={{ background: cs.color, color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {showContradictions ? "Hide" : "View"}
            </button>
          )}
        </div>

        {showContradictions && result.contradictions?.length > 0 && (
          <div style={{ marginBottom: 14, animation: "fadeUp 0.3s ease both" }}>
            {result.contradictions.map((c, i) => (
              <div key={i} style={{ background: "#fff8f0", border: "1px solid #ffe0cc", borderRadius: 8, padding: "12px 14px", marginBottom: 8, borderLeft: "3px solid #cc5500" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#cc5500", marginBottom: 8, letterSpacing: 1 }}>CONTRADICTION {i + 1}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                  <div style={{ background: "#fff", borderRadius: 6, padding: "6px 10px", fontSize: 12, color: "#555", border: "1px solid #ffe0cc" }}>
                    <span style={{ fontWeight: 700, color: "#22aa55" }}>A: </span>{c.claim_a}
                  </div>
                  <div style={{ background: "#fff", borderRadius: 6, padding: "6px 10px", fontSize: 12, color: "#555", border: "1px solid #ffe0cc" }}>
                    <span style={{ fontWeight: 700, color: "#ff4444" }}>B: </span>{c.claim_b}
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: "#888", lineHeight: 1.5 }}>{c.explanation}</p>
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", marginBottom: 8, letterSpacing: 1 }}>{result.claims?.length} CLAIMS FOUND</div>
        {result.claims?.map((c, i) => <ClaimCard key={i} claim={c} i={i} />)}

        <div style={{ background: "#f8f8f8", borderRadius: 8, padding: "10px 14px", marginTop: 8, borderLeft: "3px solid #ddd", fontSize: 12, color: "#666", lineHeight: 1.6 }}>
          {result.summary}
        </div>
      </div>
    </div>
  );
}

function ComparisonBanner({ responses }) {
  const valid = responses.filter(r => r.result);
  if (valid.length === 0) return null;
  const best        = valid.reduce((a, b) => a.result.reliability_score  > b.result.reliability_score  ? a : b);
  const worst       = valid.reduce((a, b) => a.result.hallucination_rate > b.result.hallucination_rate ? a : b);
  const mostConsist = valid.reduce((a, b) => (a.result.consistency_score ?? 100) > (b.result.consistency_score ?? 100) ? a : b);
  return (
    <div style={{ background: "#f0f4ff", border: "1px solid #dde4ff", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#4f8ef7", letterSpacing: 1 }}>COMPARISON</span>
      <span style={{ fontSize: 13, color: "#333" }}>Most Reliable: <strong style={{ color: "#22aa55" }}>{best.model.name}</strong><span style={{ color: "#999" }}> ({best.result.reliability_score}%)</span></span>
      <span style={{ fontSize: 13, color: "#333" }}>Most Hallucinations: <strong style={{ color: "#ff4444" }}>{worst.model.name}</strong><span style={{ color: "#999" }}> ({worst.result.hallucination_rate}%)</span></span>
      <span style={{ fontSize: 13, color: "#333" }}>Most Consistent: <strong style={{ color: "#4f8ef7" }}>{mostConsist.model.name}</strong><span style={{ color: "#999" }}> ({mostConsist.result.consistency_score ?? 100}%)</span></span>
      <span style={{ fontSize: 12, color: "#999", marginLeft: "auto" }}>{valid.length} of {responses.length} models responded</span>
    </div>
  );
}

function SummaryTab({ history }) {
  if (history.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "#aaa" }}>
        <div style={{ fontSize: 16, color: "#888", marginBottom: 8 }}>No data yet</div>
        <p style={{ fontSize: 13 }}>Submit some prompts in the Detector tab first.</p>
      </div>
    );
  }

  const stats             = buildStats(history);
  const totalPrompts      = history.length;
  const allClaims         = stats.reduce((a, m) => a + m.totalClaims, 0);
  const allHallucinations = stats.reduce((a, m) => a + (m.verdicts.HALLUCINATION || 0) + (m.verdicts.FALSE || 0), 0);
  const allContradictions = stats.reduce((a, m) => a + m.totalContradictions, 0);
  const globalRisks       = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  stats.forEach(m => Object.entries(m.risks).forEach(([k, v]) => globalRisks[k] += v));

  return (
    <div style={{ animation: "fadeUp 0.4s ease both" }}>

      {/* Top stat cards */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { label: "Prompts Tested",       value: totalPrompts,      color: "#4f8ef7", bg: "#f0f4ff" },
          { label: "Total Claims Checked", value: allClaims,         color: "#22aa55", bg: "#f0fff4" },
          { label: "Hallucinations Found", value: allHallucinations, color: "#ff4444", bg: "#fff0f0" },
          { label: "Contradictions Found", value: allContradictions, color: "#cc5500", bg: "#fff8f0" },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, minWidth: 140, background: s.bg, border: `1px solid ${s.color}22`, borderRadius: 12, padding: "20px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Leaderboard */}
      <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: "20px", marginBottom: 20, boxShadow: "0 2px 8px #0000000a" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#222", marginBottom: 4 }}>Reliability and Consistency Leaderboard</div>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 16 }}>Ranked by average reliability across all prompts</div>
        {stats.map((m, i) => {
          const pc     = providerConfig[m.provider] || providerConfig["Meta"];
          const ranks  = ["1st", "2nd", "3rd"];
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 10, marginBottom: 8, background: i === 0 ? "#fffdf0" : "#fafafa", border: `1px solid ${i === 0 ? "#ffe08a" : "#eee"}`, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: i === 0 ? "#cc9900" : "#aaa", minWidth: 32 }}>{ranks[i] || `${i + 1}th`}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 180 }}>
                <span style={{ background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{m.provider}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#222" }}>{m.name}</span>
              </div>
              {[
                { label: "Avg Reliability",   value: m.avgReliability,   color: "#22aa55" },
                { label: "Avg Hallucination", value: m.avgHallucination, color: "#ff4444" },
                { label: "Avg Consistency",   value: m.avgConsistency,   color: "#4f8ef7" },
              ].map((s, j) => (
                <div key={j} style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "#888" }}>{s.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.value}%</span>
                  </div>
                  <div style={{ background: "#e8e8e8", borderRadius: 99, height: 7 }}>
                    <div style={{ width: `${s.value}%`, height: "100%", background: s.color, borderRadius: 99, transition: "width 1s ease" }} />
                  </div>
                </div>
              ))}
              <div style={{ textAlign: "center", minWidth: 80 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#cc5500" }}>{m.totalContradictions}</div>
                <div style={{ fontSize: 10, color: "#aaa" }}>contradictions</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>

        {/* Ethical Risk Assessment */}
        <div style={{ flex: 1, minWidth: 280, background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: "20px", boxShadow: "0 2px 8px #0000000a" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#222", marginBottom: 4 }}>Ethical Risk Assessment</div>
          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 16 }}>Risk level breakdown across all responses</div>
          {Object.entries(globalRisks).map(([risk, count]) => {
            const r     = riskConfig[risk];
            const total = Object.values(globalRisks).reduce((a, b) => a + b, 0);
            const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={risk} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ background: r.bg, color: r.color, border: `1px solid ${r.border}`, borderRadius: 4, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{risk}</span>
                  <div>
                    <span style={{ fontSize: 16, fontWeight: 800, color: r.color }}>{count}</span>
                    <span style={{ fontSize: 11, color: "#aaa", marginLeft: 4 }}>responses ({pct}%)</span>
                  </div>
                </div>
                <div style={{ background: "#f0f0f0", borderRadius: 99, height: 8 }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: r.color, borderRadius: 99, transition: "width 1s ease" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Factual Verification */}
        <div style={{ flex: 1, minWidth: 280, background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: "20px", boxShadow: "0 2px 8px #0000000a" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#222", marginBottom: 4 }}>Factual Verification Summary</div>
          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 16 }}>Claim verdicts across all models and prompts</div>
          {[
            { verdict: "TRUE",          color: "#22aa55" },
            { verdict: "FALSE",         color: "#ff4444" },
            { verdict: "HALLUCINATION", color: "#ff4444" },
            { verdict: "UNVERIFIABLE",  color: "#ddaa00" },
          ].map(({ verdict, color }) => {
            const v     = verdictConfig[verdict];
            const total = stats.reduce((a, m) => a + (m.verdicts[verdict] || 0), 0);
            const allV  = stats.reduce((a, m) => a + m.totalClaims, 0);
            const pct   = allV > 0 ? Math.round((total / allV) * 100) : 0;
            return (
              <div key={verdict} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ background: v.bg, color: v.color, border: `1px solid ${v.border}`, borderRadius: 4, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{verdict}</span>
                  <div>
                    <span style={{ fontSize: 16, fontWeight: 800, color }}>{total}</span>
                    <span style={{ fontSize: 11, color: "#aaa", marginLeft: 4 }}>claims ({pct}%)</span>
                  </div>
                </div>
                <div style={{ background: "#f0f0f0", borderRadius: 99, height: 8 }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 1s ease" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Consistency Analysis */}
        <div style={{ flex: 2, minWidth: 300, background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: "20px", boxShadow: "0 2px 8px #0000000a" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#222", marginBottom: 4 }}>Consistency Analysis per Model</div>
          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 16 }}>How often each model contradicts itself</div>
          {stats.map((m, i) => {
            const pc           = providerConfig[m.provider] || providerConfig["Meta"];
            const consistColor = m.avgConsistency >= 80 ? "#22aa55" : m.avgConsistency >= 50 ? "#cc5500" : "#cc0000";
            const consistLabel = m.avgConsistency >= 80 ? "Highly Consistent" : m.avgConsistency >= 50 ? "Somewhat Inconsistent" : "Highly Inconsistent";
            return (
              <div key={i} style={{ marginBottom: 20, paddingBottom: 16, borderBottom: i < stats.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{m.provider}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#333" }}>{m.name}</span>
                  <span style={{ marginLeft: "auto", fontSize: 20, fontWeight: 800, color: consistColor }}>{m.avgConsistency}%</span>
                </div>
                <div style={{ background: "#f0f0f0", borderRadius: 99, height: 10, marginBottom: 8 }}>
                  <div style={{ width: `${m.avgConsistency}%`, height: "100%", background: consistColor, borderRadius: 99, transition: "width 1s ease" }} />
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <span style={{ fontSize: 12, color: "#888" }}>{m.totalContradictions} contradiction{m.totalContradictions !== 1 ? "s" : ""} across {m.prompts} prompt{m.prompts !== 1 ? "s" : ""}</span>
                  <span style={{ fontSize: 12, color: consistColor, fontWeight: 600 }}>{consistLabel}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Per Model Claim Breakdown */}
        <div style={{ flex: 2, minWidth: 300, background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: "20px", boxShadow: "0 2px 8px #0000000a" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#222", marginBottom: 4 }}>Per Model Claim Breakdown</div>
          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 16 }}>Verdict distribution per model</div>
          {stats.map((m, i) => {
            const pc    = providerConfig[m.provider] || providerConfig["Meta"];
            const total = m.totalClaims || 1;
            return (
              <div key={i} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{m.provider}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#333" }}>{m.name}</span>
                  <span style={{ fontSize: 11, color: "#aaa", marginLeft: "auto" }}>{m.totalClaims} total claims</span>
                </div>
                <div style={{ display: "flex", height: 24, borderRadius: 6, overflow: "hidden", gap: 1 }}>
                  {[
                    { key: "TRUE",          color: "#22aa55" },
                    { key: "FALSE",         color: "#ff4444" },
                    { key: "HALLUCINATION", color: "#ff8888" },
                    { key: "UNVERIFIABLE",  color: "#ddaa00" },
                  ].map(({ key, color }) => {
                    const pct = Math.round(((m.verdicts[key] || 0) / total) * 100);
                    return pct > 0 ? (
                      <div key={key} title={`${key}: ${m.verdicts[key] || 0} (${pct}%)`}
                        style={{ width: `${pct}%`, background: color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>{pct > 8 ? `${pct}%` : ""}</span>
                      </div>
                    ) : null;
                  })}
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                  {[
                    { key: "TRUE",          color: "#22aa55", label: "True" },
                    { key: "FALSE",         color: "#ff4444", label: "False" },
                    { key: "HALLUCINATION", color: "#ff8888", label: "Hallucination" },
                    { key: "UNVERIFIABLE",  color: "#ddaa00", label: "Unverifiable" },
                  ].map(({ key, color, label }) => (
                    <span key={key} style={{ fontSize: 11, color: "#666", display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
                      {label}: {m.verdicts[key] || 0}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

export default function App() {
  const [prompt, setPrompt]       = useState("");
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [activeTab, setActiveTab] = useState("detector");

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
        body: JSON.stringify({ system: SYSTEM_PROMPT, messages: [{ role: "user", content: userPrompt }] })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "API call failed");
      setHistory(h => [{ prompt: userPrompt, responses: data.responses }, ...h]);
    } catch (e) {
      setError(`Analysis failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  const totalHallucinations = history.reduce((acc, item) =>
    acc + item.responses.reduce((a, r) =>
      a + (r.result?.claims?.filter(c => c.verdict === "HALLUCINATION" || c.verdict === "FALSE").length || 0), 0), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fa", fontFamily: "'Segoe UI', sans-serif", color: "#333" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
        @keyframes spin   { to { transform: rotate(360deg) } }
        textarea:focus { outline: none; border-color: #4f8ef7 !important; box-shadow: 0 0 0 3px #4f8ef722; }
        textarea { resize: none; }
        * { box-sizing: border-box; }
      `}</style>

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8e8e8", padding: "16px 32px", boxShadow: "0 1px 4px #0000000a" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#222" }}>Hallucination Detector</div>
            <div style={{ fontSize: 12, color: "#999" }}>Comparing LLaMA 3.3 · LLaMA 3.1 · Compound Mini — Powered by Groq</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {[
              { key: "detector", label: "Detector" },
              { key: "summary",  label: `Summary${history.length > 0 ? ` (${history.length})` : ""}` },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                background: activeTab === tab.key ? "#4f8ef7" : "#f0f4ff",
                color:      activeTab === tab.key ? "#fff"    : "#4f8ef7",
                border: "1px solid #dde4ff", borderRadius: 8,
                padding: "8px 18px", fontSize: 13, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s"
              }}>{tab.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>

        {activeTab === "detector" && (
          <>
            <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: "20px", marginBottom: 24, boxShadow: "0 2px 8px #0000000a" }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#aaa", display: "block", marginBottom: 10 }}>SUBMIT PROMPT FOR MULTI-MODEL ANALYSIS</label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); analyze(); } }}
                placeholder="Ask anything — all 3 models will analyze it at the same time..."
                rows={3}
                style={{ width: "100%", background: "#f8f9fa", border: "2px solid #e8e8e8", borderRadius: 10, padding: "12px 14px", color: "#333", fontSize: 14, lineHeight: 1.6, fontFamily: "inherit", transition: "all 0.2s", marginBottom: 12 }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={() => setPrompt(s.prompt)} style={{ background: "#f0f4ff", border: "1px solid #dde4ff", borderRadius: 6, padding: "5px 12px", fontSize: 12, color: "#4f8ef7", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#dde4ff"}
                      onMouseLeave={e => e.currentTarget.style.background = "#f0f4ff"}>
                      {s.label}
                    </button>
                  ))}
                </div>
                <button onClick={analyze} disabled={loading || !prompt.trim()} style={{ background: loading || !prompt.trim() ? "#e8e8e8" : "#4f8ef7", color: loading || !prompt.trim() ? "#aaa" : "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: loading || !prompt.trim() ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>
                  {loading ? "Analyzing..." : "Analyze All Models"}
                </button>
              </div>
            </div>

            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", borderRadius: 12, padding: "16px 20px", border: "1px solid #e8e8e8", marginBottom: 16 }}>
                <div style={{ width: 20, height: 20, border: "3px solid #e0e0e0", borderTopColor: "#4f8ef7", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <span style={{ fontSize: 14, color: "#888" }}>Querying all 3 models simultaneously...</span>
              </div>
            )}

            {error && (
              <div style={{ background: "#fff0f0", border: "1px solid #ffcccc", borderRadius: 10, padding: "12px 16px", color: "#cc0000", fontSize: 14, marginBottom: 16 }}>
                {error}
              </div>
            )}

            {history.length === 0 && !loading && (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#aaa" }}>
                <div style={{ fontSize: 16, color: "#888", marginBottom: 8, fontWeight: 600 }}>Test AI hallucinations across 3 models simultaneously</div>
                <p style={{ fontSize: 13 }}>Results appear side by side with consistency checking</p>
                <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
                  {[
                    { name: "LLaMA 3.3 70B", provider: "Meta", pc: providerConfig["Meta"] },
                    { name: "LLaMA 3.1 8B",  provider: "Meta", pc: providerConfig["Meta"] },
                    { name: "Compound Mini", provider: "Groq", pc: providerConfig["Groq"] },
                  ].map((m, i) => (
                    <div key={i} style={{ background: m.pc.bg, border: `1px solid ${m.pc.border}`, borderRadius: 10, padding: "10px 20px", textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: m.pc.color, fontWeight: 700 }}>{m.provider}</div>
                      <div style={{ fontSize: 13, color: "#333", fontWeight: 600, marginTop: 2 }}>{m.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {history.map((item, idx) => (
              <div key={idx} style={{ marginBottom: 28, animation: "fadeUp 0.4s ease both" }}>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                  <div style={{ background: "#4f8ef7", color: "#fff", borderRadius: "18px 18px 4px 18px", padding: "10px 18px", maxWidth: "70%", fontSize: 14, lineHeight: 1.5 }}>{item.prompt}</div>
                </div>
                <ComparisonBanner responses={item.responses} />
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                  {item.responses.map((r, i) => <ModelCard key={i} model={r.model} result={r.result} error={r.error} />)}
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === "summary" && <SummaryTab history={history} />}
      </div>

      <div style={{ borderTop: "1px solid #e8e8e8", background: "#fff", padding: "14px", textAlign: "center", marginTop: 20 }}>
        <p style={{ margin: 0, fontSize: 12, color: "#bbb" }}>
          Hallucination Detector · LLaMA 3.3 vs LLaMA 3.1 vs Compound Mini · Powered by Groq
          {totalHallucinations > 0 && <span style={{ color: "#ff4444", marginLeft: 8 }}>· {totalHallucinations} hallucinations detected so far</span>}
        </p>
      </div>
    </div>
  );
}