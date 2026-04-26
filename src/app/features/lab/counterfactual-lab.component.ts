import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, firstValueFrom, switchMap, tap, catchError, EMPTY, timer, takeWhile } from 'rxjs';

import { SteelApiService } from '../../core/services/steel-api.service';
import { CounterfactualLabStore } from '../../core/ml/counterfactual-lab.store';
import {
  CounterfactualAsset,
  CounterfactualPrediction,
  CounterfactualSimulationRequest,
  CounterfactualTheaterVector,
} from '../../core/ml/counterfactual-lab.models';
import { FrontierViewComponent } from '../../shared/ui/frontier-view';
import { MatIconModule } from '@angular/material/icon';
import { DrawingBoardStore, DrawingUnit } from '../../core/state/drawing-board.store';
import { ScenarioStore } from '../../core/state/scenario.store';
import { TacticalStore } from '../../core/state/tactical.store';
import { ReadinessStore } from '../../core/state/readiness.store';
import { LogisticsStore } from '../../core/state/logistics.store';

const FALLBACK_ASSETS: CounterfactualAsset[] = [
  {
    id: 'FALLBACK-RADAR',
    label: 'Northern Radar Node',
    unitType: 'SENSOR_PLATFORM',
    side: 'BLUE',
    readiness: 0.88,
    speed: 0.22,
    waypointComplexity: 0.10,
    inventoryDepth: 0.76,
    sensorQuality: 0.96,
    exposedRisk: 0.24,
    mobility: 0.28,
    endurance: 0.82,
    source: 'catalog',
  },
  {
    id: 'FALLBACK-MOBILE',
    label: 'Mobile Interceptor Cell',
    unitType: 'AIR_DEFENSE',
    side: 'BLUE',
    readiness: 0.74,
    speed: 0.68,
    waypointComplexity: 0.34,
    inventoryDepth: 0.58,
    sensorQuality: 0.70,
    exposedRisk: 0.41,
    mobility: 0.78,
    endurance: 0.62,
    source: 'catalog',
  },
  {
    id: 'FALLBACK-DRONE',
    label: 'Recon Drone Swarm',
    unitType: 'UAV',
    side: 'BLUE',
    readiness: 0.63,
    speed: 0.91,
    waypointComplexity: 0.42,
    inventoryDepth: 0.34,
    sensorQuality: 0.85,
    exposedRisk: 0.56,
    mobility: 0.92,
    endurance: 0.47,
    source: 'catalog',
  },
  {
    id: 'FALLBACK-RED',
    label: 'Adversary Pressure Package',
    unitType: 'SWARM',
    side: 'RED',
    readiness: 0.54,
    speed: 0.74,
    waypointComplexity: 0.61,
    inventoryDepth: 0.66,
    sensorQuality: 0.58,
    exposedRisk: 0.72,
    mobility: 0.71,
    endurance: 0.52,
    source: 'catalog',
  },
];

