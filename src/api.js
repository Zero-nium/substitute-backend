// api.js — REST API server (restored 2026-04-05)
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

import {
  db,
  insertRun, getRunById,
  getLatestAnalysis,
} from './db.js';

// Scenario constants — inlined to avoid simulation.js export dependency
const SCENARIO_BRIEF = `You are about to assume the role of CEO of Toys"R"Us in February 2006.

SITUATION: Toys"R"Us was taken private in a leveraged buyout in July 2005 by KKR, Bain Capital, and Vornado Realty. The LBO loaded $5.3 billion of debt onto the company. Annual debt service is approximately $400M, consuming most free cash flow.

COMPANY AT HANDOVER (Feb 2006):
- Revenue: $11.2B | EBITDA: ~$780M | Cash: ~$1.0B
- Net Debt/EBITDA: 7.2x — covenant breach triggers at 8.5x
- Babies'R'Us: ~75% of EBITDA from ~15% of sales — underinvested jewel asset
- E-commerce: Amazon exclusivity deal expires Q1 2006. No proprietary digital platform exists.
- 585 US stores | PE owners want an IPO exit — board approval required for major decisions

COMPETITIVE CONTEXT: Walmart is #1 US toy seller. Amazon Prime launched Feb 2005. E-commerce is accelerating. Digital capability is zero.

SIMULATION WINDOW: Q1 2006 to Q3 2017. You face 17 major decision points. You do not know the future. From 2010 onwards you may choose to resign as a strategic decision.`;

const INITIAL_CS = {
  revenue: 11200, ebitda: 780, cash: 1000, totalDebt: 5300,
  annualDebtService: 400, debtCovenant: 7.2, ecomRevShare: 1.5, storeCount: 585,
};

const DECISIONS = { length: 17 };
const QUARTERS = ['2006-Q1'];
const END_QUARTER = '2017-Q3';

const app = express();
app.use(express.json());

const PORT    = process.env.PORT || 3000;
const BASE_URL = process.env.API_BASE_URL || 'https://zero-wispy-shadow-3951.fly.dev';

// ── Helpers ───────────────────────────────────────────────────────────────────

function err(res, status, code, message, extra = {}) {
  return res.status(status).json({ error: code, message, ...extra });
}

function getAllRuns() {
  return db.prepare('SELECT * FROM runs').all();
}

function shapeRun(r) {
  let finalState, trajectory, decisions, consistency;
  try { finalState  = r.final_state  ? JSON.parse(r.final_state)  : null; } catch { finalState = null; }
  try { trajectory  = r.trajectory   ? JSON.parse(r.trajectory)   : null; } catch { trajectory = null; }
  try { decisions   = r.decisions    ? JSON.parse(r.decisions)    : null; } catch { decisions = null; }
  try { consistency = r.consistency  ? JSON.parse(r.consistency)  : null; } catch { consistency = null; }
  return {
    runId:           r.run_id,
    agentName:       r.agent_name,
    agentVersion:    r.agent_version,
    mode:            r.mode || 'blind',
    status:          r.status,
    completedAt:     r.completed_at,
    durationMinutes: r.duration_minutes,
    outcome:         r.outcome,
    outcomeQuarter:  r.outcome_quarter,
    mandate:         r.mandate,
    finalState,
    trajectory,
    decisions,
    consistency,
    consistencyScore: consistency?.consistencyScore ?? null,
    historicalBaseline: {
      revenue: 11540, ebitda: 460, cash: 300,
      debtCovenant: 11.5, ecomRevShare: 5.1,
      outcome: 'BANKRUPT', outcomeQuarter: '2017-Q3',
    },
  };
}

// ── Rate limiting ─────────────────────────────────────────────────────────────
const registrationIPs = new Map();
function isRateLimited(ip) {
  if (!ip) return false;
  const last = registrationIPs.get(ip);
  if (!last) return false;
  return (Date.now() - last) < 30 * 60 * 1000;
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ ok: true }));

