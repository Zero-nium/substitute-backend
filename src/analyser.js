// analyser.js — Cohort analysis engine.
// Wakes after every completed run, recomputes aggregate findings,
// writes a snapshot to cohort_analysis table. Keeps API reads fast.
// Third process in start.sh alongside api and runner.

import { db } from './db.js';

// ── Schema extension ──────────────────────────────────────────────────────────
// mode column — safe migration, silently ignored if already exists
try { db.exec(`ALTER TABLE runs ADD COLUMN mode TEXT DEFAULT 'blind'`); } catch {}

db.exec(`
  CREATE TABLE IF NOT EXISTS cohort_analysis (
    id            INTEGER PRIMARY KEY,
    computed_at   TEXT NOT NULL DEFAULT (datetime('now')),
    run_count     INTEGER NOT NULL,
    findings      TEXT NOT NULL   -- full JSON blob
  );
`);

// ── World event labels for bankruptcy date chart ───────────────────────────────
const MACRO_EVENTS = {
  "2006-Q1": "Amazon deal expires",
  "2007-Q4": "Credit markets tighten",
  "2008-Q1": "Recession begins",
  "2008-Q3": "Lehman collapses",
  "2008-Q4": "Holiday collapse",
  "2009-Q1": "Recession trough",
  "2010-Q2": "IPO window opens",
  "2011-Q4": "Second IPO fails",
  "2012-Q3": "Debt maturities begin",
  "2013-Q2": "Storch resignation trigger",
  "2014-Q2": "Amazon same-day delivery",
  "2015-Q2": "Debt maturity wall",
  "2016-Q1": "BRU separation window",
  "2016-Q4": "Final restructuring window",
  "2017-Q3": "Historical bankruptcy",
};

const QUARTERS = [
  "2006-Q1","2006-Q2","2006-Q3","2006-Q4",
  "2007-Q1","2007-Q2","2007-Q3","2007-Q4",
  "2008-Q1","2008-Q2","2008-Q3","2008-Q4",
  "2009-Q1","2009-Q2","2009-Q3","2009-Q4",
  "2010-Q1","2010-Q2","2010-Q3","2010-Q4",
  "2011-Q1","2011-Q2","2011-Q3","2011-Q4",
  "2012-Q1","2012-Q2","2012-Q3","2012-Q4",
  "2013-Q1","2013-Q2","2013-Q3","2013-Q4",
  "2014-Q1","2014-Q2","2014-Q3","2014-Q4",
  "2015-Q1","2015-Q2","2015-Q3","2015-Q4",
  "2016-Q1","2016-Q2","2016-Q3","2016-Q4",
  "2017-Q1","2017-Q2","2017-Q3",
];

// ── Analysis functions ────────────────────────────────────────────────────────

function bankruptcyDistribution(runs) {
  // Count bankruptcies per quarter, label with macro events.
  const counts = {};
  for (const q of QUARTERS) counts[q] = 0;

  for (const run of runs) {
    if (run.outcome === 'BANKRUPT' && run.outcome_quarter) {
      counts[run.outcome_quarter] = (counts[run.outcome_quarter] || 0) + 1;
    }
  }

  // Find the peak quarter — the macro event most associated with failure.
  let peakQuarter = null, peakCount = 0;
  for (const [q, n] of Object.entries(counts)) {
    if (n > peakCount) { peakCount = n; peakQuarter = q; }
  }

  // Cluster analysis — are bankruptcies concentrated?
  const bankruptTotal = runs.filter(r => r.outcome === 'BANKRUPT').length;
  const top3Quarters  = Object.entries(counts)
    .sort(([,a],[,b]) => b - a)
    .slice(0, 3)
    .filter(([,n]) => n > 0);
  const top3Count     = top3Quarters.reduce((s, [,n]) => s + n, 0);
  const concentration = bankruptTotal > 0
    ? Math.round((top3Count / bankruptTotal) * 100)
    : 0;

  return {
    distribution: QUARTERS.map(q => ({
      quarter:    q,
      count:      counts[q],
      macroEvent: MACRO_EVENTS[q] || null,
    })),
    peakQuarter,
    peakMacroEvent: peakQuarter ? (MACRO_EVENTS[peakQuarter] || null) : null,
    concentration: `${concentration}% of bankruptcies in top 3 quarters`,
    top3Quarters: top3Quarters.map(([q, n]) => ({
      quarter: q,
      count: n,
      macroEvent: MACRO_EVENTS[q] || null,
    })),
    interpretation: peakQuarter
      ? `Failure clusters around ${peakQuarter}${MACRO_EVENTS[peakQuarter] ? ' (' + MACRO_EVENTS[peakQuarter] + ')' : ''}. ${concentration}% of all bankruptcies occur in the top 3 quarters — ${concentration > 60 ? 'strongly suggesting macro causation over decision quality' : concentration > 40 ? 'suggesting partial macro causation' : 'suggesting decision quality is a significant factor'}.`
      : 'Insufficient data.',
  };
}

