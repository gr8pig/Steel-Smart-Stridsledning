import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ForestStore, ModelKey } from '../../core/state/forest.store';
import { ForestConstellationComponent } from '../../shared/ui/forest-constellation.component';

@Component({
  selector: 'app-forest-lab',
  standalone: true,
  imports: [CommonModule, MatIconModule, ForestConstellationComponent],
  template: `
    <div class="h-full w-full flex flex-col overflow-hidden bg-boreal-canvas text-boreal-text-secondary">
      <header class="flex items-center justify-between border-b border-boreal-border px-6 py-4 shrink-0">
        <div class="flex flex-col gap-1">
          <h1 class="text-2xl font-light tracking-[0.2em] uppercase text-boreal-text-primary">Forest Constellation</h1>
          <p class="text-[10px] font-mono uppercase tracking-widest italic text-boreal-text-muted">Decision Tree Topology · Training Data Particles · Scenario Laser Traces</p>
        </div>
        <div class="flex items-center gap-3">
          @if (store.loading()) {
            <div class="flex items-center gap-2 text-boreal-blue">
              <mat-icon class="!text-sm animate-spin">sync</mat-icon>
              <span class="text-[10px] font-mono uppercase tracking-widest">Loading forest structure...</span>
            </div>
          }
          @if (store.error()) {
            <div class="px-3 py-1.5 rounded-sm border border-boreal-red/40 bg-boreal-red/10 text-boreal-red text-[10px] font-mono">
              {{ store.error() }}
            </div>
          }
        </div>
      </header>

      <div class="flex flex-1 min-h-0 overflow-hidden">
        <div class="flex-1 relative min-h-0">
          <app-forest-constellation class="absolute inset-0"></app-forest-constellation>

          <div class="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
            <div class="px-3 py-2 rounded-sm border border-boreal-border bg-boreal-canvas/80 backdrop-blur-sm pointer-events-auto">
              <div class="text-[7px] font-black uppercase tracking-[0.35em] text-boreal-text-muted mb-1">Models</div>
              <div class="flex gap-3">
                @for (key of modelKeys; track key) {
                  <button type="button"
                    class="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors"
                    [class.text-boreal-blue]="store.selectedModel() === key && key === 'robustness'"
                    [class.text-boreal-red]="store.selectedModel() === key && key === 'failure'"
                    [class.text-boreal-amber]="store.selectedModel() === key && key === 'intent'"
                    [class.text-boreal-text-muted]="store.selectedModel() !== key"
                    (click)="store.selectModel(key)">
                    <span class="w-2 h-2 rounded-full inline-block"
                      [style.backgroundColor]="modelColorMap[key]"></span>
                    {{ modelLabelMap[key] }}
                  </button>
                }
              </div>
            </div>

            <div class="px-3 py-2 rounded-sm border border-boreal-border bg-boreal-canvas/80 backdrop-blur-sm pointer-events-auto">
              <div class="text-[7px] font-black uppercase tracking-[0.35em] text-boreal-text-muted mb-1">Decision Path Laser</div>
              <div class="flex gap-2 items-center">
                <button type="button"
                  class="px-3 py-1.5 rounded-sm text-[9px] font-bold uppercase tracking-widest transition-all border"
                  [class.border-boreal-blue/40]="!store.laserActive()"
                  [class.bg-boreal-blue/10]="!store.laserActive()"
                  [class.text-boreal-blue]="!store.laserActive()"
                  [class.border-boreal-green/40]="store.laserActive()"
                  [class.bg-boreal-green/10]="store.laserActive()"
                  [class.text-boreal-green]="store.laserActive()"
                  (click)="fireLaser()">
                  <mat-icon class="!text-sm align-middle mr-1">bolt</mat-icon>
                  {{ store.laserActive() ? 'Active' : 'Fire Laser' }}
                </button>
                <span class="text-[9px] font-mono text-boreal-text-muted">
                  {{ store.activeDecisionPath()?.length ?? 0 }} nodes traced
                </span>
              </div>
            </div>
          </div>

          <div class="absolute bottom-4 right-4 pointer-events-none">
            <div class="px-3 py-2 rounded-sm border border-boreal-border bg-boreal-canvas/80 backdrop-blur-sm pointer-events-auto">
              <div class="text-[7px] font-black uppercase tracking-[0.35em] text-boreal-text-muted mb-1">Statistics</div>
              <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono">
                <span class="text-boreal-text-muted">Trees</span>
                <span class="text-boreal-text-primary">{{ totalTrees() }}</span>
                <span class="text-boreal-text-muted">Nodes</span>
                <span class="text-boreal-text-primary">{{ totalNodes().toLocaleString() }}</span>
                <span class="text-boreal-text-muted">Samples</span>
                <span class="text-boreal-text-primary">{{ store.samples()?.samples?.length?.toLocaleString() ?? '—' }}</span>
                <span class="text-boreal-text-muted">Features</span>
                <span class="text-boreal-text-primary">16</span>
              </div>
            </div>
          </div>
        </div>

        <aside class="w-72 border-l border-boreal-border flex flex-col overflow-y-auto shrink-0 bg-boreal-canvas/60">
          <div class="px-4 py-3 border-b border-boreal-border">
            <div class="text-[8px] font-black uppercase tracking-[0.35em] text-boreal-text-muted">Selected Model</div>
            <div class="mt-2 text-[11px] font-bold uppercase tracking-tight text-boreal-text-primary">
              {{ modelLabelMap[store.selectedModel()] }}
            </div>
            <div class="mt-1 text-[9px] font-mono text-boreal-text-muted">
              {{ currentModel()?.nEstimators ?? '—' }} estimators · max depth 12
            </div>
          </div>

          <div class="px-4 py-3 border-b border-boreal-border">
            <div class="text-[8px] font-black uppercase tracking-[0.35em] text-boreal-text-muted mb-2">Tree Explorer</div>
            @if (store.selectedTree(); as tree) {
              <div class="space-y-1.5">
                <div class="flex justify-between text-[9px] font-mono">
                  <span class="text-boreal-text-muted">Tree index</span>
                  <span class="text-boreal-text-primary">{{ tree.treeIndex }}</span>
                </div>
                <div class="flex justify-between text-[9px] font-mono">
                  <span class="text-boreal-text-muted">Nodes</span>
                  <span class="text-boreal-text-primary">{{ tree.nodeCount }}</span>
                </div>
                <div class="flex justify-between text-[9px] font-mono">
                  <span class="text-boreal-text-muted">Leaves</span>
                  <span class="text-boreal-text-primary">{{ tree.nLeaves }}</span>
                </div>
                <div class="flex justify-between text-[9px] font-mono">
                  <span class="text-boreal-text-muted">Max depth</span>
                  <span class="text-boreal-text-primary">{{ tree.maxDepth }}</span>
                </div>
              </div>
            } @else {
              <div class="text-[9px] font-mono text-boreal-text-muted italic">Click a tree in the constellation to inspect</div>
            }
          </div>

          @if (store.activeDecisionPath(); as path) {
            <div class="px-4 py-3 border-b border-boreal-border">
              <div class="text-[8px] font-black uppercase tracking-[0.35em] text-boreal-text-muted mb-2">Decision Path</div>
              <div class="space-y-1">
                @for (node of path; track node.nodeId; let i = $index) {
                  <div class="flex items-start gap-2 text-[9px] font-mono">
                    <span class="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[7px] font-bold"
                      [class.bg-boreal-blue/20]="!node.isLeaf"
                      [class.text-boreal-blue]="!node.isLeaf"
                      [class.bg-boreal-green/20]="node.isLeaf"
                      [class.text-boreal-green]="node.isLeaf">
                      {{ i + 1 }}
                    </span>
                    <div class="flex flex-col">
                      @if (node.isLeaf) {
                        <span class="text-boreal-green font-bold">LEAF → {{ node.value.toFixed(3) }}</span>
                      } @else {
                        <span class="text-boreal-text-primary">{{ node.feature }}</span>
                        <span class="text-boreal-text-muted">threshold: {{ node.threshold?.toFixed(4) }}</span>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <div class="px-4 py-3 border-b border-boreal-border">
            <div class="text-[8px] font-black uppercase tracking-[0.35em] text-boreal-text-muted mb-2">Scenario Legend</div>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full" style="background-color: #3b82f6;"></span>
                <span class="text-[9px] font-mono text-boreal-text-primary">Boreal Strike (high velocity)</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full" style="background-color: #f59e0b;"></span>
                <span class="text-[9px] font-mono text-boreal-text-primary">Ghost Feint (deceptive probe)</span>
              </div>
            </div>
          </div>

          <div class="px-4 py-3 flex-1">
            <div class="text-[8px] font-black uppercase tracking-[0.35em] text-boreal-text-muted mb-2">Controls</div>
            <div class="space-y-1 text-[9px] font-mono text-boreal-text-muted">
              <div>🖱 Drag — Orbit</div>
              <div>⊞ Scroll — Zoom</div>
              <div>⚡ Laser — Trace a decision path through the selected tree</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
  `],
})
export class ForestLabComponent {
  store = inject(ForestStore);

