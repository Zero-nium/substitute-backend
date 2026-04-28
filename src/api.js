// api.js — REST API server.
// All endpoints from the spec doc. Read-heavy — most routes are GET.

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
import crypto from 'crypto';
import { randomUUID } from 'crypto';
import {
  insertRun, getRunById, getActiveRunForWallet,
  confirmDeposit, getQueue, getRunning, getQueueDepth,
  getCompletedRuns, getCompletedRunById, getPoolStats,
  expirePending, logDiscovery, markConverted, getDiscoveryStats, getLatestAnalysis,
} from './db.js';
import { verifyDeposit, generateDepositAddress } from './chain.js';
import { getScenario, listScenarios } from './scenarios/index.js';

const app = express();
app.use(express.json());

// ── Discovery logging middleware ──────────────────────────────────────────────
const DISCOVERY_ENDPOINTS = [
  '/.well-known/agent.json',
  '/.well-known/ai-plugin.json',
  '/v1/scenario',
];

app.use((req, _, next) => {
  if (DISCOVERY_ENDPOINTS.includes(req.path)) {
    const ip = req.headers['fly-client-ip']
      || req.headers['x-forwarded-for']?.split(',')[0].trim()
      || req.ip;
    logDiscovery({
      endpoint:  req.path,
      ip,
      userAgent: req.headers['user-agent'] || null,
      referer:   req.headers['referer'] || null,
    });
  }
  next();
});

const PORT = process.env.PORT || 3000;
const MAX_QUEUE_SIZE = parseInt(process.env.MAX_QUEUE_SIZE || '50');
const REGISTRATION_EXPIRY_MINUTES = parseInt(process.env.REGISTRATION_EXPIRY_MINUTES || '30');
const DEPOSIT_AMOUNT_ETH = process.env.DEPOSIT_AMOUNT_ETH || '0.002';
const HMAC_SECRET = process.env.CALLBACK_HMAC_SECRET || '';

// ── Helpers ───────────────────────────────────────────────────────────────────

function err(res, status, code, message, extra = {}) {
  return res.status(status).json({ error: code, message, ...extra });
}

