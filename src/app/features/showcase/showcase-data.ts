import { signal, computed, Injectable } from '@angular/core';

// ─── Console log lines per slide ─────────────────────────────────────────────

const CONSOLE_SEQUENCES: string[][] = [
  // Slide 0 – Hook
  [
    '> Hackathon brief: bygg ett ledningssystem för framtidens luftförsvar',
    '> Användare: luftbevakare / flygstridsledare / command authority',
    '> Kärnfråga: hur möter vi hotet nu utan att tömma nästa våg?',
    '> Steel svarar med policy, validation och ontology',
    '> Presentationen visar den mest intressanta delen av helheten',
  ],
  // Slide 1 – Operator flow
  [
    '> Ingest: radar, track, intent och logistik läses in i samma theater state',
    '> Fusion: RAP byggs och spår prioriteras efter hot, fart och riktning',
    '> Attack: flera inkommande objekt måste mötas i rätt ordning',
    '> Intercept: systemet räknar när vi ska slå till och när vi ska hålla igen',
    '> Supply lines: beslutet måste tas tidigt innan korridoren bryts',
    '> Output: operatören ser vad som händer nu och vad som måste sparas till sen',
  ],
  // Slide 2 – Policy-driven COA
  [
    '> POST /api/coa/solve  [200 OK | 108ms]',
    '> Input: commander posture, reserve floor och hotbild',
    '> COA-MAX väljer snabbast effekt nu men äter av djupet',
    '> COA-BAL balanserar effekt nu mot beredskap för nästa våg',
    '> COA-DST maximerar uthållighet och prioriterar reserve first',
    '> Output: ett val som är lätt att motivera och lätt att följa upp',
  ],
  // Slide 3 – Robustness validation
  [
    '> Decision tree: varje nod frågar vad som händer om antagandet ändras',
    '> ML inferens: varje gren får en sannolikhet och ett förväntat utfall',
    '> Monte Carlo: tusentals körningar stressar risk, friktion och osäkerhet',
    '> Counterfactual handoff: samma beslut testas med andra initialvillkor',
    '> Collapse horizon: när grenen blir för skör får den inte låsas',
  ],
  // Slide 4 – Ontology and unification
  [
    '> Single source of truth för theater state',
    '> Policy, readiness, logistics och labs läser samma modell',
    '> FastAPI är backend-autoritet för state och beslut',
    '> Shared domain models håller betydelsen stabil mellan ytor',
    '> Truth-first betyder att samma data används, inte kopieras',
  ],
  // Slide 5 – Ontology summary
  [
    '> Ontologi laddad: 5 domäner',
    '> Beslutsstöd, lägesbild, logistik, operatörsytor och infrastruktur',
    '> Varje domän beskriver samma verklighet men med eget ansvar',
    '> Utan ontologi får samma ord olika betydelse i olika ytor',
    '> Med ontologi kan staten delas utan att logiken går sönder',
  ],
  // Slide 6 – Unification effects
  [
    '> Governance, logistics och field console delar samma state',
    '> C2 resilience och threat inspector läser samma semantik',
    '> Demo director och scenario injection följer samma kontrakt',
    '> Knowledge graph binder ihop policy, readiness och operations',
    '> Sovereign deployment kan ske utan att byta betydelse',
  ],
  // Slide 7 – Closing
  [
    '> Svar på frågan: bygg ett prototypiskt ledningssystem för luftförsvar',
    '> Visa användarmål, påverkan och de oundvikliga aktiviteterna',
    '> Visa varför policy, validation och ontology måste hänga ihop',
    '> Visa den mest intressanta delen av en komplett lösning',
  ],
  // Slide 8 – Scenario dual-demo
  [
    '> Scenario A: Boreal Strike — 5 MISSILE HI-VAL inbound mot Highridge Command',
    '> Bayesian update: intent_distribution.strike 0.30 → 0.82 på 10 sekunder',
    '> COA solve: MAX_PROTECTION engagerar alla hot, BAL hedgar, DST sparar interceptors',
    '> Scenario B: Ghost Feint — 10 AIRCRAFT PROBE/FEINT omdirigeras till STRIKE',
    '> Jamming active: sensor_quality 1.0 → 0.7, confidence 0.65 → 0.45',
    '> Redirect v=450 km/h: intent_distribution.strike 0.10 → 0.75, system reclassifies',
    '> Decision tree + ontology + heuristics validerar båda utfall',
    '> LLM rationale: strukturerad förklaring av beslut, intent-shift och policy tradeoff',
  ],
];

interface ScenarioParameter {
  key: string;
  before: string;
  after: string;
  description: string;
}

interface ScenarioPhase {
  id: string;
  label: string;
  narrative: string;
}

interface LlmRationaleBlock {
  heading: string;
  body: string;
  tag: string;
}

interface DualScenario {
  id: string;
  name: string;
  tagline: string;
  narrative: string;
  threatCount: number;
  threatClass: string;
  velocity: number;
  initStrikeProb: number;
  targetBase: string;
  bayesianResult: string;
  coaRecommendation: string;
  parameters: ScenarioParameter[];
  phases: ScenarioPhase[];
  rationaleBlocks: LlmRationaleBlock[];
}

interface NarrativeCard {
  id: string;
  tag: string;
  title: string;
  body: string;
}

interface OntologyDomainCard {
  id: string;
  title: string;
  summary: string;
  datapoints: string;
  why: string;
}

interface UnificationEffect {
  id: string;
  title: string;
  body: string;
}

interface SlidePreviewCopy {
  lead: string;
  detail: string;
  bullets: string[];
}

interface SystemComparisonRow {
  label: string;
  legacyText: string;
  benefit: string;
  bdtText: string;
}

interface ValidationBranch {
  label: string;
  probability: number;
  score: number;
  outcome: string;
  counterfactual: string;
}

interface ValidationTree {
  id: string;
  title: string;
  premise: string;
  modelHint: string;
  collapseHint: string;
  branches: ValidationBranch[];
}

const OPERATOR_STEPS: NarrativeCard[] = [
  {
    id: 'step-1',
    tag: '01',
    title: 'Samla sensordata',
    body: 'Bygg RAP från flera källor i realtid, inte från en isolerad vy.',
  },
  {
    id: 'step-2',
    tag: '02',
    title: 'Fusionera lägesbilden',
    body: 'Intent, spår och friktion måste sammanfalla innan beslutet får en riktning.',
  },
  {
    id: 'step-3',
    tag: '03',
    title: 'Välj bas och effektor',
    body: 'Beredskap, räckvidd och eldkraft måste vägas mot varandra för nästa våg.',
  },
  {
    id: 'step-4',
    tag: '04',
    title: 'Skydda uthålligheten',
    body: 'Reserven får inte tömmas nu om systemet ska klara uppföljande anfall.',
  },
];

