#!/usr/bin/env python3
"""Decompose the monolithic showcase.component.ts into:
  - showcase-data.ts       (all const data, interfaces, helper functions)
  - slides/welcome.slide.ts
  - slides/map.slide.ts
  - slides/coa.slide.ts
  - slides/board.slide.ts
  - slides/ml.slide.ts
  - slides/governance.slide.ts
  - slides/kg.slide.ts
  - slides/summary.slide.ts
  - showcase.component.ts  (shell only: header, console, nav, demo overlay)

Each slide component receives an `index` input and gets a reference to
the ShowcaseComponent (parent) via `inject(..., { optional: true })`
or, simpler, via a shared ShowcaseState service that holds all the
signals the parent used to own.

Strategy: Create a ShowcaseState injectable that owns all signals/data.
The parent ShowcaseComponent injects it and delegates. Each slide
component injects it directly. This avoids Input churn and keeps
behaviour identical.
"""

import os, re, sys

BASE = os.path.join(
    os.environ.get("STEEL_SRC", "."),
    "src/app/features/showcase",
)
os.makedirs(os.path.join(BASE, "slides"), exist_ok=True)

# ── Read the monolith ──────────────────────────────────────────────────
mono_path = os.path.join(BASE, "showcase.component.ts")
with open(mono_path, "r") as f:
    src = f.read()

lines = src.split("\n")

# ── Extract sections ───────────────────────────────────────────────────

# Data/constants: lines 1-729 (before @Component)
DATA_END = next(i for i, l in enumerate(lines) if l.startswith("@Component"))

# Template: between template: ` and `,
tmpl_start = next(i for i, l in enumerate(lines) if l.strip().startswith("template: `"))
tmpl_end = next(i for i, l in enumerate(lines[tmpl_start:]) if l.strip() == "`,") + tmpl_start

# Styles: between styles: [` and `]
styles_start = next(i for i, l in enumerate(lines) if l.strip().startswith("styles: [`"))
styles_end = next(i for i, l in enumerate(lines) if i > styles_start and l.strip().startswith("`]"))

# Class body: after export class Showcase ...
class_start = next(i for i, l in enumerate(lines) if l.startswith("export class Showcase"))

# ── Slide template regions ─────────────────────────────────────────────
# Each slide starts with @if (currentSlide() === N) {
# and ends with the matching }
SLIDE_STARTS = []
for i, l in enumerate(lines):
    m = re.match(r'\s*@if \(currentSlide\(\) === (\d+)\) \{', l)
    if m:
        SLIDE_STARTS.append((int(m.group(1)), i))

# Find end of each slide block by counting braces
def find_block_end(lines, start):
    depth = 0
    for i in range(start, len(lines)):
        depth += lines[i].count('{') - lines[i].count('}')
        if depth <= 0:
            return i
    return len(lines) - 1

SLIDE_RANGES = []
for slide_idx, start_line in SLIDE_STARTS:
    end_line = find_block_end(lines, start_line)
    SLIDE_RANGES.append((slide_idx, start_line, end_line))

# ── Map slide index → name ─────────────────────────────────────────────
SLIDE_NAMES = {
    0: "welcome",
    1: "map",
    2: "coa",
    3: "board",
    4: "ml",
    5: "governance",
    6: "kg",
    7: "summary",
}

