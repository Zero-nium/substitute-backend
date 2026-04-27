// scenarios/blockbuster.js — Blockbuster Inc. BBI-2004 Scenario
// CEO substitution Q4 2004 – Q3 2010. Chapter 11 filed September 23, 2010.

const WORLD = {
  "2004-Q4": { gdpGrowth: 3.6,  fedRate: 2.25, consumerConf: 93,  recessionActive: false, crisisActive: false, netflixSubs: 2.6,  onlineRentalShare: 3,  streamingExists: false, dvdRentalRevDecline: 0   },
  "2005-Q1": { gdpGrowth: 4.3,  fedRate: 2.75, consumerConf: 103, recessionActive: false, crisisActive: false, netflixSubs: 3.2,  onlineRentalShare: 4,  streamingExists: false, dvdRentalRevDecline: 3   },
  "2005-Q2": { gdpGrowth: 3.4,  fedRate: 3.25, consumerConf: 106, recessionActive: false, crisisActive: false, netflixSubs: 3.8,  onlineRentalShare: 5,  streamingExists: false, dvdRentalRevDecline: 5   },
  "2005-Q3": { gdpGrowth: 3.3,  fedRate: 3.75, consumerConf: 99,  recessionActive: false, crisisActive: false, netflixSubs: 4.0,  onlineRentalShare: 6,  streamingExists: false, dvdRentalRevDecline: 6   },
  "2005-Q4": { gdpGrowth: 1.7,  fedRate: 4.25, consumerConf: 99,  recessionActive: false, crisisActive: false, netflixSubs: 4.2,  onlineRentalShare: 7,  streamingExists: false, dvdRentalRevDecline: 8   },
  "2006-Q1": { gdpGrowth: 3.3,  fedRate: 4.75, consumerConf: 107, recessionActive: false, crisisActive: false, netflixSubs: 5.0,  onlineRentalShare: 9,  streamingExists: false, dvdRentalRevDecline: 10  },
  "2006-Q2": { gdpGrowth: 2.6,  fedRate: 5.00, consumerConf: 105, recessionActive: false, crisisActive: false, netflixSubs: 5.5,  onlineRentalShare: 11, streamingExists: false, dvdRentalRevDecline: 11  },
  "2006-Q3": { gdpGrowth: 2.0,  fedRate: 5.25, consumerConf: 100, recessionActive: false, crisisActive: false, netflixSubs: 5.9,  onlineRentalShare: 13, streamingExists: false, dvdRentalRevDecline: 12  },
  "2006-Q4": { gdpGrowth: 3.2,  fedRate: 5.25, consumerConf: 110, recessionActive: false, crisisActive: false, netflixSubs: 6.3,  onlineRentalShare: 15, streamingExists: false, dvdRentalRevDecline: 13  },
  "2007-Q1": { gdpGrowth: 1.0,  fedRate: 5.25, consumerConf: 108, recessionActive: false, crisisActive: false, netflixSubs: 6.8,  onlineRentalShare: 18, streamingExists: false, dvdRentalRevDecline: 14  },
  "2007-Q2": { gdpGrowth: 2.1,  fedRate: 5.25, consumerConf: 106, recessionActive: false, crisisActive: false, netflixSubs: 7.0,  onlineRentalShare: 21, streamingExists: false, dvdRentalRevDecline: 15  },
  "2007-Q3": { gdpGrowth: 3.0,  fedRate: 4.75, consumerConf: 99,  recessionActive: false, crisisActive: false, netflixSubs: 7.5,  onlineRentalShare: 24, streamingExists: true,  dvdRentalRevDecline: 17  },
  "2007-Q4": { gdpGrowth: 1.8,  fedRate: 4.25, consumerConf: 90,  recessionActive: false, crisisActive: false, netflixSubs: 7.8,  onlineRentalShare: 27, streamingExists: true,  dvdRentalRevDecline: 18  },
  "2008-Q1": { gdpGrowth: -2.3, fedRate: 2.25, consumerConf: 76,  recessionActive: true,  crisisActive: false, netflixSubs: 8.2,  onlineRentalShare: 31, streamingExists: true,  dvdRentalRevDecline: 20  },
  "2008-Q2": { gdpGrowth: 1.3,  fedRate: 2.00, consumerConf: 50,  recessionActive: true,  crisisActive: false, netflixSubs: 8.6,  onlineRentalShare: 34, streamingExists: true,  dvdRentalRevDecline: 22  },
  "2008-Q3": { gdpGrowth: -2.0, fedRate: 2.00, consumerConf: 58,  recessionActive: true,  crisisActive: true,  netflixSubs: 9.0,  onlineRentalShare: 37, streamingExists: true,  dvdRentalRevDecline: 25  },
  "2008-Q4": { gdpGrowth: -8.9, fedRate: 0.25, consumerConf: 38,  recessionActive: true,  crisisActive: true,  netflixSubs: 9.4,  onlineRentalShare: 40, streamingExists: true,  dvdRentalRevDecline: 28  },
  "2009-Q1": { gdpGrowth: -6.7, fedRate: 0.25, consumerConf: 26,  recessionActive: true,  crisisActive: true,  netflixSubs: 10.3, onlineRentalShare: 44, streamingExists: true,  dvdRentalRevDecline: 32  },
  "2009-Q2": { gdpGrowth: -0.7, fedRate: 0.25, consumerConf: 49,  recessionActive: false, crisisActive: false, netflixSubs: 11.1, onlineRentalShare: 48, streamingExists: true,  dvdRentalRevDecline: 35  },
  "2009-Q3": { gdpGrowth: 1.7,  fedRate: 0.25, consumerConf: 53,  recessionActive: false, crisisActive: false, netflixSubs: 11.9, onlineRentalShare: 52, streamingExists: true,  dvdRentalRevDecline: 38  },
  "2009-Q4": { gdpGrowth: 3.8,  fedRate: 0.25, consumerConf: 53,  recessionActive: false, crisisActive: false, netflixSubs: 12.3, onlineRentalShare: 55, streamingExists: true,  dvdRentalRevDecline: 40  },
  "2010-Q1": { gdpGrowth: 2.3,  fedRate: 0.25, consumerConf: 57,  recessionActive: false, crisisActive: false, netflixSubs: 13.9, onlineRentalShare: 59, streamingExists: true,  dvdRentalRevDecline: 44  },
  "2010-Q2": { gdpGrowth: 3.9,  fedRate: 0.25, consumerConf: 62,  recessionActive: false, crisisActive: false, netflixSubs: 15.0, onlineRentalShare: 63, streamingExists: true,  dvdRentalRevDecline: 48  },
  "2010-Q3": { gdpGrowth: 2.5,  fedRate: 0.25, consumerConf: 67,  recessionActive: false, crisisActive: false, netflixSubs: 16.9, onlineRentalShare: 67, streamingExists: true,  dvdRentalRevDecline: 52  },
};

