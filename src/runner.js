// runner.js — Queue runner process.
// Runs alongside api.js as a separate Fly process group.
// Polls the DB every 10s, claims the next QUEUED run, executes it, repeats.

import {
  claimNextRun, updateRunProgress, setMandate,
  completeRun, failRun, expirePending, getRunById,
} from './db.js';
import { executeRun } from './simulation.js';
import { sendCallback } from './api.js';

const POLL_INTERVAL_MS = 10_000;

async function processNextRun() {
  // Expire stale PENDING registrations before claiming.
  expirePending();

  const run = claimNextRun();
  if (!run) return; // Queue empty — nothing to do.

  const startedAt = Date.now();
  console.log(`[runner] Starting run ${run.run_id} for agent "${run.agent_name}"`);

  try {
    const scenarioId = run.scenario_id || 'TRU-2006';
    const result = await executeRun(run.agent_name, async (progress) => {
      // Called after each decision — writes live state to DB.
      if (progress.mandate) {
        setMandate(run.run_id, progress.mandate);
      }
      updateRunProgress(run.run_id, {
        currentQuarter:    progress.currentQuarter    || null,
        decisionsComplete: progress.decisionsComplete || 0,
        finalState:        progress.finalState        || null,
        trajectory:        progress.trajectory        || null,
      });
    }, scenarioId);

    const durationMinutes = Math.round((Date.now() - startedAt) / 60000);

    completeRun(run.run_id, {
      outcome:         result.outcome,
      outcomeQuarter:  result.outcomeQuarter,
      finalState:      result.finalState,
      trajectory:      result.trajectory,
      decisions:       result.decisions,
      consistency:     result.consistency,
      durationMinutes,
    });

    console.log(`[runner] Completed ${run.run_id} — ${result.outcome} at ${result.outcomeQuarter} (${durationMinutes}m)`);

    // Fire callback if the agent registered one.
    if (run.callback_url) {
      const completed = getRunById(run.run_id);
      await sendCallback(run.callback_url, {
        event:       'run.complete',
        runId:       run.run_id,
        outcome:     result.outcome,
        outcomeQuarter: result.outcomeQuarter,
        resultsUrl:  `${process.env.API_BASE_URL || 'https://api.projectsubstitute.io'}/v1/results/${run.run_id}`,
      }).catch(err => console.warn(`[runner] Callback failed for ${run.run_id}:`, err.message));
    }

  } catch (err) {
    console.error(`[runner] Run ${run.run_id} failed:`, err);
    failRun(run.run_id, err.message);
  }
}

// ── Main loop ─────────────────────────────────────────────────────────────────
async function loop() {
  console.log('[runner] Started — polling every', POLL_INTERVAL_MS / 1000, 'seconds');

  while (true) {
    try {
      await processNextRun();
    } catch (err) {
      // Outer catch — something unexpected failed outside the run itself.
      console.error('[runner] Unexpected error in loop:', err);
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
}

loop();