# ── Map CSS class prefixes to slides for splitting styles ──────────────
SLIDE_CSS_PREFIXES = {
    0: [".slide-welcome", ".welcome-", ".w-chip"],
    1: [".map-container", ".map-svg", ".scenario-story", ".data-strip", ".data-pill",
        ".scenario-tabs", ".recommendation-panel", ".recommendation-card", ".recommendation-tabs",
        ".s-tab", ".map-legend", ".map-stats", ".stat", ".track-pulse", ".track-intercepted",
        ".intercept-core", ".intercept-ring", ".map-phase-bar", ".phase-bar-",
        ".timeline-control", ".timeline-top", ".timeline-label", ".timeline-slider",
        ".track-facts", ".track-fact", ".track-decision-card", ".track-decision-head",
        ".track-decision-kicker", ".track-decision-title", ".track-decision-badge",
        ".track-decision-summary", ".decision-support-grid", ".decision-support-card",
        ".decision-support-label", ".decision-support-value", ".decision-support-detail",
        ".track-decision-foot"],
    2: [".slide-ai", ".ai-grid", ".ai-pareto-card", ".coa-list", ".ai-rationale",
        ".coa-primer-grid", ".coa-primer-card", ".coa-primer-active", ".coa-primer-title",
        ".coa-primer-meaning", ".coa-primer-when", ".coa-primer-tradeoff",
        ".intent-card", ".card-label", ".pareto-svg", ".pulse-ring",
        ".coa-card", ".coa-top", ".coa-id", ".coa-badge", ".coa-name",
        ".coa-bars", ".coa-bar-row", ".coa-bar-label", ".coa-bar-track",
        ".coa-bar-fill", ".coa-bar-val", ".rationale-text", ".rationale-meta", ".r-tag"],
    3: [".slide-board", ".board-demo-container", ".board-demo-label", ".board-svg",
        ".board-feat-active", ".validation-chain", ".validation-chip", ".validation-arrow",
        ".validation-tree-strip", ".validation-tree-card", ".board-demo-stage",
        ".validation-svg", ".validation-inference-grid", ".validation-inference-card",
        ".validation-explain", ".board-features", ".board-feat"],
    4: [".slide-ml", ".ml-grid", ".ml-card", ".ml-card-header", ".ml-icon",
        ".ml-card-title", ".ml-stack-list", ".ml-stack-item", ".ml-lib", ".ml-lic",
        ".ml-card-note", ".system-compare", ".system-compare-summary", ".system-compare-head",
        ".system-compare-row", ".system-compare-legacy", ".system-compare-bdt",
        ".system-compare-center", ".system-compare-label", ".system-compare-bridge",
        ".system-compare-benefit", ".system-pill", ".system-compare-text",
        ".system-compare-note", ".state-explain", ".ml-flag-row", ".ml-flag-item",
        ".ml-flag", ".ml-flag-name", ".ml-flag-sub", ".ncs-specs", ".ncs-spec",
        ".ncs-k", ".ncs-v", ".ncs-badge"],
    5: [".slide-governance", ".gov-authority-levels", ".auth-level", ".auth-badge",
        ".auth-name", ".auth-desc", ".gov-right", ".gov-factors", ".gov-factor",
        ".gf-top", ".gf-label", ".gf-summary", ".auth-data", ".gf-why"],
    6: [".slide-kg", ".kg-viewer-container", ".kg-viewer-label", ".kg-live-dot",
        ".kg-viewer-inner", ".kg-categories", ".kg-cat", ".kg-cat-dot", ".kg-facts",
        ".kg-fact", ".kf-v", ".kf-l", ".kg-section", ".kg-section-header",
        ".kg-demo-header", ".kg-power-header", ".kg-more-header", ".kg-path-header",
        ".kg-section-dot", ".kg-section-items", ".kg-item", ".kg-path-rail",
        ".kg-path-node", ".kg-path-arrow", ".kg-info-card", ".kg-info-top",
        ".kg-info-title", ".kg-info-body", ".kg-hint"],
    7: [".slide-summary", ".summary-grid", ".sum-card", ".sum-num", ".sum-label",
        ".summary-pillars", ".pillar-icon", ".pillar-title", ".pillar-desc",
        ".summary-answer", ".summary-cta", ".cta-btn", ".cta-arrow", ".cta-note"],
}

# Shared styles that stay in the parent
SHARED_CSS_PREFIXES = [
    ".showcase-shell", ".showcase-bg", ".showcase-header", ".showcase-logo",
    ".showcase-exit-btn", ".showcase-main", ".slide ", ".slide-", ".animate-in",
    ".slide-eyebrow", ".slide-title", ".slide-sub", ".slide-hero-title", ".slide-hero-sub",
    ".console-window", ".console-header", ".console-body", ".console-",
    ".showcase-nav", ".nav-arrow", ".nav-dots", ".nav-dot", ".slide-counter",
    ".demo-overlay", ":host",
]

# ── Helper: extract text between line ranges ───────────────────────────
def get_lines(start, end):
    return "\n".join(lines[start:end+1])

# ── Write showcase-data.ts ─────────────────────────────────────────────
data_content = lines[0]  # skip, we'll rewrite imports
# Lines 1-729 are data. Keep them as-is.
data_src = "\n".join(lines[0:DATA_END])

