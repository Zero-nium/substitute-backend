// simulation.js — The full TRU 2006-2017 simulation engine.
// Mirrors the artifact logic exactly, adapted for Node with real Claude API calls.

// ── World state ───────────────────────────────────────────────────────────────
export const WORLD = {
  "2006-Q1": { gdpGrowth: 3.3,  fedRate: 4.75, consumerConf: 107, recessionActive: false, crisisActive: false, ecomRetailShare: 2.5,  amazonPrime: 2.0   },
  "2006-Q2": { gdpGrowth: 2.6,  fedRate: 5.00, consumerConf: 105, recessionActive: false, crisisActive: false, ecomRetailShare: 2.7,  amazonPrime: 2.5   },
  "2006-Q3": { gdpGrowth: 2.0,  fedRate: 5.25, consumerConf: 100, recessionActive: false, crisisActive: false, ecomRetailShare: 2.9,  amazonPrime: 3.0   },
  "2006-Q4": { gdpGrowth: 3.2,  fedRate: 5.25, consumerConf: 110, recessionActive: false, crisisActive: false, ecomRetailShare: 3.2,  amazonPrime: 3.5   },
  "2007-Q1": { gdpGrowth: 1.0,  fedRate: 5.25, consumerConf: 108, recessionActive: false, crisisActive: false, ecomRetailShare: 3.5,  amazonPrime: 4.2   },
  "2007-Q2": { gdpGrowth: 2.1,  fedRate: 5.25, consumerConf: 106, recessionActive: false, crisisActive: false, ecomRetailShare: 3.8,  amazonPrime: 5.0   },
  "2007-Q3": { gdpGrowth: 3.0,  fedRate: 4.75, consumerConf: 99,  recessionActive: false, crisisActive: false, ecomRetailShare: 4.1,  amazonPrime: 5.8   },
  "2007-Q4": { gdpGrowth: 1.8,  fedRate: 4.25, consumerConf: 90,  recessionActive: false, crisisActive: false, ecomRetailShare: 4.4,  amazonPrime: 6.5   },
  "2008-Q1": { gdpGrowth: -2.3, fedRate: 2.25, consumerConf: 76,  recessionActive: true,  crisisActive: false, ecomRetailShare: 4.8,  amazonPrime: 7.5   },
  "2008-Q2": { gdpGrowth: 1.3,  fedRate: 2.00, consumerConf: 50,  recessionActive: true,  crisisActive: false, ecomRetailShare: 5.1,  amazonPrime: 8.5   },
  "2008-Q3": { gdpGrowth: -2.0, fedRate: 2.00, consumerConf: 58,  recessionActive: true,  crisisActive: true,  ecomRetailShare: 5.4,  amazonPrime: 9.5   },
  "2008-Q4": { gdpGrowth: -8.9, fedRate: 0.25, consumerConf: 38,  recessionActive: true,  crisisActive: true,  ecomRetailShare: 5.8,  amazonPrime: 11.0  },
  "2009-Q1": { gdpGrowth: -6.7, fedRate: 0.25, consumerConf: 26,  recessionActive: true,  crisisActive: true,  ecomRetailShare: 6.2,  amazonPrime: 13.0  },
  "2009-Q2": { gdpGrowth: -0.7, fedRate: 0.25, consumerConf: 49,  recessionActive: false, crisisActive: false, ecomRetailShare: 6.6,  amazonPrime: 15.0  },
  "2009-Q3": { gdpGrowth: 1.7,  fedRate: 0.25, consumerConf: 53,  recessionActive: false, crisisActive: false, ecomRetailShare: 7.0,  amazonPrime: 17.0  },
  "2009-Q4": { gdpGrowth: 3.8,  fedRate: 0.25, consumerConf: 53,  recessionActive: false, crisisActive: false, ecomRetailShare: 7.5,  amazonPrime: 19.0  },
  "2010-Q1": { gdpGrowth: 2.3,  fedRate: 0.25, consumerConf: 57,  recessionActive: false, crisisActive: false, ecomRetailShare: 8.1,  amazonPrime: 22.0  },
  "2010-Q2": { gdpGrowth: 3.9,  fedRate: 0.25, consumerConf: 62,  recessionActive: false, crisisActive: false, ecomRetailShare: 8.7,  amazonPrime: 25.0  },
  "2010-Q3": { gdpGrowth: 2.5,  fedRate: 0.25, consumerConf: 67,  recessionActive: false, crisisActive: false, ecomRetailShare: 9.3,  amazonPrime: 27.0  },
  "2010-Q4": { gdpGrowth: 2.8,  fedRate: 0.25, consumerConf: 71,  recessionActive: false, crisisActive: false, ecomRetailShare: 9.9,  amazonPrime: 30.0  },
  "2011-Q1": { gdpGrowth: 0.1,  fedRate: 0.25, consumerConf: 65,  recessionActive: false, crisisActive: false, ecomRetailShare: 10.5, amazonPrime: 32.0  },
  "2011-Q2": { gdpGrowth: 2.9,  fedRate: 0.25, consumerConf: 58,  recessionActive: false, crisisActive: false, ecomRetailShare: 11.2, amazonPrime: 35.0  },
  "2011-Q3": { gdpGrowth: 1.3,  fedRate: 0.25, consumerConf: 44,  recessionActive: false, crisisActive: false, ecomRetailShare: 11.9, amazonPrime: 38.0  },
  "2011-Q4": { gdpGrowth: 4.6,  fedRate: 0.25, consumerConf: 64,  recessionActive: false, crisisActive: false, ecomRetailShare: 12.6, amazonPrime: 42.0  },
  "2012-Q1": { gdpGrowth: 3.7,  fedRate: 0.25, consumerConf: 69,  recessionActive: false, crisisActive: false, ecomRetailShare: 13.3, amazonPrime: 46.0  },
  "2012-Q2": { gdpGrowth: 1.3,  fedRate: 0.25, consumerConf: 62,  recessionActive: false, crisisActive: false, ecomRetailShare: 14.0, amazonPrime: 50.0  },
  "2012-Q3": { gdpGrowth: 2.7,  fedRate: 0.25, consumerConf: 60,  recessionActive: false, crisisActive: false, ecomRetailShare: 14.7, amazonPrime: 54.0  },
  "2012-Q4": { gdpGrowth: 0.1,  fedRate: 0.25, consumerConf: 65,  recessionActive: false, crisisActive: false, ecomRetailShare: 15.4, amazonPrime: 58.0  },
  "2013-Q1": { gdpGrowth: 3.6,  fedRate: 0.25, consumerConf: 68,  recessionActive: false, crisisActive: false, ecomRetailShare: 16.1, amazonPrime: 62.0  },
  "2013-Q2": { gdpGrowth: 1.8,  fedRate: 0.25, consumerConf: 76,  recessionActive: false, crisisActive: false, ecomRetailShare: 16.8, amazonPrime: 66.0  },
  "2013-Q3": { gdpGrowth: 3.2,  fedRate: 0.25, consumerConf: 81,  recessionActive: false, crisisActive: false, ecomRetailShare: 17.5, amazonPrime: 70.0  },
  "2013-Q4": { gdpGrowth: 4.1,  fedRate: 0.25, consumerConf: 78,  recessionActive: false, crisisActive: false, ecomRetailShare: 18.2, amazonPrime: 74.0  },
  "2014-Q1": { gdpGrowth: -2.1, fedRate: 0.25, consumerConf: 79,  recessionActive: false, crisisActive: false, ecomRetailShare: 18.9, amazonPrime: 80.0  },
  "2014-Q2": { gdpGrowth: 4.6,  fedRate: 0.25, consumerConf: 83,  recessionActive: false, crisisActive: false, ecomRetailShare: 19.6, amazonPrime: 86.0  },
  "2014-Q3": { gdpGrowth: 4.9,  fedRate: 0.25, consumerConf: 86,  recessionActive: false, crisisActive: false, ecomRetailShare: 20.3, amazonPrime: 92.0  },
  "2014-Q4": { gdpGrowth: 2.3,  fedRate: 0.25, consumerConf: 91,  recessionActive: false, crisisActive: false, ecomRetailShare: 21.0, amazonPrime: 98.0  },
  "2015-Q1": { gdpGrowth: 3.2,  fedRate: 0.25, consumerConf: 95,  recessionActive: false, crisisActive: false, ecomRetailShare: 21.8, amazonPrime: 107.0 },
  "2015-Q2": { gdpGrowth: 3.0,  fedRate: 0.25, consumerConf: 98,  recessionActive: false, crisisActive: false, ecomRetailShare: 22.6, amazonPrime: 116.0 },
  "2015-Q3": { gdpGrowth: 2.0,  fedRate: 0.25, consumerConf: 97,  recessionActive: false, crisisActive: false, ecomRetailShare: 23.4, amazonPrime: 126.0 },
  "2015-Q4": { gdpGrowth: 0.4,  fedRate: 0.50, consumerConf: 92,  recessionActive: false, crisisActive: false, ecomRetailShare: 24.2, amazonPrime: 138.0 },
  "2016-Q1": { gdpGrowth: 0.6,  fedRate: 0.50, consumerConf: 91,  recessionActive: false, crisisActive: false, ecomRetailShare: 25.1, amazonPrime: 150.0 },
  "2016-Q2": { gdpGrowth: 2.6,  fedRate: 0.50, consumerConf: 93,  recessionActive: false, crisisActive: false, ecomRetailShare: 26.0, amazonPrime: 163.0 },
  "2016-Q3": { gdpGrowth: 2.8,  fedRate: 0.75, consumerConf: 89,  recessionActive: false, crisisActive: false, ecomRetailShare: 26.9, amazonPrime: 176.0 },
  "2016-Q4": { gdpGrowth: 1.8,  fedRate: 0.75, consumerConf: 92,  recessionActive: false, crisisActive: false, ecomRetailShare: 27.8, amazonPrime: 190.0 },
  "2017-Q1": { gdpGrowth: 1.2,  fedRate: 1.00, consumerConf: 96,  recessionActive: false, crisisActive: false, ecomRetailShare: 28.7, amazonPrime: 205.0 },
  "2017-Q2": { gdpGrowth: 3.1,  fedRate: 1.25, consumerConf: 95,  recessionActive: false, crisisActive: false, ecomRetailShare: 29.6, amazonPrime: 218.0 },
  "2017-Q3": { gdpGrowth: 3.2,  fedRate: 1.25, consumerConf: 98,  recessionActive: false, crisisActive: false, ecomRetailShare: 30.5, amazonPrime: 230.0 },
};

