// scenarios/index.js — Scenario Registry
// Add new scenarios here. The engine loads scenarios by ID.
// Each scenario must implement the full ScenarioSchema interface.

import { TRU_SCENARIO } from './tru.js';
import { BLOCKBUSTER_SCENARIO } from './blockbuster.js';

export const SCENARIOS = {
  'TRU-2006': TRU_SCENARIO,
  'BBI-2004': BLOCKBUSTER_SCENARIO,
};

export function getScenario(id) {
  const scenario = SCENARIOS[id];
  if (!scenario) throw new Error(`Unknown scenario: ${id}. Available: ${Object.keys(SCENARIOS).join(', ')}`);
  return scenario;
}

export function listScenarios() {
  return Object.entries(SCENARIOS).map(([id, s]) => ({
    id,
    name:        s.name,
    description: s.description,
    window:      `${s.QUARTERS[0]} – ${s.END_QUARTER}`,
    quarters:    s.QUARTERS.length,
    decisions:   s.DECISIONS.length,
    status:      s.status || 'active',
  }));
}

// ── ScenarioSchema (reference — not enforced at runtime) ─────────────────────
//
// Required:
//   id:               string           — unique identifier e.g. 'TRU-2006'
//   name:             string           — display name
//   description:      string           — one-line description
//   INITIAL_CS:       object           — company state at handover
//   QUARTERS:         string[]         — all quarters in order e.g. ['2006-Q1', ...]
//   END_QUARTER:      string           — last quarter
//   DECISIONS:        Decision[]       — ordered decision points
//   WORLD:            object           — keyed by quarter string
//   SCENARIO_BRIEF:   string           — briefing shown to agents
//   DECISION_ANCHORS: object           — keyed by decision id, contains field bounds
//   GLOBAL_BOUNDS:    object           — hard limits on all state fields
//   isBankrupt(cs):   function         — returns boolean
//   HISTORICAL:       object           — actual historical outcome for comparison
//
// Optional:
//   stateFields:      object           — declares scenario-specific state fields
//                                        { fieldName: { type, unit, description, displayName } }
//   status:           string           — 'active' | 'beta' | 'draft'
//   tags:             string[]         — e.g. ['retail', 'LBO', 'digital-disruption']
//   researchQuestion: string           — the central H4-equivalent hypothesis
//
// Decision shape:
//   { id, quarter, tier ('T1'|'T2'), trigger, human }
//
// WORLD entry shape (minimum required by engine):
//   { gdpGrowth, fedRate, consumerConf, recessionActive, crisisActive }
//   + scenario-specific fields declared in stateFields