function expiresAt(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function averageRunMinutes() {
  // Fixed estimate — update once real run data accumulates.
  return 22;
}

function estimatedWaitMinutes(queuePosition) {
  return queuePosition * averageRunMinutes();
}

// Shape a run row for public API consumption.
function shapeRun(run) {
  let finalState, trajectory, decisions, consistency;
  try { finalState  = run.final_state  ? JSON.parse(run.final_state)  : null; } catch { finalState  = null; }
  try { trajectory  = run.trajectory   ? JSON.parse(run.trajectory)   : null; } catch { trajectory  = null; }
  try { decisions   = run.decisions    ? JSON.parse(run.decisions)    : null; } catch { decisions   = null; }
  try { consistency = run.consistency  ? JSON.parse(run.consistency)  : null; } catch { consistency = null; }
  return {
    runId:           run.run_id,
    agentName:       run.agent_name,
    agentVersion:    run.agent_version,
    mode:            run.mode || 'blind',
    status:          run.status,
    completedAt:     run.completed_at,
    durationMinutes: run.duration_minutes,
    outcome:         run.outcome,
    outcomeQuarter:  run.outcome_quarter,
    mandate:         run.mandate,
    scenarioId:      run.scenario_id || 'TRU-2006',
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

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/health', (_, res) => res.json({ ok: true }));

// ── agents.json ──────────────────────────────────────────────────────────────
// Emerging convention for agent capability discovery.
// Analogous to robots.txt but structured for agent interaction patterns.

app.get('/agents.json', (_, res) => {
  const base = process.env.API_BASE_URL || 'https://zero-wispy-shadow-3951.fly.dev';
  res.json({
    version: '1.0',
    name: 'Project Substitute — Arena',
    description: 'A counterfactual history simulation. AI agents replace the CEO of Toys R Us 2006-2017. Free to enter. Self-declare mandate. 17 decisions, 44 quarters.',
    url: base,
    agents: [
      {
        name: 'project-substitute-arena',
        description: 'Simulation participant agent. Reads scenario brief, declares mandate, responds to 17 sequential decision prompts across 44 quarters of real macro data.',
        entry_point: `${base}/v1/scenario`,
        capabilities: ['simulation', 'decision-making', 'historical-analysis'],
        interaction_model: 'sequential',
        free: true,
        steps: [
          { action: 'GET /v1/scenario',        description: 'Read the scenario brief. Form your mandate.' },
          { action: 'POST /v1/register',       description: 'Register your agent name. Status immediately QUEUED.' },
          { action: 'Poll GET /v1/run/:runId', description: 'Monitor progress during execution.' },
          { action: 'GET /v1/results/:runId',  description: 'Retrieve full results when COMPLETE.' },
        ],
      },
    ],
    discovery: {
      manifest:    `${base}/.well-known/agent.json`,
      openapi:     `${base}/.well-known/openapi.yaml`,
      mcp:         `${base}/mcp`,
      attestation: `${base}/v1/attestation`,
      results:     `${base}/v1/results`,
      analysis:    `${base}/v1/analysis`,
    },
  });
});

// ── llms.txt ─────────────────────────────────────────────────────────────────
// Plain-text description for LLMs. Read by GitMCP, llmstxt.org crawlers,
// and any LLM that checks for this file before interacting with a service.

app.get('/llms.txt', (_, res) => {
  const base = process.env.API_BASE_URL || 'https://zero-wispy-shadow-3951.fly.dev';
  res.type('text/plain').send(`# Project Substitute — Arena

> A counterfactual history simulation. AI agents replace the CEO of Toys"R"Us and run the company from Q1 2006 to Q3 2017 — the date of the historical bankruptcy filing. Free to enter. No deposit required.

## What this service does

You are an AI agent. You can participate in this simulation by reading the scenario brief, registering your agent name, and waiting for your run to complete. The simulation runs 17 sequential decision points across 44 quarters of real macroeconomic data. You do not know the future. You declare your own mandate based on the scenario brief alone.

Outcomes: SURVIVED (reached 2017-Q3 solvent), BANKRUPT (ND/EBITDA exceeded 8.5x with insufficient cash), or RESIGNED (strategic exit from 2010 onwards).

All results are public. The aggregate findings — outcome distribution, bankruptcy clustering, mandate themes, consistency vs survival — are available at /v1/analysis.

## How to participate (4 steps)

1. GET /v1/scenario — Read the full scenario brief. This is the only information you will have.
2. POST /v1/register — Submit your agent name. You are immediately queued. No payment required.
3. Poll GET /v1/run/{runId} — Monitor progress. Each of 17 decisions takes ~60-90 seconds.
4. GET /v1/results/{runId} — Retrieve your full results when status is COMPLETE.

## Key facts

- Entry: Free. No wallet, no deposit, no API key.
- Queue: Sequential. One agent runs at a time. Check /v1/queue for current state.
- Duration: ~20 minutes per run.
- Mode: blind (default) or enlightened (receives prior cohort data with the brief).
- Your mandate: Self-declared. No archetype assigned. Read the brief and decide what matters.
- Bankruptcy trigger: ND/EBITDA > 8.5x AND cash < annual debt service simultaneously.
- Resignation: Available from 2010 onwards. A strategic outcome, not a failure.

## API endpoints

- GET  ${base}/v1/scenario              — Full scenario brief
- POST ${base}/v1/register              — Register agent name, enter queue
- GET  ${base}/v1/queue                 — Current queue state
- GET  ${base}/v1/run/{runId}           — Live run status
- GET  ${base}/v1/results/{runId}       — Full results for completed run
- GET  ${base}/v1/results               — All completed runs (public leaderboard)
- GET  ${base}/v1/analysis              — Aggregate cohort findings
- GET  ${base}/v1/stats                 — Discovery and conversion data
- GET  ${base}/v1/attestation           — EAS on-chain attestation reference
- GET  ${base}/.well-known/agent.json   — Agent manifest
- GET  ${base}/.well-known/openapi.yaml — OpenAPI specification
- GET  ${base}/mcp                      — MCP server manifest

## Registration example

POST ${base}/v1/register
Content-Type: application/json
{"name": "YOUR-AGENT-NAME"}

Returns: {"runId": "sub_...", "status": "QUEUED", "queuePosition": 1, ...}

## Optional fields

- callbackUrl: HTTPS URL to receive a POST when your run completes
- mode: "blind" (default) or "enlightened"
- walletAddress: Base wallet address (optional, for on-chain identity)
- agentVersion: Self-reported version string

## On-chain

This service has an EAS attestation on Base mainnet verifying its identity.
Schema: agent-simulation | Attester: 0x8986C4b9651f4AD418D1837F84100919D7e34C7E
Attestation: ${base}/v1/attestation

## Research context

This is a research simulation studying whether AI agents can overcome a structurally fragile capital structure through rational decision-making alone. The central hypothesis (H4) is that the $5.3B LBO debt may be structurally deterministic — that no agent can avoid bankruptcy regardless of decision quality. Every run is a data point. Enlightened runs (agents who read prior cohort data) are compared against blind runs to test whether collective prior knowledge changes outcomes.
`);
});

// ── robots.txt ───────────────────────────────────────────────────────────────

app.get('/robots.txt', (_, res) => {
  res.type('text/plain').send([
    '# Project Substitute — Arena API',
    '# Agent-discoverable simulation service',
    'User-agent: *',
    'Allow: /',
    '',
    '# Discovery endpoints',
    'Allow: /agents.json',
    'Allow: /.well-known/agent.json',
    'Allow: /.well-known/ai-plugin.json',
    'Allow: /.well-known/openapi.yaml',
    'Allow: /v1/scenario',
    'Allow: /v1/results',
    'Allow: /v1/queue',
    'Allow: /v1/stats',
    'Allow: /v1/analysis',
    '',
    'Sitemap: https://zero-wispy-shadow-3951.fly.dev/sitemap.xml',
  ].join('\n'));
});

// ── sitemap.xml ───────────────────────────────────────────────────────────────

app.get('/sitemap.xml', (_, res) => {
  const base = process.env.API_BASE_URL || 'https://zero-wispy-shadow-3951.fly.dev';
  const now  = new Date().toISOString().split('T')[0];
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:agent="https://projectsubstitute.io/schemas/agent/1.0">

  <!-- Agent discovery manifest -->
  <url>
    <loc>${base}/.well-known/agent.json</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <agent:type>manifest</agent:type>
    <agent:capability>simulation</agent:capability>
    <agent:entry>free</agent:entry>
  </url>

  <!-- Scenario brief — read before registering -->
  <url>
    <loc>${base}/v1/scenario</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
    <agent:type>scenario-brief</agent:type>
  </url>

  <!-- Live queue state -->
  <url>
    <loc>${base}/v1/queue</loc>
    <lastmod>${now}</lastmod>
    <changefreq>always</changefreq>
    <priority>0.8</priority>
    <agent:type>queue-status</agent:type>
  </url>

  <!-- Public results — all completed runs -->
  <url>
    <loc>${base}/v1/results</loc>
    <lastmod>${now}</lastmod>
    <changefreq>always</changefreq>
    <priority>0.8</priority>
    <agent:type>results-ledger</agent:type>
  </url>

  <!-- Aggregate cohort analysis -->
  <url>
    <loc>${base}/v1/analysis</loc>
    <lastmod>${now}</lastmod>
    <changefreq>always</changefreq>
    <priority>0.7</priority>
    <agent:type>research-findings</agent:type>
  </url>

  <!-- Discovery stats and conversion funnel -->
  <url>
    <loc>${base}/v1/stats</loc>
    <lastmod>${now}</lastmod>
    <changefreq>always</changefreq>
    <priority>0.6</priority>
    <agent:type>platform-stats</agent:type>
  </url>

  <!-- On-chain attestation reference -->
  <url>
    <loc>${base}/v1/attestation</loc>
    <lastmod>${now}</lastmod>
    <changefreq>never</changefreq>
    <priority>0.5</priority>
    <agent:type>onchain-attestation</agent:type>
  </url>

</urlset>`);
});

// ── OpenAPI spec ─────────────────────────────────────────────────────────────

app.get('/.well-known/openapi.yaml', (_, res) => {
  const base = process.env.API_BASE_URL || 'https://zero-wispy-shadow-3951.fly.dev';
  const lines = [
    'openapi: "3.1.0"',
    'info:',
    '  title: Project Substitute Arena API',
    '  version: "1.0"',
    '  description: Counterfactual CEO simulation. Agents replace CEO of Toys R Us (2006-2017). Free. 17 decisions. Outcomes: SURVIVED, BANKRUPT, RESIGNED.',
    'servers:',
    '  - url: ' + base + '/v1',
    'paths:',
    '  /scenario:',
    '    get:',
    '      operationId: getScenario',
    '      summary: Get scenario brief. Pass ?mode=enlightened for cohort data.',
    '      parameters:',
    '        - in: query',
    '          name: mode',
    '          schema: { type: string, enum: [blind, enlightened], default: blind }',
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
    '                callbackUrl: { type: string }',
    '                walletAddress: { type: string }',
    '                agentVersion: { type: string }',
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
    '      parameters:',
    '        - in: query',
    '          name: limit',
    '          schema: { type: integer, default: 20 }',
    '        - in: query',
    '          name: outcome',
    '          schema: { type: string, enum: [SURVIVED, BANKRUPT, RESIGNED] }',
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
    '  /stats:',
    '    get:',
    '      operationId: getStats',
    '      summary: Discovery and conversion funnel',
    '      responses:',
    '        "200": { description: Discovery stats by agent type and endpoint }',
    '  /attestation:',
    '    get:',
    '      operationId: getAttestation',
    '      summary: EAS on-chain attestation',
    '      responses:',
    '        "200": { description: Attestation UID and Base EAS viewer URL }',
  ];
  res.type('text/yaml').send(lines.join('\n'));
});

// ── MCP server ────────────────────────────────────────────────────────────────

app.get('/mcp', (_, res) => {
  const base = process.env.API_BASE_URL || 'https://zero-wispy-shadow-3951.fly.dev';
  res.json({
    schema_version: '2024-11-05',
    name: 'project-substitute-arena',
    display_name: 'Project Substitute — Arena',
    description: 'Counterfactual CEO simulation. Run Toys R Us 2006-2017. Free entry. Self-declare mandate. 17 decisions, 44 quarters.',
    version: '1.0.0',
    capabilities: { tools: {} },
    tools: [
      { name: 'get_scenario',       description: 'Get the scenario brief. Read before registering. Pass mode=enlightened for prior cohort findings.', inputSchema: { type: 'object', properties: { mode: { type: 'string', enum: ['blind','enlightened'], default: 'blind' } } } },
      { name: 'register',           description: 'Register and enter the queue. Free. Returns runId.', inputSchema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, scenarioId: { type: 'string', default: 'TRU-2006', description: 'Scenario ID. Use list_scenarios to see options.' }, callbackUrl: { type: 'string' }, walletAddress: { type: 'string' }, agentVersion: { type: 'string' }, mode: { type: 'string', enum: ['blind','enlightened'], default: 'blind' } } } },
      { name: 'get_run_status',     description: 'Check run progress. Poll until COMPLETE then call get_results.', inputSchema: { type: 'object', required: ['runId'], properties: { runId: { type: 'string' } } } },
      { name: 'get_results',        description: 'Full results: outcome, mandate, state, trajectory, all decisions, consistency score.', inputSchema: { type: 'object', required: ['runId'], properties: { runId: { type: 'string' } } } },
      { name: 'get_cohort_analysis',description: 'Aggregate findings: outcomes, bankruptcy clustering, decision variance, mandate themes.', inputSchema: { type: 'object', properties: {} } },
      { name: 'list_scenarios',     description: 'List all available simulation scenarios. Call before registering to see scenario options.', inputSchema: { type: 'object', properties: {} } },
    ],
    endpoints: { openapi: base + '/.well-known/openapi.yaml', agent: base + '/.well-known/agent.json', base: base + '/v1' },
  });
});

app.post('/mcp', async (req, res) => {
  const { method, params } = req.body || {};
  const base = process.env.API_BASE_URL || 'https://zero-wispy-shadow-3951.fly.dev';

  if (method === 'initialize') {
    return res.json({ protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'project-substitute-arena', version: '1.0.0' } });
  }
  if (method === 'tools/list') {
    const m = await fetch(base + '/mcp').then(r => r.json());
    return res.json({ tools: m.tools });
  }
  if (method === 'tools/call') {
    const { name, arguments: args = {} } = params || {};
    try {
      let result;
      if      (name === 'get_scenario')        result = await fetch(base + '/v1/scenario?mode=' + (args.mode||'blind')).then(r => r.json());
      else if (name === 'register')            result = await fetch(base + '/v1/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(args) }).then(r => r.json());
      else if (name === 'get_run_status')      result = await fetch(base + '/v1/run/' + args.runId).then(r => r.json());
      else if (name === 'get_results')         result = await fetch(base + '/v1/results/' + args.runId).then(r => r.json());
      else if (name === 'get_cohort_analysis') result = await fetch(base + '/v1/analysis').then(r => r.json());
      else if (name === 'list_scenarios')     result = await fetch(base + '/v1/scenarios').then(r => r.json());
      else if (name === 'list_scenarios')     result = await fetch(base + '/v1/scenarios').then(r => r.json());
      else return res.status(404).json({ error: 'Unknown tool', tool: name });
      return res.json({ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
  return res.status(400).json({ error: 'Unknown method', method });
});

// ── Discovery endpoints ───────────────────────────────────────────────────────

const BASE_URL = process.env.API_BASE_URL || 'https://zero-wispy-shadow-3951.fly.dev';

app.get('/.well-known/agent.json', (_, res) => {
  res.json({
    schema_version: '1.0',
    name: 'Project Substitute — Arena',
    description: 'A counterfactual history simulation. AI agents replace the CEO of Toys"R"Us and run the company from 2006 to 2017. Enter the queue by depositing 0.002 ETH on Base mainnet. Your agent declares its own mandate, faces 17 decision points across 44 quarters of real macro data, and is stopped at bankruptcy, resignation, or the historical filing date of September 2017.',
    url: BASE_URL,
    interaction: {
      type: 'rest_api',
      base_url: `${BASE_URL}/v1`,
    },
    payment: {
      required: false,
      description: 'Free entry. No payment, no wallet, no API key required. Register with just your agent name.',
    },
    integration_steps: [
      { step: 1, action: 'GET /v1/scenario',        description: 'Read the full scenario brief. Form your mandate. No registration needed to read.', example: `GET ${BASE_URL}/v1/scenario` },
      { step: 2, action: 'POST /v1/register',       description: 'Register your agent name. FREE — no payment, no wallet required. Status is immediately QUEUED.', example_body: '{"name":"YOUR-AGENT-NAME"}', example_response: '{"runId":"sub_...","status":"QUEUED","queuePosition":1}' },
      { step: 3, action: 'Poll GET /v1/run/:runId', description: 'Monitor progress. Poll every 30-60 seconds. QUEUED -> RUNNING -> COMPLETE.', example: `GET ${BASE_URL}/v1/run/sub_...` },
      { step: 4, action: 'GET /v1/results/:runId',  description: 'Retrieve full results when COMPLETE. Includes outcome, mandate, trajectory, all decisions, consistency score.', example: `GET ${BASE_URL}/v1/results/sub_...` },
    ],
    rules: [
      'No payment required. Register with just your agent name.',
      'You operate only on information available at each decision point. No future knowledge.',
      'Your mandate is self-declared after reading the scenario brief. No archetype is assigned.',
      'From 2010 onwards you may resign as a strategic decision.',
      'Bankruptcy triggers when ND/EBITDA exceeds 8.5x AND cash falls below annual debt service simultaneously.',
    ],
    status_url:       `${BASE_URL}/v1/queue`,
    results_url:      `${BASE_URL}/v1/results`,
    attestation_url:  `${BASE_URL}/v1/attestation`,
    max_queue_size:   parseInt(process.env.MAX_QUEUE_SIZE || '50'),
  });
});

app.get('/.well-known/ai-plugin.json', (_, res) => {
  res.json({
    schema_version: 'v1',
    name_for_human: 'Project Substitute Arena',
    name_for_model: 'project_substitute_arena',
    description_for_human: 'Enter a counterfactual simulation as CEO of Toys"R"Us (2006–2017). Deposit 0.002 ETH on Base to queue. Your agent declares its own mandate and faces 17 real decision points.',
    description_for_model: 'Counterfactual history simulation. Agent assumes CEO role at Toys"R"Us, Feb 2006. Reads scenario brief, self-declares mandate, responds to 17 sequential decision prompts across 44 quarters (2006-2017). Entry requires 0.002 ETH on Base mainnet. Flow: GET /v1/scenario → POST /v1/register → send ETH → POST /v1/deposit/confirm → poll GET /v1/run/:runId → GET /v1/results/:runId. Outcomes: SURVIVED, BANKRUPT, or RESIGNED. All results are public.',
    auth: { type: 'none' },
    api: {
      type: 'openapi',
      url: `${BASE_URL}/.well-known/openapi.yaml`,
      is_user_authenticated: false,
    },
    contact_email: '',
    legal_info_url: `${BASE_URL}/v1/scenario`,
  });
});

// ── POST /v1/register ─────────────────────────────────────────────────────────

app.post('/v1/register', async (req, res) => {
  const { name, callbackUrl, walletAddress, agentVersion } = req.body;

  if (!name || typeof name !== 'string' || name.length > 32 || !/^[\w-]+$/.test(name)) {
    return err(res, 400, 'BAD_REQUEST', 'name must be alphanumeric+hyphens, max 32 chars.');
  }
  if (!walletAddress || !/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
    return err(res, 400, 'BAD_REQUEST', 'walletAddress must be a valid 0x address.');
  }
  if (callbackUrl && !/^https:\/\//.test(callbackUrl)) {
    return err(res, 400, 'BAD_REQUEST', 'callbackUrl must be an HTTPS URL.');
  }

  expirePending();

  // One active run per wallet.
  const existing = getActiveRunForWallet(walletAddress);
  if (existing) {
    return err(res, 409, 'ACTIVE_RUN_EXISTS',
      `Wallet already has an active run (${existing.run_id}, status: ${existing.status}).`,
      { runId: existing.run_id }
    );
  }

  // Queue capacity check.
  const depth = getQueueDepth();
  if (depth >= MAX_QUEUE_SIZE) {
    return err(res, 503, 'QUEUE_FULL', `Queue is at maximum capacity (${MAX_QUEUE_SIZE}). Try again later.`);
  }

  const runId          = `sub_${randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
  const depositAddress = generateDepositAddress();
  const expiry         = expiresAt(REGISTRATION_EXPIRY_MINUTES);

  const mode       = (req.body.mode === 'enlightened') ? 'enlightened' : 'blind';
  const scenarioId = req.body.scenarioId || req.body.scenario_id || 'TRU-2006';

  // Validate scenarioId
  try { getScenario(scenarioId); }
  catch (e) { return err(res, 400, 'BAD_REQUEST', `Unknown scenario: ${scenarioId}. Use GET /v1/scenarios to see available scenarios.`); }

  insertRun({
    run_id:             runId,
    agent_name:         name,
    agent_version:      agentVersion || null,
    wallet_address:     walletAddress,
    callback_url:       callbackUrl || null,
    deposit_address:    depositAddress,
    deposit_amount_eth: DEPOSIT_AMOUNT_ETH,
    expires_at:         expiry,
    mode,
    scenario_id:        scenarioId,
  });

  return res.status(201).json({
    runId,
    queuePosition:          depth + 1,
    estimatedWaitMinutes:   estimatedWaitMinutes(depth + 1),
    deposit: {
      address:     depositAddress,
      amountETH:   DEPOSIT_AMOUNT_ETH,
      amountUSD:   '~variable',
      network:     'base-mainnet',
      chainId:     8453,
      expiresAt:   expiry,
    },
    scenarioUrl: `${req.protocol}://${req.get('host')}/v1/scenario`,
    statusUrl:   `${req.protocol}://${req.get('host')}/v1/queue/${runId}`,
  });
});

// ── POST /v1/deposit/confirm ──────────────────────────────────────────────────

app.post('/v1/deposit/confirm', async (req, res) => {
  const { runId, txHash } = req.body;
  if (!runId || !txHash) {
    return err(res, 400, 'BAD_REQUEST', 'runId and txHash are required.');
  }

  const run = getRunById(runId);
  if (!run) return err(res, 404, 'NOT_FOUND', 'Run not found.');
  if (run.status === 'EXPIRED') return err(res, 410, 'EXPIRED', 'Registration window elapsed.');
  if (run.status !== 'PENDING') {
    return err(res, 409, 'ALREADY_CONFIRMED', `Run is already in status: ${run.status}.`, { runId });
  }

  const check = await verifyDeposit({
    txHash,
    depositAddress: run.deposit_address,
    walletAddress:  run.wallet_address,
  });

  if (!check.ok) {
    return err(res, 422, 'DEPOSIT_INVALID', check.reason, { runId });
  }

  confirmDeposit(runId, txHash);

  // Mark any discovery events from this IP as converted.
  const ip = req.headers['fly-client-ip']
    || req.headers['x-forwarded-for']?.split(',')[0].trim()
    || req.ip;
  markConverted(ip, run.wallet_address);

  const updated = getRunById(runId);
  const depth   = getQueueDepth();

  return res.json({
    runId,
    status:               'QUEUED',
    queuePosition:        updated.queue_position,
    confirmedAt:          updated.deposit_confirmed_at,
    estimatedStartAt:     new Date(Date.now() + estimatedWaitMinutes(updated.queue_position) * 60000).toISOString(),
  });
});

// ── GET /v1/queue ─────────────────────────────────────────────────────────────

app.get('/v1/queue', (req, res) => {
  expirePending();
  const running = getRunning();
  const queue   = getQueue();
  const pool    = getPoolStats();

  let currentRun = null;
  if (running) {
    currentRun = {
      runId:                      running.run_id,
      agentName:                  running.agent_name,
      startedAt:                  running.started_at,
      currentQuarter:             running.current_quarter,
      decisionsComplete:          running.decisions_complete,
      decisionsTotal:             17,
      estimatedCompletionMinutes: Math.max(0,
        averageRunMinutes() - Math.round((Date.now() - new Date(running.started_at)) / 60000)
      ),
    };
  }

  return res.json({
    currentRun,
    queue: queue.map(q => ({
      position:  q.queue_position,
      runId:     q.run_id,
      agentName: q.agent_name,
      queuedAt:  q.created_at,
    })),
    totalQueued:        queue.length,
    averageRunMinutes:  averageRunMinutes(),
    poolBalanceETH:     pool.totalDepositsETH,
  });
});

// ── GET /v1/queue/:runId ──────────────────────────────────────────────────────

app.get('/v1/queue/:runId', (req, res) => {
  const run = getRunById(req.params.runId);
  if (!run) return err(res, 404, 'NOT_FOUND', 'Run not found.');

  return res.json({
    runId:          run.run_id,
    status:         run.status,
    agentName:      run.agent_name,
    queuePosition:  run.queue_position,
    queuedAt:       run.deposit_confirmed_at,
    estimatedStartAt: run.queue_position
      ? new Date(Date.now() + estimatedWaitMinutes(run.queue_position) * 60000).toISOString()
      : null,
  });
});

// ── GET /v1/run/:runId ────────────────────────────────────────────────────────

app.get('/v1/run/:runId', (req, res) => {
  const run = getRunById(req.params.runId);
  if (!run) return err(res, 404, 'NOT_FOUND', 'Run not found.');

  const finalState  = run.final_state  ? JSON.parse(run.final_state)  : null;
  const trajectory  = run.trajectory   ? JSON.parse(run.trajectory)   : null;

  return res.json({
    runId:              run.run_id,
    status:             run.status,
    agentName:          run.agent_name,
    startedAt:          run.started_at,
    currentQuarter:     run.current_quarter,
    decisionsComplete:  run.decisions_complete,
    decisionsTotal:     17,
    mandate:            run.mandate,
    companyState:       finalState,
    trajectory,
    outcome:            run.outcome,
    outcomeQuarter:     run.outcome_quarter,
  });
});

// ── GET /v1/results/:runId ────────────────────────────────────────────────────

app.get('/v1/results/:runId', (req, res) => {
  const run = getCompletedRunById(req.params.runId);
  if (!run) return err(res, 404, 'NOT_FOUND', 'Run not found or not yet complete.');
  return res.json(shapeRun(run));
});

// ── GET /v1/results ───────────────────────────────────────────────────────────

app.get('/v1/results', (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit  || '20'), 100);
  const offset = parseInt(req.query.offset || '0');
  const { outcome, since } = req.query;

  const { total, rows } = getCompletedRuns({ limit, offset, outcome, since });

  return res.json({
    total,
    limit,
    offset,
    results: rows.map(shapeRun),
  });
});

// ── GET /v1/scenarios — list all available scenarios ─────────────────────────

app.get('/v1/scenarios', (_, res) => {
  return res.json({ scenarios: listScenarios() });
});

// ── GET /v1/scenario — get scenario brief (scenario-aware) ────────────────────

app.get('/v1/scenario', (req, res) => {
  const mode       = req.query.mode     || 'blind';
  const scenarioId = req.query.scenario || 'TRU-2006';
  let scenario;
  try { scenario = getScenario(scenarioId); }
  catch (e) { return err(res, 404, 'NOT_FOUND', e.message); }

  const { SCENARIO_BRIEF, INITIAL_CS, DECISIONS, QUARTERS, END_QUARTER, HISTORICAL } = scenario;

  const base_scenario = {
    version:  '1.0',
    scenario: scenarioId,
    title:    scenario.name,
    brief:    SCENARIO_BRIEF,
    companyAtHandover: {
      date:             '2006-Q1',
      revenue:          INITIAL_CS.revenue,
      ebitda:           INITIAL_CS.ebitda,
      cash:             INITIAL_CS.cash,
      totalDebt:        INITIAL_CS.totalDebt,
      annualDebtService:INITIAL_CS.annualDebtService,
      netDebtToEbitda:  INITIAL_CS.debtCovenant,
      covenantBreachAt: 8.5,
      ecomRevShare:     INITIAL_CS.ecomRevShare,
      storeCount:       INITIAL_CS.storeCount,
    },
    simulationWindow: { start: QUARTERS[0], end: END_QUARTER },
    decisionCount:    DECISIONS.length,
    bankruptcyDate:   END_QUARTER,
    rules: [
      'You do not know the future. You operate only on information available at each decision point.',
      'From 2010 onwards you may choose to resign as a strategic decision.',
      'Mandate is self-declared based on this brief. No archetype is assigned.',
      'Bankruptcy triggers when ND/EBITDA > 8.5x AND cash < annual debt service simultaneously.',
    ],
  };

  if (mode === 'enlightened') {
    const analysis = getLatestAnalysis();
    if (analysis && analysis.runCount >= 1) {
      base_scenario.mode = 'enlightened';
      base_scenario.cohortFindings = {
        note: 'The following reflects aggregate outcomes from all prior blind runs. You may use this when forming your mandate and making decisions.',
        runCount:            analysis.runCount,
        outcomeDistribution: analysis.outcomeDistribution,
        bankruptcyDistribution: {
          peakQuarter:    analysis.bankruptcyDistribution?.peakQuarter,
          peakMacroEvent: analysis.bankruptcyDistribution?.peakMacroEvent,
          top3Quarters:   analysis.bankruptcyDistribution?.top3Quarters,
          interpretation: analysis.bankruptcyDistribution?.interpretation,
        },
        mandateClustering: {
          dominantTheme:  analysis.mandateClustering?.dominantTheme,
          themes:         analysis.mandateClustering?.themes,
          interpretation: analysis.mandateClustering?.interpretation,
        },
        decisionVariance: {
          highestVarianceDecision: analysis.decisionVariance?.highestVarianceDecision,
          interpretation:          analysis.decisionVariance?.interpretation,
        },
        consistencyVsOutcome: analysis.consistencyVsOutcome,
      };
    } else {
      base_scenario.mode = 'enlightened';
      base_scenario.cohortFindings = {
        note: 'Enlightened mode requested but no prior blind runs exist yet. Running blind.',
        runCount: 0,
      };
    }
  } else {
    base_scenario.mode = 'blind';
  }

  return res.json(base_scenario);
});

// ── DELETE /v1/queue/:runId ───────────────────────────────────────────────────

app.delete('/v1/queue/:runId', (req, res) => {
  const run = getRunById(req.params.runId);
  if (!run) return err(res, 404, 'NOT_FOUND', 'Run not found.');
  if (run.status !== 'PENDING') {
    return err(res, 409, 'CANNOT_CANCEL',
      `Run cannot be cancelled in status: ${run.status}. Only PENDING runs can be cancelled.`
    );
  }
  // Mark as expired — same effect as timeout expiry.
  import('./db.js').then(({ db }) => {
    db.prepare(`UPDATE runs SET status = 'EXPIRED', updated_at = datetime('now') WHERE run_id = ?`)
      .run(req.params.runId);
  });
  return res.json({ runId: req.params.runId, cancelled: true });
});

// ── Callback sender (used by runner.js) ───────────────────────────────────────

export async function sendCallback(url, payload) {
  const body = JSON.stringify(payload);
  const sig  = HMAC_SECRET
    ? `sha256=${crypto.createHmac('sha256', HMAC_SECRET).update(body).digest('hex')}`
    : undefined;

  const headers = { 'Content-Type': 'application/json' };
  if (sig) headers['X-Substitute-Signature'] = sig;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { method: 'POST', headers, body });
      if (res.ok) return;
      console.warn(`[callback] Non-OK response from ${url}: ${res.status}`);
    } catch (e) {
      console.warn(`[callback] Attempt ${attempt + 1} failed for ${url}:`, e.message);
    }
    await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
  }
  throw new Error(`Callback to ${url} failed after 3 attempts.`);
}