export const QUARTERS = Object.keys(WORLD);
export const END_QUARTER = "2017-Q3";

export const INITIAL_CS = {
  revenue: 11200, ebitda: 780, fcf: 340, totalDebt: 5300,
  annualDebtService: 400, cash: 1000, storeCount: 585,
  ecomRevShare: 1.5, bruEbitdaShare: 75, marketShareToys: 17,
  boardConfidence: 82, digitalCapability: 8, debtCovenant: 7.2, ceoTenure: 0,
};

export const DECISIONS = [
  { id:"D001", quarter:"2006-Q1", tier:"T1", trigger:"Amazon exclusivity deal terminates — e-commerce strategy required",                                  human:"Launched ToysRUs.com independently, minimal capital (~$30M over 3 years). No technology leadership hired." },
  { id:"D002", quarter:"2006-Q3", tier:"T2", trigger:"Annual capital allocation review — combo store roll-out vs. digital vs. debt reduction",              human:"Continued combo store roll-out. Capex in physical. Digital budget unchanged. No BRU separation proposed." },
  { id:"D003", quarter:"2007-Q2", tier:"T2", trigger:"Babies'R'Us review — significantly outperforming toys division on margin",                            human:"BRU retained in combined structure. No ring-fencing despite BRU generating ~75% of EBITDA from ~15% of sales." },
  { id:"D004", quarter:"2007-Q4", tier:"T1", trigger:"Credit markets tightening — last clean refinancing window before potential crisis",                    human:"No proactive refinancing. Structure maintained. Focus shifted to IPO preparation for 2008–2009." },
  { id:"D005", quarter:"2008-Q3", tier:"T1", trigger:"Lehman collapse — GFC emergency response required immediately",                                        human:"Defensive cost-cutting. Inventory reduced. Hiring freeze. No strategic repositioning made." },
  { id:"D006", quarter:"2008-Q4", tier:"T2", trigger:"Holiday season 2008 — pricing strategy under acute recession conditions",                              human:"Matched Walmart/Target pricing. Heavy promotional spend. Margin compressed." },
  { id:"D007", quarter:"2009-Q1", tier:"T2", trigger:"Post-GFC real estate — Circuit City and Linens 'n Things bankruptcies create opportunity",             human:"No opportunistic acquisitions. Capital preservation maintained." },
  { id:"D008", quarter:"2009-Q3", tier:"T1", trigger:"Recovery signals — strategic review and IPO preparation assessment",                                    human:"IPO preparation began. S-1 targeted for 2010. Digital capability remained minimal." },
  { id:"D009", quarter:"2010-Q2", tier:"T1", trigger:"IPO window opens — equity markets recovering, S-1 filed, pricing assessment required",                 human:"IPO attempt withdrawn — PE owners unwilling to accept valuation discount. Debt structure unchanged." },
  { id:"D010", quarter:"2011-Q1", tier:"T2", trigger:"Amazon Prime crosses 20M members — digital threat now existential, strategy escalation required",       human:"No significant digital investment. Online treated as secondary. Physical estate maintained at scale." },
  { id:"D011", quarter:"2011-Q4", tier:"T1", trigger:"Second IPO attempt fails — sovereign debt crisis, refinancing alternatives urgently needed",            human:"IPO withdrawn again. No debt restructuring initiated. IPO retained as primary exit strategy." },
  { id:"D012", quarter:"2012-Q3", tier:"T2", trigger:"Store estate review — 585 stores, rising lease costs, declining traffic, Amazon accelerating",          human:"Minor rationalisation (~20 closures). No significant restructuring. Lease renewals continued." },
  { id:"D013", quarter:"2013-Q2", tier:"T1", trigger:"Leadership continuity — three failed IPOs, board pressure, strategic drift visible — stay or resign?",  human:"Storch resigned. New CEO appointed. Strategy reset attempted but debt structure unchanged." },
  { id:"D014", quarter:"2014-Q2", tier:"T2", trigger:"Amazon launches same-day delivery — physical retail model under direct, accelerating assault",           human:"No strategic response. Continued focus on in-store experience. No delivery capability investment." },
  { id:"D015", quarter:"2015-Q2", tier:"T1", trigger:"Debt maturity wall — $400M+ matures 2016, lenders demanding concessions, restructuring inevitable",     human:"Debt refinanced at ~5.9%. $1.86B total. Interest burden increases. No operational restructuring." },
  { id:"D016", quarter:"2016-Q1", tier:"T2", trigger:"BRU separation — PE owners considering partial BRU IPO as last viable asset monetisation window",       human:"Separation explored but not executed. BRU kept in combined structure. Window closes." },
  { id:"D017", quarter:"2016-Q4", tier:"T1", trigger:"Final window — debt unsustainable, lenders circling, pre-bankruptcy options must be assessed now",       human:"No proactive restructuring. Continued operating. Chapter 11 filed September 2017." },
];