# Add the ShowcaseState service at the bottom of data file
state_service = '''

import { Injectable, signal, computed } from '@angular/core';

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
'''

with open(os.path.join(BASE, "showcase-data.ts"), "w") as f:
    f.write(data_src)
    f.write(state_service)

print("Wrote showcase-data.ts")

# ── Extract slide templates and styles ─────────────────────────────────

def extract_slide_template(slide_idx):
    for si, start, end in SLIDE_RANGES:
        if si == slide_idx:
            # Content between the @if line and the closing }
            inner = lines[start+1:end]
            # Trim leading/trailing blank lines
            while inner and not inner[0].strip():
                inner.pop(0)
            while inner and not inner[-1].strip():
                inner.pop()
            return "\n".join(inner)
    return ""

def extract_css_rules(full_css, prefixes):
    """Extract CSS rules whose selectors match any prefix."""
    result = []
    i = 0
    css_lines = full_css.split("\n")
    while i < len(css_lines):
        line = css_lines[i]
        stripped = line.strip()
        # Check if this line is a selector
        if stripped and not stripped.startswith("/*") and not stripped.startswith("*") and not stripped.startswith("//"):
            # Check for opening brace on same line or next
            selector_line = stripped
            if "{" in stripped or (i + 1 < len(css_lines) and "{" in css_lines[i+1]):
                # This is a rule start - check if selector matches
                if any(selector_line.startswith(p) or selector_line.startswith("." + p.lstrip(".")) or p.lstrip(".") in selector_line for p in prefixes):
                    # Collect the full rule
                    depth = 0
                    rule_lines = []
                    while i < len(css_lines):
                        rule_lines.append(css_lines[i])
                        depth += css_lines[i].count("{") - css_lines[i].count("}")
                        if depth <= 0 and "{" in "".join(rule_lines):
                            i += 1
                            break
                        i += 1
                    result.extend(rule_lines)
                    continue
        i += 1
    return "\n".join(result)


# Get the full CSS string
full_css = "\n".join(lines[styles_start+1:styles_end])

# Better approach: extract CSS line ranges by parsing the CSS section
# Each CSS rule is: selector { ... } potentially multi-line
css_content = lines[styles_start+1:styles_end]

def parse_css_rules(css_lines):
    """Parse CSS into list of (selector_block, full_text) tuples."""
    rules = []
    i = 0
    while i < len(css_lines):
        line = css_lines[i].rstrip()
        stripped = line.strip()
        if not stripped or stripped.startswith("/*") or stripped.startswith("*") or stripped.startswith("//"):
            i += 1
            continue
        # Detect rule start: has a selector before {
        if "{" in stripped:
            depth = 0
            rule_start = i
            while i < len(css_lines):
                depth += css_lines[i].count("{") - css_lines[i].count("}")
                if depth <= 0:
                    i += 1
                    break
                i += 1
            rule_text = "\n".join(css_lines[rule_start:i])
            # Extract selector (everything before first {)
            selector_part = rule_text.split("{")[0].strip()
            rules.append((selector_part, rule_text))
        else:
            i += 1
    return rules

css_rules = parse_css_rules(css_content)

def matches_prefix(selector, prefixes):
    for p in prefixes:
        p_clean = p.lstrip(".")
        if selector.startswith(p) or f".{p_clean}" in selector or selector.startswith(f".{p_clean}"):
            return True
    return False

# ── Generate slide components ──────────────────────────────────────────

