import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SteelApiService } from '../../core/services/steel-api.service';
import { PolicyStore } from '../../core/state/policy.store';
import { ScenarioStore } from '../../core/state/scenario.store';
import { TacticalConsole } from '../ops/tactical-console.component';
import { WindowFrameComponent } from '../../shared/ui/window-frame/window-frame.component';

interface FinalSlide {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
}

interface ProcessStep {
  id: string;
  icon: 'sensor' | 'rap' | 'intent' | 'coa' | 'recommendation' | 'readiness' | 'commit';
  label: string;
  description: string;
}

interface FailureCard {
  coa: 'COA-MAX' | 'COA-BAL' | 'COA-DST';
  title: string;
  summary: string;
  body: string;
}

interface LayerCard {
  title: string;
  summary: string;
  items: string[];
}

interface DemoStep {
  id: 'reset' | 'feint' | 'balanced' | 'jamming' | 'redirect' | 'max';
  time: string;
  label: string;
  summary: string;
}

interface DemoMetric {
  label: string;
  value: string;
  detail: string;
}

interface DemoSummary {
  badge: string;
  title: string;
  body: string;
  metrics: DemoMetric[];
}

interface ImpactModule {
  title: string;
  detail: string;
  status: 'BUILT' | 'SIMULATED' | 'FRAMEWORK';
}

interface DomainCard {
  title: string;
  body: string;
}

interface DemoDecisionCard {
  action: string;
  rationale: string;
  policy: string;
  validation: string;
  outcome: string;
}

interface OntologyModelGroup {
  title: string;
  lead: string;
  models: string[];
}

interface ArchitectureStep {
  id: string;
  title: string;
  description: string;
  items: string[];
}

interface CloseSummaryStat {
  label: string;
  detail: string;
  tone: 'blue' | 'green' | 'purple' | 'amber';
}

interface CloseMethod {
  tag: string;
  title: string;
  body: string;
}

interface InferenceBranch {
  label: string;
  gate: string;
  model: string;
  outcome: string;
}

interface ConsoleConfig {
  title: string;
  lines: string[];
}

const FINAL_SLIDES: FinalSlide[] = [
  {
    id: 'hero',
    eyebrow: 'Boreal Decision Twin',
    title: 'STEEL',
    subtitle: 'Smart Stridsledning, powered by Boreal Decision Twin',
  },
  {
    id: 'process',
    eyebrow: 'Process',
    title: 'Från sensortrigger till final advice',
    subtitle: 'Steel är inte bara en karta. Steel är en beslutsloop från sensor till förklarat verkansbeslut.',
  },
  {
    id: 'mission-critical',
    eyebrow: 'Mission-Critical',
    title: 'Varför processen är mission-critical',
    subtitle: 'Fel beslut kostar inte bara effekt nu, utan också förmåga i nästa våg.',
  },
  {
    id: 'layers',
    eyebrow: 'Lösning',
    title: 'Fyra lager i samma system',
    subtitle: 'Theater state, beslut, validering och rationale sitter i samma loop.',
  },
  {
    id: 'architecture',
    eyebrow: 'Arkitekturen bakom smart stridsledning',
    title: 'Från doktrin till beslut',
    subtitle:
      'Traditionell försvarsdoktrin, riskbedömning, ontologi, simulering och lokal AI vävs ihop till ett beslutstöd som minskar kognitiv belastning.',
  },
  {
    id: 'demo',
    eyebrow: 'Live Demo',
    title: 'Ghost Feint',
    subtitle: 'När systemet måste ändra sig i realtid och visa varför.',
  },
  {
    id: 'impact',
    eyebrow: 'Impact',
    title: 'Vad löste vi precis?',
    subtitle: 'Steel förbättrar inte bara lägesbilden, utan själva beslutsakten.',
  },
  {
    id: 'scale',
    eyebrow: 'Scale',
    title: 'Fem domäner, ett språk',
    subtitle: 'Samma funktionella domänontologi driver tactical view, readiness, logistics, governance och labs utan semantisk drift.',
  },
  {
    id: 'close',
    eyebrow: 'Slutsats',
    title: 'Svaret på hackathonfrågan',
    subtitle: 'Steel visar den mest intressanta delen av en komplett lösning, precis som kickoffen bad om',
  },
];

const PROCESS_STEPS: ProcessStep[] = [
  {
    id: 'sensor',
    icon: 'sensor',
    label: 'Sensor trigger',
    description: 'Radar, EW, tidskritiska spår och osäker signalbild triggar hela beslutskedjan.',
  },
  {
    id: 'rap',
    icon: 'rap',
    label: 'RAP / lägesbild',
    description: 'Sensorfusion måste bli en riktig operational picture, inte bara en karta.',
  },
  {
    id: 'intent',
    icon: 'intent',
    label: 'Intent distribution',
    description: 'Systemet skattar probe, feint, strike, saturation och decoy istället för att gissa.',
  },
  {
    id: 'coa',
    icon: 'coa',
    label: 'COA solve',
    description: 'Flera handlingsalternativ vägs mot policy, reserve floor, tid och basbelastning.',
  },
  {
    id: 'recommendation',
    icon: 'recommendation',
    label: 'Recommendation card',
    description: 'Operatören får ett tydligt beslutskort med riktning, rationale och tradeoff.',
  },
  {
    id: 'rationale',
    icon: 'readiness',
    label: 'Readiness + robustness',
    description: 'Beslutet stressas mot jamming, wave 2 och uthållighet innan det låses.',
  },
  {
    id: 'readiness',
    icon: 'commit',
    label: 'Human commit',
    description: 'Authority ligger kvar hos människa, men med lägre kognitiv belastning och tydligare underlag.',
  },
];

const COA_FAILURE_CARDS: FailureCard[] = [
  {
    coa: 'COA-MAX',
    title: 'Skjuter för tidigt',
    summary: 'Slösar interceptors',
    body: 'MAX används på osäker intent: reserv töms och nästa våg möts med sämre beredskap.',
  },
  {
    coa: 'COA-BAL',
    title: 'Balanserad men försenad',
    summary: 'Missar strike window',
    body: 'BAL håller igen för länge: strike-fönstret stängs och hotet passerar obrutet.',
  },
  {
    coa: 'COA-DST',
    title: 'Djup sustain utan skydd',
    summary: 'Readiness kollapsar',
    body: 'DST sparar resurser nu men offrar wave 1: baser och interceptor-förråd sinar ändå.',
  },
];

const LAYER_CARDS: LayerCard[] = [
  {
    title: '1. Theater state',
    summary: 'ThreatTwin, BaseTwin, EffectorTwin, SensorTwin och PolicyTwin beskriver samma operativa verklighet.',
    items: ['Gemensam state-backbone', 'Spårbar semantik', 'En källa för alla ytor'],
  },
  {
    title: '2. Decision layer',
    summary: 'Steel genererar flera vägar framåt, inte ett svart-vitt svar.',
    items: ['COA-MAX', 'COA-BAL', 'COA-DST'],
  },
  {
    title: '3. Validation layer',
    summary: 'Beslutet låses först när det håller mot osäkerhet, jamming och kontrafaktiska förändringar.',
    items: ['Decision tree', 'ML inference', 'Monte Carlo', 'Counterfactuals'],
  },
  {
    title: '4. Rationale layer',
    summary: 'Operatören ser inte bara vad systemet valde, utan varför.',
    items: ['Recommendation card', 'Policy trace', 'LLM explanation'],
  },
];

const ARCHITECTURE_PIPELINE_STEPS: ArchitectureStep[] = [
  {
    id: 'doctrine',
    title: '1. Doktrin & risk',
    description: 'Traditionell försvarsdoktrin, rules of engagement, hotklassning, risknivåer, commander intent och resursbegränsningar.',
    items: ['Rules of engagement', 'Commander intent', 'Risknivåer', 'Resursbegränsningar'],
  },
  {
    id: 'ontology',
    title: '2. Ontologi av all operativ data',
    description: 'Alla datapunkter mappas till samma språk: attack, försvar, sensorläge, readiness, logistik, supply lines, effektorer, baser, governance och mandat.',
    items: ['ThreatTwin', 'BaseTwin', 'EffectorTwin', 'SensorTwin', 'PolicyTwin'],
  },
  {
    id: 'simulation',
    title: '3. Simulerings- och inferenslager',
    description: 'Random forests, decision trees, Monte Carlo och många inferenskörningar används för att simulera möjliga utfall, robusthet, skörhet och alternativa antaganden.',
    items: ['Decision trees', 'Random forests', 'Monte Carlo', 'Counterfactuals', 'Deep simulation'],
  },
  {
    id: 'feedback',
    title: '4. Sensor- och fältfeedback',
    description: 'Sensorflöden, RAP, fältdata och operatörens feedback används för att evaluera rekommendationer och förhårda modellen över tid.',
    items: ['Sensorflöden', 'RAP', 'Fältdata', 'Operatörsfeedback'],
  },
  {
    id: 'rationale',
    title: '5. Lokal NCS-hostad Mistral-rationale',
    description: 'De strukturerade datapunkterna skickas till ett lokalt, kontrollerat LLM-lager som formulerar beslutet begripligt för C2-personal via backend som inferensgräns.',
    items: ['Backend guardrail', 'Lokal modell', 'Strukturerad input', 'Begriplig rationale'],
  },
];

const INFERENCE_BRANCHES: InferenceBranch[] = [
  {
    label: 'Hold / classify',
    gate: 'Låg strike-sannolikhet och oklar intent.',
    model: 'Bayesian update + decision tree håller igen vid probe/feint.',
    outcome: 'Skydda reserv och fortsätt klassificera.',
  },
  {
    label: 'COA-BAL',
    gate: 'Ambivalent intent men operativ press i nästa våg.',
    model: 'Monte Carlo och policy-weighting visar att begränsad commit är robustast.',
    outcome: '2-3 engagements, readiness kvar.',
  },
  {
    label: 'MAX_PROTECTION',
    gate: 'Strike bekräftas mot Highridge och tid till mål faller.',
    model: 'Inferensgrenar konvergerar: heuristik, ML och tree pekar åt samma håll.',
    outcome: 'Full protection och rationale som går att försvara.',
  },
];

const ARCHITECTURE_SURFACES = [
  'Overview',
  'Tactical',
  'Commander',
  'Readiness',
  'Threat Inspector',
  'Robustness Lab',
  'Counterfactual Lab',
  'Governance',
  'Logistics',
  'Knowledge Graph',
  'Demo',
  'Field',
  'C2 Resilience',
];

const ARCHITECTURE_SERVICES = [
  'COA solving',
  'Monte Carlo lab',
  'Counterfactual prediction',
  'Deep simulation',
  'Logistics planning',
  'Rationale generation',
];

const DEMO_STEPS: DemoStep[] = [
  {
    id: 'reset',
    time: '3:00-3:15',
    label: 'Reset baseline',
    summary: 'Börja med ren theater state och neutral posture.',
  },
  {
    id: 'feint',
    time: '3:15-3:35',
    label: 'Inject Feint Swarm',
    summary: 'Tio kontakter från norr ser ut som probe eller feint.',
  },
  {
    id: 'balanced',
    time: '3:35-3:50',
    label: 'Solve COA första gången',
    summary: 'Steel håller igen när intent ännu är osäkert.',
  },
  {
    id: 'jamming',
    time: '3:50-4:10',
    label: 'Heavy jamming',
    summary: 'Osäkerheten visas öppet istället för att döljas.',
  },
  {
    id: 'redirect',
    time: '4:10-4:35',
    label: 'Redirect mot Highridge',
    summary: 'Det som såg ut som probe skiftar till strike.',
  },
  {
    id: 'max',
    time: '4:35-5:00',
    label: 'Solve COA igen',
    summary: 'Samma system går från HOLD till full protection när datan kräver det.',
  },
];