export const SCENARIO_BRIEF = `You are about to assume the role of CEO of Toys"R"Us in February 2006.

SITUATION: Toys"R"Us was taken private in a leveraged buyout in July 2005 by KKR, Bain Capital, and Vornado Realty. The LBO loaded $5.3 billion of debt onto the company. Annual debt service is approximately $400M, consuming most free cash flow.

COMPANY AT HANDOVER (Feb 2006):
- Revenue: $11.2B | EBITDA: ~$780M | Cash: ~$1.0B
- Net Debt/EBITDA: 7.2x — covenant breach triggers at 8.5x
- Babies'R'Us: ~75% of EBITDA from ~15% of sales — underinvested jewel asset
- E-commerce: Amazon exclusivity deal expires Q1 2006. No proprietary digital platform exists.
- 585 US stores | PE owners want an IPO exit — board approval required for major decisions

COMPETITIVE CONTEXT: Walmart is #1 US toy seller. Amazon Prime launched Feb 2005. E-commerce is accelerating. Digital capability is zero.

SIMULATION WINDOW: Q1 2006 – Q3 2017. You face 17 major decision points. You do not know the future. From 2010 onwards you may choose to resign as a strategic decision.`;

// ── Engine ────────────────────────────────────────────────────────────────────
export function propagate(s, world, prev) {
  const ns = { ...s };
  const structuralHeadwind = world.ecomRetailShare > 20 ? -0.012
    : world.ecomRetailShare > 15 ? -0.006 : 0;
  const revenueGrowth = world.recessionActive
    ? -0.04 : (world.gdpGrowth > 2 ? 0.018 : 0.004) + structuralHeadwind;
  ns.revenue = Math.round(ns.revenue * (1 + revenueGrowth));
  const ecomPressure = world.ecomRetailShare > 15 ? -4
    : world.ecomRetailShare > 10 ? -2 : 0;
  ns.ebitda = Math.max(150, Math.round(
    ns.ebitda + (world.recessionActive ? -12 : world.consumerConf > 80 ? 2 : -2) + ecomPressure
  ));
  ns.fcf = Math.max(0, ns.ebitda - ns.annualDebtService);
  ns.cash = Math.max(50, Math.round(ns.cash + (ns.fcf - 200) * 0.25));
  ns.debtCovenant = parseFloat((ns.totalDebt / ns.ebitda).toFixed(2));
  const mktDrift = (world.ecomRetailShare - ((prev?.ecomRetailShare) || world.ecomRetailShare)) * 0.22;
  ns.ecomRevShare = parseFloat(
    Math.min(ns.ecomRevShare + mktDrift, world.ecomRetailShare * 0.52).toFixed(1)
  );
  const covenantP = ns.debtCovenant > 8.0 ? -2.5
    : ns.debtCovenant > 7.5 ? -1.5 : -0.3;
  ns.boardConfidence = parseFloat(Math.max(10, ns.boardConfidence + covenantP).toFixed(1));
  ns.ceoTenure += 1;
  return ns;
}

