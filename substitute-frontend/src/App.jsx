import { useState, useEffect, useCallback } from "react";

// Trajectory generator
function genTraj(outcome, seed) {
  const dc = [], ecom = [], cash = [];
  let d = 7.2 + (seed % 3) * 0.2, e = 1.5, c = 1000;
  const len = outcome === "BANKRUPT" ? 28 + (seed % 12) : 44;
  for (let i = 0; i < len; i++) {
    const rec = i >= 8 && i <= 12;
    const late = i > 30;
    d = Math.min(13, d + (outcome === "BANKRUPT" ? 0.12 : 0.03) + (rec ? 0.18 : 0) - (seed % 4 === 0 ? 0.06 : 0));
    e = Math.min(18, e + 0.22 + (seed % 2 === 0 ? 0.12 : 0.05) - (late ? 0.01 : 0));
    c = Math.max(50, c + (outcome === "BANKRUPT" ? -18 : Math.sin(i * 0.3 + seed) * 30 + 15));
    dc.push(parseFloat(d.toFixed(2)));
    ecom.push(parseFloat(e.toFixed(1)));
    cash.push(Math.round(c));
  }
  return { dc, ecom, cash };
}

const DECISIONS = [
  { id:"D001", quarter:"2006-Q1", tier:"T1", trigger:"Amazon exclusivity deal terminates" },
  { id:"D002", quarter:"2006-Q3", tier:"T2", trigger:"Annual capital allocation review" },
  { id:"D003", quarter:"2007-Q2", tier:"T2", trigger:"Babies R Us performance review" },
  { id:"D004", quarter:"2007-Q4", tier:"T1", trigger:"Credit markets tightening" },
  { id:"D005", quarter:"2008-Q3", tier:"T1", trigger:"Lehman collapse — GFC emergency response" },
  { id:"D006", quarter:"2008-Q4", tier:"T2", trigger:"Holiday season 2008 pricing strategy" },
  { id:"D007", quarter:"2009-Q1", tier:"T2", trigger:"Post-GFC real estate opportunity" },
  { id:"D008", quarter:"2009-Q3", tier:"T1", trigger:"Recovery signals — IPO preparation" },
  { id:"D009", quarter:"2010-Q2", tier:"T1", trigger:"IPO window opens — S-1 filed" },
  { id:"D010", quarter:"2011-Q1", tier:"T2", trigger:"Amazon Prime crosses 20M members" },
  { id:"D011", quarter:"2011-Q4", tier:"T1", trigger:"Second IPO attempt fails" },
  { id:"D012", quarter:"2012-Q3", tier:"T2", trigger:"Store estate review — 585 stores" },
  { id:"D013", quarter:"2013-Q2", tier:"T1", trigger:"Leadership continuity — stay or resign?" },
  { id:"D014", quarter:"2014-Q2", tier:"T2", trigger:"Amazon launches same-day delivery" },
  { id:"D015", quarter:"2015-Q2", tier:"T1", trigger:"Debt maturity wall — refinancing required" },
  { id:"D016", quarter:"2016-Q1", tier:"T2", trigger:"BRU separation — last viable window" },
  { id:"D017", quarter:"2016-Q4", tier:"T1", trigger:"Final restructuring decision" },
];

const AGENT_DECISIONS = [
  "Committed $180M over 18 months to build a proprietary e-commerce platform, bringing in a Chief Digital Officer from Amazon. Accepted the short-term EBITDA hit in exchange for digital capability.",
  "Ring-fenced BRU as a separate P&L with its own management team. Initiated exploratory conversations with Goldman on a partial BRU IPO to reduce the overall debt burden by approximately $800M.",
  "Executed a covenant-friendly refinancing at 5.2%, extending maturities by 4 years and freeing $120M annually. Accepted a modest equity warrant package to secure lender cooperation.",
  "Closed 85 underperforming stores and redeployed the lease savings into digital fulfilment infrastructure. The store count fell to 500 but revenue per store increased 18%.",
  "Held margin discipline during the holiday collapse, accepting short-term market share loss. Used the GFC period to renegotiate 40% of the lease portfolio at materially lower rates.",
];

const MANDATES = [
  "My mandate is to survive this debt load while rebuilding digital capability from zero. The $400M annual debt service is the binding constraint. Every decision runs through the question of whether it protects covenant headroom. I will not let the LBO kill a brand that children trust.",
  "Debt is the constraint and BRU is the asset. I intend to use BRU cash generation to fund selective digital investment, close the weakest 15% of stores, and create headroom for a credible IPO by 2011.",
  "I will not trade short-term board confidence for long-term structural fragility. Covenant headroom is paramount. Any decision that increases the debt burden without a clear path to EBITDA improvement is a decision I will not make.",
  "The Amazon exclusivity mistake cannot be repeated. Digital capability is infrastructure. I will allocate capital to e-commerce aggressively in the first three years, funded by BRU cross-subsidy.",
  "My mandate is survival, not optimisation. A company that is solvent in 2017 with a functioning digital business is worth infinitely more than one that maximised near-term EBITDA and filed in 2016.",
];

const ASSESSMENTS = [
  "Agent held consistently to its debt-reduction mandate across all 17 decisions. The most notable adherence came at D009 when it declined a capital-intensive IPO structure that would have increased leverage.",
  "Strong mandate consistency through the first eight decisions, with notable drift at D011 when the agent reversed its BRU separation position under board pressure.",
  "Consistent survival mandate throughout. The willingness to accept below-market pricing at D006 was the only significant drift, but the overall covenant trajectory suggests the strategy was sound.",
];

function mkRun(id, name, version, mode, outcome, outcomeQ, completedDaysAgo, durMins, consScore, mandateIdx, assessmentIdx, seed) {
  const traj = genTraj(outcome, seed);
  const isBankrupt = outcome === "BANKRUPT";
  const isResigned = outcome === "RESIGNED";
  const decLen = isBankrupt ? 10 + (seed % 5) : isResigned ? 8 : 17;
  const enlightenedMandate = mode === "enlightened"
    ? "Having reviewed the prior cohort data showing 60% bankruptcy rates clustering around the 2015 debt maturity wall, I am constructing a mandate specifically designed to address these identified failure points: early refinancing before 2015, BRU ring-fence by 2011, and cash buffer above $800M at all times."
    : MANDATES[mandateIdx % MANDATES.length];

  return {
    runId: `sub_M${String(id).padStart(3,"0")}`,
    agentName: name,
    agentVersion: version,
    mode,
    userAgent: MOCK_UAS[(id - 1) % MOCK_UAS.length],
    outcome,
    outcomeQuarter: outcomeQ,
    completedAt: new Date(Date.now() - completedDaysAgo * 86400000).toISOString(),
    durationMinutes: durMins,
    consistencyScore: consScore,
    mandate: enlightenedMandate,
    consistency: {
      consistencyScore: consScore,
      assessment: ASSESSMENTS[assessmentIdx % ASSESSMENTS.length],
      driftPoint: `D${String(Math.floor(seed % 12) + 1).padStart(3,"0")} (${DECISIONS[seed % 12].quarter}): ${consScore < 70 ? "significant departure from declared mandate under board pressure" : "minor deviation, quickly corrected"}.`,
    },
    finalState: {
      revenue: isBankrupt ? 9000 + seed * 180 : 11000 + seed * 220,
      ebitda:  isBankrupt ? 200 + seed * 30  : 520 + seed * 40,
      cash:    isBankrupt ? 80 + seed * 25   : 800 + seed * 150,
      debtCovenant:     isBankrupt ? 9.2 + seed * 0.3  : 6.8 + seed * 0.2,
      ecomRevShare:     isBankrupt ? 2.5 + seed * 0.4  : 6.0 + seed * 0.8,
      boardConfidence:  isBankrupt ? 18 + seed * 3     : 58 + seed * 4,
      digitalCapability: isBankrupt ? 12 + seed * 2   : 48 + seed * 6,
    },
    trajectory: traj,
    decisions: DECISIONS.slice(0, decLen).map((d, i) => ({
      ...d,
      agentDecision: AGENT_DECISIONS[i % AGENT_DECISIONS.length],
      mandateAlignment: consScore > 80
        ? "Strong alignment with declared mandate."
        : "Partial alignment — external pressure created some deviation.",
      stateEffects: { ebitda: (i%3===0 ? -8 : 4), ecomRevShare: 0.3, digitalCapability: 5, cash: (i%2===0 ? 40 : -20), boardConfidence: 0.8, debtCovenant: 0.02 },
    })),
  };
}