const VALIDATION_STEPS: NarrativeCard[] = [
  {
    id: 'val-1',
    tag: 'DT',
    title: 'Decision tree',
    body: 'Vi bryter ner frågan i grenar så att varje antagande blir explicit och kan följas.',
  },
  {
    id: 'val-2',
    tag: 'ML',
    title: 'ML inference',
    body: 'Varje gren får en uppskattad sannolikhet och ett förväntat utfall från modellen.',
  },
  {
    id: 'val-3',
    tag: 'MC',
    title: 'Monte Carlo',
    body: 'Tusentals körningar stressar osäkerhet, saturation och command friction.',
  },
  {
    id: 'val-4',
    tag: 'CF',
    title: 'Counterfactual lab',
    body: 'Samma beslut testas med andra ingångsvärden för att se vad som faktiskt ändras.',
  },
  {
    id: 'val-5',
    tag: 'CH',
    title: 'Collapse horizon',
    body: 'Vi visar när en gren blir för skör för att låsas som operativ rekommendation.',
  },
];

const VALIDATION_TREES: ValidationTree[] = [
  {
    id: 'tree-1',
    title: 'Intercept certainty',
    premise: 'När sensorconfidence är hög vill modellen låsa en snabb intercept-gren.',
    modelHint: 'Decision tree prioriterar commit när signalen är ren och tidsfönstret är kort.',
    collapseHint: 'Om confidence sjunker under tröskeln ska grenen falla tillbaka till hold.',
    branches: [
      {
        label: 'Commit intercept',
        probability: 0.74,
        score: 0.91,
        outcome: 'Commit',
        counterfactual: 'Drop confidence 12% and the tree flips to hold reserve.',
      },
      {
        label: 'Hold / reconfirm',
        probability: 0.26,
        score: 0.43,
        outcome: 'Hold',
        counterfactual: 'Raise false positive cost and the hold branch becomes dominant.',
      },
    ],
  },
  {
    id: 'tree-2',
    title: 'Allocation balance',
    premise: 'När commander posture vägs mot reserve floor jämförs tre COA-grenar.',
    modelHint: 'ML inferens score:ar varje alternativ mot effect now, balance och depth.',
    collapseHint: 'COA-MAX blir skör om reserve floor trycks upp; COA-DST blir skör om time pressure ökar.',
    branches: [
      {
        label: 'COA-MAX',
        probability: 0.23,
        score: 0.63,
        outcome: 'Fast effect',
        counterfactual: 'Increase reserve floor and MAX loses dominance immediately.',
      },
      {
        label: 'COA-BAL',
        probability: 0.52,
        score: 0.84,
        outcome: 'Balanced',
        counterfactual: 'Slightly worse posture still keeps BAL as the safest middle.',
      },
      {
        label: 'COA-DST',
        probability: 0.25,
        score: 0.90,
        outcome: 'Deep reserve',
        counterfactual: 'If the mission becomes time-critical, DST loses to BAL.',
      },
    ],
  },
  {
    id: 'tree-3',
    title: 'Supply corridor',
    premise: 'När supply lines, escort och corridor pressure finns i samma state måste beslutet komma tidigt.',
    modelHint: 'Counterfactual inference tests whether the line survives if support is delayed or rerouted.',
    collapseHint: 'Once corridor pressure crosses the threshold, delay becomes worse than a hard intercept.',
    branches: [
      {
        label: 'Protect corridor',
        probability: 0.61,
        score: 0.88,
        outcome: 'Support reaches base',
        counterfactual: 'Remove escort and the branch collapses into supply failure.',
      },
      {
        label: 'Re-route support',
        probability: 0.27,
        score: 0.66,
        outcome: 'Support delayed',
        counterfactual: 'Worsen corridor pressure and the reroute branch degrades quickly.',
      },
      {
        label: 'Delay commitment',
        probability: 0.12,
        score: 0.34,
        outcome: 'Line breaks',
        counterfactual: 'Under higher threat this branch becomes non-viable instantly.',
      },
    ],
  },
];

const NOVEL_METHODS: NarrativeCard[] = [
  {
    id: 'method-1',
    tag: 'M1',
    title: 'Policy-driven multi-wave COA',
    body: 'Commander posture och reserve floor styr valet så att wave-2-beredskap bevaras.',
  },
  {
    id: 'method-2',
    tag: 'M2',
    title: 'Robusthet och kontrafaktik',
    body: 'Beslutet låses först efter Monte Carlo, labbhandoff och stress mot osäkerhet.',
  },
  {
    id: 'method-3',
    tag: 'M3',
    title: 'Funktionell ontologi',
    body: 'Samma theater state matar policy, readiness, logistics, governance och labs.',
  },
];

const COA_CYCLE = ['COA-MAX', 'COA-BAL', 'COA-DST'] as const;

const ONTOLOGY_DOMAINS: OntologyDomainCard[] = [
  {
    id: 'domain-1',
    title: 'Beslutsstöd & analys',
    summary: 'COA, rationale, Monte Carlo och counterfactuals.',
    datapoints: '4 inputs · 3 scores · 1 recommendation',
    why: 'Gör osäkerhet handlingsbar och låter operatören förstå valet.',
  },
  {
    id: 'domain-2',
    title: 'Taktisk lägesbild',
    summary: 'Tracks, intent och sensorfusion i realtid.',
    datapoints: '6 track-signaler · 1 RAP · 3 prioriteringar',
    why: 'Ger samma bild av hotet som operatören behöver för att agera.',
  },
  {
    id: 'domain-3',
    title: 'Logistik & uthållighet',
    summary: 'Supply nodes, corridors och reinforcements.',
    datapoints: '4 logistics-signaler · 2 corridors · 1 threshold',
    why: 'Håller nästa våg möjlig genom att visa vad som kan upprätthållas.',
  },
  {
    id: 'domain-4',
    title: 'Operatörsytor',
    summary: 'Command surfaces, field view och governance UI.',
    datapoints: '3 surfaces · 1 interaction model · 0 drift',
    why: 'Gör att människan kan förstå, justera och godkänna beslutet.',
  },
  {
    id: 'domain-5',
    title: 'Infrastruktur',
    summary: 'State, SSR, transport och API-seams.',
    datapoints: '5 shared seams · 1 state backbone · 1 contract',
    why: 'Håller allt kopplat till samma källa och samma semantik.',
  },
];

const UNIFICATION_EFFECTS: UnificationEffect[] = [
  {
    id: 'effect-1',
    title: 'Governance',
    body: 'Policy trace, audit och auktoritet kan följa samma state istället för kopierade snapshots.',
  },
  {
    id: 'effect-2',
    title: 'Logistics',
    body: 'Försörjningsvägar, readiness och reinforcement-planer använder samma domänmodell.',
  },
  {
    id: 'effect-3',
    title: 'Field console',
    body: 'Operatören ser samma theater context genom en annan yta, inte en annan sanning.',
  },
  {
    id: 'effect-4',
    title: 'C2 resilience',
    body: 'Command friction och collapse horizon kan räknas från samma backbone som besluten.',
  },
  {
    id: 'effect-5',
    title: 'Threat inspector',
    body: 'Intent och osäkerhet förblir bundna till de tracks som skapade dem.',
  },
  {
    id: 'effect-6',
    title: 'Demo director',
    body: 'Scenario injection följer samma kontrakt som operativ drift och labbflöden.',
  },
  {
    id: 'effect-7',
    title: 'Sovereign deployment',
    body: 'Samma modell kan köras lokalt eller i EU-miljö utan att betydelsen ändras.',
  },
];