const QUARTERS = Object.keys(WORLD);
const END_QUARTER = '2010-Q3';

const INITIAL_CS = {
  revenue:           5900,
  ebitda:            450,
  cash:              300,
  totalDebt:         1000,
  annualDebtService: 90,
  storeCount:        5600,
  onlineSubscribers: 0.75,
  lateFeeRevenue:    400,
  boardConfidence:   70,
  digitalCapability: 10,
  debtCovenant:      2.2,
  ceoTenure:         0,
};

const DECISIONS = [
  {
    id: 'B001', quarter: '2004-Q4', tier: 'T1',
    trigger: 'Viacom spin-off complete. You inherit $1B debt and Blockbuster Online (750k subscribers). Netflix has 2.6M subscribers, growing 40%/yr, and just turned profitable. Late fees generate $400M/yr but are a PR crisis. Define your strategic posture.',
    human: 'Antioco retained late fees initially, continued Blockbuster Online investment, and planned to eliminate late fees in Q1 2005. Described company as transforming from "rentailer" to complete entertainment source.',
  },
  {
    id: 'B002', quarter: '2005-Q2', tier: 'T1',
    trigger: 'Late fee elimination has reduced revenue by ~$400M annually. Customer satisfaction is up sharply. Blockbuster Online growing — now 1.5M subscribers. Netflix at 3.8M. Carl Icahn has begun acquiring Blockbuster stock. Capital allocation review: accelerate online investment or stabilise the P&L?',
    human: 'Antioco accelerated Blockbuster Online investment despite the revenue hit. Icahn began agitating publicly about management costs.',
  },
  {
    id: 'B003', quarter: '2005-Q4', tier: 'T2',
    trigger: 'Icahn wins 3 board seats in proxy battle. He now has direct board influence and wants cost cuts. You have 2M online subscribers but are burning cash. Holiday season inventory and pricing strategy — and how to manage the new board dynamic.',
    human: 'Antioco managed the holiday season with promotional pricing. Agreed to some cost reductions but protected online investment. Icahn began demanding CEO compensation cuts.',
  },
  {
    id: 'B004', quarter: '2006-Q2', tier: 'T1',
    trigger: 'Blockbuster Online has 2M subscribers. Netflix has 5.5M. You can launch Total Access — customers return online DVDs to stores and get immediate replacements. Each exchange costs ~$2 in incremental cost. The program could attract subscribers fast but burn cash. Scale it or constrain it?',
    human: 'Antioco launched Total Access aggressively. Blockbuster briefly threatened Netflix\'s subscriber lead. But each exchange was loss-making at the per-unit level.',
  },
  {
    id: 'B005', quarter: '2006-Q4', tier: 'T2',
    trigger: 'Total Access has driven Blockbuster Online to 3M+ subscribers. Netflix lost subscribers for the first time. But Total Access is loss-making per exchange. Icahn is furious about the burn rate and your compensation. The board has cut your bonus from $7.6M to $2.28M. Fight or accommodate?',
    human: 'Antioco agreed to a reduced bonus. Continued Total Access. The board conflict deepened. Icahn characterised it as a personal battle.',
  },
  {
    id: 'B006', quarter: '2007-Q1', tier: 'T1',
    trigger: 'Icahn has forced a leadership transition. You must decide whether to fight for your position or negotiate an exit. Netflix just launched streaming (Watch Now). Staying means board conflict and distraction. Leaving risks Icahn installing a successor who abandons Total Access. Stay or resign?',
    human: 'Antioco negotiated his exit in March 2007. Left with ~$8M severance. Icahn installed Jim Keyes (ex 7-Eleven CEO) in July 2007. Keyes had no digital experience.',
  },
  {
    id: 'B007', quarter: '2007-Q3', tier: 'T1',
    trigger: 'Netflix has launched streaming. Blockbuster has 3M+ Total Access subscribers — its most valuable asset. The central question: protect and grow Total Access as the primary strategic asset, or refocus on stores and cash flow as Icahn wants. Store closures are accelerating.',
    human: 'Keyes killed Total Access investment, refocused on physical stores, and began cutting online costs. Said he did not see Netflix as a threat.',
  },
  {
    id: 'B008', quarter: '2008-Q1', tier: 'T2',
    trigger: 'US recession confirmed. Consumer spending contracting. Blockbuster stores are overhead liabilities — leases locked at peak rents. Online subscribers bleeding as Total Access winds down. Netflix streaming growing fast. Recession emergency response?',
    human: 'Keyes cut costs and accelerated store closures but did not invest in streaming. Focused on merchandising and in-store experience.',
  },
  {
    id: 'B009', quarter: '2008-Q4', tier: 'T1',
    trigger: 'Lehman collapse. Credit markets frozen. Blockbuster has ~$1B debt and cannot refinance. Netflix streaming passes 9M subscribers. Blockbuster is in existential territory. Strategic options: debt restructuring, asset sale (BBI brand + remaining subscribers), or operate to bankruptcy?',
    human: 'Keyes sought refinancing but markets were closed. No strategic restructuring initiated. Continued operating.',
  },
  {
    id: 'B010', quarter: '2009-Q2', tier: 'T2',
    trigger: 'Post-GFC stabilisation. Netflix has 11M subscribers. Blockbuster Online is effectively dead — sub-1M subscribers after Total Access abandonment. US store count ~3,500. Redbox taking the low-end market. Options: attempt streaming pivot, sell to strategic buyer, or restructure debt pre-emptively.',
    human: 'Keyes attempted streaming pivot but lacked technology and capital. Explored sale to Dish Network. No pre-emptive restructuring.',
  },
  {
    id: 'B011', quarter: '2009-Q4', tier: 'T1',
    trigger: 'Final refinancing window. ~$930M debt, ~$60M cash, declining revenue. Lenders demanding covenant relief. Netflix at 12.3M subscribers accelerating on streaming. Dish Network has expressed acquisition interest. Pre-packaged Chapter 11 now, or fight on and risk disorderly bankruptcy?',
    human: 'Blockbuster rejected pre-packaged restructuring hoping for a last-minute deal. Filed Chapter 11 September 2010. Sold to Dish Network for $320M.',
  },
  {
    id: 'B012', quarter: '2010-Q2', tier: 'T2',
    trigger: 'Bankruptcy imminent. Netflix has 15M subscribers. Blockbuster has exhausted its options. Final quarter before filing — manage the wind-down to maximise recovery, or attempt a last deal: streaming partnership, kiosk pivot, or fire sale to a retail acquirer?',
    human: 'Chapter 11 filed September 23, 2010. Sold to Dish Network for $320M vs $5B peak market cap. One Blockbuster remains in Bend, Oregon.',
  },
];

