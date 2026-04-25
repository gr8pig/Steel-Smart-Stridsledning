import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { KnowledgeGraphStore } from '../core/state/knowledge-graph.store';
import { KnowledgeGraphViewerComponent } from '../shared/ui/knowledge-graph-viewer/knowledge-graph-viewer.component';
import { MatIconModule } from '@angular/material/icon';
import {
  PLATFORM_AREAS,
  PLATFORM_NODE_CATEGORIES,
} from '../core/models/platform-knowledge-graph.data';
import {
  KnowledgeGraphViewMode,
  NodeCategory,
  PlatformArea,
  TechNode,
} from '../core/models/knowledge-graph.types';

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
        <div class="relative min-w-0 flex-1 h-full w-full bg-black">
          <app-knowledge-graph-viewer 
             [nodes]="visibleNodes()"
             [edges]="visibleEdges()"
             [selectedNodeId]="store.selectedNodeId()"
             (nodeSelected)="store.selectNode($event)">
          </app-knowledge-graph-viewer>
          
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
        </div>

        <!-- Detail Drawer Overlay -->
        @if (selectedNode(); as node) {
        <aside class="absolute top-0 right-0 bottom-0 z-40 flex w-full flex-col border-l border-white/10 bg-[#080b11]/95 backdrop-blur-md md:w-[450px] shadow-2xl transform transition-transform duration-300 ease-out translate-x-0">
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
  styles: [`
    :host {
      display: block;
      height: 100%;
      width: 100%;
    }
  `],
})
export class KnowledgeGraph {
  store = inject(KnowledgeGraphStore);

  readonly categories = PLATFORM_NODE_CATEGORIES;
  readonly areas = PLATFORM_AREAS;

  selectedNode = computed(() => {
    const id = this.store.selectedNodeId();
    if (!id) return null;
    return this.store.nodes().find(node => node.id === id) ?? null;
  });

  visibleNodeIds = computed(() => {
    const query = this.store.searchQuery().trim().toLowerCase();
    const categories = this.store.activeCategories();
    const areas = this.store.activeAreas();
    const nodes = this.store.nodes();

    return new Set(
      nodes
        .filter((node) => {
          const haystack = [
            node.id,
            node.label,
            node.description,
            node.what,
            node.why,
            node.where,
            node.who,
            node.route ?? '',
            node.sourcePath ?? '',
            node.technicalSpecs.inputs.join(' '),
            node.technicalSpecs.outputs.join(' '),
            node.technicalSpecs.logic ?? '',
            node.technicalSpecs.math ?? '',
            node.technicalSpecs.doctrine ?? '',
            node.technicalSpecs.verif ?? '',
          ].join(' ').toLowerCase();

          const matchesQuery = !query || haystack.includes(query);
          const matchesCategory = categories.length === 0 || categories.includes(node.category);
          const matchesArea = areas.length === 0 || (node.area ? areas.includes(node.area) : true);

          return matchesQuery && matchesCategory && matchesArea;
        })
        .map(node => node.id),
    );
  });

  visibleNodes = computed(() => {
    const ids = this.visibleNodeIds();
    return this.store.nodes().filter(node => ids.has(node.id));
  });

  relatedNodeIds = computed(() => {
    const selected = this.selectedNode();
    if (!selected) return new Set<string>();

    const related = new Set<string>([selected.id]);
    for (const id of selected.connectedTo) {
      related.add(id);
    }
    for (const node of this.store.nodes()) {
      if (node.connectedTo.includes(selected.id)) {
        related.add(node.id);
      }
    }

    return related;
  });

  relatedNodes = computed(() => {
    const ids = this.relatedNodeIds();
    return this.store.nodes().filter(node => ids.has(node.id));
  });

  visibleEdges = computed<any[]>(() => {
    const nodes = this.store.nodes();
    const nodesById = new Map(nodes.map(node => [node.id, node] as const));
    const visibleIds = this.visibleNodeIds();
    const selected = this.selectedNode();
    const hasFilters = this.hasFilters();
    const edges: any[] = [];

    for (const source of nodes) {
      for (const targetId of source.connectedTo) {
        const target = nodesById.get(targetId);
        if (!target) continue;

        const sourceVisible = visibleIds.has(source.id);
        const targetVisible = visibleIds.has(target.id);
        const relationShown = !!selected && (source.id === selected.id || target.id === selected.id);
        const visible = relationShown || !hasFilters || (sourceVisible && targetVisible);

        if (!visible) continue;

        edges.push({
          id: `${source.id}__${target.id}`,
          source: source.id,
          target: target.id,
          type: 'LOGICAL' // default for structural edges
        });
      }
      
      if(source.flows) {
          for(const flow of source.flows) {
            const target = nodesById.get(flow.target);
            if (!target) continue;
    
            const sourceVisible = visibleIds.has(source.id);
            const targetVisible = visibleIds.has(target.id);
            const relationShown = !!selected && (source.id === selected.id || target.id === selected.id);
            const visible = relationShown || !hasFilters || (sourceVisible && targetVisible);
    
            if (!visible) continue;
    
            edges.push({
              id: flow.id,
              source: flow.source,
              target: flow.target,
              type: flow.type
            });
          }
      }
    }

    return edges;
  });

  hasFilters = computed(() =>
    this.store.searchQuery().trim().length > 0 ||
    this.store.activeCategories().length > 0 ||
    this.store.activeAreas().length > 0,
  );

  selectNode(node: TechNode) {
    this.store.selectNode(node.id);
  }

  clearSelection() {
    this.store.selectNode(null);
  }

  toggleCategory(category: NodeCategory) {
    this.store.toggleCategory(category);
  }

  toggleArea(area: PlatformArea) {
    this.store.toggleArea(area);
  }

  resetFilters() {
    this.store.resetFilters();
    this.store.selectNode(null);
  }

  onSearch(value: string) {
    this.store.setSearchQuery(value);
  }
}