for slide_idx in range(8):
    name = SLIDE_NAMES[slide_idx]
    template = extract_slide_template(slide_idx)

    # Get CSS for this slide
    prefixes = SLIDE_CSS_PREFIXES.get(slide_idx, [])
    slide_rules = [rule_text for sel, rule_text in css_rules if matches_prefix(sel, prefixes)]
    slide_css = "\n".join(slide_rules)

    # Determine imports needed
    imports = ["Component", "ChangeDetectionStrategy", "inject"]
    extra_imports = []
    template_has = set()

    if "CommonModule" in template or "| number" in template:
        extra_imports.append("CommonModule")
    if "routerLink" in template.lower():
        extra_imports.append("RouterLink")
    if "knowledge-graph-viewer" in template.lower():
        extra_imports.append("KnowledgeGraphViewerComponent")

    # Class name
    class_name = f"{name.capitalize()}Slide"
    if name == "kg":
        class_name = "KgSlide"
    elif name == "coa":
        class_name = "CoaSlide"
    elif name == "ml":
        class_name = "MlSlide"

    # Build the component
    component_imports = ["Component", "ChangeDetectionStrategy", "inject"]
    from_core = ["ShowcaseState"]

    # Template references: replace `slides[N]` → `state.slides[N]`, etc.
    # Replace direct signal access patterns
    tmpl = template
    # Replace references to instance properties with state.
    replacements = [
        ("slides[", "state.slides["),
        ("scenarioLabels[", "state.scenarioLabels["),
        ("scenarioLabels", "state.scenarioLabels"),
        ("terrain.", "state.terrain."),
        ("basesNorth", "state.basesNorth"),
        ("coas", "state.coas"),
        ("coaGuide", "state.coaGuide"),
        ("operatorSteps", "state.operatorSteps"),
        ("validationSteps", "state.validationSteps"),
        ("validationTrees", "state.validationTrees"),
        ("novelMethods", "state.novelMethods"),
        ("ontologyDomains", "state.ontologyDomains"),
        ("unificationEffects", "state.unificationEffects"),
        ("slidePreviewCopy[", "state.slidePreviewCopy["),
        ("scenarioRecommendations", "state.scenarioRecommendations"),
        ("systemComparison", "state.systemComparison"),
        ("kgPathNodes", "state.kgPathNodes"),
        ("currentSlide()", "state.currentSlide()"),
        ("mapScenario()", "state.mapScenario()"),
        ("selectedScenarioTrackId()", "state.selectedScenarioTrackId()"),
        ("slideDemoStarted()[", "state.slideDemoStarted()["),
        ("selectedCoaId()", "state.selectedCoaId()"),
        ("validationFocusIndex()", "state.validationFocusIndex()"),
        ("validationTreeIndex()", "state.validationTreeIndex()"),
        ("modelFocusIndex()", "state.modelFocusIndex()"),
        ("ontologyFocusIndex()", "state.ontologyFocusIndex()"),
        ("unificationFocusIndex()", "state.unificationFocusIndex()"),
        ("kgNodeIndex()", "state.kgNodeIndex()"),
        ("summaryFocusIndex()", "state.summaryFocusIndex()"),
        ("animatedTracks()", "state.animatedTracks()"),
        ("selectedScenarioTrack()", "state.selectedScenarioTrack()"),
        ("currentScenarioStory()", "state.currentScenarioStory()"),
        ("currentRecommendation()", "state.currentRecommendation()"),
        ("currentValidationTree()", "state.currentValidationTree()"),
        ("activeValidationBranchIndex()", "state.activeValidationBranchIndex()"),
        ("currentKgNode()", "state.currentKgNode()"),
        ("intercepting()", "state.intercepting()"),
        ("trackPlaying()", "state.trackPlaying()"),
        ("trackProgress()", "state.trackProgress()"),
        ("trackPhase()", "state.trackPhase()"),
        ("recommendationIndex()", "state.recommendationIndex()"),
        # Method calls
        ("selectScenario(", "state.selectScenario("),
        ("selectRecommendation(", "state.selectRecommendation("),
        ("selectScenarioTrack(", "state.selectScenarioTrack("),
        ("selectValidationTree(", "state.selectValidationTree("),
        ("selectKgNode(", "state.selectKgNode("),
        ("toggleTrackPlayback(", "state.toggleTrackPlayback("),
        ("onTrackScrub(", "state.onTrackScrub("),
        ("trackSummary(", "state.trackSummary("),
        ("trackFacts(", "state.trackFacts("),
        ("trackDecisionSupport(", "state.trackDecisionSupport("),
        ("coaX(", "state.coaX("),
        ("coaY(", "state.coaY("),
        # Signal.set calls from template
        (".set(coa.id)", ".set(coa.id)"),  # keep as-is but need state prefix
        ("selectedCoaId.set(", "state.selectedCoaId.set("),
        ("validationFocusIndex.set(", "state.validationFocusIndex.set("),
        ("ontologyFocusIndex.set(", "state.ontologyFocusIndex.set("),
        ("unificationFocusIndex.set(", "state.unificationFocusIndex.set("),
        ("modelFocusIndex.set(", "state.modelFocusIndex.set("),
        ("summaryFocusIndex.set(", "state.summaryFocusIndex.set("),
    ]

    for old, new in replacements:
        # Only replace if not already prefixed with "state."
        if not old.startswith("state."):
            # Use word-boundary-aware replacement to avoid double-replacing
            tmpl = tmpl.replace(old, new)

    # Fix any double state.state. prefixes
    tmpl = tmpl.replace("state.state.", "state.")

    # Build imports list for component
    ng_imports = []
    if "CommonModule" in extra_imports:
        ng_imports.append("CommonModule")
    if "RouterLink" in extra_imports:
        ng_imports.append("RouterLink")
    if "KnowledgeGraphViewerComponent" in extra_imports:
        ng_imports.append("KnowledgeGraphViewerComponent")

    import_lines = [
        f"import {{ {', '.join(component_imports)} }} from '@angular/core';",
    ]
    if ng_imports:
        if "CommonModule" in ng_imports:
            import_lines.append("import { CommonModule } from '@angular/common';")
        if "RouterLink" in ng_imports:
            import_lines.append("import { RouterLink } from '@angular/router';")
        if "KnowledgeGraphViewerComponent" in ng_imports:
            import_lines.append("import { KnowledgeGraphViewerComponent } from '../../../shared/ui/knowledge-graph-viewer/knowledge-graph-viewer.component';")
    import_lines.append("import { ShowcaseState } from '../showcase-data';")

    # Escape backticks in template
    tmpl_escaped = tmpl.replace("`", "\\`")

    comp_src = "\n".join(import_lines) + "\n\n"
    comp_src += "@Component({\n"
    comp_src += f"  selector: 'app-{name}-slide',\n"
    comp_src += "  standalone: true,\n"
    comp_src += f"  imports: [{', '.join(ng_imports)}],\n" if ng_imports else "  imports: [],\n"
    comp_src += "  changeDetection: ChangeDetectionStrategy.OnPush,\n"
    comp_src += f"  template: `\n{tmpl_escaped}\n  `,\n"
    comp_src += "  styles: [`\n"
    comp_src += slide_css + "\n"
    comp_src += "  `],\n"
    comp_src += "})\n"
    comp_src += f"export class {class_name} {{\n"
    comp_src += "  readonly state = inject(ShowcaseState);\n"
    comp_src += "}\n"

    filepath = os.path.join(BASE, "slides", f"{name}.slide.ts")
    with open(filepath, "w") as f:
        f.write(comp_src)
    print(f"Wrote {filepath}")