const SCENARIO_BRIEF = `You are about to assume the role of CEO of Blockbuster Inc. in Q4 2004.

SITUATION: Blockbuster has just completed its spin-off from Viacom, becoming a fully independent company. Viacom loaded approximately $1 billion in debt onto the company at separation. You inherit a business that is the dominant physical video rental chain in America — but the ground is shifting.

COMPANY AT HANDOVER (Q4 2004):
- Revenue: $5.9B annually | EBITDA: ~$450M | Cash: ~$300M
- Total Debt: ~$1B | Annual Debt Service: ~$90M
- Stores: 5,600 US locations (9,100 worldwide)
- Blockbuster Online: 750,000 subscribers (launched 2004)
- Late Fees: $400M annual revenue — but a major customer PR liability
- ND/EBITDA: 2.2x — manageable, but will worsen as revenue declines

COMPETITIVE CONTEXT:
- Netflix: 2.6M subscribers, 40% growth rate, just turned profitable, DVD-by-mail
- In 2000, Blockbuster declined to acquire Netflix for $50M
- Walmart: entering DVD rental market
- Redbox: kiosk model emerging, $1/night, no late fees
- Streaming: not yet a real consumer market, but bandwidth is improving

THE STRUCTURAL TRAP:
Your $1B debt is manageable at current revenue — but your core business (physical rental) is in structural decline. Every percentage point of market share Netflix gains comes directly from your store revenue. Late fees are politically toxic but represent 7% of revenue. Your 5,600 stores are locked into multi-year leases that become overhead liabilities as traffic declines. Unlike a pure balance-sheet crisis, this is a strategic trap: the business model that generated the cash to service the debt is being disrupted in real time.

SIMULATION WINDOW: Q4 2004 to Q3 2010 (24 quarters). You face 12 decision points.
You do not know the future. From 2007-Q3 onwards you may resign as a strategic decision.

OUTCOMES: SURVIVED (reached 2010-Q3 solvent with viable business), BANKRUPT (cash < debt service AND operating at a loss), or RESIGNED.`;

