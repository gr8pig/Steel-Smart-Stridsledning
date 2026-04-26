import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { PolicyStore } from '../../../core/state/policy.store';

@Component({
  selector: 'app-commander-frontier-panel',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <section class="design-card overflow-hidden !p-0 h-full flex flex-col shadow-lg">
      <div class="panel-header flex-wrap gap-3">
        <span>COA Pareto Space / Robustness Frontier</span>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-boreal-blue border border-white"></span>
            <span class="text-[8px] text-boreal-text-muted font-bold uppercase tracking-tighter">Selected</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full border border-boreal-amber border-dashed"></span>
            <span class="text-[8px] text-boreal-amber font-bold uppercase tracking-tighter">Legacy Baseline</span>
          </div>
        </div>
      </div>

      <div class="flex-grow relative p-6 select-none bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent_70%)]">
        <div class="absolute left-6 bottom-6 right-8 h-[2px] bg-boreal-border"></div>
        <div class="absolute left-6 bottom-6 top-4 w-[2px] bg-boreal-border"></div>

        <div class="absolute top-4 left-6 flex items-center gap-2 rounded-sm border border-boreal-border bg-boreal-panel/80 px-2 py-1 text-[8px] font-black uppercase tracking-[0.22em] text-boreal-text-muted">
          Click a point to inspect the tradeoff
        </div>

        <div class="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-mono text-boreal-text-muted uppercase tracking-[0.32em] font-black">
          Sustainability Cost <span class="text-boreal-border tracking-normal px-2">••••</span> Future Depletion
        </div>
        <div class="absolute left-1 top-1/2 -rotate-90 origin-center text-[8px] font-mono text-boreal-text-muted uppercase tracking-[0.32em] font-black">
          Protection Score <span class="text-boreal-border tracking-normal px-2">••••</span> Asset Safety
        </div>

        <div class="absolute right-6 top-6 text-right text-[8px] uppercase tracking-[0.2em] text-boreal-text-muted">
          <div class="font-black text-boreal-text-secondary">Lower cost</div>
          <div>Higher robustness</div>
        </div>

        <div class="absolute left-6 bottom-6 right-8 top-4 overflow-hidden pointer-events-none opacity-10">
          <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M10,20 Q40,30 85,85" fill="none" stroke="currentColor" stroke-width="0.5" stroke-dasharray="1,2" class="text-boreal-text-primary"></path>
            <defs>
              <pattern id="pareto-grid-commander" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.1" class="text-boreal-text-primary"/>
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#pareto-grid-commander)" />
          </svg>
        </div>

        @let legacy = policy.legacyBaseline();
        @for (coa of policy.availableCOAs(); track coa.id) {
          @let isSelected = policy.selectedCOAId() === coa.id;
          @let recommended = policy.recommendedCOA();
          @let isRecommended = recommended ? recommended.id === coa.id : false;

          <button
            type="button"
            [attr.aria-label]="'Select ' + coa.name + '. Robustness ' + (coa.projectedOutcome.robustnessScore * 100).toFixed(0) + ' percent. Cost ' + (coa.projectedOutcome.cost / 1000).toFixed(0) + 'k.'"
            (click)="policy.selectCOA(coa.id)"
            class="absolute w-5 h-5 rounded-full border-2 cursor-pointer transition-transform transition-colors duration-200 hover:scale-125 z-20 flex items-center justify-center translate-x-[-50%] translate-y-[50%] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boreal-blue/70 focus-visible:ring-offset-2 focus-visible:ring-offset-boreal-canvas group/point"
            [class.bg-boreal-blue]="isSelected"
            [class.border-boreal-text-primary]="isSelected"
            [class.shadow-[0_0_15px_rgba(59,130,246,0.6)]]="isSelected"
            [class.bg-boreal-panel-elevated]="!isSelected"
            [class.border-boreal-border]="!isSelected"
            [style.left.%]="16 + (coa.projectedOutcome.cost / 2000000) * 70"
            [style.bottom.%]="16 + (coa.projectedOutcome.robustnessScore) * 70"
          >
            @if (isRecommended) {
              <div class="absolute inset-[-6px] rounded-full border border-boreal-text-primary/20 animate-pulse pointer-events-none"></div>
              <div class="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[6px] font-black text-boreal-text-muted uppercase tracking-tighter whitespace-nowrap">REC</div>
            }

            @if (isSelected) {
              <div class="absolute inset-0 rounded-full animate-ping bg-boreal-blue opacity-20"></div>
              <mat-icon class="!text-[10px] text-white">check</mat-icon>
            } @else {
              <div class="w-1.5 h-1.5 rounded-full" [class.bg-boreal-text-primary]="isRecommended" [class.bg-boreal-text-muted]="!isRecommended"></div>
            }

            <div class="absolute -top-12 left-1/2 -translate-x-1/2 px-2 py-1 bg-boreal-panel border border-boreal-border rounded shadow-2xl opacity-0 group-hover/point:opacity-100 transition-opacity duration-150 text-[9px] pointer-events-none z-30 whitespace-nowrap">
              <div class="font-bold text-boreal-text-primary mb-0.5">{{ coa.name }}</div>
              <div class="flex gap-2">
                <span class="text-boreal-text-muted font-mono text-[7px] uppercase tracking-tighter">Robustness: <span class="text-boreal-text-primary">{{ (coa.projectedOutcome.robustnessScore * 100).toFixed(0) }}%</span></span>
                <span class="text-boreal-text-muted font-mono text-[7px] uppercase tracking-tighter">Cost: <span class="text-boreal-amber">{{ (coa.projectedOutcome.cost / 1000).toFixed(0) }}k</span></span>
              </div>
            </div>
          </button>
        }

        <div
          class="absolute w-4 h-4 rounded-full border border-boreal-amber border-dashed z-10 shadow-[0_0_15px_rgba(245,158,11,0.2)] flex items-center justify-center translate-x-[-50%] translate-y-[50%]"
          title="Legacy System Baseline (Fixed Logic)"
          [style.left.%]="16 + (legacy.cost / 2000000) * 70"
          [style.bottom.%]="16 + (legacy.robustnessScore) * 70"
        >
          <div class="absolute -top-3 left-1/2 -translate-x-1/2 text-[7px] text-boreal-amber font-black uppercase whitespace-nowrap tracking-widest">LEGACY-01</div>
          <div class="w-1 h-1 bg-boreal-amber rounded-full"></div>
        </div>
      </div>

      <div class="grid gap-3 border-t border-boreal-border bg-boreal-canvas/60 p-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="COA summary metrics">
        <div class="rounded-sm border border-boreal-border bg-boreal-panel-muted/20 p-3">
          <span class="text-[7px] text-boreal-text-muted uppercase font-bold tracking-widest">Selected Profile</span>
          <span class="mt-1 block truncate text-[11px] font-bold text-boreal-text-primary uppercase" [title]="summary().selectedProfile">{{ summary().selectedProfile }}</span>
          <p class="mt-1 text-[8px] uppercase tracking-[0.18em] text-boreal-text-muted">Cost {{ summary().selectedCost }}</p>
        </div>
        <div class="rounded-sm border border-boreal-border bg-boreal-panel-muted/20 p-3">
          <span class="text-[7px] text-boreal-text-muted uppercase font-bold tracking-widest">Robustness</span>
          <span class="mt-1 block text-[1.75rem] font-mono font-bold text-boreal-blue leading-none">{{ summary().robustness }}%</span>
          <p class="mt-1 text-[8px] uppercase tracking-[0.18em] text-boreal-text-muted">Selected COA</p>
        </div>
        <div class="rounded-sm border border-boreal-border bg-boreal-panel-muted/20 p-3">
          <span class="text-[7px] text-boreal-text-muted uppercase font-bold tracking-widest">Confidence</span>
          <span class="mt-1 block text-[1.75rem] font-mono font-bold text-boreal-text-primary leading-none">{{ summary().avgConfidence }}%</span>
          <p class="mt-1 text-[8px] uppercase tracking-[0.18em] text-boreal-text-muted">Frontier average</p>
        </div>
        <div class="rounded-sm border border-boreal-amber/30 bg-gradient-to-br from-boreal-amber/10 to-boreal-canvas/60 p-3">
          <span class="text-[7px] text-boreal-amber uppercase font-bold tracking-widest">Frontier Span</span>
          <span class="mt-1 block text-[1.75rem] font-mono font-bold text-boreal-text-primary leading-none">{{ summary().frontierSpan }}</span>
          <p class="mt-1 text-[8px] uppercase tracking-[0.18em] text-boreal-text-muted">Cost spread</p>
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommanderFrontierPanel {
  policy = inject(PolicyStore);

  summary = computed(() => {
    const selectedCOA = this.policy.selectedCOA();
    const coas = this.policy.availableCOAs();
    const costs = coas.map(c => c.projectedOutcome.cost);

    const avgConfidence = coas.length
      ? (coas.reduce((acc, c) => acc + c.projectedOutcome.confidence, 0) / coas.length * 100).toFixed(0)
      : '0';

    const robustness = selectedCOA
      ? (selectedCOA.projectedOutcome.robustnessScore * 100).toFixed(0)
      : '0';

    const selectedCost = selectedCOA
      ? `${(selectedCOA.projectedOutcome.cost / 1000).toFixed(0)}k`
      : '0k';

    const frontierSpan = costs.length
      ? `${((Math.max(...costs) - Math.min(...costs)) / 1000).toFixed(0)}k`
      : '0k';

    return {
      selectedProfile: selectedCOA?.type.replace('_', ' ') || 'NONE',
      avgConfidence,
      robustness,
      selectedCost,
      frontierSpan,
    };
  });
}
