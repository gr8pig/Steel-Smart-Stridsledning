import {
  Component, ChangeDetectionStrategy, signal, computed,
  OnInit, OnDestroy, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { KnowledgeGraphViewerComponent } from '../shared/ui/knowledge-graph-viewer/knowledge-graph-viewer.component';

// ─── Console log lines per slide ─────────────────────────────────────────────

const CONSOLE_SEQUENCES: string[][] = [
  // Slide 0 – Welcome
  [
    '> Initierar Boreal Decision Twin v2.4.1...',
    '> Laddar ML-modeller: mistral-large-2411 [OK]',
    '> Ansluter till teaterflöde via WebSocket...',
    '> Synkroniserar baslägen × 5 [OK]',
    '> Stridsledningssystem: REDO',
  ],
  // Slide 1 – Borealis Sund map
  [
    '> Scenario 1: Marinträssning Borealis Sund',
    '> Hotdetektering: 3 ytfarkoster klassificerade',
    '> Intent-estimering: FEINT 68%, STRIKE 22%...',
    '> Kör COA-lösare: 3 alternativ genererade',
    '> Rekommendation: COA-BAL [conf=0.81]',
    '> Scenario 2: Missilsalva – 7 spår detekterade',
    '> Interceptor-allokering: 14 missiler [READY]',
    '> Scenario 3: Kombinerat anfall – AI-analys...',
    '> Beslutsstödssvar: 142 ms (OpenRouter)',
  ],
  // Slide 2 – AI Decision Support
  [
    '> POST /api/coa/solve  [200 OK | 108ms]',
    '> Viktning: Hållbarhet=0.62 Förmåga=0.38',
    '> Pareto-front: 3 icke-dominerade COA:er',
    '> COA-MAX: intercept=94% beredskap=38%',
    '> COA-BAL: intercept=81% beredskap=61%',
    '> COA-DST: intercept=71% beredskap=91%',
    '> Rationale genererad via Mistral-large-2411',
    '> HITL-godkännande begärt: operator väntar...',
  ],
  // Slide 3 – Drawing Board
  [
    '> Ritbordsmodul initierad',
    '> Enhet placerad: SHIP_DESTROYER [BLUE] @ (835,630)',
    '> Waypoints lagda: 4 punkter',
    '> Rörelsesimulering: 2.3 knop, 47s till mål',
    '> Kollisionskontroll: KLAR',
    '> Exporterar manöverplan till C2-systemet...',
    '> Plan godkänd av befälhavaren [SEMI-AUTO]',
  ],
  // Slide 4 – ML Infrastructure
  [
    '> ML-stack: 100% öppen källkod',
    '> Modell: Mistral-large-2411 (Paris, Frankrike)',
    '> Inferens: RunPod EU (GDPR-kompatibel)',
    '> Alternativ: lokal deploy @ NCS Linköping',
    '> GPU-krav: A100 40GB / H100 (vHPT)',
    '> Latens lokal: ~80ms | Remote: ~140ms',
    '> Driftsäkerhet: air-gapped möjlig',
    '> Licens: Apache 2.0 + Mistral AI Commercial',
  ],
  // Slide 5 – Governance
  [
    '> Styrningsläge: HITL (manuellt godkännande)',
    '> Auktoritetsnivå: OPERATOR → BEFÄLHAVARE',
    '> Revisionsspår: 847 händelser loggas',
    '> Beslutssäker: rationale knyts till COA-val',
    '> Policy-kongruens: 0.94 [GRÖN]',
    '> Förtroendepoäng: 0.87 ↑ (senaste 10 min)',
    '> Regelefterlevnad: NATO STANAG 4586 [OK]',
  ],
  // Slide 6 – Knowledge Graph
  [
    '> Laddar plattformsgraf: 89 noder',
    '> WebGL-renderer: Three.js r165 [OK]',
    '> Bloom-pass aktiv: UnrealBloomPass',
    '> Dataflödespartiklar: 30/kant [OK]',
    '> Kategorier: UI · State · Service · ML · Docs',
    '> Nodkluster: 6 plattformsområden identifierade',
    '> Grafen uppdateras vid varje commit automatiskt',
  ],
  // Slide 7 – Summary
  [
    '> BDT SYSTEMÖVERSIKT KOMPLETT',
    '> Moduler: 14 aktiva vyer',
    '> API-slutpunkter: 13 REST + 1 WebSocket',
    '> ML-svarstid: Ø 127ms',
    '> Beredskapsvinst vs. äldre system: +54pp',
    '> Öppen källkod · Europeisk · NCS-kapabel',
    '> Team Steel | Saab Hackathon 2025',
    '> BDT är redo för operativ validering.',
  ],
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
    subtitle: 'AI-driven stridsledning för framtidens försvar',
  },
  {
    id: 'map',
    eyebrow: 'Situationsmedvetenhet',
    title: 'Borealis Sund',
    subtitle: 'Realtids lägesbild med hotbedömning och intentanalys',
  },
  {
    id: 'ai',
    eyebrow: 'Beslutsstöd',
    title: 'AI-driven COA-analys',
    subtitle: 'Pareto-optimal manöverplanering med förklarbar AI',
  },
  {
    id: 'board',
    eyebrow: 'Operationsplanering',
    title: 'Ritbordet',
    subtitle: 'Interaktiv manöverplanering med rörelsesimulering',
  },
  {
    id: 'ml',
    eyebrow: 'Teknisk infrastruktur',
    title: 'Öppen källkod · Europeisk',
    subtitle: 'Driftsäker ML-stack hostbar vid NCS i Linköping',
  },
  {
    id: 'governance',
    eyebrow: 'Styrning & Kontroll',
    title: 'HITL-auktoritet',
    subtitle: 'Operator-i-loopen med fullständigt revisionsspår',
  },
  {
    id: 'kg',
    eyebrow: 'Plattformsarkitektur',
    title: 'Kunskapsgraf',
    subtitle: 'Interaktiv 3D-karta över plattformens alla komponenter och kopplingar',
  },
  {
    id: 'summary',
    eyebrow: 'Systemöversikt',
    title: 'BDT är redo',
    subtitle: 'Komplett plattform för AI-stödd stridsledning',
  },
];