const DECISION_ANCHORS = {
  B001: { cash:{min:-200,max:100},  ebitda:{min:-150,max:80},  onlineSubscribers:{min:0,max:0.5},   lateFeeRevenue:{min:-400,max:0},   boardConfidence:{min:-15,max:20},  digitalCapability:{min:0,max:20} },
  B002: { cash:{min:-250,max:100},  ebitda:{min:-80,max:50},   onlineSubscribers:{min:0,max:1.0},   boardConfidence:{min:-25,max:10},  digitalCapability:{min:0,max:25},  totalDebt:{min:-100,max:50} },
  B003: { cash:{min:-100,max:150},  ebitda:{min:-50,max:100},  onlineSubscribers:{min:-0.2,max:0.5},boardConfidence:{min:-30,max:10},  storeCount:{min:-50,max:0},        digitalCapability:{min:-10,max:10} },
  B004: { cash:{min:-200,max:50},   ebitda:{min:-100,max:30},  onlineSubscribers:{min:0,max:2.0},   boardConfidence:{min:-20,max:15},  digitalCapability:{min:0,max:20},  lateFeeRevenue:{min:-100,max:0} },
  B005: { cash:{min:-150,max:80},   ebitda:{min:-80,max:40},   onlineSubscribers:{min:-0.5,max:1.5},boardConfidence:{min:-30,max:10},  storeCount:{min:-100,max:0},       digitalCapability:{min:-10,max:15} },
  B006: { cash:{min:-50,max:30},    ebitda:{min:-30,max:30},   onlineSubscribers:{min:-0.5,max:0.5},boardConfidence:{min:-35,max:20},  digitalCapability:{min:-15,max:10},storeCount:{min:-50,max:0} },
  B007: { cash:{min:-150,max:100},  ebitda:{min:-60,max:60},   onlineSubscribers:{min:-1.5,max:1.5},boardConfidence:{min:-20,max:25},  digitalCapability:{min:-20,max:20},storeCount:{min:-150,max:10}, lateFeeRevenue:{min:-200,max:200} },
  B008: { cash:{min:-100,max:150},  ebitda:{min:-100,max:60},  onlineSubscribers:{min:-1.0,max:0.5},boardConfidence:{min:-20,max:10},  storeCount:{min:-200,max:0},       digitalCapability:{min:-10,max:20}, totalDebt:{min:-100,max:0} },
  B009: { cash:{min:-150,max:100},  ebitda:{min:-100,max:40},  onlineSubscribers:{min:-1.0,max:0.5},boardConfidence:{min:-30,max:10},  storeCount:{min:-300,max:0},       totalDebt:{min:-200,max:100},      annualDebtService:{min:-30,max:30} },
  B010: { cash:{min:-150,max:200},  ebitda:{min:-80,max:40},   onlineSubscribers:{min:-0.5,max:1.0},boardConfidence:{min:-25,max:15},  storeCount:{min:-400,max:0},       digitalCapability:{min:-10,max:30},totalDebt:{min:-300,max:0} },
  B011: { cash:{min:-100,max:300},  ebitda:{min:-60,max:30},   onlineSubscribers:{min:-0.4,max:0.3},boardConfidence:{min:-30,max:15},  storeCount:{min:-500,max:0},       totalDebt:{min:-500,max:0},        annualDebtService:{min:-50,max:20} },
  B012: { cash:{min:-80,max:150},   ebitda:{min:-80,max:20},   onlineSubscribers:{min:-0.4,max:0.2},boardConfidence:{min:-30,max:10},  storeCount:{min:-500,max:0},       totalDebt:{min:-200,max:0} },
};