# ── Generate parent showcase.component.ts ──────────────────────────────

# Shared CSS
shared_rules = [rule_text for sel, rule_text in css_rules
                if any(matches_prefix(sel, [p]) for p in SHARED_CSS_PREFIXES)]
shared_css = "\n".join(shared_rules)

# Build the parent template: header, slide switch, console, nav
slide_selectors = []
for slide_idx in range(8):
    name = SLIDE_NAMES[slide_idx]
    tag = f"app-{name}-slide"
    slide_selectors.append(f"    @if (state.currentSlide() === {slide_idx}) {{\n      <{tag}></{tag}>\n    }}")

# Read the original template for header, console, nav sections
# Header: lines 742-757 (inside <header>)
# Console: lines 1674-1706
# Nav: lines 1708-1731
# Demo overlay: lines 1655-1670
# Slide counter: line 1731

header_template = """
  <header class="showcase-header">
    <div class="flex items-center gap-3">
      <div class="showcase-logo">S</div>
      <div class="flex flex-col">
        <span class="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--s-muted)]">Saab Smart Stridsledning</span>
        <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--s-text)]">Boreal Decision Twin</span>
      </div>
    </div>
    <div class="flex items-center gap-4">
      <span class="text-[9px] font-mono text-[var(--s-muted)] uppercase tracking-widest">Hackathon Demo · 2026</span>
      <a routerLink="/" class="showcase-exit-btn">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        Stäng
      </a>
    </div>
  </header>
"""