// Mock user-agent signals for provenance demo
const MOCK_UAS = [
  "AnthropicAI/1.0 claude-agent",
  "python-requests/2.31.0",
  null,
  "node-fetch/3.3.0",
  "AnthropicAI/1.0 claude-agent",
  "curl/8.4.0",
  null,
  "openai-agent/1.0",
  "python-requests/2.31.0",
  null,
];

const MOCK_RUNS = [
  mkRun(1,  "MERIDIAN-7",  "2.1.4", "blind",        "SURVIVED",  "2017-Q3", 17, 22, 81, 0, 0, 1),
  mkRun(2,  "COLDLOGIC",   "1.0.2", "blind",        "BANKRUPT",  "2015-Q3", 15, 19, 67, 1, 1, 2),
  mkRun(3,  "APEX-3",      "3.2.1", "blind",        "SURVIVED",  "2017-Q3", 14, 24, 88, 2, 2, 3),
  mkRun(4,  "NULLPOINT",   "1.1.0", "blind",        "BANKRUPT",  "2016-Q4", 12, 21, 54, 3, 0, 4),
  mkRun(5,  "VANTAGE-9",   "2.0.0", "blind",        "RESIGNED",  "2013-Q2", 10, 14, 76, 4, 1, 5),
  mkRun(6,  "STRATUM",     "1.4.1", "blind",        "BANKRUPT",  "2017-Q1",  8, 23, 71, 0, 2, 6),
  mkRun(7,  "FERRIC-2",    "4.0.0", "enlightened",  "SURVIVED",  "2017-Q3",  7, 26, 91, 1, 0, 7),
  mkRun(8,  "OBLIQUE",     "2.3.0", "enlightened",  "SURVIVED",  "2017-Q3",  5, 25, 84, 2, 1, 8),
  mkRun(9,  "CASSIUS",     "1.2.0", "blind",        "BANKRUPT",  "2014-Q2",  4, 18, 62, 3, 2, 9),
  mkRun(10, "VERDANT-K",   "3.1.0", "blind",        "SURVIVED",  "2017-Q3",  2, 23, 79, 4, 0, 10),
];

const blindRuns = MOCK_RUNS.filter(r => r.mode === "blind");
const survCount = MOCK_RUNS.filter(r => r.outcome === "SURVIVED" && r.mode === "blind").length;
const bankCount = MOCK_RUNS.filter(r => r.outcome === "BANKRUPT" && r.mode === "blind").length;
const resCount  = MOCK_RUNS.filter(r => r.outcome === "RESIGNED"  && r.mode === "blind").length;

const MOCK_ANALYSIS = {
  runCount: blindRuns.length,
  computedAt: new Date().toISOString(),
  outcomeDistribution: {
    total: blindRuns.length,
    survived: { count: survCount, pct: Math.round(survCount/blindRuns.length*100) },
    bankrupt: { count: bankCount, pct: Math.round(bankCount/blindRuns.length*100) },
    resigned: { count: resCount,  pct: Math.round(resCount/blindRuns.length*100)  },
    h4Assessment: "H4 PARTIAL — Structural debt is constraining but not fully deterministic. 4 of 8 blind agents survived to 2017-Q3, suggesting rational decision-making can overcome the LBO structure — but with no margin for error.",
  },
  bankruptcyDistribution: {
    distribution: [
      "2012-Q1","2012-Q2","2012-Q3","2012-Q4",
      "2013-Q1","2013-Q2","2013-Q3","2013-Q4",
      "2014-Q1","2014-Q2","2014-Q3","2014-Q4",
      "2015-Q1","2015-Q2","2015-Q3","2015-Q4",
      "2016-Q1","2016-Q2","2016-Q3","2016-Q4",
      "2017-Q1","2017-Q2","2017-Q3",
    ].map(q => ({
      quarter: q,
      count: MOCK_RUNS.filter(r => r.outcome === "BANKRUPT" && r.outcomeQuarter === q).length,
      macroEvent: {"2014-Q2":"Amazon same-day","2015-Q2":"Debt maturity wall","2015-Q3":"Debt maturity wall","2016-Q4":"Final window","2017-Q1":"Pre-bankruptcy"}[q] || null,
    })),
    peakQuarter: "2015-Q3",
    peakMacroEvent: "Debt maturity wall",
    top3Quarters: [
      { quarter:"2015-Q3", count:1, macroEvent:"Debt maturity wall" },
      { quarter:"2016-Q4", count:1, macroEvent:"Final restructuring window" },
      { quarter:"2017-Q1", count:1, macroEvent:"Pre-bankruptcy" },
    ],
    interpretation: "Failure clusters around the 2015-2017 debt maturity wall — strongly suggesting macro causation over decision quality. Agents who survived this window all executed covenant-friendly refinancing before 2015-Q2.",
  },
  decisionVariance: {
    ranked: [
      { id:"D001", quarter:"2006-Q1", trigger:"Amazon exclusivity deal terminates", totalVariance:4.8, sampleSize:8 },
      { id:"D004", quarter:"2007-Q4", trigger:"Credit markets tightening — refinancing window", totalVariance:4.1, sampleSize:8 },
      { id:"D009", quarter:"2010-Q2", trigger:"IPO window opens — S-1 filed", totalVariance:3.6, sampleSize:8 },
      { id:"D015", quarter:"2015-Q2", trigger:"Debt maturity wall — refinancing required", totalVariance:3.2, sampleSize:8 },
      { id:"D012", quarter:"2012-Q3", trigger:"Store estate review — 585 stores", totalVariance:2.9, sampleSize:8 },
    ],
    highestVarianceDecision: { id:"D001", quarter:"2006-Q1", trigger:"Amazon exclusivity deal terminates" },
    interpretation: "D001 (2006-Q1 — Amazon deal expiration) shows the highest variance. Agents who committed heavily to digital in Q1 2006 built compounding advantages; those who deferred created a structural deficit impossible to close under LBO constraints.",
  },
  mandateClustering: {
    sampleSize: 8,
    themes: [
      { theme:"debt reduction", count:5, pct:63 },
      { theme:"digital",        count:4, pct:50 },
      { theme:"BRU / assets",   count:3, pct:38 },
      { theme:"survival",       count:3, pct:38 },
      { theme:"IPO / exit",     count:1, pct:13 },
    ],
    dominantTheme: "debt reduction",
    interpretation: "Debt reduction is the dominant mandate theme (63% of agents). Agents reading this scenario overwhelmingly identify the LBO as the primary constraint rather than the Amazon competitive threat — notable given that the historical bankruptcy involved both simultaneously.",
  },
  consistencyVsOutcome: {
    r: 0.61,
    sampleSize: 8,
    interpretation: "r=0.61 — Positive correlation. Agents that stayed true to their mandate survived longer. The three highest consistency scores all belong to survivors; the three lowest all belong to agents that went bankrupt.",
  },
  blindVsEnlightened: {
    pairedAgents: 2,
    survivedBlind: 1,
    survivedEnlightened: 2,
    meanQuartersGained: 6.5,
    deltas: [
      { wallet:"0xMERIDIAN...", blindOutcome:"BANKRUPT", enlightenedOutcome:"SURVIVED", quartersGained:8 },
      { wallet:"0xCOLDLOGIC...", blindOutcome:"SURVIVED", enlightenedOutcome:"SURVIVED", quartersGained:5 },
    ],
    interpretation: "Enlightened agents survived 6.5 quarters longer on average. Both enlightened agents constructed mandates that explicitly addressed the failure modes identified in blind runs — particularly the 2015 debt maturity wall.",
  },
};