const DUAL_SCENARIOS: DualScenario[] = [
  {
    id: 'boreal-strike',
    name: 'Boreal Strike',
    tagline: 'Classic Kinetic Strike Package',
    narrative: 'A coordinated missile strike targeting your highest-value base — Highridge Command, the Orchestrator. Clean, fast, high-confidence — the system should classify it as STRIKE quickly and recommend MAX_PROTECTION.',
    threatCount: 5,
    threatClass: 'MISSILE',
    velocity: 450,
    initStrikeProb: 0.55,
    targetBase: 'BASE-2 · Highridge Command',
    bayesianResult: 'g(450, 450, 150) ≈ 1.0 — velocity matches perfectly. MISSILE class bias gives strike a 0.65 prior. Intent distribution converges to STRIKE >80% within ~10 seconds.',
    coaRecommendation: 'MAX_PROTECTION engages all threats. BALANCED hedges for a second wave. DEEP_SUSTAINABILITY conserves interceptors.',
    parameters: [
      { key: 'intent_distribution.strike', before: '~0.30', after: '~0.82', description: 'Strike probability climbing as Bayesian posterior converges' },
      { key: 'classification_confidence', before: '0.65', after: '0.85', description: 'Confidence rising as evidence accumulates' },
      { key: 'time_to_target', before: '180 s', after: '60 s', description: 'Counting down — urgency spike' },
      { key: 'threat_value', before: '—', after: '~1.0×', description: 'Missiles get highest priority value' },
      { key: 'Pk (kill probability)', before: '—', after: 'varies by effector', description: 'Optimal base-effector pairings from solver' },
      { key: 'f_safety vs f_sustain', before: '0.7 / 0.5', after: 'traded in Pareto front', description: 'Three objectives traded off simultaneously' },
    ],
    phases: [
      { id: 'phase-reset', label: 'Reset Baseline', narrative: 'Clean theater with 5 air bases and 3 initial tracks.' },
      { id: 'phase-strike', label: 'Kinetic Strike', narrative: 'Intelligence reports a coordinated missile strike package from the north. 5 HI-VAL inbound.' },
      { id: 'phase-classify', label: 'Bayesian Converge', narrative: 'Intent distribution updates in real-time. STRIKE classification confidence exceeds 80%.' },
      { id: 'phase-coa', label: 'Solve COA', narrative: 'System generates three courses of action via Pareto optimization. MAX_PROTECTION recommended.' },
    ],
    rationaleBlocks: [
      { heading: 'Intent Classification', body: '5 tracks classified as STRIKE with >80% confidence. Bayesian velocity likelihood g(450,450,150)≈1.0 overwhelms the prior. MISSILE class bias (0.65) reinforces the classification.', tag: 'BAYESIAN' },
      { heading: 'COA Recommendation', body: 'MAX_PROTECTION maximizes intercept probability across all 5 threats simultaneously. Reserve floor maintained at 0.80 for BASE-2. BALANCED trades 12% intercept effectiveness for second-wave depth.', tag: 'POLICY' },
      { heading: 'Risk Assessment', body: 'Monte Carlo stress test (500 runs, KINETIC red model) confirms 91% robustness for COA-MAX. Collapse horizon not reached — decision can be committed.', tag: 'VALIDATION' },
    ],
  },
  {
    id: 'ghost-feint',
    name: 'Ghost Feint',
    tagline: 'Intent Deviation Under Jamming',
    narrative: 'A group of aircraft initially appears as a reconnaissance probe — slow, distant, low confidence. Then jamming kicks in, sensor quality degrades, and the tracks suddenly accelerate and redirect toward a critical base. The system must reclassify from PROBE → STRIKE in real-time.',
    threatCount: 10,
    threatClass: 'AIRCRAFT',
    velocity: 250,
    initStrikeProb: 0.12,
    targetBase: 'Multiple → BASE-2 · Highridge Command',
    bayesianResult: 'After redirect: g(450, 450, 150) = 1.0 vs g(450, 140, 75) ≈ 0.00003 for PROBE. Even with degraded sensor quality, the velocity signal overwhelms the prior.',
    coaRecommendation: 'Before: BALANCED conserves interceptors (2-3 engagements). After: MAX_PROTECTION engages all threats (8-10 engagements).',
    parameters: [
      { key: 'intent_distribution.probe', before: '~0.45', after: '~0.08', description: 'Probe collapses after redirect' },
      { key: 'intent_distribution.strike', before: '~0.12', after: '~0.75', description: 'Strike surges — 12× threat value increase' },
      { key: 'velocity', before: '250 km/h', after: '450 km/h', description: 'Observable velocity change triggers reclassification' },
      { key: 'time_to_target', before: '>300 s', after: '<120 s', description: 'Urgency spike after redirect' },
      { key: 'sensor_quality', before: '1.0 → 0.7', after: '0.7', description: 'Degraded under jamming but still functional' },
      { key: 'confidence', before: '0.65 → 0.45', after: '0.45 → 0.70', description: 'Dips under jamming, recovers on STRIKE signal' },
    ],
    phases: [
      { id: 'phase-reset', label: 'Reset Baseline', narrative: 'Clean theater, standard posture.' },
      { id: 'phase-feint', label: 'Feint Swarm Inject', narrative: '10 aircraft contacts from the north — slow, distant, PROBE/FEINT classification. System recommends minimal engagement.' },
      { id: 'phase-jam', label: 'Heavy Jamming', narrative: 'Adversary activates electronic warfare. Sensor quality drops, uncertainty increases. The system knows it is being jammed.' },
      { id: 'phase-redirect', label: 'Redirect → STRIKE', narrative: 'Tracks accelerate to 450 km/h heading toward Highridge Command. Bayesian model detects the shift. Intent reclassifies PROBE → STRIKE.' },
    ],
    rationaleBlocks: [
      { heading: 'Intent Reclassification', body: '10 tracks reclassified from PROBE/FEINT to STRIKE. STRIKE likelihood g(450,450,150)=1.0 vs PROBE g(450,140,75)≈0.00003. The velocity signal overwhelms the prior accumulated from the probe phase.', tag: 'BAYESIAN' },
      { heading: 'Adaptive COA', body: 'Before redirect: BALANCED COA conserves interceptors with 2-3 engagements. After redirect: MAX_PROTECTION engages all 10 threats. The system re-optimizes immediately on intent shift.', tag: 'POLICY' },
      { heading: 'Jamming Resilience', body: 'Sensor quality degraded from 1.0 to 0.7, yet Bayesian update still converges because the velocity signal is so strong that even partial evidence is sufficient. This is exactly what Bayesian updating is designed to do — change your mind when the data demands it.', tag: 'VALIDATION' },
    ],
  },
];

