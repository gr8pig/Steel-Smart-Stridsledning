import { Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * PredictedTrajectory represents the outcome of an ensemble prediction.
 * Includes confidence quantiles for robustness analysis.
 */
export interface PredictedTrajectory {
  time_horizon: number[];
  p10: number[];
  p50: number[];
  p90: number[];
  trust_score: number;
  is_speculative: boolean;
}

@Component({
  selector: 'app-frontier-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col h-full w-full bg-boreal-panel/40 border border-boreal-border rounded overflow-hidden select-none">
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-1.5 border-b border-boreal-border font-sans font-black text-[9px] uppercase tracking-[0.25em] bg-boreal-panel-muted/20 border-b-0">
        <div class="flex items-center gap-2">
          <span class="text-boreal-text-primary tracking-widest">Neighborhood Frontier</span>
          @if (currentTrajectory?.is_speculative) {
            <div class="flex items-center gap-1.5 px-1.5 py-0.5 bg-boreal-blue/10 border border-boreal-blue/30 rounded-sm animate-pulse">
                <div class="w-1 h-1 rounded-full bg-boreal-blue"></div>
                <span class="text-[7px] font-black text-boreal-blue uppercase tracking-widest">Speculative</span>
            </div>
          }
        </div>
        <span class="text-[8px] font-mono text-boreal-text-muted">Trust: {{ (currentTrajectory?.trust_score ?? 1) * 100 | number:'1.0-0' }}%</span>
      </div>

      <!-- Plot Area -->
      <div class="relative flex-grow p-8">
        <!-- Axes -->
        <div class="absolute left-8 bottom-8 right-8 h-px bg-boreal-border"></div>
        <div class="absolute left-8 bottom-8 top-8 w-px bg-boreal-border"></div>

        <!-- Y Label -->
        <div class="absolute left-2 top-1/2 -rotate-90 origin-center text-[7px] font-mono font-black text-boreal-text-muted uppercase tracking-[0.3em] whitespace-nowrap">
          Safety Outcome
        </div>
        <!-- X Label -->
        <div class="absolute bottom-2 left-1/2 -translate-x-1/2 text-[7px] font-mono font-black text-boreal-text-muted uppercase tracking-[0.3em] whitespace-nowrap">
          Sustainability Cost
        </div>

        <!-- SVG Workspace -->
        <svg class="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <filter id="fogFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" />
            </filter>
            <linearGradient id="frontierGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:var(--boreal-blue);stop-opacity:0.2" />
                <stop offset="100%" style="stop-color:var(--boreal-blue);stop-opacity:0" />
            </linearGradient>
          </defs>

          <!-- Grid Lines (Subtle) -->
          <g class="text-boreal-border/20">
            <line x1="0" y1="25" x2="100" y2="25" stroke="currentColor" stroke-width="0.5" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" stroke-width="0.5" />
            <line x1="0" y1="75" x2="100" y2="75" stroke="currentColor" stroke-width="0.5" />
            <line x1="25" y1="0" x2="25" y2="100" stroke="currentColor" stroke-width="0.5" />
            <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" stroke-width="0.5" />
            <line x1="75" y1="0" x2="75" y2="100" stroke="currentColor" stroke-width="0.5" />
          </g>

          <!-- Optimal Frontier Shading -->
          <path [attr.d]="frontierAreaPath" fill="url(#frontierGradient)" class="pointer-events-none" />

          <!-- Frontier Line -->
          <path [attr.d]="frontierLinePath" fill="none" stroke="currentColor" 
                class="text-boreal-blue/60" stroke-width="1.5" stroke-dasharray="2 3" />

          <!-- Neighborhood Cloud -->
          <g [attr.filter]="currentTrajectory?.is_speculative ? 'url(#fogFilter)' : null">
            @for (p of cloudPoints; track $index) {
                <circle [attr.cx]="p.x" [attr.cy]="p.y" r="0.8" 
                        [attr.opacity]="p.opacity" 
                        class="text-boreal-blue" fill="currentColor" />
            }
          </g>

          <!-- Selected Posture (Policy Delta) -->
          @if (activePoint) {
            <g [attr.transform]="'translate(' + activePoint.x + ',' + activePoint.y + ')'" class="text-boreal-blue">
                <circle r="4" fill="currentColor" class="opacity-10 animate-ping" />
                <circle r="1.5" fill="currentColor" class="shadow-lg" />
                <circle r="3" fill="none" stroke="currentColor" stroke-width="0.5" class="opacity-50" />
                
                <!-- Label -->
                <g transform="translate(6, -6)">
                    <rect x="0" y="-8" width="30" height="10" rx="1" fill="var(--boreal-panel-elevated)" class="stroke-boreal-border" stroke-width="0.5" />
                    <text x="4" y="-1" class="fill-boreal-text-primary font-mono font-bold" style="font-size: 4px;">ACT-DEL</text>
                </g>
            </g>
          }
        </svg>
      </div>

      <!-- Footer Stats -->
      <div class="px-3 py-2 bg-boreal-canvas/60 border-t border-boreal-border grid grid-cols-2 gap-2">
        <div class="flex flex-col">
            <span class="text-[6px] font-black text-boreal-text-muted uppercase tracking-widest">Frontier Width</span>
            <span class="text-[9px] font-bold text-boreal-text-primary uppercase">{{ currentTrajectory?.is_speculative ? 'Wide / Unverified' : 'Narrow / Verified' }}</span>
        </div>
        <div class="flex flex-col items-end">
            <span class="text-[6px] font-black text-boreal-text-muted uppercase tracking-widest">Pareto Index</span>
            <span class="text-[9px] font-bold text-boreal-blue">{{ (currentTrajectory?.trust_score ?? 0.85) * 0.92 | number:'1.2-2' }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FrontierViewComponent implements OnChanges {
  @Input() currentTrajectory: PredictedTrajectory | null = null;
  @Input() policyDeltas: { safety: number; sustainability: number } = { safety: 0, sustainability: 0 };

  cloudPoints: Array<{ x: number; y: number; opacity: number }> = [];
  activePoint: { x: number; y: number } | null = null;
  frontierLinePath: string = '';
  frontierAreaPath: string = '';

  ngOnChanges(changes: SimpleChanges): void {
    this.generateVisualization();
  }

  private generateVisualization(): void {
    // Coordinate mapping: 0.0-1.0 to 5-95 in SVG space
    const xMap = (val: number) => 10 + val * 80;
    const yMap = (val: number) => 90 - val * 80; // Flip Y for SVG

    // 1. Calculate Active Point
    // Map deltas to a target position. In the lab, safety and sustainability are sliders.
    const safetyVal = Math.max(0, Math.min(1, this.policyDeltas.safety));
    const sustainabilityVal = Math.max(0, Math.min(1, this.policyDeltas.sustainability));
    
    // We add some drift based on the prediction's central tendency (p50)
    const drift = (this.currentTrajectory?.p50[this.currentTrajectory.p50.length - 1] ?? 0.5) - 0.5;
    
    this.activePoint = {
      x: xMap(sustainabilityVal),
      y: yMap(Math.max(0, Math.min(1, safetyVal + drift)))
    };

    // 2. Generate Cloud
    const points = [];
    const numPoints = 60;
    const trust = this.currentTrajectory?.trust_score ?? 1.0;
    const noise = (1.0 - trust) * 15 + 4; // More noise if low trust

    for (let i = 0; i < numPoints; i++) {
      // Gaussian-ish distribution around a theoretical Pareto curve
      const t = i / numPoints;
      // Define a generic Pareto curve: y = 1 - x^0.5
      const baseX = 0.1 + t * 0.8;
      const baseY = 1.0 - Math.pow(baseX, 0.5);
      
      // Add noise scaled by trust
      const px = baseX + (Math.random() - 0.5) * (noise / 50);
      const py = baseY + (Math.random() - 0.5) * (noise / 50);

      points.push({
        x: xMap(Math.max(0, Math.min(1, px))),
        y: yMap(Math.max(0, Math.min(1, py))),
        opacity: 0.1 + Math.random() * 0.4
      });
    }
    this.cloudPoints = points;

    // 3. Generate Frontier Line (Smooth quadratic curve)
    const cpX = xMap(0.4);
    const cpY = yMap(0.6);
    const startX = xMap(0.1);
    const startY = yMap(0.85);
    const endX = xMap(0.9);
    const endY = yMap(0.15);

    this.frontierLinePath = `M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}`;
    this.frontierAreaPath = `M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY} L 90 90 L 10 90 Z`;
  }
}