@Component({
  selector: 'app-counterfactual-lab',
  standalone: true,
  imports: [CommonModule, FrontierViewComponent, MatIconModule],
  template: `
    <div class="h-full w-full overflow-hidden bg-boreal-canvas text-boreal-text-primary">
      <div class="flex h-full min-h-0 flex-col p-6 gap-5 animate-in fade-in duration-500">
        <header class="flex items-start justify-between gap-4 border-b border-boreal-border pb-4">
          <div class="space-y-1">
            <h1 class="text-3xl font-black italic uppercase tracking-tight text-boreal-text-primary">
              Counterfactual Command Lab
            </h1>
            <p class="text-[10px] font-mono uppercase tracking-[0.35em] text-boreal-text-muted">
              Synthetic Intelligence Fabric / Forecast Fan Charts / Ensemble Forests
            </p>
          </div>

          <div class="flex items-center gap-3">
            <div class="flex flex-col items-end">
              <span class="text-[8px] font-black uppercase tracking-[0.3em] text-boreal-text-muted">Ensemble Trust</span>
              <div class="mt-1 h-1.5 w-40 overflow-hidden rounded-full border border-boreal-border bg-boreal-panel-muted/20">
                <div class="h-full rounded-full bg-boreal-blue transition-all duration-300"
                     [style.width.%]="store.trustLevel() * 100"
                     [class.bg-boreal-amber]="store.trustLevel() < 0.7"
                     [class.bg-boreal-red]="store.trustLevel() < 0.45"></div>
              </div>
            </div>
            <button
              (click)="triggerDeepSim()"
              [disabled]="store.isSimulating() || !store.simulationRequest()"
              class="rounded border border-boreal-blue/40 bg-boreal-blue/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-boreal-blue transition-all hover:bg-boreal-blue/20 disabled:cursor-not-allowed disabled:opacity-30">
              {{ store.isSimulating() ? 'Worker Active...' : 'Trigger Deep Sim' }}
            </button>
          </div>
        </header>

        <div class="grid min-h-0 flex-1 grid-cols-12 gap-5">
          <!-- Control rail -->
          <aside class="col-span-12 lg:col-span-3 flex min-h-0 flex-col gap-4">
            <section class="rounded border border-boreal-border bg-boreal-panel/40 p-4">
              <div class="mb-4 flex items-center justify-between">
                <div>
                  <div class="text-[8px] font-black uppercase tracking-[0.35em] text-boreal-text-muted">Simulation Context</div>
                  <div class="mt-1 text-[10px] font-mono uppercase tracking-[0.25em] text-boreal-text-secondary">
                    {{ theaterLabel() }}
                  </div>
                </div>
                <span class="rounded-sm border border-boreal-border bg-boreal-canvas/50 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.25em] text-boreal-text-muted">
                  {{ store.availableAssets().length }} assets
                </span>
              </div>

              <div class="space-y-4">
                <div>
                  @if (store.selectedAsset(); as asset) {
                    <div class="mb-2 flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.25em] text-boreal-text-muted">
                      <span>Selected Asset</span>
                      <span>{{ asset.source || 'catalog' }}</span>
                    </div>
                  } @else {
                    <div class="mb-2 flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.25em] text-boreal-text-muted">
                      <span>Selected Asset</span>
                      <span>catalog</span>
                    </div>
                  }
                  <div class="max-h-52 space-y-2 overflow-y-auto pr-1">
                    @for (asset of store.availableAssets(); track asset.id) {
                      <button
                        (click)="store.selectAsset(asset.id)"
                        class="w-full rounded border px-3 py-2 text-left transition-all"
                        [class.border-boreal-blue/40]="store.selectedAssetId() === asset.id"
                        [class.bg-boreal-blue/10]="store.selectedAssetId() === asset.id"
                        [class.border-boreal-border]="store.selectedAssetId() !== asset.id"
                        [class.bg-boreal-canvas/40]="store.selectedAssetId() !== asset.id">
                        <div class="flex items-center justify-between gap-3">
                          <div>
                            <div class="text-[10px] font-bold uppercase tracking-tight text-boreal-text-primary">{{ asset.label }}</div>
                            <div class="text-[8px] font-mono uppercase tracking-[0.2em] text-boreal-text-muted">{{ asset.unitType }} · {{ asset.side }}</div>
                          </div>
                          <div class="text-right text-[8px] font-mono text-boreal-text-muted">
                            <div>{{ asset.readiness * 100 | number:'1.0-0' }}%</div>
                            <div>ready</div>
                          </div>
                        </div>
                      </button>
                    }
                  </div>
                </div>

                @if (store.selectedAsset(); as asset) {
                  <div class="grid grid-cols-3 gap-2">
                    <div class="rounded border border-boreal-border bg-boreal-canvas/40 p-2">
                      <div class="text-[7px] font-black uppercase tracking-[0.3em] text-boreal-text-muted">Readiness</div>
                      <div class="mt-1 text-[18px] font-mono font-bold text-boreal-text-primary">{{ asset.readiness * 100 | number:'1.0-0' }}%</div>
                    </div>
                    <div class="rounded border border-boreal-border bg-boreal-canvas/40 p-2">
                      <div class="text-[7px] font-black uppercase tracking-[0.3em] text-boreal-text-muted">Risk</div>
                      <div class="mt-1 text-[18px] font-mono font-bold text-boreal-amber">{{ asset.exposedRisk * 100 | number:'1.0-0' }}%</div>
                    </div>
                    <div class="rounded border border-boreal-border bg-boreal-canvas/40 p-2">
                      <div class="text-[7px] font-black uppercase tracking-[0.3em] text-boreal-text-muted">Sensor</div>
                      <div class="mt-1 text-[18px] font-mono font-bold text-boreal-blue">{{ asset.sensorQuality * 100 | number:'1.0-0' }}%</div>
                    </div>
                  </div>
                }
              </div>
            </section>

            <section class="rounded border border-boreal-border bg-boreal-panel/40 p-4">
              <div class="mb-4 flex items-center justify-between">
                <div class="text-[8px] font-black uppercase tracking-[0.35em] text-boreal-text-muted">Policy Perturbations</div>
                <div class="text-[8px] font-mono uppercase tracking-[0.25em] text-boreal-text-muted">
                  {{ store.activePolicyDeltas().safety | number:'1.2-2' }} / {{ store.activePolicyDeltas().sustainability | number:'1.2-2' }}
                </div>
              </div>

              <div class="space-y-4">
                <div>
                  <div class="mb-1 flex justify-between text-[9px] font-mono uppercase tracking-[0.2em] text-boreal-text-muted">
                    <span>Safety Delta</span>
                    <span class="text-boreal-blue font-bold">{{ store.activePolicyDeltas().safety | number:'1.2-2' }}</span>
                  </div>
                  <input type="range" min="-1" max="1" step="0.05"
                         [value]="store.activePolicyDeltas().safety"
                         (input)="onDeltaChange('safety', $event)"
                         class="w-full h-1 appearance-none rounded-lg bg-boreal-border accent-boreal-blue">
                </div>

                <div>
                  <div class="mb-1 flex justify-between text-[9px] font-mono uppercase tracking-[0.2em] text-boreal-text-muted">
                    <span>Sustainability Delta</span>
                    <span class="text-boreal-blue font-bold">{{ store.activePolicyDeltas().sustainability | number:'1.2-2' }}</span>
                  </div>
                  <input type="range" min="-1" max="1" step="0.05"
                         [value]="store.activePolicyDeltas().sustainability"
                         (input)="onDeltaChange('sustainability', $event)"
                         class="w-full h-1 appearance-none rounded-lg bg-boreal-border accent-boreal-blue">
                </div>

                <div>
                  <div class="mb-1 flex justify-between text-[9px] font-mono uppercase tracking-[0.2em] text-boreal-text-muted">
                    <span>Resilience Delta</span>
                    <span class="text-boreal-blue font-bold">{{ store.activePolicyDeltas().resilience | number:'1.2-2' }}</span>
                  </div>
                  <input type="range" min="-1" max="1" step="0.05"
                         [value]="store.activePolicyDeltas().resilience ?? 0"
                         (input)="onDeltaChange('resilience', $event)"
                         class="w-full h-1 appearance-none rounded-lg bg-boreal-border accent-boreal-blue">
                </div>
              </div>
            </section>
          </aside>

          <!-- Central simulation stack -->
          <main class="col-span-12 lg:col-span-6 flex min-h-0 flex-col gap-4">
            <section class="flex min-h-[520px] flex-1 overflow-hidden rounded border border-boreal-border bg-boreal-panel/30">
              <app-frontier-view
                class="h-full w-full"
                [prediction]="store.latestPrediction()"
                [selectedMetricName]="selectedMetricName()"
                [selectedAsset]="store.selectedAsset()"
                (selectedMetricNameChange)="onMetricSelected($event)">
              </app-frontier-view>
            </section>

            <section class="rounded border border-boreal-border bg-boreal-panel/40 p-4">
              <div class="mb-3 flex items-center justify-between">
                <div>
                  <div class="text-[8px] font-black uppercase tracking-[0.35em] text-boreal-text-muted">Forecast Timeline</div>
                  @if (selectedMetric(); as metric) {
                    <div class="mt-1 text-[10px] font-mono uppercase tracking-[0.2em] text-boreal-text-secondary">
                      {{ metric.name || 'robustness' }} fan chart over 30 minutes
                    </div>
                  } @else {
                    <div class="mt-1 text-[10px] font-mono uppercase tracking-[0.2em] text-boreal-text-secondary">
                      robustness fan chart over 30 minutes
                    </div>
                  }
                </div>
                <div class="text-right">
                  <div class="text-[8px] font-black uppercase tracking-[0.35em] text-boreal-text-muted">Final Value</div>
                  @if (selectedMetric(); as metric) {
                    <div class="text-[13px] font-mono font-bold text-boreal-text-primary">
                      {{ metricFinalValue(metric) * 100 | number:'1.0-0' }}%
                    </div>
                  } @else {
                    <div class="text-[13px] font-mono font-bold text-boreal-text-primary">0%</div>
                  }
                </div>
              </div>

              @if (selectedMetric(); as metric) {
                <div class="grid grid-cols-7 gap-2">
                  @for (step of metric.p50; track $index) {
                    <div class="flex flex-col items-center gap-1">
                      <div class="relative flex h-28 w-full items-end justify-center rounded border border-boreal-border bg-boreal-canvas/40 px-1">
                        <div class="absolute bottom-0 w-3 rounded-t bg-boreal-blue/15"
                             [style.height.%]="metric.p90[$index] * 100"></div>
                        <div class="absolute bottom-0 w-2 rounded-t bg-boreal-blue/35"
                             [style.height.%]="metric.p50[$index] * 100"></div>
                        <div class="absolute bottom-0 h-1 w-4 rounded-full bg-boreal-text-primary"
                             [style.bottom.%]="metric.p10[$index] * 100"></div>
                      </div>
                      <div class="text-[7px] font-mono uppercase tracking-[0.2em] text-boreal-text-muted">T+{{ metricSummaryStep(metric, $index) }}m</div>
                    </div>
                  }
                </div>
              }
            </section>
          </main>

          <!-- Analysis rail -->
          <aside class="col-span-12 lg:col-span-3 flex min-h-0 flex-col gap-4">
            <section class="rounded border border-boreal-border bg-boreal-panel/40 p-4">
              <div class="mb-3 flex items-center justify-between">
                <div>
                  <div class="text-[8px] font-black uppercase tracking-[0.35em] text-boreal-text-muted">Deep Sim State</div>
                  <div class="mt-1 text-[10px] font-mono uppercase tracking-[0.2em] text-boreal-text-secondary">
                    {{ store.deepSimJob()?.status || 'idle' }}
                  </div>
                </div>
                <span class="rounded-sm border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.25em]"
                      [class.border-boreal-amber/30]="store.latestPrediction()?.deep_sim_hint?.required"
                      [class.bg-boreal-amber/10]="store.latestPrediction()?.deep_sim_hint?.required"
                      [class.text-boreal-amber]="store.latestPrediction()?.deep_sim_hint?.required"
                      [class.border-boreal-green/30]="!store.latestPrediction()?.deep_sim_hint?.required"
                      [class.bg-boreal-green/10]="!store.latestPrediction()?.deep_sim_hint?.required"
                      [class.text-boreal-green]="!store.latestPrediction()?.deep_sim_hint?.required">
                  {{ store.latestPrediction()?.deep_sim_hint?.required ? 'deep sim recommended' : 'fast path' }}
                </span>
              </div>

              <div class="space-y-3 text-[9px] font-mono">
                <div class="flex justify-between gap-4">
                  <span class="text-boreal-text-muted">Scenario</span>
                  <span class="text-boreal-text-primary">{{ store.latestPrediction()?.scenario_digest || 'pending' }}</span>
                </div>
                <div class="flex justify-between gap-4">
                  <span class="text-boreal-text-muted">Job ID</span>
                  <span class="text-boreal-text-primary">{{ store.deepSimJob()?.job_id || 'n/a' }}</span>
                </div>
                <div class="flex justify-between gap-4">
                  <span class="text-boreal-text-muted">Runs</span>
                  <span class="text-boreal-text-primary">{{ store.deepSimJob()?.n_runs || 1000 }}</span>
                </div>
                <div class="flex justify-between gap-4">
                  <span class="text-boreal-text-muted">Trust</span>
                  <span class="text-boreal-text-primary">{{ store.trustLevel() * 100 | number:'1.0-0' }}%</span>
                </div>
              </div>

              @if (store.deepSimPolling()) {
                <div class='flex items-center gap-2 mt-3 py-2 px-3 bg-boreal-blue/5 border border-boreal-blue/20 rounded-sm'>
                  <span class='w-2 h-2 rounded-full bg-boreal-blue animate-ping flex-shrink-0'></span>
                  <span class='text-[8px] font-mono text-boreal-blue uppercase tracking-widest'>
                    Awaiting RunPod result…
                  </span>
                </div>
              }
              @if (store.deepSimError()) {
                <div class='flex items-center gap-2 mt-3 py-2 px-3 bg-boreal-red/5 border border-boreal-red/20 rounded-sm'>
                  <mat-icon class='!text-xs text-boreal-red'>error_outline</mat-icon>
                  <span class='text-[8px] font-mono text-boreal-red'>{{ store.deepSimError() }}</span>
                </div>
              }

              @if (store.latestPrediction()?.deep_sim_hint; as hint) {
                <div class="mt-4 rounded border border-boreal-border bg-boreal-canvas/45 p-3 text-[9px] leading-relaxed text-boreal-text-secondary">
                  <div class="mb-1 text-[8px] font-black uppercase tracking-[0.3em] text-boreal-text-muted">Why</div>
                  {{ hint.reason }}
                </div>
              }

              @if (deepSimResult(); as result) {
                <div class='mt-4 rounded-sm border border-boreal-border bg-boreal-panel-elevated p-4 space-y-3'>
                  <div class='text-[8px] font-mono uppercase tracking-widest text-boreal-text-muted'>Deep Sim Result</div>
                  <div class='text-2xl font-black text-boreal-green'>{{ result.trust_score * 100 | number:'1.0-0' }}<span class='text-sm'>%</span> confidence</div>
                  <svg viewBox='0 0 80 30' class='w-full h-10 border-b border-boreal-border/30'>
                    <polyline [attr.points]='trajectoryPoints()' fill='none' stroke='var(--boreal-blue)' stroke-width='1.5' stroke-linejoin='round'/>
                  </svg>
                  <div class='text-[8px] font-mono text-boreal-amber'>Scenario Digest: {{ result.scenario_digest }}</div>
                  <div class='text-[8px] text-boreal-text-muted italic leading-relaxed'>Model: {{ result.model_version }}</div>
                </div>
              }
            </section>

            <section class="min-h-[220px] rounded border border-boreal-border bg-boreal-panel/40 p-4">
              <div class="mb-3 flex items-center justify-between">
                <div class="text-[8px] font-black uppercase tracking-[0.35em] text-boreal-text-muted">Forest Diagnostics</div>
                <div class="text-[8px] font-mono uppercase tracking-[0.2em] text-boreal-text-muted">
                  {{ ensembleAgreement() * 100 | number:'1.0-0' }}% avg
                </div>
              </div>

              <div class="space-y-2">
                @for (member of ensembleMembers(); track member.id) {
                  <div class="rounded border border-boreal-border bg-boreal-canvas/40 p-2">
                    <div class="flex items-center justify-between">
                      <div>
                        <div class="text-[10px] font-bold uppercase tracking-tight text-boreal-text-primary">{{ member.label }}</div>
                        <div class="text-[8px] font-mono uppercase tracking-[0.2em] text-boreal-text-muted">Var {{ member.variance | number:'1.3-3' }}</div>
                      </div>
                      <div class="text-[8px] font-mono text-boreal-text-primary">{{ member.agreement * 100 | number:'1.0-0' }}%</div>
                    </div>
                    <div class="mt-2 h-1.5 overflow-hidden rounded-full border border-boreal-border bg-boreal-canvas/60">
                      <div class="h-full rounded-full bg-boreal-blue" [style.width.%]="member.agreement * 100"></div>
                    </div>
                  </div>
                }
              </div>
            </section>

            <section class="flex-1 rounded border border-boreal-border bg-boreal-panel/40 p-4">
              <div class="mb-3 flex items-center justify-between">
                <div class="text-[8px] font-black uppercase tracking-[0.35em] text-boreal-text-muted">Asset Comparison</div>
                <div class="text-[8px] font-mono uppercase tracking-[0.2em] text-boreal-text-muted">{{ assetImpacts().length }} assets</div>
              </div>

              <div class="space-y-3 overflow-y-auto pr-1">
                @for (asset of assetImpacts(); track asset.asset_id) {
                  <div class="rounded border p-3 transition-all"
                       [class.border-boreal-blue/40]="asset.asset_id === store.selectedAssetId()"
                       [class.bg-boreal-blue/10]="asset.asset_id === store.selectedAssetId()"
                       [class.border-boreal-border]="asset.asset_id !== store.selectedAssetId()"
                       [class.bg-boreal-canvas/40]="asset.asset_id !== store.selectedAssetId()">
                    <div class="flex items-start justify-between gap-2">
                      <div>
                        <div class="text-[10px] font-bold uppercase tracking-tight text-boreal-text-primary">{{ asset.label }}</div>
                        <div class="text-[8px] font-mono uppercase tracking-[0.2em] text-boreal-text-muted">{{ asset.unit_type }} · {{ asset.side }}</div>
                      </div>
                      <div class="text-right text-[8px] font-mono">
                        <div [class.text-boreal-green]="asset.delta_robustness >= 0" [class.text-boreal-red]="asset.delta_robustness < 0">
                          {{ asset.delta_robustness >= 0 ? '+' : '' }}{{ asset.delta_robustness | number:'1.2-2' }}
                        </div>
                        <div class="text-boreal-text-muted">robustness</div>
                      </div>
                    </div>
                    <div class="mt-2 flex items-center gap-2 text-[8px] font-mono text-boreal-text-muted">
                      <span>{{ asset.readiness_floor * 100 | number:'1.0-0' }}% floor</span>
                      <span>·</span>
                      <span>{{ asset.failure_probability * 100 | number:'1.0-0' }}% fail</span>
                      <span>·</span>
                      <span>{{ asset.asymmetry_ratio | number:'1.1-1' }} asym</span>
                    </div>
                    <p class="mt-2 text-[9px] leading-relaxed text-boreal-text-secondary">
                      {{ asset.summary }}
                    </p>
                  </div>
                }
              </div>
            </section>

            <section class="rounded border border-boreal-border bg-boreal-panel/40 p-4">
              <div class="mb-3 flex items-center justify-between">
                <div class="text-[8px] font-black uppercase tracking-[0.35em] text-boreal-text-muted">Feature Importance</div>
                <div class="text-[8px] font-mono uppercase tracking-[0.2em] text-boreal-text-muted">Top drivers</div>
              </div>
              <div class="space-y-2">
                @for (feature of featureImportances(); track feature.name) {
                  <div>
                    <div class="mb-1 flex items-center justify-between text-[8px] font-mono uppercase tracking-[0.2em] text-boreal-text-muted">
                      <span>{{ feature.name }}</span>
                      <span>{{ feature.impact | number:'1.3-3' }}</span>
                    </div>
                    <div class="h-1.5 overflow-hidden rounded-full border border-boreal-border bg-boreal-canvas/60">
                      <div class="h-full rounded-full bg-boreal-blue" [style.width.%]="feature.impact * 100"></div>
                    </div>
                  </div>
                }
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  `,
})
export class CounterfactualLab {
  readonly store = inject(CounterfactualLabStore);
  private readonly api = inject(SteelApiService);
  private readonly http = inject(HttpClient);
  private readonly drawingBoard = inject(DrawingBoardStore);
  private readonly scenario = inject(ScenarioStore);
  private readonly tactical = inject(TacticalStore);
  private readonly readiness = inject(ReadinessStore);
  private readonly logistics = inject(LogisticsStore);
  private readonly destroyRef = inject(DestroyRef);