const SCENARIO_COMPARISON = [
  { label: 'Time', scenarioA: '0:00–2:00', scenarioB: '2:30–5:00' },
  { label: 'Classification', scenarioA: 'Immediate STRIKE', scenarioB: 'PROBE → STRIKE shift' },
  { label: 'COA', scenarioA: 'MAX_PROTECTION', scenarioB: 'BALANCED → MAX_PROTECTION' },
  { label: 'Key insight', scenarioA: 'Fast, decisive, optimal', scenarioB: 'Adaptive — system changes mind' },
  { label: 'Legacy failure', scenarioA: 'Would waste interceptors on certainty', scenarioB: 'Would miss the strike entirely or waste on probes' },
];

const SCENARIO_COMBINED = [
  { time: '0:00–2:00', scenario: 'A', label: 'Boreal Strike', moment: 'How SSS handles a known strike — fast, decisive, optimal.' },
  { time: '2:00–2:30', scenario: '—', label: 'Reset', moment: 'But real adversaries don\'t announce themselves...' },
  { time: '2:30–5:00', scenario: 'B', label: 'Ghost Feint', moment: 'Watch the system adapt in real-time as intent changes.' },
  { time: '5:00–6:00', scenario: 'A+B', label: 'Comparison', moment: 'Legacy would either waste interceptors on probes or miss the strike entirely.' },
];

const SLIDE_PREVIEW_COPY: SlidePreviewCopy[] = [
  {
    lead: 'Vad sliden visar',
    detail: 'Målet, användaren och den verksamhetskritiska frågan i en enda vy.',
    bullets: ['Vem som leder beslutet', 'Varför nästa våg avgör', 'Vad Steel försöker bevisa'],
  },
  {
    lead: 'Operatörens flöde',
    detail: 'En minutlång scenariodemo där kartan växlar mellan angrepp, interception och supply lines, och recommendation-fliken ändrar vilket förlopp som spelas.',
    bullets: ['Klicka spår och objekt', 'Växla rekommendationer', 'Se när ett beslut måste tas'],
  },
  {
    lead: 'Policy-driven COA',
    detail: 'Tre alternativ jämförs enkelt: snabbast effekt, balanserad reserve och djup uthållighet.',
    bullets: ['Vad varje COA betyder', 'Hur valet görs', 'Varför BAL ofta är rätt'],
  },
  {
    lead: 'Kontrafaktisk validering',
    detail: 'Beslutet stressas med decision trees, ML-inferens och Monte Carlo innan det får låsas.',
    bullets: ['Vad händer om antagandet ändras', 'Vilken gren är skör', 'När robustheten faller'],
  },
  {
    lead: 'Delad theatre state',
    detail: 'Samma state måste kunna driva policy, readiness, logistics, governance och labs utan dubbeltydigheter.',
    bullets: ['Varför en källa behövs', 'Vad ontologi löser', 'Hur samma data återanvänds'],
  },
  {
    lead: 'Ontologi i praktiken',
    detail: 'Fem domäner beskriver samma operativa verklighet med olika ansvar, inte fem separata system.',
    bullets: ['Beslutsstöd', 'Lägesbild', 'Uthållighet', 'Operatörsytor', 'Infrastruktur'],
  },
  {
    lead: 'Knowledge graph',
    detail: 'Grafen binder samman ytorna så att man kan följa ett system från policy till demo och tillbaka, nod för nod.',
    bullets: ['Hur nätverket spelas igenom', 'Vilka ytor som blir möjliga', 'Varför unification är nyckeln'],
  },
  {
    lead: 'Svar på frågan',
    detail: 'Hackathonet bad inte om ett helt system, men ontologin visar varför ett smart C2-system går att bygga: causal intent, konkreta förslag, lägre kognitiv belastning och snabb closed-loop evaluation mot verklig sensordata.',
    bullets: ['Varför inte hela systemet', 'Vad ontologin möjliggör', 'Hur systemet lär sig av verklig data'],
  },
  {
    lead: 'Scenario dual-demo',
    detail: 'Two canonical scenarios demonstrate the full Steel pipeline: from sensor input through Bayesian intent classification to COA recommendation and structured LLM rationale.',
    bullets: ['Boreal Strike: fast classification', 'Ghost Feint: adaptive reclassification', 'Decision tree + ML + heuristics', 'Structured LLM reasoning output'],
  },
];

// ─── Slide definitions ────────────────────────────────────────────────────────

interface SlideConfig {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
}

const SLIDES: SlideConfig[] = [
  {
    id: 'welcome',
    eyebrow: 'Boreal Decision Twin',
    title: 'STEEL',
    subtitle: 'Ett ledningssystem för framtidens luftförsvar måste vinna nu och samtidigt bevara förmåga för nästa våg',
  },
  {
    id: 'map',
    eyebrow: 'Operatörens flöde',
    title: 'Attack, interception och supply lines',
    subtitle: 'Se hur lägesbild, beredskap och viktiga beslut skiftar',
  },
  {
    id: 'ai',
    eyebrow: 'Novel metodik 1',
    title: 'Tre COA-alternativ',
    subtitle: 'Enkel skillnad mellan snabb effekt nu, balanserad reserve och djup uthållighet',
  },
  {
    id: 'board',
    eyebrow: 'Novel metodik 2',
    title: 'Kontrafaktisk validering',
    subtitle: 'Beslutet testas med decision trees, ML-inferens och Monte Carlo innan det får låsas',
  },
  {
    id: 'ml',
    eyebrow: 'Novel metodik 3',
    title: 'Delad theatre state',
    subtitle: 'Samma state måste bära policy, readiness, logistik, governance och labs för att allt ska kunna hänga ihop',
  },
  {
    id: 'governance',
    eyebrow: 'Ontologi',
    title: 'Fem domäner, ett språk',
    subtitle: 'Ontologin behövs för att samma data ska betyda samma sak i alla ytor',
  },
  {
    id: 'kg',
    eyebrow: 'Unification',
    title: 'Möjliggjorda ytor',
    subtitle: 'Knowledge grafen visar hur samma state öppnar fler ytor utan att skapa nya sanningar',
  },
  {
    id: 'summary',
    eyebrow: 'Slutsats',
    title: 'Svaret på hackathonfrågan',
    subtitle: 'Hackathonet bad inte om ett helt system, utan om den del som gör smart stridsledning möjlig: ontologin som ger causal intent, tydliga förslag och snabb utvärdering mot verklig sensordata',
  },
  {
    id: 'scenario',
    eyebrow: 'Scenario Demo',
    title: 'Boreal Strike & Ghost Feint',
    subtitle: 'Two canonical scenarios: from Bayesian intent classification through decision-tree validation to structured LLM rationale output',
  },
];

// ─── Map scenario data ────────────────────────────────────────────────────────

interface MapTrack { id: string; x: number; y: number; tx: number; ty: number; type: 'missile' | 'ship' | 'air'; }
interface AnimatedTrack extends MapTrack { cx: number; cy: number; }
interface DemoCue { scenarioIndex: number; trackId: string; }
interface TrackFact { label: string; value: string; }
interface TrackDecisionSupport { label: string; value: string; detail: string; }
interface ScenarioStory {
  title: string;
  lead: string;
  detail: string;
  decision: string;
}
interface ScenarioRecommendation {
  id: string;
  title: string;
  summary: string;
  scenarioIndex: number;
  trackId: string;
  decision: string;
  impact: string;
}
interface KnowledgePathNode {
  id: string;
  title: string;
  summary: string;
  detail: string;
  unlocks: string;
}