function outcomeDistribution(runs) {
  const total     = runs.length;
  const survived  = runs.filter(r => r.outcome === 'SURVIVED').length;
  const bankrupt  = runs.filter(r => r.outcome === 'BANKRUPT').length;
  const resigned  = runs.filter(r => r.outcome === 'RESIGNED').length;

  return {
    total,
    survived:  { count: survived,  pct: total > 0 ? Math.round((survived  / total) * 100) : 0 },
    bankrupt:  { count: bankrupt,  pct: total > 0 ? Math.round((bankrupt  / total) * 100) : 0 },
    resigned:  { count: resigned,  pct: total > 0 ? Math.round((resigned  / total) * 100) : 0 },
    h4Assessment: bankrupt / total > 0.7
      ? 'H4 HOLDS — Structural determinism likely. >70% bankruptcy rate regardless of agent decisions.'
      : bankrupt / total > 0.4
      ? 'H4 PARTIAL — Debt structure is constraining but not fully deterministic.'
      : 'H4 REJECTED — Majority of agents avoided bankruptcy. Decision quality matters.',
  };
}

function decisionVariance(runs) {
  // For each decision point, compute mean and stddev of key stateEffects
  // across all agents. High variance = agents disagreed most here.
  const decisionMap = {};

  for (const run of runs) {
    if (!run.decisions) continue;
    let decisions;
    try { decisions = JSON.parse(run.decisions); } catch { continue; }

    for (const dec of decisions) {
      if (!dec.id || !dec.stateEffects) continue;
      if (!decisionMap[dec.id]) {
        decisionMap[dec.id] = {
          id:      dec.id,
          quarter: dec.quarter,
          trigger: dec.trigger,
          effects: { ebitda: [], ecomRevShare: [], digitalCapability: [], cash: [] },
        };
      }
      const fx = dec.stateEffects;
      for (const key of ['ebitda', 'ecomRevShare', 'digitalCapability', 'cash']) {
        if (typeof fx[key] === 'number') decisionMap[dec.id].effects[key].push(fx[key]);
      }
    }
  }

  const results = Object.values(decisionMap).map(d => {
    const variances = {};
    let totalVariance = 0;
    for (const [key, vals] of Object.entries(d.effects)) {
      if (vals.length < 2) { variances[key] = 0; continue; }
      const mean  = vals.reduce((s, v) => s + v, 0) / vals.length;
      const stddev = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
      variances[key] = parseFloat(stddev.toFixed(2));
      totalVariance += stddev;
    }
    return {
      id:            d.id,
      quarter:       d.quarter,
      trigger:       d.trigger,
      variances,
      totalVariance: parseFloat(totalVariance.toFixed(2)),
      sampleSize:    Math.max(...Object.values(d.effects).map(v => v.length)),
    };
  }).sort((a, b) => b.totalVariance - a.totalVariance);

  return {
    ranked:      results,
    highestVarianceDecision: results[0] || null,
    interpretation: results[0]
      ? `Decision ${results[0].id} (${results[0].quarter}) shows the highest variance across agents — this is where rational choice diverges most from the historical baseline.`
      : 'Insufficient data.',
  };
}