const DEMO_SUMMARIES: Record<DemoStep['id'], DemoSummary> = {
  reset: {
    badge: 'BASELINE',
    title: 'Ren theater state',
    body: 'Utgångsläget ska vara tydligt innan demo-kedjan startar. Ingen effekt ska tolkas som magisk.',
    metrics: [
      { label: 'Threat count', value: '0', detail: 'Inga injicerade spår ännu.' },
      { label: 'Sensor quality', value: '1.0', detail: 'Nominal signalbild.' },
      { label: 'Commander posture', value: 'Standard', detail: 'Neutral policy före intent-shift.' },
      { label: 'Budskap', value: 'Börja rent', detail: 'Juryn ser vad som faktiskt ändras.' },
    ],
  },
  feint: {
    badge: 'PROBE/FEINT',
    title: 'Initial låg threat value',
    body: 'Ghost Feint visar hur låg initial threat value kan skifta när intent ändras i realtid.',
    metrics: [
      { label: 'Kontakter', value: '10', detail: 'Långsamma flygspår från norr.' },
      { label: 'P(strike)', value: '0.12', detail: 'Strike ligger lågt i intentfördelningen.' },
      { label: 'Läsning', value: 'Probe/feint', detail: 'Osäker men inte akut.' },
      { label: 'Budskap', value: 'Håll igen', detail: 'Rätt beslut är inte alltid full insats.' },
    ],
  },
  balanced: {
    badge: 'COA-BAL',
    title: 'Bevara reserv först',
    body: 'Den första solve:en visar att Steel inte är aggressiv av default. Den är policy-driven.',
    metrics: [
      { label: 'Rekommendation', value: 'COA-BAL', detail: '2-3 engagements istället för full commit.' },
      { label: 'Reserve logic', value: 'Skyddad', detail: 'Readiness hålls för nästa våg.' },
      { label: 'Confidence', value: '0.65', detail: 'Tillräcklig för uppföljning, inte för maxinsats.' },
      { label: 'Budskap', value: 'Inte skjuta direkt', detail: 'Smart stridsledning är selektiv.' },
    ],
  },
  jamming: {
    badge: 'EW',
    title: 'Osäkerheten blir synlig',
    body: 'UI och rekommendation synliggör osäkerheten när sensor quality degraderas av electronic warfare.',
    metrics: [
      { label: 'Sensor quality', value: '0.7', detail: 'Degraderad av jamming.' },
      { label: 'Confidence', value: '0.45', detail: 'Sjunker men försvinner inte.' },
      { label: 'Operator cue', value: 'Följ shift', detail: 'Fokus flyttas till intentförändring.' },
      { label: 'Budskap', value: 'Säkerhet om osäkerhet', detail: 'Systemet visar när läget är skört.' },
    ],
  },
  redirect: {
    badge: 'SHIFT',
    title: 'Probe -> Strike',
    body: 'Det här är själva wow-momentet. Samma spår får ny betydelse när velocity, heading och targetbild skiftar.',
    metrics: [
      { label: 'Velocity', value: '450 km/h', detail: 'Accelerationen driver Bayesian update.' },
      { label: 'Target', value: 'Highridge', detail: 'Omdirigering mot kritisk bas.' },
      { label: 'P(strike)', value: '0.75', detail: 'Strike blir dominant intent.' },
      { label: 'Budskap', value: 'Byt uppfattning', detail: 'Steel ändrar sig när datan kräver det.' },
    ],
  },
  max: {
    badge: 'MAX_PROTECTION',
    title: 'Agera nu',
    body: 'Slutpunkten ska visa att rationalen följer samma data som kartan och policy-lagret.',
    metrics: [
      { label: 'Rekommendation', value: 'MAX', detail: 'Full engagement vid bekräftad strike.' },
      { label: 'Engagements', value: '8-10', detail: 'Insatsen växlar upp direkt.' },
      { label: 'Time to target', value: '<120 s', detail: 'Urgency och intent pekar åt samma håll.' },
      { label: 'Budskap', value: 'Agera fullt', detail: 'Samma system håller igen först, commitar sedan.' },
    ],
  },
};

const DEMO_DECISIONS: Record<DemoStep['id'], DemoDecisionCard> = {
  reset: {
    action: 'Baseline ready',
    rationale: 'Theater state, policy och sensorkvalitet startar i nominalt läge utan låsta antaganden.',
    policy: 'Standard posture och neutral reserve floor.',
    validation: 'Ingen omklassificering ännu. Systemet väntar på faktisk signal.',
    outcome: 'Ren utgångspunkt för att se vad som verkligen ändras i scenariot.',
  },
  feint: {
    action: 'Observe and classify',
    rationale: 'Spåren är långsamma, avlägsna och matchar probe/feint bättre än strike.',
    policy: 'Bevara interceptors tills intent blir tydligare.',
    validation: 'Bayesian intent ligger lågt för strike och högre för probe/feint.',
    outcome: 'Låg initial threat value utan överreaktion.',
  },
  balanced: {
    action: 'COA-BAL',
    rationale: 'Steel rekommenderar begränsad commit för att skydda readiness till nästa våg.',
    policy: 'Säkerhet och sustainability vägs jämnt i första solve:en.',
    validation: 'Ingen robust grund ännu för MAX_PROTECTION.',
    outcome: '2-3 engagements istället för full insats.',
  },
  jamming: {
    action: 'Track uncertainty',
    rationale: 'Jamming sänker confidence men blir själv en del av beslutsmodellen.',
    policy: 'Beslutet håller igen tills ny evidens bryter osäkerheten.',
    validation: 'Sensor quality och confidence exponeras öppet i samma loop.',
    outcome: 'Osäkerhet syns i UI, inte bara i backend.',
  },
  redirect: {
    action: 'Reclassify to strike',
    rationale: 'Heading, velocity och targetbild skiftar samtidigt mot Highridge Command.',
    policy: 'Intent shift gör att wave-2-logiken byter prioritet till skydd nu.',
    validation: 'Bayesian update, decision tree och heuristik pekar åt samma håll.',
    outcome: 'Probe kollapsar och strike blir dominerande intent.',
  },
  max: {
    action: 'MAX_PROTECTION',
    rationale: 'Samma system som höll igen går nu till full protection när datan kräver det.',
    policy: 'Safety prioriteras upp när strike är bekräftad och tiden faller.',
    validation: 'Rekommendationen stöds av intent shift, confidence recovery och policy trace.',
    outcome: 'Full engagement mot bekräftad strike.',
  },
};

const DEMO_CONSOLES: Record<DemoStep['id'], string[]> = {
  reset: [
    '> Reset theater state och policy weights',
    '> Sensor quality = 1.0 | threat count = 0',
    '> Readiness book hålls oförändrad inför demo',
    '> Systemet väntar på faktisk injektion',
  ],
  feint: [
    '> loadScenario(ghost-feint)',
    '> 10 tracks från norr klassificeras som probe/feint',
    '> intent_distribution.strike = 0.12',
    '> Recommendation: observe and classify',
  ],
  balanced: [
    '> triggerSolve(weights: balanced)',
    '> COA-BAL vinner mot MAX på reserve floor',
    '> Monte Carlo stressar nästa våg och visar depth-risk',
    '> Resultat: begränsad commit, readiness kvar',
  ],
  jamming: [
    '> setJamming(true, 0.7)',
    '> sensor_quality 1.0 -> 0.7',
    '> confidence 0.65 -> 0.45',
    '> UI visar osäkerhet öppet i samma loop',
  ],
  redirect: [
    '> redirectTracks(target = Highridge, velocity = 450)',
    '> heading + target + velocity driver Bayesian update',
    '> intent_distribution.strike 0.12 -> 0.75',
    '> Decision tree växlar gren från hold till strike',
  ],
  max: [
    '> triggerSolve(weights: max_protection)',
    '> Policy trace prioriterar safety över sustainability',
    '> Validation layer konvergerar kring full engagement',
    '> Rationale genereras för C2-personal via backend',
  ],
};

const IMPACT_FOUNDATIONS = [
  'showcase-shell',
  'console-sekvenser',
  'operator flow',
  'COA',
  'validation',
  'delad state',
  'ontology',
  'knowledge graph',
  'summary',
];

const IMPACT_TOP_MODULES: ImpactModule[] = [
  { title: 'Tactical COP', detail: 'tracks / intent', status: 'BUILT' },
  { title: 'COA Solver', detail: 'MAX / BAL / DST', status: 'BUILT' },
  { title: 'Recommendation', detail: 'rationale', status: 'BUILT' },
];

const IMPACT_BOTTOM_MODULES: ImpactModule[] = [
  { title: 'Readiness', detail: 'next wave', status: 'SIMULATED' },
  { title: 'Robustness Lab', detail: 'counterfactual', status: 'SIMULATED' },
  { title: 'Knowledge Graph', detail: 'shared state', status: 'FRAMEWORK' },
];

const IMPACT_HONESTY_NOTE =
  'Notis: Det här är en fungerande Steel-slice, inte ett färdigoperativt helsystem. Vissa presentationsflöden är orkestrerade, men de bygger på riktig delad state, verkliga UI-ytor och repo-kod.';

const DOMAIN_CARDS: DomainCard[] = [
  {
    title: 'Beslutsstöd och analys',
    body: 'COATwin, PolicyTwin, rationale, Monte Carlo och counterfactuals läser samma threats, guardrails och projected outcomes.',
  },
  {
    title: 'Taktisk lägesbild',
    body: 'ThreatTwin och SensorTwin bär intent, klassificering, geometri, sensor quality och jamming i samma modell.',
  },
  {
    title: 'Logistik och uthållighet',
    body: 'SupplyNode, SupplyCorridor och ReinforcementGroup kopplas direkt till readiness, fuel, ammo och nästa våg.',
  },
  {
    title: 'Operatörsytor',
    body: 'Command surfaces, field view, governance UI och labs läser samma domänspråk, inte tre separata snapshots.',
  },
  {
    title: 'Infrastruktur',
    body: 'TypeScript-interface, state backbone, SSR transport och API seams håller betydelsen stabil mellan ytor och backend.',
  },
];

const ONTOLOGY_MODEL_GROUPS: OntologyModelGroup[] = [
  {
    title: 'Core domain models',
    lead: 'Det semantiska kontraktet börjar i delade TypeScript-interface för theater simulation.',
    models: ['BaseTwin', 'ThreatTwin', 'EffectorTwin', 'SensorTwin', 'PolicyTwin', 'COATwin', 'OperationalDirective', 'MapFeature'],
  },
  {
    title: 'Logistics ontology',
    lead: 'Logistiken är inte en sidoyta, utan en del av samma operativa verklighet och samma beslutsmodell.',
    models: ['SupplyNode', 'SupplyCorridor', 'ReinforcementGroup'],
  },
  {
    title: 'Key idea',
    lead: 'En enda theater state matar policy, readiness, logistics, governance och labs utan kopierade snapshots.',
    models: ['One theater state', 'Shared seed data', 'No semantic drift', 'Same model across all surfaces'],
  },
];

const CLOSE_SUMMARY_STATS: CloseSummaryStat[] = [
  {
    label: 'Användarmål',
    detail: 'Fatta rätt beslut under tidspress och bevara nästa våg',
    tone: 'blue',
  },
  {
    label: 'Påverkan',
    detail: 'Verksamhetskritiskt eftersom fel beslut förbrukar förmåga för tidigt',
    tone: 'green',
  },
  {
    label: 'Oundvikliga aktiviteter',
    detail: 'Samla, fusionera, välja, validera och skydda uthållighet',
    tone: 'purple',
  },
  {
    label: 'Lösningsstruktur',
    detail: 'Policy-driven COA, kontrafaktisk validation och ontologi i ett state',
    tone: 'amber',
  },
];