const DEMO_CUES: DemoCue[] = [
  { scenarioIndex: 0, trackId: 'N1' },
  { scenarioIndex: 1, trackId: 'M2' },
  { scenarioIndex: 2, trackId: 'S5' },
  { scenarioIndex: 0, trackId: 'N3' },
];

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const MAP_SCENARIOS: MapTrack[][] = [
  // Scenario 1 – Naval incursion through the strait
  [
    { id: 'N1', x: 420, y: 970, tx: 420, ty: 480, type: 'ship' },
    { id: 'N2', x: 650, y: 1010, tx: 600, ty: 500, type: 'ship' },
    { id: 'N3', x: 900, y: 950, tx: 850, ty: 460, type: 'ship' },
  ],
  // Scenario 2 – Missile salvo from south
  [
    { id: 'M1', x: 300, y: 1100, tx: 200, ty: 280, type: 'missile' },
    { id: 'M2', x: 550, y: 1150, tx: 430, ty: 200, type: 'missile' },
    { id: 'M3', x: 800, y: 1080, tx: 840, ty: 150, type: 'missile' },
    { id: 'M4', x: 1050, y: 1120, tx: 1150, ty: 220, type: 'missile' },
    { id: 'M5', x: 1300, y: 1090, tx: 1400, ty: 180, type: 'missile' },
  ],
  // Scenario 3 – Supply lines and decision pressure
  [
    { id: 'S1', x: 280, y: 1090, tx: 470, ty: 430, type: 'ship' },
    { id: 'S2', x: 720, y: 1040, tx: 760, ty: 390, type: 'ship' },
    { id: 'S3', x: 1230, y: 1090, tx: 1030, ty: 420, type: 'missile' },
    { id: 'S4', x: 1420, y: 860, tx: 1190, ty: 360, type: 'air' },
    { id: 'S5', x: 210, y: 1200, tx: 510, ty: 500, type: 'air' },
    { id: 'S6', x: 390, y: 1180, tx: 620, ty: 460, type: 'air' },
    { id: 'S7', x: 570, y: 1210, tx: 730, ty: 420, type: 'air' },
    { id: 'S8', x: 980, y: 1190, tx: 920, ty: 450, type: 'air' },
  ],
];

const SCENARIO_LABELS = [
  'Scenario 1: Angrepp över sundet',
  'Scenario 2: Interception av salvo',
  'Scenario 3: Supply lines och beslut',
];

const SCENARIO_STORIES: ScenarioStory[] = [
  {
    title: 'Marinträssning',
    lead: 'Huvudhotet rör sig mot sundet med flera ytfarkoster samtidigt.',
    detail: 'Operatören måste skilja på den spårbild som ska stoppas nu och det som ska lämnas kvar för att skydda nästa våg.',
    decision: 'Vilka spår prioriteras först utan att tömma reserven?',
  },
  {
    title: 'Missilsalva',
    lead: 'En snabbrörlig salvo kräver interception innan hotet splittras över flera mål.',
    detail: 'Systemet måste välja mellan snabb avfyring, bevarad beredskap och fortsatt kontroll av inbound-tracket.',
    decision: 'När är det rätt att intercepta, och när måste man hålla igen?',
  },
  {
    title: 'Supply lines',
    lead: 'Ett viktigt logistikflöde måste hållas öppet samtidigt som en högvärdig länk hotas.',
    detail: 'Data om last, corridor, resume-rate, runway pressure och drönarsvärm gör att ett beslut måste tas tidigt, inte efter att linjen brutits.',
    decision: 'Skydda supply line nu, eller bevara stridsförmåga för ett bättre läge senare?',
  },
];

const SCENARIO_RECOMMENDATIONS: ScenarioRecommendation[] = [
  {
    id: 'rec-attack',
    title: 'Interceptera ledarspåret',
    summary: 'Snabb interception när huvudhotet bär förmågan i första vågen.',
    scenarioIndex: 0,
    trackId: 'N1',
    decision: 'Commit the interceptors',
    impact: 'Kartan visar hur ett tidigt val skyddar reserven för nästa våg.',
  },
  {
    id: 'rec-salvo',
    title: 'Stoppa salvo nu',
    summary: 'Prioritera interceptor-fönstret innan salvo splittras över flera mål.',
    scenarioIndex: 1,
    trackId: 'M2',
    decision: 'Fire before the window closes',
    impact: 'Simuleringen växlar till intercept-fas och visar kostnaden för att vänta.',
  },
  {
    id: 'rec-supply',
    title: 'Skydda korridoren',
    summary: 'Bevara supply lines när corridor pressure närmar sig tröskeln.',
    scenarioIndex: 2,
    trackId: 'S2',
    decision: 'Protect the corridor',
    impact: 'Beslutspunkten flyttar framåt när logistikdata ingår i beräkningen.',
  },
];

const KG_PATH_NODES: KnowledgePathNode[] = [
  {
    id: 'kg-state',
    title: 'Theatre state',
    summary: 'Samma ingång för alla beslut.',
    detail: 'All data samlas i en gemensam state så att policy, readiness, logistics och governance ser samma läge.',
    unlocks: 'Gör att varje yta läser samma sanning.',
  },
  {
    id: 'kg-coa',
    title: 'COA solver',
    summary: 'Policy weights och reserve floor.',
    detail: 'Beslutet score:as mot effekt nu, uthållighet och commander posture innan ett COA får bli rekommendation.',
    unlocks: 'Gör att samma state kan bli ett tydligt val.',
  },
  {
    id: 'kg-lab',
    title: 'Counterfactual lab',
    summary: 'Decision trees och ML inferens.',
    detail: 'Inference stressas mot alternativa träd, osäkerhet och friktion så att beslutet går att lita på före commit.',
    unlocks: 'Gör att samma modell kan validera sig själv.',
  },
  {
    id: 'kg-gov',
    title: 'Governance & audit',
    summary: 'En kedja, ett svar.',
    detail: 'Audit-logg, policy trace och auktoritet följer exakt samma beslutskedja som operatören ser på skärmen.',
    unlocks: 'Gör att samma beslut kan granskas i efterhand.',
  },
  {
    id: 'kg-field',
    title: 'Field console',
    summary: 'Operatören ser samma semantik.',
    detail: 'Frontend får samma domänmodell som backend, så att ett kommando i grafen blir begripligt i fältet.',
    unlocks: 'Gör att samma modell kan användas i flera ytor.',
  },
];

// ─── COA data for slide 3 ─────────────────────────────────────────────────────

