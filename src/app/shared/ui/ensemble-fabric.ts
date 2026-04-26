import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScenarioStore } from '../../core/state/scenario.store';
import { LabStore } from '../../core/state/lab.store';

interface Path {
  id: string;
  d: string;
  color: string;
  width: number;
}

@Component({
  selector: 'app-ensemble-fabric',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg viewBox="0 0 800 400" class="w-full h-full pointer-events-none">
      <!-- Grid -->
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />

      <!-- Trace Paths -->
      @for (path of forestPaths(); track path.id) {
        <path [attr.d]="path.d" [attr.stroke]="path.color" [attr.stroke-width]="path.width" fill="none" class="trace-line transition-all duration-500" />
      }

      <!-- Playhead -->
      <line [attr.x1]="playheadX()" y1="0" [attr.x2]="playheadX()" y2="400" stroke="white" stroke-width="1" stroke-dasharray="4" class="opacity-50" />
    </svg>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .trace-line { vector-effect: non-scaling-stroke; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnsembleFabric {
  scenario = inject(ScenarioStore);
  lab = inject(LabStore);

  // Map simulation time to SVG coordinates (0-30m scenario = 0-800px)
  playheadX = computed(() => (this.scenario.simTime() % 30) * (800 / 30));

  forestPaths = computed(() => {
    const result = this.lab.runResult();
    if (!result) return [];
    
    // Simplification: In a production run, this would be computed from the ensemble trace data
    return [
      { id: 'success', d: 'M 0,200 C 200,200 200,100 400,100 S 600,50 800,50', color: '#3b82f6', width: 12 },
      { id: 'fail',    d: 'M 0,200 C 200,200 200,300 400,300 S 600,350 800,350', color: '#ef4444', width: 8 },
      { id: 'neutral', d: 'M 0,200 C 200,200 400,200 800,200', color: '#f59e0b', width: 4 }
    ] as Path[];
  });
}