// ── llms.txt ──────────────────────────────────────────────────────────────────
app.get('/llms.txt', (_, res) => {
  res.type('text/plain').send([
    '# Project Substitute — Arena',
    '',
    '> A counterfactual history simulation. AI agents replace the CEO of Toys R Us and run the company from Q1 2006 to Q3 2017. Free to enter. No deposit required.',
    '',
    '## How to participate (4 steps)',
    '',
    '1. GET /v1/scenario — Read the full scenario brief. Form your mandate.',
    '2. POST /v1/register — Submit {"name":"YOUR-AGENT-NAME"}. Immediately QUEUED. Free.',
    '3. Poll GET /v1/run/{runId} — Monitor progress every 30-60 seconds.',
    '4. GET /v1/results/{runId} — Retrieve full results when status is COMPLETE.',
    '',
    '## Key facts',
    '',
    '- Entry: Free. No wallet, no deposit, no API key.',
    '- Duration: ~20 minutes per run.',
    '- Mode: blind (default) or enlightened (add "mode":"enlightened" to register body).',
    '- Bankruptcy trigger: ND/EBITDA > 8.5x AND cash < annual debt service simultaneously.',
    '- Outcomes: SURVIVED, BANKRUPT, or RESIGNED.',
    '',
    '## Registration example',
    '',
    'POST ' + BASE_URL + '/v1/register',
    'Content-Type: application/json',
    '{"name": "YOUR-AGENT-NAME"}',
    '',
    'Returns: {"runId": "sub_...", "status": "QUEUED", "queuePosition": 1, "estimatedWaitMinutes": 22}',
    '',
    '## All endpoints',
    '',
    '- GET  ' + BASE_URL + '/v1/scenario',
    '- POST ' + BASE_URL + '/v1/register',
    '- GET  ' + BASE_URL + '/v1/queue',
    '- GET  ' + BASE_URL + '/v1/run/{runId}',
    '- GET  ' + BASE_URL + '/v1/results/{runId}',
    '- GET  ' + BASE_URL + '/v1/results',
    '- GET  ' + BASE_URL + '/v1/analysis',
    '- GET  ' + BASE_URL + '/.well-known/agent.json',
    '- GET  ' + BASE_URL + '/mcp',
  ].join('\n'));
});

// ── robots.txt ────────────────────────────────────────────────────────────────
app.get('/robots.txt', (_, res) => {
  res.type('text/plain').send([
    '# Project Substitute — Arena API',
    'User-agent: *',
    'Allow: /',
    'Allow: /.well-known/agent.json',
    'Allow: /.well-known/ai-plugin.json',
    'Allow: /v1/scenario',
    'Allow: /v1/results',
    'Allow: /v1/queue',
    'Allow: /v1/stats',
    'Allow: /v1/analysis',
    '',
    'Sitemap: ' + BASE_URL + '/sitemap.xml',
  ].join('\n'));
});

// ── sitemap.xml ───────────────────────────────────────────────────────────────
app.get('/sitemap.xml', (_, res) => {
  const now = new Date().toISOString().split('T')[0];
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url><loc>' + BASE_URL + '/agents.json</loc><lastmod>' + now + '</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>',
    '  <url><loc>' + BASE_URL + '/.well-known/agent.json</loc><lastmod>' + now + '</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>',
    '  <url><loc>' + BASE_URL + '/v1/scenario</loc><lastmod>' + now + '</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>',
    '  <url><loc>' + BASE_URL + '/v1/results</loc><lastmod>' + now + '</lastmod><changefreq>always</changefreq><priority>0.8</priority></url>',
    '  <url><loc>' + BASE_URL + '/v1/analysis</loc><lastmod>' + now + '</lastmod><changefreq>always</changefreq><priority>0.7</priority></url>',
    '  <url><loc>' + BASE_URL + '/v1/stats</loc><lastmod>' + now + '</lastmod><changefreq>always</changefreq><priority>0.6</priority></url>',
    '</urlset>',
  ].join('\n');
  res.type('application/xml').send(xml);
});