  private jobId = signal<string | null>(null);
  simRunning = signal(false);
  deepSimResult = signal<CounterfactualPrediction | null>(null);
  simError = signal<string | null>(null);

  readonly selectedMetricName = signal('robustness');

  private readonly request$ = new Subject<CounterfactualSimulationRequest>();

  readonly trajectoryPoints = computed(() => {
    const t = this.deepSimResult()?.p50;
    if (!t || t.length === 0) return '';
    return t.map((v: number, i: number) => `${i * 26 + 2},${28 - v * 26}`).join(' ');
  });

  readonly selectedMetric = computed(() => {
    const prediction = this.store.latestPrediction();
    const metrics = prediction?.metric_trajectories ?? [];
    return metrics.find(metric => metric.name === this.selectedMetricName()) ?? metrics[0] ?? null;
  });

  readonly ensembleAgreement = computed(() => {
    const members = this.store.ensembleMembers();
    if (!members.length) return 0;
    return members.reduce((sum, member) => sum + member.agreement, 0) / members.length;
  });

  readonly assetImpacts = computed(() => this.store.assetImpacts());
  readonly featureImportances = computed(() => this.store.featureImportances());
  readonly ensembleMembers = computed(() => this.store.ensembleMembers());

  constructor() {
    this.setupPredictionPipeline();

    effect(() => {
      const nextAssets = this.buildAssets();
      const currentAssets = this.store.availableAssets();
      if (this.assetsSignature(nextAssets) !== this.assetsSignature(currentAssets)) {
        this.store.setAssets(nextAssets);
      }
      const selectedFromBoard = this.drawingBoard.selectedUnitId();
      const selectedAsset = this.store.selectedAsset();
      if (
        selectedFromBoard
        && this.store.availableAssets().some(asset => asset.id === selectedFromBoard)
        && (!selectedAsset || selectedAsset.source !== 'drawing_board')
      ) {
        this.store.selectAsset(selectedFromBoard);
      }
    }, { allowSignalWrites: true });

    effect(() => {
      this.store.setTheater(this.buildTheaterVector());
    }, { allowSignalWrites: true });

    effect(() => {
      const request = this.store.simulationRequest();
      if (request) {
        this.request$.next(request);
      }
    });

    effect(() => {
      const prediction = this.store.latestPrediction();
      const names = prediction?.metric_trajectories.map(metric => metric.name) ?? [];
      if (names.length && !names.includes(this.selectedMetricName())) {
        this.selectedMetricName.set(names[0]);
      }
    }, { allowSignalWrites: true });
  }