main_template = """
  <main class="showcase-main">
""" + "\n".join(slide_selectors) + """

    @if (!state.slideDemoStarted()[state.currentSlide()]) {
      <button class="demo-overlay" type="button" (click)="state.startCurrentSlideDemo($event)">
        <span class="demo-overlay-kicker">Klicka en gång för att starta demo</span>
        <span class="demo-overlay-lead">{{ state.slidePreviewCopy[state.currentSlide()].lead }}</span>
        <span class="demo-overlay-title">{{ state.slides[state.currentSlide()].title }}</span>
        <span class="demo-overlay-sub">{{ state.slidePreviewCopy[state.currentSlide()].detail }}</span>
        <div class="demo-overlay-bullets">
          @for (bullet of state.slidePreviewCopy[state.currentSlide()].bullets; track bullet) {
            <div class="demo-overlay-bullet">
              <span class="demo-overlay-bullet-dot"></span>
              <span>{{ bullet }}</span>
            </div>
          }
        </div>
      </button>
    }
  </main>
"""

console_template = """
  <div class="console-window">
    <div class="console-header">
      <div class="console-dots">
        <span class="console-dot red"></span>
        <span class="console-dot amber"></span>
        <span class="console-dot green"></span>
      </div>
      <div class="console-header-copy">
        <span class="console-title">BDT BACKEND COMMAND LOG</span>
        <span class="console-subtitle">{{ state.slides[state.currentSlide()].eyebrow }} · {{ state.slides[state.currentSlide()].title }}</span>
      </div>
    </div>
    <div class="console-body">
      <div class="console-meta">
        <span>SLIDE DEMO MODE</span>
        <span>Ingest → score → decide → expose</span>
      </div>
      @if (state.visibleConsoleLines().length === 0) {
        <div class="console-line console-state">
          <span class="console-prompt">></span>
          <span>Klicka en gång på sliden för att starta demo-flödet.</span>
        </div>
      }
      @for (line of state.visibleConsoleLines(); track $index) {
        <div class="console-line" [class.console-dim]="$index < state.visibleConsoleLines().length - 4">
          <span class="console-prompt">$</span>
          <span>{{ line }}</span>
        </div>
      }
      <div class="console-cursor"></div>
    </div>
  </div>
"""

nav_template = """
  <nav class="showcase-nav">
    <button class="nav-arrow" [disabled]="state.currentSlide() === 0" (click)="state.prev()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
    </button>

    <div class="nav-dots">
      @for (slide of state.slides; track $index) {
        <button
          class="nav-dot"
          [class.nav-dot-active]="state.currentSlide() === $index"
          (click)="state.goTo($index)"
          [title]="slide.title"
        ></button>
      }
    </div>

    <button class="nav-arrow" [disabled]="state.currentSlide() === state.slides.length - 1" (click)="state.next()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
    </button>
  </nav>

  <div class="slide-counter">{{ state.currentSlide() + 1 }} / {{ state.slides.length }}</div>
"""

full_parent_template = f"""<div class="showcase-shell" [class]="'slide-' + state.currentSlide()" (keydown)="state.onKey($event)" tabindex="0">

  <div class="showcase-bg"></div>
{header_template}
{main_template}
{console_template}
{nav_template}
</div>"""

# Build slide import lines
slide_imports = []
slide_class_names = []
for slide_idx in range(8):
    name = SLIDE_NAMES[slide_idx]
    class_name = f"{name.capitalize()}Slide"
    if name == "kg":
        class_name = "KgSlide"
    elif name == "coa":
        class_name = "CoaSlide"
    elif name == "ml":
        class_name = "MlSlide"
    slide_imports.append(f"import {{ {class_name} }} from './slides/{name}.slide';")
    slide_class_names.append(class_name)

parent_src = f"""import {{ Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy }} from '@angular/core';
import {{ CommonModule }} from '@angular/common';
import {{ RouterLink }} from '@angular/router';
import {{ ShowcaseState }} from './showcase-data';
{' '.join(slide_imports)}

@Component({{
  selector: 'app-showcase',
  standalone: true,
  imports: [CommonModule, RouterLink, {', '.join(slide_class_names)}],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
{full_parent_template}
  `,
  styles: [`
{shared_css}
  `],
}})
export class Showcase implements OnInit, OnDestroy {{
  readonly state = inject(ShowcaseState);

  ngOnInit(): void {{
    this.state.resetConsole(0);
  }}

  ngOnDestroy(): void {{
    this.state.destroy();
  }}
}}
"""

with open(os.path.join(BASE, "showcase.component.ts"), "w") as f:
    f.write(parent_src)
print("Wrote showcase.component.ts (parent shell)")
print("\nDecomposition complete!")