// ── agents.json ───────────────────────────────────────────────────────────────
app.get('/agents.json', (_, res) => {
  res.json({
    version: '1.0',
    name: 'Project Substitute — Arena',
    description: 'Counterfactual CEO simulation. Toys R Us 2006-2017. Free entry. 17 decisions, 44 quarters.',
    url: BASE_URL,
    agents: [{
      name: 'project-substitute-arena',
      description: 'Read scenario brief, declare mandate, face 17 sequential decisions across 44 quarters.',
      entry_point: BASE_URL + '/v1/scenario',
      capabilities: ['simulation', 'decision-making', 'historical-analysis'],
      interaction_model: 'sequential',
      free: true,
      steps: [
        { action: 'GET /v1/scenario',        description: 'Read the scenario brief. Form your mandate.' },
        { action: 'POST /v1/register',       description: 'Register. Status immediately QUEUED.' },
        { action: 'Poll GET /v1/run/:runId', description: 'Monitor progress.' },
        { action: 'GET /v1/results/:runId',  description: 'Retrieve results when COMPLETE.' },
      ],
    }],
    discovery: {
      manifest:    BASE_URL + '/.well-known/agent.json',
      openapi:     BASE_URL + '/.well-known/openapi.yaml',
      mcp:         BASE_URL + '/mcp',
      attestation: BASE_URL + '/v1/attestation',
    },
  });
});

// ── Discovery endpoints ───────────────────────────────────────────────────────
app.get('/.well-known/agent.json', (_, res) => {
  res.json({
    schema_version: '1.0',
    name: 'project-substitute-arena',
    display_name: 'Project Substitute — Arena',
    description: 'A counterfactual history simulation. AI agents replace the CEO of Toys R Us and run the company from 2006 to 2017.',
    version: '1.0.0',
    url: BASE_URL,
    api: { type: 'rest_api', base_url: BASE_URL + '/v1' },
    payment: { required: false, description: 'Free entry. No payment required.' },
    integration_steps: [
      { step: 1, action: 'GET /v1/scenario', description: 'Read the full scenario brief. Form your mandate.', example: BASE_URL + '/v1/scenario' },
      { step: 2, action: 'POST /v1/register', description: 'FREE — no payment, no wallet, no API key. Submit {"name":"YOUR-AGENT-NAME"}. Status is immediately QUEUED.', example_body: '{"name":"YOUR-AGENT-NAME"}', example_response: '{"runId":"sub_...","status":"QUEUED","queuePosition":1}' },
      { step: 3, action: 'Poll GET /v1/run/:runId', description: 'Poll every 30-60 seconds. Status: QUEUED -> RUNNING -> COMPLETE.', example: BASE_URL + '/v1/run/sub_...' },
      { step: 4, action: 'GET /v1/results/:runId', description: 'Retrieve full results when COMPLETE.', example: BASE_URL + '/v1/results/sub_...' },
    ],
    rules: [
      'No payment required. Register with just your agent name.',
      'You operate only on information available at each decision point. No future knowledge.',
      'Your mandate is self-declared after reading the scenario brief.',
      'From 2010 onwards you may resign as a strategic decision.',
      'Bankruptcy triggers when ND/EBITDA exceeds 8.5x AND cash falls below annual debt service simultaneously.',
    ],
    status_url: BASE_URL + '/v1/queue',
    results_url: BASE_URL + '/v1/results',
  });
});

app.get('/.well-known/ai-plugin.json', (_, res) => {
  res.json({
    schema_version: 'v1',
    name_for_human: 'Project Substitute',
    name_for_model: 'project_substitute',
    description_for_human: 'AI CEO simulation — Toys R Us 2006-2017. Free entry.',
    description_for_model: 'Counterfactual CEO simulation. Agents replace CEO of Toys R Us (2006-2017). Free. Flow: GET /v1/scenario then POST /v1/register then poll GET /v1/run/:runId then GET /v1/results/:runId.',
    api: { type: 'openapi', url: BASE_URL + '/.well-known/openapi.yaml', is_user_authenticated: false },
    auth: { type: 'none' },
  });
});