  onDeltaChange(key: 'safety' | 'sustainability' | 'resilience', event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.store.updateDeltas({
      ...this.store.activePolicyDeltas(),
      [key]: value,
    });
  }

  onMetricSelected(metricName: string): void {
    this.selectedMetricName.set(metricName);
  }

  async triggerDeepSim(): Promise<void> {
    const request = this.store.simulationRequest();
    if (!request) return;

    this.store.setSimulating(true);
    this.store.setDeepSimError(null);
    this.store.setDeepSimPolling(false);

    try {
      const job = await firstValueFrom(this.api.triggerDeepSim(request));
      this.store.setDeepSimJob(job);
      this.store.setSimulating(false);
      this.startJobPolling(job.provider_job_id ?? job.job_id);
    } catch (error) {
      console.error('[CounterfactualLab] trigger failed', error);
      this.store.setSimulating(false);
    }
  }

  private startJobPolling(jobId: string): void {
    this.store.setDeepSimPolling(true);
    timer(3000, 4000).pipe(
      takeUntilDestroyed(this.destroyRef),
      switchMap(() => this.api.getDeepSimStatus(jobId)),
      takeWhile(r => r.status !== 'COMPLETED' && r.status !== 'FAILED', true),
    ).subscribe({
      next: r => {
        if (r.status === 'COMPLETED' && r.output) {
          this.store.applyPrediction(r.output);
          this.store.setDeepSimPolling(false);
        }
        if (r.status === 'FAILED') {
          this.store.setDeepSimError(r.error ?? 'Deep simulation failed on RunPod');
          this.store.setDeepSimPolling(false);
        }
      },
      error: e => {
        console.error('[CounterfactualLab] poll error', e);
        this.store.setDeepSimError('Network error during polling');
        this.store.setDeepSimPolling(false);
      },
    });
  }