const GLOBAL_BOUNDS = {
  cash:              { min: 0,    max: 2000 },
  ebitda:            { min: -500, max: 800  },
  onlineSubscribers: { min: 0,    max: 8.0  },
  storeCount:        { min: 0,    max: 6000 },
  boardConfidence:   { min: 0,    max: 100  },
  digitalCapability: { min: 0,    max: 100  },
  totalDebt:         { min: 0,    max: 1500 },
  annualDebtService: { min: 0,    max: 200  },
  lateFeeRevenue:    { min: 0,    max: 450  },
};

function isBankrupt(cs) {
  // Blockbuster: liquidity crisis, not covenant crisis
  // Cash can't cover debt service AND operating at a loss
  return cs.cash < cs.annualDebtService && cs.ebitda < 0;
}

// propagate — Blockbuster-specific world state application
// Revenue declines driven by Netflix subscriber growth and DVD rental market share loss
function propagate(cs, world, prevWorld) {
  const ns = { ...cs };

  // Revenue: structural decline driven by online rental market share growth
  const rentalDecline = world.dvdRentalRevDecline / 100;
  const baseDecline = world.recessionActive ? -0.06 : -0.02;
  const revenueGrowth = baseDecline - (rentalDecline * 0.4);
  ns.revenue = Math.max(500, Math.round(ns.revenue * (1 + revenueGrowth)));

  // EBITDA: store overhead + declining revenue = margin compression
  const storeOverhead = ns.storeCount > 4000 ? -8 : ns.storeCount > 2500 ? -4 : -1;
  const streamingPressure = world.streamingExists ? -5 : 0;
  ns.ebitda = Math.round(
    ns.ebitda + (world.recessionActive ? -15 : -5) + storeOverhead + streamingPressure
  );

  // Cash: EBITDA minus debt service, partially retained
  ns.cash = Math.max(0, Math.round(ns.cash + (ns.ebitda - ns.annualDebtService) * 0.3));

  // debtCovenant: derived from components (same pattern as TRU)
  ns.debtCovenant = ns.ebitda > 0
    ? parseFloat((ns.totalDebt / ns.ebitda).toFixed(2))
    : 99;

  // Passive Netflix subscriber growth erodes Blockbuster's online base
  if (ns.onlineSubscribers > 0) {
    const erosion = world.streamingExists ? 0.05 : 0.02;
    ns.onlineSubscribers = parseFloat(Math.max(0, ns.onlineSubscribers - erosion).toFixed(2));
  }

  // Board confidence pressure from operating losses
  const perfPressure = ns.ebitda < 0 ? -3.5 : ns.ebitda < 100 ? -1.5 : -0.5;
  ns.boardConfidence = parseFloat(Math.max(5, ns.boardConfidence + perfPressure).toFixed(1));

  ns.ceoTenure = (ns.ceoTenure || 0) + 1;
  return ns;
}