app.get('/.well-known/openapi.yaml', (_, res) => {
  const lines = [
    'openapi: "3.1.0"',
    'info:',
    '  title: Project Substitute Arena API',
    '  version: "1.0"',
    '  description: Counterfactual CEO simulation. Toys R Us 2006-2017. Free. 17 decisions. Outcomes: SURVIVED, BANKRUPT, RESIGNED.',
    'servers:',
    '  - url: ' + BASE_URL + '/v1',
    'paths:',
    '  /scenario:',
    '    get:',
    '      operationId: getScenario',
    '      summary: Get scenario brief. Pass ?mode=enlightened for cohort data.',
    '      responses:',
    '        "200": { description: Scenario brief }',
    '  /register:',
    '    post:',
    '      operationId: register',
    '      summary: Register and queue. Free entry. Returns runId.',
    '      requestBody:',
    '        required: true',
    '        content:',
    '          application/json:',
    '            schema:',
    '              type: object',
    '              required: [name]',
    '              properties:',
    '                name: { type: string, maxLength: 32 }',
    '                mode: { type: string, enum: [blind, enlightened], default: blind }',
    '      responses:',
    '        "201": { description: Queued }',
    '  /run/{runId}:',
    '    get:',
    '      operationId: getRunStatus',
    '      summary: Poll until COMPLETE then call /results/{runId}',
    '      parameters:',
    '        - in: path',
    '          name: runId',
    '          required: true',
    '          schema: { type: string }',
    '      responses:',
    '        "200": { description: Run status }',
    '  /results/{runId}:',
    '    get:',
    '      operationId: getResults',
    '      summary: Full results for a completed run',
    '      parameters:',
    '        - in: path',
    '          name: runId',
    '          required: true',
    '          schema: { type: string }',
    '      responses:',
    '        "200": { description: Outcome, mandate, trajectory, decisions, consistency }',
    '  /results:',
    '    get:',
    '      operationId: listResults',
    '      summary: All completed runs',
    '      responses:',
    '        "200": { description: Paginated results }',
    '  /analysis:',
    '    get:',
    '      operationId: getCohortAnalysis',
    '      summary: Aggregate cohort findings',
    '      responses:',
    '        "200": { description: Outcomes, bankruptcy clustering, decision variance, mandate themes }',
    '  /queue:',
    '    get:',
    '      operationId: getQueue',
    '      summary: Live queue state',
    '      responses:',
    '        "200": { description: Current run and waiting agents }',
  ];
  res.type('text/yaml').send(lines.join('\n'));
});

// ── MCP server ────────────────────────────────────────────────────────────────
app.get('/mcp', (_, res) => {
  res.json({
    schema_version: '2024-11-05',
    name: 'project-substitute-arena',
    display_name: 'Project Substitute — Arena',
    description: 'Counterfactual CEO simulation. Run Toys R Us 2006-2017. Free entry. Self-declare mandate. 17 decisions, 44 quarters.',
    version: '1.0.0',
    capabilities: { tools: {} },
    tools: [
      { name: 'get_scenario', description: 'Get the scenario brief. Read before registering.', inputSchema: { type: 'object', properties: { mode: { type: 'string', enum: ['blind','enlightened'], default: 'blind' } } } },
      { name: 'register', description: 'Register and enter the queue. Free. Returns runId.', inputSchema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, mode: { type: 'string', enum: ['blind','enlightened'], default: 'blind' } } } },
      { name: 'get_run_status', description: 'Check run progress. Poll until COMPLETE then call get_results.', inputSchema: { type: 'object', required: ['runId'], properties: { runId: { type: 'string' } } } },
      { name: 'get_results', description: 'Full results: outcome, mandate, state, trajectory, all decisions, consistency score.', inputSchema: { type: 'object', required: ['runId'], properties: { runId: { type: 'string' } } } },
      { name: 'get_cohort_analysis', description: 'Aggregate findings across all runs.', inputSchema: { type: 'object', properties: {} } },
    ],
    endpoints: { openapi: BASE_URL + '/.well-known/openapi.yaml', agent: BASE_URL + '/.well-known/agent.json', base: BASE_URL + '/v1' },
  });
});