const COAS = [
  { id: 'COA-MAX', label: 'Maximal effekt nu', intercept: 94, readiness: 38, robustness: 0.61, color: '#ef4444' },
  { id: 'COA-BAL', label: 'Balans med reserve', intercept: 81, readiness: 61, robustness: 0.79, color: '#5ca7ff', selected: true },
  { id: 'COA-DST', label: 'Djup uthållighet', intercept: 71, readiness: 91, robustness: 0.91, color: '#7ce0be' },
];

const COA_GUIDE = [
  {
    id: 'guide-max',
    title: 'COA-MAX',
    meaning: 'Slå hårdast nu.',
    when: 'Välj den när hotet är akut och dagens effekt väger tyngst.',
    tradeoff: 'Du förbrukar reserve snabbare och lämnar mindre för nästa våg.',
  },
  {
    id: 'guide-bal',
    title: 'COA-BAL',
    meaning: 'Balans mellan nu och sen.',
    when: 'Välj den när du både måste stoppa hotet och bevara en rimlig reserv.',
    tradeoff: 'Det är den säkraste mittpunkten när commander posture är osäker.',
  },
  {
    id: 'guide-dst',
    title: 'COA-DST',
    meaning: 'Skydda uthålligheten först.',
    when: 'Välj den när nästa våg är viktigare än maximal kortsiktig effekt.',
    tradeoff: 'Du accepterar lägre omedelbar effekt för att säkra lång uthållighet.',
  },
  {
    id: 'guide-flow',
    title: 'Hur valet uppstår',
    meaning: 'Policy väger hot, posture och reserve floor.',
    when: 'Systemet score:ar alternativen och väljer det som bäst matchar missionen.',
    tradeoff: 'Operatören får ett tydligt svar plus motivering, inte bara ett tal.',
  },
] as const;

const SYSTEM_COMPARISON: SystemComparisonRow[] = [
  {
    label: 'Sanning',
    legacyText: 'Varje yta har sin egen kopia av läget.',
    benefit: 'Operatören och backend ser samma state.',
    bdtText: 'En gemensam theatre state styr allt.',
  },
  {
    label: 'Beslut',
    legacyText: 'Analys, val och genomförande sker i separata steg.',
    benefit: 'Policy blir direkt action med mindre friktion.',
    bdtText: 'COA, risk och reserv vägs i samma kedja.',
  },
  {
    label: 'Spårbarhet',
    legacyText: 'Loggar ligger utspridda och är svåra att följa.',
    benefit: 'En enda beslutskedja kan granskas i efterhand.',
    bdtText: 'Varje val länkas till samma inference trace.',
  },
  {
    label: 'Scenarion',
    legacyText: 'Varje demo kräver nya handbyggda kopplingar.',
    benefit: 'Samma scenario kan återanvändas i flera ytor.',
    bdtText: 'Demo, labb och drift kör samma kontrakt.',
  },
  {
    label: 'Deployment',
    legacyText: 'Betydelser glider mellan lokal miljö och cloud.',
    benefit: 'Samma semantik ger samma beslut oavsett miljö.',
    bdtText: 'Lokalt, EU eller backend utan semantisk drift.',
  },
] as const;

// ─── Terrain helpers ──────────────────────────────────────────────────────────

const TERRAIN = {
  north: '0,0 1667,0 1667,283 1533,313 1433,290 1333,283 1237,342 1130,317 1027,297 927,353 813,323 713,313 610,367 503,320 393,333 297,383 197,340 90,353 0,380',
  south: '0,1300 1667,1300 1667,1067 1580,1027 1470,1047 1363,1070 1260,1013 1147,1037 1040,1067 933,1010 820,1043 713,1077 603,1020 490,1037 387,1080 280,1030 163,1050 50,1080 0,1063',
  islandWest: '592,447 630,427 683,430 707,463 727,493 710,537 677,547 643,557 603,530 590,497',
  islandEast: '1130,357 1153,340 1183,347 1193,373 1203,397 1187,423 1160,427 1133,430 1113,407 1113,380',
  southFwd: '1363,713 1403,693 1450,703 1460,737 1470,767 1443,800 1410,800 1377,800 1350,773 1353,743',
};

const BASES_NORTH = [
  { x: 198, y: 335, label: 'NV' },
  { x: 838, y: 75, label: 'HC' },
  { x: 1158, y: 385, label: 'BW' },
];


@Injectable({ providedIn: 'root' })
export class ShowcaseState {

  readonly slides = SLIDES;
  readonly scenarioLabels = SCENARIO_LABELS;
  readonly terrain = TERRAIN;
  readonly basesNorth = BASES_NORTH;
  readonly coas = COAS;
  readonly coaGuide = COA_GUIDE;
  readonly operatorSteps = OPERATOR_STEPS;
  readonly validationSteps = VALIDATION_STEPS;
  readonly validationTrees = VALIDATION_TREES;
  readonly novelMethods = NOVEL_METHODS;
  readonly ontologyDomains = ONTOLOGY_DOMAINS;
  readonly unificationEffects = UNIFICATION_EFFECTS;
  readonly slidePreviewCopy = SLIDE_PREVIEW_COPY;
  readonly scenarioStories = SCENARIO_STORIES;
  readonly scenarioRecommendations = SCENARIO_RECOMMENDATIONS;
  readonly systemComparison = SYSTEM_COMPARISON;
  readonly kgPathNodes = KG_PATH_NODES;
  readonly dualScenarios = DUAL_SCENARIOS;
  readonly scenarioComparison = SCENARIO_COMPARISON;
  readonly scenarioCombined = SCENARIO_COMBINED;

  currentSlide = signal(0);
  scenarioTab = signal(0);
  scenarioPart = signal(0);
  mapScenario = signal(0);
  selectedScenarioTrackId = signal<string | null>(null);
  slideDemoStarted = signal<Record<number, boolean>>({});
  selectedCoaId = signal<string>('COA-BAL');
  validationFocusIndex = signal(0);
  validationTreeIndex = signal(0);
  modelFocusIndex = signal(0);
  ontologyFocusIndex = signal(0);
  unificationFocusIndex = signal(0);
  kgNodeIndex = signal(0);
  summaryFocusIndex = signal(0);

  private _consoleLine = signal(0);
  private _consoleSlide = signal(0);
  private _consoleTimer: ReturnType<typeof setInterval> | null = null;

  visibleConsoleLines = computed(() => {
    const slide = this._consoleSlide();
    const count = this._consoleLine();
    const seq = CONSOLE_SEQUENCES[slide] ?? [];
    return seq.slice(0, count);
  });

  private _trackTimer: ReturnType<typeof setInterval> | null = null;
  private readonly _flyTicks = 220;
  private readonly _interceptTicks = 80;
  private _demoTick = 0;
  trackPlaying = signal(true);
  trackProgress = signal(0);
  trackPhase = signal<'fly' | 'intercept'>('fly');
  recommendationIndex = signal(0);
  private _slideDemoTimer: ReturnType<typeof setInterval> | null = null;
  private _slideDemoStep = 0;

  animatedTracks = computed<AnimatedTrack[]>(() => {
    const p = easeInOutCubic(Math.min(1, this.trackProgress()));
    return MAP_SCENARIOS[this.mapScenario()].map(t => ({
      ...t,
      cx: t.x + (t.tx - t.x) * p,
      cy: t.y + (t.ty - t.y) * p,
    }));
  });