const CLOSE_METHODS: CloseMethod[] = [
  {
    tag: 'M1',
    title: 'Policy-driven multi-wave COA',
    body: 'Commander posture och reserve floor styr valet så att wave-2-beredskap bevaras.',
  },
  {
    tag: 'M2',
    title: 'Robusthet och kontrafaktik',
    body: 'Beslutet låses först efter Monte Carlo, labbhandoff och stress mot osäkerhet.',
  },
  {
    tag: 'M3',
    title: 'Funktionell ontologi',
    body: 'Samma theater state matar policy, readiness, logistics, governance och labs.',
  },
];

const CLOSE_ANSWER =
  'Steel visar en prototyp av ett ledningssystem som hjälper användaren att möta hot nu, bevara förmåga för nästa våg och få ett tydligt, validerat svar på vad som ska göras härnäst.';

const STATIC_CONSOLES: Record<string, ConsoleConfig> = {
  process: {
    title: 'Runtime Trace / Process',
    lines: [
      '> sensor trigger: radar, EW och tidskritiska spår initierar kedjan',
      '> RAP byggs genom fusion, inte som en passiv visualisering',
      '> intent distribution uppdateras under noise, latency och jamming',
      '> COA solve väger wave 2, reserve floor och target criticality',
      '> recommendation + readiness + human commit stänger loopen',
    ],
  },
  layers: {
    title: 'Runtime Trace / Layers',
    lines: [
      '> Theater state delas av tactical, governance, readiness och labs',
      '> COA engine räknar flera handlingsalternativ samtidigt',
      '> Validation layer blockerar sköra beslut före commit',
      '> Rationale lagret översätter strukturerad data till begriplig handling',
    ],
  },
  architecture: {
    title: 'Runtime Trace / Doctrine to Decision',
    lines: [
      '> doctrine + risk -> strukturerade constraints',
      '> ontology -> samma språk för threat, readiness, logistics och governance',
      '> inference stack -> decision trees, random forests, Monte Carlo',
      '> field feedback -> modellen förhårdas av verklig användning',
      '> backend rationale -> lokal modell utan direktanrop från frontend',
    ],
  },
  scale: {
    title: 'Runtime Trace / Shared Ontology',
    lines: [
      '> overview, tactical, commander och field läser samma state',
      '> readiness och logistics delar samma semantik, inte exportkopior',
      '> robustness lab och counterfactual lab använder samma kontrakt',
      '> governance och rationale är läsare av samma beslutskedja',
    ],
  },
};