// ─── Map scenario data ────────────────────────────────────────────────────────

interface MapTrack { id: string; x: number; y: number; tx: number; ty: number; type: 'missile' | 'ship' | 'air'; }

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
  // Scenario 3 – Combined arms
  [
    { id: 'C1', x: 400, y: 1000, tx: 380, ty: 450, type: 'ship' },
    { id: 'C2', x: 900, y: 950, tx: 850, ty: 420, type: 'ship' },
    { id: 'C3', x: 600, y: 1080, tx: 580, ty: 200, type: 'missile' },
    { id: 'C4', x: 1100, y: 850, tx: 1050, ty: 340, type: 'air' },
    { id: 'C5', x: 1350, y: 900, tx: 1300, ty: 250, type: 'air' },
  ],
];

const SCENARIO_LABELS = [
  'Scenario 1: Marinträssning',
  'Scenario 2: Missilsalva',
  'Scenario 3: Kombinerat anfall',
];

// ─── COA data for slide 3 ─────────────────────────────────────────────────────

const COAS = [
  { id: 'COA-MAX', label: 'Maximal Bekämpning', intercept: 94, readiness: 38, robustness: 0.61, color: '#ef4444' },
  { id: 'COA-BAL', label: 'Balanserad', intercept: 81, readiness: 61, robustness: 0.79, color: '#5ca7ff', selected: true },
  { id: 'COA-DST', label: 'Djup Hållbarhet', intercept: 71, readiness: 91, robustness: 0.91, color: '#7ce0be' },
];

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
          <div class="w-chip"><span class="w-chip-dot blue"></span>AI-driven beslutsoptimering</div>
          <div class="w-chip"><span class="w-chip-dot green"></span>Öppen källkod · Europeisk stack</div>
          <div class="w-chip"><span class="w-chip-dot purple"></span>HITL styrning och auktoritet</div>
          <div class="w-chip"><span class="w-chip-dot amber"></span>Driftsättbar i Linköping vid NCS</div>
        </div>

        <div class="welcome-stack">
          <div class="stack-row">
            <span class="stack-label">Frontend</span>
            <span class="stack-value">Angular 21 SSR · TailwindCSS · NgRx Signals</span>
          </div>
          <div class="stack-row">
            <span class="stack-label">Backend</span>
            <span class="stack-value">FastAPI · Python · Express SSR</span>
          </div>
          <div class="stack-row">
            <span class="stack-label">ML-modell</span>
            <span class="stack-value">Mistral-large-2411 (FR) · OpenRouter · RunPod EU</span>
          </div>
          <div class="stack-row">
            <span class="stack-label">Simulering</span>
            <span class="stack-value">Twin Engine · Red Adversary · Command Friction</span>
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

          <div class="scenario-tabs">
            @for (s of scenarioLabels; track $index) {
              <button class="s-tab" [class.active]="mapScenario() === $index" (click)="mapScenario.set($index)">
                <span class="s-tab-num">{{ $index + 1 }}</span>
                <span class="s-tab-label">{{ s }}</span>
              </button>
            }
          </div>

          <div class="map-legend">
            <div class="legend-row"><span class="legend-dot blue"></span> Egna styrkor (blå)</div>
            <div class="legend-row"><span class="legend-dot red"></span> Hotsignatur (röd)</div>
            <div class="legend-row"><span class="legend-dot amber"></span> Sensorräckvidd</div>
            <div class="legend-row"><span class="legend-dot white"></span> Intresse-zon (IFZ)</div>
          </div>

          <div class="map-stats">
            <div class="stat"><span class="stat-v">{{ currentScenario().length }}</span><span class="stat-l">Detekterade hot</span></div>
            <div class="stat"><span class="stat-v stat-g">0.81</span><span class="stat-l">Beslutssäkerhet</span></div>
            <div class="stat"><span class="stat-v stat-a">127ms</span><span class="stat-l">AI-svarstid</span></div>
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

            <!-- Threat tracks -->
            @for (track of currentScenario(); track track.id) {
              <!-- IFZ circle -->
              <circle
                [attr.cx]="track.x" [attr.cy]="track.y" r="55"
                fill="rgba(239,68,68,0.04)" stroke="rgba(239,68,68,0.35)" stroke-width="0.8" stroke-dasharray="4,3"
                class="track-pulse"
              />
              <!-- Track path (faint) -->
              <line
                [attr.x1]="track.x" [attr.y1]="track.y" [attr.x2]="track.tx" [attr.y2]="track.ty"
                stroke="rgba(239,68,68,0.25)" stroke-width="1" stroke-dasharray="6,4"
              />
              <!-- Intercept dot -->
              <circle [attr.cx]="track.tx" [attr.cy]="track.ty" r="4" fill="rgba(92,167,255,0.6)"/>
              <!-- Threat icon -->
              <g [attr.transform]="'translate('+track.x+','+track.y+')'" class="track-move" filter="url(#sc-glow-r)">
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
                <circle [attr.r]="coa.selected ? 9 : 6" [attr.fill]="coa.color" [attr.fill-opacity]="coa.selected ? 0.9 : 0.5" [attr.stroke]="coa.color" stroke-width="1.5"/>
                @if (coa.selected) {
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
            <div class="coa-card" [class.coa-selected]="coa.selected">
              <div class="coa-top">
                <span class="coa-id" [style.color]="coa.color">{{ coa.id }}</span>
                @if (coa.selected) {
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
          <div class="card-label">Motivering — Mistral-large-2411</div>
          <p class="rationale-text">
            COA-BAL väljs eftersom den bevarar 61% beredskap över Wave-2 horisonten — kritiskt givet att äldre eldledningssystem saknar förmåga att modellera fleromgångstrajektorier. Maximalt engagemang (COA-MAX) ger 94% bekämpningseffekt men reducerar beredskapen till 38%, vilket innebär hög sårbarhet vid en uppföljande salva. Djup Hållbarhet (COA-DST) accepterar två genomträngningsrisker för att säkerställa 91% reservkapacitet — ett rimligt val om operatören bedömer Wave-2 som sannolik.
          </p>
          <div class="rationale-meta">
            <span class="r-tag">Modell: mistral/mistral-large-2411</span>
            <span class="r-tag">Via: OpenRouter</span>
            <span class="r-tag">Latens: 142ms</span>
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

          <div class="board-features">
            <div class="board-feat">
              <div class="feat-icon">◈</div>
              <div class="feat-text">
                <div class="feat-title">11 enhetstyper</div>
                <div class="feat-sub">Mark · Naval · Luftstridskrafter</div>
              </div>
            </div>
            <div class="board-feat">
              <div class="feat-icon">⊡</div>
              <div class="feat-text">
                <div class="feat-title">Rörelseplanering</div>
                <div class="feat-sub">Waypoints med interpolerad rörelse</div>
              </div>
            </div>
            <div class="board-feat">
              <div class="feat-icon">▷</div>
              <div class="feat-text">
                <div class="feat-title">Uppspelningssimulering</div>
                <div class="feat-sub">0.5× – 4× hastighet, scrubber</div>
              </div>
            </div>
            <div class="board-feat">
              <div class="feat-icon">⬡</div>
              <div class="feat-text">
                <div class="feat-title">Röd vs. Blå sidor</div>
                <div class="feat-sub">Scenariobygge med motståndarsida</div>
              </div>
            </div>
            <div class="board-feat">
              <div class="feat-icon">⊕</div>
              <div class="feat-text">
                <div class="feat-title">Exportera till C2</div>
                <div class="feat-sub">Manöverplan publiceras till befälhavare</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Board mini demo SVG -->
        <div class="board-demo-container">
          <div class="board-demo-label">RITBORD — BOREALIS SUND · SCENARIO 3</div>
          <svg viewBox="0 0 1670 1300" preserveAspectRatio="xMidYMid slice" class="board-svg">
            <!-- Terrain -->
            <polygon [attr.points]="terrain.north" fill="rgba(92,167,255,0.05)" stroke="rgba(92,167,255,0.15)" stroke-width="1.5"/>
            <polygon [attr.points]="terrain.south" fill="rgba(239,68,68,0.04)" stroke="rgba(239,68,68,0.12)" stroke-width="1.5"/>
            <polygon [attr.points]="terrain.islandWest" fill="rgba(92,167,255,0.07)" stroke="rgba(92,167,255,0.2)" stroke-width="1"/>
            <polygon [attr.points]="terrain.islandEast" fill="rgba(92,167,255,0.07)" stroke="rgba(92,167,255,0.2)" stroke-width="1"/>
            <polygon [attr.points]="terrain.southFwd" fill="rgba(239,68,68,0.06)" stroke="rgba(239,68,68,0.15)" stroke-width="1"/>

            <text x="835" y="720" text-anchor="middle" font-size="22" font-family="monospace" fill="rgba(156,176,199,0.2)" font-weight="bold" letter-spacing="8">BOREALIS SUND</text>

            <!-- Blue destroyer with waypoints -->
            <polyline points="500,620 600,550 750,480 900,430" fill="none" stroke="rgba(92,167,255,0.5)" stroke-width="2" stroke-dasharray="8,5"/>
            <!-- Blue ship 1 -->
            <g transform="translate(500,620)">
              <rect x="-10" y="-6" width="20" height="12" rx="2" fill="rgba(92,167,255,0.25)" stroke="#5ca7ff" stroke-width="1.5"/>
              <line x1="0" y1="-6" x2="0" y2="-14" stroke="#5ca7ff" stroke-width="1.5"/>
              <circle r="3" fill="#5ca7ff"/>
            </g>
            <!-- Waypoint dots blue -->
            @for (wp of [[600,550],[750,480],[900,430]]; track $index) {
              <circle [attr.cx]="wp[0]" [attr.cy]="wp[1]" r="4" fill="none" stroke="rgba(92,167,255,0.6)" stroke-width="1.5"/>
              <circle [attr.cx]="wp[0]" [attr.cy]="wp[1]" r="1.5" fill="rgba(92,167,255,0.8)"/>
            }

            <!-- Blue aircraft with path -->
            <polyline points="1158,385 1050,340 900,290 750,260" fill="none" stroke="rgba(124,224,190,0.4)" stroke-width="2" stroke-dasharray="8,5"/>
            <g transform="translate(1158,385)">
              <path d="M0,-11 L7,5 L0,1 L-7,5 Z" fill="rgba(124,224,190,0.25)" stroke="#7ce0be" stroke-width="1.5"/>
              <line x1="-9" y1="0" x2="9" y2="0" stroke="#7ce0be" stroke-width="1.5"/>
            </g>

            <!-- Red ship threat from south -->
            <polyline points="900,980 880,860 860,720" fill="none" stroke="rgba(239,68,68,0.4)" stroke-width="2" stroke-dasharray="8,5"/>
            <g transform="translate(900,980)">
              <rect x="-10" y="-6" width="20" height="12" rx="2" fill="rgba(239,68,68,0.25)" stroke="#ef4444" stroke-width="1.5"/>
              <line x1="0" y1="-6" x2="0" y2="-14" stroke="#ef4444" stroke-width="1.5"/>
            </g>

            <!-- Mode indicator -->
            <rect x="30" y="30" width="120" height="24" rx="3" fill="rgba(92,167,255,0.1)" stroke="rgba(92,167,255,0.3)" stroke-width="1"/>
            <text x="90" y="46" text-anchor="middle" font-size="9" fill="#5ca7ff" font-family="monospace" font-weight="bold">WAYPOINT-LÄGE</text>
          </svg>
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

      <div class="ml-grid">
        <!-- Open source stack -->
        <div class="ml-card ml-card-primary">
          <div class="ml-card-header">
            <span class="ml-icon">⊚</span>
            <span class="ml-card-title">Öppen Källkod</span>
          </div>
          <div class="ml-stack-list">
            <div class="ml-stack-item">
              <span class="ml-lib">Mistral AI</span><span class="ml-lic apache">Apache 2.0</span>
            </div>
            <div class="ml-stack-item">
              <span class="ml-lib">FastAPI</span><span class="ml-lic mit">MIT</span>
            </div>
            <div class="ml-stack-item">
              <span class="ml-lib">Angular</span><span class="ml-lic mit">MIT</span>
            </div>
            <div class="ml-stack-item">
              <span class="ml-lib">Python 3.12</span><span class="ml-lic apache">PSF</span>
            </div>
            <div class="ml-stack-item">
              <span class="ml-lib">RunPod SDK</span><span class="ml-lic mit">MIT</span>
            </div>
          </div>
          <p class="ml-card-note">Inga proprietära beroenden. Full källkodstillgång.</p>
        </div>

        <!-- European provenance -->
        <div class="ml-card">
          <div class="ml-card-header">
            <span class="ml-icon">⊛</span>
            <span class="ml-card-title">Europeisk Härkomst</span>
          </div>
          <div class="ml-flag-row">
            <div class="ml-flag-item">
              <div class="ml-flag fr">FR</div>
              <div class="ml-flag-text">
                <div class="ml-flag-name">Mistral AI</div>
                <div class="ml-flag-sub">Paris · GDPR-kompatibel</div>
              </div>
            </div>
            <div class="ml-flag-item">
              <div class="ml-flag eu">EU</div>
              <div class="ml-flag-text">
                <div class="ml-flag-name">RunPod Europa</div>
                <div class="ml-flag-sub">Datacenter inom EU</div>
              </div>
            </div>
            <div class="ml-flag-item">
              <div class="ml-flag se">SE</div>
              <div class="ml-flag-text">
                <div class="ml-flag-name">NCS Linköping</div>
                <div class="ml-flag-sub">Lokal deploy möjlig</div>
              </div>
            </div>
          </div>
          <p class="ml-card-note">Data lämnar aldrig EU-jurisdiktion utan tillstånd.</p>
        </div>

        <!-- NCS deployment -->
        <div class="ml-card ml-card-highlight">
          <div class="ml-card-header">
            <span class="ml-icon">⊟</span>
            <span class="ml-card-title">NCS Linköping — Lokal Deploy</span>
          </div>
          <div class="ncs-specs">
            <div class="ncs-spec"><span class="ncs-k">GPU</span><span class="ncs-v">A100 40GB / H100 SXM5</span></div>
            <div class="ncs-spec"><span class="ncs-k">Inferenslatens</span><span class="ncs-v">~80ms (lokal)</span></div>
            <div class="ncs-spec"><span class="ncs-k">Air-gap</span><span class="ncs-v">Fullt stödd</span></div>
            <div class="ncs-spec"><span class="ncs-k">Modellformat</span><span class="ncs-v">GGUF / vLLM</span></div>
            <div class="ncs-spec"><span class="ncs-k">Kryptering</span><span class="ncs-v">TLS 1.3 + HMAC-SHA256</span></div>
          </div>
          <div class="ncs-badge">Operativt redo för NCS-infrastruktur</div>
        </div>

        <!-- Latency comparison -->
        <div class="ml-card">
          <div class="ml-card-header">
            <span class="ml-icon">◷</span>
            <span class="ml-card-title">Prestandajämförelse</span>
          </div>
          <div class="latency-bars">
            <div class="lat-row">
              <span class="lat-label">Lokal NCS</span>
              <div class="lat-track"><div class="lat-fill" style="width:30%;background:#7ce0be"></div></div>
              <span class="lat-val">~80ms</span>
            </div>
            <div class="lat-row">
              <span class="lat-label">RunPod EU</span>
              <div class="lat-track"><div class="lat-fill" style="width:50%;background:#5ca7ff"></div></div>
              <span class="lat-val">~140ms</span>
            </div>
            <div class="lat-row">
              <span class="lat-label">OpenRouter</span>
              <div class="lat-track"><div class="lat-fill" style="width:55%;background:#9b8cff"></div></div>
              <span class="lat-val">~150ms</span>
            </div>
            <div class="lat-row">
              <span class="lat-label">Äldre system</span>
              <div class="lat-track"><div class="lat-fill" style="width:100%;background:#ef4444"></div></div>
              <span class="lat-val">manuell</span>
            </div>
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
            <div class="auth-level auto">
              <div class="auth-badge">AUTO</div>
              <div class="auth-info">
                <div class="auth-name">HNLT — Automatiskt</div>
                <div class="auth-desc">Systembeslut utan operatörsåtgärd. Lägsta friktionsnivå.</div>
              </div>
            </div>
            <div class="auth-level semi">
              <div class="auth-badge">SEMI</div>
              <div class="auth-info">
                <div class="auth-name">HOTL — Operatör i loopen</div>
                <div class="auth-desc">System rekommenderar. Operatören godkänner innan åtgärd.</div>
              </div>
            </div>
            <div class="auth-level manual active-auth">
              <div class="auth-badge">HITL</div>
              <div class="auth-info">
                <div class="auth-name">HITL — Manuellt ◈ Aktiv</div>
                <div class="auth-desc">Alla engagemang kräver explicit manuellt godkännande.</div>
              </div>
            </div>
          </div>

          <div class="gov-metrics">
            <div class="gov-metric"><span class="gm-v">847</span><span class="gm-l">Auditerade händelser</span></div>
            <div class="gov-metric"><span class="gm-v gm-g">0.94</span><span class="gm-l">Policy-kongruens</span></div>
            <div class="gov-metric"><span class="gm-v gm-b">0.87</span><span class="gm-l">Förtroendepoäng</span></div>
          </div>
        </div>

        <!-- Decision fabric arc gauge -->
        <div class="gov-right">
          <div class="gov-gauge-label">Beslutsfabrik-poäng</div>
          <svg viewBox="0 0 240 180" class="gauge-svg">
            <defs>
              <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#ef4444"/>
                <stop offset="50%" stop-color="#f59e0b"/>
                <stop offset="100%" stop-color="#7ce0be"/>
              </linearGradient>
            </defs>
            <!-- Background arc -->
            <path d="M 30 150 A 90 90 0 0 1 210 150" fill="none" stroke="rgba(156,176,199,0.1)" stroke-width="14" stroke-linecap="round"/>
            <!-- Value arc (87%) -->
            <path d="M 30 150 A 90 90 0 0 1 210 150" fill="none" stroke="url(#gauge-grad)" stroke-width="14" stroke-linecap="round"
                  stroke-dasharray="283" stroke-dashoffset="37"/>
            <!-- Center value -->
            <text x="120" y="138" text-anchor="middle" font-size="32" font-family="monospace" font-weight="bold" fill="#7ce0be">0.87</text>
            <text x="120" y="158" text-anchor="middle" font-size="9" font-family="monospace" fill="rgba(156,176,199,0.7)" letter-spacing="2">BESLUTSFÖRMÅGA</text>
            <!-- Labels -->
            <text x="25" y="168" font-size="8" fill="rgba(239,68,68,0.7)" font-family="monospace">0.0</text>
            <text x="110" y="55" text-anchor="middle" font-size="8" fill="rgba(245,158,11,0.7)" font-family="monospace">0.5</text>
            <text x="205" y="168" text-anchor="end" font-size="8" fill="rgba(124,224,190,0.7)" font-family="monospace">1.0</text>
          </svg>

          <div class="gov-factors">
            <div class="gov-factor">
              <span class="gf-label">Taktisk synkronisering</span>
              <div class="gf-bar"><div class="gf-fill" style="width:88%;background:#5ca7ff"></div></div>
            </div>
            <div class="gov-factor">
              <span class="gf-label">Policy-koherens</span>
              <div class="gf-bar"><div class="gf-fill" style="width:94%;background:#7ce0be"></div></div>
            </div>
            <div class="gov-factor">
              <span class="gf-label">Operatörsbelastning</span>
              <div class="gf-bar"><div class="gf-fill" style="width:72%;background:#f59e0b"></div></div>
            </div>
            <div class="gov-factor">
              <span class="gf-label">Kommandofriktionsindex</span>
              <div class="gf-bar"><div class="gf-fill" style="width:81%;background:#9b8cff"></div></div>
            </div>
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

          <!-- SECTION 1: Demoed -->
          <div class="kg-section">
            <div class="kg-section-header kg-demo-header">
              <span class="kg-section-dot" style="background:#60a5fa"></span>
              VISAT I DEMO
            </div>
            <div class="kg-section-items">
              <div class="kg-item">Taktisk karta · Borealis Sund</div>
              <div class="kg-item">AI COA-lösare · Pareto-front</div>
              <div class="kg-item">Ritbordet · Manöverplanering</div>
              <div class="kg-item">HITL styrning · Auktoritetsnivåer</div>
              <div class="kg-item">Beredskapsvisualisering</div>
            </div>
          </div>

          <!-- SECTION 2: Powers it -->
          <div class="kg-section">
            <div class="kg-section-header kg-power-header">
              <span class="kg-section-dot" style="background:#34d399"></span>
              DRIVS AV
            </div>
            <div class="kg-section-items">
              <div class="kg-item">FastAPI · Twin Engine · Solver</div>
              <div class="kg-item">Mistral-large-2411 (OpenRouter)</div>
              <div class="kg-item">NgRx Signals · 12 stores</div>
              <div class="kg-item">WebSocket · DELTA-flöde 2s</div>
              <div class="kg-item">Red Adversary · Friction Engine</div>
            </div>
          </div>

          <!-- SECTION 3: More exists -->
          <div class="kg-section">
            <div class="kg-section-header kg-more-header">
              <span class="kg-section-dot" style="background:#a78bfa"></span>
              FINNS OCKSÅ
            </div>
            <div class="kg-section-items">
              <div class="kg-item">C2-resiliens · Beslutsfabrik</div>
              <div class="kg-item">Kontrafaktiskt lab · Motståndstest</div>
              <div class="kg-item">Logistikkonsol · Försörjningsvägar</div>
              <div class="kg-item">Referensgraf · Docklager</div>
              <div class="kg-item">Hotinspektor · Klassificering</div>
            </div>
          </div>

          <p class="kg-hint">Drag för att rotera · Scroll för att zooma · Klicka för nodinfo</p>
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
          <div class="sum-num blue">14</div>
          <div class="sum-label">Operativa vyer</div>
        </div>
        <div class="sum-card">
          <div class="sum-num green">13</div>
          <div class="sum-label">REST-endpoints + WebSocket</div>
        </div>
        <div class="sum-card">
          <div class="sum-num purple">127ms</div>
          <div class="sum-label">Genomsnittlig AI-svarstid</div>
        </div>
        <div class="sum-card">
          <div class="sum-num amber">+54pp</div>
          <div class="sum-label">Beredskapsvinst vs. äldre system</div>
        </div>
      </div>

      <div class="summary-pillars">
        <div class="pillar">
          <div class="pillar-icon">⊙</div>
          <div class="pillar-title">Situationsmedvetenhet</div>
          <div class="pillar-desc">Realtids lägesbild med hotintentanalys och sensorsammansmältning</div>
        </div>
        <div class="pillar">
          <div class="pillar-icon">⊛</div>
          <div class="pillar-title">AI-beslutsstöd</div>
          <div class="pillar-desc">Pareto-optimal COA-analys med Mistral LLM-motivering på svenska</div>
        </div>
        <div class="pillar">
          <div class="pillar-icon">⬡</div>
          <div class="pillar-title">Manöverplanering</div>
          <div class="pillar-desc">Interaktivt ritbord med rörelse­simulering och C2-export</div>
        </div>
        <div class="pillar">
          <div class="pillar-icon">◈</div>
          <div class="pillar-title">Styrning & Kontroll</div>
          <div class="pillar-desc">HITL-auktoritet, revisionsspår och förklarbar AI i varje beslut</div>
        </div>
        <div class="pillar">
          <div class="pillar-icon">⊟</div>
          <div class="pillar-title">Europeisk & Säker</div>
          <div class="pillar-desc">Öppen källkod, GDPR-kompatibel, hostbar vid NCS Linköping</div>
        </div>
      </div>

      <div class="summary-cta">
        <a routerLink="/" class="cta-btn">Öppna systemet <span class="cta-arrow">→</span></a>
        <span class="cta-note">Kräver åtkomstnyckel</span>
      </div>
    </div>
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
      <span class="console-title">BDT INFERENCE LOG</span>
    </div>
    <div class="console-body">
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
    .track-move { animation: trackMove 1.5s ease-in-out infinite alternate; }
    @keyframes trackMove { from { transform: translateY(-3px); } to { transform: translateY(3px); } }

    /* ── AI slide ───────────────────────────────────────────────────── */
    .slide-ai { overflow-y: auto; }
    .ai-grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: auto auto; gap: 16px; margin-top: 16px; }
    .ai-pareto-card { grid-row: 1; padding: 16px; border: 1px solid var(--s-border); border-radius: 8px; background: rgba(255,255,255,0.02); }
    .coa-list { grid-row: 1; display: flex; flex-direction: column; gap: 8px; }
    .ai-rationale { grid-column: 1 / -1; padding: 16px; border: 1px solid rgba(92,167,255,0.15); border-radius: 8px; background: rgba(92,167,255,0.04); }
    .card-label { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: var(--s-muted); margin-bottom: 10px; }
    .pareto-svg { width: 100%; height: 200px; }
    .pulse-ring { animation: pulseRing 2s ease-in-out infinite; }
    @keyframes pulseRing { 0%,100% { opacity: 0.5; r: 15; } 50% { opacity: 0.1; r: 22; } }
    .coa-card { padding: 10px 12px; border: 1px solid var(--s-border); border-radius: 6px; background: rgba(255,255,255,0.02); }
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
    .board-feat { display: flex; align-items: flex-start; gap: 12px; padding: 10px 12px; border: 1px solid var(--s-border); border-radius: 6px; background: rgba(255,255,255,0.02); }
    .feat-icon { font-size: 16px; color: var(--s-blue); width: 20px; flex-shrink: 0; }
    .feat-title { font-size: 12px; font-weight: 700; color: var(--s-text); }
    .feat-sub { font-size: 10px; color: var(--s-muted); margin-top: 2px; }

    /* ── ML slide ────────────────────────────────────────────────────── */
    .slide-ml { overflow-y: auto; }
    .ml-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
    .ml-card { padding: 18px; border: 1px solid var(--s-border); border-radius: 8px; background: rgba(255,255,255,0.02); }
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
    .auth-level { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 6px; border: 1px solid var(--s-border); background: rgba(255,255,255,0.02); }
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
    .gov-right { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 16px; overflow-y: auto; }
    .gov-gauge-label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: var(--s-muted); }
    .gauge-svg { width: 240px; height: 180px; }
    .gov-factors { width: 100%; display: flex; flex-direction: column; gap: 8px; }
    .gov-factor { display: flex; flex-direction: column; gap: 4px; }
    .gf-label { font-size: 10px; color: var(--s-muted); }
    .gf-bar { height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; }
    .gf-fill { height: 100%; border-radius: 2px; }

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
    .summary-pillars { display: grid; grid-template-columns: repeat(5,1fr); gap: 12px; }
    .pillar { padding: 14px; border: 1px solid var(--s-border); border-radius: 8px; background: rgba(255,255,255,0.02); display: flex; flex-direction: column; gap: 6px; }
    .pillar-icon { font-size: 18px; color: var(--s-blue); }
    .pillar-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }
    .pillar-desc { font-size: 10px; color: var(--s-muted); line-height: 1.5; }
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
      position: fixed; bottom: 64px; right: 24px; z-index: 50;
      width: 340px;
      background: rgba(3,7,12,0.92); border: 1px solid rgba(92,167,255,0.2);
      border-radius: 8px; overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      backdrop-filter: blur(8px);
    }
    .console-header {
      display: flex; align-items: center; gap: 8px; padding: 6px 10px;
      border-bottom: 1px solid rgba(92,167,255,0.1);
      background: rgba(92,167,255,0.05);
    }
    .console-dots { display: flex; gap: 4px; }
    .console-dot { width: 8px; height: 8px; border-radius: 50%; }
    .console-dot.red { background: #ef4444; opacity: 0.7; }
    .console-dot.amber { background: #f59e0b; opacity: 0.7; }
    .console-dot.green { background: #7ce0be; opacity: 0.7; }
    .console-title { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: rgba(92,167,255,0.7); font-family: monospace; }
    .console-body { padding: 8px 10px; display: flex; flex-direction: column; gap: 2px; min-height: 80px; max-height: 140px; overflow: hidden; }
    .console-line { font-size: 10px; font-family: 'JetBrains Mono', 'Courier New', monospace; color: rgba(124,224,190,0.9); display: flex; gap: 6px; line-height: 1.5; }
    .console-dim { opacity: 0.4; }
    .console-prompt { color: rgba(92,167,255,0.6); flex-shrink: 0; }
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
      position: fixed; bottom: 24px; right: 380px; z-index: 20;
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
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .kg-item:last-child { border-bottom: none; }
    .kg-hint { font-size: 10px; font-family: monospace; color: rgba(156,176,199,0.4); margin: 0; }
  `],
})
export class Showcase implements OnInit, OnDestroy {

  readonly slides = SLIDES;
  readonly scenarioLabels = SCENARIO_LABELS;
  readonly terrain = TERRAIN;
  readonly basesNorth = BASES_NORTH;
  readonly coas = COAS;

  currentSlide = signal(0);
  mapScenario = signal(0);

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

  currentScenario = computed(() => MAP_SCENARIOS[this.mapScenario()]);

  ngOnInit(): void {
    this._startConsole(0);
  }

  ngOnDestroy(): void {
    if (this._consoleTimer) clearInterval(this._consoleTimer);
  }

  private _startConsole(slide: number): void {
    if (this._consoleTimer) clearInterval(this._consoleTimer);
    this._consoleSlide.set(slide);
    this._consoleLine.set(0);
    const seq = CONSOLE_SEQUENCES[slide] ?? [];
    let i = 0;
    this._consoleTimer = setInterval(() => {
      if (i < seq.length) {
        this._consoleLine.set(++i);
      }
    }, 700);
  }

  goTo(index: number): void {
    this.currentSlide.set(index);
    this._startConsole(index);
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
