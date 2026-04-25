import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { KnowledgeGraphStore } from '../core/state/knowledge-graph.store';
import {
  PLATFORM_AREAS,
  PLATFORM_NODE_CATEGORIES,
} from '../core/models/platform-knowledge-graph.data';
import {
  FlowType,
  KnowledgeGraphViewMode,
  NodeCategory,
  PlatformArea,
  TechNode,
} from '../core/models/knowledge-graph.types';

type TwinTab = 'SPEC' | 'LOGIC' | 'DOCTRINE' | 'VERIF';

interface GraphLine {
  id: string;
  source: string;
  target: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type?: FlowType;
  label?: string;
  active: boolean;
  highlighted: boolean;
}

interface DragState {
  mode: 'PAN' | 'ROTATE';
  startX: number;
  startY: number;
  startRotX: number;
  startRotY: number;
  startPanX: number;
  startPanY: number;
}

@Component({
  selector: 'app-knowledge-graph',
  standalone: true,
  imports: [CommonModule, RouterLink, KnowledgeGraphViewerComponent, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-full w-full flex-col overflow-hidden bg-[#05080d] text-[#E2E8F0]">
      <header class="flex items-center justify-between gap-4 border-b border-white/10 bg-[#080c12]/95 px-6 py-4 backdrop-blur z-30 shrink-0">
        <div class="min-w-0">
          <div class="text-[9px] font-black uppercase tracking-[0.35em] text-sky-300/80">Boreal Info_Arch</div>
          <h1 class="mt-1 text-xl font-semibold tracking-tight text-white">Platform Knowledge Graph</h1>
          <p class="mt-1 max-w-3xl text-[11px] leading-relaxed text-slate-400">
            A 3D WebGL map of runtime UI, state, services, backend seams, docs, research, and scaffold assets.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <label class="hidden items-center gap-2 rounded-sm border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-slate-400 md:flex">
            <mat-icon class="text-[14px] w-[14px] h-[14px]">search</mat-icon>
            <input
              type="text"
              class="w-60 bg-transparent text-[10px] uppercase tracking-[0.16em] text-slate-200 outline-none placeholder:text-slate-500"
              [value]="store.searchQuery()"
              placeholder="label, file, route, who..."
              (input)="onSearch($any($event.target).value)"
            />
          </label>
          <button
            type="button"
            class="rounded-sm border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-300 transition-colors hover:border-white/20 hover:bg-white/5"
            (click)="resetFilters()"
          >
            Reset Camera & Filters
          </button>
        </div>
      </header>

      <section class="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row relative">
        <div class="relative min-w-0 flex-1 h-full w-full bg-black overflow-hidden border-r border-white/10">
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.10),transparent_28%),linear-gradient(180deg,rgba(5,8,13,0.86),rgba(5,8,13,1))] pointer-events-none z-0"></div>

          <div class="absolute inset-0 z-10">
            <app-knowledge-graph-viewer 
               [nodes]="visibleNodes()"
               [edges]="visibleEdges()"
               [selectedNodeId]="store.selectedNodeId()"
               (nodeSelected)="store.selectNode($event)">
            </app-knowledge-graph-viewer>
          </div>

          <div class="absolute left-4 top-4 z-20 flex max-w-[70%] flex-wrap gap-2 pointer-events-none">
            @for (category of categories; track category) {
              <button
                type="button"
                class="rounded-sm border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.22em] transition-colors pointer-events-auto"
                [class.border-sky-400]="store.activeCategories().includes(category)"
                [class.bg-sky-400/10]="store.activeCategories().includes(category)"
                [class.text-sky-200]="store.activeCategories().includes(category)"
                [class.border-white/10]="!store.activeCategories().includes(category)"
                [class.text-slate-400]="!store.activeCategories().includes(category)"
                (click)="toggleCategory(category)"
              >
                {{ category }}
              </button>
            }
          </div>

          <div class="absolute right-4 top-4 z-20 flex max-w-[30%] flex-wrap justify-end gap-2 pointer-events-none">
            @for (area of areas; track area) {
              <button
                type="button"
                class="rounded-sm border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.22em] transition-colors pointer-events-auto"
                [class.border-sky-400]="store.activeAreas().includes(area)"
                [class.bg-sky-400/10]="store.activeAreas().includes(area)"
                [class.text-sky-200]="store.activeAreas().includes(area)"
                [class.border-white/10]="!store.activeAreas().includes(area)"
                [class.text-slate-400]="!store.activeAreas().includes(area)"
                (click)="toggleArea(area)"
              >
                {{ area }}
              </button>
            }
          </div>

          <div class="absolute bottom-4 left-4 z-20 flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.22em] text-slate-400 pointer-events-none">
            <span>Nodes {{ visibleNodes().length }} / {{ store.nodes().length }}</span>
            <span>Edges {{ visibleEdges().length }}</span>
            @if (selectedNode(); as node) {
               <span>Selected {{ node.label }}</span>
            }
          </div>
        </div>

        <!-- Detail Drawer Overlay -->
        @if (selectedNode(); as node) {
        <aside class="absolute top-0 right-0 bottom-0 z-40 flex w-full flex-col border-l border-white/10 bg-[#080b11]/95 backdrop-blur-md md:w-[450px] shadow-2xl">
            <div class="flex h-full min-h-0 flex-col overflow-hidden">
              <div class="border-b border-white/10 px-6 py-6 flex justify-between items-start">
                <div>
                    <div class="text-[9px] font-black uppercase tracking-[0.32em] text-sky-300/80">Node Details</div>
                    <h2 class="mt-2 text-2xl font-semibold tracking-tight text-white">{{ node.label }}</h2>
                </div>
                <button (click)="clearSelection()" class="text-slate-400 hover:text-white">
                    <mat-icon>close</mat-icon>
                </button>
              </div>
              <div class="px-6 py-2">
                 <p class="text-[12px] leading-relaxed text-slate-300">{{ node.description }}</p>
              </div>

              <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <div class="grid gap-3 sm:grid-cols-2">
                  <div class="rounded-sm border border-white/10 bg-white/5 p-3">
                    <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Status</div>
                    <div class="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">{{ node.status }}</div>
                  </div>
                  <div class="rounded-sm border border-white/10 bg-white/5 p-3">
                    <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Area</div>
                    <div class="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-300">{{ node.area }}</div>
                  </div>
                </div>

                <div class="mt-4 space-y-4">
                  <div class="rounded-sm border border-white/10 bg-white/5 p-4">
                    <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">What</div>
                    <p class="mt-2 text-[12px] leading-relaxed text-slate-200">{{ node.what }}</p>
                  </div>
                  <div class="rounded-sm border border-white/10 bg-white/5 p-4">
                    <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Why</div>
                    <p class="mt-2 text-[12px] leading-relaxed text-slate-200">{{ node.why }}</p>
                  </div>
                  <div class="rounded-sm border border-white/10 bg-white/5 p-4">
                    <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Who</div>
                    <p class="mt-2 text-[12px] leading-relaxed text-slate-200">{{ node.who }}</p>
                  </div>
                </div>

                <div class="mt-4 rounded-sm border border-white/10 bg-white/5 p-4">
                  <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Where</div>
                  <p class="mt-2 text-[11px] leading-relaxed text-slate-300">{{ node.where }}</p>
                  @if (node.route) {
                    <a
                      [routerLink]="node.route"
                      class="mt-3 inline-flex rounded-sm border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.24em] text-sky-200 transition-colors hover:bg-sky-400/15"
                    >
                      Open Route
                    </a>
                  }
                </div>

                <div class="mt-4 rounded-sm border border-white/10 bg-white/5 p-4">
                  <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Source</div>
                  <code class="mt-2 block break-all text-[10px] text-sky-200">{{ node.sourcePath ?? 'No explicit source path' }}</code>
                </div>

                <div class="mt-4 rounded-sm border border-white/10 bg-white/5 p-4">
                  <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Technical Spec</div>
                  <div class="mt-3 grid gap-3">
                    <div>
                      <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Inputs</div>
                      <div class="mt-2 flex flex-wrap gap-2">
                        @for (input of node.technicalSpecs.inputs; track input) {
                          <span class="rounded-sm border border-sky-400/20 bg-sky-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-sky-200">{{ input }}</span>
                        }
                      </div>
                    </div>
                    <div>
                      <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Outputs</div>
                      <div class="mt-2 flex flex-wrap gap-2">
                        @for (output of node.technicalSpecs.outputs; track output) {
                          <span class="rounded-sm border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-200">{{ output }}</span>
                        }
                      </div>
                    </div>
                    @if (node.technicalSpecs.logic) {
                      <div>
                        <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Logic</div>
                        <p class="mt-2 text-[11px] leading-relaxed text-slate-300">{{ node.technicalSpecs.logic }}</p>
                      </div>
                    }
                    @if (node.technicalSpecs.math) {
                      <div>
                        <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Math</div>
                        <p class="mt-2 whitespace-pre-line font-mono text-[10px] leading-relaxed text-slate-300">{{ node.technicalSpecs.math }}</p>
                      </div>
                    }
                    @if (node.technicalSpecs.doctrine) {
                      <div>
                        <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Doctrine</div>
                        <p class="mt-2 text-[11px] leading-relaxed text-slate-300">{{ node.technicalSpecs.doctrine }}</p>
                      </div>
                    }
                    @if (node.technicalSpecs.verif) {
                      <div>
                        <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Verification</div>
                        <p class="mt-2 text-[11px] leading-relaxed text-slate-300">{{ node.technicalSpecs.verif }}</p>
                      </div>
                    }
                    @if (node.technicalSpecs.uncertaintySource) {
                      <div>
                        <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Uncertainty Source</div>
                        <p class="mt-2 text-[11px] leading-relaxed text-slate-300">{{ node.technicalSpecs.uncertaintySource }}</p>
                      </div>
                    }
                    @if (node.technicalSpecs.fatiguePenalty) {
                      <div>
                        <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Fatigue Penalty</div>
                        <p class="mt-2 text-[11px] leading-relaxed text-slate-300">{{ node.technicalSpecs.fatiguePenalty }}</p>
                      </div>
                    }
                    @if (node.technicalSpecs.policyDriftOffset) {
                      <div>
                        <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Policy Drift Offset</div>
                        <p class="mt-2 text-[11px] leading-relaxed text-slate-300">{{ node.technicalSpecs.policyDriftOffset }}</p>
                      </div>
                    }
                  </div>
                </div>

                <div class="mt-4 rounded-sm border border-white/10 bg-white/5 p-4 mb-8">
                  <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Related Nodes</div>
                  <div class="mt-3 flex flex-wrap gap-2">
                    @for (related of relatedNodes(); track related.id) {
                      <button
                        type="button"
                        class="rounded-sm border border-white/10 bg-black/20 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-200 transition-colors hover:border-sky-400/30 hover:bg-sky-400/10"
                        (click)="selectNode(related)"
                      >
                        {{ related.label }}
                      </button>
                    }
                  </div>
                </div>
              </div>
            </div>
        </aside>
        }
      </section>
    </div>
  `,
})
export class KnowledgeGraph {
  readonly store = inject(KnowledgeGraphStore);
  readonly categories = PLATFORM_NODE_CATEGORIES;
  readonly areas = PLATFORM_AREAS;

  readonly viewMode = signal<KnowledgeGraphViewMode>('GRAPH');
  readonly isDark = signal(true);
  readonly activeTab = signal<TwinTab>('SPEC');
  readonly hoveredNodeId = signal<string | null>(null);
  readonly panX = signal(0);
  readonly panY = signal(0);
  readonly zoom = signal(1);
  readonly rotX = signal(-18);
  readonly rotY = signal(18);

  readonly nodes = computed(() => this.store.nodes());
  readonly visibleNodes = computed(() => this.store.filteredNodes());

  readonly selectedNode = computed(() => {
    const selectedId = this.store.selectedNodeId();
    return this.nodes().find(node => node.id === selectedId) ?? null;
  });

  readonly twinNode = computed(() => {
    return this.selectedNode() ?? this.nodes().find(node => node.id === 'PLAT_001') ?? null;
  });

  readonly focusNode = computed(() => {
    return this.viewMode() === 'TWIN' ? this.twinNode() : this.selectedNode();
  });

  readonly filteredNodeIds = computed(() => new Set(this.visibleNodes().map(node => node.id)));

  readonly relatedNodeIds = computed(() => {
    const focus = this.focusNode();
    const ids = new Set<string>();
    if (!focus) {
      return ids;
    }

    ids.add(focus.id);
    focus.connectedTo.forEach(id => ids.add(id));

    for (const node of this.nodes()) {
      if (node.connectedTo.includes(focus.id)) {
        ids.add(node.id);
      }
    }

    return ids;
  });

  readonly relatedNodes = computed(() => {
    const focus = this.focusNode();
    if (!focus) {
      return [];
    }

    const ids = this.relatedNodeIds();
    return this.nodes()
      .filter(node => ids.has(node.id) && node.id !== focus.id)
      .sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label));
  });

  readonly graphLines = computed(() => {
    const nodes = this.nodes();
    const index = new Map(nodes.map(node => [node.id, node]));
    const focus = this.focusNode();
    const filteredIds = this.filteredNodeIds();
    const relatedIds = this.relatedNodeIds();
    const seen = new Set<string>();
    const lines: GraphLine[] = [];

    for (const source of nodes) {
      for (const targetId of source.connectedTo) {
        const target = index.get(targetId);
        if (!target) {
          continue;
        }

        const key = [source.id, targetId].sort().join('::');
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);

        const flow = source.flows?.find(entry => entry.target === targetId);
        const isFocusedPair = focus ? relatedIds.has(source.id) && relatedIds.has(targetId) : false;
        const isFilteredPair = filteredIds.has(source.id) && filteredIds.has(targetId);

        lines.push({
          id: key,
          source: source.id,
          target: targetId,
          x1: source.x,
          y1: source.y,
          x2: target.x,
          y2: target.y,
          type: flow?.type,
          label: flow?.label,
          active: focus ? isFocusedPair || filteredIds.has(source.id) || filteredIds.has(targetId) : isFilteredPair || filteredIds.size === nodes.length,
          highlighted: focus ? source.id === focus.id || targetId === focus.id : isFilteredPair,
        });
      }
    }

    return lines;
  });

  readonly hasFilters = computed(() => {
    return this.store.searchQuery().trim().length > 0 || this.store.activeCategories().length > 0 || this.store.activeAreas().length > 0;
  });

  private dragState: DragState | null = null;

  setViewMode(mode: KnowledgeGraphViewMode) {
    this.viewMode.set(mode);
    if (mode === 'TWIN') {
      this.activeTab.set('SPEC');
    }
  }

  toggleTheme() {
    this.isDark.update(value => !value);
  }

  onSearch(value: string) {
    this.store.setSearchQuery(value);
  }

  toggleCategory(category: NodeCategory) {
    this.store.toggleCategory(category);
  }

  toggleArea(area: PlatformArea) {
    this.store.toggleArea(area);
  }

  selectNode(node: TechNode) {
    this.store.selectNode(node.id);
    this.activeTab.set('SPEC');
    this.hoveredNodeId.set(null);
  }

  clearSelection() {
    this.store.selectNode(null);
  }

  resetFilters() {
    this.store.resetFilters();
    this.store.selectNode('PLAT_001');
    this.viewMode.set('GRAPH');
    this.activeTab.set('SPEC');
    this.resetView();
    this.hoveredNodeId.set(null);
  }

  resetView() {
    this.panX.set(0);
    this.panY.set(0);
    this.zoom.set(1);
    this.rotX.set(-18);
    this.rotY.set(18);
  }

  zoomIn() {
    this.zoom.set(Math.min(1.8, this.zoom() + 0.08));
  }

  zoomOut() {
    this.zoom.set(Math.max(0.45, this.zoom() - 0.08));
  }

  onMouseDown(event: MouseEvent) {
    if (event.button !== 0) {
      return;
    }

    this.dragState = {
      mode: event.shiftKey ? 'ROTATE' : 'PAN',
      startX: event.clientX,
      startY: event.clientY,
      startRotX: this.rotX(),
      startRotY: this.rotY(),
      startPanX: this.panX(),
      startPanY: this.panY(),
    };
  }

  onMouseMove(event: MouseEvent) {
    if (!this.dragState) {
      return;
    }

    const dx = event.clientX - this.dragState.startX;
    const dy = event.clientY - this.dragState.startY;

    if (this.dragState.mode === 'ROTATE') {
      this.rotY.set(this.dragState.startRotY + dx * 0.35);
      this.rotX.set(this.clamp(this.dragState.startRotX - dy * 0.35, -60, 60));
      return;
    }

    this.panX.set(this.dragState.startPanX + dx);
    this.panY.set(this.dragState.startPanY + dy);
  }

  onMouseUp() {
    this.dragState = null;
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    const nextZoom = this.clamp(this.zoom() - event.deltaY * 0.001, 0.45, 1.8);
    this.zoom.set(nextZoom);
  }

  graphPerspective(): string {
    return `perspective(1500px) rotateX(${this.rotX()}deg) rotateY(${this.rotY()}deg)`;
  }

  lineStroke(line: GraphLine): string {
    if (line.highlighted) {
      return this.isDark() ? '#fbbf24' : '#2563eb';
    }

    if (line.type === 'DOCTRINAL') {
      return this.isDark() ? '#a855f7' : '#8b5cf6';
    }
    if (line.type === 'CONTROL') {
      return this.isDark() ? '#f59e0b' : '#d97706';
    }
    if (line.type === 'MATERIAL') {
      return this.isDark() ? '#10b981' : '#059669';
    }
    if (line.type === 'DATA') {
      return this.isDark() ? '#38bdf8' : '#0284c7';
    }
    return this.isDark() ? '#334155' : '#cbd5e1';
  }

  lineOpacity(line: GraphLine): number {
    if (line.highlighted) {
      return 1;
    }
    return line.active ? 0.42 : 0.12;
  }

  nodeStroke(node: TechNode, isSelected: boolean, isHovered: boolean): string {
    if (isSelected || isHovered) {
      return this.isDark() ? '#fbbf24' : '#2563eb';
    }

    switch (node.category) {
      case 'CORE':
        return this.isDark() ? '#64748b' : '#cbd5e1';
      case 'DECISION':
        return this.isDark() ? '#94a3b8' : '#2563eb';
      case 'LOGISTICS':
        return this.isDark() ? '#10b981' : '#059669';
      case 'INTELLIGENCE':
        return this.isDark() ? '#a855f7' : '#7c3aed';
      case 'GOVERNANCE':
        return this.isDark() ? '#64748b' : '#475569';
      default:
        return this.isDark() ? '#64748b' : '#94a3b8';
    }
  }

  isNodeDimmed(nodeId: string): boolean {
    const selected = this.selectedNode();
    const filteredIds = this.filteredNodeIds();
    const hasSearchOrFilter = this.hasFilters();

    if (selected && !this.relatedNodeIds().has(nodeId) && this.viewMode() === 'GRAPH') {
      return true;
    }

    if (hasSearchOrFilter && !filteredIds.has(nodeId)) {
      return true;
    }

    return false;
  }

  isRelatedToFocus(nodeId: string): boolean {
    return this.relatedNodeIds().has(nodeId);
  }

  areaText(area?: PlatformArea): string {
    switch (area) {
      case 'runtime':
        return this.isDark() ? '#38bdf8' : '#0369a1';
      case 'backend':
        return this.isDark() ? '#a855f7' : '#7c3aed';
      case 'frontend':
        return this.isDark() ? '#f472b6' : '#db2777';
      case 'docs':
        return this.isDark() ? '#fbbf24' : '#d97706';
      case 'research':
        return this.isDark() ? '#10b981' : '#059669';
      case 'scaffold':
        return this.isDark() ? '#60a5fa' : '#2563eb';
      default:
        return this.isDark() ? '#94a3b8' : '#64748b';
    }
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
