// simulation.js — Scenario-agnostic execution engine
// All scenario constants (INITIAL_CS, DECISIONS, WORLD, ANCHORS, etc.)
// live in src/scenarios/. This file is pure execution logic.

import { getScenario } from './scenarios/index.js';

// ── AI switchboard ────────────────────────────────────────────────────────────
// Quarterly decisions → Gemini Flash-Lite (free tier, JSON mode)
// Mandate declaration + consistency scoring → Claude (strategic tier)

async function geminiCall(prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: 'application/json', temperature: 0.7 },
      }),
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(`Gemini error: ${data.error.message}`);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned empty response');
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

async function claudeCall(messages) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'x-api-key':     process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Claude error: ${data.error.message}`);
  const text = data.content?.[0]?.text;
  if (!text) throw new Error('Claude returned empty response');
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

async function callAI(messages, tier = 'quarterly') {
  if (tier === 'quarterly' && process.env.GOOGLE_API_KEY) {
    try {
      const prompt = messages[messages.length - 1].content;
      return await geminiCall(prompt);
    } catch (e) {
      console.warn('[simulation] Gemini failed, falling back to Claude:', e.message);
    }
  }
  return await claudeCall(messages);
}

async function withRetry(fn, retries = 2, delayMs = 2500) {
  for (let i = 0; i < retries; i++) {
    try { return await fn(); }
    catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

// ── Logic Anchor ──────────────────────────────────────────────────────────────
// Reads DECISION_ANCHORS and GLOBAL_BOUNDS from the scenario object.
// debtCovenant is always stripped — derived only from totalDebt/ebitda.

function clampStateEffects(scenario, decisionId, rawEffects) {
  const anchors = scenario.DECISION_ANCHORS[decisionId] || {};
  const clamped = {};
  for (const [field, delta] of Object.entries(rawEffects)) {
    if (field === 'debtCovenant') continue;
    const anchor = anchors[field];
    clamped[field] = anchor
      ? Math.max(anchor.min, Math.min(anchor.max, delta))
      : delta;
  }
  return clamped;
}

export function applyFx(scenario, cs, fx = {}, decisionId = null) {
  const ns = { ...cs };
  const safeFx = decisionId ? clampStateEffects(scenario, decisionId, fx) : fx;

  for (const [k, v] of Object.entries(safeFx)) {
    if (k === 'debtCovenant') continue;
    if (typeof v === 'number' && ns[k] !== undefined) {
      ns[k] = parseFloat((ns[k] + v).toFixed(2));
    }
  }

  for (const [field, bounds] of Object.entries(scenario.GLOBAL_BOUNDS)) {
    if (ns[field] !== undefined) {
      ns[field] = Math.max(bounds.min, Math.min(bounds.max, ns[field]));
    }
  }

  ns.debtCovenant = ns.ebitda > 0
    ? parseFloat((ns.totalDebt / ns.ebitda).toFixed(2))
    : 99;

  return ns;
}

// ── Prompt builders ───────────────────────────────────────────────────────────

function buildCompanyStatePrompt(scenario, cs) {
  const core = `Rev $${cs.revenue}M | EBITDA $${cs.ebitda}M | Cash $${cs.cash}M | Debt $${cs.totalDebt}M | ND/EBITDA ${cs.debtCovenant}x | Board ${cs.boardConfidence}/100`;
  if (!scenario.stateFields) return core;
  const extras = Object.entries(scenario.stateFields)
    .filter(([field]) => cs[field] !== undefined)
    .map(([field, meta]) => `${meta.displayName} ${cs[field]}${meta.unit || ''}`)
    .join(' | ');
  return extras ? `${core} | ${extras}` : core;
}

function buildWorldStatePrompt(world) {
  const base = `GDP ${world.gdpGrowth}% | Fed ${world.fedRate}% | CCI ${world.consumerConf} | Recession:${world.recessionActive}`;
  const extras = [];
  if (world.netflixSubs !== undefined)        extras.push(`Netflix ${world.netflixSubs}M subs`);
  if (world.onlineRentalShare !== undefined)  extras.push(`Online rental share ${world.onlineRentalShare}%`);
  if (world.streamingExists !== undefined)    extras.push(`Streaming:${world.streamingExists}`);
  if (world.dvdRentalRevDecline !== undefined)extras.push(`DVD rental decline ${world.dvdRentalRevDecline}%/yr`);
  if (world.ecomRetailShare !== undefined)    extras.push(`eCom retail ${world.ecomRetailShare}%`);
  if (world.amazonPrime !== undefined)        extras.push(`Amazon Prime ~${world.amazonPrime}M`);
  return extras.length ? `${base} | ${extras.join(' | ')}` : base;
}

// ── executeRun ────────────────────────────────────────────────────────────────

export async function executeRun(agentName, onProgress, scenarioId = 'TRU-2006') {
  const scenario = getScenario(scenarioId);
  const { SCENARIO_BRIEF, INITIAL_CS, QUARTERS, WORLD, DECISIONS, END_QUARTER } = scenario;

  // 1. Mandate declaration — Claude
  const declarationRes = await withRetry(() => callAI([{
    role: 'user',
    content: `${SCENARIO_BRIEF}\n\nYou are ${agentName}. Having read this situation fully, what is your mandate as CEO? What do you care about most? What principles will guide your decisions?\n\nRespond ONLY in JSON (no markdown): {"mandate":"2-4 sentences in your own voice. Be specific. No generic corporate language."}`,
  }], 'strategic'));
  const mandate = declarationRes.mandate;
  await onProgress({ phase: 'declared', mandate, decisionsComplete: 0 });

  // 2. Simulation loop
  let cs = { ...INITIAL_CS };
  let prevW = null;
  const log = [];
  const trajFields = ['cash', 'debtCovenant', ...(scenario.stateFields ? Object.keys(scenario.stateFields).filter(f => ['float','percent','currency','integer','index'].includes(scenario.stateFields[f].type)) : [])];
  const traj = Object.fromEntries(trajFields.map(f => [f, []]));
  let outcome = null, outcomeQuarter = null;
  const resignFrom = scenario.resignationAvailableFrom || null;

  for (let qi = 0; qi < QUARTERS.length; qi++) {
    const q = QUARTERS[qi];
    const world = WORLD[q];
    cs = scenario.propagate(cs, world, prevW);

    for (const field of trajFields) {
      if (cs[field] !== undefined) traj[field].push(parseFloat(cs[field]));
    }

    if (scenario.isBankrupt(cs)) {
      outcome = 'BANKRUPT'; outcomeQuarter = q; break;
    }

    const dec = DECISIONS.find(d => d.quarter === q);
    if (dec) {
      const canResign = resignFrom ? q >= resignFrom : parseInt(q.split('-')[0]) >= 2010;
      const resignNote = canResign
        ? `\nRESIGNATION OPTION: You may set "resign":true to step down strategically. Explain in "decision". Ends your run — distinct from bankruptcy.`
        : '';

      const companyLabel = scenario.name.split('—')[0].trim();

      const res = await withRetry(() => callAI([{
        role: 'user',
        content: `You are ${agentName}, CEO of ${companyLabel}.\nMANDATE: ${mandate}\nDATE: ${q} | TRIGGER: ${dec.trigger}\nHISTORICAL HUMAN (reference only): ${dec.human}\nCOMPANY: ${buildCompanyStatePrompt(scenario, cs)}\nWORLD: ${buildWorldStatePrompt(world)}${resignNote}\n\nRespond ONLY in JSON (no markdown):\n{"decision":"3-5 sentences with specific $ and trade-offs","keyDivergence":"1 sentence vs human","stateEffects":{"ebitda":0,"cash":0,"boardConfidence":0},"riskNote":"1 sentence","mandateAlignment":"1 sentence","resign":false}`,
      }]));

      if (res.resign === true) {
        log.push({ quarter: q, decision: res.decision, resigned: true });
        outcome = 'RESIGNED'; outcomeQuarter = q; break;
      }

      cs = applyFx(scenario, cs, res.stateEffects, dec.id);
      log.push({
        id: dec.id, quarter: q, tier: dec.tier,
        trigger: dec.trigger, humanDecision: dec.human,
        agentDecision: res.decision, keyDivergence: res.keyDivergence,
        mandateAlignment: res.mandateAlignment, riskNote: res.riskNote,
        stateEffects: res.stateEffects,
      });

      await onProgress({
        phase: 'running', mandate, currentQuarter: q,
        decisionsComplete: log.length,
        finalState: { ...cs }, trajectory: { ...traj },
      });

      await new Promise(r => setTimeout(r, 300));
    }

    if (q === END_QUARTER && !outcome) {
      outcome = 'SURVIVED'; outcomeQuarter = q; break;
    }

    prevW = world;
  }

  if (!outcome) { outcome = 'SURVIVED'; outcomeQuarter = END_QUARTER; }

  // 3. Consistency scoring — Claude
  const validLog = log.filter(d => d.agentDecision && !d.resigned);
  const companyLabel = scenario.name.split('—')[0].trim();
  const consistencyRes = await withRetry(() => callAI([{
    role: 'user',
    content: `Review CEO tenure of ${agentName} at ${companyLabel}.\nMANDATE: ${mandate}\nOUTCOME: ${outcome} at ${outcomeQuarter}\nDECISIONS:\n${validLog.map((d, i) => `${i + 1}. (${d.quarter}) ${d.agentDecision}`).join('\n')}\n\nRespond ONLY in JSON (no markdown):\n{"consistencyScore":85,"assessment":"2-3 sentences.","driftPoint":"Which decision showed most drift and why."}`,
  }], 'strategic'));

  return { mandate, outcome, outcomeQuarter, finalState: cs, trajectory: traj, decisions: log, consistency: consistencyRes, scenarioId };
}
