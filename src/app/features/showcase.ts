import {
  Component, ChangeDetectionStrategy, signal, computed,
  OnInit, OnDestroy, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { KnowledgeGraphViewerComponent } from '../shared/ui/knowledge-graph-viewer/knowledge-graph-viewer.component';

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
];

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
    why: 'Gör osäkerhet handlingsbar och låter operatören förstå valet.',
  },
  {
    id: 'domain-2',
    title: 'Taktisk lägesbild',
    summary: 'Tracks, intent och sensorfusion i realtid.',
    why: 'Ger samma bild av hotet som operatören behöver för att agera.',
  },
  {
    id: 'domain-3',
    title: 'Logistik & uthållighet',
    summary: 'Supply nodes, corridors och reinforcements.',
    why: 'Håller nästa våg möjlig genom att visa vad som kan upprätthållas.',
  },
  {
    id: 'domain-4',
    title: 'Operatörsytor',
    summary: 'Command surfaces, field view och governance UI.',
    why: 'Gör att människan kan förstå, justera och godkänna beslutet.',
  },
  {
    id: 'domain-5',
    title: 'Infrastruktur',
    summary: 'State, SSR, transport och API-seams.',
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

const SLIDE_PREVIEW_COPY: SlidePreviewCopy[] = [
  {
    lead: 'Vad sliden visar',
    detail: 'Målet, användaren och den verksamhetskritiska frågan i en enda vy.',
    bullets: ['Vem som leder beslutet', 'Varför nästa våg avgör', 'Vad Steel försöker bevisa'],
  },
  {
    lead: 'Operatörens flöde',
    detail: 'En minutlång scenariodemo där kartan växlar mellan angrepp, interception och supply lines.',
    bullets: ['Klicka spår och objekt', 'Spola tiden framåt', 'Se när ett beslut måste tas'],
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
    detail: 'Grafen binder samman ytorna så att man kan följa ett system från policy till demo och tillbaka.',
    bullets: ['Hur delarna hänger ihop', 'Vilka ytor som blir möjliga', 'Varför unification är nyckeln'],
  },
  {
    lead: 'Svar på frågan',
    detail: 'Steel visar den mest intressanta delen av en komplett lösning, precis det kickoffen bad om.',
    bullets: ['Användarmål', 'Verksamhetskritisk påverkan', 'Oundvikliga aktiviteter + bättre stöd'],
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
    subtitle: 'Steel visar den mest intressanta delen av en komplett lösning, precis som kickoffen bad om',
  },
];

// ─── Map scenario data ────────────────────────────────────────────────────────

interface MapTrack { id: string; x: number; y: number; tx: number; ty: number; type: 'missile' | 'ship' | 'air'; }
interface AnimatedTrack extends MapTrack { cx: number; cy: number; }
interface DemoCue { scenarioIndex: number; trackId: string; }
interface TrackFact { label: string; value: string; }
interface ScenarioStory {
  title: string;
  lead: string;
  detail: string;
  decision: string;
}

const DEMO_CUES: DemoCue[] = [
  { scenarioIndex: 0, trackId: 'N1' },
  { scenarioIndex: 1, trackId: 'M2' },
  { scenarioIndex: 2, trackId: 'S2' },
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
    detail: 'Data om last, corridor, resume-rate och runway pressure gör att ett beslut måste tas tidigt, inte efter att linjen brutits.',
    decision: 'Skydda supply line nu, eller bevara stridsförmåga för ett bättre läge senare?',
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

@Component({
  selector: 'app-showcase',
  standalone: true,
  imports: [CommonModule, RouterLink, KnowledgeGraphViewerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="showcase-shell" [class]="'slide-' + currentSlide()" (keydown)="onKey($event)" tabindex="0">

  <!-- ── Background gradient ───────────────────────────────────────── -->
  <div class="showcase-bg"></div>

  <!-- ── Header bar ────────────────────────────────────────────────── -->
  <header class="showcase-header">
    <div class="flex items-center gap-3">
      <div class="showcase-logo">S</div>
      <div class="flex flex-col">
        <span class="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--s-muted)]">Saab Smart Stridsledning</span>
        <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--s-text)]">Boreal Decision Twin</span>
      </div>
    </div>
    <div class="flex items-center gap-4">
      <span class="text-[9px] font-mono text-[var(--s-muted)] uppercase tracking-widest">Hackathon Demo · 2025</span>
      <a routerLink="/" class="showcase-exit-btn">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        Stäng
      </a>
    </div>
  </header>

  <!-- ── Slide area ─────────────────────────────────────────────────── -->
  <main class="showcase-main">

    <!-- SLIDE 0: VÄLKOMMEN ─────────────────────────────────────────── -->
    @if (currentSlide() === 0) {
    <div class="slide slide-welcome animate-in">
      <div class="slide-welcome-inner">
        <div class="slide-eyebrow">{{ slides[0].eyebrow }}</div>
        <h1 class="slide-hero-title">{{ slides[0].title }}</h1>
        <p class="slide-hero-sub">{{ slides[0].subtitle }}</p>

        <div class="welcome-chips">
          <div class="w-chip"><span class="w-chip-dot blue"></span>Sensorfusion måste bli RAP, inte bara en vy</div>
          <div class="w-chip"><span class="w-chip-dot green"></span>Resursallokering måste ta nästa våg i beräkning</div>
          <div class="w-chip"><span class="w-chip-dot purple"></span>Uthållighet måste skyddas när hoten eskalerar</div>
        </div>

        <div class="welcome-stack">
          <div class="stack-row">
            <span class="stack-label">Användare</span>
            <span class="stack-value">Luftbevakare, flygstridsledare och command authority</span>
          </div>
          <div class="stack-row">
            <span class="stack-label">Problem</span>
            <span class="stack-value">Fatta rätt beslut under sekundnivå-friktion och osäkerhet</span>
          </div>
          <div class="stack-row">
            <span class="stack-label">Metod</span>
            <span class="stack-value">Policy, robusthet och ontologi i ett delat theater state</span>
          </div>
          <div class="stack-row">
            <span class="stack-label">Mål</span>
            <span class="stack-value">Nästa våg ska fortfarande kunna mötas med styrka kvar</span>
          </div>
        </div>
      </div>
    </div>
    }

    <!-- SLIDE 1: BOREALIS SUND MAP ─────────────────────────────────── -->
    @if (currentSlide() === 1) {
    <div class="slide slide-map animate-in">
      <div class="slide-split">
        <div class="slide-left-panel">
          <div class="slide-eyebrow">{{ slides[1].eyebrow }}</div>
          <h2 class="slide-title">{{ slides[1].title }}</h2>
          <p class="slide-sub">{{ slides[1].subtitle }}</p>

          <div class="scenario-story">
            <div class="scenario-story-kicker">{{ currentScenarioStory().lead }}</div>
            <div class="scenario-story-detail">{{ currentScenarioStory().detail }}</div>
            <div class="scenario-story-decision">Beslutspunkt: {{ currentScenarioStory().decision }}</div>
          </div>

          <div class="board-features">
            @for (step of operatorSteps; track step.id) {
              <div class="board-feat">
                <div class="feat-icon">{{ step.tag }}</div>
                <div class="feat-text">
                  <div class="feat-title">{{ step.title }}</div>
                  <div class="feat-sub">{{ step.body }}</div>
                </div>
              </div>
            }
          </div>

          <div class="scenario-tabs">
            @for (s of scenarioLabels; track $index) {
              <button class="s-tab" [class.active]="mapScenario() === $index" (click)="selectScenario($index)">
                <span class="s-tab-num">{{ $index + 1 }}</span>
                <span class="s-tab-label">{{ s }}</span>
              </button>
            }
          </div>

          <div class="map-legend">
            <div class="legend-row"><span class="legend-dot blue"></span> Egna styrkor och egna baser</div>
            <div class="legend-row"><span class="legend-dot red"></span> Hotsignatur och inkommande tryck</div>
            <div class="legend-row"><span class="legend-dot amber"></span> Sensor- och intressezoner</div>
            <div class="legend-row"><span class="legend-dot white"></span> Lägesbilden som ska bli RAP</div>
          </div>

          <div class="map-stats">
            <div class="stat"><span class="stat-v">{{ animatedTracks().length }}</span><span class="stat-l">Spår i den aktuella vågen</span></div>
            <div class="stat">
              <span class="stat-v" [class.stat-g]="!intercepting()" [class.stat-r]="intercepting()">{{ intercepting() ? 'HOLD' : '0.81' }}</span>
              <span class="stat-l">{{ intercepting() ? 'Skyddad beredskap' : 'Beslutssäkerhet' }}</span>
            </div>
            <div class="stat"><span class="stat-v stat-a">127ms</span><span class="stat-l">Svarstid till operatören</span></div>
          </div>
          <div class="map-phase-bar">
            <div class="map-phase-label" [class.phase-intercept]="intercepting()">
              {{ intercepting() ? '⬡ RESERV SKYDDAS' : '→ RAP BYGGS' }}
            </div>
            <div class="phase-bar-track">
              <div class="phase-bar-fill" [style.width]="(trackProgress() * 100) + '%'" [class.phase-fill-intercept]="intercepting()"></div>
            </div>
          </div>

          @if (selectedScenarioTrack(); as selectedTrack) {
            <div class="board-feat">
              <div class="feat-icon">◉</div>
              <div class="feat-text">
                <div class="feat-title">{{ selectedTrack.id }} · {{ selectedTrack.type.toUpperCase() }}</div>
                <div class="feat-sub">{{ trackSummary(selectedTrack) }}</div>
                <div class="feat-sub">{{ scenarioLabels[mapScenario()] }}</div>
              </div>
            </div>
            <div class="track-facts">
              @for (fact of trackFacts(selectedTrack); track fact.label) {
                <div class="track-fact">
                  <span class="track-fact-label">{{ fact.label }}</span>
                  <span class="track-fact-value">{{ fact.value }}</span>
                </div>
              }
            </div>
          }

          <div class="timeline-control">
            <div class="timeline-top">
              <button class="s-tab" type="button" (click)="toggleTrackPlayback()">
                <span class="s-tab-num">{{ trackPlaying() ? 'II' : '▶' }}</span>
                <span class="s-tab-label">{{ trackPlaying() ? 'Pausa demo' : 'Spela demo' }}</span>
              </button>
              <span class="timeline-label">Demo {{ (trackProgress() * 100) | number:'1.0-0' }}%</span>
            </div>
            <input
              class="timeline-slider"
              type="range"
              min="0"
              max="100"
              [value]="trackProgress() * 100"
              (input)="onTrackScrub($event)"
            />
          </div>
        </div>

        <!-- SVG map -->
        <div class="map-container">
          <svg viewBox="0 0 1670 1300" preserveAspectRatio="xMidYMid slice" class="map-svg" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="sc-glow-r"><feGaussianBlur stdDeviation="3" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
              <filter id="sc-glow-b"><feGaussianBlur stdDeviation="2" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
            </defs>

            <!-- Grid -->
            <g opacity="0.06" class="pointer-events-none">
              @for (x of [0,400,800,1200,1600]; track x) {
                <line [attr.x1]="x" y1="0" [attr.x2]="x" y2="1300" stroke="#9ab0c8" stroke-width="0.5"/>
              }
              @for (y of [0,400,800,1200]; track y) {
                <line x1="0" [attr.y1]="y" x2="1670" [attr.y2]="y" stroke="#9ab0c8" stroke-width="0.5"/>
              }
            </g>

            <!-- North terrain -->
            <polygon [attr.points]="terrain.north" fill="rgba(92,167,255,0.06)" stroke="rgba(92,167,255,0.18)" stroke-width="1.5"/>
            <!-- South terrain -->
            <polygon [attr.points]="terrain.south" fill="rgba(239,68,68,0.05)" stroke="rgba(239,68,68,0.14)" stroke-width="1.5"/>
            <!-- Islands -->
            <polygon [attr.points]="terrain.islandWest" fill="rgba(92,167,255,0.08)" stroke="rgba(92,167,255,0.25)" stroke-width="1"/>
            <polygon [attr.points]="terrain.islandEast" fill="rgba(92,167,255,0.08)" stroke="rgba(92,167,255,0.25)" stroke-width="1"/>
            <polygon [attr.points]="terrain.southFwd" fill="rgba(239,68,68,0.07)" stroke="rgba(239,68,68,0.18)" stroke-width="1"/>

            <!-- Strait label -->
            <text x="835" y="720" text-anchor="middle" font-size="22" font-family="monospace" fill="rgba(156,176,199,0.3)" font-weight="bold" letter-spacing="8">BOREALIS SUND</text>

            <!-- Sensor rings around blue bases -->
            @for (b of basesNorth; track b.label) {
              <circle [attr.cx]="b.x" [attr.cy]="b.y" r="180" fill="none" stroke="rgba(124,224,190,0.15)" stroke-width="0.8" stroke-dasharray="6,5"/>
              <circle [attr.cx]="b.x" [attr.cy]="b.y" r="90" fill="none" stroke="rgba(124,224,190,0.08)" stroke-width="0.5" stroke-dasharray="2,7"/>
            }

            <!-- Blue bases -->
            @for (b of basesNorth; track b.label) {
              <g [attr.transform]="'translate('+b.x+','+b.y+')'">
                <circle r="10" fill="rgba(92,167,255,0.15)" stroke="#5ca7ff" stroke-width="1.5"/>
                <circle r="4" fill="#5ca7ff"/>
                <text x="14" y="4" font-size="9" fill="#5ca7ff" font-family="monospace" font-weight="bold">{{ b.label }}</text>
              </g>
            }

            <!-- Threat tracks (animated) -->
            @for (track of animatedTracks(); track track.id) {
              <g class="cursor-pointer" (click)="selectScenarioTrack(track.id)">
              <!-- Full path line (faint ghost) -->
              <line
                [attr.x1]="track.x" [attr.y1]="track.y" [attr.x2]="track.tx" [attr.y2]="track.ty"
                stroke="rgba(239,68,68,0.12)" stroke-width="1" stroke-dasharray="6,4"
              />
              <!-- Traveled trail (brighter) -->
              <line
                [attr.x1]="track.x" [attr.y1]="track.y" [attr.x2]="track.cx" [attr.y2]="track.cy"
                stroke="rgba(239,68,68,0.55)" stroke-width="1.5"
              />
              <!-- Intercept marker at target -->
              <g [attr.transform]="'translate('+track.tx+','+track.ty+')'">
                <circle r="6" fill="none" stroke="rgba(92,167,255,0.4)" stroke-width="1" stroke-dasharray="3,2"/>
                <circle r="2.5" fill="rgba(92,167,255,0.7)"/>
              </g>
              <!-- IFZ circle follows icon -->
              <circle
                [attr.cx]="track.cx" [attr.cy]="track.cy" r="55"
                fill="rgba(239,68,68,0.04)" stroke="rgba(239,68,68,0.35)" stroke-width="0.8" stroke-dasharray="4,3"
                class="track-pulse"
              />
              <!-- Intercept burst when arrived -->
              @if (intercepting()) {
                <g [attr.transform]="'translate('+track.tx+','+track.ty+')'">
                  <circle r="7" fill="rgba(92,167,255,0.95)" class="intercept-core"/>
                  <circle r="18" fill="none" stroke="#5ca7ff" stroke-width="2" class="intercept-ring"/>
                  <circle r="32" fill="none" stroke="#7ce0be" stroke-width="1" class="intercept-ring intercept-ring-2"/>
                </g>
              }
              <!-- Threat icon at animated position -->
              <g [attr.transform]="'translate('+track.cx+','+track.cy+')'" filter="url(#sc-glow-r)"
                 [class.track-intercepted]="intercepting()">
                @if (track.type === 'missile') {
                  <polygon points="0,-10 5,6 0,2 -5,6" fill="#ef4444"/>
                }
                @if (track.type === 'ship') {
                  <rect x="-8" y="-5" width="16" height="10" rx="2" fill="#ef4444"/>
                  <line x1="0" y1="-5" x2="0" y2="-12" stroke="#ef4444" stroke-width="1.5"/>
                }
                @if (track.type === 'air') {
                  <path d="M0,-10 L6,4 L0,0 L-6,4 Z" fill="#ef4444"/>
                  <line x1="-8" y1="0" x2="8" y2="0" stroke="#ef4444" stroke-width="1.5"/>
                }
              </g>
              @if (selectedScenarioTrackId() === track.id) {
                <circle [attr.cx]="track.cx" [attr.cy]="track.cy" r="24" fill="none" stroke="#5ca7ff" stroke-width="1.2" stroke-dasharray="4,3"/>
                <text [attr.x]="track.cx + 14" [attr.y]="track.cy - 12" font-size="9" font-family="monospace" fill="#5ca7ff" font-weight="bold">{{ track.id }}</text>
              }
              </g>
            }
          </svg>
        </div>
      </div>
    </div>
    }

    <!-- SLIDE 2: AI COA DECISION SUPPORT ───────────────────────────── -->
    @if (currentSlide() === 2) {
    <div class="slide slide-ai animate-in">
      <div class="slide-eyebrow">{{ slides[2].eyebrow }}</div>
      <h2 class="slide-title">{{ slides[2].title }}</h2>
      <p class="slide-sub">{{ slides[2].subtitle }}</p>

      <div class="coa-primer-grid">
        @for (item of coaGuide; track item.id) {
          <div class="coa-primer-card" [class.coa-primer-active]="selectedCoaId() === item.title">
            <div class="coa-primer-title">{{ item.title }}</div>
            <div class="coa-primer-meaning">{{ item.meaning }}</div>
            <div class="coa-primer-when">{{ item.when }}</div>
            <div class="coa-primer-tradeoff">{{ item.tradeoff }}</div>
          </div>
        }
      </div>

      <div class="ai-grid">
        <!-- Pareto scatter (SVG mini) -->
        <div class="ai-pareto-card">
          <div class="card-label">Pareto-front · Beredskap vs. Bekämpningseffekt</div>
          <svg viewBox="0 0 320 220" class="pareto-svg">
            <!-- Axes -->
            <line x1="40" y1="190" x2="300" y2="190" stroke="rgba(156,176,199,0.3)" stroke-width="1"/>
            <line x1="40" y1="10" x2="40" y2="190" stroke="rgba(156,176,199,0.3)" stroke-width="1"/>
            <text x="160" y="210" text-anchor="middle" font-size="9" fill="rgba(156,176,199,0.6)" font-family="monospace">Beredskap (%)</text>
            <text x="12" y="100" text-anchor="middle" font-size="9" fill="rgba(156,176,199,0.6)" font-family="monospace" transform="rotate(-90,12,100)">Intercept (%)</text>

            <!-- Pareto curve -->
            <path d="M 258,30 Q 160,80 80,155" stroke="rgba(92,167,255,0.3)" stroke-width="1.5" fill="none" stroke-dasharray="4,3"/>

            <!-- COA points -->
            @for (coa of coas; track coa.id) {
              <g [attr.transform]="'translate('+coaX(coa.readiness)+','+coaY(coa.intercept)+')'">
                <circle [attr.r]="selectedCoaId() === coa.id ? 9 : 6" [attr.fill]="coa.color" [attr.fill-opacity]="selectedCoaId() === coa.id ? 0.9 : 0.5" [attr.stroke]="coa.color" stroke-width="1.5"/>
                @if (selectedCoaId() === coa.id) {
                  <circle r="15" [attr.stroke]="coa.color" stroke-width="1" fill="none" opacity="0.5" class="pulse-ring"/>
                }
                <text [attr.x]="coa.readiness > 60 ? -8 : 10" y="-10" font-size="8" [attr.fill]="coa.color" font-family="monospace" font-weight="bold">{{ coa.id }}</text>
              </g>
            }
          </svg>
        </div>

        <!-- COA cards -->
        <div class="coa-list">
          @for (coa of coas; track coa.id) {
            <div class="coa-card" [class.coa-selected]="selectedCoaId() === coa.id" (click)="selectedCoaId.set(coa.id)">
              <div class="coa-top">
                <span class="coa-id" [style.color]="coa.color">{{ coa.id }}</span>
                @if (selectedCoaId() === coa.id) {
                  <span class="coa-badge">Rekommenderad</span>
                }
              </div>
              <div class="coa-name">{{ coa.label }}</div>
              <div class="coa-bars">
                <div class="coa-bar-row">
                  <span class="coa-bar-label">Bekämpning</span>
                  <div class="coa-bar-track">
                    <div class="coa-bar-fill" [style.width]="coa.intercept+'%'" [style.background]="coa.color"></div>
                  </div>
                  <span class="coa-bar-val">{{ coa.intercept }}%</span>
                </div>
                <div class="coa-bar-row">
                  <span class="coa-bar-label">Beredskap</span>
                  <div class="coa-bar-track">
                    <div class="coa-bar-fill" [style.width]="coa.readiness+'%'" style="background:rgba(124,224,190,0.7)"></div>
                  </div>
                  <span class="coa-bar-val">{{ coa.readiness }}%</span>
                </div>
                <div class="coa-bar-row">
                  <span class="coa-bar-label">Robusthet</span>
                  <div class="coa-bar-track">
                    <div class="coa-bar-fill" [style.width]="coa.robustness*100+'%'" style="background:rgba(155,140,255,0.7)"></div>
                  </div>
                  <span class="coa-bar-val">{{ coa.robustness }}</span>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Rationale block -->
        <div class="ai-rationale">
          <div class="card-label">Policy tradeoff</div>
          <p class="rationale-text">
            COA-MAX ger mest effekt nu, COA-BAL ger bäst balans och COA-DST skyddar mest uthållighet. Steel räknar först commander posture och reserve floor, scorer alternativen och väljer det som bäst passar missionen.
          </p>
          <div class="rationale-meta">
            <span class="r-tag">Commander posture</span>
            <span class="r-tag">Reserve floor</span>
            <span class="r-tag">Wave 2</span>
            <span class="r-tag">Score → choose</span>
          </div>
        </div>
      </div>
    </div>
    }

    <!-- SLIDE 3: DRAWING BOARD ──────────────────────────────────────── -->
    @if (currentSlide() === 3) {
    <div class="slide slide-board animate-in">
      <div class="slide-split">
        <div class="slide-left-panel">
          <div class="slide-eyebrow">{{ slides[3].eyebrow }}</div>
          <h2 class="slide-title">{{ slides[3].title }}</h2>
          <p class="slide-sub">{{ slides[3].subtitle }}</p>

          <div class="validation-chain">
            <span class="validation-chip">Decision tree</span>
            <span class="validation-arrow">→</span>
            <span class="validation-chip">ML inference</span>
            <span class="validation-arrow">→</span>
            <span class="validation-chip">Monte Carlo</span>
            <span class="validation-arrow">→</span>
            <span class="validation-chip">Counterfactual lab</span>
          </div>

          <div class="validation-tree-strip">
            @for (tree of validationTrees; track tree.id; let i = $index) {
              <button class="validation-tree-card" type="button" [class.validation-tree-card-active]="validationTreeIndex() === i" (click)="selectValidationTree(i)">
                <div class="validation-tree-card-title">{{ tree.title }}</div>
                <div class="validation-tree-card-premise">{{ tree.premise }}</div>
                <div class="validation-tree-card-meta">{{ tree.branches.length }} inferensgrenar</div>
              </button>
            }
          </div>

          <div class="board-features">
            @for (step of validationSteps; track step.id; let i = $index) {
              <div class="board-feat" [class.board-feat-active]="validationFocusIndex() === i" (click)="validationFocusIndex.set(i)">
                <div class="feat-icon">{{ step.tag }}</div>
                <div class="feat-text">
                  <div class="feat-title">{{ step.title }}</div>
                  <div class="feat-sub">{{ step.body }}</div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Board mini demo SVG -->
        <div class="board-demo-container">
          <div class="board-demo-label">ROBUSTNESS LAB — {{ validationSteps[validationFocusIndex()].title.toUpperCase() }} · {{ currentValidationTree().title.toUpperCase() }}</div>
          <div class="board-demo-stage">
            <div class="board-demo-stage-head">
              <div class="board-demo-stage-title">{{ currentValidationTree().premise }}</div>
              <div class="board-demo-stage-sub">{{ currentValidationTree().modelHint }}</div>
            </div>
            <svg viewBox="0 0 760 420" preserveAspectRatio="xMidYMid slice" class="board-svg validation-svg">
              <defs>
                <filter id="tree-glow"><feGaussianBlur stdDeviation="2.4" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
              </defs>
              <rect x="1" y="1" width="758" height="418" rx="12" fill="rgba(3,7,12,0.75)" stroke="rgba(148,189,255,0.08)"/>
              <text x="32" y="36" font-size="11" fill="rgba(156,176,199,0.6)" font-family="monospace" text-transform="uppercase">Inference trace</text>
              <text x="32" y="58" font-size="15" fill="#edf5ff" font-family="monospace" font-weight="bold">{{ currentValidationTree().title }}</text>
              <g>
                <circle cx="110" cy="210" r="34" fill="rgba(92,167,255,0.12)" stroke="#5ca7ff" stroke-width="1.5"/>
                <text x="110" y="204" text-anchor="middle" font-size="10" fill="#5ca7ff" font-family="monospace" font-weight="bold">ROOT</text>
                <text x="110" y="219" text-anchor="middle" font-size="11" fill="#edf5ff" font-family="monospace">{{ currentValidationTree().title }}</text>
              </g>
              @for (branch of currentValidationTree().branches; track branch.label; let i = $index) {
                @let y = 90 + (i * 110);
                <g>
                  <line x1="144" y1="210" [attr.x2]="220" [attr.y2]="y" stroke="rgba(148,189,255,0.22)" stroke-width="1.2" />
                  <line x1="220" [attr.y1]="y" x2="410" [attr.y2]="y" [attr.stroke]="activeValidationBranchIndex() === i ? 'rgba(124,224,190,0.9)' : 'rgba(148,189,255,0.18)'" stroke-width="1.2" stroke-dasharray="6,4" />
                  <circle cx="220" [attr.cy]="y" [attr.r]="activeValidationBranchIndex() === i ? 20 : 16" [attr.fill]="activeValidationBranchIndex() === i ? 'rgba(124,224,190,0.16)' : 'rgba(92,167,255,0.08)'" [attr.stroke]="activeValidationBranchIndex() === i ? '#7ce0be' : '#5ca7ff'" stroke-width="1.2"/>
                  <text x="220" [attr.y]="y - 2" text-anchor="middle" font-size="9" fill="#edf5ff" font-family="monospace" font-weight="bold">{{ branch.label }}</text>
                  <text x="220" [attr.y]="y + 12" text-anchor="middle" font-size="9" fill="rgba(156,176,199,0.7)" font-family="monospace">p={{ branch.probability }}</text>
                  <circle cx="438" [attr.cy]="y" [attr.r]="activeValidationBranchIndex() === i ? 24 : 19" fill="rgba(255,255,255,0.03)" [attr.stroke]="activeValidationBranchIndex() === i ? '#7ce0be' : 'rgba(156,176,199,0.22)'" stroke-width="1.2"/>
                  <text x="438" [attr.y]="y - 3" text-anchor="middle" font-size="9" fill="#edf5ff" font-family="monospace" font-weight="bold">{{ branch.outcome }}</text>
                  <text x="438" [attr.y]="y + 10" text-anchor="middle" font-size="9" [attr.fill]="activeValidationBranchIndex() === i ? '#7ce0be' : 'rgba(156,176,199,0.68)'" font-family="monospace">score {{ branch.score }}</text>
                </g>
              }
              <g opacity="0.95">
                <rect x="520" y="44" width="204" height="118" rx="10" fill="rgba(255,255,255,0.02)" stroke="rgba(92,167,255,0.12)"/>
                <text x="536" y="68" font-size="9" fill="rgba(156,176,199,0.7)" font-family="monospace" text-transform="uppercase">ML inference</text>
                <text x="536" y="88" font-size="11" fill="#edf5ff" font-family="monospace">Each branch gets a score.</text>
                <text x="536" y="108" font-size="11" fill="#edf5ff" font-family="monospace">Counterfactual deltas tell us</text>
                <text x="536" y="124" font-size="11" fill="#edf5ff" font-family="monospace">which assumption flips the tree.</text>
                <text x="536" y="146" font-size="9" fill="#7ce0be" font-family="monospace">Collapse: {{ currentValidationTree().collapseHint }}</text>
              </g>
              <g>
                <rect x="520" y="190" width="204" height="188" rx="10" fill="rgba(255,255,255,0.02)" stroke="rgba(92,167,255,0.12)"/>
                <text x="536" y="214" font-size="9" fill="rgba(156,176,199,0.7)" font-family="monospace" text-transform="uppercase">Branch ledger</text>
                @for (branch of currentValidationTree().branches; track branch.label; let j = $index) {
                  <rect x="536" [attr.y]="230 + (j * 48)" width="168" height="36" rx="8" fill="rgba(255,255,255,0.03)" stroke="rgba(148,189,255,0.08)"/>
                  <text x="548" [attr.y]="244 + (j * 48)" font-size="10" fill="#edf5ff" font-family="monospace" font-weight="bold">{{ branch.label }}</text>
                  <text x="548" [attr.y]="258 + (j * 48)" font-size="9" fill="rgba(156,176,199,0.72)" font-family="monospace">p {{ branch.probability }} · score {{ branch.score }}</text>
                }
              </g>
            </svg>
          </div>

          <div class="validation-inference-grid">
            @for (branch of currentValidationTree().branches; track branch.label; let i = $index) {
              <button class="validation-inference-card" type="button" [class.validation-inference-card-active]="activeValidationBranchIndex() === i">
                <div class="validation-inference-top">
                  <span class="validation-inference-label">{{ branch.label }}</span>
                  <span class="validation-inference-score">{{ branch.score }}</span>
                </div>
                <div class="validation-inference-line">Probability {{ branch.probability }}</div>
                <div class="validation-inference-line">Outcome {{ branch.outcome }}</div>
                <div class="validation-inference-line">{{ branch.counterfactual }}</div>
              </button>
            }
          </div>
        </div>
      </div>
    </div>
    }

    <!-- SLIDE 4: ML INFRASTRUCTURE ─────────────────────────────────── -->
    @if (currentSlide() === 4) {
    <div class="slide slide-ml animate-in">
      <div class="slide-eyebrow">{{ slides[4].eyebrow }}</div>
      <h2 class="slide-title">{{ slides[4].title }}</h2>
      <p class="slide-sub">{{ slides[4].subtitle }}</p>

      <div class="state-explain">
        <div class="state-explain-head">Varför delad state behövs</div>
        <div class="state-explain-body">Utan ett gemensamt theatre state får policy, readiness, logistics och governance egna versioner av sanningen. Med en gemensam modell kan alla ytor läsa samma sak och fatta beslut på samma grund.</div>
      </div>

      <div class="ml-grid">
        <!-- Single source of truth -->
        <div class="ml-card ml-card-primary" [class.ml-card-focus]="modelFocusIndex() === 0" (click)="modelFocusIndex.set(0)">
          <div class="ml-card-header">
            <span class="ml-icon">⊚</span>
            <span class="ml-card-title">Single source of truth</span>
          </div>
          <div class="ml-stack-list">
            <div class="ml-stack-item">
              <span class="ml-lib">Theater state</span><span class="ml-lic apache">shared</span>
            </div>
            <div class="ml-stack-item">
              <span class="ml-lib">Policy</span><span class="ml-lic mit">same model</span>
            </div>
            <div class="ml-stack-item">
              <span class="ml-lib">Readiness</span><span class="ml-lic mit">same model</span>
            </div>
            <div class="ml-stack-item">
              <span class="ml-lib">Logistics</span><span class="ml-lic apache">same model</span>
            </div>
            <div class="ml-stack-item">
              <span class="ml-lib">Labs</span><span class="ml-lic mit">same model</span>
            </div>
          </div>
          <p class="ml-card-note">Det som skiljer Steel från en UI-demo är att samma state driver flera ytor samtidigt.</p>
        </div>

        <!-- Backend authority -->
        <div class="ml-card" [class.ml-card-focus]="modelFocusIndex() === 1" (click)="modelFocusIndex.set(1)">
          <div class="ml-card-header">
            <span class="ml-icon">⊛</span>
            <span class="ml-card-title">Backend authority</span>
          </div>
          <div class="ml-flag-row">
            <div class="ml-flag-item">
              <div class="ml-flag fr">API</div>
              <div class="ml-flag-text">
                <div class="ml-flag-name">FastAPI</div>
                <div class="ml-flag-sub">Autoritativ decision logic</div>
              </div>
            </div>
            <div class="ml-flag-item">
              <div class="ml-flag eu">SRV</div>
              <div class="ml-flag-text">
                <div class="ml-flag-name">State backbone</div>
                <div class="ml-flag-sub">Policy, readiness, logistics, labs</div>
              </div>
            </div>
            <div class="ml-flag-item">
              <div class="ml-flag se">DB</div>
              <div class="ml-flag-text">
                <div class="ml-flag-name">Shared domain models</div>
                <div class="ml-flag-sub">One meaning across surfaces</div>
              </div>
            </div>
          </div>
          <p class="ml-card-note">Semantiken flyttas inte runt som kopior. Den läses från samma källa av varje yta.</p>
        </div>

        <!-- Consumers -->
        <div class="ml-card ml-card-highlight" [class.ml-card-focus]="modelFocusIndex() === 2" (click)="modelFocusIndex.set(2)">
          <div class="ml-card-header">
            <span class="ml-icon">⊟</span>
            <span class="ml-card-title">Consumers</span>
          </div>
          <div class="ncs-specs">
            <div class="ncs-spec"><span class="ncs-k">Policy</span><span class="ncs-v">same state</span></div>
            <div class="ncs-spec"><span class="ncs-k">Readiness</span><span class="ncs-v">same state</span></div>
            <div class="ncs-spec"><span class="ncs-k">Logistics</span><span class="ncs-v">same state</span></div>
            <div class="ncs-spec"><span class="ncs-k">Governance</span><span class="ncs-v">same state</span></div>
            <div class="ncs-spec"><span class="ncs-k">Labs</span><span class="ncs-v">same state</span></div>
          </div>
          <div class="ncs-badge">State re-used across all major surfaces</div>
        </div>

        <!-- BDT vs dagens system -->
        <div class="ml-card" [class.ml-card-focus]="modelFocusIndex() === 3" (click)="modelFocusIndex.set(3)">
          <div class="ml-card-header">
            <span class="ml-icon">◷</span>
            <span class="ml-card-title">BDT vs dagens system</span>
          </div>
          <div class="system-compare">
            <div class="system-compare-summary">
              Dagens system sprider läget över flera ytor. BDT samlar samma theatre state, samma beslutskedja och samma semantik i en modell.
            </div>
            <div class="system-compare-head">
              <span>Dagens system</span>
              <span>BDT</span>
            </div>
            @for (row of systemComparison; track row.label) {
              <div class="system-compare-row">
                <div class="system-compare-legacy">
                  <div class="system-pill system-pill-legacy">Fragmenterat</div>
                  <div class="system-compare-text">{{ row.legacyText }}</div>
                </div>
                <div class="system-compare-center">
                  <div class="system-compare-label">{{ row.label }}</div>
                  <div class="system-compare-bridge">→</div>
                  <div class="system-compare-benefit">{{ row.benefit }}</div>
                </div>
                <div class="system-compare-bdt">
                  <div class="system-pill system-pill-bdt">Unified</div>
                  <div class="system-compare-text">{{ row.bdtText }}</div>
                </div>
              </div>
            }
          </div>
          <div class="system-compare-note">
            BDT vinner eftersom samma state, samma semantik och samma kontrakt används i alla ytor. Det ger mindre drift, snabbare beslut och mindre risk för att demo, governance och operationer säger olika saker.
          </div>
        </div>
      </div>
    </div>
    }

    <!-- SLIDE 5: GOVERNANCE ─────────────────────────────────────────── -->
    @if (currentSlide() === 5) {
    <div class="slide slide-governance animate-in">
      <div class="slide-split">
        <div class="slide-left-panel">
          <div class="slide-eyebrow">{{ slides[5].eyebrow }}</div>
          <h2 class="slide-title">{{ slides[5].title }}</h2>
          <p class="slide-sub">{{ slides[5].subtitle }}</p>

          <div class="gov-authority-levels">
            @for (domain of ontologyDomains; track domain.id; let i = $index) {
              <div class="auth-level" [class.active-auth]="ontologyFocusIndex() === i" (click)="ontologyFocusIndex.set(i)">
                <div class="auth-badge">{{ $index + 1 }}</div>
                <div class="auth-info">
                  <div class="auth-name">{{ domain.title }}</div>
                  <div class="auth-desc">{{ domain.summary }}</div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Ontology proof -->
        <div class="gov-right">
          <div class="kg-facts">
            <div class="kg-fact">
              <span class="kf-v">5</span>
              <span class="kf-l">Domäner</span>
            </div>
            <div class="kg-fact">
              <span class="kf-v">1</span>
              <span class="kf-l">Operativ modell</span>
            </div>
            <div class="kg-fact">
              <span class="kf-v">0</span>
              <span class="kf-l">Feature-islands</span>
            </div>
          </div>
          <div class="gov-factors">
            @for (domain of ontologyDomains; track domain.id; let i = $index) {
              <div class="gov-factor" [class.gov-factor-active]="ontologyFocusIndex() === i">
                <div class="gf-top">
                  <span class="gf-label">{{ domain.title }}</span>
                  <span class="gf-summary">{{ domain.summary }}</span>
                </div>
                <div class="gf-why">{{ domain.why }}</div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
    }

    <!-- SLIDE 6: KNOWLEDGE GRAPH ───────────────────────────────────── -->
    @if (currentSlide() === 6) {
    <div class="slide slide-kg animate-in">
      <div class="slide-split">
        <div class="slide-left-panel">
          <div class="slide-eyebrow">{{ slides[6].eyebrow }}</div>
          <h2 class="slide-title">{{ slides[6].title }}</h2>
          <p class="slide-sub">{{ slides[6].subtitle }}</p>

          <div class="kg-section">
            <div class="kg-section-header kg-demo-header">
              <span class="kg-section-dot" style="background:#60a5fa"></span>
              MÖJLIGT EFTERSOM SAMMA STATE DELAS
            </div>
            <div class="kg-section-items">
            @for (effect of unificationEffects; track effect.id; let i = $index) {
                <div class="kg-item" [class.kg-item-active]="unificationFocusIndex() === i" (click)="unificationFocusIndex.set(i)"><strong>{{ effect.title }}</strong> · {{ effect.body }}</div>
              }
            </div>
          </div>

          <div class="kg-section">
            <div class="kg-section-header kg-power-header">
              <span class="kg-section-dot" style="background:#34d399"></span>
              SYSTEM I GRAFEN
            </div>
            <div class="kg-section-items">
              <div class="kg-item">01 Theater state · samma ingång för alla beslut</div>
              <div class="kg-item">02 COA solver · policy weights och reserve floor</div>
              <div class="kg-item">03 Counterfactual lab · decision tree och ML inferens</div>
              <div class="kg-item">04 Governance & audit · samma beslutskedja</div>
              <div class="kg-item">05 Field console · operatören ser samma semantik</div>
            </div>
          </div>

          <div class="kg-section">
            <div class="kg-section-header kg-more-header">
              <span class="kg-section-dot" style="background:#a78bfa"></span>
              FORTSATT SKALA
            </div>
            <div class="kg-section-items">
              <div class="kg-item">C2 resilience · command friction och collapse horizon</div>
              <div class="kg-item">Threat inspector · intent och osäkerhet i samma domänmodell</div>
              <div class="kg-item">Demo director · scenario injection med samma kontrakt</div>
              <div class="kg-item">Sovereign deployment · lokal eller EU utan semantisk drift</div>
            </div>
          </div>

          <p class="kg-hint">Samma state och samma ontologi gör att dessa ytor kan växa ihop utan att bli feature-islands.</p>
        </div>

        <!-- 3D Knowledge Graph Viewer -->
        <div class="kg-viewer-container">
          <div class="kg-viewer-label">
            PLATFORM KNOWLEDGE GRAPH · 3D WebGL · Live
            <span class="kg-live-dot"></span>
          </div>
          <div class="kg-viewer-inner">
            <app-knowledge-graph-viewer></app-knowledge-graph-viewer>
          </div>
        </div>
      </div>
    </div>
    }

    <!-- SLIDE 7: SUMMARY ────────────────────────────────────────────── -->
    @if (currentSlide() === 7) {
    <div class="slide slide-summary animate-in">
      <div class="slide-eyebrow">{{ slides[7].eyebrow }}</div>
      <h2 class="slide-title slide-title-big">{{ slides[7].title }}</h2>
      <p class="slide-sub">{{ slides[7].subtitle }}</p>

      <div class="summary-grid">
        <div class="sum-card">
          <div class="sum-num blue">Användarmål</div>
          <div class="sum-label">Fatta rätt beslut under tidspress och bevara nästa våg</div>
        </div>
        <div class="sum-card">
          <div class="sum-num green">Påverkan</div>
          <div class="sum-label">Verksamhetskritiskt eftersom fel beslut förbrukar förmåga för tidigt</div>
        </div>
        <div class="sum-card">
          <div class="sum-num purple">Oundvikliga aktiviteter</div>
          <div class="sum-label">Samla, fusionera, välja, validera och skydda uthållighet</div>
        </div>
        <div class="sum-card">
          <div class="sum-num amber">Lösningsstruktur</div>
          <div class="sum-label">Policy-driven COA, kontrafaktisk validation och ontologi i ett state</div>
        </div>
      </div>

      <div class="summary-pillars">
        @for (method of novelMethods; track method.id; let i = $index) {
          <div class="pillar" [class.pillar-active]="summaryFocusIndex() === i" (click)="summaryFocusIndex.set(i)">
            <div class="pillar-icon">{{ method.tag }}</div>
            <div class="pillar-title">{{ method.title }}</div>
            <div class="pillar-desc">{{ method.body }}</div>
          </div>
        }
      </div>

      <div class="summary-answer">
        Steel visar en prototyp av ett ledningssystem som hjälper användaren att möta hot nu, bevara förmåga för nästa våg och få ett tydligt, validerat svar på vad som ska göras härnäst.
      </div>

      <div class="summary-cta">
        <a routerLink="/" class="cta-btn">Öppna systemet <span class="cta-arrow">→</span></a>
        <span class="cta-note">Kräver åtkomstnyckel</span>
      </div>
    </div>
    }

    @if (!slideDemoStarted()[currentSlide()]) {
      <button class="demo-overlay" type="button" (click)="startCurrentSlideDemo($event)">
        <span class="demo-overlay-kicker">Klicka en gång för att starta demo</span>
        <span class="demo-overlay-lead">{{ slidePreviewCopy[currentSlide()].lead }}</span>
        <span class="demo-overlay-title">{{ slides[currentSlide()].title }}</span>
        <span class="demo-overlay-sub">{{ slidePreviewCopy[currentSlide()].detail }}</span>
        <div class="demo-overlay-bullets">
          @for (bullet of slidePreviewCopy[currentSlide()].bullets; track bullet) {
            <div class="demo-overlay-bullet">
              <span class="demo-overlay-bullet-dot"></span>
              <span>{{ bullet }}</span>
            </div>
          }
        </div>
      </button>
    }

  </main>

  <!-- ── Console window ─────────────────────────────────────────────── -->
  <div class="console-window">
    <div class="console-header">
      <div class="console-dots">
        <span class="console-dot red"></span>
        <span class="console-dot amber"></span>
        <span class="console-dot green"></span>
      </div>
      <div class="console-header-copy">
        <span class="console-title">BDT BACKEND COMMAND LOG</span>
        <span class="console-subtitle">{{ slides[currentSlide()].eyebrow }} · {{ slides[currentSlide()].title }}</span>
      </div>
    </div>
    <div class="console-body">
      <div class="console-meta">
        <span>SLIDE DEMO MODE</span>
        <span>Ingest → score → decide → expose</span>
      </div>
      @if (visibleConsoleLines().length === 0) {
        <div class="console-line console-state">
          <span class="console-prompt">></span>
          <span>Klicka en gång på sliden för att starta demo-flödet.</span>
        </div>
      }
      @for (line of visibleConsoleLines(); track $index) {
        <div class="console-line" [class.console-dim]="$index < visibleConsoleLines().length - 4">
          <span class="console-prompt">$</span>
          <span>{{ line }}</span>
        </div>
      }
      <div class="console-cursor"></div>
    </div>
  </div>

  <!-- ── Navigation ─────────────────────────────────────────────────── -->
  <nav class="showcase-nav">
    <button class="nav-arrow" [disabled]="currentSlide() === 0" (click)="prev()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
    </button>

    <div class="nav-dots">
      @for (slide of slides; track $index) {
        <button
          class="nav-dot"
          [class.nav-dot-active]="currentSlide() === $index"
          (click)="goTo($index)"
          [title]="slide.title"
        ></button>
      }
    </div>

    <button class="nav-arrow" [disabled]="currentSlide() === slides.length - 1" (click)="next()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
    </button>
  </nav>

  <!-- Slide counter -->
  <div class="slide-counter">{{ currentSlide() + 1 }} / {{ slides.length }}</div>

</div>
  `,
  styles: [`
    :host { display: block; }

    /* ── Root shell ─────────────────────────────────────────────────── */
    .showcase-shell {
      position: fixed; inset: 0; z-index: 9999;
      background: #050b12;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
      color: #edf5ff;
      display: flex; flex-direction: column;
      overflow: hidden;
      --s-text: #edf5ff;
      --s-muted: #9ab0c8;
      --s-blue: #5ca7ff;
      --s-green: #7ce0be;
      --s-purple: #9b8cff;
      --s-amber: #f59e0b;
      --s-red: #ef4444;
      --s-border: rgba(148,189,255,0.12);
      --s-panel: rgba(7,14,23,0.85);
    }
    .showcase-shell:focus { outline: none; }

    .showcase-bg {
      position: absolute; inset: 0; pointer-events: none;
      background:
        radial-gradient(circle at 20% 20%, rgba(92,167,255,0.12), transparent 30%),
        radial-gradient(circle at 80% 80%, rgba(124,224,190,0.08), transparent 30%),
        radial-gradient(circle at 60% 40%, rgba(155,140,255,0.06), transparent 25%);
    }

    /* ── Header ─────────────────────────────────────────────────────── */
    .showcase-header {
      position: relative; z-index: 10;
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 24px;
      border-bottom: 1px solid var(--s-border);
      background: rgba(5,11,18,0.7); backdrop-filter: blur(12px);
      flex-shrink: 0;
    }
    .showcase-logo {
      width: 36px; height: 36px; border-radius: 8px;
      background: linear-gradient(135deg, #5ca7ff, #7ce0be);
      display: grid; place-items: center;
      font-size: 18px; font-weight: 900; color: #050b12;
    }
    .showcase-exit-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 14px; border-radius: 6px;
      border: 1px solid var(--s-border); background: transparent;
      color: var(--s-muted); font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.15em;
      text-decoration: none; cursor: pointer; transition: all 0.2s;
    }
    .showcase-exit-btn:hover { color: var(--s-text); border-color: rgba(148,189,255,0.3); }

    /* ── Main slide area ─────────────────────────────────────────────── */
    .showcase-main {
      flex: 1; min-height: 0; overflow: hidden; position: relative; z-index: 1;
    }
    .slide {
      position: absolute; inset: 0;
      padding: 32px 40px 80px;
      overflow-y: auto;
    }
    .slide-split {
      display: grid; grid-template-columns: 320px 1fr; gap: 32px; height: 100%;
    }
    .slide-left-panel {
      display: flex; flex-direction: column; gap: 16px; overflow-y: auto;
    }

    .animate-in { animation: slideIn 0.4s ease-out both; }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ── Typography ─────────────────────────────────────────────────── */
    .slide-eyebrow {
      font-size: 10px; font-weight: 900; text-transform: uppercase;
      letter-spacing: 0.28em; color: var(--s-muted);
    }
    .slide-title {
      font-size: clamp(24px,3.5vw,42px); font-weight: 300; letter-spacing: -0.02em;
      margin: 0; line-height: 1.05;
    }
    .slide-title-big { font-size: clamp(28px,4vw,52px); }
    .slide-sub {
      font-size: 14px; color: var(--s-muted); line-height: 1.6; margin: 0;
    }
    .slide-hero-title {
      font-size: clamp(56px,8vw,96px); font-weight: 200; letter-spacing: -0.05em;
      margin: 0; line-height: 0.9;
      background: linear-gradient(135deg, #edf5ff, #5ca7ff 40%, #7ce0be);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .slide-hero-sub { font-size: 18px; color: var(--s-muted); margin: 0; line-height: 1.6; max-width: 42rem; }

    /* ── Welcome slide ──────────────────────────────────────────────── */
    .slide-welcome { display: flex; align-items: center; justify-content: center; }
    .slide-welcome-inner { max-width: 760px; display: flex; flex-direction: column; gap: 24px; }
    .welcome-chips { display: flex; flex-wrap: wrap; gap: 10px; }
    .w-chip {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 6px 14px; border-radius: 999px;
      border: 1px solid var(--s-border); background: rgba(255,255,255,0.03);
      font-size: 12px; color: var(--s-text);
    }
    .w-chip-dot { width: 7px; height: 7px; border-radius: 50%; }
    .w-chip-dot.blue { background: var(--s-blue); box-shadow: 0 0 8px var(--s-blue); }
    .w-chip-dot.green { background: var(--s-green); box-shadow: 0 0 8px var(--s-green); }
    .w-chip-dot.purple { background: var(--s-purple); box-shadow: 0 0 8px var(--s-purple); }
    .w-chip-dot.amber { background: var(--s-amber); box-shadow: 0 0 8px var(--s-amber); }
    .welcome-stack { display: flex; flex-direction: column; gap: 1px; border: 1px solid var(--s-border); border-radius: 8px; overflow: hidden; }
    .stack-row {
      display: flex; align-items: center; gap: 16px; padding: 10px 16px;
      background: rgba(255,255,255,0.02);
    }
    .stack-row:not(:last-child) { border-bottom: 1px solid var(--s-border); }
    .stack-label { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: var(--s-muted); width: 80px; flex-shrink: 0; }
    .stack-value { font-size: 12px; color: var(--s-text); font-family: 'JetBrains Mono', 'Courier New', monospace; }

    /* ── Map slide ──────────────────────────────────────────────────── */
    .map-container {
      position: relative; border-radius: 8px; overflow: hidden;
      border: 1px solid var(--s-border); background: rgba(3,7,12,0.8);
    }
    .map-svg { display: block; width: 100%; height: 100%; }
    .scenario-story {
      display: flex; flex-direction: column; gap: 6px;
      padding: 12px 14px; border-radius: 8px;
      border: 1px solid rgba(92,167,255,0.18);
      background: rgba(92,167,255,0.04);
    }
    .scenario-story-kicker {
      font-size: 11px; font-weight: 800; color: var(--s-text); line-height: 1.45;
    }
    .scenario-story-detail {
      font-size: 12px; line-height: 1.6; color: var(--s-muted);
    }
    .scenario-story-decision {
      font-size: 10px; text-transform: uppercase; letter-spacing: 0.16em;
      color: var(--s-blue); font-weight: 900;
    }
    .scenario-tabs { display: flex; flex-direction: column; gap: 4px; }
    .s-tab {
      display: flex; align-items: center; gap: 8px; padding: 8px 12px;
      border-radius: 6px; border: 1px solid var(--s-border);
      background: transparent; color: var(--s-muted);
      font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s; text-align: left;
    }
    .s-tab.active { border-color: rgba(92,167,255,0.4); background: rgba(92,167,255,0.08); color: var(--s-blue); }
    .s-tab:hover:not(.active) { border-color: rgba(148,189,255,0.2); color: var(--s-text); }
    .s-tab-num {
      width: 18px; height: 18px; border-radius: 50%;
      background: rgba(92,167,255,0.15); display: grid; place-items: center;
      font-size: 9px; font-weight: 900; color: var(--s-blue);
    }
    .s-tab.active .s-tab-num { background: rgba(92,167,255,0.3); }
    .map-legend { display: flex; flex-direction: column; gap: 5px; }
    .legend-row { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--s-muted); }
    .legend-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .legend-dot.blue { background: var(--s-blue); }
    .legend-dot.red { background: var(--s-red); }
    .legend-dot.amber { background: var(--s-amber); }
    .legend-dot.white { background: rgba(156,176,199,0.5); border: 1px solid rgba(156,176,199,0.4); }
    .map-stats { display: flex; gap: 12px; }
    .stat { display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--s-border); background: rgba(255,255,255,0.02); flex: 1; }
    .stat-v { font-size: 18px; font-weight: 700; font-family: monospace; color: var(--s-text); }
    .stat-g { color: var(--s-green); }
    .stat-a { color: var(--s-amber); }
    .stat-l { font-size: 9px; color: var(--s-muted); text-transform: uppercase; letter-spacing: 0.1em; }
    .track-pulse { animation: trackPulse 2s ease-in-out infinite; }
    @keyframes trackPulse { 0%,100% { opacity: 0.7; } 50% { opacity: 0.3; } }
    .track-intercepted { opacity: 0.3; transition: opacity 0.4s ease; }
    .intercept-core { animation: interceptCoreFade 0.3s ease-out both; }
    @keyframes interceptCoreFade { from { opacity: 0; } to { opacity: 1; } }
    .intercept-ring {
      transform-box: fill-box; transform-origin: center;
      animation: interceptRingPing 1.1s ease-out infinite;
    }
    .intercept-ring-2 { animation-delay: 0.35s; }
    @keyframes interceptRingPing {
      from { opacity: 0.8; transform: scale(0.4); }
      to { opacity: 0; transform: scale(2); }
    }
    .map-phase-bar { display: flex; flex-direction: column; gap: 4px; }
    .map-phase-label {
      font-size: 9px; font-weight: 900; letter-spacing: 0.22em; text-transform: uppercase;
      color: var(--s-blue); transition: color 0.3s ease;
    }
    .map-phase-label.phase-intercept { color: var(--s-green); animation: phaseFlash 0.6s ease-in-out infinite alternate; }
    @keyframes phaseFlash { from { opacity: 1; } to { opacity: 0.35; } }
    .phase-bar-track { height: 2px; background: rgba(148,189,255,0.1); border-radius: 1px; overflow: hidden; }
    .phase-bar-fill { height: 100%; background: linear-gradient(90deg, #5ca7ff, #7ce0be); border-radius: 1px; transition: width 0.06s linear; }
    .phase-bar-fill.phase-fill-intercept { background: linear-gradient(90deg, #7ce0be, #5ca7ff); }
    .stat-r { color: var(--s-red); }
    .timeline-control {
      display: flex; flex-direction: column; gap: 8px;
      padding: 12px; border-radius: 6px;
      border: 1px solid var(--s-border); background: rgba(255,255,255,0.02);
    }
    .timeline-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .timeline-label { font-size: 10px; color: var(--s-muted); font-family: monospace; font-weight: 700; }
    .timeline-slider {
      width: 100%;
      accent-color: var(--s-blue);
      background: transparent;
    }
    .track-facts {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }
    .track-fact {
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid var(--s-border);
      background: rgba(255,255,255,0.02);
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .track-fact-label {
      font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.16em;
      color: var(--s-muted);
    }
    .track-fact-value {
      font-size: 12px; color: var(--s-text); line-height: 1.4;
    }

    /* ── AI slide ───────────────────────────────────────────────────── */
    .slide-ai { overflow-y: auto; }
    .ai-grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: auto auto; gap: 16px; margin-top: 16px; }
    .ai-pareto-card { grid-row: 1; padding: 16px; border: 1px solid var(--s-border); border-radius: 8px; background: rgba(255,255,255,0.02); }
    .coa-list { grid-row: 1; display: flex; flex-direction: column; gap: 8px; }
    .ai-rationale { grid-column: 1 / -1; padding: 16px; border: 1px solid rgba(92,167,255,0.15); border-radius: 8px; background: rgba(92,167,255,0.04); }
    .coa-primer-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 16px; }
    .coa-primer-card {
      padding: 12px; border: 1px solid var(--s-border); border-radius: 8px;
      background: rgba(255,255,255,0.02); display: flex; flex-direction: column; gap: 4px;
    }
    .coa-primer-active { border-color: rgba(92,167,255,0.35); background: rgba(92,167,255,0.06); }
    .coa-primer-title { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.16em; color: var(--s-blue); }
    .coa-primer-meaning { font-size: 12px; font-weight: 700; color: var(--s-text); }
    .coa-primer-when { font-size: 11px; color: var(--s-muted); line-height: 1.5; }
    .coa-primer-tradeoff { font-size: 10px; color: var(--s-green); line-height: 1.5; }
    .card-label { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: var(--s-muted); margin-bottom: 10px; }
    .pareto-svg { width: 100%; height: 200px; }
    .pulse-ring { animation: pulseRing 2s ease-in-out infinite; }
    @keyframes pulseRing { 0%,100% { opacity: 0.5; r: 15; } 50% { opacity: 0.1; r: 22; } }
    .coa-card { padding: 10px 12px; border: 1px solid var(--s-border); border-radius: 6px; background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.2s; }
    .coa-card:hover { border-color: rgba(92,167,255,0.28); background: rgba(92,167,255,0.05); }
    .coa-selected { border-color: rgba(92,167,255,0.4); background: rgba(92,167,255,0.06); }
    .coa-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
    .coa-id { font-size: 10px; font-weight: 900; font-family: monospace; }
    .coa-badge { font-size: 8px; padding: 2px 8px; border-radius: 999px; background: rgba(92,167,255,0.2); color: var(--s-blue); font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
    .coa-name { font-size: 11px; color: var(--s-muted); margin-bottom: 8px; }
    .coa-bars { display: flex; flex-direction: column; gap: 4px; }
    .coa-bar-row { display: flex; align-items: center; gap: 6px; }
    .coa-bar-label { font-size: 9px; color: var(--s-muted); width: 62px; flex-shrink: 0; }
    .coa-bar-track { flex: 1; height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; }
    .coa-bar-fill { height: 100%; border-radius: 2px; transition: width 0.6s ease; }
    .coa-bar-val { font-size: 9px; font-weight: 700; font-family: monospace; color: var(--s-text); width: 32px; text-align: right; }
    .rationale-text { font-size: 12px; line-height: 1.7; color: var(--s-muted); margin: 0 0 10px; }
    .rationale-meta { display: flex; flex-wrap: wrap; gap: 8px; }
    .r-tag { font-size: 9px; padding: 2px 8px; border: 1px solid var(--s-border); border-radius: 4px; color: var(--s-muted); font-family: monospace; }

    /* ── Board slide ─────────────────────────────────────────────────── */
    .board-demo-container {
      position: relative; border-radius: 8px; overflow: hidden;
      border: 1px solid var(--s-border); background: rgba(3,7,12,0.8);
      display: flex; flex-direction: column;
    }
    .board-demo-label {
      padding: 6px 12px; font-size: 8px; font-weight: 900; text-transform: uppercase;
      letter-spacing: 0.2em; color: var(--s-muted); border-bottom: 1px solid var(--s-border);
      background: rgba(255,255,255,0.02); flex-shrink: 0;
    }
    .board-svg { flex: 1; display: block; }
    .board-features { display: flex; flex-direction: column; gap: 10px; }
    .board-feat { display: flex; align-items: flex-start; gap: 12px; padding: 10px 12px; border: 1px solid var(--s-border); border-radius: 6px; background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.2s; }
    .board-feat:hover { border-color: rgba(92,167,255,0.28); background: rgba(92,167,255,0.05); }
    .board-feat-active { border-color: rgba(92,167,255,0.35); background: rgba(92,167,255,0.08); }
  .validation-chain {
      display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
      padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(92,167,255,0.16);
      background: rgba(92,167,255,0.04); margin-bottom: 14px;
    }
    .validation-chip {
      font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.16em;
      color: var(--s-text); padding: 4px 8px; border: 1px solid rgba(92,167,255,0.18); border-radius: 999px;
      background: rgba(255,255,255,0.03);
    }
    .validation-arrow { color: var(--s-blue); font-size: 12px; font-weight: 900; }
    .validation-tree-strip {
      display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px;
      margin-bottom: 12px;
    }
    .validation-tree-card {
      padding: 12px; border: 1px solid var(--s-border); border-radius: 8px;
      background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.2s;
      text-align: left;
    }
    .validation-tree-card:hover { border-color: rgba(92,167,255,0.28); background: rgba(92,167,255,0.05); }
    .validation-tree-card-active { border-color: rgba(92,167,255,0.35); background: rgba(92,167,255,0.07); }
    .validation-tree-card-title {
      font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.16em;
      color: var(--s-blue); margin-bottom: 4px;
    }
    .validation-tree-card-premise { font-size: 11px; line-height: 1.45; color: var(--s-text); margin-bottom: 6px; }
    .validation-tree-card-meta { font-size: 9px; color: var(--s-muted); text-transform: uppercase; letter-spacing: 0.12em; }
    .feat-icon { font-size: 16px; color: var(--s-blue); width: 20px; flex-shrink: 0; }
    .feat-title { font-size: 12px; font-weight: 700; color: var(--s-text); }
    .feat-sub { font-size: 10px; color: var(--s-muted); margin-top: 2px; }
    .board-demo-stage {
      display: flex; flex-direction: column; gap: 10px; padding: 12px; background: rgba(255,255,255,0.02);
    }
    .board-demo-stage-head { display: flex; flex-direction: column; gap: 4px; padding: 0 2px; }
    .board-demo-stage-title { font-size: 12px; font-weight: 800; color: var(--s-text); line-height: 1.45; }
    .board-demo-stage-sub { font-size: 11px; color: var(--s-muted); line-height: 1.45; }
    .validation-svg { min-height: 420px; }
    .validation-inference-grid {
      display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px;
      padding: 12px; border-top: 1px solid var(--s-border); background: rgba(255,255,255,0.02);
    }
    .validation-inference-card {
      display: flex; flex-direction: column; gap: 4px; text-align: left;
      padding: 10px 12px; border: 1px solid var(--s-border); border-radius: 8px;
      background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.2s;
    }
    .validation-inference-card:hover { border-color: rgba(92,167,255,0.28); background: rgba(92,167,255,0.05); }
    .validation-inference-card-active { border-color: rgba(124,224,190,0.35); background: rgba(124,224,190,0.07); }
    .validation-inference-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .validation-inference-label { font-size: 10px; font-weight: 900; color: var(--s-blue); text-transform: uppercase; letter-spacing: 0.14em; }
    .validation-inference-score { font-size: 10px; font-weight: 900; font-family: monospace; color: var(--s-text); }
    .validation-inference-line { font-size: 10px; line-height: 1.45; color: var(--s-muted); }

    /* ── ML slide ────────────────────────────────────────────────────── */
    .slide-ml { overflow-y: auto; }
    .ml-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
    .ml-card { padding: 18px; border: 1px solid var(--s-border); border-radius: 8px; background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.2s; }
    .ml-card:hover { border-color: rgba(92,167,255,0.28); background: rgba(92,167,255,0.05); }
    .ml-card-focus { border-color: rgba(92,167,255,0.35); background: rgba(92,167,255,0.06); box-shadow: 0 0 0 1px rgba(92,167,255,0.08) inset; }
    .ml-card-primary { border-color: rgba(92,167,255,0.2); background: rgba(92,167,255,0.04); }
    .ml-card-highlight { border-color: rgba(124,224,190,0.25); background: rgba(124,224,190,0.04); }
    .ml-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .ml-icon { font-size: 16px; color: var(--s-blue); }
    .ml-card-highlight .ml-icon { color: var(--s-green); }
    .ml-card-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; }
    .ml-stack-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .ml-stack-item { display: flex; align-items: center; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--s-border); }
    .ml-lib { font-size: 12px; font-family: monospace; color: var(--s-text); }
    .ml-lic { font-size: 8px; padding: 2px 6px; border-radius: 4px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
    .ml-lic.apache { background: rgba(92,167,255,0.15); color: var(--s-blue); }
    .ml-lic.mit { background: rgba(124,224,190,0.15); color: var(--s-green); }
    .ml-card-note { font-size: 11px; color: var(--s-muted); margin: 0; }
    .system-compare { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
    .system-compare-summary {
      padding: 10px 12px; border-radius: 8px;
      border: 1px solid rgba(92,167,255,0.16); background: rgba(92,167,255,0.04);
      font-size: 11px; line-height: 1.55; color: var(--s-muted);
    }
    .system-compare-head {
      display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
      font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.16em;
      color: var(--s-muted); padding: 0 2px;
    }
    .system-compare-row {
      display: grid; grid-template-columns: minmax(0, 1fr) 108px minmax(0, 1fr); gap: 10px;
      align-items: stretch; padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.04);
    }
    .system-compare-legacy, .system-compare-bdt, .system-compare-center {
      display: flex; flex-direction: column; gap: 6px;
    }
    .system-compare-center {
      align-items: center; justify-content: center; text-align: center; padding: 2px 0;
    }
    .system-compare-label {
      font-size: 10px; color: var(--s-blue); font-weight: 900; line-height: 1.35;
      text-transform: uppercase; letter-spacing: 0.14em;
    }
    .system-compare-bridge {
      width: 100%; font-size: 14px; font-weight: 900; color: var(--s-green);
      line-height: 1; padding: 4px 0;
    }
    .system-compare-benefit {
      font-size: 11px; line-height: 1.45; color: var(--s-text); font-weight: 700;
    }
    .system-pill {
      display: inline-flex; align-items: center; align-self: flex-start; gap: 4px;
      font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.14em;
      padding: 3px 8px; border-radius: 999px;
    }
    .system-pill-legacy { color: #ffb4b4; background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.18); }
    .system-pill-bdt { color: #c9fff0; background: rgba(124,224,190,0.12); border: 1px solid rgba(124,224,190,0.18); }
    .system-compare-text {
      font-size: 11px; line-height: 1.55; color: var(--s-muted);
      padding: 10px 12px; border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02);
      min-height: 64px;
    }
    .system-compare-note {
      font-size: 11px; line-height: 1.6; color: var(--s-muted);
      padding-top: 4px;
    }
    .state-explain {
      display: flex; flex-direction: column; gap: 6px;
      padding: 12px 14px; border-radius: 8px; border: 1px solid rgba(92,167,255,0.16);
      background: rgba(92,167,255,0.04); margin-top: 10px;
    }
    .state-explain-head {
      font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.18em;
      color: var(--s-blue);
    }
    .state-explain-body {
      font-size: 12px; line-height: 1.6; color: var(--s-muted);
    }
    .ml-flag-row { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
    .ml-flag-item { display: flex; align-items: center; gap: 10px; }
    .ml-flag {
      width: 36px; height: 28px; border-radius: 4px; display: grid; place-items: center;
      font-size: 9px; font-weight: 900; letter-spacing: 0.1em;
    }
    .ml-flag.fr { background: rgba(0,82,204,0.3); color: #6699ff; border: 1px solid rgba(0,82,204,0.4); }
    .ml-flag.eu { background: rgba(0,51,153,0.3); color: #8899ff; border: 1px solid rgba(0,51,153,0.4); }
    .ml-flag.se { background: rgba(0,107,56,0.3); color: #66cc99; border: 1px solid rgba(0,107,56,0.4); }
    .ml-flag-name { font-size: 12px; font-weight: 700; color: var(--s-text); }
    .ml-flag-sub { font-size: 10px; color: var(--s-muted); }
    .ncs-specs { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .ncs-spec { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid var(--s-border); }
    .ncs-k { font-size: 10px; color: var(--s-muted); font-family: monospace; }
    .ncs-v { font-size: 11px; color: var(--s-green); font-family: monospace; font-weight: 700; }
    .ncs-badge { font-size: 9px; padding: 4px 10px; border-radius: 4px; background: rgba(124,224,190,0.15); color: var(--s-green); font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; display: inline-block; }
    .latency-bars { display: flex; flex-direction: column; gap: 10px; }
    .lat-row { display: flex; align-items: center; gap: 8px; }
    .lat-label { font-size: 10px; color: var(--s-muted); width: 80px; flex-shrink: 0; }
    .lat-track { flex: 1; height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; }
    .lat-fill { height: 100%; border-radius: 3px; transition: width 1s ease; }
    .lat-val { font-size: 10px; color: var(--s-text); font-family: monospace; font-weight: 700; width: 52px; text-align: right; }

    /* ── Governance slide ────────────────────────────────────────────── */
    .gov-authority-levels { display: flex; flex-direction: column; gap: 6px; }
    .auth-level { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 6px; border: 1px solid var(--s-border); background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.2s; }
    .auth-level:hover { border-color: rgba(245,158,11,0.28); background: rgba(245,158,11,0.05); }
    .active-auth { border-color: rgba(245,158,11,0.4); background: rgba(245,158,11,0.06); }
    .auth-badge { font-size: 9px; font-weight: 900; font-family: monospace; padding: 3px 8px; border-radius: 4px; flex-shrink: 0; }
    .auto .auth-badge { background: rgba(124,224,190,0.15); color: var(--s-green); }
    .semi .auth-badge { background: rgba(92,167,255,0.15); color: var(--s-blue); }
    .manual .auth-badge { background: rgba(245,158,11,0.2); color: var(--s-amber); }
    .auth-name { font-size: 11px; font-weight: 700; color: var(--s-text); margin-bottom: 2px; }
    .auth-desc { font-size: 10px; color: var(--s-muted); }
    .gov-metrics { display: flex; gap: 8px; }
    .gov-metric { flex: 1; padding: 8px; border: 1px solid var(--s-border); border-radius: 6px; background: rgba(255,255,255,0.02); display: flex; flex-direction: column; gap: 2px; }
    .gm-v { font-size: 20px; font-weight: 700; font-family: monospace; color: var(--s-text); }
    .gm-g { color: var(--s-green); }
    .gm-b { color: var(--s-blue); }
    .gm-l { font-size: 8px; color: var(--s-muted); text-transform: uppercase; letter-spacing: 0.1em; }
    .gov-right { display: flex; flex-direction: column; align-items: stretch; gap: 16px; padding: 16px; overflow-y: auto; }
    .gov-gauge-label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: var(--s-muted); }
    .gauge-svg { width: 240px; height: 180px; }
    .gov-factors { width: 100%; display: flex; flex-direction: column; gap: 8px; }
    .gov-factor { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--s-border); background: rgba(255,255,255,0.02); }
    .gov-factor-active { border-color: rgba(92,167,255,0.25); background: rgba(92,167,255,0.05); }
    .gf-top { display: flex; flex-direction: column; gap: 3px; }
    .gf-label { font-size: 10px; color: var(--s-muted); text-transform: uppercase; letter-spacing: 0.14em; }
    .gf-summary { font-size: 11px; color: var(--s-text); }
    .gf-why { font-size: 11px; color: var(--s-muted); line-height: 1.5; }

    /* ── Summary slide ───────────────────────────────────────────────── */
    .slide-summary { display: flex; flex-direction: column; gap: 24px; }
    .summary-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
    .sum-card { padding: 16px; border: 1px solid var(--s-border); border-radius: 8px; background: rgba(255,255,255,0.02); display: flex; flex-direction: column; gap: 4px; }
    .sum-num { font-size: 28px; font-weight: 200; font-family: monospace; }
    .sum-num.blue { color: var(--s-blue); }
    .sum-num.green { color: var(--s-green); }
    .sum-num.purple { color: var(--s-purple); }
    .sum-num.amber { color: var(--s-amber); }
    .sum-label { font-size: 11px; color: var(--s-muted); }
    .summary-pillars { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
    .pillar { padding: 14px; border: 1px solid var(--s-border); border-radius: 8px; background: rgba(255,255,255,0.02); display: flex; flex-direction: column; gap: 6px; }
    .pillar-icon { font-size: 18px; color: var(--s-blue); }
    .pillar-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }
    .pillar-desc { font-size: 10px; color: var(--s-muted); line-height: 1.5; }
    .summary-answer {
      padding: 14px 16px; border-radius: 8px; border: 1px solid rgba(92,167,255,0.16);
      background: rgba(92,167,255,0.04); color: var(--s-text); line-height: 1.7; font-size: 12px;
    }
    .summary-cta { display: flex; align-items: center; gap: 16px; }
    .cta-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 12px 28px; border-radius: 8px;
      background: linear-gradient(135deg, #5ca7ff, #7ce0be);
      color: #050b12; font-weight: 800; font-size: 14px;
      text-decoration: none; letter-spacing: 0.05em; transition: opacity 0.2s;
    }
    .cta-btn:hover { opacity: 0.9; }
    .cta-arrow { transition: transform 0.2s; }
    .cta-btn:hover .cta-arrow { transform: translateX(4px); }
    .cta-note { font-size: 11px; color: var(--s-muted); }

    /* ── Console window ──────────────────────────────────────────────── */
    .console-window {
      position: fixed; bottom: 60px; right: 24px; z-index: 50;
      width: min(680px, calc(100vw - 48px));
      background: rgba(3,7,12,0.94); border: 1px solid rgba(92,167,255,0.28);
      border-radius: 10px; overflow: hidden;
      box-shadow: 0 12px 40px rgba(0,0,0,0.55);
      backdrop-filter: blur(10px);
    }
    .console-header {
      display: flex; align-items: center; gap: 10px; padding: 10px 14px;
      border-bottom: 1px solid rgba(92,167,255,0.14);
      background: rgba(92,167,255,0.07);
    }
    .console-header-copy { display: flex; flex-direction: column; gap: 3px; }
    .console-dots { display: flex; gap: 4px; }
    .console-dot { width: 9px; height: 9px; border-radius: 50%; }
    .console-dot.red { background: #ef4444; opacity: 0.7; }
    .console-dot.amber { background: #f59e0b; opacity: 0.7; }
    .console-dot.green { background: #7ce0be; opacity: 0.7; }
    .console-title { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.22em; color: rgba(92,167,255,0.98); font-family: monospace; }
    .console-subtitle { font-size: 9px; text-transform: uppercase; letter-spacing: 0.16em; color: rgba(156,176,199,0.78); font-family: monospace; }
    .console-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; min-height: 160px; max-height: 280px; overflow: hidden; }
    .console-meta {
      display: flex; justify-content: space-between; gap: 12px; padding-bottom: 8px;
      font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.18em;
      color: rgba(156,176,199,0.78); border-bottom: 1px solid rgba(148,189,255,0.1);
      margin-bottom: 6px;
    }
    .console-line { font-size: 13px; font-family: 'JetBrains Mono', 'Courier New', monospace; color: rgba(124,224,190,0.95); display: flex; gap: 6px; line-height: 1.65; }
    .console-dim { opacity: 0.4; }
    .console-prompt { color: rgba(92,167,255,0.6); flex-shrink: 0; }
    .console-state { color: rgba(237,245,255,0.88); }
    .console-cursor {
      width: 7px; height: 12px; background: rgba(124,224,190,0.8);
      animation: blink 1s step-end infinite; margin-top: 2px;
    }
    @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }

    /* ── Navigation ──────────────────────────────────────────────────── */
    .showcase-nav {
      position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); z-index: 20;
      display: flex; align-items: center; gap: 16px;
      padding: 8px 16px; border-radius: 999px;
      background: rgba(7,14,23,0.9); border: 1px solid var(--s-border);
      backdrop-filter: blur(12px); box-shadow: 0 4px 24px rgba(0,0,0,0.4);
    }
    .nav-arrow {
      width: 28px; height: 28px; border-radius: 50%;
      border: 1px solid var(--s-border); background: transparent;
      color: var(--s-muted); cursor: pointer; display: grid; place-items: center;
      transition: all 0.2s;
    }
    .nav-arrow:hover:not(:disabled) { color: var(--s-text); border-color: rgba(148,189,255,0.3); background: rgba(255,255,255,0.05); }
    .nav-arrow:disabled { opacity: 0.3; cursor: not-allowed; }
    .nav-dots { display: flex; gap: 6px; align-items: center; }
    .nav-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: rgba(156,176,199,0.25); border: none; cursor: pointer;
      transition: all 0.25s;
    }
    .nav-dot-active { width: 22px; border-radius: 3px; background: var(--s-blue); }
    .slide-counter {
      position: fixed; bottom: 24px; left: 24px; z-index: 20;
      padding: 4px 10px; border-radius: 999px;
      border: 1px solid var(--s-border); background: rgba(7,14,23,0.7);
      font-size: 10px; font-family: monospace; color: var(--s-muted); font-weight: 700;
    }

    /* ── Knowledge Graph slide ───────────────────────────────────────── */
    .slide-kg { overflow: hidden; }
    .kg-viewer-container {
      position: relative; border-radius: 8px; overflow: hidden;
      border: 1px solid rgba(96,165,250,0.2); background: #05080d;
      display: flex; flex-direction: column;
    }
    .kg-viewer-label {
      padding: 6px 12px; font-size: 8px; font-weight: 900; text-transform: uppercase;
      letter-spacing: 0.22em; color: rgba(96,165,250,0.7);
      border-bottom: 1px solid rgba(96,165,250,0.15);
      background: rgba(96,165,250,0.05);
      display: flex; align-items: center; gap: 8px; flex-shrink: 0;
    }
    .kg-live-dot {
      width: 6px; height: 6px; border-radius: 50%; background: #34d399;
      animation: blink 1.5s ease-in-out infinite;
    }
    .kg-viewer-inner { flex: 1; min-height: 0; }
    .kg-categories { display: flex; flex-direction: column; gap: 6px; }
    .kg-cat {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 10px; border-radius: 6px; border: 1px solid;
      font-size: 11px; color: var(--s-text);
    }
    .kg-cat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .kg-facts { display: flex; gap: 10px; }
    .kg-fact { flex: 1; padding: 8px; border: 1px solid var(--s-border); border-radius: 6px; background: rgba(255,255,255,0.02); display: flex; flex-direction: column; gap: 2px; }
    .kf-v { font-size: 22px; font-weight: 700; font-family: monospace; color: rgba(96,165,250,0.9); }
    .kf-l { font-size: 9px; color: var(--s-muted); text-transform: uppercase; letter-spacing: 0.1em; }
    .kg-section { display: flex; flex-direction: column; gap: 6px; }
    .kg-section-header {
      display: flex; align-items: center; gap: 6px;
      font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.22em;
      padding: 4px 0;
    }
    .kg-demo-header { color: rgba(96,165,250,0.9); }
    .kg-power-header { color: rgba(52,211,153,0.9); }
    .kg-more-header { color: rgba(167,139,250,0.9); }
    .kg-section-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .kg-section-items { display: flex; flex-direction: column; gap: 2px; padding-left: 13px; }
    .kg-item {
      font-size: 11px; color: var(--s-muted); line-height: 1.6; padding: 2px 0;
      border-bottom: 1px solid rgba(255,255,255,0.04); cursor: pointer; transition: color 0.2s;
    }
    .kg-item:hover { color: var(--s-text); }
    .kg-item-active { color: var(--s-text); }
    .kg-item:last-child { border-bottom: none; }
    .kg-hint { font-size: 10px; font-family: monospace; color: rgba(156,176,199,0.4); margin: 0; }
    .pillar { cursor: pointer; transition: all 0.2s; }
    .pillar:hover { border-color: rgba(92,167,255,0.28); background: rgba(92,167,255,0.05); }
    .pillar-active { border-color: rgba(92,167,255,0.35); background: rgba(92,167,255,0.06); }

    /* ── Demo overlay ──────────────────────────────────────────────── */
    .demo-overlay {
      position: absolute; inset: 0; z-index: 30;
      display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-end;
      gap: 8px; padding: 40px 56px 120px;
      border: none; background:
        linear-gradient(180deg, rgba(5,11,18,0.08), rgba(5,11,18,0.42)),
        radial-gradient(circle at 20% 30%, rgba(92,167,255,0.12), transparent 30%);
      color: var(--s-text); text-align: left; cursor: pointer;
      backdrop-filter: blur(2px);
    }
    .demo-overlay:hover { background:
        linear-gradient(180deg, rgba(5,11,18,0.04), rgba(5,11,18,0.34)),
        radial-gradient(circle at 20% 30%, rgba(92,167,255,0.16), transparent 30%); }
    .demo-overlay-kicker {
      font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.24em; color: var(--s-blue);
    }
    .demo-overlay-lead {
      font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.18em;
      color: var(--s-muted);
    }
    .demo-overlay-title {
      font-size: clamp(28px, 4vw, 60px); font-weight: 300; letter-spacing: -0.04em;
    }
    .demo-overlay-sub {
      max-width: 54rem; font-size: 15px; line-height: 1.6; color: var(--s-muted);
    }
    .demo-overlay-bullets {
      display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px;
      width: min(100%, 720px); margin-top: 6px;
    }
    .demo-overlay-bullet {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(148,189,255,0.14);
      background: rgba(255,255,255,0.03); font-size: 11px; line-height: 1.45; color: var(--s-text);
    }
    .demo-overlay-bullet-dot {
      width: 7px; height: 7px; border-radius: 50%; background: var(--s-blue);
      margin-top: 5px; flex-shrink: 0;
    }
  `],
})
export class Showcase implements OnInit, OnDestroy {

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
  readonly systemComparison = SYSTEM_COMPARISON;

  currentSlide = signal(0);
  mapScenario = signal(0);
  selectedScenarioTrackId = signal<string | null>(null);
  slideDemoStarted = signal<Record<number, boolean>>({});
  selectedCoaId = signal<string>('COA-BAL');
  validationFocusIndex = signal(0);
  validationTreeIndex = signal(0);
  modelFocusIndex = signal(0);
  ontologyFocusIndex = signal(0);
  unificationFocusIndex = signal(0);
  summaryFocusIndex = signal(0);

  private _consoleLine = signal(0);
  private _consoleSlide = signal(0);
  private _consoleTimer: ReturnType<typeof setInterval> | null = null;
  private _lines: string[] = [];

  visibleConsoleLines = computed(() => {
    const slide = this._consoleSlide();
    const count = this._consoleLine();
    const seq = CONSOLE_SEQUENCES[slide] ?? [];
    return seq.slice(0, count);
  });

  // Track animation
  private _trackTimer: ReturnType<typeof setInterval> | null = null;
  private readonly _flyTicks = 220;
  private readonly _interceptTicks = 80;
  private _demoTick = 0;
  trackPlaying = signal(true);
  trackProgress = signal(0);
  trackPhase = signal<'fly' | 'intercept'>('fly');
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
  currentValidationTree = computed(() => this.validationTrees[this.validationTreeIndex()] ?? this.validationTrees[0]);
  activeValidationBranchIndex = computed(() => this.validationFocusIndex() % Math.max(1, this.currentValidationTree().branches.length));

  intercepting = computed(() => this.trackPhase() === 'intercept');

  ngOnInit(): void {
    this._resetConsole(0);
  }

  ngOnDestroy(): void {
    if (this._consoleTimer) clearInterval(this._consoleTimer);
    if (this._trackTimer) clearInterval(this._trackTimer);
    if (this._slideDemoTimer) clearInterval(this._slideDemoTimer);
  }

  private _resetConsole(slide: number): void {
    if (this._consoleTimer) clearInterval(this._consoleTimer);
    this._consoleSlide.set(slide);
    this._consoleLine.set(0);
  }

  private _startConsole(slide: number): void {
    this._resetConsole(slide);
    const seq = CONSOLE_SEQUENCES[slide] ?? [];
    let i = 0;
    this._consoleTimer = setInterval(() => {
      if (i < seq.length) {
        this._consoleLine.set(++i);
      }
    }, 700);
  }

  private _startTrackAnim(): void {
    if (this._trackTimer) clearInterval(this._trackTimer);
    this.trackProgress.set(0);
    this.trackPhase.set('fly');
    this.trackPlaying.set(true);
    this._demoTick = 0;
    let cueIndex = Math.max(0, DEMO_CUES.findIndex(cue => cue.scenarioIndex === this.mapScenario()));
    if (cueIndex === -1) cueIndex = 0;
    this.mapScenario.set(DEMO_CUES[cueIndex].scenarioIndex);
    this.selectedScenarioTrackId.set(DEMO_CUES[cueIndex].trackId);
    this._trackTimer = setInterval(() => {
      if (!this.trackPlaying()) return;
      this._demoTick++;
      if (this._demoTick <= this._flyTicks) {
        this.trackProgress.set(this._demoTick / this._flyTicks);
      } else if (this._demoTick === this._flyTicks + 1) {
        this.trackPhase.set('intercept');
      } else if (this._demoTick > this._flyTicks + this._interceptTicks) {
        // Auto-cycle to next cue in the scripted demo
        cueIndex = (cueIndex + 1) % DEMO_CUES.length;
        this.mapScenario.set(DEMO_CUES[cueIndex].scenarioIndex);
        this.selectedScenarioTrackId.set(DEMO_CUES[cueIndex].trackId);
        this._demoTick = 0;
        this.trackProgress.set(0);
        this.trackPhase.set('fly');
      }
    }, 50);
  }

  private _clearSlideDemoTimer(): void {
    if (this._slideDemoTimer) {
      clearInterval(this._slideDemoTimer);
      this._slideDemoTimer = null;
    }
  }

  private _setSlideStarted(index: number, started: boolean): void {
    this.slideDemoStarted.update(state => ({ ...state, [index]: started }));
  }

  startCurrentSlideDemo(event?: MouseEvent): void {
    event?.preventDefault();
    event?.stopPropagation();

    const slide = this.currentSlide();
    if (this.slideDemoStarted()[slide]) return;

    this._setSlideStarted(slide, true);
    this._startConsole(slide);
    this._clearSlideDemoTimer();
    this._slideDemoStep = 0;

    if (slide === 1) {
      this._startTrackAnim();
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
  }

  selectScenario(idx: number): void {
    this.mapScenario.set(idx);
    const firstTrack = MAP_SCENARIOS[idx]?.[0];
    if (firstTrack) this.selectedScenarioTrackId.set(firstTrack.id);
    if (this.slideDemoStarted()[1]) {
      this._startTrackAnim();
    }
  }

  selectScenarioTrack(id: string): void {
    this.selectedScenarioTrackId.set(id);
  }

  selectValidationTree(index: number): void {
    this.validationTreeIndex.set(index);
    this.validationFocusIndex.set(0);
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
      return [
        { label: 'Roll', value: track.id === 'S1' ? 'Supply line' : track.id === 'S2' ? 'Escort' : track.id === 'S3' ? 'Threat' : 'Air cover' },
        { label: 'Tid', value: `${secondsLeft}s` },
        { label: 'Beslut', value: track.id === 'S3' ? 'Intercept now' : 'Protect corridor' },
        { label: 'Konsekvens', value: track.id === 'S1' ? 'Support reaches base' : track.id === 'S3' ? 'Corridor breaks' : 'Reserve is consumed' },
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

  goTo(index: number): void {
    const prev = this.currentSlide();
    this.currentSlide.set(index);
    this._resetConsole(index);
    this._clearSlideDemoTimer();
    this._setSlideStarted(index, false);
    if (index === 2) this.selectedCoaId.set('COA-BAL');
    if (index === 3) this.validationFocusIndex.set(0);
    if (index === 3) this.validationTreeIndex.set(0);
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

  // Convert COA readiness (0-100) → SVG x coordinate [40..300]
  coaX(readiness: number): number { return 40 + (readiness / 100) * 260; }
  // Convert intercept (0-100) → SVG y coordinate [190..10]
  coaY(intercept: number): number { return 190 - (intercept / 100) * 180; }
}