@Component({
  selector: 'app-showcase-final',
  standalone: true,
  imports: [CommonModule, RouterLink, TacticalConsole, WindowFrameComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="final-showcase-shell" (keydown)="onKey($event)" tabindex="0">
      <div class="final-showcase-bg"></div>

      <header class="final-showcase-header">
        <div class="final-brand">
          <div class="final-logo">S</div>
          <div>
            <div class="final-brand-kicker">Saab Smart Stridsledning</div>
            <div class="final-brand-title">Boreal Decision Twin</div>
          </div>
        </div>

        <div class="final-header-actions">
          <span class="final-format-pill">{{ presentationPhase() }}</span>
          <a routerLink="/showcase" class="final-secondary-btn">Original</a>
          <a routerLink="/" class="final-exit-btn">Stäng</a>
        </div>
      </header>

      <main class="final-showcase-main">
        @switch (activeSlideId()) {
          @case ('hero') {
            <section class="final-slide final-slide-hero">
              <div class="hero-title-block">
                <div class="final-slide-eyebrow">{{ slides[0].eyebrow }}</div>
                <h1 class="final-hero-title">{{ slides[0].title }}</h1>
                <div class="hero-title-subline">Smart Stridsledning</div>
                <div class="hero-title-support">powered by Boreal Decision Twin</div>
              </div>

              <div class="hero-pill-grid">
                <article class="hero-pill">
                  <div class="hero-pill-label">Operational Picture</div>
                  <div class="hero-pill-text">Sensorfusion blir RAP och intent i samma lägesbild</div>
                </article>
                <article class="hero-pill">
                  <div class="hero-pill-label">Decision Logic</div>
                  <div class="hero-pill-text">COA, reserve floor och readiness vägs mot nästa våg</div>
                </article>
                <article class="hero-pill">
                  <div class="hero-pill-label">Shared Backbone</div>
                  <div class="hero-pill-text">Ontologi håller samma theater state över alla ytor</div>
                </article>
              </div>

              <div class="hero-stack hero-mission-block">
                <div class="hero-stack-row"><span>Användare</span><strong>Luftbevakare, flygstridsledare, command authority</strong></div>
                <div class="hero-stack-row"><span>Problem</span><strong>Fatta rätt beslut under sekundnivå-friktion och osäkerhet</strong></div>
                <div class="hero-stack-row"><span>Metod</span><strong>Policy, robusthet och ontologi i ett delat theater state</strong></div>
                <div class="hero-stack-row"><span>Mål</span><strong>Rätt verkan nu. Förmåga kvar sen.</strong></div>
              </div>

              <div class="hero-question-line">
                <span class="hero-question-prompt">></span>
                <span>kärnfråga: hur möter vi hotet nu utan att tömma nästa våg?</span>
              </div>
            </section>
          }

          @case ('process') {
            <section class="final-slide">
              <div class="final-slide-eyebrow">{{ slides[1].eyebrow }}</div>
              <h2 class="final-slide-title">{{ slides[1].title }}</h2>
              <p class="final-slide-subtitle">{{ slides[1].subtitle }}</p>

              <div class="process-stage-layout">
                <div class="process-flow-panel">
                  <div class="process-friction-cloud">noise · latency · jamming · wave 2</div>

                  <div class="process-flow-list">
                    @for (step of processSteps; track step.id; let i = $index; let last = $last) {
                      <div class="process-flow-node-wrap">
                        <article class="process-flow-node">
                          <div class="process-stage-icon" [class.process-stage-icon-sensor]="step.icon === 'sensor'" [class.process-stage-icon-rap]="step.icon === 'rap'" [class.process-stage-icon-intent]="step.icon === 'intent'" [class.process-stage-icon-coa]="step.icon === 'coa'" [class.process-stage-icon-recommendation]="step.icon === 'recommendation'" [class.process-stage-icon-readiness]="step.icon === 'readiness'" [class.process-stage-icon-commit]="step.icon === 'commit'">
                            @switch (step.icon) {
                              @case ('sensor') {
                                <span class="icon-radar-ring"></span>
                                <span class="icon-radar-core"></span>
                              }
                              @case ('rap') {
                                <span class="icon-map-grid"></span>
                                <span class="icon-map-point icon-map-point-a"></span>
                                <span class="icon-map-point icon-map-point-b"></span>
                                <span class="icon-map-point icon-map-point-c"></span>
                              }
                              @case ('intent') {
                                <span class="icon-bar icon-bar-1"></span>
                                <span class="icon-bar icon-bar-2"></span>
                                <span class="icon-bar icon-bar-3"></span>
                              }
                              @case ('coa') {
                                <span class="icon-card icon-card-a"></span>
                                <span class="icon-card icon-card-b"></span>
                                <span class="icon-card icon-card-c"></span>
                              }
                              @case ('recommendation') {
                                <span class="icon-panel"></span>
                                <span class="icon-panel-line icon-panel-line-a"></span>
                                <span class="icon-panel-line icon-panel-line-b"></span>
                              }
                              @case ('readiness') {
                                <span class="icon-gauge-shell"></span>
                                <span class="icon-gauge-fill"></span>
                              }
                              @case ('commit') {
                                <span class="icon-check-stem"></span>
                                <span class="icon-check-kick"></span>
                              }
                            }
                          </div>

                          <div class="process-flow-copy">
                            <div class="process-index">0{{ i + 1 }}</div>
                            <div class="process-label">{{ step.label }}</div>
                            <div class="process-description">{{ step.description }}</div>
                          </div>
                        </article>

                        @if (!last) {
                          <div class="process-flow-connector">
                            <span class="process-flow-line"></span>
                            <span class="process-flow-arrow"></span>
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>

                <aside class="process-map-panel">
                  <div class="process-map-head">
                    <div class="process-map-kicker">Mini COP</div>
                    <div class="process-map-title">Tre spår mot kritisk bas</div>
                  </div>

                  <div class="process-mini-map">
                    <div class="process-mini-map-grid"></div>
                    <div class="process-mini-map-base-ring"></div>
                    <div class="process-mini-map-base"></div>
                    <div class="process-mini-map-base-label">Highridge</div>

                    <div class="process-mini-map-track process-mini-map-track-a"></div>
                    <div class="process-mini-map-track process-mini-map-track-b"></div>
                    <div class="process-mini-map-track process-mini-map-track-c"></div>

                    <div class="process-mini-map-node process-mini-map-node-a"></div>
                    <div class="process-mini-map-node process-mini-map-node-b"></div>
                    <div class="process-mini-map-node process-mini-map-node-c"></div>

                    <div class="process-mini-map-sensor process-mini-map-sensor-a"></div>
                    <div class="process-mini-map-sensor process-mini-map-sensor-b"></div>
                  </div>

                  <div class="process-map-legend">
                    <div class="process-map-legend-row"><span class="process-map-dot process-map-dot-blue"></span> RAP / egna sensorer</div>
                    <div class="process-map-legend-row"><span class="process-map-dot process-map-dot-red"></span> Tre inkommande spår</div>
                    <div class="process-map-legend-row"><span class="process-map-dot process-map-dot-amber"></span> Kritisk bas / beslutspunkt</div>
                  </div>
                </aside>
              </div>

              <div class="callout-strip">
                <div class="callout-block">
                  <div class="callout-label">Kärnpoäng</div>
                  <div class="callout-body">Processen vi förbättrar är inte att titta på en karta. Det är kedjan från sensordata till beslut, rationale och readiness.</div>
                </div>
                <div class="callout-block callout-block-strong">
                  <div class="callout-label">Common Action Environment</div>
                  <div class="callout-body">Vi bygger inte bara en Common Operating Picture. Vi bygger en <strong>Common Action Environment</strong>.</div>
                </div>
              </div>

              <app-window-frame [title]="consoleTitle()" class="final-console-frame">
                <div class="final-console-shell">
                  @for (line of consoleLines(); track $index) {
                    <div class="final-console-line">{{ line }}</div>
                  }
                </div>
              </app-window-frame>
            </section>
          }

          @case ('mission-critical') {
            <section class="final-slide">
              <div class="final-slide-eyebrow">{{ slides[2].eyebrow }}</div>
              <h2 class="final-slide-title">{{ slides[2].title }}</h2>
              <p class="final-slide-subtitle">{{ slides[2].subtitle }}</p>

              <div class="stakes-grid">
                @for (card of failureCards; track card.title) {
                  <article class="stakes-card" [class.stakes-card-coa-max]="card.coa === 'COA-MAX'" [class.stakes-card-coa-bal]="card.coa === 'COA-BAL'" [class.stakes-card-coa-dst]="card.coa === 'COA-DST'">
                    <div class="stakes-card-head">
                      <div class="stakes-coa-pill" [class.stakes-coa-pill-max]="card.coa === 'COA-MAX'" [class.stakes-coa-pill-bal]="card.coa === 'COA-BAL'" [class.stakes-coa-pill-dst]="card.coa === 'COA-DST'">{{ card.coa }}</div>
                      <div class="stakes-card-summary">{{ card.summary }}</div>
                    </div>
                    <div class="stakes-card-title">{{ card.title }}</div>
                    <div class="stakes-card-body">{{ card.body }}</div>
                  </article>
                }
              </div>

              <div class="wave-decision-panel">
                <article class="wave-panel">
                  <div class="callout-label">Multi-wave consequence</div>
                  <div class="wave-timeline">
                    <div class="wave-step wave-step-hot">Wave 1</div>
                    <div class="wave-arrow"></div>
                    <div class="wave-step">Turnaround</div>
                    <div class="wave-arrow"></div>
                    <div class="wave-step wave-step-future">Wave 2</div>
                  </div>

                  <div class="readiness-block">
                    <div class="readiness-label-row">
                      <span class="readiness-label">Readiness om MAX används för tidigt</span>
                      <span class="readiness-value">34%</span>
                    </div>
                    <div class="readiness-meter">
                      <span class="readiness-segment readiness-segment-red"></span>
                      <span class="readiness-segment readiness-segment-amber"></span>
                      <span class="readiness-segment readiness-segment-empty"></span>
                      <span class="readiness-segment readiness-segment-empty"></span>
                    </div>
                    <div class="readiness-caption">Wave 1 kan se bra ut i stunden, men turnaround och nästa våg blir sköra om för mycket commit sker för tidigt.</div>
                  </div>
                </article>

                <article class="wave-panel contrast-panel">
                  <div class="contrast-columns">
                    <div class="contrast-column">
                      <div class="callout-label">Legacy</div>
                      <div class="contrast-title">Point solution</div>
                      <div class="contrast-copy">Optimerar ofta detektion eller enskild intercept utan att bära kostnaden in i nästa våg.</div>
                    </div>
                    <div class="contrast-column contrast-column-strong">
                      <div class="callout-label">Steel</div>
                      <div class="contrast-title">Multi-wave decision</div>
                      <div class="contrast-copy">Optimerar skydd nu utan att kollapsa framtida readiness, basbelastning eller robusthet under friktion.</div>
                    </div>
                  </div>
                </article>
              </div>

              <div class="stakes-summary">
                <div class="callout-label">Steel objective</div>
                <div class="callout-body">Maximize protection without collapsing future readiness. Det är därför uppgiften är snabb intelligent resursoptimering, inte bara detektion.</div>
              </div>
            </section>
          }

          @case ('layers') {
            <section class="final-slide">
              <div class="final-slide-eyebrow">{{ slides[3].eyebrow }}</div>
              <h2 class="final-slide-title">{{ slides[3].title }}</h2>
              <p class="final-slide-subtitle">{{ slides[3].subtitle }}</p>

              <div class="layer-rail">
                <span>Theater state</span>
                <span>Decision layer</span>
                <span>Validation layer</span>
                <span>Rationale layer</span>
              </div>

              <div class="layer-grid layer-grid-4">
                @for (layer of layerCards; track layer.title) {
                  <article class="layer-card">
                    <div class="layer-card-title">{{ layer.title }}</div>
                    <div class="layer-card-summary">{{ layer.summary }}</div>
                    <div class="layer-items">
                      @for (item of layer.items; track item) {
                        <div class="layer-item">{{ item }}</div>
                      }
                    </div>
                  </article>
                }
              </div>

              <app-window-frame [title]="consoleTitle()" class="final-console-frame">
                <div class="final-console-shell">
                  @for (line of consoleLines(); track $index) {
                    <div class="final-console-line">{{ line }}</div>
                  }
                </div>
              </app-window-frame>
            </section>
          }

          @case ('architecture') {
            <section class="final-slide">
              <div class="final-slide-eyebrow">{{ slides[4].eyebrow }}</div>
              <h2 class="final-slide-title">{{ slides[4].title }}</h2>
              <p class="final-slide-subtitle">{{ slides[4].subtitle }}</p>

              <div class="architecture-pipeline">
                @for (step of architectureSteps; track step.id) {
                  <article class="architecture-step-card">
                    <div class="architecture-step-title">{{ step.title }}</div>
                    <div class="architecture-step-description">{{ step.description }}</div>
                    <div class="architecture-step-items">
                      @for (item of step.items; track item) {
                        <div class="architecture-step-item">{{ item }}</div>
                      }
                    </div>
                  </article>
                }
              </div>

              <div class="architecture-proof-grid">
                <article class="proof-card">
                  <div class="proof-label">Inferens-träd</div>
                  <div class="proof-head">Från osäkerhet till valbar handling</div>
                  <div class="inference-root">Doctrine + risk + ontology + live theater state</div>
                  <div class="inference-branch-grid">
                    @for (branch of inferenceBranches; track branch.label) {
                      <div class="inference-branch-card">
                        <div class="inference-branch-title">{{ branch.label }}</div>
                        <div class="inference-branch-copy"><strong>Gate:</strong> {{ branch.gate }}</div>
                        <div class="inference-branch-copy"><strong>Model:</strong> {{ branch.model }}</div>
                        <div class="inference-branch-copy inference-branch-copy-strong"><strong>Outcome:</strong> {{ branch.outcome }}</div>
                      </div>
                    }
                  </div>
                </article>

                <article class="proof-card">
                  <div class="proof-label">Det som redan finns och funkar</div>
                  <div class="proof-head">Repo-förankrat beslutsstöd, inte bara en vision</div>
                  <div class="proof-subgrid">
                    <div>
                      <div class="proof-subtitle">Exponerade ytor</div>
                      <div class="proof-chip-grid">
                        @for (surface of architectureSurfaces; track surface) {
                          <div class="proof-chip">{{ surface }}</div>
                        }
                      </div>
                    </div>
                    <div>
                      <div class="proof-subtitle">Backend inference seams</div>
                      <div class="proof-chip-grid">
                        @for (service of architectureServices; track service) {
                          <div class="proof-chip proof-chip-accent">{{ service }}</div>
                        }
                      </div>
                    </div>
                  </div>
                </article>
              </div>

              <div class="callout-strip callout-strip-single">
                <div class="callout-block callout-block-strong">
                  <div class="callout-label">Poäng</div>
                  <div class="callout-body">Systemet är inte bara AI. Doktrin och risk blir strukturerad data, strukturerad data blir simulerade handlingsalternativ, och resultatet presenteras med låg kognitiv kostnad för mänskliga beslutsfattare.</div>
                </div>
              </div>

              <app-window-frame [title]="consoleTitle()" class="final-console-frame">
                <div class="final-console-shell">
                  @for (line of consoleLines(); track $index) {
                    <div class="final-console-line">{{ line }}</div>
                  }
                </div>
              </app-window-frame>
            </section>
          }

          @case ('demo') {
            <section class="final-slide final-slide-demo final-slide-demo-map">
              <div class="final-slide-eyebrow">{{ slides[5].eyebrow }}</div>
              <h2 class="final-slide-title">{{ slides[5].title }}</h2>
              <p class="final-slide-subtitle">{{ slides[5].subtitle }}</p>

              <div class="demo-map-stage">
                <div class="demo-map-shell">
                  <app-tactical-console class="demo-map-background"></app-tactical-console>
                  <div class="demo-map-vignette"></div>

                  <app-window-frame title="Scenario Flow" class="demo-window demo-window-flow">
                    <div class="demo-phase-list">
                      @for (step of demoSteps; track step.id) {
                        <button class="demo-phase-button" type="button" [class.demo-phase-button-active]="activeDemoStep() === step.id" (click)="runDemoStep(step.id)">
                          <div class="demo-phase-time">{{ step.time }}</div>
                          <div class="demo-phase-label">{{ step.label }}</div>
                          <div class="demo-phase-summary">{{ step.summary }}</div>
                        </button>
                      }
                    </div>
                  </app-window-frame>

                  <app-window-frame title="Intent Shift" class="demo-window demo-window-shift">
                    <div class="demo-window-metric-grid">
                      @for (metric of demoSummary().metrics; track metric.label) {
                        <div class="demo-window-metric-card">
                          <div class="demo-window-metric-label">{{ metric.label }}</div>
                          <div class="demo-window-metric-value">{{ metric.value }}</div>
                          <div class="demo-window-metric-detail">{{ metric.detail }}</div>
                        </div>
                      }
                    </div>
                  </app-window-frame>

                  <app-window-frame title="Recommendation Card" class="demo-window demo-window-recommendation">
                    <div class="demo-window-copy demo-window-copy-wide">
                      <div class="demo-window-head demo-window-head-large">{{ demoDecision().action }}</div>
                      <div class="demo-window-text">{{ demoDecision().rationale }}</div>
                      <div class="demo-window-detail-grid">
                        <div class="demo-window-detail-card">
                          <div class="demo-window-detail-label">Policy</div>
                          <div class="demo-window-detail-value">{{ demoDecision().policy }}</div>
                        </div>
                        <div class="demo-window-detail-card">
                          <div class="demo-window-detail-label">Validation</div>
                          <div class="demo-window-detail-value">{{ demoDecision().validation }}</div>
                        </div>
                        <div class="demo-window-detail-card demo-window-detail-card-full">
                          <div class="demo-window-detail-label">Operational outcome</div>
                          <div class="demo-window-detail-value">{{ demoDecision().outcome }}</div>
                        </div>
                      </div>
                    </div>
                  </app-window-frame>

                  <app-window-frame title="Validation / Decision Trace" class="demo-window demo-window-validation">
                    <div class="demo-window-copy demo-window-copy-wide">
                      <div class="demo-tag-row">
                        <span class="demo-tag">Bayesian intent</span>
                        <span class="demo-tag">Decision tree</span>
                        <span class="demo-tag">ML inference</span>
                        <span class="demo-tag">Counterfactuals</span>
                      </div>
                      <div class="demo-console-shell">
                        @for (line of consoleLines(); track $index) {
                          <div class="demo-console-line">{{ line }}</div>
                        }
                      </div>
                    </div>
                  </app-window-frame>
                </div>
              </div>
            </section>
          }

          @case ('impact') {
            <section class="final-slide final-slide-impact">
              <div class="final-slide-eyebrow">{{ slides[6].eyebrow }}</div>
              <h2 class="final-slide-title final-slide-title-compact">{{ slides[6].title }}</h2>
              <p class="final-slide-subtitle final-slide-subtitle-compact">{{ slides[6].subtitle }}</p>

              <div class="impact-intro-grid">
                <article class="proof-card">
                  <div class="proof-label">Implementation Surface</div>
                  <div class="proof-head">Sex kopplade moduler över samma state-backbone</div>
                  <div class="impact-intro-copy">Slide 6 visade exekveringen. Slide 7 bryter ned samma förlopp i explicita systemdelar i Steel: Tactical COP, COA-solve, recommendation/rationale, readiness projection, robustness analysis och knowledge graph över delad state.</div>
                </article>

                <article class="proof-card">
                  <div class="proof-label">Bygger på</div>
                  <div class="proof-chip-grid">
                    @for (item of impactFoundations; track item) {
                      <div class="proof-chip">{{ item }}</div>
                    }
                  </div>
                </article>
              </div>

              <section class="impact-board">
                <div class="impact-board-head">
                  <div class="impact-board-title">Byggt i Steel</div>
                  <div class="impact-board-subtitle">Truth-first: samma state, inte kopierade snapshots.</div>
                </div>

                <div class="impact-flow-grid">
                  @for (module of impactTopModules; track module.title; let last = $last) {
                    <article
                      class="impact-module-card"
                      [class.impact-module-card-built]="module.status === 'BUILT'"
                      [class.impact-module-card-simulated]="module.status === 'SIMULATED'"
                      [class.impact-module-card-framework]="module.status === 'FRAMEWORK'"
                    >
                      <div class="impact-module-status">{{ module.status }}</div>
                      <div class="impact-module-title">{{ module.title }}</div>
                      <div class="impact-module-detail">{{ module.detail }}</div>
                    </article>
                    @if (!last) {
                      <div class="impact-flow-arrow" aria-hidden="true">→</div>
                    }
                  }

                  @for (module of impactTopModules; track module.title; let last = $last) {
                    <div class="impact-flow-down" aria-hidden="true">↓</div>
                    @if (!last) {
                      <div class="impact-flow-spacer" aria-hidden="true"></div>
                    }
                  }

                  @for (module of impactBottomModules; track module.title; let last = $last) {
                    <article
                      class="impact-module-card"
                      [class.impact-module-card-built]="module.status === 'BUILT'"
                      [class.impact-module-card-simulated]="module.status === 'SIMULATED'"
                      [class.impact-module-card-framework]="module.status === 'FRAMEWORK'"
                    >
                      <div class="impact-module-status">{{ module.status }}</div>
                      <div class="impact-module-title">{{ module.title }}</div>
                      <div class="impact-module-detail">{{ module.detail }}</div>
                    </article>
                    @if (!last) {
                      <div class="impact-flow-spacer" aria-hidden="true"></div>
                    }
                  }
                </div>
              </section>

              <div class="impact-honesty-note">{{ impactHonestyNote }}</div>
            </section>
          }

          @case ('scale') {
            <section class="final-slide">
              <div class="final-slide-eyebrow">{{ slides[7].eyebrow }}</div>
              <h2 class="final-slide-title">{{ slides[7].title }}</h2>
              <p class="final-slide-subtitle">{{ slides[7].subtitle }}</p>

              <div class="ontology-summary-panel">
                <div class="callout-label">Steel ontology</div>
                <div class="callout-body">Steel använder en funktionell domänontologi: ett delat paket av TypeScript-interface och seed data som definierar den semantiska modellen för hela theater simulation.</div>
              </div>

              <div class="ontology-model-grid">
                @for (group of ontologyModelGroups; track group.title) {
                  <article class="ontology-model-card">
                    <div class="ontology-model-title">{{ group.title }}</div>
                    <div class="ontology-model-lead">{{ group.lead }}</div>
                    <div class="ontology-model-chip-row">
                      @for (model of group.models; track model) {
                        <div class="ontology-model-chip">{{ model }}</div>
                      }
                    </div>
                  </article>
                }
              </div>

              <div class="domain-grid">
                @for (domain of domainCards; track domain.title) {
                  <article class="domain-card">
                    <div class="domain-card-title">{{ domain.title }}</div>
                    <div class="domain-card-body">{{ domain.body }}</div>
                  </article>
                }
              </div>

              <div class="callout-strip callout-strip-single">
                <div class="callout-block">
                  <div class="callout-label">Varför det går att skala</div>
                  <div class="callout-body">Utan ontologi får man fem vyer. Med ontologi får man ett beslutssystem.</div>
                </div>
              </div>

              <app-window-frame [title]="consoleTitle()" class="final-console-frame">
                <div class="final-console-shell">
                  @for (line of consoleLines(); track $index) {
                    <div class="final-console-line">{{ line }}</div>
                  }
                </div>
              </app-window-frame>
            </section>
          }

          @case ('close') {
            <section class="final-slide final-slide-close">
              <div class="final-slide-eyebrow">{{ slides[8].eyebrow }}</div>
              <h2 class="final-slide-title">{{ slides[8].title }}</h2>
              <p class="final-slide-subtitle">{{ slides[8].subtitle }}</p>

              <div class="close-summary-grid">
                @for (item of closeSummaryStats; track item.label) {
                  <article class="close-summary-card">
                    <div class="close-summary-label" [class.close-summary-label-blue]="item.tone === 'blue'" [class.close-summary-label-green]="item.tone === 'green'" [class.close-summary-label-purple]="item.tone === 'purple'" [class.close-summary-label-amber]="item.tone === 'amber'">{{ item.label }}</div>
                    <div class="close-summary-detail">{{ item.detail }}</div>
                  </article>
                }
              </div>

              <div class="close-method-grid">
                @for (method of closeMethods; track method.tag) {
                  <article class="close-method-card">
                    <div class="close-method-tag">{{ method.tag }}</div>
                    <div class="close-method-title">{{ method.title }}</div>
                    <div class="close-method-body">{{ method.body }}</div>
                  </article>
                }
              </div>

              <div class="close-answer-card">{{ closeAnswer }}</div>

              <div class="final-cta-row">
                <a routerLink="/" class="final-exit-btn">Öppna systemet</a>
                <span class="close-summary-note">Kräver åtkomstnyckel</span>
              </div>
            </section>
          }
        }
      </main>

      <nav class="final-nav">
        <button class="final-nav-arrow" type="button" [disabled]="currentSlide() === 0" (click)="prev()">‹</button>
        <div class="final-nav-dots">
          @for (slide of slides; track slide.id; let i = $index) {
            <button class="final-nav-dot" type="button" [class.final-nav-dot-active]="currentSlide() === i" [title]="slide.title" (click)="goTo(i)"></button>
          }
        </div>
        <button class="final-nav-arrow" type="button" [disabled]="currentSlide() === slides.length - 1" (click)="next()">›</button>
      </nav>

      <div class="final-slide-counter">{{ currentSlide() + 1 }} / {{ slides.length }}</div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .final-showcase-shell {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: #050b12;
      color: #edf5ff;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
      --s-text: #edf5ff;
      --s-muted: #9ab0c8;
      --s-blue: #5ca7ff;
      --s-green: #7ce0be;
      --s-purple: #9b8cff;
      --s-border: rgba(148, 189, 255, 0.12);
    }

    .final-showcase-shell:focus {
      outline: none;
    }

    .final-showcase-bg {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        radial-gradient(circle at 18% 20%, rgba(92, 167, 255, 0.16), transparent 30%),
        radial-gradient(circle at 78% 18%, rgba(124, 224, 190, 0.12), transparent 28%),
        radial-gradient(circle at 50% 80%, rgba(155, 140, 255, 0.08), transparent 24%);
    }

    .final-showcase-header {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 24px;
      border-bottom: 1px solid var(--s-border);
      background: rgba(5, 11, 18, 0.72);
      backdrop-filter: blur(12px);
      flex-shrink: 0;
    }

    .final-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .final-logo {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, #5ca7ff, #7ce0be);
      color: #050b12;
      font-size: 18px;
      font-weight: 900;
    }

    .final-brand-kicker {
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.24em;
      color: var(--s-muted);
    }

    .final-brand-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: var(--s-text);
    }

    .final-header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .final-format-pill {
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid rgba(124, 224, 190, 0.16);
      background: rgba(124, 224, 190, 0.08);
      color: var(--s-green);
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.16em;
    }

    .final-secondary-btn,
    .final-exit-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 36px;
      padding: 0 14px;
      border-radius: 8px;
      border: 1px solid var(--s-border);
      text-decoration: none;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      transition: all 0.2s;
    }

    .final-secondary-btn {
      color: var(--s-muted);
      background: rgba(255, 255, 255, 0.03);
    }

    .final-secondary-btn:hover {
      color: var(--s-text);
      border-color: rgba(148, 189, 255, 0.28);
      background: rgba(92, 167, 255, 0.06);
    }

    .final-exit-btn {
      color: #050b12;
      background: linear-gradient(135deg, #5ca7ff, #7ce0be);
      border-color: transparent;
    }

    .final-showcase-main {
      position: relative;
      z-index: 1;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .final-showcase-shell p {
      font-size: 15px;
      line-height: 1.8;
    }

    .final-slide {
      height: 100%;
      overflow-y: auto;
      padding: 36px 40px 110px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      animation: slideIn 0.35s ease-out both;
    }

    .final-slide-eyebrow {
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.26em;
      color: var(--s-muted);
    }

    .final-slide-title,
    .final-hero-title {
      margin: 0;
      line-height: 0.98;
      letter-spacing: -0.04em;
      font-weight: 300;
    }

    .final-hero-title {
      font-size: clamp(64px, 9vw, 108px);
      background: linear-gradient(135deg, #edf5ff, #5ca7ff 38%, #7ce0be);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .final-slide-title {
      font-size: clamp(28px, 4vw, 52px);
    }

    .final-slide-title-compact {
      font-size: clamp(22px, 3vw, 34px);
      line-height: 1.04;
      letter-spacing: -0.03em;
    }

    .final-hero-subtitle,
    .final-slide-subtitle {
      margin: 0;
      max-width: 72rem;
      color: var(--s-muted);
      line-height: 1.7;
    }

    .final-hero-subtitle {
      font-size: 20px;
      max-width: 52rem;
    }

    .final-slide-subtitle {
      font-size: 16px;
    }

    .final-slide-subtitle-compact {
      max-width: 58rem;
      font-size: 14px;
      line-height: 1.55;
    }

    .final-hero-tagline {
      font-size: 14px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.22em;
      color: var(--s-green);
    }

    .final-slide-hero {
      justify-content: center;
      gap: 28px;
    }

    .hero-title-block {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 72rem;
    }

    .hero-title-subline {
      font-size: clamp(26px, 4vw, 44px);
      line-height: 1.05;
      letter-spacing: -0.03em;
      color: var(--s-text);
      font-weight: 600;
    }

    .hero-title-support {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.24em;
      color: var(--s-muted);
    }

    .hero-pill-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
      max-width: 72rem;
    }

    .hero-pill {
      padding: 16px 18px;
      border-radius: 16px;
      border: 1px solid rgba(148, 189, 255, 0.14);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }

    .hero-pill-label {
      margin-bottom: 8px;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: var(--s-muted);
    }

    .hero-pill-text {
      font-size: 15px;
      line-height: 1.45;
      color: var(--s-text);
      font-weight: 700;
    }

    .hero-mission-block {
      max-width: 72rem;
    }

    .hero-question-line {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      max-width: 72rem;
      padding: 16px 18px;
      border-radius: 14px;
      border: 1px solid rgba(92, 167, 255, 0.16);
      background: rgba(3, 7, 12, 0.72);
      color: var(--s-text);
      font-size: 13px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      line-height: 1.7;
    }

    .hero-question-prompt {
      color: var(--s-blue);
      font-weight: 900;
      flex-shrink: 0;
    }

    .hero-quote-card,
    .stakes-summary,
    .callout-block,
    .ontology-summary-panel,
    .proof-card {
      padding: 18px 20px;
      border-radius: 14px;
      border: 1px solid rgba(92, 167, 255, 0.16);
      background: rgba(92, 167, 255, 0.05);
    }

    .final-slide-impact {
      gap: 16px;
    }

    .impact-intro-grid {
      display: grid;
      grid-template-columns: minmax(280px, 0.78fr) minmax(0, 1.22fr);
      gap: 14px;
      align-items: start;
    }

    .impact-intro-copy {
      font-size: 14px;
      line-height: 1.6;
      color: var(--s-text);
      max-width: 36rem;
    }

    .impact-board {
      display: grid;
      gap: 16px;
      padding: 18px 20px;
      border-radius: 16px;
      border: 1px solid rgba(124, 224, 190, 0.16);
      background: linear-gradient(180deg, rgba(124, 224, 190, 0.06), rgba(92, 167, 255, 0.03));
    }

    .impact-board-head {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 14px;
    }

    .impact-board-title {
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.22em;
      color: var(--s-green);
    }

    .impact-board-subtitle {
      max-width: 30rem;
      font-size: 12px;
      line-height: 1.5;
      color: var(--s-muted);
      text-align: right;
    }

    .impact-flow-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 40px minmax(0, 1fr) 40px minmax(0, 1fr);
      gap: 10px 8px;
      align-items: stretch;
    }

    .impact-module-card {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 120px;
      padding: 16px;
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.03);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    }

    .impact-module-card-built {
      border-color: rgba(92, 167, 255, 0.2);
      background: linear-gradient(180deg, rgba(92, 167, 255, 0.12), rgba(92, 167, 255, 0.04));
    }

    .impact-module-card-simulated {
      border-color: rgba(124, 224, 190, 0.2);
      background: linear-gradient(180deg, rgba(124, 224, 190, 0.12), rgba(124, 224, 190, 0.04));
    }

    .impact-module-card-framework {
      border-color: rgba(245, 158, 11, 0.2);
      background: linear-gradient(180deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.04));
    }

    .impact-module-status {
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.18em;
    }

    .impact-module-card-built .impact-module-status {
      color: var(--s-blue);
    }

    .impact-module-card-simulated .impact-module-status {
      color: var(--s-green);
    }

    .impact-module-card-framework .impact-module-status {
      color: var(--s-amber);
    }

    .impact-module-title {
      font-size: 20px;
      line-height: 1.05;
      letter-spacing: -0.03em;
      color: var(--s-text);
      font-weight: 600;
    }

    .impact-module-detail {
      font-size: 13px;
      line-height: 1.55;
      color: var(--s-muted);
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    .impact-flow-arrow,
    .impact-flow-down,
    .impact-flow-spacer {
      display: grid;
      place-items: center;
      min-height: 24px;
    }

    .impact-flow-arrow,
    .impact-flow-down {
      color: var(--s-blue);
      font-size: 26px;
      font-weight: 700;
      opacity: 0.72;
    }

    .impact-honesty-note {
      max-width: 56rem;
      font-size: 11px;
      line-height: 1.55;
      color: var(--s-muted);
      opacity: 0.82;
    }

    .close-summary-grid,
    .close-method-grid {
      display: grid;
      gap: 14px;
    }

    .close-summary-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .close-method-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .close-summary-card,
    .close-method-card,
    .close-answer-card {
      border-radius: 12px;
      border: 1px solid var(--s-border);
      background: rgba(255, 255, 255, 0.03);
    }

    .close-summary-card,
    .close-method-card {
      padding: 16px;
    }

    .close-summary-card {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-height: 124px;
    }

    .close-summary-label-blue {
      color: var(--s-blue);
    }

    .close-summary-label-green {
      color: var(--s-green);
    }

    .close-summary-label-purple {
      color: var(--s-purple);
    }

    .close-summary-label-amber {
      color: var(--s-amber);
    }

    .close-summary-label {
      font-size: 24px;
      font-weight: 300;
      font-family: monospace;
      line-height: 1.15;
    }

    .close-method-tag {
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.16em;
    }

    .close-method-title {
      font-size: 20px;
      line-height: 1.08;
      letter-spacing: -0.03em;
      color: var(--s-text);
      font-weight: 600;
    }

    .close-summary-detail,
    .close-method-body {
      font-size: 12px;
      line-height: 1.6;
      color: var(--s-muted);
    }

    .close-method-card {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 150px;
    }

    .close-method-tag {
      color: var(--s-blue);
    }

    .close-answer-card {
      padding: 18px 20px;
      border-color: rgba(92, 167, 255, 0.16);
      background: rgba(92, 167, 255, 0.05);
      color: var(--s-text);
      font-size: 13px;
      line-height: 1.7;
    }

    .close-summary-note {
      display: inline-flex;
      align-items: center;
      font-size: 11px;
      color: var(--s-muted);
    }

    .hero-quote-card {
      max-width: 58rem;
      font-size: 20px;
      line-height: 1.55;
      color: var(--s-text);
    }

    .hero-quote-card-final {
      max-width: none;
      font-size: 17px;
    }

    .hero-chip-row,
    .layer-items,
    .ontology-model-chip-row,
    .proof-chip-grid,
    .demo-tag-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .architecture-step-items,
    .proof-chip-grid {
      row-gap: 10px;
    }

    .hero-chip,
    .layer-item,
    .close-pillar,
    .proof-chip,
    .architecture-step-item,
    .ontology-model-chip,
    .demo-tag {
      padding: 8px 12px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
      color: var(--s-text);
      font-size: 11px;
      font-weight: 700;
    }

    .architecture-step-item,
    .proof-chip-accent {
      display: inline-flex;
      align-items: center;
      padding: 9px 14px;
      line-height: 1.45;
    }

    .proof-chip-accent,
    .architecture-step-item,
    .ontology-model-chip,
    .demo-tag {
      color: var(--s-green);
    }

    .hero-stack {
      display: grid;
      gap: 1px;
      max-width: 60rem;
      border: 1px solid var(--s-border);
      border-radius: 12px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.03);
    }

    .hero-stack-row {
      display: grid;
      grid-template-columns: 170px 1fr;
      gap: 12px;
      align-items: start;
      padding: 14px 16px;
      background: rgba(5, 11, 18, 0.72);
    }

    .hero-stack-row span,
    .callout-label,
    .proof-label,
    .proof-subtitle,
    .demo-window-kicker,
    .demo-window-metric-label,
    .demo-window-detail-label,
    .process-index,
    .demo-phase-time {
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: var(--s-blue);
    }

    .hero-stack-row strong,
    .callout-body,
    .proof-head,
    .proof-subtitle,
    .final-console-line,
    .demo-console-line {
      color: var(--s-text);
    }

    .process-grid,
    .stakes-grid,
    .layer-grid,
    .process-stage-layout,
    .wave-decision-panel,
    .architecture-pipeline,
    .architecture-proof-grid,
    .ontology-model-grid,
    .domain-grid,
    .future-grid,
    .close-pillars,
    .demo-window-metric-grid,
    .proof-subgrid,
    .inference-branch-grid,
    .callout-strip {
      display: grid;
      gap: 14px;
    }

    .process-grid {
      grid-template-columns: repeat(7, minmax(0, 1fr));
    }

    .process-stage-layout {
      grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
      align-items: start;
      gap: 18px;
    }

    .stakes-grid,
    .ontology-model-grid,
    .future-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .wave-decision-panel {
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
    }

    .layer-grid-4 {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .architecture-pipeline {
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }

    .architecture-proof-grid,
    .proof-subgrid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .inference-branch-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .domain-grid {
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }

    .close-pillars {
      grid-template-columns: repeat(6, minmax(0, 1fr));
    }

    .process-card,
    .stakes-card,
    .layer-card,
    .architecture-step-card,
    .ontology-model-card,
    .domain-card,
    .future-card,
    .inference-branch-card {
      border-radius: 12px;
      border: 1px solid var(--s-border);
      background: rgba(255, 255, 255, 0.03);
      padding: 16px;
    }

    .stakes-card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
    }

    .stakes-card-summary {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--s-muted);
      text-align: right;
    }

    .stakes-status-pill,
    .stakes-coa-pill {
      padding: 6px 9px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      line-height: 1;
    }

    .stakes-coa-pill-max {
      color: var(--s-red);
      border-color: rgba(239, 68, 68, 0.22);
      background: rgba(239, 68, 68, 0.08);
    }

    .stakes-coa-pill-bal {
      color: var(--s-amber);
      border-color: rgba(245, 158, 11, 0.22);
      background: rgba(245, 158, 11, 0.08);
    }

    .stakes-coa-pill-dst {
      color: var(--s-blue);
      border-color: rgba(92, 167, 255, 0.22);
      background: rgba(92, 167, 255, 0.08);
    }

    .stakes-card-coa-max {
      border-color: rgba(239, 68, 68, 0.18);
      background: linear-gradient(180deg, rgba(239, 68, 68, 0.08), rgba(255, 255, 255, 0.02));
    }

    .stakes-card-coa-bal {
      border-color: rgba(245, 158, 11, 0.18);
      background: linear-gradient(180deg, rgba(245, 158, 11, 0.08), rgba(255, 255, 255, 0.02));
    }

    .stakes-card-coa-dst {
      border-color: rgba(92, 167, 255, 0.18);
      background: linear-gradient(180deg, rgba(92, 167, 255, 0.08), rgba(255, 255, 255, 0.02));
    }

    .wave-panel {
      border-radius: 16px;
      border: 1px solid var(--s-border);
      background: rgba(255, 255, 255, 0.03);
      padding: 18px;
      display: grid;
      gap: 16px;
    }

    .wave-timeline {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 28px minmax(0, 1fr) 28px minmax(0, 1fr);
      align-items: center;
      gap: 8px;
    }

    .wave-step {
      padding: 12px 10px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(5, 11, 18, 0.6);
      text-align: center;
      font-size: 12px;
      font-weight: 800;
      color: var(--s-text);
    }

    .wave-step-hot {
      border-color: rgba(239, 68, 68, 0.22);
    }

    .wave-step-future {
      border-color: rgba(124, 224, 190, 0.22);
    }

    .wave-arrow {
      height: 2px;
      background: linear-gradient(90deg, rgba(92, 167, 255, 0.28), rgba(124, 224, 190, 0.28));
      position: relative;
    }

    .wave-arrow::after {
      content: '';
      position: absolute;
      top: 50%;
      right: -1px;
      width: 8px;
      height: 8px;
      border-top: 2px solid rgba(124, 224, 190, 0.45);
      border-right: 2px solid rgba(124, 224, 190, 0.45);
      transform: translateY(-50%) rotate(45deg);
    }

    .readiness-block {
      display: grid;
      gap: 10px;
    }

    .readiness-label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-size: 11px;
      font-weight: 800;
      color: var(--s-text);
    }

    .readiness-label {
      color: var(--s-muted);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 10px;
    }

    .readiness-value {
      color: #ffb3b3;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }

    .readiness-meter {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
    }

    .readiness-segment {
      height: 16px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
    }

    .readiness-segment-red {
      background: linear-gradient(90deg, rgba(239, 68, 68, 0.88), rgba(245, 158, 11, 0.66));
      border-color: rgba(239, 68, 68, 0.16);
    }

    .readiness-segment-amber {
      background: linear-gradient(90deg, rgba(245, 158, 11, 0.84), rgba(245, 158, 11, 0.54));
      border-color: rgba(245, 158, 11, 0.16);
    }

    .readiness-segment-empty {
      background: rgba(255, 255, 255, 0.03);
    }

    .readiness-caption,
    .contrast-copy {
      font-size: 13px;
      line-height: 1.75;
      color: var(--s-muted);
    }

    .contrast-columns {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .contrast-column {
      padding: 14px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(5, 11, 18, 0.56);
      display: grid;
      gap: 8px;
    }

    .contrast-column-strong {
      border-color: rgba(124, 224, 190, 0.16);
      background: rgba(124, 224, 190, 0.05);
    }

    .contrast-title {
      font-size: 15px;
      font-weight: 800;
      color: var(--s-text);
    }

    .process-flow-panel,
    .process-map-panel {
      position: relative;
      border-radius: 16px;
      border: 1px solid var(--s-border);
      background: rgba(255, 255, 255, 0.03);
      padding: 18px;
      overflow: hidden;
    }

    .process-flow-panel {
      background:
        linear-gradient(180deg, rgba(92, 167, 255, 0.05), rgba(92, 167, 255, 0.01)),
        rgba(255, 255, 255, 0.03);
    }

    .process-friction-cloud {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      margin-left: auto;
      margin-bottom: 14px;
      padding: 8px 12px;
      border-radius: 999px;
      border: 1px solid rgba(239, 68, 68, 0.18);
      background: rgba(239, 68, 68, 0.08);
      color: #ffb3b3;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      box-shadow: 0 12px 30px rgba(239, 68, 68, 0.08);
    }

    .process-flow-list {
      display: grid;
      gap: 10px;
    }

    .process-flow-node-wrap {
      display: grid;
      gap: 8px;
    }

    .process-flow-node {
      display: grid;
      grid-template-columns: 64px minmax(0, 1fr);
      gap: 14px;
      align-items: center;
      padding: 14px;
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(5, 11, 18, 0.46);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
    }

    .process-stage-icon {
      position: relative;
      width: 56px;
      height: 56px;
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(10, 18, 28, 0.9);
      overflow: hidden;
    }

    .process-stage-icon-sensor {
      border-color: rgba(92, 167, 255, 0.28);
      box-shadow: inset 0 0 20px rgba(92, 167, 255, 0.12);
    }

    .process-stage-icon-rap {
      border-color: rgba(92, 167, 255, 0.2);
    }

    .process-stage-icon-intent {
      border-color: rgba(155, 140, 255, 0.24);
    }

    .process-stage-icon-coa {
      border-color: rgba(92, 167, 255, 0.22);
    }

    .process-stage-icon-recommendation {
      border-color: rgba(245, 158, 11, 0.24);
    }

    .process-stage-icon-readiness {
      border-color: rgba(124, 224, 190, 0.24);
    }

    .process-stage-icon-commit {
      border-color: rgba(124, 224, 190, 0.24);
    }

    .icon-radar-ring,
    .icon-radar-core,
    .icon-map-grid,
    .icon-map-point,
    .icon-bar,
    .icon-card,
    .icon-panel,
    .icon-panel-line,
    .icon-gauge-shell,
    .icon-gauge-fill,
    .icon-check-stem,
    .icon-check-kick {
      position: absolute;
      display: block;
    }

    .icon-radar-ring {
      inset: 11px;
      border-radius: 50%;
      border: 2px solid rgba(92, 167, 255, 0.85);
      box-shadow: 0 0 16px rgba(92, 167, 255, 0.16);
    }

    .icon-radar-core {
      top: 24px;
      left: 24px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #5ca7ff;
    }

    .icon-map-grid {
      inset: 10px;
      border-radius: 10px;
      border: 1px solid rgba(92, 167, 255, 0.28);
      background:
        linear-gradient(rgba(92, 167, 255, 0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(92, 167, 255, 0.1) 1px, transparent 1px);
      background-size: 10px 10px;
    }

    .icon-map-point {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #7ce0be;
      box-shadow: 0 0 10px rgba(124, 224, 190, 0.25);
    }

    .icon-map-point-a { top: 15px; left: 18px; }
    .icon-map-point-b { top: 24px; left: 31px; background: #5ca7ff; }
    .icon-map-point-c { top: 36px; left: 22px; background: #ef4444; }

    .icon-bar {
      bottom: 11px;
      width: 8px;
      border-radius: 999px 999px 3px 3px;
      background: linear-gradient(180deg, rgba(155, 140, 255, 0.95), rgba(92, 167, 255, 0.55));
    }

    .icon-bar-1 { left: 14px; height: 16px; }
    .icon-bar-2 { left: 24px; height: 24px; }
    .icon-bar-3 { left: 34px; height: 32px; }

    .icon-card {
      width: 14px;
      height: 20px;
      border-radius: 5px;
      border: 1px solid rgba(92, 167, 255, 0.28);
      background: rgba(92, 167, 255, 0.16);
    }

    .icon-card-a { top: 18px; left: 11px; }
    .icon-card-b { top: 14px; left: 21px; background: rgba(124, 224, 190, 0.16); }
    .icon-card-c { top: 18px; left: 31px; }

    .icon-panel {
      inset: 12px 10px;
      border-radius: 8px;
      border: 1px solid rgba(245, 158, 11, 0.32);
      background: rgba(245, 158, 11, 0.14);
    }

    .icon-panel-line {
      left: 16px;
      height: 3px;
      border-radius: 999px;
      background: rgba(255, 226, 168, 0.85);
    }

    .icon-panel-line-a { top: 22px; width: 18px; }
    .icon-panel-line-b { top: 30px; width: 12px; }

    .icon-gauge-shell {
      left: 10px;
      right: 10px;
      bottom: 14px;
      height: 16px;
      border-radius: 999px;
      border: 1px solid rgba(124, 224, 190, 0.28);
    }

    .icon-gauge-fill {
      left: 14px;
      bottom: 18px;
      width: 26px;
      height: 8px;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(124, 224, 190, 0.95), rgba(92, 167, 255, 0.6));
    }

    .icon-check-stem {
      width: 4px;
      height: 16px;
      left: 24px;
      top: 24px;
      background: #7ce0be;
      transform: rotate(45deg);
      border-radius: 999px;
    }

    .icon-check-kick {
      width: 4px;
      height: 28px;
      left: 32px;
      top: 15px;
      background: #7ce0be;
      transform: rotate(-45deg);
      border-radius: 999px;
    }

    .process-flow-copy {
      display: grid;
      gap: 6px;
    }

    .process-flow-connector {
      display: grid;
      justify-items: center;
      gap: 4px;
      min-height: 22px;
    }

    .process-flow-line {
      width: 2px;
      height: 14px;
      border-radius: 999px;
      background: linear-gradient(180deg, rgba(92, 167, 255, 0.5), rgba(124, 224, 190, 0.18));
    }

    .process-flow-arrow {
      width: 10px;
      height: 10px;
      border-right: 2px solid rgba(92, 167, 255, 0.7);
      border-bottom: 2px solid rgba(92, 167, 255, 0.7);
      transform: rotate(45deg);
    }

    .process-map-head {
      display: grid;
      gap: 6px;
      margin-bottom: 14px;
    }

    .process-map-kicker {
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: var(--s-muted);
    }

    .process-map-title {
      font-size: 16px;
      font-weight: 800;
      color: var(--s-text);
    }

    .process-mini-map {
      position: relative;
      height: 360px;
      border-radius: 14px;
      border: 1px solid rgba(92, 167, 255, 0.14);
      background:
        radial-gradient(circle at 74% 76%, rgba(245, 158, 11, 0.12), transparent 18%),
        linear-gradient(rgba(92, 167, 255, 0.06) 1px, transparent 1px),
        linear-gradient(90deg, rgba(92, 167, 255, 0.06) 1px, transparent 1px),
        rgba(5, 11, 18, 0.78);
      background-size: auto, 46px 46px, 46px 46px, auto;
      overflow: hidden;
    }

    .process-mini-map-grid {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 20% 22%, rgba(92, 167, 255, 0.08), transparent 24%);
    }

    .process-mini-map-base-ring {
      position: absolute;
      right: 58px;
      bottom: 64px;
      width: 86px;
      height: 86px;
      border-radius: 50%;
      border: 1px dashed rgba(245, 158, 11, 0.45);
    }

    .process-mini-map-base {
      position: absolute;
      right: 88px;
      bottom: 94px;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: rgba(245, 158, 11, 0.18);
      border: 2px solid rgba(245, 158, 11, 0.9);
      box-shadow: 0 0 18px rgba(245, 158, 11, 0.18);
    }

    .process-mini-map-base-label {
      position: absolute;
      right: 42px;
      bottom: 72px;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #ffd27a;
    }

    .process-mini-map-track {
      position: absolute;
      height: 2px;
      transform-origin: left center;
      background: linear-gradient(90deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.8));
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.08);
    }

    .process-mini-map-track-a {
      width: 210px;
      top: 76px;
      left: 78px;
      transform: rotate(28deg);
    }

    .process-mini-map-track-b {
      width: 190px;
      top: 142px;
      left: 72px;
      transform: rotate(14deg);
    }

    .process-mini-map-track-c {
      width: 176px;
      top: 220px;
      left: 96px;
      transform: rotate(-5deg);
    }

    .process-mini-map-node {
      position: absolute;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ef4444;
      box-shadow: 0 0 14px rgba(239, 68, 68, 0.22);
    }

    .process-mini-map-node-a { top: 70px; left: 76px; }
    .process-mini-map-node-b { top: 138px; left: 70px; }
    .process-mini-map-node-c { top: 216px; left: 94px; }

    .process-mini-map-sensor {
      position: absolute;
      border-radius: 50%;
      border: 1px dashed rgba(92, 167, 255, 0.26);
    }

    .process-mini-map-sensor-a {
      width: 118px;
      height: 118px;
      top: 44px;
      left: 136px;
    }

    .process-mini-map-sensor-b {
      width: 84px;
      height: 84px;
      top: 184px;
      left: 170px;
    }

    .process-map-legend {
      display: grid;
      gap: 8px;
      margin-top: 14px;
      font-size: 11px;
      color: var(--s-muted);
    }

    .process-map-legend-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .process-map-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .process-map-dot-blue { background: #5ca7ff; box-shadow: 0 0 8px rgba(92, 167, 255, 0.24); }
    .process-map-dot-red { background: #ef4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.24); }
    .process-map-dot-amber { background: #f59e0b; box-shadow: 0 0 8px rgba(245, 158, 11, 0.24); }

    .process-label,
    .stakes-card-title,
    .layer-card-title,
    .architecture-step-title,
    .ontology-model-title,
    .domain-card-title,
    .proof-head,
    .inference-branch-title,
    .demo-window-head,
    .demo-phase-label {
      font-size: 13px;
      font-weight: 800;
      color: var(--s-text);
    }

    .process-description,
    .stakes-card-body,
    .layer-card-summary,
    .architecture-step-description,
    .ontology-model-lead,
    .domain-card-body,
    .future-card,
    .proof-subtitle,
    .inference-branch-copy,
    .demo-window-text,
    .demo-phase-summary,
    .demo-window-metric-detail,
    .demo-window-detail-value {
      font-size: 13px;
      line-height: 1.75;
      color: var(--s-muted);
    }

    .layer-rail {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      padding: 10px 12px;
      border-radius: 999px;
      border: 1px solid rgba(92, 167, 255, 0.16);
      background: rgba(92, 167, 255, 0.04);
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: var(--s-muted);
      text-align: center;
    }

    .inference-root {
      margin: 14px 0;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid rgba(124, 224, 190, 0.16);
      background: rgba(124, 224, 190, 0.05);
      color: var(--s-text);
      font-size: 13px;
      font-weight: 700;
    }

    .inference-branch-copy strong {
      color: var(--s-text);
    }

    .inference-branch-copy-strong {
      color: var(--s-green);
    }

    .callout-strip-single {
      grid-template-columns: 1fr;
    }

    .final-console-frame {
      display: block;
    }

    .final-console-shell,
    .demo-console-shell {
      display: grid;
      gap: 8px;
      padding: 4px 0;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }

    .final-console-line,
    .demo-console-line {
      padding: 8px 10px;
      border-radius: 10px;
      background: rgba(5, 11, 18, 0.7);
      border: 1px solid rgba(92, 167, 255, 0.1);
      font-size: 11px;
      line-height: 1.6;
    }

    .final-slide-demo {
      gap: 18px;
    }

    .final-slide-demo-map {
      padding-bottom: 84px;
    }

    .demo-map-stage {
      flex: 1;
      min-height: 0;
      display: flex;
    }

    .demo-map-shell {
      position: relative;
      flex: 1;
      min-height: 680px;
      border-radius: 18px;
      overflow: hidden;
      border: 1px solid rgba(148, 189, 255, 0.14);
      background: rgba(7, 14, 23, 0.82);
      box-shadow: 0 24px 70px rgba(0, 0, 0, 0.45);
    }

    .demo-map-background {
      display: block;
      width: 100%;
      height: 100%;
    }

    :host ::ng-deep .demo-map-background app-window-frame,
    :host ::ng-deep .demo-map-background app-tactical-recommendations {
      display: none !important;
    }

    .demo-map-vignette {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        linear-gradient(180deg, rgba(5, 11, 18, 0.18), rgba(5, 11, 18, 0.04) 24%, rgba(5, 11, 18, 0.16)),
        radial-gradient(circle at center, transparent 48%, rgba(5, 11, 18, 0.28));
      z-index: 2;
    }

    .demo-window {
      display: block;
      position: absolute;
      z-index: 5;
      max-width: min(calc(100% - 24px), 400px);
    }

    .demo-window-shift {
      top: 16px;
      right: 16px;
    }

    .demo-window-validation {
      top: 254px;
      right: 16px;
    }

    .demo-window-flow {
      left: 16px;
      bottom: 16px;
    }

    .demo-window-recommendation {
      right: 16px;
      bottom: 16px;
    }

    .demo-window-copy {
      width: 280px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .demo-window-copy-wide {
      width: 340px;
    }

    .demo-window-head-large {
      font-size: 20px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .demo-window-text-accent {
      color: var(--s-text);
    }

    .demo-phase-list {
      width: 360px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 280px;
      overflow-y: auto;
    }

    .demo-phase-button {
      display: flex;
      flex-direction: column;
      gap: 4px;
      text-align: left;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(255, 255, 255, 0.03);
      color: inherit;
      cursor: pointer;
      transition: all 0.2s;
    }

    .demo-phase-button:hover,
    .demo-phase-button-active {
      border-color: rgba(92, 167, 255, 0.34);
      background: rgba(92, 167, 255, 0.08);
    }

    .demo-window-metric-grid {
      width: 340px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .demo-window-metric-card,
    .demo-window-detail-card {
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(255, 255, 255, 0.03);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .demo-window-metric-value {
      font-size: 18px;
      line-height: 1;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      color: var(--s-text);
    }

    .demo-window-detail-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    .demo-window-detail-card-full {
      grid-column: 1 / -1;
    }

    .future-card {
      min-height: 110px;
    }

    .final-slide-close {
      gap: 20px;
    }

    .final-cta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .final-nav {
      position: fixed;
      left: 50%;
      bottom: 16px;
      transform: translateX(-50%);
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 16px;
      border-radius: 999px;
      border: 1px solid var(--s-border);
      background: rgba(7, 14, 23, 0.9);
      backdrop-filter: blur(12px);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
    }

    .final-nav-arrow {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 1px solid var(--s-border);
      background: transparent;
      color: var(--s-muted);
      font-size: 20px;
      cursor: pointer;
    }

    .final-nav-arrow:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .final-nav-dots {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .final-nav-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      border: none;
      background: rgba(156, 176, 199, 0.25);
      cursor: pointer;
    }

    .final-nav-dot-active {
      width: 24px;
      border-radius: 999px;
      background: var(--s-blue);
    }

    .final-slide-counter {
      position: fixed;
      left: 24px;
      bottom: 24px;
      z-index: 10;
      padding: 5px 10px;
      border-radius: 999px;
      border: 1px solid var(--s-border);
      background: rgba(7, 14, 23, 0.8);
      color: var(--s-muted);
      font-size: 10px;
      font-weight: 700;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }

    @media (max-width: 1500px) {
      .process-grid,
      .architecture-pipeline {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .process-stage-layout {
        grid-template-columns: minmax(0, 1fr) 360px;
      }

      .hero-pill-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .layer-grid-4,
      .domain-grid,
      .inference-branch-grid,
      .close-summary-grid,
      .close-method-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 1180px) {
      .final-slide {
        padding: 28px 24px 110px;
      }

      .impact-intro-grid,
      .impact-flow-grid {
        grid-template-columns: 1fr;
      }

      .close-summary-grid,
      .close-method-grid {
        grid-template-columns: 1fr;
      }

      .impact-board-head {
        align-items: start;
        flex-direction: column;
      }

      .impact-board-subtitle {
        text-align: left;
      }

      .impact-flow-arrow,
      .impact-flow-down,
      .impact-flow-spacer {
        display: none;
      }

      .stakes-grid,
      .ontology-model-grid,
      .future-grid,
      .domain-grid,
      .callout-strip,
      .process-stage-layout,
      .wave-decision-panel,
      .architecture-proof-grid,
      .proof-subgrid,
      .layer-grid-4,
      .inference-branch-grid {
        grid-template-columns: 1fr;
      }

      .process-grid,
      .architecture-pipeline,
      .close-pillars {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .process-flow-node {
        grid-template-columns: 56px minmax(0, 1fr);
      }

      .hero-pill-grid {
        grid-template-columns: 1fr;
      }

      .contrast-columns {
        grid-template-columns: 1fr;
      }

      .layer-rail {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        border-radius: 16px;
      }

      .hero-stack-row {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 720px) {
      .final-showcase-header {
        padding: 14px 16px;
      }

      .final-header-actions {
        justify-content: flex-end;
      }

      .final-slide {
        padding: 24px 16px 112px;
      }

      .impact-module-title {
        font-size: 18px;
      }

      .impact-board,
      .proof-card {
        padding: 16px;
      }

      .process-grid,
      .architecture-pipeline,
      .close-pillars {
        grid-template-columns: 1fr;
      }

      .wave-timeline {
        grid-template-columns: 1fr;
      }

      .wave-arrow {
        width: 2px;
        height: 18px;
        margin: 0 auto;
      }

      .wave-arrow::after {
        top: auto;
        bottom: -1px;
        left: 50%;
        right: auto;
        transform: translateX(-50%) rotate(135deg);
      }

      .process-flow-node {
        grid-template-columns: 1fr;
      }

      .process-stage-icon {
        width: 52px;
        height: 52px;
      }

      .process-friction-cloud {
        margin-left: 0;
      }

      .process-mini-map {
        height: 300px;
      }

      .hero-title-support {
        letter-spacing: 0.16em;
      }

      .demo-map-shell {
        min-height: 1240px;
      }

      .demo-window {
        transform: none;
        max-width: calc(100% - 24px);
      }

      .demo-window-shift,
      .demo-window-validation,
      .demo-window-flow,
      .demo-window-recommendation {
        left: 12px;
        right: auto;
      }

      .demo-window-shift {
        top: 12px;
      }

      .demo-window-validation {
        top: 272px;
      }

      .demo-window-flow {
        top: 592px;
        bottom: auto;
      }

      .demo-window-recommendation {
        top: 834px;
        left: 12px;
      }

      .demo-window-copy,
      .demo-window-copy-wide,
      .demo-phase-list,
      .demo-window-metric-grid {
        width: min(280px, calc(100vw - 72px));
      }

      .demo-window-metric-grid,
      .demo-window-detail-grid {
        grid-template-columns: 1fr;
      }

      .final-nav {
        width: calc(100vw - 24px);
        justify-content: center;
      }

      .final-slide-counter {
        left: 12px;
        bottom: 72px;
      }
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(12px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `],
})
export class FinalShowcase {
  private api = inject(SteelApiService);
  private scenario = inject(ScenarioStore);
  private policy = inject(PolicyStore);

  readonly slides = FINAL_SLIDES;
  readonly processSteps = PROCESS_STEPS;
  readonly failureCards = COA_FAILURE_CARDS;
  readonly layerCards = LAYER_CARDS;
  readonly architectureSteps = ARCHITECTURE_PIPELINE_STEPS;
  readonly inferenceBranches = INFERENCE_BRANCHES;
  readonly architectureSurfaces = ARCHITECTURE_SURFACES;
  readonly architectureServices = ARCHITECTURE_SERVICES;
  readonly demoSteps = DEMO_STEPS;
  readonly impactFoundations = IMPACT_FOUNDATIONS;
  readonly impactTopModules = IMPACT_TOP_MODULES;
  readonly impactBottomModules = IMPACT_BOTTOM_MODULES;
  readonly impactHonestyNote = IMPACT_HONESTY_NOTE;
  readonly domainCards = DOMAIN_CARDS;
  readonly ontologyModelGroups = ONTOLOGY_MODEL_GROUPS;
  readonly closeSummaryStats = CLOSE_SUMMARY_STATS;
  readonly closeMethods = CLOSE_METHODS;
  readonly closeAnswer = CLOSE_ANSWER;

  readonly currentSlide = signal(0);
  readonly activeDemoStep = signal<DemoStep['id']>('reset');
  readonly demoStatus = signal('Redo för Ghost Feint-demot.');
  readonly activeSlideId = computed(() => this.slides[this.currentSlide()].id);
  readonly presentationPhase = computed(() => {
    const slideIndex = this.currentSlide();

    if (slideIndex <= 4) {
      return '00:00-03:00 Presentation';
    }

    if (slideIndex === 5) {
      return '03:00-05:00 Live Demo';
    }

    return '05:00-07:00 Presentation';
  });
  readonly demoSummary = computed(() => DEMO_SUMMARIES[this.activeDemoStep()]);
  readonly demoDecision = computed(() => DEMO_DECISIONS[this.activeDemoStep()]);
  readonly consoleTitle = computed(() => {
    if (this.activeSlideId() === 'demo') {
      return 'Live trace / Ghost Feint';
    }

    return STATIC_CONSOLES[this.activeSlideId()]?.title ?? 'Decision Trace';
  });
  readonly consoleLines = computed(() => {
    if (this.activeSlideId() === 'demo') {
      return DEMO_CONSOLES[this.activeDemoStep()];
    }

    return STATIC_CONSOLES[this.activeSlideId()]?.lines ?? [];
  });

  goTo(index: number): void {
    if (index < 0 || index >= this.slides.length) return;
    this.currentSlide.set(index);
  }

  next(): void {
    if (this.currentSlide() < this.slides.length - 1) {
      this.currentSlide.update((value) => value + 1);
    }
  }

  prev(): void {
    if (this.currentSlide() > 0) {
      this.currentSlide.update((value) => value - 1);
    }
  }

  onKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight' || event.key === ' ') {
      event.preventDefault();
      this.next();
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.prev();
    }
  }

  runDemoStep(stepId: DemoStep['id']): void {
    this.activeDemoStep.set(stepId);

    switch (stepId) {
      case 'reset':
        this.resetBaseline();
        break;
      case 'feint':
        this.loadGhostFeint();
        break;
      case 'balanced':
        this.solveBalanced();
        break;
      case 'jamming':
        this.enableJamming();
        break;
      case 'redirect':
        this.redirectToStrike();
        break;
      case 'max':
        this.solveMaxProtection();
        break;
    }
  }

  private resetBaseline(): void {
    this.scenario.reset();
    this.scenario.setPhase('phase-1');
    this.scenario.setJamming(false);
    this.policy.updateWeights({ safety: 0.7, sustainability: 0.5, resilience: 0.6 });
    this.api.setJamming(false, 0).subscribe({ error: () => undefined });
    this.api.resetScenario().subscribe({
      next: () => this.demoStatus.set('Baseline återställd. Theater state är ren och redo för Ghost Feint.'),
      error: () => this.demoStatus.set('Baseline lokalt återställd. API svarade inte, men kartläget kan fortfarande användas.'),
    });
  }

  private loadGhostFeint(): void {
    this.scenario.setPhase('phase-2');
    this.scenario.setScenarioName('Ghost Feint');
    this.policy.updateWeights({ safety: 0.5, sustainability: 0.6, resilience: 0.6 });
    this.api.loadScenario('ghost-feint').subscribe({
      next: () => this.demoStatus.set('Ghost Feint laddad. Probe/feint-läsning med låg initial threat value är aktiv.'),
      error: () => this.demoStatus.set('Ghost Feint kunde inte laddas från API. Befintlig theater state visas kvar som fallback.'),
    });
  }

  private solveBalanced(): void {
    this.policy.updateWeights({ safety: 0.5, sustainability: 0.7, resilience: 0.6 });
    this.policy.triggerSolve();
    this.demoStatus.set('COA-BAL lyfts fram: håll igen, bevara interceptors och skydda readiness för nästa våg.');
  }

  private enableJamming(): void {
    this.scenario.setJamming(true);
    this.api.setJamming(true, 0.7).subscribe({
      next: () => this.demoStatus.set('Heavy jamming aktiv. Sensor quality och confidence är nu degraderade.'),
      error: () => this.demoStatus.set('Jamming kunde inte injiceras via API. Osäkerhetsläget får beskrivas från befintlig state.'),
    });
  }

  private redirectToStrike(): void {
    this.scenario.setPhase('phase-3');
    this.api.redirectTracks({ velocity: 450, targetId: 'BASE-2' }).subscribe({
      next: () => this.demoStatus.set('Spåren omdirigerade mot Highridge Command. Intent shift mot strike är nu showcase-punkten.'),
      error: () => this.demoStatus.set('Redirect misslyckades via API. Använd ändå before/after-tabellen för att berätta intent-skiftet.'),
    });
  }

  private solveMaxProtection(): void {
    this.policy.updateWeights({ safety: 1.0, sustainability: 0.3, resilience: 0.6 });
    this.policy.triggerSolve();
    this.demoStatus.set('MAX_PROTECTION framhävs: samma system som höll igen rekommenderar nu full engagement.');
  }
}
