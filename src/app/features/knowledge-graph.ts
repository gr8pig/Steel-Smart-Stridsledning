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
            <span>Search</span>
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
            Reset
          </button>
        </div>
      </header>

      <section class="flex min-h-0 flex-1 overflow-hidden relative">
        <!-- Main 3D Viewer -->
        <div class="relative min-w-0 flex-1 overflow-hidden">
          <app-knowledge-graph-viewer></app-knowledge-graph-viewer>

          <!-- Floating HUD Filters -->
          <div class="absolute left-6 top-6 z-20 flex flex-col gap-4 pointer-events-none">
            <div class="flex flex-wrap gap-2 pointer-events-auto max-w-2xl">
              @for (category of categories; track category) {
                <button
                  type="button"
                  class="rounded-sm border px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.22em] transition-colors"
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

            <div class="flex flex-wrap gap-2 pointer-events-auto max-w-2xl">
              @for (area of areas; track area) {
                <button
                  type="button"
                  class="rounded-sm border px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.22em] transition-colors"
                  [class.border-emerald-400]="store.activeAreas().includes(area)"
                  [class.bg-emerald-400/10]="store.activeAreas().includes(area)"
                  [class.text-emerald-200]="store.activeAreas().includes(area)"
                  [class.border-white/10]="!store.activeAreas().includes(area)"
                  [class.text-slate-400]="!store.activeAreas().includes(area)"
                  (click)="toggleArea(area)"
                >
                  {{ area }}
                </button>
              }
            </div>
          </div>

          <!-- Bottom HUD Stats -->
          <div class="absolute bottom-6 left-6 z-20 flex items-center gap-4 text-[9px] font-mono uppercase tracking-[0.25em] text-slate-500 pointer-events-none">
            <div class="flex flex-col gap-1">
               <span class="text-white/40">Entities</span>
               <span class="text-sky-300 font-bold">{{ store.filteredNodes().length }} / {{ store.nodes().length }}</span>
            </div>
            <div class="h-6 w-px bg-white/10"></div>
            <div class="flex flex-col gap-1">
               <span class="text-white/40">Active_Filter</span>
               <span class="text-emerald-300 font-bold">{{ hasFilters() ? 'ON' : 'OFF' }}</span>
            </div>
          </div>
        </div>

        <!-- Details Sidebar Overlay -->
        @if (selectedNode(); as node) {
          <aside class="absolute top-0 right-0 bottom-0 w-[450px] bg-[#080b11]/95 border-l border-white/10 backdrop-blur z-40 flex flex-col shadow-2xl animate-in slide-in-from-right overflow-hidden">
            <div class="border-b border-white/10 px-8 py-8 shrink-0">
              <div class="flex justify-between items-start">
                <div class="min-w-0">
                  <div class="text-[8px] font-black uppercase tracking-[0.4em] text-sky-400/70">Structural_Metadata</div>
                  <h2 class="mt-2 text-3xl font-light uppercase tracking-tighter text-white truncate">{{ node.label }}</h2>
                </div>
                <button (click)="clearSelection()" class="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-500">
                  <mat-icon class="text-sm">close</mat-icon>
                </button>
              </div>
              <p class="mt-4 text-[12px] leading-relaxed text-slate-300 font-light">{{ node.description }}</p>
            </div>

            <div class="flex-1 overflow-y-auto custom-scrollbar px-8 py-6 space-y-8">
              <!-- Grid Status -->
              <div class="grid grid-cols-2 gap-4">
                <div class="rounded-sm border border-white/5 bg-white/2 p-4">
                  <div class="text-[7px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1">Status</div>
                  <div class="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-200">{{ node.status }}</div>
                </div>
                <div class="rounded-sm border border-white/5 bg-white/2 p-4">
                  <div class="text-[7px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1">Platform_Area</div>
                  <div class="text-[10px] font-bold uppercase tracking-[0.2em]" [style.color]="areaText(node.area)">{{ node.area }}</div>
                </div>
              </div>

              <!-- Content Cards -->
              <div class="space-y-4">
                @if (node.what) {
                  <div class="rounded-sm border border-white/5 bg-white/2 p-5">
                    <div class="text-[7px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Technical_Purpose</div>
                    <p class="text-[11px] leading-relaxed text-slate-200">{{ node.what }}</p>
                  </div>
                }
                @if (node.why) {
                  <div class="rounded-sm border border-white/5 bg-white/2 p-5">
                    <div class="text-[7px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Architectural_Rationale</div>
                    <p class="text-[11px] leading-relaxed text-slate-300 italic">{{ node.why }}</p>
                  </div>
                }
              </div>

              <!-- Technical Specification -->
              <div class="rounded-sm border border-white/10 bg-white/2 p-5 space-y-6">
                <div class="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">Computational_Interface</div>
                
                <div class="grid grid-cols-2 gap-6">
                   <div>
                      <div class="text-[7px] font-black uppercase tracking-[0.3em] text-slate-600 mb-3 text-sky-400/50">Inputs</div>
                      <div class="flex flex-wrap gap-2">
                        @for (input of node.technicalSpecs.inputs; track input) {
                          <span class="text-[9px] font-mono text-sky-200 border-b border-sky-500/20 pb-0.5">{{ input }}</span>
                        }
                      </div>
                   </div>
                   <div>
                      <div class="text-[7px] font-black uppercase tracking-[0.3em] text-slate-600 mb-3 text-emerald-400/50">Outputs</div>
                      <div class="flex flex-wrap gap-2">
                        @for (output of node.technicalSpecs.outputs; track output) {
                          <span class="text-[9px] font-mono text-emerald-200 border-b border-emerald-500/20 pb-0.5">{{ output }}</span>
                        }
                      </div>
                   </div>
                </div>

                @if (node.technicalSpecs.logic) {
                  <div class="pt-4 border-t border-white/5">
                    <div class="text-[7px] font-black uppercase tracking-[0.3em] text-slate-600 mb-2">Process_Logic</div>
                    <p class="text-[10px] text-slate-400 leading-relaxed">{{ node.technicalSpecs.logic }}</p>
                  </div>
                }

                @if (node.technicalSpecs.math) {
                  <div class="pt-4 border-t border-white/5">
                    <div class="text-[7px] font-black uppercase tracking-[0.3em] text-slate-600 mb-2">Mathematical_Grounding</div>
                    <p class="text-[10px] font-mono text-amber-500/80 whitespace-pre-wrap">{{ node.technicalSpecs.math }}</p>
                  </div>
                }
                
                @if (node.technicalSpecs.doctrine) {
                  <div class="pt-4 border-t border-white/5">
                    <div class="text-[7px] font-black uppercase tracking-[0.3em] text-slate-600 mb-2">Doctrinal_Mapping</div>
                    <p class="text-[10px] text-slate-300 italic">"{{ node.technicalSpecs.doctrine }}"</p>
                  </div>
                }
              </div>

              <!-- Source Anchors -->
              <div class="rounded-sm border border-white/5 bg-white/2 p-5">
                <div class="text-[7px] font-black uppercase tracking-[0.3em] text-slate-500 mb-3">Repository_Seams</div>
                <div class="flex flex-col gap-2">
                  <code class="text-[9px] text-sky-300 break-all p-2 bg-black/40 border border-white/5 rounded-sm">{{ node.sourcePath }}</code>
                  @if (node.route) {
                    <a [routerLink]="node.route" class="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-sky-400 hover:text-sky-300 transition-colors">
                       Navigate_To_Surface <mat-icon class="text-[12px]">open_in_new</mat-icon>
                    </a>
                  }
                </div>
              </div>

              <!-- Related Neighborhood -->
              <div class="pb-8">
                <div class="text-[7px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4">Topology_Neighborhood</div>
                <div class="flex flex-wrap gap-2">
                  @for (related of relatedNodes(); track related.id) {
                    <button (click)="selectNode(related)" class="px-3 py-1.5 rounded-sm border border-white/5 bg-white/3 text-[9px] uppercase tracking-widest text-slate-400 hover:border-sky-500/40 hover:text-sky-200 transition-all">
                      {{ related.label }}
                    </button>
                  }
                </div>
              </div>
            </div>

            <!-- Footer Action -->
            <div class="p-8 border-t border-white/10 bg-black/20 shrink-0">
               <button (click)="clearSelection()" class="w-full py-4 border border-sky-500/30 bg-sky-500/5 text-[10px] font-black uppercase tracking-[0.3em] text-sky-200 hover:bg-sky-500/10 transition-all active:scale-[0.98]">
                  Reset_View_Target
               </button>
            </div>
          </aside>
        }
      </section>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; width: 100%; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
    .animate-in { animation: slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; filter: blur(10px); }
      to { transform: translateX(0); opacity: 1; filter: blur(0); }
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
  }

  areaText(area?: PlatformArea): string {
    switch (area) {
      case 'runtime': return '#7dd3fc';
      case 'backend': return '#c4b5fd';
      case 'docs': return '#6ee7b7';
      case 'research': return '#fbbf24';
      case 'scaffold': return '#cbd5e1';
      default: return '#cbd5e1';
    }
  }

  onSearch(value: string) {
    this.store.setSearchQuery(value);
  }
}
