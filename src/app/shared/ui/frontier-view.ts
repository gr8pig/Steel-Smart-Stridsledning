import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CounterfactualAsset, CounterfactualPrediction, ForecastMetric } from '../../core/ml/counterfactual-lab.models';

interface PathPoint { x: number; y: number }

@Component({
  selector: 'app-frontier-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex h-full w-full flex-col overflow-hidden rounded border border-boreal-border bg-boreal-panel/40 shadow-2xl select-none">
      <div class="flex items-center justify-between border-b border-boreal-border bg-boreal-panel-muted/20 px-4 py-2">
        <div class="flex items-center gap-3">
          <div class="flex flex-col">
            <span class="text-[9px] font-black uppercase tracking-[0.35em] text-boreal-text-muted">Counterfactual Forecast</span>
            <span class="text-[10px] font-mono uppercase tracking-[0.2em] text-boreal-text-primary">
              {{ selectedMetric?.name || 'robustness' }} / {{ selectedAsset?.label || 'No asset selected' }}
            </span>
          </div>
          @if (prediction?.is_speculative) {
            <span class="rounded-sm border border-boreal-amber/40 bg-boreal-amber/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.3em] text-boreal-amber animate-pulse">
              speculative
            </span>
          }
        </div>
        <div class="flex items-center gap-3">
          <div class="text-right">
            <div class="text-[7px] font-black uppercase tracking-[0.3em] text-boreal-text-muted">Trust Gate</div>
            <div class="text-[11px] font-mono font-bold text-boreal-text-primary">{{ (prediction?.trust_score ?? 1) * 100 | number:'1.0-0' }}%</div>
          </div>
          <div class="h-8 w-24 rounded-sm border border-boreal-border bg-boreal-canvas/60 p-1">
            <div class="h-full rounded-sm bg-boreal-blue transition-all duration-300"
                 [style.width.%]="(prediction?.trust_score ?? 1) * 100"
                 [class.bg-boreal-amber]="(prediction?.trust_score ?? 1) < 0.7"
                 [class.bg-boreal-red]="(prediction?.trust_score ?? 1) < 0.45"></div>
          </div>
        </div>
      </div>

      <div class="relative flex min-h-0 flex-1 flex-col">
        <div class="absolute inset-0 opacity-[0.04] pointer-events-none" style="background-image: radial-gradient(circle, var(--boreal-text-primary) 1px, transparent 1px); background-size: 34px 34px;"></div>

        <div class="grid min-h-0 flex-1 grid-cols-12 gap-0">
          <div class="col-span-12 lg:col-span-8 relative min-h-0 border-r border-boreal-border/60">
            <svg class="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="fanFill" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="var(--boreal-blue)" stop-opacity="0.30" />
                  <stop offset="100%" stop-color="var(--boreal-blue)" stop-opacity="0.02" />
                </linearGradient>
                <linearGradient id="forestFill" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="var(--boreal-blue)" stop-opacity="0.15" />
                  <stop offset="100%" stop-color="var(--boreal-blue)" stop-opacity="0.02" />
                </linearGradient>
                <filter id="specFog" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.1" />
                </filter>
              </defs>

              <g class="text-boreal-border/30">
                <line x1="10" y1="20" x2="90" y2="20" stroke="currentColor" stroke-width="0.5" />
                <line x1="10" y1="40" x2="90" y2="40" stroke="currentColor" stroke-width="0.5" />
                <line x1="10" y1="60" x2="90" y2="60" stroke="currentColor" stroke-width="0.5" />
                <line x1="10" y1="80" x2="90" y2="80" stroke="currentColor" stroke-width="0.5" />
                <line x1="20" y1="10" x2="20" y2="90" stroke="currentColor" stroke-width="0.5" />
                <line x1="40" y1="10" x2="40" y2="90" stroke="currentColor" stroke-width="0.5" />
                <line x1="60" y1="10" x2="60" y2="90" stroke="currentColor" stroke-width="0.5" />
                <line x1="80" y1="10" x2="80" y2="90" stroke="currentColor" stroke-width="0.5" />
              </g>

              <path [attr.d]="bandPath" fill="url(#fanFill)" class="pointer-events-none" />
              <path [attr.d]="medianPath" fill="none" stroke="var(--boreal-blue)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />

              @for (member of memberPaths; track member.id) {
                <path [attr.d]="member.d"
                      fill="none"
                      [attr.opacity]="member.opacity"
                      [attr.stroke]="member.color"
                      stroke-width="0.9"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      [attr.filter]="prediction?.is_speculative ? 'url(#specFog)' : null" />
              }

              @if (latestPoint) {
                <g [attr.transform]="'translate(' + latestPoint.x + ',' + latestPoint.y + ')'">
                  <circle r="4" fill="var(--boreal-blue)" opacity="0.12" />
                  <circle r="1.3" fill="var(--boreal-blue)" />
                </g>
              }

              <text x="12" y="96" class="fill-boreal-text-muted font-mono" style="font-size: 3px;">T0</text>
              <text x="86" y="96" class="fill-boreal-text-muted font-mono" style="font-size: 3px;">T+30</text>
              <text x="4" y="14" class="fill-boreal-text-muted font-mono" transform="rotate(-90 4 14)" style="font-size: 3px;">Outcome</text>
            </svg>
          </div>

          <div class="col-span-12 lg:col-span-4 flex min-h-0 flex-col">
            <div class="border-b border-boreal-border px-4 py-3">
              <div class="flex items-center justify-between">
                <span class="text-[8px] font-black uppercase tracking-[0.35em] text-boreal-text-muted">Forest Members</span>
                <span class="text-[8px] font-mono text-boreal-text-muted">{{ ensembleAgreement | number:'1.2-2' }} agreement</span>
              </div>
              <div class="mt-3 space-y-2">
                @for (member of memberPaths.slice(0, 7); track member.id) {
                  <div class="flex items-center gap-2">
                    <div class="w-16 text-[8px] font-mono uppercase tracking-[0.2em] text-boreal-text-muted">{{ member.label }}</div>
                    <div class="h-2 flex-1 overflow-hidden rounded-full border border-boreal-border bg-boreal-canvas/60">
                      <div class="h-full bg-boreal-blue transition-all duration-300" [style.width.%]="member.agreement * 100"></div>
                    </div>
                    <div class="w-10 text-right text-[8px] font-mono text-boreal-text-primary">{{ member.agreement * 100 | number:'1.0-0' }}%</div>
                  </div>
                }
              </div>
            </div>

            <div class="flex-1 overflow-y-auto px-4 py-3">
              <div class="mb-4">
                <div class="mb-2 text-[8px] font-black uppercase tracking-[0.35em] text-boreal-text-muted">Forecast Bands</div>
                <div class="space-y-2">
                  @for (metric of metricSummary; track metric.name) {
                    <button type="button"
                            class="flex w-full items-center justify-between rounded-sm border px-2 py-2 text-left transition-all"
                            [class.border-boreal-blue/40]="metric.name === selectedMetric?.name"
                            [class.bg-boreal-blue/10]="metric.name === selectedMetric?.name"
                            [class.border-boreal-border]="metric.name !== selectedMetric?.name"
                            [class.bg-boreal-canvas/40]="metric.name !== selectedMetric?.name"
                            (click)="metricClick(metric.name)">
                      <div>
                        <div class="text-[10px] font-bold uppercase tracking-tight text-boreal-text-primary">{{ metric.name }}</div>
                        <div class="text-[8px] font-mono uppercase tracking-[0.2em] text-boreal-text-muted">{{ metric.unit }}</div>
                      </div>
                      <div class="text-right font-mono">
                        <div class="text-[10px] font-bold text-boreal-text-primary">{{ metric.p50[metric.p50.length - 1] * 100 | number:'1.0-0' }}</div>
                        <div class="text-[8px] text-boreal-text-muted">final</div>
                      </div>
                    </button>
                  }
                </div>
              </div>

              @if (selectedAsset) {
                <div class="rounded-sm border border-boreal-border bg-boreal-canvas/45 p-3">
                  <div class="text-[8px] font-black uppercase tracking-[0.35em] text-boreal-text-muted">Selected Asset</div>
                  <div class="mt-2 text-[11px] font-bold uppercase tracking-tight text-boreal-text-primary">{{ selectedAsset.label }}</div>
                  <div class="mt-1 text-[9px] font-mono uppercase tracking-[0.25em] text-boreal-text-muted">{{ selectedAsset.unitType }} · {{ selectedAsset.source }}</div>
                  <div class="mt-3 space-y-2 text-[9px] font-mono">
                    <div class="flex justify-between"><span>Readiness</span><span>{{ selectedAsset.readiness * 100 | number:'1.0-0' }}%</span></div>
                    <div class="flex justify-between"><span>Risk</span><span>{{ selectedAsset.exposedRisk * 100 | number:'1.0-0' }}%</span></div>
                    <div class="flex justify-between"><span>Sensor</span><span>{{ selectedAsset.sensorQuality * 100 | number:'1.0-0' }}%</span></div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-px border-t border-boreal-border bg-boreal-border">
        <div class="bg-boreal-canvas/70 px-4 py-2">
          <div class="text-[7px] font-black uppercase tracking-[0.35em] text-boreal-text-muted">Selected Metric</div>
          <div class="text-[10px] font-bold uppercase tracking-tight text-boreal-text-primary">{{ selectedMetric?.name || 'robustness' }}</div>
        </div>
        <div class="bg-boreal-canvas/70 px-4 py-2 text-right">
          <div class="text-[7px] font-black uppercase tracking-[0.35em] text-boreal-text-muted">Scenario Digest</div>
          <div class="text-[10px] font-mono text-boreal-text-primary">{{ prediction?.scenario_digest || 'n/a' }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FrontierViewComponent implements OnChanges {
  @Input() prediction: CounterfactualPrediction | null = null;
  @Input() selectedMetricName = 'robustness';
  @Input() selectedAsset: CounterfactualAsset | null = null;
  @Output() selectedMetricNameChange = new EventEmitter<string>();

  bandPath = '';
  medianPath = '';
  latestPoint: PathPoint | null = null;
  memberPaths: { id: string; label: string; d: string; agreement: number; variance: number; color: string; opacity: number }[] = [];
  metricSummary: ForecastMetric[] = [];
  selectedMetric: ForecastMetric | null = null;
  ensembleAgreement = 0;

  ngOnChanges(): void {
    this.rebuild();
  }

  metricClick(metricName: string): void {
    this.selectedMetricNameChange.emit(metricName);
  }

  private rebuild(): void {
    const prediction = this.prediction;
    this.metricSummary = prediction?.metric_trajectories ?? [];
    this.selectedMetric = this.metricSummary.find(metric => metric.name === this.selectedMetricName)
      ?? this.metricSummary[0]
      ?? null;

    if (!prediction || !this.selectedMetric) {
      this.bandPath = '';
      this.medianPath = '';
      this.latestPoint = null;
      this.memberPaths = [];
      this.ensembleAgreement = 0;
      return;
    }

    this.bandPath = this.buildBandPath(this.selectedMetric.p90, this.selectedMetric.p10);
    this.medianPath = this.buildLinePath(this.selectedMetric.p50, 10, 90);
    this.latestPoint = this.buildPoint(this.selectedMetric.p50[this.selectedMetric.p50.length - 1] ?? 0.5, 90, 90);
    this.memberPaths = (prediction.ensemble_members ?? []).map((member, index) => ({
      id: member.id,
      label: member.label,
      d: this.buildLinePath(member.values, 10, 90),
      agreement: member.agreement,
      variance: member.variance,
      color: `rgba(91, 143, 255, ${Math.max(0.12, 0.35 - index * 0.02)})`,
      opacity: Math.max(0.18, 0.7 - index * 0.08),
    }));
    this.ensembleAgreement = this.memberPaths.length
      ? this.memberPaths.reduce((acc, member) => acc + member.agreement, 0) / this.memberPaths.length
      : 0;
  }

  private buildLinePath(series: number[], left = 10, right = 90): string {
    const points = series.map((value, index) => this.toPoint(value, index, series.length, left, right));
    return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  }

  private buildBandPath(upper: number[], lower: number[]): string {
    const upperPoints = upper.map((value, index) => this.toPoint(value, index, upper.length, 10, 90));
    const lowerPoints = lower.map((value, index) => this.toPoint(value, index, lower.length, 10, 90)).reverse();
    const upperPath = upperPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
    const lowerPath = lowerPoints.map(point => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
    return `${upperPath} ${lowerPath} Z`;
  }

  private buildPoint(value: number, index: number, total: number): PathPoint {
    return this.toPoint(value, index, total, 10, 90);
  }

  private toPoint(value: number, index: number, total: number, left: number, right: number): PathPoint {
    const clamped = Math.max(0, Math.min(1, value));
    const x = total <= 1 ? 50 : left + (index / (total - 1)) * (right - left);
    const y = 90 - clamped * 70;
    return { x, y };
  }
}