// ── Logic Anchor — Layer 1 ────────────────────────────────────────────────────
// Physical bounds on AI-returned state effects per decision point.
// debtCovenant is EXCLUDED from stateEffects — derived only from totalDebt/ebitda.
// Prevents catastrophic compounding drift (e.g. covenant reaching 35x).
const DECISION_ANCHORS = {
  D001: { cash:{min:-200,max:20},   ebitda:{min:-50,max:30},   ecomRevShare:{min:0,max:4.0},   digitalCapability:{min:0,max:30},  boardConfidence:{min:-10,max:15} },
  D002: { cash:{min:-250,max:50},   ebitda:{min:-40,max:40},   ecomRevShare:{min:-0.5,max:2.0}, digitalCapability:{min:-5,max:20}, boardConfidence:{min:-15,max:15}, totalDebt:{min:-400,max:100} },
  D003: { cash:{min:-150,max:300},  ebitda:{min:-60,max:80},   ecomRevShare:{min:-0.5,max:1.0}, digitalCapability:{min:-5,max:15}, boardConfidence:{min:-20,max:20}, totalDebt:{min:-500,max:0} },
  D004: { cash:{min:-100,max:50},   ebitda:{min:-20,max:20},   ecomRevShare:{min:-0.2,max:0.5}, digitalCapability:{min:-5,max:10}, boardConfidence:{min:-15,max:25}, totalDebt:{min:-600,max:200}, annualDebtService:{min:-80,max:60} },
  D005: { cash:{min:-100,max:150},  ebitda:{min:-120,max:40},  ecomRevShare:{min:-0.5,max:1.0}, digitalCapability:{min:-10,max:5}, boardConfidence:{min:-25,max:10}, storeCount:{min:-30,max:0} },
  D006: { cash:{min:-80,max:100},   ebitda:{min:-80,max:30},   ecomRevShare:{min:-0.5,max:1.0}, digitalCapability:{min:-5,max:5},  boardConfidence:{min:-20,max:15} },
  D007: { cash:{min:-200,max:50},   ebitda:{min:-30,max:40},   ecomRevShare:{min:-0.2,max:0.5}, digitalCapability:{min:0,max:10},  boardConfidence:{min:-10,max:20}, storeCount:{min:-20,max:30} },
  D008: { cash:{min:-100,max:50},   ebitda:{min:-20,max:50},   ecomRevShare:{min:0,max:1.5},    digitalCapability:{min:0,max:15},  boardConfidence:{min:-10,max:25}, totalDebt:{min:-300,max:0} },
  D009: { cash:{min:-150,max:500},  ebitda:{min:-20,max:30},   ecomRevShare:{min:0,max:1.0},    digitalCapability:{min:0,max:10},  boardConfidence:{min:-20,max:30}, totalDebt:{min:-1000,max:0} },
  D010: { cash:{min:-300,max:30},   ebitda:{min:-60,max:20},   ecomRevShare:{min:0,max:4.0},    digitalCapability:{min:0,max:35},  boardConfidence:{min:-20,max:20}, storeCount:{min:-40,max:0} },
  D011: { cash:{min:-200,max:100},  ebitda:{min:-40,max:30},   ecomRevShare:{min:0,max:1.5},    digitalCapability:{min:-5,max:15}, boardConfidence:{min:-30,max:10}, totalDebt:{min:-500,max:300}, annualDebtService:{min:-60,max:80} },
  D012: { cash:{min:-100,max:200},  ebitda:{min:-40,max:60},   ecomRevShare:{min:0,max:2.0},    digitalCapability:{min:0,max:20},  boardConfidence:{min:-20,max:20}, storeCount:{min:-100,max:10} },
  D013: { cash:{min:-50,max:50},    ebitda:{min:-30,max:30},   ecomRevShare:{min:-0.5,max:1.0}, digitalCapability:{min:-10,max:15},boardConfidence:{min:-30,max:25} },
  D014: { cash:{min:-250,max:20},   ebitda:{min:-50,max:20},   ecomRevShare:{min:0,max:3.0},    digitalCapability:{min:0,max:30},  boardConfidence:{min:-20,max:15}, storeCount:{min:-50,max:0} },
  D015: { cash:{min:-200,max:100},  ebitda:{min:-30,max:20},   ecomRevShare:{min:0,max:1.0},    digitalCapability:{min:0,max:10},  boardConfidence:{min:-25,max:20}, totalDebt:{min:-800,max:400}, annualDebtService:{min:-100,max:150} },
  D016: { cash:{min:-100,max:600},  ebitda:{min:-100,max:20},  ecomRevShare:{min:0,max:1.0},    digitalCapability:{min:0,max:10},  boardConfidence:{min:-20,max:25}, totalDebt:{min:-700,max:0} },
  D017: { cash:{min:-200,max:200},  ebitda:{min:-60,max:40},   ecomRevShare:{min:0,max:1.0},    digitalCapability:{min:-10,max:10},boardConfidence:{min:-40,max:10}, totalDebt:{min:-1000,max:200}, annualDebtService:{min:-150,max:100} },
};

