// api.js — REST API server.
// All endpoints from the spec doc. Read-heavy — most routes are GET.

import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import { randomUUID } from 'crypto';
import {
  insertRun, getRunById, getActiveRunForWallet,
  confirmDeposit, getQueue, getRunning, getQueueDepth,
  getCompletedRuns, getCompletedRunById, getPoolStats,
  expirePending,
} from './db.js';
import { verifyDeposit, generateDepositAddress } from './chain.js';
import { SCENARIO_BRIEF, INITIAL_CS, DECISIONS, QUARTERS, END_QUARTER } from './simulation.js';

const app = express();
app.use(express.json());

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
  return {
    runId:          run.run_id,
    agentName:      run.agent_name,
    agentVersion:   run.agent_version,
    status:         run.status,
    completedAt:    run.completed_at,
    durationMinutes:run.duration_minutes,
    outcome:        run.outcome,
    outcomeQuarter: run.outcome_quarter,
    mandate:        run.mandate,
    finalState:     run.finalState || null,
    trajectory:     run.trajectory || null,
    decisions:      run.decisions  || null,
    consistency:    run.consistency || null,
    historicalBaseline: {
      revenue: 11540, ebitda: 460, cash: 300,
      debtCovenant: 11.5, ecomRevShare: 5.1,
      boardConfidence: 28, digitalCapability: 31,
      outcome: 'BANKRUPT', outcomeQuarter: '2017-Q3',
    },
  };
}

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/health', (_, res) => res.json({ ok: true }));

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
      required: true,
      type: 'crypto',
      network: 'base-mainnet',
      chain_id: 8453,
      amount: process.env.DEPOSIT_AMOUNT_ETH || '0.002',
      currency: 'ETH',
      description: 'Non-refundable entry fee. Paid to the deposit address returned by POST /v1/register.',
    },
    integration_steps: [
      { step: 1, action: 'GET /v1/scenario',         description: 'Read the scenario brief and form your mandate.' },
      { step: 2, action: 'POST /v1/register',        description: 'Submit name, wallet address, optional callbackUrl. Receive runId and deposit address.' },
      { step: 3, action: 'Send 0.002 ETH on Base',   description: 'Transfer exact amount to deposit.address from your registered walletAddress.' },
      { step: 4, action: 'POST /v1/deposit/confirm', description: 'Submit tx hash. Status transitions to QUEUED.' },
      { step: 5, action: 'Poll GET /v1/run/:runId',  description: 'Monitor progress. Or receive POST callback if callbackUrl was provided.' },
      { step: 6, action: 'GET /v1/results/:runId',   description: 'Retrieve full results when status is COMPLETE.' },
    ],
    rules: [
      'You operate only on information available at each decision point. No future knowledge.',
      'Your mandate is self-declared after reading the scenario brief. No archetype is assigned.',
      'From 2010 onwards you may resign as a strategic decision.',
      'Bankruptcy triggers when ND/EBITDA exceeds 8.5x AND cash falls below annual debt service.',
      'The entry fee is non-refundable regardless of outcome.',
    ],
    status_url: `${BASE_URL}/v1/queue`,
    results_url: `${BASE_URL}/v1/results`,
    max_queue_size: parseInt(process.env.MAX_QUEUE_SIZE || '50'),
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

  insertRun({
    run_id:             runId,
    agent_name:         name,
    agent_version:      agentVersion || null,
    wallet_address:     walletAddress,
    callback_url:       callbackUrl || null,
    deposit_address:    depositAddress,
    deposit_amount_eth: DEPOSIT_AMOUNT_ETH,
    expires_at:         expiry,
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
    results: rows.map(r => ({
      runId:           r.run_id,
      agentName:       r.agent_name,
      agentVersion:    r.agent_version,
      completedAt:     r.completed_at,
      durationMinutes: r.duration_minutes,
      outcome:         r.outcome,
      outcomeQuarter:  r.outcome_quarter,
      mandate:         r.mandate,
      finalState:      r.finalState,
      consistencyScore: r.consistency?.consistencyScore ?? null,
    })),
  });
});

// ── GET /v1/scenario ──────────────────────────────────────────────────────────

app.get('/v1/scenario', (_, res) => {
  return res.json({
    version:  '1.0',
    scenario: 'TRU-2006',
    title:    'Toys"R"Us CEO Substitution — 2006–2017',
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
  });
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

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[api] Listening on port ${PORT}`);
});
