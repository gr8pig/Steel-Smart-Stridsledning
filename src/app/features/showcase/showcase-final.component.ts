import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SteelApiService } from '../../core/services/steel-api.service';
import { PolicyStore } from '../../core/state/policy.store';
import { ScenarioStore } from '../../core/state/scenario.store';
import { TacticalRecommendationsComponent } from '../ops/components/tactical-recommendations.component';
import { TacticalConsole } from '../ops/tactical-console.component';
import { ThreatInspector } from '../ops/threat-inspector.component';

interface FinalSlide {
  eyebrow: string;
  title: string;
  subtitle: string;
}

interface ProcessStep {
  id: string;
  label: string;
  description: string;
}

interface FailureCard {
  title: string;
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
  script: string;
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

interface ComparisonRow {
  before: string;
  after: string;
}

interface DomainCard {
  title: string;
  body: string;
}

interface BackboneCard {
  title: string;
  preserved: string;
  role: string;
}

interface OntologyModelGroup {
  title: string;
  lead: string;
  models: string[];
}

const FINAL_SLIDES: FinalSlide[] = [
  {
    eyebrow: 'Final Showcase',
    title: 'STEEL',
    subtitle: 'Smart Stridsledning, powered by Boreal Decision Twin',
  },
  {
    eyebrow: 'Process',
    title: 'Från sensortrigger till final advice',
    subtitle: 'Steel är inte bara en karta. Steel är en beslutsloop från sensor till förklarat verkansbeslut.',
  },
  {
    eyebrow: 'Mission-Critical',
    title: 'Varför processen är mission-critical',
    subtitle: 'Fel beslut kostar inte bara effekt nu, utan också förmåga i nästa våg.',
  },
  {
    eyebrow: 'Lösning',
    title: 'Fyra lager i samma system',
    subtitle: 'Theater state, beslut, validering och rationale sitter i samma loop.',
  },
  {
    eyebrow: 'Live Demo',
    title: 'Ghost Feint',
    subtitle: 'När systemet måste ändra sig i realtid och visa varför.',
  },
  {
    eyebrow: 'Impact',
    title: 'Vad löste vi precis?',
    subtitle: 'Steel förbättrar inte bara lägesbilden, utan själva beslutsakten.',
  },
  {
    eyebrow: 'Scale',
    title: 'Fem domäner, ett språk',
    subtitle: 'Samma funktionella domänontologi driver tactical view, readiness, logistics, governance och labs utan semantisk drift.',
  },
  {
    eyebrow: 'Close',
    title: 'Rätt verkan nu. Förmåga kvar sen.',
    subtitle: 'Frameworket kan skala vidare till evaluation, training och strategy alignment utan att bryta själva beslutskedjan.',
  },
];

const PROCESS_STEPS: ProcessStep[] = [
  {
    id: 'sensor',
    label: 'Samla sensordata',
    description: 'Spår, störning och kvalitet måste in i samma lägesmodell.',
  },
  {
    id: 'rap',
    label: 'Fusionera till RAP',
    description: 'Lägesbilden måste bli en verklig operational picture, inte bara en vy.',
  },
  {
    id: 'intent',
    label: 'Tolka intent',
    description: 'Systemet måste skilja probe, feint, strike, saturation och decoy.',
  },
  {
    id: 'allocation',
    label: 'Välj bas och effektor',
    description: 'Valet väger räckvidd, readiness, effekt och reserve floor samtidigt.',
  },
  {
    id: 'validation',
    label: 'Validera beslutet',
    description: 'Decision tree, ML inference och Monte Carlo stressar antagandet före commit.',
  },
  {
    id: 'rationale',
    label: 'Visa rationale',
    description: 'Operatören får recommendation card, policy trace och förklarad tradeoff.',
  },
  {
    id: 'readiness',
    label: 'Uppdatera readiness',
    description: 'Beslutet måste bokföra vad som finns kvar till nästa våg.',
  },
];

const FAILURE_CARDS: FailureCard[] = [
  {
    title: 'Skjuter för tidigt',
    body: 'Man tömmer reserven på osäker intent och möter nästa våg med sämre beredskap.',
  },
  {
    title: 'Väntar för länge',
    body: 'Man missar strike-fönstret och låter rätt hot passera tills det är för sent att ta igen.',
  },
  {
    title: 'Optimerar fel våg',
    body: 'Man vinner första minuten men förlorar andra för att baser, interceptors eller crews blev felbelastade.',
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

const DEMO_STEPS: DemoStep[] = [
  {
    id: 'reset',
    time: '3:00-3:15',
    label: 'Reset baseline',
    summary: 'Börja med ren theater state och neutral posture.',
    script: 'Vi börjar med en ren theater state: standard posture, normala basresurser och inga låsta antaganden.',
  },
  {
    id: 'feint',
    time: '3:15-3:35',
    label: 'Inject Feint Swarm',
    summary: 'Tio kontakter från norr ser ut som probe eller feint.',
    script: 'Nu ser vi tio kontakter från norr. De är långsamma och långt bort. Systemet tolkar dem som probe eller feint, alltså låg initial threat value.',
  },
  {
    id: 'balanced',
    time: '3:35-3:50',
    label: 'Solve COA första gången',
    summary: 'Steel håller igen när intent ännu är osäkert.',
    script: 'Med den informationen rekommenderar Steel inte full insats. COA-BAL bevarar interceptors och håller readiness för nästa våg.',
  },
  {
    id: 'jamming',
    time: '3:50-4:10',
    label: 'Heavy jamming',
    summary: 'Osäkerheten visas öppet istället för att döljas.',
    script: 'Nu aktiverar motståndaren störning. Sensor quality faller, confidence sjunker. Steel låtsas inte vara säkert, osäkerheten blir en del av beslutet.',
  },
  {
    id: 'redirect',
    time: '4:10-4:35',
    label: 'Redirect mot Highridge',
    summary: 'Det som såg ut som probe skiftar till strike.',
    script: 'Nu kommer deception-momentet: spåren accelererar och riktas om mot Highridge Command. Det som såg ut som probe var ett feint som maskerade strike.',
  },
  {
    id: 'max',
    time: '4:35-5:00',
    label: 'Solve COA igen',
    summary: 'Samma system går från HOLD till full protection när datan kräver det.',
    script: 'Steel löser om COA. Nu rekommenderas MAX_PROTECTION. Samma system höll igen när hotet var osäkert och agerar fullt när avsikten förändras.',
  },
];

const DEMO_SUMMARIES: Record<DemoStep['id'], DemoSummary> = {
  reset: {
    badge: 'BASELINE',
    title: 'Ren theater state',
    body: 'Utgångsläget ska vara tydligt innan demo-kedjan startar. Ingen effekt ska tolkas som "magisk".',
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
    body: 'Ghost Feint är bäst som finaldemo eftersom den tvingar systemet att byta uppfattning i realtid.',
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
    body: 'Bra showcase-material är när UI och rekommendation båda erkänner osäkerhet istället för att låtsas vara säkra.',
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
    body: 'Slutpunkten ska visa att rationalen följer samma data som kartan och policy-lagret. Det är därför demon känns som en beslutsloop, inte en animation.',
    metrics: [
      { label: 'Rekommendation', value: 'MAX', detail: 'Full engagement vid bekräftad strike.' },
      { label: 'Engagements', value: '8-10', detail: 'Insatsen växlar upp direkt.' },
      { label: 'Time to target', value: '<120 s', detail: 'Urgency och intent pekar åt samma håll.' },
      { label: 'Budskap', value: 'Agera fullt', detail: 'Samma system håller igen först, commitar sedan.' },
    ],
  },
};

const COMPARISON_ROWS: ComparisonRow[] = [
  { before: 'Probe / feint', after: 'Strike' },
  { before: 'Låg threat value', after: 'Hög threat value' },
  { before: 'COA-BAL', after: 'MAX_PROTECTION' },
  { before: 'Bevara reserv', after: 'Full engagement' },
  { before: 'Håll igen', after: 'Agera nu' },
];

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
    models: ['BaseTwin', 'ThreatTwin', 'EffectorTwin', 'SensorTwin', 'PolicyTwin', 'COATwin', 'OperationalDirective', 'MapFeature / ScenarioPhase'],
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

const BACKBONE_CARDS: BackboneCard[] = [
  {
    title: 'Intro från första showcasen',
    preserved: 'Användare, problem, metod och mål ligger kvar som öppning.',
    role: 'Ger samma hook, men snabbare och rakare mot juryns första fråga.',
  },
  {
    title: 'Operatörsflödet',
    preserved: 'Attack, interception och supply lines lever kvar som kärnprocess.',
    role: 'Förtydligar att Steel hjälper beslutskedjan, inte bara kartvisningen.',
  },
  {
    title: 'Tre COA-alternativ',
    preserved: 'COA-MAX, COA-BAL och COA-DST är fortfarande beslutshjärtat.',
    role: 'Visar tradeoff mellan effekt nu och uthållighet sen.',
  },
  {
    title: 'Kontrafaktisk validering',
    preserved: 'Decision tree, ML inference och Monte Carlo ligger kvar som ryggrad.',
    role: 'Det gör att rekommendationen känns rationell, inte dekorativ.',
  },
  {
    title: 'Ontology och knowledge graph',
    preserved: 'Delad theatre state, fem domäner och grafen behålls.',
    role: 'Det gör slutdelen skalbar och binder ihop demo med frameworket.',
  },
  {
    title: 'Slutsatsen',
    preserved: 'Hackathon-svaret och "rätt verkan nu" ligger kvar som slutkläm.',
    role: 'Finalen blir en komprimering av första showcasen, inte en ny rundtur.',
  },
];

const FUTURE_POINTS = [
  'Red-team och counterpart agent som pressar beslutsloopen från andra sidan.',
  'Continuous post-evaluation där rekommendation jämförs mot faktiskt utfall.',
  'Commander training och chess-quiz-liknande övningar på samma ontology backbone.',
  'Offline eller sovereign deployment utan att byta semantik eller domänspråk.',
  'Kvantitativ evaluation mot historisk eller simulerad data.',
  'Strategy alignment mellan political officer, commander, logistics officer och forward operators.',
];

const CLOSE_POINTS = [
  'Causal intent',
  'Concrete recommendations',
  'Lower cognitive load',
  'Robust validation',
  'Shared ontology',
  'Closed-loop evaluation',
];

@Component({
  selector: 'app-showcase-final',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TacticalConsole,
    ThreatInspector,
    TacticalRecommendationsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="final-showcase-shell" (keydown)="onKey($event)" tabindex="0">
      <div class="final-showcase-bg"></div>

      <header class="final-showcase-header">
        <div class="final-brand">
          <div class="final-logo">S</div>
          <div>
            <div class="final-brand-kicker">Steel Final Showcase</div>
            <div class="final-brand-title">Boreal Decision Twin</div>
          </div>
        </div>

        <div class="final-header-actions">
          <span class="final-format-pill">7 min format</span>
          <a routerLink="/showcase" class="final-secondary-btn">Original</a>
          <a routerLink="/" class="final-exit-btn">Stäng</a>
        </div>
      </header>

      <main class="final-showcase-main">
        @switch (currentSlide()) {
          @case (0) {
            <section class="final-slide final-slide-hero">
              <div class="final-slide-eyebrow">{{ slides[0].eyebrow }}</div>
              <h1 class="final-hero-title">{{ slides[0].title }}</h1>
              <p class="final-hero-subtitle">{{ slides[0].subtitle }}</p>
              <div class="final-hero-tagline">Rätt verkan nu. Förmåga kvar sen.</div>

              <div class="hero-quote-card">
                Steel är inte bara en karta, utan en decision loop från sensortrigger till förklarat, uthålligt verkansbeslut.
              </div>

              <div class="hero-chip-row">
                <div class="hero-chip">Sensorfusion måste bli RAP, inte bara en vy</div>
                <div class="hero-chip">Resursallokering måste ta nästa våg i beräkning</div>
                <div class="hero-chip">Uthållighet måste skyddas när hoten eskalerar</div>
              </div>

              <div class="hero-stack">
                <div class="hero-stack-row"><span>Användare</span><strong>Luftbevakare, flygstridsledare, command authority</strong></div>
                <div class="hero-stack-row"><span>Problem</span><strong>Fatta rätt beslut under sekundnivå-friktion och osäkerhet</strong></div>
                <div class="hero-stack-row"><span>Metod</span><strong>Policy, robusthet och ontologi i ett delat theater state</strong></div>
                <div class="hero-stack-row"><span>Mål</span><strong>Nästa våg ska fortfarande kunna mötas med styrka kvar</strong></div>
              </div>

              <div class="backbone-panel">
                <div class="backbone-panel-head">
                  <div class="callout-label">Behåller från första showcasen</div>
                  <div class="backbone-panel-sub">Finalen ska kännas som samma showcase, men komprimerad till problem -> process -> Ghost Feint -> framework.</div>
                </div>
                <div class="backbone-grid">
                  @for (card of backboneCards; track card.title) {
                    <article class="backbone-card">
                      <div class="backbone-card-title">{{ card.title }}</div>
                      <div class="backbone-card-preserved">{{ card.preserved }}</div>
                      <div class="backbone-card-role">{{ card.role }}</div>
                    </article>
                  }
                </div>
              </div>
            </section>
          }

          @case (1) {
            <section class="final-slide">
              <div class="final-slide-eyebrow">{{ slides[1].eyebrow }}</div>
              <h2 class="final-slide-title">{{ slides[1].title }}</h2>
              <p class="final-slide-subtitle">{{ slides[1].subtitle }}</p>

              <div class="process-grid">
                @for (step of processSteps; track step.id; let i = $index) {
                  <article class="process-card">
                    <div class="process-index">0{{ i + 1 }}</div>
                    <div class="process-label">{{ step.label }}</div>
                    <div class="process-description">{{ step.description }}</div>
                  </article>
                }
              </div>

              <div class="callout-strip">
                <div class="callout-block">
                  <div class="callout-label">Kärnpoäng</div>
                  <div class="callout-body">Processen vi förbättrar är inte att titta på en karta. Det är kedjan från sensordata till beslut, rationale och readiness.</div>
                </div>
                <div class="callout-block callout-block-strong">
                  <div class="callout-label">Formulering att bära genom pitchen</div>
                  <div class="callout-body">Vi bygger inte bara en Common Operating Picture. Vi bygger en <strong>Common Action Environment</strong>.</div>
                </div>
              </div>
            </section>
          }

          @case (2) {
            <section class="final-slide">
              <div class="final-slide-eyebrow">{{ slides[2].eyebrow }}</div>
              <h2 class="final-slide-title">{{ slides[2].title }}</h2>
              <p class="final-slide-subtitle">{{ slides[2].subtitle }}</p>

              <div class="stakes-grid">
                @for (card of failureCards; track card.title) {
                  <article class="stakes-card">
                    <div class="stakes-card-title">{{ card.title }}</div>
                    <div class="stakes-card-body">{{ card.body }}</div>
                  </article>
                }
              </div>

              <div class="stakes-summary">
                <div class="callout-label">Det juryn ska känna</div>
                <div class="callout-body">Det här är verksamhetskritiskt eftersom ett dåligt beslut inte bara betyder att ett hot missas. Det kan också betyda att rätt hot stoppas på fel sätt, så att nästa våg möts med tommare magasin, sämre readiness eller fel basbelastning.</div>
              </div>
            </section>
          }

          @case (3) {
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

              <div class="layer-grid">
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
            </section>
          }

          @case (4) {
            <section class="final-slide final-slide-demo">
              <div class="final-slide-eyebrow">{{ slides[4].eyebrow }}</div>
              <h2 class="final-slide-title">{{ slides[4].title }}</h2>
              <p class="final-slide-subtitle">{{ slides[4].subtitle }}</p>

              <div class="demo-layout">
                <div class="demo-script-panel">
                  <div class="demo-script-header">
                    <div>
                      <div class="demo-script-kicker">Exakt 2-minutersscript</div>
                      <div class="demo-script-title">Bästa live-spåret: Ghost Feint</div>
                    </div>
                    <div class="demo-status-pill">{{ demoSummary().badge }}</div>
                  </div>

                  <div class="demo-step-list">
                    @for (step of demoSteps; track step.id) {
                      <button class="demo-step-btn" type="button" [class.demo-step-btn-active]="activeDemoStep() === step.id" (click)="runDemoStep(step.id)">
                        <div class="demo-step-time">{{ step.time }}</div>
                        <div class="demo-step-copy">
                          <div class="demo-step-label">{{ step.label }}</div>
                          <div class="demo-step-summary">{{ step.summary }}</div>
                        </div>
                      </button>
                    }
                  </div>

                  <div class="demo-script-callout">
                    <div class="callout-label">Säg detta</div>
                    <div class="callout-body">{{ selectedDemoStep().script }}</div>
                  </div>

                  <div class="demo-script-callout demo-script-callout-strong">
                    <div class="callout-label">Varför detta är bästa showcase</div>
                    <div class="callout-body">Det visar att Steel inte bara visualiserar hot, utan ändrar rekommendation när intent skiftar. Det är den tydligaste demonstrationen av policy, robusthet och ontologi i samma loop.</div>
                  </div>
                </div>

                <div class="demo-live-panel">
                  <div class="demo-live-grid">
                    <div class="demo-live-card demo-live-map">
                      <div class="demo-live-label">Tactical COP</div>
                      <div class="demo-live-embed">
                        <app-tactical-console></app-tactical-console>
                      </div>
                    </div>

                    <div class="demo-live-stack">
                      <div class="demo-live-card">
                        <div class="demo-live-label">Threat Inspector</div>
                        <div class="demo-live-embed demo-live-embed-scroll">
                          <app-threat-inspector></app-threat-inspector>
                        </div>
                      </div>

                      <div class="demo-live-card">
                        <div class="demo-live-label">COA Recommendation</div>
                        <div class="demo-live-embed demo-live-embed-scroll">
                          <app-tactical-recommendations></app-tactical-recommendations>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="demo-summary-card">
                    <div class="demo-summary-head">
                      <div>
                        <div class="demo-summary-kicker">Aktiv demofas</div>
                        <div class="demo-summary-title">{{ demoSummary().title }}</div>
                      </div>
                      <div class="demo-summary-status">{{ demoStatus() }}</div>
                    </div>
                    <div class="demo-summary-body">{{ demoSummary().body }}</div>

                    <div class="demo-metric-grid">
                      @for (metric of demoSummary().metrics; track metric.label) {
                        <div class="demo-metric-card">
                          <div class="demo-metric-label">{{ metric.label }}</div>
                          <div class="demo-metric-value">{{ metric.value }}</div>
                          <div class="demo-metric-detail">{{ metric.detail }}</div>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              </div>
            </section>
          }

          @case (5) {
            <section class="final-slide">
              <div class="final-slide-eyebrow">{{ slides[5].eyebrow }}</div>
              <h2 class="final-slide-title">{{ slides[5].title }}</h2>
              <p class="final-slide-subtitle">{{ slides[5].subtitle }}</p>

              <div class="comparison-table">
                <div class="comparison-head">Före deception</div>
                <div class="comparison-head">Efter deception</div>
                @for (row of comparisonRows; track row.before) {
                  <div class="comparison-cell comparison-cell-before">{{ row.before }}</div>
                  <div class="comparison-cell comparison-cell-after">{{ row.after }}</div>
                }
              </div>

              <div class="callout-strip">
                <div class="callout-block callout-block-strong">
                  <div class="callout-label">Det juryn ska ta med sig</div>
                  <div class="callout-body">Ni såg inte bara en färgförändring på kartan. Ni såg en beslutskedja som ändrade sig när verkligheten ändrades.</div>
                </div>
              </div>
            </section>
          }

          @case (6) {
            <section class="final-slide">
              <div class="final-slide-eyebrow">{{ slides[6].eyebrow }}</div>
              <h2 class="final-slide-title">{{ slides[6].title }}</h2>
              <p class="final-slide-subtitle">{{ slides[6].subtitle }}</p>

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

              <div class="callout-strip">
                <div class="callout-block">
                  <div class="callout-label">Varför det går att skala</div>
                  <div class="callout-body">Utan ontologi får man fem vyer. Med ontologi får man ett beslutssystem.</div>
                </div>
                <div class="callout-block callout-block-strong">
                  <div class="callout-label">Det vi behåller här</div>
                  <div class="callout-body">Det här är direkt ryggraden från första showcasen: delad theatre state, fem domäner, knowledge graph och samma semantik mellan ytor.</div>
                </div>
              </div>
            </section>
          }

          @case (7) {
            <section class="final-slide final-slide-close">
              <div class="final-slide-eyebrow">{{ slides[7].eyebrow }}</div>
              <h2 class="final-slide-title">{{ slides[7].title }}</h2>
              <p class="final-slide-subtitle">{{ slides[7].subtitle }}</p>

              <div class="future-grid">
                @for (point of futurePoints; track point) {
                  <article class="future-card">{{ point }}</article>
                }
              </div>

              <div class="callout-strip">
                <div class="callout-block">
                  <div class="callout-label">Vad vi behåller</div>
                  <div class="callout-body">Intro, operatörsflöde, COA, kontrafaktisk validering, delad theatre state, fem domäner, knowledge graph och slutsats.</div>
                </div>
                <div class="callout-block callout-block-strong">
                  <div class="callout-label">Vad vi ändrar</div>
                  <div class="callout-body">Finalen känns inte som en rundtur i systemet. Den känns som ett problem, en process, ett intent-skifte och en skalbar beslutslösning.</div>
                </div>
              </div>

              <div class="close-pillars">
                @for (point of closePoints; track point) {
                  <div class="close-pillar">{{ point }}</div>
                }
              </div>

              <div class="hero-quote-card hero-quote-card-final">
                Steel förbättrar processen från sensortrigger till förklarat verkansbeslut genom att samla threat, base, effector, policy, logistics och readiness i samma Boreal Decision Twin, så att operatören kan agera snabbare, mer rationellt och med förmåga kvar till nästa våg.
              </div>

              <div class="final-cta-row">
                <a routerLink="/showcase" class="final-secondary-btn">Öppna originalshowcase</a>
                <a routerLink="/" class="final-exit-btn">Tillbaka till systemet</a>
              </div>
            </section>
          }
        }
      </main>

      <nav class="final-nav">
        <button class="final-nav-arrow" type="button" [disabled]="currentSlide() === 0" (click)="prev()">‹</button>
        <div class="final-nav-dots">
          @for (slide of slides; track slide.title; let i = $index) {
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
      --s-amber: #f59e0b;
      --s-red: #ef4444;
      --s-border: rgba(148, 189, 255, 0.12);
      --s-panel: rgba(7, 14, 23, 0.86);
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
      gap: 8px;
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

    .final-exit-btn:hover {
      opacity: 0.92;
    }

    .final-showcase-main {
      position: relative;
      z-index: 1;
      flex: 1;
      min-height: 0;
      overflow: hidden;
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

    .final-hero-subtitle,
    .final-slide-subtitle {
      margin: 0;
      max-width: 70rem;
      color: var(--s-muted);
      line-height: 1.7;
    }

    .final-hero-subtitle {
      font-size: 18px;
      max-width: 52rem;
    }

    .final-slide-subtitle {
      font-size: 14px;
    }

    .final-hero-tagline {
      font-size: 14px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.22em;
      color: var(--s-green);
    }

    .hero-quote-card,
    .stakes-summary,
    .demo-script-callout,
    .demo-summary-card,
    .callout-block {
      padding: 18px 20px;
      border-radius: 14px;
      border: 1px solid rgba(92, 167, 255, 0.16);
      background: rgba(92, 167, 255, 0.05);
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

    .hero-chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .hero-chip {
      padding: 8px 14px;
      border-radius: 999px;
      border: 1px solid var(--s-border);
      background: rgba(255, 255, 255, 0.03);
      font-size: 12px;
      color: var(--s-text);
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

    .hero-stack-row span {
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: var(--s-blue);
    }

    .hero-stack-row strong {
      font-size: 14px;
      line-height: 1.6;
      color: var(--s-text);
    }

    .backbone-panel {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 18px 20px;
      border-radius: 14px;
      border: 1px solid rgba(124, 224, 190, 0.14);
      background: rgba(124, 224, 190, 0.04);
      max-width: 72rem;
    }

    .backbone-panel-head {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .backbone-panel-sub {
      font-size: 14px;
      line-height: 1.6;
      color: var(--s-muted);
    }

    .backbone-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .backbone-card {
      padding: 14px 16px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(255, 255, 255, 0.03);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .backbone-card-title {
      font-size: 12px;
      font-weight: 800;
      color: var(--s-text);
    }

    .backbone-card-preserved {
      font-size: 12px;
      line-height: 1.55;
      color: var(--s-green);
    }

    .backbone-card-role {
      font-size: 11px;
      line-height: 1.55;
      color: var(--s-muted);
    }

    .ontology-summary-panel {
      padding: 18px 20px;
      border-radius: 14px;
      border: 1px solid rgba(92, 167, 255, 0.16);
      background: rgba(92, 167, 255, 0.05);
      max-width: 72rem;
    }

    .process-grid,
    .stakes-grid,
    .layer-grid,
    .ontology-model-grid,
    .domain-grid,
    .future-grid,
    .close-pillars,
    .demo-metric-grid {
      display: grid;
      gap: 14px;
    }

    .process-grid {
      grid-template-columns: repeat(7, minmax(0, 1fr));
    }

    .stakes-grid,
    .layer-grid,
    .ontology-model-grid,
    .future-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .domain-grid {
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }

    .close-pillars,
    .demo-metric-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .process-card,
    .stakes-card,
    .layer-card,
    .ontology-model-card,
    .domain-card,
    .future-card,
    .close-pillar,
    .demo-metric-card {
      border-radius: 12px;
      border: 1px solid var(--s-border);
      background: rgba(255, 255, 255, 0.03);
    }

    .process-card,
    .stakes-card,
    .layer-card,
    .ontology-model-card,
    .domain-card,
    .future-card,
    .demo-metric-card {
      padding: 16px;
    }

    .process-index {
      font-size: 11px;
      font-weight: 900;
      font-family: monospace;
      color: var(--s-blue);
      margin-bottom: 12px;
    }

    .process-label,
    .stakes-card-title,
    .layer-card-title,
    .ontology-model-title,
    .domain-card-title {
      font-size: 13px;
      font-weight: 800;
      color: var(--s-text);
      margin-bottom: 8px;
    }

    .process-description,
    .stakes-card-body,
    .layer-card-summary,
    .ontology-model-lead,
    .domain-card-body,
    .future-card,
    .demo-metric-detail {
      font-size: 12px;
      line-height: 1.65;
      color: var(--s-muted);
    }

    .ontology-model-card {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .ontology-model-chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .ontology-model-chip {
      padding: 7px 10px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(255, 255, 255, 0.04);
      color: var(--s-green);
      font-size: 10px;
      font-weight: 700;
    }

    .callout-strip {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .callout-block {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .callout-block-strong,
    .demo-script-callout-strong {
      border-color: rgba(124, 224, 190, 0.18);
      background: rgba(124, 224, 190, 0.05);
    }

    .callout-label,
    .demo-script-kicker,
    .demo-summary-kicker {
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: var(--s-blue);
    }

    .callout-body,
    .demo-summary-body {
      font-size: 14px;
      line-height: 1.7;
      color: var(--s-text);
    }

    .stakes-summary .callout-body {
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

    .layer-items {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
    }

    .layer-item,
    .close-pillar {
      padding: 8px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      color: var(--s-text);
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .final-slide-demo {
      gap: 18px;
    }

    .demo-layout {
      display: grid;
      grid-template-columns: minmax(340px, 420px) minmax(0, 1fr);
      gap: 18px;
      min-height: 0;
      flex: 1;
    }

    .demo-script-panel,
    .demo-live-panel {
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .demo-script-panel {
      padding: 16px;
      border-radius: 16px;
      border: 1px solid var(--s-border);
      background: rgba(7, 14, 23, 0.82);
      overflow-y: auto;
    }

    .demo-script-header,
    .demo-summary-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .demo-script-title,
    .demo-summary-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--s-text);
    }

    .demo-status-pill,
    .demo-summary-status {
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(92, 167, 255, 0.12);
      color: var(--s-blue);
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      text-align: right;
    }

    .demo-step-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .demo-step-btn {
      display: grid;
      grid-template-columns: 92px 1fr;
      gap: 12px;
      align-items: start;
      text-align: left;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid var(--s-border);
      background: rgba(255, 255, 255, 0.03);
      color: inherit;
      cursor: pointer;
      transition: all 0.2s;
    }

    .demo-step-btn:hover,
    .demo-step-btn-active {
      border-color: rgba(92, 167, 255, 0.34);
      background: rgba(92, 167, 255, 0.08);
    }

    .demo-step-time {
      font-size: 10px;
      font-family: monospace;
      color: var(--s-blue);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .demo-step-copy {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .demo-step-label {
      font-size: 13px;
      font-weight: 700;
      color: var(--s-text);
    }

    .demo-step-summary {
      font-size: 11px;
      line-height: 1.55;
      color: var(--s-muted);
    }

    .demo-live-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.8fr);
      gap: 14px;
      min-height: 0;
      flex: 1;
    }

    .demo-live-map,
    .demo-live-stack {
      min-height: 0;
    }

    .demo-live-stack {
      display: grid;
      gap: 14px;
      grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
    }

    .demo-live-card {
      display: flex;
      flex-direction: column;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid var(--s-border);
      background: rgba(7, 14, 23, 0.82);
      min-height: 0;
    }

    .demo-live-label {
      padding: 8px 12px;
      border-bottom: 1px solid var(--s-border);
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: var(--s-blue);
      background: rgba(92, 167, 255, 0.06);
      flex-shrink: 0;
    }

    .demo-live-embed {
      flex: 1;
      min-height: 0;
      overflow: hidden;
      background: #050b12;
    }

    .demo-live-embed-scroll {
      overflow-y: auto;
    }

    .comparison-table {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      border: 1px solid var(--s-border);
      border-radius: 14px;
      overflow: hidden;
    }

    .comparison-head,
    .comparison-cell {
      padding: 14px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }

    .comparison-head {
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: var(--s-muted);
      background: rgba(255, 255, 255, 0.03);
    }

    .comparison-cell {
      font-size: 14px;
      color: var(--s-text);
    }

    .comparison-cell-before {
      background: rgba(245, 158, 11, 0.04);
    }

    .comparison-cell-after {
      background: rgba(92, 167, 255, 0.05);
      color: var(--s-green);
    }

    .future-card {
      display: flex;
      align-items: stretch;
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
      transition: all 0.2s;
    }

    .final-nav-arrow:hover:not(:disabled) {
      color: var(--s-text);
      border-color: rgba(148, 189, 255, 0.3);
      background: rgba(255, 255, 255, 0.05);
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
      transition: all 0.2s;
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
      font-family: monospace;
    }

    .demo-metric-label {
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: var(--s-blue);
      margin-bottom: 6px;
    }

    .demo-metric-value {
      font-size: 22px;
      line-height: 1;
      font-family: monospace;
      color: var(--s-text);
      margin-bottom: 10px;
    }

    @media (max-width: 1500px) {
      .process-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .backbone-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .domain-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .close-pillars,
      .demo-metric-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 1180px) {
      .final-slide {
        padding: 28px 24px 110px;
      }

      .stakes-grid,
      .layer-grid,
      .ontology-model-grid,
      .future-grid,
      .callout-strip,
      .demo-layout,
      .demo-live-grid,
      .domain-grid {
        grid-template-columns: 1fr;
      }

      .process-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .layer-rail {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        border-radius: 16px;
      }

      .hero-stack-row {
        grid-template-columns: 1fr;
      }

      .demo-live-stack {
        grid-template-rows: minmax(260px, 1fr) minmax(260px, 1fr);
      }

      .comparison-table {
        grid-template-columns: 1fr;
      }

      .comparison-head:nth-child(2) {
        border-top: 1px solid rgba(255, 255, 255, 0.04);
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

      .process-grid,
      .backbone-grid,
      .close-pillars,
      .demo-metric-grid {
        grid-template-columns: 1fr;
      }

      .demo-step-btn {
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
  readonly failureCards = FAILURE_CARDS;
  readonly layerCards = LAYER_CARDS;
  readonly demoSteps = DEMO_STEPS;
  readonly comparisonRows = COMPARISON_ROWS;
  readonly backboneCards = BACKBONE_CARDS;
  readonly domainCards = DOMAIN_CARDS;
  readonly ontologyModelGroups = ONTOLOGY_MODEL_GROUPS;
  readonly futurePoints = FUTURE_POINTS;
  readonly closePoints = CLOSE_POINTS;

  readonly currentSlide = signal(0);
  readonly activeDemoStep = signal<DemoStep['id']>('reset');
  readonly demoStatus = signal('Redo för Ghost Feint-demot.');
  readonly demoSummary = computed(() => DEMO_SUMMARIES[this.activeDemoStep()]);
  readonly selectedDemoStep = computed(() => this.demoSteps.find(step => step.id === this.activeDemoStep()) ?? this.demoSteps[0]);

  goTo(index: number): void {
    if (index < 0 || index >= this.slides.length) return;
    this.currentSlide.set(index);
  }

  next(): void {
    if (this.currentSlide() < this.slides.length - 1) {
      this.currentSlide.update(value => value + 1);
    }
  }

  prev(): void {
    if (this.currentSlide() > 0) {
      this.currentSlide.update(value => value - 1);
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
      error: () => this.demoStatus.set('Baseline lokalt återställd. API svarade inte, men scriptet kan fortfarande användas.'),
    });
  }

  private loadGhostFeint(): void {
    this.scenario.setPhase('phase-2');
    this.scenario.setScenarioName('Ghost Feint');
    this.policy.updateWeights({ safety: 0.5, sustainability: 0.6, resilience: 0.6 });
    this.api.loadScenario('ghost-feint').subscribe({
      next: () => this.demoStatus.set('Ghost Feint laddad. Probe/feint-läsning med låg initial threat value är aktiv.'),
      error: () => this.demoStatus.set('Ghost Feint kunde inte laddas från API. Använd talk track och befintlig state som fallback.'),
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
      error: () => this.demoStatus.set('Jamming kunde inte injiceras via API. Fortsätt scriptet med osäkerhet som verbal cue.'),
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