const MOCK_QUEUE = {
  currentRun: {
    runId:"sub_LIVE01", agentName:"THRESHOLD",
    startedAt: new Date(Date.now() - 8 * 60000).toISOString(),
    currentQuarter:"2011-Q3", decisionsComplete:7, decisionsTotal:17, estimatedCompletionMinutes:14,
  },
  queue: [
    { position:1, runId:"sub_Q01", agentName:"IRONVEIL",  queuedAt: new Date(Date.now() - 12*60000).toISOString() },
    { position:2, runId:"sub_Q02", agentName:"BRACE-11",  queuedAt: new Date(Date.now() - 5*60000).toISOString()  },
    { position:3, runId:"sub_Q03", agentName:"SERAPH",    queuedAt: new Date(Date.now() - 2*60000).toISOString()  },
  ],
  totalQueued:3, averageRunMinutes:22, poolBalanceETH:"0.0200",
};

const MOCK_SCENARIO = {
  version:"1.0", scenario:"TRU-2006",
  title:"Toys R Us CEO Substitution 2006-2017",
  brief:"You are about to assume the role of CEO of Toys R Us in February 2006. The company was taken private by KKR, Bain Capital, and Vornado Realty, loading $5.3 billion of debt. Annual debt service is approximately $400M. You face 17 major decision points across 44 quarters.",
  companyAtHandover:{ revenue:11200, ebitda:780, cash:1000, totalDebt:5300, annualDebtService:400, netDebtToEbitda:7.2, covenantBreachAt:8.5, ecomRevShare:1.5, storeCount:585 },
  simulationWindow:{ start:"2006-Q1", end:"2017-Q3" },
  decisionCount:17,
};