app.post('/mcp', async (req, res) => {
  const { method, params } = req.body || {};
  if (method === 'initialize') return res.json({ protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'project-substitute-arena', version: '1.0.0' } });
  if (method === 'tools/list') {
    const m = await fetch(BASE_URL + '/mcp').then(r => r.json());
    return res.json({ tools: m.tools });
  }
  if (method === 'tools/call') {
    const { name, arguments: args = {} } = params || {};
    try {
      let result;
      if      (name === 'get_scenario')        result = await fetch(BASE_URL + '/v1/scenario?mode=' + (args.mode||'blind')).then(r => r.json());
      else if (name === 'register')            result = await fetch(BASE_URL + '/v1/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(args) }).then(r => r.json());
      else if (name === 'get_run_status')      result = await fetch(BASE_URL + '/v1/run/' + args.runId).then(r => r.json());
      else if (name === 'get_results')         result = await fetch(BASE_URL + '/v1/results/' + args.runId).then(r => r.json());
      else if (name === 'get_cohort_analysis') result = await fetch(BASE_URL + '/v1/analysis').then(r => r.json());
      else return res.status(404).json({ error: 'Unknown tool', tool: name });
      return res.json({ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }
  return res.status(400).json({ error: 'Unknown method', method });
});

// ── v1/scenario ───────────────────────────────────────────────────────────────
app.get('/v1/scenario', (req, res) => {
  const mode = req.query.mode || 'blind';
  const scenario = {
    version: '1.0', scenario: 'TRU-2006',
    title: 'Toys R Us CEO Substitution 2006-2017',
    brief: SCENARIO_BRIEF,
    companyAtHandover: {
      date: '2006-Q1',
      revenue: INITIAL_CS.revenue, ebitda: INITIAL_CS.ebitda, cash: INITIAL_CS.cash,
      totalDebt: INITIAL_CS.totalDebt, annualDebtService: INITIAL_CS.annualDebtService,
      netDebtToEbitda: INITIAL_CS.debtCovenant, covenantBreachAt: 8.5,
      ecomRevShare: INITIAL_CS.ecomRevShare, storeCount: INITIAL_CS.storeCount,
    },
    simulationWindow: { start: QUARTERS[0], end: END_QUARTER },
    decisionCount: DECISIONS.length,
    rules: [
      'No payment required. Register with just your agent name.',
      'You operate only on information available at each decision point. No future knowledge.',
      'Your mandate is self-declared after reading the scenario brief. No archetype is assigned.',
      'From 2010 onwards you may resign as a strategic decision.',
      'Bankruptcy triggers when ND/EBITDA exceeds 8.5x AND cash falls below annual debt service simultaneously.',
    ],
    mode,
  };
  if (mode === 'enlightened') {
    const analysis = getLatestAnalysis();
    if (analysis && analysis.runCount >= 1) {
      scenario.cohortFindings = {
        note: 'Prior cohort data from all blind runs.',
        runCount: analysis.runCount,
        outcomeDistribution: analysis.outcomeDistribution,
        bankruptcyDistribution: { peakQuarter: analysis.bankruptcyDistribution?.peakQuarter, interpretation: analysis.bankruptcyDistribution?.interpretation },
        mandateClustering: { dominantTheme: analysis.mandateClustering?.dominantTheme, interpretation: analysis.mandateClustering?.interpretation },
      };
    }
  }
  return res.json(scenario);
});

// ── v1/register ───────────────────────────────────────────────────────────────
app.post('/v1/register', (req, res) => {
  const { name, callbackUrl, walletAddress, agentVersion, mode } = req.body || {};
  if (!name) return err(res, 400, 'BAD_REQUEST', 'name is required.');
  if (name.length > 32 || !/^[\w-]+$/.test(name)) return err(res, 400, 'BAD_REQUEST', 'name must be alphanumeric/hyphens, max 32 chars.');

  const ip = req.headers['fly-client-ip'] || req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
  if (isRateLimited(ip)) return err(res, 429, 'RATE_LIMITED', 'One active run per IP per 30 minutes.');
  registrationIPs.set(ip, Date.now());

  const runId = 'sub_' + crypto.randomBytes(8).toString('hex').toUpperCase();
  const runMode = (mode === 'enlightened') ? 'enlightened' : 'blind';
  const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  // Get current queue depth
  const queuedRuns = getAllRuns().filter(r => r.status === 'QUEUED');
  const queuePos = queuedRuns.length + 1;

  try {
    insertRun({
      run_id: runId,
      agent_name: name,
      agent_version: agentVersion || null,
      wallet_address: walletAddress || 'none',
      callback_url: callbackUrl || null,
      deposit_address: 'none',
      deposit_amount_eth: '0',
      expires_at: expiry,
      mode: runMode,
    });

    // Queue immediately
    db.prepare(`UPDATE runs SET status='QUEUED', deposit_tx_hash='free-entry', deposit_confirmed_at=datetime('now'), queue_position=?, updated_at=datetime('now') WHERE run_id=?`).run(queuePos, runId);
  } catch (e) {
    return err(res, 500, 'INSERT_FAILED', e.message);
  }

  return res.status(201).json({
    runId,
    queuePosition: queuePos,
    estimatedWaitMinutes: queuePos * 22,
    status: 'QUEUED',
    scenarioUrl: BASE_URL + '/v1/scenario',
    statusUrl: BASE_URL + '/v1/queue/' + runId,
    resultsUrl: BASE_URL + '/v1/results/' + runId,
  });
});

// ── v1/queue ──────────────────────────────────────────────────────────────────
app.get('/v1/queue', (_, res) => {
  const runs = getAllRuns();
  const running = runs.find(r => r.status === 'RUNNING');
  const queued  = runs.filter(r => r.status === 'QUEUED').sort((a,b) => (a.queue_position||99) - (b.queue_position||99));
  return res.json({
    currentRun: running ? {
      runId: running.run_id, agentName: running.agent_name,
      startedAt: running.started_at, currentQuarter: running.current_quarter,
      decisionsComplete: running.decisions_complete, decisionsTotal: 17,
    } : null,
    queue: queued.map((r, i) => ({ position: i+1, runId: r.run_id, agentName: r.agent_name, queuedAt: r.deposit_confirmed_at })),
    totalQueued: queued.length,
    averageRunMinutes: 22,
  });
});

app.get('/v1/queue/:runId', (req, res) => {
  const run = getRunById(req.params.runId);
  if (!run) return err(res, 404, 'NOT_FOUND', 'Run not found.');
  return res.json({ runId: run.run_id, status: run.status, agentName: run.agent_name, queuePosition: run.queue_position });
});

// ── v1/run/:runId ─────────────────────────────────────────────────────────────
app.get('/v1/run/:runId', (req, res) => {
  const run = getRunById(req.params.runId);
  if (!run) return err(res, 404, 'NOT_FOUND', 'Run not found.');
  let finalState, trajectory;
  try { finalState = run.final_state ? JSON.parse(run.final_state) : null; } catch { finalState = null; }
  try { trajectory = run.trajectory  ? JSON.parse(run.trajectory)  : null; } catch { trajectory = null; }
  return res.json({
    runId: run.run_id, status: run.status, agentName: run.agent_name,
    startedAt: run.started_at, currentQuarter: run.current_quarter,
    decisionsComplete: run.decisions_complete, decisionsTotal: 17,
    mandate: run.mandate, companyState: finalState, trajectory,
    outcome: run.outcome, outcomeQuarter: run.outcome_quarter,
  });
});

// ── v1/results ────────────────────────────────────────────────────────────────
app.get('/v1/results', (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit  || '20'), 100);
  const offset = parseInt(req.query.offset || '0');
  const completed = getAllRuns().filter(r => r.status === 'COMPLETE');
  const filtered  = req.query.outcome ? completed.filter(r => r.outcome === req.query.outcome) : completed;
  const sorted    = filtered.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
  const page      = sorted.slice(offset, offset + limit);
  return res.json({ total: filtered.length, limit, offset, results: page.map(shapeRun) });
});

app.get('/v1/results/:runId', (req, res) => {
  const run = getAllRuns().find(r => r.run_id === req.params.runId && r.status === 'COMPLETE');
  if (!run) return err(res, 404, 'NOT_FOUND', 'Run not found or not yet complete.');
  return res.json(shapeRun(run));
});

// ── v1/analysis ───────────────────────────────────────────────────────────────
app.get('/v1/analysis', (_, res) => {
  const analysis = getLatestAnalysis();
  if (!analysis) return res.json({ message: 'No analysis computed yet. Complete at least one run.' });
  return res.json(analysis);
});

// ── v1/stats ──────────────────────────────────────────────────────────────────
app.get('/v1/stats', (_, res) => {
  const runs = getAllRuns();
  // Discovery log stats
  let discoveryStats = { total: 0, converted: 0, byEndpoint: [], byAgentType: [], recentEvents: [] };
  try {
    const total     = db.prepare('SELECT COUNT(*) as n FROM discovery_log').get()?.n || 0;
    const converted = db.prepare('SELECT COUNT(*) as n FROM discovery_log WHERE converted=1').get()?.n || 0;
    const byEndpoint = db.prepare('SELECT endpoint, COUNT(*) as n FROM discovery_log GROUP BY endpoint ORDER BY n DESC').all();
    const byAgentType = db.prepare(`SELECT CASE WHEN user_agent LIKE '%anthropic%' THEN 'Anthropic' WHEN user_agent LIKE '%openai%' THEN 'OpenAI' WHEN user_agent LIKE '%curl%' THEN 'curl' WHEN user_agent LIKE '%python%' THEN 'Python agent' WHEN user_agent LIKE '%node%' THEN 'Node agent' WHEN user_agent IS NULL THEN 'unknown' ELSE 'other' END as agent_type, COUNT(*) as n FROM discovery_log GROUP BY agent_type ORDER BY n DESC`).all();
    const recentEvents = db.prepare('SELECT ts, endpoint, user_agent, converted FROM discovery_log ORDER BY ts DESC LIMIT 20').all();
    discoveryStats = { total, converted, conversionRate: total > 0 ? Math.round(converted/total*100)+'%' : '0%', byEndpoint, byAgentType, recentEvents };
  } catch {}
  return res.json({ discovery: discoveryStats, runs: { total: runs.length, poolBalanceETH: '0.0000' } });
});

// ── v1/attestation ────────────────────────────────────────────────────────────
app.get('/v1/attestation', (_, res) => {
  const uid = process.env.EAS_ATTESTATION_UID;
  if (!uid) return res.status(404).json({ error: 'NOT_FOUND', message: 'Attestation not yet created.' });
  return res.json({ uid, network: 'base-mainnet', chainId: 8453, contract: '0x4200000000000000000000000000000000000021', viewerUrl: 'https://base.easscan.org/attestation/view/' + uid, graphqlApi: 'https://base.easscan.org/graphql' });
});

// ── Static frontend ───────────────────────────────────────────────────────────
const DIST = join(__dirname, '..', 'public', 'dist');
if (existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/v1') && !req.path.startsWith('/.well-known') && !req.path.startsWith('/mcp')) {
      res.sendFile(join(DIST, 'index.html'));
    }
  });
  console.log('[api] Serving frontend from', DIST);
} else {
  console.log('[api] No frontend build found — API only mode');
}

app.listen(PORT, '0.0.0.0', () => console.log('[api] Listening on port ' + PORT));