  theaterLabel(): string {
    const vector = this.store.simulationRequest()?.theater;
    if (!vector) return 'No theater context';
    return `${vector.scenarioName || 'Unknown'} · ${vector.phase || 'n/a'} · ${vector.trackCount} tracks`;
  }

  metricSummaryStep(metric: { p50: number[] }, index: number): number {
    const step = this.store.latestPrediction()?.time_horizon?.[index] ?? index * 5;
    return step;
  }

  metricFinalValue(metric: { p50: number[] } | null): number {
    if (!metric?.p50?.length) return 0;
    return metric.p50[metric.p50.length - 1] ?? 0;
  }

  private setupPredictionPipeline(): void {
    this.request$.pipe(
      debounceTime(160),
      tap(() => this.store.setSimulating(true)),
      switchMap(request =>
        this.api.predictCounterfactual(request).pipe(
          catchError(error => {
            console.error('Counterfactual inference failed', error);
            this.store.setSimulating(false);
            return EMPTY;
          }),
        ),
      ),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(prediction => {
      this.store.applyPrediction(prediction);
      this.store.setSimulating(false);
    });
  }

  private buildTheaterVector(): CounterfactualTheaterVector {
    const activeThreats = this.tactical.activeThreats();
    const avgVelocity = activeThreats.length
      ? activeThreats.reduce((sum, threat) => sum + threat.geometry.velocity, 0) / activeThreats.length
      : 0;
    const velocitySpread = activeThreats.length > 1
      ? Math.max(...activeThreats.map(threat => threat.geometry.velocity)) - Math.min(...activeThreats.map(threat => threat.geometry.velocity))
      : 0;

    return {
      timestamp: new Date().toISOString(),
      trackCount: activeThreats.length,
      avgVelocity,
      clusterDensity: Math.min(1, activeThreats.length / 12 + (1 - this.logistics.supplyHealth()) * 0.15),
      baseReadinessMean: this.readiness.overallReadiness(),
      jammerIntensity: this.scenario.isJamming() ? 0.82 : Math.min(1, activeThreats.filter(threat => threat.jammingProbability ?? 0).length / Math.max(1, activeThreats.length)),
      policyDeltas: this.store.activePolicyDeltas(),
      scenarioName: this.scenario.scenarioName(),
      phase: this.scenario.currentPhase()?.name ?? this.scenario.mode(),
      trackVelocitySpread: velocitySpread,
    };
  }

  private buildAssets(): CounterfactualAsset[] {
    const units = this.drawingBoard.units();
    if (!units.length) return FALLBACK_ASSETS.map(asset => ({ ...asset }));
    const selectedId = this.drawingBoard.selectedUnitId();
    return units.map((unit, index) => this.convertUnit(unit, index, unit.id === selectedId));
  }

  private convertUnit(unit: DrawingUnit, index: number, isSelected: boolean): CounterfactualAsset {
    const complexity = Math.min(1, (unit.waypoints.length * 0.12) + (this.pathComplexity(unit) * 0.002));
    const mobility = Math.min(1, unit.speed / 250);
    const readinessBase = unit.side === 'BLUE' ? 0.68 : 0.52;
    const typeBias = this.unitTypeBias(unit.type);

    return {
      id: unit.id,
      label: unit.label || `Unit ${index + 1}`,
      unitType: unit.type,
      side: unit.side,
      readiness: this.clamp(readinessBase + typeBias.readiness + (isSelected ? 0.06 : 0) - complexity * 0.15, 0, 1),
      speed: mobility,
      waypointComplexity: this.clamp(complexity, 0, 1),
      inventoryDepth: this.clamp(typeBias.inventory + (unit.side === 'BLUE' ? 0.12 : -0.08), 0, 1),
      sensorQuality: this.clamp(typeBias.sensor + (unit.side === 'BLUE' ? 0.08 : -0.05), 0, 1),
      exposedRisk: this.clamp(typeBias.risk + complexity * 0.35 + (unit.side === 'RED' ? 0.10 : 0), 0, 1),
      mobility,
      endurance: this.clamp(typeBias.endurance - complexity * 0.10 + (unit.side === 'BLUE' ? 0.04 : 0), 0, 1),
      source: 'drawing_board',
      metadata: {
        selected: isSelected,
        waypointCount: unit.waypoints.length,
      },
    };
  }

  private unitTypeBias(type: DrawingUnit['type']): { readiness: number; inventory: number; sensor: number; risk: number; endurance: number } {
    switch (type) {
      case 'AIRCRAFT':
        return { readiness: 0.04, inventory: 0.32, sensor: 0.28, risk: 0.18, endurance: 0.54 };
      case 'DRONE':
        return { readiness: 0.02, inventory: 0.18, sensor: 0.34, risk: 0.28, endurance: 0.36 };
      case 'HELICOPTER':
        return { readiness: 0.03, inventory: 0.22, sensor: 0.26, risk: 0.24, endurance: 0.42 };
      case 'SHIP_CARRIER':
        return { readiness: 0.06, inventory: 0.55, sensor: 0.33, risk: 0.20, endurance: 0.80 };
      case 'SHIP_DESTROYER':
        return { readiness: 0.05, inventory: 0.46, sensor: 0.30, risk: 0.18, endurance: 0.72 };
      case 'SHIP_SUBMARINE':
        return { readiness: 0.03, inventory: 0.28, sensor: 0.22, risk: 0.26, endurance: 0.68 };
      case 'SHIP_PATROL':
        return { readiness: 0.02, inventory: 0.24, sensor: 0.18, risk: 0.16, endurance: 0.45 };
      case 'ARTILLERY':
        return { readiness: 0.02, inventory: 0.38, sensor: 0.14, risk: 0.22, endurance: 0.50 };
      case 'ARMOR':
        return { readiness: 0.04, inventory: 0.34, sensor: 0.16, risk: 0.20, endurance: 0.58 };
      case 'SPECIAL_FORCES':
        return { readiness: 0.05, inventory: 0.20, sensor: 0.26, risk: 0.14, endurance: 0.40 };
      case 'INFANTRY':
      default:
        return { readiness: 0.01, inventory: 0.16, sensor: 0.10, risk: 0.12, endurance: 0.34 };
    }
  }

  private pathComplexity(unit: DrawingUnit): number {
    const pts = [{ x: unit.startX, y: unit.startY }, ...unit.waypoints];
    if (pts.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      total += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    }
    return total;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private assetsSignature(assets: CounterfactualAsset[]): string {
    return assets
      .map(asset => [
        asset.id,
        asset.label,
        asset.unitType,
        asset.side,
        asset.readiness.toFixed(3),
        asset.speed.toFixed(3),
        asset.waypointComplexity.toFixed(3),
        asset.inventoryDepth.toFixed(3),
        asset.sensorQuality.toFixed(3),
        asset.exposedRisk.toFixed(3),
        asset.mobility.toFixed(3),
        asset.endurance.toFixed(3),
        asset.source,
      ].join(':'))
      .join('|');
  }
}