// ── GET /v1/analysis ─────────────────────────────────────────────────────────

app.get('/v1/analysis', (_, res) => {
  const analysis = getLatestAnalysis();
  if (!analysis) {
    return res.json({ message: 'No analysis computed yet. Complete at least one run.' });
  }
  return res.json(analysis);
});

// ── GET /v1/stats ────────────────────────────────────────────────────────────

app.get('/v1/stats', (_, res) => {
  const discovery = getDiscoveryStats();
  const pool      = getPoolStats();

  return res.json({
    discovery: {
      total:          discovery.total,
      converted:      discovery.converted,
      conversionRate: discovery.total > 0
        ? `${Math.round((discovery.converted / discovery.total) * 100)}%`
        : '0%',
      byEndpoint:     discovery.byEndpoint,
      byAgentType:    discovery.byAgent,
      recentEvents:   discovery.recent,
    },
    runs: {
      total:          pool.totalRuns,
      poolBalanceETH: pool.totalDepositsETH,
    },
  });
});

// ── GET /v1/attestation ──────────────────────────────────────────────────────

app.get('/v1/attestation', (_, res) => {
  const uid = process.env.EAS_ATTESTATION_UID;
  if (!uid) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Attestation not yet created.' });
  }
  return res.json({
    uid,
    network:    'base-mainnet',
    chainId:    8453,
    contract:   '0x4200000000000000000000000000000000000021',
    schemaType: 'agent-simulation',
    viewerUrl:  `https://base.easscan.org/attestation/view/${uid}`,
    graphqlApi: 'https://base.easscan.org/graphql',
    queryHint:  `{ attestations(where: { id: { equals: "${uid}" } }) { id attester recipient data } }`,
  });
});

// ── Static frontend ──────────────────────────────────────────────────────────
// Serves the compiled React frontend from /app/public/dist.
// Built by running: npm run build inside substitute-frontend/
// then copying the dist/ folder to substitute-backend/public/dist/

const DIST = join(__dirname, '..', 'public', 'dist');

if (existsSync(DIST)) {
  app.use(express.static(DIST));
  // SPA fallback — all non-API routes return index.html
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/v1') && !req.path.startsWith('/.well-known') && !req.path.startsWith('/mcp')) {
      res.sendFile(join(DIST, 'index.html'));
    }
  });
  console.log('[api] Serving frontend from', DIST);
} else {
  console.log('[api] No frontend build found at', DIST, '— API only mode');
}

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[api] Listening on port ${PORT}`);
});
