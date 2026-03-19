// db.js — SQLite setup and all queries.
// better-sqlite3 is synchronous by design — fine here since
// the runner is single-threaded and the API volume is low.

import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const DB_PATH = process.env.DB_PATH || './substitute.db';

// Ensure the directory exists (important on first Fly deploy before volume mounts).
try { mkdirSync(dirname(DB_PATH), { recursive: true }); } catch {}

export const db = new Database(DB_PATH);

// WAL mode — allows the runner and API to read/write concurrently without blocking.
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ────────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS runs (
    run_id              TEXT PRIMARY KEY,
    agent_name          TEXT NOT NULL,
    agent_version       TEXT,
    wallet_address      TEXT NOT NULL,
    callback_url        TEXT,

    -- Status lifecycle: PENDING → QUEUED → RUNNING → COMPLETE | EXPIRED | ERROR
    status              TEXT NOT NULL DEFAULT 'PENDING',

    -- Deposit
    deposit_address     TEXT NOT NULL,
    deposit_amount_eth  TEXT NOT NULL,
    deposit_tx_hash     TEXT,
    deposit_confirmed_at TEXT,
    expires_at          TEXT NOT NULL,

    -- Queue position (set on QUEUED, null for PENDING/expired)
    queue_position      INTEGER,

    -- Execution
    started_at          TEXT,
    completed_at        TEXT,
    duration_minutes    INTEGER,
    current_quarter     TEXT,
    decisions_complete  INTEGER DEFAULT 0,

    -- Outcome
    outcome             TEXT,         -- SURVIVED | BANKRUPT | RESIGNED
    outcome_quarter     TEXT,

    -- Agent content
    mandate             TEXT,

    -- Final state (JSON)
    final_state         TEXT,

    -- Trajectory (JSON: {dc, ecom, cash} arrays)
    trajectory          TEXT,

    -- Decision log (JSON array)
    decisions           TEXT,

    -- Consistency scoring (JSON)
    consistency         TEXT,

    -- Error info
    error_message       TEXT,

    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_runs_status   ON runs(status);
  CREATE INDEX IF NOT EXISTS idx_runs_wallet   ON runs(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_runs_queue    ON runs(queue_position) WHERE status = 'QUEUED';
  CREATE INDEX IF NOT EXISTS idx_runs_complete ON runs(completed_at)   WHERE status = 'COMPLETE';
`);

// ── Discovery log table ──────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS discovery_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ts         TEXT NOT NULL DEFAULT (datetime('now')),
    endpoint   TEXT NOT NULL,
    ip         TEXT,
    user_agent TEXT,
    referer    TEXT,
    converted  INTEGER DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_discovery_ts       ON discovery_log(ts);
  CREATE INDEX IF NOT EXISTS idx_discovery_endpoint ON discovery_log(endpoint);
`);

export function logDiscovery({ endpoint, ip, userAgent, referer }) {
  db.prepare(`
    INSERT INTO discovery_log (endpoint, ip, user_agent, referer)
    VALUES (?, ?, ?, ?)
  `).run(endpoint, ip || null, userAgent || null, referer || null);
}

export function markConverted(ip) {
  db.prepare(`
    UPDATE discovery_log SET converted = 1
    WHERE ip = ? AND converted = 0
    ORDER BY ts DESC LIMIT 1
  `).run(ip);
}

export function getDiscoveryStats() {
  const total     = db.prepare(`SELECT COUNT(*) as n FROM discovery_log`).get().n;
  const converted = db.prepare(`SELECT COUNT(*) as n FROM discovery_log WHERE converted = 1`).get().n;
  const byEndpoint = db.prepare(`
    SELECT endpoint, COUNT(*) as n FROM discovery_log GROUP BY endpoint ORDER BY n DESC
  `).all();
  const byAgent = db.prepare(`
    SELECT
      CASE
        WHEN user_agent LIKE '%coinbase%'  THEN 'Coinbase AgentKit'
        WHEN user_agent LIKE '%openai%'    THEN 'OpenAI'
        WHEN user_agent LIKE '%anthropic%' THEN 'Anthropic'
        WHEN user_agent LIKE '%fetch%'     THEN 'Fetch.ai'
        WHEN user_agent LIKE '%python%'    THEN 'Python agent'
        WHEN user_agent LIKE '%node%'      THEN 'Node agent'
        WHEN user_agent LIKE '%curl%'      THEN 'curl'
        WHEN user_agent IS NULL            THEN 'unknown'
        ELSE 'other'
      END as agent_type,
      COUNT(*) as n
    FROM discovery_log
    GROUP BY agent_type
    ORDER BY n DESC
  `).all();
  const recent = db.prepare(`
    SELECT ts, endpoint, user_agent, converted
    FROM discovery_log
    ORDER BY ts DESC LIMIT 20
  `).all();
  return { total, converted, byEndpoint, byAgent, recent };
}

// ── Touch helper — updates updated_at on every write ─────────────────────────
const touch = db.prepare(`UPDATE runs SET updated_at = datetime('now') WHERE run_id = ?`);

// ── Run queries ───────────────────────────────────────────────────────────────

try { db.exec(`ALTER TABLE runs ADD COLUMN mode TEXT DEFAULT 'blind'`); } catch {}
try { db.exec(`ALTER TABLE runs ADD COLUMN retry_count INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE runs ADD COLUMN retry_after TEXT`); } catch {}

db.exec(`
  CREATE TABLE IF NOT EXISTS cohort_analysis (
    id          INTEGER PRIMARY KEY,
    computed_at TEXT NOT NULL DEFAULT (datetime('now')),
    run_count   INTEGER NOT NULL,
    findings    TEXT NOT NULL
  );
`);

export function getLatestAnalysis() {
  const row = db.prepare(`SELECT findings FROM cohort_analysis ORDER BY computed_at DESC LIMIT 1`).get();
  if (!row) return null;
  try { return JSON.parse(row.findings); } catch { return null; }
}

export function insertRun(run) {
  db.prepare(`
    INSERT INTO runs (
      run_id, agent_name, agent_version, wallet_address, callback_url,
      deposit_address, deposit_amount_eth, expires_at, status
    ) VALUES (
      @run_id, @agent_name, @agent_version, @wallet_address, @callback_url,
      @deposit_address, @deposit_amount_eth, @expires_at, 'PENDING'
    )
  `).run(run);
}

export function getRunById(runId) {
  return db.prepare(`SELECT * FROM runs WHERE run_id = ?`).get(runId);
}

export function getActiveRunForWallet(walletAddress) {
  return db.prepare(`
    SELECT * FROM runs
    WHERE wallet_address = ? AND status IN ('PENDING', 'QUEUED', 'RUNNING')
    LIMIT 1
  `).get(walletAddress);
}

export function confirmDeposit(runId, txHash) {
  // Find the current max queue position, slot this run at the end.
  const maxPos = db.prepare(`
    SELECT COALESCE(MAX(queue_position), 0) as m FROM runs WHERE status = 'QUEUED'
  `).get().m;

  db.prepare(`
    UPDATE runs SET
      status               = 'QUEUED',
      deposit_tx_hash      = ?,
      deposit_confirmed_at = datetime('now'),
      queue_position       = ?,
      updated_at           = datetime('now')
    WHERE run_id = ? AND status = 'PENDING'
  `).run(txHash, maxPos + 1, runId);
}

// Called by runner — atomically claim the next run to avoid double-execution.
export function claimNextRun() {
  return db.transaction(() => {
    const run = db.prepare(`
      SELECT * FROM runs
      WHERE status = 'QUEUED'
      ORDER BY queue_position ASC
      LIMIT 1
    `).get();

    if (!run) return null;

    db.prepare(`
      UPDATE runs SET
        status     = 'RUNNING',
        started_at = datetime('now'),
        updated_at = datetime('now')
      WHERE run_id = ? AND status = 'QUEUED'
    `).run(run.run_id);

    return run;
  })();
}

export function updateRunProgress(runId, { currentQuarter, decisionsComplete, finalState, trajectory }) {
  db.prepare(`
    UPDATE runs SET
      current_quarter    = ?,
      decisions_complete = ?,
      final_state        = ?,
      trajectory         = ?,
      updated_at         = datetime('now')
    WHERE run_id = ?
  `).run(
    currentQuarter,
    decisionsComplete,
    finalState ? JSON.stringify(finalState) : null,
    trajectory ? JSON.stringify(trajectory) : null,
    runId
  );
}

export function setMandate(runId, mandate) {
  db.prepare(`UPDATE runs SET mandate = ?, updated_at = datetime('now') WHERE run_id = ?`)
    .run(mandate, runId);
}

export function completeRun(runId, { outcome, outcomeQuarter, finalState, trajectory, decisions, consistency, durationMinutes }) {
  db.prepare(`
    UPDATE runs SET
      status           = 'COMPLETE',
      outcome          = ?,
      outcome_quarter  = ?,
      final_state      = ?,
      trajectory       = ?,
      decisions        = ?,
      consistency      = ?,
      duration_minutes = ?,
      completed_at     = datetime('now'),
      updated_at       = datetime('now')
    WHERE run_id = ?
  `).run(
    outcome,
    outcomeQuarter,
    JSON.stringify(finalState),
    JSON.stringify(trajectory),
    JSON.stringify(decisions),
    JSON.stringify(consistency),
    durationMinutes,
    runId
  );
  // Compact queue positions after a run completes.
  repackQueuePositions();
}

export function failRun(runId, errorMessage) {
  db.prepare(`
    UPDATE runs SET
      status        = 'ERROR',
      error_message = ?,
      updated_at    = datetime('now')
    WHERE run_id = ?
  `).run(errorMessage, runId);
}

export function retryRun(runId, errorMessage, retryAfterMinutes = 5) {
  const retryAfter = new Date(Date.now() + retryAfterMinutes * 60 * 1000).toISOString();
  const current = db.prepare(`SELECT retry_count FROM runs WHERE run_id = ?`).get(runId);
  const retryCount = (current?.retry_count || 0) + 1;
  db.prepare(`
    UPDATE runs SET
      status        = 'RETRY',
      error_message = ?,
      retry_count   = ?,
      retry_after   = ?,
      started_at    = NULL,
      current_quarter    = NULL,
      decisions_complete = 0,
      updated_at    = datetime('now')
    WHERE run_id = ?
  `).run(errorMessage, retryCount, retryAfter, runId);
}

export function getRetryableRuns() {
  return db.prepare(`
    SELECT * FROM runs
    WHERE status = 'RETRY'
    AND retry_after <= datetime('now')
    AND retry_count < 4
    ORDER BY retry_after ASC
  `).all();
}

export function getStuckRuns() {
  // Runs that exhausted retries — need manual review
  return db.prepare(`
    SELECT * FROM runs WHERE status = 'RETRY' AND retry_count >= 4
  `).all();
}

// Expire registrations that were never deposited.
export function expirePending() {
  db.prepare(`
    UPDATE runs SET status = 'EXPIRED', updated_at = datetime('now')
    WHERE status = 'PENDING' AND expires_at < datetime('now')
  `).run();
}

// ── Queue queries ─────────────────────────────────────────────────────────────

export function getQueue() {
  return db.prepare(`
    SELECT run_id, agent_name, queue_position, created_at
    FROM runs
    WHERE status = 'QUEUED'
    ORDER BY queue_position ASC
  `).all();
}

export function getRunning() {
  return db.prepare(`
    SELECT * FROM runs WHERE status = 'RUNNING' LIMIT 1
  `).get();
}

export function getQueueDepth() {
  return db.prepare(`SELECT COUNT(*) as n FROM runs WHERE status IN ('QUEUED', 'RUNNING')`).get().n;
}

// ── Results queries ───────────────────────────────────────────────────────────

export function getCompletedRuns({ limit = 20, offset = 0, outcome, since } = {}) {
  let where = `WHERE status = 'COMPLETE'`;
  const params = [];
  if (outcome) { where += ` AND outcome = ?`; params.push(outcome); }
  if (since)   { where += ` AND completed_at >= ?`; params.push(since); }
  const rows = db.prepare(`
    SELECT run_id, agent_name, agent_version, completed_at, duration_minutes,
           outcome, outcome_quarter, mandate, final_state, trajectory, consistency
    FROM runs ${where}
    ORDER BY completed_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) as n FROM runs ${where}`).get(...params).n;
  return { total, rows: rows.map(parseJsonFields) };
}

export function getCompletedRunById(runId) {
  const row = db.prepare(`SELECT * FROM runs WHERE run_id = ? AND status = 'COMPLETE'`).get(runId);
  return row ? parseJsonFields(row) : null;
}

export function getPoolStats() {
  const totalRuns = db.prepare(`SELECT COUNT(*) as n FROM runs WHERE status NOT IN ('PENDING', 'EXPIRED')`).get().n;
  const depositAmountEth = parseFloat(process.env.DEPOSIT_AMOUNT_ETH || '0.002');
  return {
    totalDepositsETH: (totalRuns * depositAmountEth).toFixed(4),
    totalRuns,
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function repackQueuePositions() {
  const queued = db.prepare(`SELECT run_id FROM runs WHERE status = 'QUEUED' ORDER BY queue_position ASC`).all();
  const update = db.prepare(`UPDATE runs SET queue_position = ? WHERE run_id = ?`);
  db.transaction(() => {
    queued.forEach((r, i) => update.run(i + 1, r.run_id));
  })();
}

function parseJsonFields(row) {
  return {
    ...row,
    finalState:  row.final_state  ? JSON.parse(row.final_state)  : null,
    trajectory:  row.trajectory   ? JSON.parse(row.trajectory)   : null,
    decisions:   row.decisions    ? JSON.parse(row.decisions)    : null,
    consistency: row.consistency  ? JSON.parse(row.consistency)  : null,
  };
}