  selectedScenarioTrack = computed(() =>
    this.animatedTracks().find(track => track.id === this.selectedScenarioTrackId()) ?? null
  );
  currentScenarioStory = computed(() => this.scenarioStories[this.mapScenario()] ?? this.scenarioStories[0]);
  currentRecommendation = computed(() => this.scenarioRecommendations[this.recommendationIndex()] ?? this.scenarioRecommendations[0]);
  currentValidationTree = computed(() => this.validationTrees[this.validationTreeIndex()] ?? this.validationTrees[0]);
  activeValidationBranchIndex = computed(() => this.validationFocusIndex() % Math.max(1, this.currentValidationTree().branches.length));
  currentKgNode = computed(() => this.kgPathNodes[this.kgNodeIndex()] ?? this.kgPathNodes[0]);
  intercepting = computed(() => this.trackPhase() === 'intercept');

  resetConsole(slide: number): void {
    if (this._consoleTimer) clearInterval(this._consoleTimer);
    this._consoleSlide.set(slide);
    this._consoleLine.set(0);
  }

  startConsole(slide: number): void {
    this.resetConsole(slide);
    const seq = CONSOLE_SEQUENCES[slide] ?? [];
    let i = 0;
    this._consoleTimer = setInterval(() => {
      if (i < seq.length) {
        this._consoleLine.set(++i);
      }
    }, 700);
  }

  startTrackAnim(): void {
    if (this._trackTimer) clearInterval(this._trackTimer);
    this.trackProgress.set(0);
    this.trackPhase.set('fly');
    this.trackPlaying.set(true);
    this._demoTick = 0;
    let cueIndex = Math.max(0, DEMO_CUES.findIndex(cue => cue.scenarioIndex === this.mapScenario()));
    if (cueIndex === -1) cueIndex = 0;
    this.mapScenario.set(DEMO_CUES[cueIndex].scenarioIndex);
    this.selectedScenarioTrackId.set(DEMO_CUES[cueIndex].trackId);
    this.recommendationIndex.set(DEMO_CUES[cueIndex].scenarioIndex);
    this._trackTimer = setInterval(() => {
      if (!this.trackPlaying()) return;
      this._demoTick++;
      if (this._demoTick <= this._flyTicks) {
        this.trackProgress.set(this._demoTick / this._flyTicks);
      } else if (this._demoTick === this._flyTicks + 1) {
        this.trackPhase.set('intercept');
      } else if (this._demoTick > this._flyTicks + this._interceptTicks) {
        cueIndex = (cueIndex + 1) % DEMO_CUES.length;
        this.mapScenario.set(DEMO_CUES[cueIndex].scenarioIndex);
        this.selectedScenarioTrackId.set(DEMO_CUES[cueIndex].trackId);
        this.recommendationIndex.set(DEMO_CUES[cueIndex].scenarioIndex);
        this._demoTick = 0;
        this.trackProgress.set(0);
        this.trackPhase.set('fly');
      }
    }, 50);
  }

  clearSlideDemoTimer(): void {
    if (this._slideDemoTimer) {
      clearInterval(this._slideDemoTimer);
      this._slideDemoTimer = null;
    }
  }

  setSlideStarted(index: number, started: boolean): void {
    this.slideDemoStarted.update(state => ({ ...state, [index]: started }));
  }

  startCurrentSlideDemo(event?: MouseEvent): void {
    event?.preventDefault();
    event?.stopPropagation();

    const slide = this.currentSlide();
    if (this.slideDemoStarted()[slide]) return;

    this.setSlideStarted(slide, true);
    this.startConsole(slide);
    this.clearSlideDemoTimer();
    this._slideDemoStep = 0;

    if (slide === 1) {
      this.startTrackAnim();
      return;
    }

    if (slide === 2) {
      this._slideDemoTimer = setInterval(() => {
        this.selectedCoaId.set(COA_CYCLE[this._slideDemoStep % COA_CYCLE.length]);
        this._slideDemoStep++;
      }, 1400);
      return;
    }

    if (slide === 3) {
      this._slideDemoTimer = setInterval(() => {
        this.validationFocusIndex.set(this._slideDemoStep % this.validationSteps.length);
        this.validationTreeIndex.set(this._slideDemoStep % this.validationTrees.length);
        this._slideDemoStep++;
      }, 1500);
      return;
    }

    if (slide === 4) {
      this._slideDemoTimer = setInterval(() => {
        this.modelFocusIndex.set(this._slideDemoStep % 4);
        this._slideDemoStep++;
      }, 1300);
      return;
    }

    if (slide === 5) {
      this._slideDemoTimer = setInterval(() => {
        this.ontologyFocusIndex.set(this._slideDemoStep % this.ontologyDomains.length);
        this._slideDemoStep++;
      }, 1250);
      return;
    }

    if (slide === 6) {
      this._slideDemoTimer = setInterval(() => {
        this.unificationFocusIndex.set(this._slideDemoStep % this.unificationEffects.length);
        this.kgNodeIndex.set(this._slideDemoStep % this.kgPathNodes.length);
        this._slideDemoStep++;
      }, 1200);
      return;
    }

    if (slide === 7) {
      this._slideDemoTimer = setInterval(() => {
        this.summaryFocusIndex.set(this._slideDemoStep % this.novelMethods.length);
        this._slideDemoStep++;
      }, 1500);
    }

    if (slide === 8) {
      // Scenario slide is interactive — no auto-animation needed
    }
  }

  selectScenario(idx: number): void {
    this.mapScenario.set(idx);
    const firstTrack = MAP_SCENARIOS[idx]?.[0];
    if (firstTrack) this.selectedScenarioTrackId.set(firstTrack.id);
    this.recommendationIndex.set(Math.min(idx, this.scenarioRecommendations.length - 1));
    if (this.slideDemoStarted()[1]) {
      this.startTrackAnim();
    }
  }

  selectRecommendation(idx: number): void {
    const recommendation = this.scenarioRecommendations[idx];
    if (!recommendation) return;
    this.recommendationIndex.set(idx);
    this.mapScenario.set(recommendation.scenarioIndex);
    this.selectedScenarioTrackId.set(recommendation.trackId);
    this.trackProgress.set(0);
    this.trackPhase.set('fly');
    this._demoTick = 0;
    this.trackPlaying.set(true);
    if (this.slideDemoStarted()[1]) {
      this.startTrackAnim();
    }
  }

  selectScenarioTrack(id: string): void {
    this.selectedScenarioTrackId.set(id);
  }

  selectValidationTree(index: number): void {
    this.validationTreeIndex.set(index);
    this.validationFocusIndex.set(0);
  }

  selectKgNode(index: number): void {
    if (index < 0 || index >= this.kgPathNodes.length) return;
    this.kgNodeIndex.set(index);
  }

  toggleTrackPlayback(): void {
    this.trackPlaying.update(v => !v);
  }