export const BLOCKBUSTER_SCENARIO = {
  id:              'BBI-2004',
  name:            'Blockbuster — The Streaming Disruption',
  description:     'CEO substitution at Blockbuster Q4 2004. $1B Viacom spin-off debt. Netflix disruption. 12 decisions, 24 quarters. Chapter 11 filed Sep 2010.',
  status:          'active',
  tags:            ['entertainment', 'retail', 'digital-disruption', 'streaming', 'video-rental'],
  researchQuestion: 'Is Blockbuster\'s bankruptcy strategically deterministic — could any CEO have preserved a viable business against Netflix\'s structural advantage?',

  INITIAL_CS,
  QUARTERS,
  END_QUARTER,
  DECISIONS,
  WORLD,
  SCENARIO_BRIEF,
  DECISION_ANCHORS,
  GLOBAL_BOUNDS,
  isBankrupt,
  propagate,

  // Scenario-specific state field declarations
  stateFields: {
    onlineSubscribers: { type: 'float',   unit: 'M',   displayName: 'Online Subscribers',   description: 'Blockbuster Online / Total Access subscribers (millions)' },
    lateFeeRevenue:    { type: 'currency', unit: '$M',  displayName: 'Late Fee Revenue',      description: 'Annual late fee revenue' },
    storeCount:        { type: 'integer',  unit: '',    displayName: 'US Stores',             description: 'Number of US store locations' },
    digitalCapability: { type: 'index',    unit: 'pts', displayName: 'Digital Capability',   description: 'Streaming/digital capability index 0–100' },
    ceoTenure:         { type: 'integer',  unit: 'qtrs',displayName: 'CEO Tenure',           description: 'Quarters as CEO' },
  },

  // Resignation available from 2007-Q3 (post-Icahn proxy battle)
  resignationAvailableFrom: '2007-Q3',

  // Historical outcome for comparison
  HISTORICAL: {
    revenue:           3300,
    ebitda:            -180,
    cash:              60,
    totalDebt:         930,
    storeCount:        3300,
    onlineSubscribers: 0.4,
    outcome:           'BANKRUPT',
    outcomeQuarter:    '2010-Q3',
    netflixSubsAtBankruptcy: 16.9,
    salePrice:         320, // $M to Dish Network
  },
};