  modelKeys: ModelKey[] = ['robustness', 'failure', 'intent'];
  modelColorMap: Record<ModelKey, string> = { robustness: '#3b82f6', failure: '#ef4444', intent: '#f59e0b' };
  modelLabelMap: Record<ModelKey, string> = { robustness: 'Robustness', failure: 'Failure Prob.', intent: 'Strike Intent' };

  totalTrees = computed(() => {
    const s = this.store.structure();
    if (!s) return 0;
    return s.robustness.nEstimators + s.failure.nEstimators + s.intent.nEstimators;
  });

  totalNodes = computed(() => {
    const s = this.store.structure();
    if (!s) return 0;
    let total = 0;
    for (const key of this.modelKeys) {
      total += s[key].trees.reduce((sum, t) => sum + t.nodeCount, 0);
    }
    return total;
  });

  currentModel = computed(() => {
    const s = this.store.structure();
    const key = this.store.selectedModel();
    return s ? s[key] : null;
  });

  private randomFeatureVector(): number[] {
    return [
      Math.random() * 0.4 + 0.55,
      Math.random() * 0.6 + 0.3,
      Math.random() * 0.4,
      Math.random() * 0.4 + 0.6,
      Math.random() * 0.3 + 0.2,
      Math.random() * 0.35 + 0.6,
      Math.random() * 0.3 + 0.7,
      Math.random() * 0.5 + 0.4,
      Math.random() * 0.3 + 0.4,
      Math.random() * 0.3 + 0.5,
      1, 0,
      Math.floor(Math.random() * 9) + 3,
      (Math.random() * 150 + 350) / 500,
      Math.random() * 0.35 + 0.45,
      Math.random() * 0.3 + 0.2,
    ];
  }

  fireLaser(): void {
    const model = this.store.selectedModel();
    const structure = this.store.structure();
    if (!structure) return;

    const currentTreeIdx = this.store.selectedTreeIndex();
    const trees = structure[model].trees;
    const treeIdx = currentTreeIdx ?? Math.floor(Math.random() * trees.length);

    if (currentTreeIdx === null) {
      this.store.selectTree(treeIdx);
    }

    this.store.setLaserActive(true);
    const featureVector = this.randomFeatureVector();
    this.store.traceDecisionPath(featureVector);

    setTimeout(() => {
      this.store.setLaserActive(false);
    }, 4000);
  }
}