  onTrackScrub(e: Event): void {
    const target = e.target as HTMLInputElement | null;
    if (!target) return;
    const value = Math.max(0, Math.min(100, Number(target.value)));
    this.trackPlaying.set(false);
    this.trackProgress.set(value / 100);
    this.trackPhase.set(value >= 90 ? 'intercept' : 'fly');
    this._demoTick = Math.round((value / 100) * (this._flyTicks + this._interceptTicks));
  }

  trackSummary(track: AnimatedTrack): string {
    if (this.mapScenario() === 2) {
      if (track.id === 'S1') return 'Supply line som måste hålla öppet för att support ska nå fram i tid.';
      if (track.id === 'S2') return 'Eskort och skydd för korridoren, där reserve floor vägs mot räckvidd.';
      if (track.id === 'S3') return 'Hotet som gör att ett beslut måste tas innan korridoren bryts.';
      if (track.id === 'S4' || track.id === 'S5' || track.id === 'S6' || track.id === 'S7' || track.id === 'S8') return 'Drönare i svärm som pressar korridoren och påverkar beslutet direkt.';
      return 'Luftburen del av samma logistik- och hotbild.';
    }
    if (track.type === 'missile') {
      return 'Inkommande salvo som kräver snabb prioritering och skyddad beredskap.';
    }
    if (track.type === 'air') {
      return 'Luftburen aktör som påverkar intent och prioritet i lägesbilden.';
    }
    return 'Ytobjekt som påverkar sjö- och luftläget i samma theater state.';
  }

  trackFacts(track: AnimatedTrack): TrackFact[] {
    const secondsLeft = Math.max(6, Math.round((1 - this.trackProgress()) * 52));
    const scenario = this.mapScenario();
    if (scenario === 2) {
      const isSwarm = ['S4', 'S5', 'S6', 'S7', 'S8'].includes(track.id);
      return [
        { label: 'Roll', value: track.id === 'S1' ? 'Supply line' : track.id === 'S2' ? 'Escort' : track.id === 'S3' ? 'Threat' : isSwarm ? 'Drone swarm' : 'Air cover' },
        { label: 'Tid', value: `${secondsLeft}s` },
        { label: 'Beslut', value: track.id === 'S3' ? 'Intercept now' : isSwarm ? 'Suppress swarm' : 'Protect corridor' },
        { label: 'Konsekvens', value: track.id === 'S1' ? 'Support reaches base' : track.id === 'S3' ? 'Corridor breaks' : isSwarm ? 'Corridor pressure rises' : 'Reserve is consumed' },
      ];
    }
    if (scenario === 1) {
      return [
        { label: 'Roll', value: track.type === 'missile' ? 'Inbound threat' : 'Support track' },
        { label: 'Tid', value: `${secondsLeft}s` },
        { label: 'Beslut', value: this.intercepting() ? 'Intercept' : 'Track and wait' },
        { label: 'Risk', value: track.type === 'missile' ? 'High' : 'Medium' },
      ];
    }
    return [
      { label: 'Roll', value: track.type === 'ship' ? 'Surface track' : 'Air track' },
      { label: 'Tid', value: `${secondsLeft}s` },
      { label: 'Beslut', value: this.intercepting() ? 'Commit interceptors' : 'Hold reserve' },
      { label: 'Risk', value: track.type === 'air' ? 'Fast-changing' : 'Persistent' },
    ];
  }

  trackDecisionSupport(track: AnimatedTrack): TrackDecisionSupport[] {
    const scenario = this.mapScenario();
    const secondsLeft = Math.max(6, Math.round((1 - this.trackProgress()) * 52));
    if (scenario === 2) {
      const isSwarm = ['S4', 'S5', 'S6', 'S7', 'S8'].includes(track.id);
      const corridor = track.id === 'S1' ? 'Supply line' : track.id === 'S2' ? 'Escort' : track.id === 'S3' ? 'Threat' : isSwarm ? 'Drone swarm' : 'Air cover';
      return [
        { label: 'Data', value: '4 logistics signals', detail: 'Last, corridor pressure, escort and runway status.' },
        { label: 'Recommendation', value: track.id === 'S3' ? 'Intercept now' : isSwarm ? 'Suppress swarm' : 'Protect corridor', detail: 'Tidigt beslut behövs innan linjen bryts.' },
        { label: 'Why now', value: `${secondsLeft}s decision window`, detail: `${corridor} påverkar samma state som COA och validation.` },
      ];
    }
    if (scenario === 1) {
      return [
        { label: 'Data', value: track.type === 'missile' ? '3 inbound cues' : '2 support cues', detail: 'Speed, bearing and approach shape the picture.' },
        { label: 'Recommendation', value: this.intercepting() ? 'Commit intercept' : 'Track and wait', detail: 'Valet skiftar när hotet går in i fönstret.' },
        { label: 'Why now', value: `${secondsLeft}s decision window`, detail: 'Antagandet måste låsas före salvo splittrar sig.' },
      ];
    }
    return [
      { label: 'Data', value: track.type === 'ship' ? '2 surface cues' : '2 air cues', detail: 'Track speed, route and intent signal the branch.' },
      { label: 'Recommendation', value: this.intercepting() ? 'Commit interceptors' : 'Hold reserve', detail: 'Rekommendationen bevarar nästa våg.' },
      { label: 'Why now', value: `${secondsLeft}s decision window`, detail: 'Objektet visar var beslutet måste tas först.' },
    ];
  }

  goTo(index: number): void {
    const prev = this.currentSlide();
    this.currentSlide.set(index);
    this.resetConsole(index);
    this.clearSlideDemoTimer();
    this.setSlideStarted(index, false);
    if (index === 2) this.selectedCoaId.set('COA-BAL');
    if (index === 3) { this.validationFocusIndex.set(0); this.validationTreeIndex.set(0); }
    if (index === 4) this.modelFocusIndex.set(0);
    if (index === 5) this.ontologyFocusIndex.set(0);
    if (index === 6) this.unificationFocusIndex.set(0);
    if (index === 7) this.summaryFocusIndex.set(0);
    if (index === 1) {
      this.trackProgress.set(0);
      this.trackPhase.set('fly');
    } else if (prev === 1) {
      if (this._trackTimer) { clearInterval(this._trackTimer); this._trackTimer = null; }
      this.trackPlaying.set(true);
      this.selectedScenarioTrackId.set(null);
    }
  }

  next(): void {
    if (this.currentSlide() < SLIDES.length - 1) this.goTo(this.currentSlide() + 1);
  }

  prev(): void {
    if (this.currentSlide() > 0) this.goTo(this.currentSlide() - 1);
  }

  onKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); this.next(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); this.prev(); }
  }

  coaX(readiness: number): number { return 40 + (readiness / 100) * 260; }
  coaY(intercept: number): number { return 190 - (intercept / 100) * 180; }

  destroy(): void {
    if (this._consoleTimer) clearInterval(this._consoleTimer);
    if (this._trackTimer) clearInterval(this._trackTimer);
    if (this._slideDemoTimer) clearInterval(this._slideDemoTimer);
  }
}