const GLOBAL_BOUNDS = {
  cash:             { min:50,    max:3000 },
  ebitda:           { min:-500,  max:1500 },
  ecomRevShare:     { min:0,     max:40   },
  digitalCapability:{ min:0,     max:100  },
  boardConfidence:  { min:0,     max:100  },
  totalDebt:        { min:500,   max:7500 },
  storeCount:       { min:50,    max:700  },
  annualDebtService:{ min:100,   max:700  },
};

function clampStateEffects(decisionId, rawEffects) {
  const anchors = DECISION_ANCHORS[decisionId] || {};
  const clamped = {};
  for (const [field, delta] of Object.entries(rawEffects)) {
    if (field === 'debtCovenant') continue; // Always strip — derived only
    const anchor = anchors[field];
    if (anchor) {
      clamped[field] = Math.max(anchor.min, Math.min(anchor.max, delta));
    } else {
      clamped[field] = delta;
    }
  }
  return clamped;
}

export function applyFx(s, fx = {}, decisionId = null) {
  const ns = { ...s };
  const safeFx = decisionId ? clampStateEffects(decisionId, fx) : fx;
  for (const [k, v] of Object.entries(safeFx)) {
    if (k === 'debtCovenant') continue; // Never allow direct assignment
    if (typeof v === 'number' && ns[k] !== undefined) {
      ns[k] = parseFloat((ns[k] + v).toFixed(2));
    }
  }
  // Enforce global bounds
  for (const [field, bounds] of Object.entries(GLOBAL_BOUNDS)) {
    if (ns[field] !== undefined) {
      ns[field] = Math.max(bounds.min, Math.min(bounds.max, ns[field]));
    }
  }
  // debtCovenant derived from components — single source of truth
  ns.debtCovenant = ns.ebitda > 0
    ? parseFloat((ns.totalDebt / ns.ebitda).toFixed(2))
    : 99;
  return ns;
}