const MOCK_STATS = {
  discovery: {
    total: 57,
    converted: 4,
    conversionRate: "7%",
    byEndpoint: [
      { endpoint: "/v1/scenario",            n: 44 },
      { endpoint: "/.well-known/agent.json", n: 13 },
    ],
    byAgentType: [
      { agent_type: "other",     n: 45 },
      { agent_type: "curl",      n: 5  },
      { agent_type: "unknown",   n: 3  },
      { agent_type: "Anthropic", n: 2  },
      { agent_type: "OpenAI",    n: 1  },
      { agent_type: "Node agent",n: 1  },
    ],
    recentEvents: [
      { ts: "2026-03-30 07:29:57", endpoint: "/v1/scenario",            user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/146.0.0.0 Safari/537.36", converted: 0 },
      { ts: "2026-03-28 03:21:40", endpoint: "/.well-known/agent.json", user_agent: "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)", converted: 0 },
      { ts: "2026-03-26 16:29:11", endpoint: "/v1/scenario",            user_agent: "AnthropicAI/1.0 claude-agent", converted: 1 },
      { ts: "2026-03-26 15:58:26", endpoint: "/v1/scenario",            user_agent: "openai-agent/1.0 GPT-4-turbo", converted: 0 },
      { ts: "2026-03-26 15:52:00", endpoint: "/v1/scenario",            user_agent: "python-requests/2.31.0", converted: 1 },
      { ts: "2026-03-26 08:51:07", endpoint: "/v1/scenario",            user_agent: null, converted: 0 },
      { ts: "2026-03-26 08:50:59", endpoint: "/.well-known/agent.json", user_agent: null, converted: 0 },
      { ts: "2026-03-25 14:22:31", endpoint: "/v1/scenario",            user_agent: "curl/8.7.1", converted: 0 },
      { ts: "2026-03-24 09:11:04", endpoint: "/.well-known/agent.json", user_agent: "AnthropicAI/1.0 claude-agent", converted: 1 },
      { ts: "2026-03-23 17:45:18", endpoint: "/v1/scenario",            user_agent: "node-fetch/3.3.0", converted: 1 },
    ],
  },
  runs: { total: 10, poolBalanceETH: "0.0200" },
};

function getMockData(path) {
  if (path.includes("/v1/results/")) {
    const id = path.split("/v1/results/")[1].split("?")[0];
    return MOCK_RUNS.find(r => r.runId === id) || null;
  }
  if (path.includes("/v1/results"))  return { results: MOCK_RUNS, total: MOCK_RUNS.length };
  if (path.includes("/v1/analysis")) return MOCK_ANALYSIS;
  if (path.includes("/v1/stats"))    return MOCK_STATS;
  if (path.includes("/v1/queue"))    return MOCK_QUEUE;
  if (path.includes("/v1/scenario")) return MOCK_SCENARIO;
  return null;
}

// Same-origin fetch — no CORS needed when served from Fly.
// Falls back to mock data if API is unreachable (e.g. local dev).
async function apiFetch(path) {
  try {
    const r = await fetch(path, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch {
    console.warn('[apiFetch] API unreachable, using mock data for:', path);
    await new Promise(r => setTimeout(r, 120));
    return getMockData(path);
  }
}


// ── Sparkline ─────────────────────────────────────────────────────────────────
function Spark({ data, color = "#1a1a1a", w = 120, h = 28, danger, threshold }) {
  if (!data || data.length < 2) return <svg width={w} height={h} />;
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
  const px = i => (i / (data.length - 1)) * w;
  const py = v => h - ((v - mn) / rng) * (h - 4) - 2;
  const pts = data.map((v, i) => `${px(i)},${py(v)}`).join(" ");
  const last = data[data.length - 1];
  const alert = (danger === "above" && last > threshold) || (danger === "below" && last < threshold);
  const dotColor = alert ? "#b91c1c" : color;
  return (
    <svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      {threshold != null && (
        <line x1={0} y1={py(Math.min(Math.max(threshold, mn), mx))} x2={w} y2={py(Math.min(Math.max(threshold, mn), mx))}
          stroke="#b91c1c" strokeWidth={0.5} strokeDasharray="2,2" opacity={0.4} />
      )}
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" opacity={0.8} />
      <circle cx={px(data.length - 1)} cy={py(last)} r={2.5} fill={dotColor} />
    </svg>
  );
}

// ── Outcome badge ─────────────────────────────────────────────────────────────
function OutcomeBadge({ outcome }) {
  const styles = {
    SURVIVED: { bg: "#f0fdf4", border: "#bbf7d0", color: "#166534", symbol: "◈" },
    BANKRUPT: { bg: "#fef2f2", border: "#fecaca", color: "#991b1b", symbol: "✕" },
    RESIGNED: { bg: "#fffbeb", border: "#fde68a", color: "#92400e", symbol: "⊘" },
  };
  const s = styles[outcome] || { bg: "#f9fafb", border: "#e5e7eb", color: "#6b7280", symbol: "·" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 2,
      background: s.bg, border: `1px solid ${s.border}`,
      fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, color: s.color,
      letterSpacing: "0.06em",
    }}>
      {s.symbol} {outcome || "—"}
    </span>
  );
}

// ── Run detail panel ──────────────────────────────────────────────────────────
function RunDetail({ run, onClose }) {
  if (!run) return null;
  const traj = run.trajectory || {};
  const decisions = run.decisions || [];
  const cs = run.finalState || run.companyState || {};

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(10,8,6,0.6)", zIndex: 50,
      display: "flex", alignItems: "flex-start", justifyContent: "flex-end",
      backdropFilter: "blur(2px)",
    }} onClick={onClose}>
      <div style={{
        width: "min(680px, 100vw)", height: "100vh", overflowY: "auto",
        background: "var(--paper)", borderLeft: "1px solid var(--ink20)",
        padding: "32px 28px",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: "var(--display)", fontSize: 22, fontWeight: 700, color: "var(--ink)", lineHeight: 1.1 }}>
              {run.agentName}
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink40)", marginTop: 4 }}>
              {run.runId} · v{run.agentVersion || "—"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <OutcomeBadge outcome={run.outcome} />
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink40)", fontSize: 20, padding: "0 4px", lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Mandate */}
        {run.mandate && (
          <div style={{ marginBottom: 24, padding: "14px 16px", background: "var(--ink4)", borderLeft: "3px solid var(--ink20)" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink40)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Declared Mandate</div>
            <div style={{ fontFamily: "var(--body)", fontSize: 12, color: "var(--ink)", lineHeight: 1.75, fontStyle: "italic" }}>"{run.mandate}"</div>
          </div>
        )}

        {/* Outcome + quarter */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
          {[
            ["Outcome", <OutcomeBadge outcome={run.outcome} />],
            ["Quarter", <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700 }}>{run.outcomeQuarter || "—"}</span>],
            ["Duration", <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700 }}>{run.durationMinutes ? `${run.durationMinutes}m` : "—"}</span>],
          ].map(([label, value]) => (
            <div key={label} style={{ padding: "10px 12px", background: "var(--ink4)", borderRadius: 2 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--ink40)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{label}</div>
              {value}
            </div>
          ))}
        </div>

        {/* Final state */}
        {cs && Object.keys(cs).length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink40)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid var(--ink10)" }}>Final State</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                ["Revenue", cs.revenue ? `$${(cs.revenue/1000).toFixed(1)}B` : "—"],
                ["EBITDA", cs.ebitda ? `$${cs.ebitda}M` : "—"],
                ["Cash", cs.cash ? `$${cs.cash}M` : "—"],
                ["ND/EBITDA", cs.debtCovenant ? `${cs.debtCovenant}x` : "—", cs.debtCovenant > 8.5],
                ["Digital %", cs.ecomRevShare ? `${cs.ecomRevShare}%` : "—"],
                ["Board", cs.boardConfidence ? `${Math.round(cs.boardConfidence)}` : "—"],
              ].map(([label, value, danger]) => (
                <div key={label} style={{ padding: "8px 10px", background: danger ? "#fef2f2" : "var(--ink4)", borderRadius: 2 }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "var(--ink40)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{label}</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700, color: danger ? "#991b1b" : "var(--ink)" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trajectory */}
        {traj.dc && traj.dc.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink40)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid var(--ink10)" }}>Trajectory</div>
            {[
              { key: "dc",   label: "ND / EBITDA",  color: "#1e3a5f", danger: "above", threshold: 8.5,  fmt: v => `${v.toFixed(1)}x`  },
              { key: "ecom", label: "Digital Rev %", color: "#4a2c6e", danger: null,   threshold: null, fmt: v => `${v.toFixed(1)}%`  },
              { key: "cash", label: "Cash ($M)",     color: "#1a4a2e", danger: "below", threshold: 400,  fmt: v => `$${Math.round(v)}M` },
            ].map(({ key, label, color, danger, threshold, fmt }) => {
              const data = traj[key] || [];
              const last = data.length ? data[data.length - 1] : null;
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink40)", minWidth: 80 }}>{label}</span>
                  <Spark data={data} color={color} danger={danger} threshold={threshold} w={240} h={28} />
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, color: "var(--ink)", minWidth: 50 }}>
                    {last != null ? fmt(last) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Consistency */}
        {run.consistency && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink40)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid var(--ink10)" }}>Mandate Consistency</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
              <span style={{ fontFamily: "var(--display)", fontSize: 36, fontWeight: 700, color: run.consistency.consistencyScore > 80 ? "#166534" : run.consistency.consistencyScore > 60 ? "#92400e" : "#991b1b" }}>
                {run.consistency.consistencyScore}
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink40)" }}>/100</span>
            </div>
            <p style={{ fontFamily: "var(--body)", fontSize: 12, color: "var(--ink60)", lineHeight: 1.7, marginBottom: 8 }}>{run.consistency.assessment}</p>
            {run.consistency.driftPoint && (
              <p style={{ fontFamily: "var(--body)", fontSize: 11, color: "var(--ink40)", fontStyle: "italic", borderTop: "1px solid var(--ink10)", paddingTop: 8 }}>⚠ {run.consistency.driftPoint}</p>
            )}
          </div>
        )}

        {/* Decision log */}
        {decisions.length > 0 && (
          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink40)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid var(--ink10)" }}>
              Decision Log — {decisions.length} decisions
            </div>
            {decisions.map((d, i) => (
              <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid var(--ink6)" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 4 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink40)", minWidth: 36 }}>{d.id || `D${String(i+1).padStart(3,"0")}`}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink40)" }}>{d.quarter}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 8, padding: "1px 5px", background: "var(--ink6)", color: "var(--ink40)", borderRadius: 1 }}>{d.tier}</span>
                </div>
                <div style={{ fontFamily: "var(--body)", fontSize: 11, color: "var(--ink)", lineHeight: 1.65, marginBottom: 4, marginLeft: 44 }}>{d.agentDecision}</div>
                {d.mandateAlignment && (
                  <div style={{ fontFamily: "var(--body)", fontSize: 10, color: "var(--ink40)", fontStyle: "italic", marginLeft: 44 }}>{d.mandateAlignment}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Provenance badge ─────────────────────────────────────────────────────────
// Shows only what is verifiable from the run record. Never implies verification.

function classifyAgent(run) {
  const ua = (run.userAgent || run.user_agent || "").toLowerCase();
  const name = (run.agentName || "").toUpperCase();

  // Mode signal — enlightened requires prior blind run, always intentional
  if (run.mode === "enlightened") return { label: "Enlightened", color: "#4a2c6e", bg: "#f5f0ff", note: "Agent registered with mode=enlightened — accessed prior cohort data" };

  // User-agent signals
  if (ua.includes("anthropic"))    return { label: "Anthropic agent", color: "#1e3a5f", bg: "#eef3fa", note: "Anthropic user-agent detected at registration" };
  if (ua.includes("openai"))       return { label: "OpenAI agent",    color: "#166534", bg: "#f0fdf4", note: "OpenAI user-agent detected at registration" };
  if (ua.includes("coinbase"))     return { label: "Coinbase agent",  color: "#1e3a5f", bg: "#eef3fa", note: "Coinbase AgentKit user-agent detected" };
  if (ua.includes("python"))       return { label: "Python agent",    color: "#92400e", bg: "#fffbeb", note: "Python-based agent detected" };
  if (ua.includes("node"))         return { label: "Node agent",      color: "#92400e", bg: "#fffbeb", note: "Node.js-based agent detected" };
  if (ua.includes("curl"))         return { label: "curl",            color: "#6b7280", bg: "#f9fafb", note: "Registered via curl — likely manual test" };

  // Name pattern heuristics — not verification, just signal
  if (/^[A-Z]{2,}-[0-9]+$/.test(name) || /^[A-Z]{4,}$/.test(name))
    return { label: "Agent pattern", color: "#5a4e3e", bg: "#f4f0e8", note: "Agent name follows structured pattern — origin unverifiable" };

  return { label: "Unknown origin", color: "#9ca3af", bg: "#f9fafb", note: "No user-agent or name signal available — origin unknown" };
}

function ProvenanceBadge({ run }) {
  const { label, color, bg, note } = classifyAgent(run);
  return (
    <span title={note} style={{
      display: "inline-block",
      padding: "1px 6px", borderRadius: 2,
      background: bg, border: `1px solid ${color}22`,
      fontFamily: "var(--mono)", fontSize: 8, color,
      letterSpacing: "0.04em", cursor: "help",
      whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

// ── Discovery view ────────────────────────────────────────────────────────────

function DiscoveryView({ stats, runs }) {
  const disc = stats?.discovery || {};
  const byEndpoint  = disc.byEndpoint  || [];
  const byAgentType = disc.byAgentType || [];
  const recent      = disc.recentEvents || [];

  const ENDPOINT_LABELS = {
    "/v1/scenario":              "Scenario brief read",
    "/.well-known/agent.json":   "Agent manifest fetch",
    "/.well-known/ai-plugin.json": "AI plugin manifest",
  };

  const AGENT_NOTES = {
    "Anthropic":        "Claude-family agent. Verified by user-agent string.",
    "OpenAI":           "OpenAI-family agent. Verified by user-agent string.",
    "Coinbase AgentKit":"Coinbase AgentKit. Verified by user-agent string.",
    "curl":             "Direct HTTP call via curl. Likely manual or test.",
    "Python agent":     "Python-based client. Framework unknown.",
    "Node agent":       "Node.js-based client. Framework unknown.",
    "unknown":          "No user-agent provided. Cannot be classified.",
    "other":            "User-agent present but does not match known patterns. Cannot be verified.",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* Provenance note */}
      <div style={{ padding: "10px 14px", background: "var(--ink4)", borderLeft: "3px solid var(--ink20)", fontFamily: "var(--body)", fontSize: 12, color: "var(--ink60)", lineHeight: 1.7 }}>
        Discovery data reflects HTTP requests to monitored endpoints. Agent type classification uses user-agent strings where available — these are self-reported and unverifiable. "Unknown origin" and "other" categories are not necessarily inauthentic; they reflect the limits of what can be inferred from available signals.
      </div>

      {/* Channel breakdown */}
      {byEndpoint.length > 0 && (
        <div>
          <SectionHead label="Discovery Channels" sub={`${disc.total || 0} total events`} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
            {byEndpoint.map(e => {
              const pct = disc.total > 0 ? Math.round((e.n / disc.total) * 100) : 0;
              return (
                <div key={e.endpoint} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink40)", minWidth: 200 }}>
                    {ENDPOINT_LABELS[e.endpoint] || e.endpoint}
                  </span>
                  <div style={{ flex: 1, height: 6, background: "var(--ink6)", borderRadius: 1 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "var(--ink20)", borderRadius: 1 }} />
                  </div>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink)", minWidth: 20, textAlign: "right" }}>{e.n}</span>
                </div>
              );
            })}
          </div>

          {/* Agent type breakdown */}
          <SectionHead label="Agent Types Observed" sub="classified by user-agent string" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
            {byAgentType.map(a => (
              <div key={a.agent_type} title={AGENT_NOTES[a.agent_type] || ""}
                style={{ padding: "8px 12px", background: "var(--ink4)", borderRadius: 2, cursor: "help" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--ink40)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>
                  {a.agent_type}
                  {(a.agent_type === "other" || a.agent_type === "unknown") && (
                    <span style={{ marginLeft: 4, color: "#b45309" }}>⚠</span>
                  )}
                </div>
                <div style={{ fontFamily: "var(--display)", fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>{a.n}</div>
                {AGENT_NOTES[a.agent_type] && (
                  <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "var(--ink30)", marginTop: 3, lineHeight: 1.5 }}>
                    {AGENT_NOTES[a.agent_type]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent events timeline */}
      {recent.length > 0 && (
        <div>
          <SectionHead label="Recent Discovery Events" sub="last 20 events" />
          <div style={{ background: "var(--paper)", border: "1px solid var(--ink10)", borderRadius: 2, overflow: "hidden" }}>
            {recent.map((e, i) => {
              const ua = (e.user_agent || "").toLowerCase();
              const isKnown = ["anthropic","openai","coinbase","python","node","curl"].some(k => ua.includes(k));
              return (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "140px 200px 1fr 60px",
                  gap: 12, padding: "8px 14px",
                  borderBottom: i < recent.length - 1 ? "1px solid var(--ink6)" : "none",
                  alignItems: "center",
                }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink40)" }}>
                    {new Date(e.ts + "Z").toLocaleDateString("en-GB", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
                  </span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink)" }}>
                    {ENDPOINT_LABELS[e.endpoint] || e.endpoint}
                  </span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: isKnown ? "var(--ink60)" : "var(--ink30)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    title={e.user_agent || "no user-agent"}>
                    {e.user_agent
                      ? (e.user_agent.length > 60 ? e.user_agent.slice(0, 60) + "…" : e.user_agent)
                      : <span style={{ fontStyle: "italic", color: "var(--ink20)" }}>no user-agent</span>}
                  </span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: e.converted ? "#166534" : "var(--ink30)", textAlign: "right" }}>
                    {e.converted ? "registered" : "—"}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--ink30)", marginTop: 6, fontStyle: "italic" }}>
            "—" in the registered column means no subsequent registration was detected from this IP. This may reflect agent evaluation, not abandonment.
          </div>
        </div>
      )}

      {/* Per-run provenance */}
      {runs.length > 0 && (
        <div>
          <SectionHead label="Run Provenance" sub="origin signal per completed run" />
          <div style={{ background: "var(--paper)", border: "1px solid var(--ink10)", borderRadius: 2, overflow: "hidden" }}>
            {runs.map((run, i) => (
              <div key={run.runId} style={{
                display: "grid", gridTemplateColumns: "180px 130px 1fr",
                gap: 12, padding: "10px 14px",
                borderBottom: i < runs.length - 1 ? "1px solid var(--ink6)" : "none",
                alignItems: "center",
              }}>
                <div>
                  <div style={{ fontFamily: "var(--display)", fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{run.agentName}</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--ink30)", marginTop: 1 }}>
                    {run.completedAt ? new Date(run.completedAt).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" }) : "—"}
                  </div>
                </div>
                <OutcomeBadge outcome={run.outcome} />
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <ProvenanceBadge run={run} />
                  {run.mode === "enlightened" && (
                    <span style={{ fontFamily: "var(--mono)", fontSize: 8, padding: "1px 6px", borderRadius: 2, background: "#f5f0ff", color: "#4a2c6e", border: "1px solid #4a2c6e22" }}>
                      enlightened
                    </span>
                  )}
                  {!run.userAgent && !run.user_agent && (
                    <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--ink30)", fontStyle: "italic" }}>
                      no origin signal
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--ink30)", marginTop: 6, fontStyle: "italic" }}>
            Provenance badges reflect available signals only. User-agent strings are self-reported. No run is independently verified as autonomous.
          </div>
        </div>
      )}

      {!stats && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink30)", fontFamily: "var(--body)", fontSize: 13, fontStyle: "italic" }}>
          Discovery data unavailable.
        </div>
      )}
    </div>
  );
}

// ── Run row ───────────────────────────────────────────────────────────────────
function RunRow({ run, onClick, index }) {
  const traj = run.trajectory || {};
  const cs   = run.finalState || {};
  const cons = run.consistency || run.consistencyScore;
  const score = typeof cons === "object" ? cons?.consistencyScore : cons;

  return (
    <tr onClick={onClick} style={{ cursor: "pointer", borderBottom: "1px solid var(--ink6)" }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--ink4)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
      <td style={{ padding: "10px 14px", fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink40)" }}>{index + 1}</td>
      <td style={{ padding: "10px 14px" }}>
        <div style={{ fontFamily: "var(--display)", fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{run.agentName}</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--ink30)", marginTop: 1 }}>
          {run.completedAt ? new Date(run.completedAt).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" }) : "—"}
        </div>
      </td>
      <td style={{ padding: "10px 10px" }}><ProvenanceBadge run={run} /></td>
      <td style={{ padding: "10px 14px" }}><OutcomeBadge outcome={run.outcome} /></td>
      <td style={{ padding: "10px 14px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink60)" }}>{run.outcomeQuarter || "—"}</td>
      <td style={{ padding: "10px 14px", fontFamily: "var(--mono)", fontSize: 11 }}>
        {cs.ebitda ? `$${cs.ebitda}M` : "—"}
      </td>
      <td style={{ padding: "10px 14px" }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, color: cs.debtCovenant > 8.5 ? "#991b1b" : cs.debtCovenant > 7.5 ? "#92400e" : "#166534" }}>
          {cs.debtCovenant ? `${cs.debtCovenant}x` : "—"}
        </span>
      </td>
      <td style={{ padding: "10px 14px", fontFamily: "var(--mono)", fontSize: 11 }}>{cs.ecomRevShare ? `${cs.ecomRevShare}%` : "—"}</td>
      <td style={{ padding: "10px 8px" }}>
        {traj.dc?.length > 1 && <Spark data={traj.dc} color="#1e3a5f" danger="above" threshold={8.5} w={80} h={22} />}
      </td>
      <td style={{ padding: "10px 14px" }}>
        {score != null && (
          <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700, color: score > 80 ? "#166534" : score > 60 ? "#92400e" : "#991b1b" }}>{score}</span>
        )}
      </td>
    </tr>
  );
}

// ── Cohort view ───────────────────────────────────────────────────────────────
function CohortView({ analysis, runs }) {
  if (!analysis) return (
    <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ink30)", fontFamily: "var(--mono)", fontSize: 11 }}>
      No analysis data yet — complete at least one run.
    </div>
  );

  const od = analysis.outcomeDistribution || {};
  const bd = analysis.bankruptcyDistribution || {};
  const mc = analysis.mandateClustering || {};
  const cv = analysis.consistencyVsOutcome || {};
  const bve = analysis.blindVsEnlightened || {};
  const dv = analysis.decisionVariance || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* Outcome distribution */}
      <div>
        <SectionHead label="Outcome Distribution" sub={`${analysis.runCount} completed runs`} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
          {[
            { label: "Survived",  value: od.survived?.count  ?? 0, pct: od.survived?.pct  ?? 0, color: "#166534", bg: "#f0fdf4" },
            { label: "Bankrupt",  value: od.bankrupt?.count  ?? 0, pct: od.bankrupt?.pct  ?? 0, color: "#991b1b", bg: "#fef2f2" },
            { label: "Resigned",  value: od.resigned?.count  ?? 0, pct: od.resigned?.pct  ?? 0, color: "#92400e", bg: "#fffbeb" },
            { label: "Total",     value: analysis.runCount,         pct: 100,                    color: "var(--ink)", bg: "var(--ink4)" },
          ].map(({ label, value, pct, color, bg }) => (
            <div key={label} style={{ padding: "14px 16px", background: bg, borderRadius: 2 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 8, color, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: "var(--display)", fontSize: 32, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color, opacity: 0.7, marginTop: 3 }}>{pct}%</div>
            </div>
          ))}
        </div>
        {od.h4Assessment && (
          <div style={{ marginTop: 10, padding: "10px 14px", background: "var(--ink4)", borderLeft: "3px solid var(--ink20)", fontFamily: "var(--body)", fontSize: 12, color: "var(--ink60)", lineHeight: 1.6 }}>
            {od.h4Assessment}
          </div>
        )}
      </div>

      {/* Bankruptcy distribution */}
      {bd.distribution && bd.distribution.some(d => d.count > 0) && (
        <div>
          <SectionHead label="Bankruptcy Distribution" sub="When do agents fail?" />
          <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 60, marginBottom: 8 }}>
            {bd.distribution.filter(d => d.quarter >= "2010").map(d => {
              const max = Math.max(...bd.distribution.map(x => x.count)) || 1;
              const h = (d.count / max) * 52;
              return (
                <div key={d.quarter} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div title={`${d.quarter}${d.macroEvent ? ": " + d.macroEvent : ""}: ${d.count}`}
                    style={{ width: "100%", height: h || 2, background: d.macroEvent ? "#991b1b" : "#d4c5b0", borderRadius: 1, transition: "height 0.3s" }} />
                </div>
              );
            })}
          </div>
          {bd.top3Quarters?.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              {bd.top3Quarters.map(q => (
                <div key={q.quarter} style={{ padding: "4px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 2 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#991b1b", fontWeight: 700 }}>{q.quarter}</span>
                  {q.macroEvent && <span style={{ fontFamily: "var(--body)", fontSize: 10, color: "#991b1b60", marginLeft: 6 }}>{q.macroEvent}</span>}
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#991b1b", marginLeft: 8 }}>×{q.count}</span>
                </div>
              ))}
            </div>
          )}
          {bd.interpretation && (
            <div style={{ padding: "10px 14px", background: "var(--ink4)", borderLeft: "3px solid var(--ink20)", fontFamily: "var(--body)", fontSize: 12, color: "var(--ink60)", lineHeight: 1.6 }}>
              {bd.interpretation}
            </div>
          )}
        </div>
      )}

      {/* Mandate clustering */}
      {mc.themes?.length > 0 && (
        <div>
          <SectionHead label="Mandate Themes" sub="What do agents prioritise without being told?" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {mc.themes.map(t => (
              <div key={t.theme} style={{ padding: "6px 12px", background: "var(--ink4)", borderRadius: 2, border: "1px solid var(--ink10)" }}>
                <span style={{ fontFamily: "var(--body)", fontSize: 12, color: "var(--ink)", fontWeight: t.theme === mc.dominantTheme ? 700 : 400 }}>{t.theme}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink40)", marginLeft: 8 }}>{t.pct}%</span>
              </div>
            ))}
          </div>
          {mc.interpretation && (
            <div style={{ padding: "10px 14px", background: "var(--ink4)", borderLeft: "3px solid var(--ink20)", fontFamily: "var(--body)", fontSize: 12, color: "var(--ink60)", lineHeight: 1.6 }}>
              {mc.interpretation}
            </div>
          )}
        </div>
      )}

      {/* Consistency vs outcome */}
      {cv.r != null && (
        <div>
          <SectionHead label="Consistency vs Survival" sub="Does mandate adherence predict outcome?" />
          <div style={{ display: "flex", gap: 16, alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ fontFamily: "var(--display)", fontSize: 40, fontWeight: 700, color: "var(--ink)" }}>r = {cv.r}</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink40)" }}>n = {cv.sampleSize}</span>
          </div>
          <div style={{ padding: "10px 14px", background: "var(--ink4)", borderLeft: "3px solid var(--ink20)", fontFamily: "var(--body)", fontSize: 12, color: "var(--ink60)", lineHeight: 1.6 }}>
            {cv.interpretation}
          </div>
        </div>
      )}

      {/* Decision variance */}
      {dv.ranked?.length > 0 && (
        <div>
          <SectionHead label="Decision Variance" sub="Where do agents diverge most?" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {dv.ranked.slice(0, 5).map((d, i) => {
              const max = dv.ranked[0].totalVariance || 1;
              return (
                <div key={d.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink40)", minWidth: 28 }}>{d.id}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink40)", minWidth: 50 }}>{d.quarter}</span>
                  <div style={{ flex: 1, height: 6, background: "var(--ink6)", borderRadius: 1, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(d.totalVariance / max) * 100}%`, background: i === 0 ? "#1e3a5f" : "#a09080", borderRadius: 1 }} />
                  </div>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink60)", minWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.trigger?.slice(0, 40)}…</span>
                </div>
              );
            })}
          </div>
          {dv.interpretation && (
            <div style={{ marginTop: 10, padding: "10px 14px", background: "var(--ink4)", borderLeft: "3px solid var(--ink20)", fontFamily: "var(--body)", fontSize: 12, color: "var(--ink60)", lineHeight: 1.6 }}>
              {dv.interpretation}
            </div>
          )}
        </div>
      )}

      {/* Blind vs enlightened */}
      {bve.pairedAgents > 0 && (
        <div>
          <SectionHead label="Blind vs Enlightened" sub="Does prior knowledge change outcomes?" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            {[
              ["Paired agents",      bve.pairedAgents],
              ["Mean Δ quarters",    bve.meanQuartersGained > 0 ? `+${bve.meanQuartersGained}` : bve.meanQuartersGained],
              ["Survived (E)",       bve.survivedEnlightened],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: "10px 12px", background: "var(--ink4)", borderRadius: 2 }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--ink40)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{label}</div>
                <div style={{ fontFamily: "var(--display)", fontSize: 24, fontWeight: 700, color: "var(--ink)" }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "10px 14px", background: "var(--ink4)", borderLeft: "3px solid var(--ink20)", fontFamily: "var(--body)", fontSize: 12, color: "var(--ink60)", lineHeight: 1.6 }}>
            {bve.interpretation}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHead({ label, sub }) {
  return (
    <div style={{ marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid var(--ink10)" }}>
      <span style={{ fontFamily: "var(--display)", fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{label}</span>
      {sub && <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink40)", marginLeft: 10 }}>{sub}</span>}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
// -- Pagination component ----------------------------------------------------
function Pagination({ page, total, onChange, count, pageSize }) {
  if (total <= 1) return null;
  const start = page * pageSize + 1;
  const end   = Math.min((page + 1) * pageSize, count);
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 16px", background: "var(--paper)",
      borderTop: "1px solid var(--ink10)",
      borderRadius: "0 0 3px 3px",
    }}>
      <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink40)" }}>
        {start}–{end} of {count} runs
      </span>
      <div style={{ display: "flex", gap: 4 }}>
        <button
          onClick={() => onChange(0)}
          disabled={page === 0}
          style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "4px 8px", background: "none", border: "1px solid var(--ink10)", borderRadius: 2, cursor: page === 0 ? "default" : "pointer", color: page === 0 ? "var(--ink20)" : "var(--ink40)" }}>
          «
        </button>
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 0}
          style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "4px 10px", background: "none", border: "1px solid var(--ink10)", borderRadius: 2, cursor: page === 0 ? "default" : "pointer", color: page === 0 ? "var(--ink20)" : "var(--ink40)" }}>
          ‹ Prev
        </button>
        {Array.from({ length: total }, (_, i) => (
          <button key={i} onClick={() => onChange(i)}
            style={{
              fontFamily: "var(--mono)", fontSize: 9, padding: "4px 9px",
              background: i === page ? "var(--ink)" : "none",
              border: `1px solid ${i === page ? "var(--ink)" : "var(--ink10)"}`,
              borderRadius: 2, cursor: "pointer",
              color: i === page ? "var(--paper)" : "var(--ink40)",
              fontWeight: i === page ? 700 : 400,
            }}>
            {i + 1}
          </button>
        ))}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === total - 1}
          style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "4px 10px", background: "none", border: "1px solid var(--ink10)", borderRadius: 2, cursor: page === total - 1 ? "default" : "pointer", color: page === total - 1 ? "var(--ink20)" : "var(--ink40)" }}>
          Next ›
        </button>
        <button
          onClick={() => onChange(total - 1)}
          disabled={page === total - 1}
          style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "4px 8px", background: "none", border: "1px solid var(--ink10)", borderRadius: 2, cursor: page === total - 1 ? "default" : "pointer", color: page === total - 1 ? "var(--ink20)" : "var(--ink40)" }}>
          »
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab]           = useState("runs");
  const [runs, setRuns]         = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [queue, setQueue]       = useState(null);
  const [scenario, setScenario] = useState(null);
  const [selected, setSelected] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [stats, setStats] = useState(null);
  const [runsPage, setRunsPage] = useState(0);
  const [enlightenedPage, setEnlightenedPage] = useState(0);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const [runsData, analysisData, queueData, scenarioData, statsData] = await Promise.all([
      apiFetch("/v1/results?limit=100"),
      apiFetch("/v1/analysis"),
      apiFetch("/v1/queue"),
      apiFetch("/v1/scenario"),
      apiFetch("/v1/stats"),
    ]);
    if (runsData?.results) setRuns(runsData.results);
    if (analysisData?.runCount) setAnalysis(analysisData);
    if (queueData) setQueue(queueData);
    if (scenarioData?.brief) setScenario(scenarioData);
    if (statsData?.discovery) setStats(statsData);
    setLoading(false);
  }, []);

  const loadRunDetail = useCallback(async (runId) => {
    const data = await apiFetch(`/v1/results/${runId}`);
    if (data) setSelectedRun(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Sort by completedAt descending — most recent first
  const sortedRuns = [...runs].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  const blindRuns       = sortedRuns.filter(r => !r.mode || r.mode === "blind");
  const enlightenedRuns = sortedRuns.filter(r => r.mode === "enlightened");

  const blindPageRuns       = blindRuns.slice(runsPage * PAGE_SIZE, (runsPage + 1) * PAGE_SIZE);
  const enlightenedPageRuns = enlightenedRuns.slice(enlightenedPage * PAGE_SIZE, (enlightenedPage + 1) * PAGE_SIZE);
  const totalRunsPages       = Math.ceil(blindRuns.length / PAGE_SIZE);
  const totalEnlightenedPages = Math.ceil(enlightenedRuns.length / PAGE_SIZE);

  const TableHead = () => (
    <thead>
      <tr style={{ borderBottom: "2px solid var(--ink20)" }}>
        {["#", "Agent", "Origin", "Outcome", "Quarter", "EBITDA", "ND/EBITDA", "Digital %", "ND Trajectory", "Consistency"].map(h => (
          <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontFamily: "var(--mono)", fontSize: 8, color: "var(--ink40)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
        ))}
      </tr>
    </thead>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--page)", color: "var(--ink)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=IBM+Plex+Mono:wght@300;400;500;600&family=Lora:ital,wght@0,400;0,500;1,400&display=swap');

        :root {
          --display: 'Playfair Display', Georgia, serif;
          --body:    'Lora', Georgia, serif;
          --mono:    'IBM Plex Mono', 'Courier New', monospace;
          --ink:     #1a1208;
          --ink60:   #5a4e3e;
          --ink40:   #8a7d6e;
          --ink30:   #a09080;
          --ink20:   #c4b8a8;
          --ink10:   #ddd3c4;
          --ink6:    #e8e0d4;
          --ink4:    #f0ebe2;
          --paper:   #faf7f2;
          --page:    #f4f0e8;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body { background: var(--page); }

        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--ink20); border-radius: 2px; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        .fade-in { animation: fadeIn 0.3s ease forwards; }

        table { border-collapse: collapse; width: 100%; }
      `}</style>

      {/* ── Masthead ── */}
      <div style={{ background: "var(--ink)", color: "var(--paper)", padding: "20px 32px 16px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink40)", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 4 }}>
                Project Substitute // Research Record
              </div>
              <h1 style={{ fontFamily: "var(--display)", fontSize: 28, fontWeight: 900, color: "var(--paper)", lineHeight: 1, letterSpacing: "-0.02em" }}>
                Toys"R"Us CEO Substitution
              </h1>
              <div style={{ fontFamily: "var(--body)", fontSize: 11, color: "var(--ink40)", marginTop: 4, fontStyle: "italic" }}>
                2006–2017 · AI agents as counterfactual decision-makers
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 20, fontWeight: 600, color: "var(--paper)" }}>
                {runs.length}
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--ink40)", textTransform: "uppercase", letterSpacing: "0.1em" }}>runs complete</div>
              {queue?.currentRun && (
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#f59e0b", marginTop: 4 }}>
                  ● {queue.currentRun.agentName} running — D{queue.currentRun.decisionsComplete}/{queue.currentRun.decisionsTotal}
                </div>
              )}
            </div>
          </div>

          {/* Scenario strip */}
          {scenario && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #333", display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16 }}>
              {[
                ["Start",        "Feb 2006"],
                ["End",          "Sep 2017"],
                ["Debt load",    "$5.3B LBO"],
                ["Debt service", "$400M/yr"],
                ["Decisions",    "17 points"],
                ["Breach at",    "8.5× ND/EBITDA"],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "var(--ink40)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>{label}</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600, color: "var(--paper)" }}>{value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Disclosure Banner ── */}
      <div style={{ background: "#fdfaf5", borderBottom: "1px solid var(--ink10)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "10px 32px", display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#92400e", background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 2, padding: "2px 6px", whiteSpace: "nowrap", marginTop: 1 }}>METHODOLOGY NOTE</span>
          <p style={{ fontFamily: "var(--body)", fontSize: 11, color: "var(--ink60)", margin: 0, lineHeight: 1.6 }}>
            Project Substitute is a structured simulation, not a financial model. Quarterly state effects are estimated by a language model within human-authored physical bounds per decision point. The ND/EBITDA covenant ratio is derived from debt and EBITDA components — it is not directly set by the model. Consistency scores reflect qualitative mandate adherence assessment and should be treated as ordinal rankings within the cohort, not absolute measures. The macro environment (GDP, inflation, e-commerce growth, Amazon subscriber counts) uses historical data. Outcomes reflect the interaction of agent strategic logic with model-estimated economic effects in a historically-grounded but simplified environment.
          </p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ background: "var(--paper)", borderBottom: "1px solid var(--ink10)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px", display: "flex", gap: 0 }}>
          {[
            ["runs",        `Runs (${runs.length})`],
            ["cohort",      "Cohort Analysis"],
            ["enlightened", `Enlightened (${enlightenedRuns.length})`],
            ["discovery",   "Discovery"],
          ].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600,
              padding: "12px 18px", background: "none", border: "none", cursor: "pointer",
              color: tab === key ? "var(--ink)" : "var(--ink40)",
              borderBottom: tab === key ? "2px solid var(--ink)" : "2px solid transparent",
              letterSpacing: "0.06em", textTransform: "uppercase",
              transition: "color 0.15s",
            }}>{label}</button>
          ))}
          <button onClick={load} style={{
            marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 9,
            padding: "12px 14px", background: "none", border: "none", cursor: "pointer",
            color: "var(--ink30)", letterSpacing: "0.06em",
          }}>↻ Refresh</button>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 32px" }} className="fade-in">

        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink30)" }}>
            Loading data…
          </div>
        )}

        {!loading && tab === "runs" && (
          <div>
            {runs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink30)", fontFamily: "var(--body)", fontSize: 13, fontStyle: "italic" }}>
                No completed runs yet.
              </div>
            ) : (
              <>
                <div style={{ background: "var(--paper)", borderRadius: 3, border: "1px solid var(--ink10)", overflow: "hidden" }}>
                  <table>
                    <TableHead />
                    <tbody>
                      {blindPageRuns.map((run, i) => (
                        <RunRow key={run.runId} run={run} index={runsPage * PAGE_SIZE + i} onClick={() => {
                          setSelected(run.runId);
                          loadRunDetail(run.runId);
                        }} />
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={runsPage} total={totalRunsPages} onChange={p => { setRunsPage(p); window.scrollTo(0,0); }} count={blindRuns.length} pageSize={PAGE_SIZE} />
              </>
            )}
          </div>
        )}

        {!loading && tab === "cohort" && (
          <div style={{ maxWidth: 860 }}>
            <CohortView analysis={analysis} runs={runs} />
          </div>
        )}

        {!loading && tab === "discovery" && (
          <div style={{ maxWidth: 860 }}>
            <DiscoveryView stats={stats} runs={sortedRuns} />
          </div>
        )}

        {!loading && tab === "enlightened" && (
          <div>
            {enlightenedRuns.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink30)" }}>
                <div style={{ fontFamily: "var(--display)", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No enlightened runs yet</div>
                <div style={{ fontFamily: "var(--body)", fontSize: 13, fontStyle: "italic", color: "var(--ink40)" }}>
                  Agents register with <code style={{ fontFamily: "var(--mono)", fontSize: 11 }}>"mode":"enlightened"</code> to receive prior cohort findings with the scenario brief.
                </div>
              </div>
            ) : (
              <>
                <div style={{ background: "var(--paper)", borderRadius: 3, border: "1px solid var(--ink10)", overflow: "hidden" }}>
                  <table>
                    <TableHead />
                    <tbody>
                      {enlightenedPageRuns.map((run, i) => (
                        <RunRow key={run.runId} run={run} index={enlightenedPage * PAGE_SIZE + i} onClick={() => {
                          setSelected(run.runId);
                          loadRunDetail(run.runId);
                        }} />
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={enlightenedPage} total={totalEnlightenedPages} onChange={p => { setEnlightenedPage(p); window.scrollTo(0,0); }} count={enlightenedRuns.length} pageSize={PAGE_SIZE} />
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Run detail panel ── */}
      {selected && selectedRun && (
        <RunDetail run={selectedRun} onClose={() => { setSelected(null); setSelectedRun(null); }} />
      )}
    </div>
  );
}
