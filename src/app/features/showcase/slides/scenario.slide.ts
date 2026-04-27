import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShowcaseState } from '../showcase-data';
import { SteelApiService } from '../../../core/services/steel-api.service';
import { ScenarioStore } from '../../../core/state/scenario.store';
import { PolicyStore } from '../../../core/state/policy.store';
import { TacticalConsole } from '../../ops/tactical-console.component';
import { ThreatInspector } from '../../ops/threat-inspector.component';
import { TacticalRecommendationsComponent } from '../../ops/components/tactical-recommendations.component';
import { ReadinessConsole } from '../../lab/readiness-console.component';

@Component({
  selector: 'app-scenario-slide',
  standalone: true,
  imports: [
    CommonModule,
    TacticalConsole,
    ThreatInspector,
    TacticalRecommendationsComponent,
    ReadinessConsole,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="slide slide-scenario animate-in">
      <div class="slide-eyebrow">{{ state.slides[8].eyebrow }}</div>
      <h2 class="slide-title">{{ state.slides[8].title }}</h2>
      <p class="slide-sub">{{ state.slides[8].subtitle }}</p>

      <!-- Scenario selector tabs -->
      <div class="scenario-tabs">
        @for (sc of state.dualScenarios; track sc.id; let i = $index) {
          <button class="scenario-tab" type="button"
            [class.scenario-tab-active]="state.scenarioTab() === i"
            (click)="loadScenario(i)">
            <span class="scenario-tab-id">{{ sc.id === 'boreal-strike' ? 'A' : 'B' }}</span>
            <span class="scenario-tab-name">{{ sc.name }}</span>
            <span class="scenario-tab-tagline">{{ sc.tagline }}</span>
          </button>
        }
      </div>

      <!-- 4-part layout -->
      <div class="scenario-parts">
        @for (partLabel of partLabels; track partLabel.id; let partIdx = $index) {
          <button class="scenario-part-btn" type="button"
            [class.scenario-part-btn-active]="state.scenarioPart() === partIdx"
            (click)="state.scenarioPart.set(partIdx)">
            <span class="scenario-part-num">{{ partIdx + 1 }}</span>
            <span class="scenario-part-label">{{ partLabel.label }}</span>
          </button>
        }
      </div>

      @let scenario = state.dualScenarios[state.scenarioTab()];

      <!-- Part 0: Introduce Scenario -->
      @if (state.scenarioPart() === 0) {
        <div class="scenario-part-content animate-in">
          <div class="scenario-narrative">
            <div class="scenario-narrative-kicker">{{ scenario.id === 'boreal-strike' ? 'Scenario A' : 'Scenario B' }}</div>
            <div class="scenario-narrative-body">{{ scenario.narrative }}</div>
          </div>

          <div class="scenario-params">
            <div class="scenario-params-header">Key parameters</div>
            @for (param of scenario.parameters; track param.key) {
              <div class="scenario-param-row">
                <div class="scenario-param-key">{{ param.key }}</div>
                <div class="scenario-param-before">{{ param.before }}</div>
                <div class="scenario-param-arrow">→</div>
                <div class="scenario-param-after">{{ param.after }}</div>
                <div class="scenario-param-desc">{{ param.description }}</div>
              </div>
            }
          </div>

          <div class="data-strip">
            <div class="data-pill"><span class="data-pill-num">{{ scenario.threatCount }}</span><span class="data-pill-label">Threats</span><span class="data-pill-text">{{ scenario.threatClass }} tracks</span></div>
            <div class="data-pill"><span class="data-pill-num">{{ scenario.velocity }}</span><span class="data-pill-label">km/h</span><span class="data-pill-text">Track velocity</span></div>
            <div class="data-pill"><span class="data-pill-num">{{ scenario.initStrikeProb }}</span><span class="data-pill-label">Init P(strike)</span><span class="data-pill-text">Initial strike prior</span></div>
            <div class="data-pill"><span class="data-pill-num">{{ scenario.id === 'boreal-strike' ? '0.82' : '0.75' }}</span><span class="data-pill-label">Final P(strike)</span><span class="data-pill-text">After Bayesian update</span></div>
          </div>

          <div class="scenario-bayesian">
            <div class="scenario-bayesian-header">Bayesian model result</div>
            <div class="scenario-bayesian-body">{{ scenario.bayesianResult }}</div>
          </div>
        </div>
      }

      <!-- Part 1: Tactical COP + Threat Inspector (live components) -->
      @if (state.scenarioPart() === 1) {
        <div class="scenario-part-content animate-in">
          <div class="scenario-live-grid">
            <div class="scenario-live-map">
              <div class="scenario-live-label">Tactical COP — Live Theater View</div>
              <div class="scenario-live-embed">
                <app-tactical-console />
              </div>
            </div>
            <div class="scenario-live-inspector">
              <div class="scenario-live-label">Threat Inspector — Intent Distribution</div>
              <div class="scenario-live-embed scenario-live-embed-inspector">
                <app-threat-inspector />
              </div>
            </div>
          </div>

          <div class="scenario-comparison-strip">
            @for (row of state.scenarioComparison; track row.label) {
              <div class="scenario-comparison-row">
                <div class="scenario-comparison-label">{{ row.label }}</div>
                <div class="scenario-comparison-a">{{ row.scenarioA }}</div>
                <div class="scenario-comparison-b">{{ row.scenarioB }}</div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Part 2: Decision Tree + ML + Ontology + Heuristics + live COA -->
      @if (state.scenarioPart() === 2) {
        <div class="scenario-part-content animate-in">
          <div class="scenario-validation-chain">
            <span class="scenario-chain-chip">Bayesian intent</span>
            <span class="scenario-chain-arrow">→</span>
            <span class="scenario-chain-chip">Decision tree</span>
            <span class="scenario-chain-arrow">→</span>
            <span class="scenario-chain-chip">ML inference</span>
            <span class="scenario-chain-arrow">→</span>
            <span class="scenario-chain-chip">Ontology lookup</span>
            <span class="scenario-chain-arrow">→</span>
            <span class="scenario-chain-chip">Heuristic overlay</span>
          </div>

          <div class="scenario-live-split">
            <div class="scenario-live-coa">
              <div class="scenario-live-label">COA Recommendations — Live</div>
              <div class="scenario-live-embed">
                <app-tactical-recommendations />
              </div>
            </div>
            <div class="scenario-inference-stack">
              <div class="scenario-inference-card scenario-inference-card-bayesian">
                <div class="scenario-inference-kicker">Bayesian Intent Classification</div>
                <div class="scenario-inference-body">
                  @if (scenario.id === 'boreal-strike') {
                    <span>5 MISSILE tracks at v=450 km/h. STRIKE likelihood g(450,450,150)≈1.0. MISSILE class prior bias=0.65. Posterior converges in &lt;10 s to P(STRIKE)&gt;0.80.</span>
                  } @else {
                    <span>Initial: 10 AIRCRAFT at v=250 km/h. P(STRIKE)=0.12. After redirect v=450: STRIKE likelihood overwhelms prior. P(STRIKE)→0.75 even under jamming.</span>
                  }
                </div>
                <div class="scenario-inference-tag">INTENT ENGINE</div>
              </div>

              <div class="scenario-inference-card scenario-inference-card-tree">
                <div class="scenario-inference-kicker">Decision Tree Validation</div>
                <div class="scenario-inference-body">
                  @if (scenario.id === 'boreal-strike') {
                    <span>Root: Is STRIKE confidence &gt;0.7? YES → Commit intercept. Branch P=0.82, score=0.91. Counterfactual: Drop confidence 12% → tree flips to hold reserve.</span>
                  } @else {
                    <span>Root: Has intent shifted from PROBE? YES → Reclassify and re-solve COA. Branch: Commit full engagement P=0.75. Counterfactual: If sensor_quality&lt;0.5, confidence stays degraded but velocity signal still dominates.</span>
                  }
                </div>
                <div class="scenario-inference-tag">VALIDATION</div>
              </div>

              <div class="scenario-inference-card scenario-inference-card-ontology">
                <div class="scenario-inference-kicker">Ontology & Knowledge Graph</div>
                <div class="scenario-inference-body">
                  <span>The same threat model feeds policy, readiness, logistics, governance, and lab surfaces. Threat intent, classification confidence, and sensor quality are shared across all domains — no copied snapshots, no semantic drift.</span>
                </div>
                <div class="scenario-inference-tag">ONTOLOGY</div>
              </div>

              <div class="scenario-inference-card scenario-inference-card-heuristic">
                <div class="scenario-inference-kicker">Advanced Heuristics</div>
                <div class="scenario-inference-body">
                  @if (scenario.id === 'boreal-strike') {
                    <span>Command friction engine: reserves respected, civilian_protected=true, engagement_authority=BASE_COMMANDER. Reserve interceptor floor (0.80 for BASE-2) constrains COA-MAX from over-committing.</span>
                  } @else {
                    <span>Jamming resilience: sensor_quality degraded but Bayesian update still converges. g(450,450,150)=1.0 vs g(450,140,75)≈0.00003. Velocity signal alone sufficient for reclassification.</span>
                  }
                </div>
                <div class="scenario-inference-tag">HEURISTICS</div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Part 3: LLM Reasoning Output + Readiness Metrics -->
      @if (state.scenarioPart() === 3) {
        <div class="scenario-part-content animate-in">
          <div class="scenario-llm-header">
            <div class="scenario-llm-title">Structured LLM Rationale Output</div>
            <div class="scenario-llm-sub">Generated from Bayesian classification, decision-tree validation, ontology lookup, and heuristic overlay</div>
          </div>

          <div class="scenario-llm-blocks">
            @for (block of scenario.rationaleBlocks; track block.heading) {
              <div class="scenario-llm-block">
                <div class="scenario-llm-block-header">
                  <span class="scenario-llm-block-tag">{{ block.tag }}</span>
                  <span class="scenario-llm-block-heading">{{ block.heading }}</span>
                </div>
                <div class="scenario-llm-block-body">{{ block.body }}</div>
              </div>
            }
          </div>

          <div class="scenario-live-split">
            <div class="scenario-live-readiness">
              <div class="scenario-live-label">Readiness Console — Base Metrics</div>
              <div class="scenario-live-embed scenario-live-embed-readiness">
                <app-readiness-console />
              </div>
            </div>

            <div class="scenario-llm-output-col">
              <div class="scenario-llm-output">
                <div class="scenario-llm-output-header">
                  <span class="scenario-llm-output-dot"></span>
                  <span>api/rationale/coa</span>
                  <span class="scenario-llm-output-status">200 OK</span>
                </div>
                <pre class="scenario-llm-output-body">{{ scenario.id === 'boreal-strike' ? borealRationale : feintRationale }}</pre>
              </div>

              <div class="scenario-timeline">
                <div class="scenario-timeline-header">Recommended demo flow</div>
                @for (step of state.scenarioCombined; track step.time) {
                  <div class="scenario-timeline-step">
                    <div class="scenario-timeline-time">{{ step.time }}</div>
                    <div class="scenario-timeline-scenario">{{ step.scenario }}</div>
                    <div class="scenario-timeline-label">{{ step.label }}</div>
                    <div class="scenario-timeline-moment">{{ step.moment }}</div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .slide-scenario { overflow-y: auto; }
    .scenario-tabs {
      display: flex; gap: 12px; margin-top: 16px;
    }
    .scenario-tab {
      flex: 1; display: flex; flex-direction: column; gap: 4px; align-items: flex-start;
      padding: 14px 18px; border: 1px solid var(--s-border); border-radius: 10px;
      background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.2s;
      text-align: left;
    }
    .scenario-tab:hover { border-color: rgba(92,167,255,0.28); background: rgba(92,167,255,0.05); }
    .scenario-tab-active { border-color: rgba(92,167,255,0.4); background: rgba(92,167,255,0.08); box-shadow: 0 0 0 1px rgba(92,167,255,0.1) inset; }
    .scenario-tab-id {
      font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em;
      padding: 2px 8px; border-radius: 4px;
      background: rgba(239,68,68,0.15); color: var(--s-red);
    }
    .scenario-tab-active .scenario-tab-id { background: rgba(92,167,255,0.2); color: var(--s-blue); }
    .scenario-tab-name { font-size: 14px; font-weight: 700; color: var(--s-text); }
    .scenario-tab-tagline { font-size: 11px; color: var(--s-muted); line-height: 1.5; }
    .scenario-parts { display: flex; gap: 8px; margin-top: 16px; }
    .scenario-part-btn {
      flex: 1; display: flex; align-items: center; gap: 8px; justify-content: center;
      padding: 10px 14px; border: 1px solid var(--s-border); border-radius: 8px;
      background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.2s;
    }
    .scenario-part-btn:hover { border-color: rgba(92,167,255,0.28); background: rgba(92,167,255,0.05); }
    .scenario-part-btn-active { border-color: rgba(92,167,255,0.4); background: rgba(92,167,255,0.08); }
    .scenario-part-num {
      width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center;
      font-size: 10px; font-weight: 900; color: var(--s-muted); background: rgba(255,255,255,0.05);
    }
    .scenario-part-btn-active .scenario-part-num { background: rgba(92,167,255,0.2); color: var(--s-blue); }
    .scenario-part-label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.14em; color: var(--s-muted); }
    .scenario-part-btn-active .scenario-part-label { color: var(--s-text); }
    .scenario-part-content { margin-top: 16px; }

    .scenario-narrative {
      display: flex; flex-direction: column; gap: 8px;
      padding: 18px 20px; border-radius: 12px;
      border: 1px solid rgba(92,167,255,0.16); background: rgba(92,167,255,0.04);
      margin-bottom: 16px;
    }
    .scenario-narrative-kicker { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.18em; color: var(--s-blue); }
    .scenario-narrative-body { font-size: 14px; line-height: 1.7; color: var(--s-text); }

    .scenario-params {
      display: flex; flex-direction: column; gap: 0;
      border: 1px solid var(--s-border); border-radius: 10px; overflow: hidden; margin-bottom: 16px;
    }
    .scenario-params-header {
      font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em;
      color: var(--s-muted); padding: 10px 14px; background: rgba(92,167,255,0.06); border-bottom: 1px solid var(--s-border);
    }
    .scenario-param-row {
      display: grid; grid-template-columns: 180px 72px 24px 72px 1fr; align-items: center; gap: 8px;
      padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .scenario-param-row:last-child { border-bottom: none; }
    .scenario-param-key { font-size: 10px; font-weight: 700; font-family: monospace; color: var(--s-text); }
    .scenario-param-before { font-size: 10px; font-family: monospace; color: var(--s-muted); text-align: right; }
    .scenario-param-arrow { font-size: 11px; color: var(--s-blue); text-align: center; font-weight: 900; }
    .scenario-param-after { font-size: 10px; font-family: monospace; color: var(--s-green); font-weight: 700; }
    .scenario-param-desc { font-size: 10px; color: var(--s-muted); }

    .scenario-bayesian {
      padding: 14px 18px; border-radius: 10px;
      border: 1px solid rgba(124,224,190,0.2); background: rgba(124,224,190,0.04);
    }
    .scenario-bayesian-header { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.18em; color: var(--s-green); margin-bottom: 6px; }
    .scenario-bayesian-body { font-size: 12px; line-height: 1.7; color: var(--s-text); font-family: monospace; }

    .scenario-live-grid { display: grid; grid-template-columns: 3fr 2fr; gap: 12px; margin-bottom: 16px; }
    .scenario-live-split { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .scenario-live-label {
      font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em;
      color: var(--s-blue); padding: 6px 10px; background: rgba(92,167,255,0.06);
      border-bottom: 1px solid var(--s-border); border-radius: 8px 8px 0 0;
    }
    .scenario-live-embed {
      border: 1px solid var(--s-border); border-top: none; border-radius: 0 0 8px 8px;
      overflow: hidden; background: #050b12; position: relative;
    }
    .scenario-live-embed-inspector { max-height: 400px; overflow-y: auto; }
    .scenario-live-embed-readiness { max-height: 500px; overflow-y: auto; }

    .scenario-comparison-strip {
      display: grid; grid-template-columns: 100px 1fr 1fr; gap: 0;
      border: 1px solid var(--s-border); border-radius: 10px; overflow: hidden;
    }
    .scenario-comparison-row { display: contents; }
    .scenario-comparison-label {
      font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em;
      color: var(--s-muted); padding: 10px 14px; background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--s-border);
    }
    .scenario-comparison-a, .scenario-comparison-b {
      font-size: 11px; color: var(--s-text); padding: 10px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.04); line-height: 1.5;
    }
    .scenario-comparison-a { background: rgba(239,68,68,0.03); }
    .scenario-comparison-b { background: rgba(245,158,11,0.03); }

    .scenario-validation-chain {
      display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
      padding: 12px 14px; border-radius: 10px; border: 1px solid rgba(92,167,255,0.16);
      background: rgba(92,167,255,0.04); margin-bottom: 16px;
    }
    .scenario-chain-chip {
      font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.16em;
      color: var(--s-text); padding: 5px 10px; border: 1px solid rgba(92,167,255,0.18);
      border-radius: 999px; background: rgba(255,255,255,0.03);
    }
    .scenario-chain-arrow { color: var(--s-blue); font-size: 14px; font-weight: 900; }

    .scenario-live-coa {
      display: flex; flex-direction: column; min-width: 0;
    }
    .scenario-inference-stack {
      display: flex; flex-direction: column; gap: 12px; min-width: 0;
    }
    .scenario-inference-card {
      padding: 14px 16px; border: 1px solid var(--s-border); border-radius: 10px;
      background: rgba(255,255,255,0.02); display: flex; flex-direction: column; gap: 8px;
    }
    .scenario-inference-kicker { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.16em; color: var(--s-blue); }
    .scenario-inference-body { font-size: 12px; line-height: 1.65; color: var(--s-muted); }
    .scenario-inference-tag {
      font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em;
      padding: 3px 8px; border-radius: 4px; background: rgba(92,167,255,0.1); color: var(--s-blue); align-self: flex-start;
    }
    .scenario-inference-card-bayesian { border-color: rgba(239,68,68,0.2); }
    .scenario-inference-card-tree { border-color: rgba(124,224,190,0.2); }
    .scenario-inference-card-ontology { border-color: rgba(155,140,255,0.2); }
    .scenario-inference-card-heuristic { border-color: rgba(245,158,11,0.2); }

    .scenario-llm-header { margin-bottom: 16px; }
    .scenario-llm-title { font-size: 14px; font-weight: 700; color: var(--s-text); }
    .scenario-llm-sub { font-size: 12px; color: var(--s-muted); line-height: 1.6; margin-top: 4px; }
    .scenario-llm-blocks { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
    .scenario-llm-block {
      padding: 14px; border: 1px solid var(--s-border); border-radius: 10px;
      background: rgba(255,255,255,0.02); display: flex; flex-direction: column; gap: 8px;
    }
    .scenario-llm-block-header { display: flex; align-items: center; gap: 8px; }
    .scenario-llm-block-tag {
      font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em;
      padding: 2px 6px; border-radius: 4px; background: rgba(92,167,255,0.15); color: var(--s-blue);
    }
    .scenario-llm-block-heading { font-size: 11px; font-weight: 700; color: var(--s-text); }
    .scenario-llm-block-body { font-size: 11px; line-height: 1.6; color: var(--s-muted); }

    .scenario-live-readiness {
      display: flex; flex-direction: column; min-width: 0;
    }
    .scenario-llm-output-col { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
    .scenario-llm-output {
      border: 1px solid rgba(124,224,190,0.2); border-radius: 10px; overflow: hidden;
    }
    .scenario-llm-output-header {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 14px; background: rgba(124,224,190,0.06); border-bottom: 1px solid rgba(124,224,190,0.12);
      font-size: 10px; font-family: monospace; color: var(--s-muted);
    }
    .scenario-llm-output-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--s-green); }
    .scenario-llm-output-status { margin-left: auto; font-weight: 700; color: var(--s-green); }
    .scenario-llm-output-body {
      padding: 14px; font-size: 11px; line-height: 1.6; color: var(--s-muted);
      background: rgba(3,7,12,0.6); font-family: monospace; white-space: pre-wrap;
      max-height: 200px; overflow-y: auto; margin: 0;
    }

    .scenario-timeline { border: 1px solid var(--s-border); border-radius: 10px; overflow: hidden; }
    .scenario-timeline-header {
      font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em;
      color: var(--s-muted); padding: 10px 14px; background: rgba(92,167,255,0.06); border-bottom: 1px solid var(--s-border);
    }
    .scenario-timeline-step {
      display: grid; grid-template-columns: 80px 40px 100px 1fr; gap: 8px;
      align-items: center; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .scenario-timeline-step:last-child { border-bottom: none; }
    .scenario-timeline-time { font-size: 10px; font-family: monospace; color: var(--s-blue); font-weight: 700; }
    .scenario-timeline-scenario { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: var(--s-muted); text-align: center; }
    .scenario-timeline-label { font-size: 11px; font-weight: 700; color: var(--s-text); }
    .scenario-timeline-moment { font-size: 11px; color: var(--s-muted); line-height: 1.5; }
  `],
})
export class ScenarioSlide {
  readonly state = inject(ShowcaseState);
  private api = inject(SteelApiService);
  private scenarioStore = inject(ScenarioStore);
  private policy = inject(PolicyStore);

  readonly partLabels = [
    { id: 'introduce', label: 'Introduce' },
    { id: 'playout', label: 'Play-out' },
    { id: 'validate', label: 'Decision tree + ML + ontology + heuristics' },
    { id: 'llm', label: 'LLM rationale' },
  ];

  readonly borealRationale = `{
  "coaId": "COA-MAX_PROTECTION",
  "scenarioName": "Boreal Strike",
  "intentClassification": "STRIKE (P=0.82)",
  "classificationConfidence": 0.85,
  "rationaleText": "5 MISSILE tracks inbound at 450 km/h targeting\nBASE-2 (Highridge Command). Bayesian velocity\nlikelihood g(450,450,150)≈1.0 converges within\n10 seconds. MISSILE class prior bias 0.65 reinforces\nthe classification. MAX_PROTECTION recommended:\nall interceptors allocated, reserve floor 0.80\nmaintained for BASE-2. Monte Carlo validation\n(500 runs, KINETIC red model) confirms 91%\nrobustness. Decision can be committed."
}`;

  readonly feintRationale = `{
  "coaId": "COA-MAX_PROTECTION",
  "scenarioName": "Ghost Feint",
  "intentClassification": "STRIKE (P=0.75, reclassified)",
  "classificationConfidence": 0.70,
  "rationaleText": "10 AIRCRAFT tracks reclassified from PROBE/FEINT\nto STRIKE after redirect to v=450 km/h toward\nBASE-2. Bayesian update: g(450,450,150)=1.0\noverwhelms PROBE prior despite jamming degradation\n(sensor_quality=0.7). System re-optimized from\nBALANCED (2-3 engagements) to MAX_PROTECTION\n(8-10 engagements). Velocity signal alone\nsufficient for reclassification even under EW."
}`;

  loadScenario(index: number): void {
    this.state.scenarioTab.set(index);
    const scenarioId = index === 0 ? 'boreal-strike' : 'ghost-feint';
    this.api.loadScenario(scenarioId as 'boreal-strike' | 'ghost-feint').subscribe();
    if (index === 0) {
      this.scenarioStore.setPhase('phase-3');
      this.policy.updateWeights({ safety: 1.0, sustainability: 0.3 });
    } else {
      this.scenarioStore.setPhase('phase-2');
      this.policy.updateWeights({ safety: 0.5, sustainability: 0.6 });
    }
  }
}