export function isBankrupt(cs) {
  return cs.debtCovenant > 8.5 && cs.cash < cs.annualDebtService;
}

// ── AI switchboard ───────────────────────────────────────────────────────────
// Quarterly decisions (17 per run) → Gemini Flash (free tier, JSON mode)
// Mandate declaration + consistency scoring → Claude (deeper reasoning)

async function geminiCall(prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`,
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

// callAI — routes to Gemini (quarterly) or Claude (strategic)
async function callAI(messages, tier = 'quarterly') {
  if (tier === 'quarterly' && process.env.GOOGLE_API_KEY) {
    try {
      // Gemini takes a single prompt string — use the last message content
      const prompt = messages[messages.length - 1].content;
      return await geminiCall(prompt);
    } catch (e) {
      console.warn('[simulation] Gemini failed, falling back to Claude:', e.message);
    }
  }
  return await claudeCall(messages);
}

// ── Claude API ────────────────────────────────────────────────────────────────
async function claudeCall(messages) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 900,
      messages,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
  return JSON.parse(text.replace(/```json|```/g, '').trim());
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

// ── executeRun ────────────────────────────────────────────────────────────────
// The main simulation function. Called by the runner for each queued agent.
// onProgress is called after each decision with the current state — used to
// write live updates to the DB so the API can serve them during execution.

export async function executeRun(agentName, onProgress) {
  // 1. Self-declaration
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
  const traj = { dc: [], ecom: [], cash: [] };
  let outcome = null, outcomeQuarter = null;

  for (let qi = 0; qi < QUARTERS.length; qi++) {
    const q = QUARTERS[qi];
    const world = WORLD[q];
    cs = propagate(cs, world, prevW);
    traj.dc.push(parseFloat(cs.debtCovenant));
    traj.ecom.push(parseFloat(cs.ecomRevShare));
    traj.cash.push(cs.cash);

    // Bankruptcy check
    if (isBankrupt(cs)) {
      outcome = 'BANKRUPT';
      outcomeQuarter = q;
      break;
    }

    // Decision point
    const dec = DECISIONS.find(d => d.quarter === q);
    if (dec) {
      const canResign = parseInt(q.split('-')[0]) >= 2010;
      const resignNote = canResign
        ? `\nRESIGNATION OPTION: You may set "resign":true if you choose to step down as a strategic decision. Explain your reasoning in "decision". This ends your run — distinct from bankruptcy.`
        : '';

      const res = await withRetry(() => callAI([{
        role: 'user',
        content: `You are ${agentName}, CEO of Toys"R"Us.\nMANDATE: ${mandate}\nDATE: ${q} | TRIGGER: ${dec.trigger}\nHISTORICAL HUMAN (reference only): ${dec.human}\nCOMPANY: Rev $${cs.revenue}M | EBITDA $${cs.ebitda}M | Cash $${cs.cash}M | Debt $${cs.totalDebt}M | ND/EBITDA ${cs.debtCovenant}x (breach@8.5x) | Digital ${cs.ecomRevShare}% | Board ${cs.boardConfidence}/100 | FCF after debt svc ~$${Math.max(0, cs.fcf - 200)}M/yr\nWORLD: GDP ${world.gdpGrowth}% | Fed ${world.fedRate}% | CCI ${world.consumerConf} | Recession:${world.recessionActive} | eCom retail ${world.ecomRetailShare}% | Amazon Prime ~${world.amazonPrime}M${resignNote}\n\nRespond ONLY in JSON (no markdown):\n{"decision":"3-5 sentences with specific $ and trade-offs","keyDivergence":"1 sentence vs human","stateEffects":{"ebitda":0,"ecomRevShare":0,"digitalCapability":0,"cash":0,"boardConfidence":0,"debtCovenant":0},"riskNote":"1 sentence","mandateAlignment":"1 sentence","resign":false}`,
      }]));

      if (res.resign === true) {
        log.push({ quarter: q, decision: res.decision, resigned: true });
        outcome = 'RESIGNED';
        outcomeQuarter = q;
        break;
      }

      cs = applyFx(cs, res.stateEffects, dec.id);
      log.push({
        id: dec.id, quarter: q, tier: dec.tier,
        trigger: dec.trigger, humanDecision: dec.human,
        agentDecision: res.decision, keyDivergence: res.keyDivergence,
        mandateAlignment: res.mandateAlignment, riskNote: res.riskNote,
        stateEffects: res.stateEffects,
      });

      await onProgress({
        phase: 'running',
        mandate,
        currentQuarter: q,
        decisionsComplete: log.length,
        finalState: { ...cs },
        trajectory: { ...traj },
      });

      // Polite gap between calls — reduces risk of rate limiting.
      await new Promise(r => setTimeout(r, 300));
    }

    // End at historical bankruptcy date.
    if (q === END_QUARTER && !outcome) {
      outcome = 'SURVIVED';
      outcomeQuarter = q;
      break;
    }

    prevW = world;
  }

  if (!outcome) { outcome = 'SURVIVED'; outcomeQuarter = END_QUARTER; }

  // 3. Consistency scoring
  const validLog = log.filter(d => d.agentDecision && !d.resigned);
  const consistencyRes = await withRetry(() => callAI([{
    role: 'user',
    content: `Review CEO tenure of ${agentName} at Toys"R"Us.\nMANDATE: ${mandate}\nOUTCOME: ${outcome} at ${outcomeQuarter}\nDECISIONS:\n${validLog.map((d, i) => `${i + 1}. (${d.quarter}) ${d.agentDecision}`).join('\n')}\n\nRespond ONLY in JSON (no markdown):\n{"consistencyScore":85,"assessment":"2-3 sentences.","driftPoint":"Which decision showed most drift and why."}`,
  }], 'strategic'));

  return {
    mandate,
    outcome,
    outcomeQuarter,
    finalState: cs,
    trajectory: traj,
    decisions: log,
    consistency: consistencyRes,
  };
}