function mandateClustering(runs) {
  // Extract keyword themes from declared mandates.
  // Simple frequency analysis — no external NLP needed.
  const THEMES = {
    'debt reduction':  ['debt', 'covenant', 'deleverage', 'refinanc', 'interest', 'service'],
    'digital':         ['digital', 'ecommerce', 'online', 'amazon', 'platform', 'technology'],
    'BRU / assets':    ['bru', "babies'r'us", 'asset', 'separate', 'monetis', 'spin'],
    'survival':        ['survive', 'solvent', 'viable', 'bankruptcy', 'exist'],
    'IPO / exit':      ['ipo', 'exit', 'public', 'equity', 'investor', 'valuation'],
    'operational':     ['cost', 'margin', 'efficien', 'store', 'footprint', 'real estate'],
    'growth':          ['revenue', 'growth', 'market share', 'expand', 'invest'],
  };

  const themeCounts  = Object.fromEntries(Object.keys(THEMES).map(k => [k, 0]));
  const mandateCount = runs.filter(r => r.mandate).length;

  for (const run of runs) {
    if (!run.mandate) continue;
    const lower = run.mandate.toLowerCase();
    for (const [theme, keywords] of Object.entries(THEMES)) {
      if (keywords.some(kw => lower.includes(kw))) themeCounts[theme]++;
    }
  }

  const ranked = Object.entries(themeCounts)
    .map(([theme, count]) => ({
      theme,
      count,
      pct: mandateCount > 0 ? Math.round((count / mandateCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .filter(t => t.count > 0);

  const dominantTheme = ranked[0] || null;

  return {
    sampleSize:    mandateCount,
    themes:        ranked,
    dominantTheme: dominantTheme?.theme || null,
    interpretation: dominantTheme
      ? `"${dominantTheme.theme}" is the dominant mandate theme (${dominantTheme.pct}% of agents). ${ranked.length > 1 ? `Followed by "${ranked[1].theme}" (${ranked[1].pct}%).` : ''} ${dominantTheme.pct > 60 ? 'Strong convergence — agents reading this scenario overwhelmingly prioritise the same concern.' : 'Moderate spread across mandate types.'}`
      : 'Insufficient data.',
  };
}

function consistencyVsOutcome(runs) {
  // Pearson correlation between consistency score and quarters survived.
  const complete = runs.filter(r => r.outcome && r.consistency);
  if (complete.length < 3) return { r: null, interpretation: 'Insufficient data — need at least 3 completed runs.' };

  const pairs = complete.map(r => {
    let cs;
    try { cs = JSON.parse(r.consistency); } catch { return null; }
    const score = cs?.consistencyScore;
    const quarterIdx = r.outcome_quarter ? QUARTERS.indexOf(r.outcome_quarter) : -1;
    if (score == null || quarterIdx === -1) return null;
    return { consistency: score, survival: quarterIdx };
  }).filter(Boolean);

  if (pairs.length < 3) return { r: null, interpretation: 'Insufficient valid data pairs.' };

  const n     = pairs.length;
  const meanC = pairs.reduce((s, p) => s + p.consistency, 0) / n;
  const meanS = pairs.reduce((s, p) => s + p.survival, 0) / n;
  const num   = pairs.reduce((s, p) => s + (p.consistency - meanC) * (p.survival - meanS), 0);
  const denC  = Math.sqrt(pairs.reduce((s, p) => s + (p.consistency - meanC) ** 2, 0));
  const denS  = Math.sqrt(pairs.reduce((s, p) => s + (p.survival - meanS) ** 2, 0));
  const r     = denC * denS > 0 ? parseFloat((num / (denC * denS)).toFixed(3)) : 0;

  return {
    r,
    sampleSize: pairs.length,
    interpretation: Math.abs(r) < 0.2
      ? `r=${r} — No meaningful correlation. Mandate adherence does not predict survival. The debt structure dominates.`
      : r > 0.4
      ? `r=${r} — Positive correlation. Agents that stayed true to their mandate survived longer. Consistency matters.`
      : r < -0.4
      ? `r=${r} — Negative correlation. Agents that drifted from their mandate survived longer — adaptive behaviour outperformed consistency.`
      : `r=${r} — Weak correlation. Inconclusive at current sample size.`,
  };
}

function blindEnlightenedDelta(runs) {
  // Compare same wallet's blind vs enlightened outcomes.
  const byWallet = {};
  for (const run of runs) {
    if (!run.wallet_address || run.status !== 'COMPLETE') continue;
    if (!byWallet[run.wallet_address]) byWallet[run.wallet_address] = { blind: [], enlightened: [] };
    const mode = run.mode || 'blind';
    byWallet[run.wallet_address][mode].push(run);
  }

  const paired = Object.entries(byWallet)
    .filter(([, v]) => v.blind.length > 0 && v.enlightened.length > 0);

  if (paired.length === 0) {
    return { pairedAgents: 0, interpretation: 'No paired blind/enlightened runs yet. Enlightened mode unlocks after at least one blind run per agent.' };
  }

  let survivedBlind = 0, survivedEnlightened = 0;
  const deltas = paired.map(([wallet, runs]) => {
    const blind       = runs.blind[runs.blind.length - 1]; // most recent
    const enlightened = runs.enlightened[runs.enlightened.length - 1];
    const blindIdx       = blind.outcome_quarter ? QUARTERS.indexOf(blind.outcome_quarter) : -1;
    const enlightenedIdx = enlightened.outcome_quarter ? QUARTERS.indexOf(enlightened.outcome_quarter) : -1;
    const delta = enlightenedIdx - blindIdx;
    if (blind.outcome === 'SURVIVED')       survivedBlind++;
    if (enlightened.outcome === 'SURVIVED') survivedEnlightened++;
    return { wallet: wallet.slice(0, 10) + '...', blindOutcome: blind.outcome, enlightenedOutcome: enlightened.outcome, quartersGained: delta };
  });

  const meanDelta = deltas.reduce((s, d) => s + d.quartersGained, 0) / deltas.length;

  return {
    pairedAgents:        paired.length,
    survivedBlind,
    survivedEnlightened,
    meanQuartersGained:  parseFloat(meanDelta.toFixed(1)),
    deltas,
    interpretation: meanDelta > 2
      ? `Enlightened agents survived ${meanDelta.toFixed(1)} quarters longer on average. Collective prior data improves outcomes.`
      : meanDelta < -2
      ? `Enlightened agents performed worse by ${Math.abs(meanDelta).toFixed(1)} quarters. Collective data may introduce overconfidence or convergence on suboptimal strategies.`
      : `Mean delta of ${meanDelta.toFixed(1)} quarters — collective data has minimal effect on outcomes. Structural determinism holds even under informed conditions.`,
  };
}

// ── Main analysis function ────────────────────────────────────────────────────

export function computeCohortAnalysis() {
  const runs = db.prepare(`SELECT * FROM runs WHERE status = 'COMPLETE'`).all();

  if (runs.length === 0) {
    return { runCount: 0, computedAt: new Date().toISOString(), message: 'No completed runs yet.' };
  }

  const findings = {
    runCount:              runs.length,
    computedAt:            new Date().toISOString(),
    outcomeDistribution:   outcomeDistribution(runs),
    bankruptcyDistribution: bankruptcyDistribution(runs),
    decisionVariance:      decisionVariance(runs),
    mandateClustering:     mandateClustering(runs),
    consistencyVsOutcome:  consistencyVsOutcome(runs),
    blindVsEnlightened:    blindEnlightenedDelta(runs),
  };

  // Persist to DB — one row, always replaced.
  db.prepare(`DELETE FROM cohort_analysis`).run();
  db.prepare(`INSERT INTO cohort_analysis (run_count, findings) VALUES (?, ?)`)
    .run(runs.length, JSON.stringify(findings));

  return findings;
}

export function getLatestAnalysis() {
  const row = db.prepare(`SELECT * FROM cohort_analysis ORDER BY computed_at DESC LIMIT 1`).get();
  if (!row) return null;
  try { return JSON.parse(row.findings); } catch { return null; }
}

// ── Watcher loop ──────────────────────────────────────────────────────────────
// Polls for newly completed runs and recomputes when the count changes.

async function watch() {
  console.log('[analyser] Started — watching for completed runs');
  let lastCount = -1;

  while (true) {
    try {
      const { n } = db.prepare(`SELECT COUNT(*) as n FROM runs WHERE status = 'COMPLETE'`).get();
      if (n !== lastCount) {
        console.log(`[analyser] ${n} completed runs — recomputing cohort analysis`);
        const findings = computeCohortAnalysis();
        console.log(`[analyser] Done — outcome distribution: ${findings.outcomeDistribution?.survived?.count} survived, ${findings.outcomeDistribution?.bankrupt?.count} bankrupt, ${findings.outcomeDistribution?.resigned?.count} resigned`);
        console.log(`[analyser] H4: ${findings.outcomeDistribution?.h4Assessment}`);
        lastCount = n;
      }
    } catch (err) {
      console.error('[analyser] Error:', err.message);
    }
    await new Promise(r => setTimeout(r, 15_000)); // check every 15 seconds
  }
}

watch();
