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
  // ── DESIGN LOCK: Immersive 3D Knowledge Graph ──────────────────────────────
  // GROUNDED IN: boreal-info-arch scaffolding.
  // DO NOT REVERT TO 2D SVG.
  // ──────────────────────────────────────────────────────────────────────────────
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
          
          <div class="flex items-center gap-px bg-white/5 border border-white/10 rounded-sm p-0.5">
             <button
                type="button"
                class="px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] transition-colors rounded-sm"
                [class.bg-sky-500]="viewMode() === 'GRAPH'"
                [class.text-white]="viewMode() === 'GRAPH'"
                [class.text-slate-500]="viewMode() !== 'GRAPH'"
                (click)="setViewMode('GRAPH')"
              >
                Graph
              </button>
              <button
                type="button"
                class="px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] transition-colors rounded-sm"
                [class.bg-sky-500]="viewMode() === 'TWIN'"
                [class.text-white]="viewMode() === 'TWIN'"
                [class.text-slate-500]="viewMode() !== 'TWIN'"
                (click)="setViewMode('TWIN')"
              >
                Twin
              </button>
          </div>

          <button
            type="button"
            class="rounded-sm border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-300 transition-colors hover:border-white/20 hover:bg-white/5"
            (click)="resetFilters()"
          >
            Reset
          </button>
        </div>
      </header>

      @if (viewMode() === 'GRAPH') {
        <section class="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row relative">
          <div class="relative min-w-0 flex-1 h-full w-full bg-black overflow-hidden border-r border-white/10">
            <!-- The 3D Viewer -->
            <div class="absolute inset-0 z-10">
              <app-knowledge-graph-viewer></app-knowledge-graph-viewer>
            </div>

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

            <!-- Status Footer -->
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
              @if (selectedNode(); as node) {
                <div class="h-6 w-px bg-white/10"></div>
                <div class="flex flex-col gap-1">
                   <span class="text-white/40">Selection</span>
                   <span class="text-white font-bold">{{ node.label }}</span>
                </div>
              }
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
              <div class="p-8 border-t border-white/10 bg-black/20 shrink-0 flex gap-4">
                 <button (click)="clearSelection()" class="flex-1 py-4 border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 hover:bg-white/10 transition-all">
                    Reset_View
                 </button>
                 <button (click)="setViewMode('TWIN')" class="flex-1 py-4 border border-sky-500/30 bg-sky-500/5 text-[10px] font-black uppercase tracking-[0.3em] text-sky-200 hover:bg-sky-500/10 transition-all">
                    Step_Into_Twin
                 </button>
              </div>
            </aside>
          }
        </section>
      } @else {
        <!-- TWIN VIEW PORTAL -->
        <section class="flex-1 flex min-h-0 overflow-hidden bg-[#05080d]">
           <div class="flex-1 flex flex-col min-w-0 border-r border-white/10">
              @if (selectedNode(); as node) {
                <div class="flex-1 flex flex-col p-12 overflow-y-auto custom-scrollbar">
                   <div class="max-w-5xl">
                      <div class="text-[10px] font-black uppercase tracking-[0.5em] text-sky-400/60 mb-4">Domain_Portal // {{ node.dataClass }}</div>
                      <h2 class="text-6xl font-light tracking-tighter text-white uppercase mb-8">{{ node.label }}</h2>
                      
                      <div class="grid grid-cols-3 gap-8 mb-12">
                         <div class="border-l-2 border-sky-500/30 pl-6">
                            <div class="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Area</div>
                            <div class="text-xl text-sky-200 font-medium">{{ node.area }}</div>
                         </div>
                         <div class="border-l-2 border-emerald-500/30 pl-6">
                            <div class="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Status</div>
                            <div class="text-xl text-emerald-200 font-medium">{{ node.status }}</div>
                         </div>
                         <div class="border-l-2 border-amber-500/30 pl-6">
                            <div class="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Topology_Level</div>
                            <div class="text-xl text-amber-200 font-medium">{{ node.z }} Z_VAL</div>
                         </div>
                      </div>

                      <div class="space-y-12 mb-12">
                         <section>
                            <h3 class="text-xs font-black uppercase tracking-[0.4em] text-slate-500 border-b border-white/10 pb-4 mb-6">Structural_Truth</h3>
                            <p class="text-2xl text-slate-300 leading-relaxed font-light italic">"{{ node.description }}"</p>
                         </section>

                         <div class="grid grid-cols-2 gap-12">
                            <section>
                               <h4 class="text-[9px] font-black uppercase tracking-[0.3em] text-sky-400/50 mb-4">Technical_What</h4>
                               <p class="text-[14px] text-slate-200 leading-relaxed">{{ node.what }}</p>
                            </section>
                            <section>
                               <h4 class="text-[9px] font-black uppercase tracking-[0.3em] text-sky-400/50 mb-4">Architectural_Why</h4>
                               <p class="text-[14px] text-slate-200 leading-relaxed">{{ node.why }}</p>
                            </section>
                         </div>

                         <section class="bg-white/2 border border-white/5 p-8 rounded-sm">
                            <h4 class="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-8">Computational_Seam_Specification</h4>
                            <div class="grid grid-cols-2 gap-12">
                               <div>
                                  <div class="text-[9px] font-black uppercase tracking-[0.3em] text-sky-400/50 mb-4">Inputs</div>
                                  <ul class="space-y-2">
                                    @for (inp of node.technicalSpecs.inputs; track inp) {
                                      <li class="text-xs font-mono text-sky-200 opacity-80">> {{ inp }}</li>
                                    }
                                  </ul>
                               </div>
                               <div>
                                  <div class="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400/50 mb-4">Outputs</div>
                                  <ul class="space-y-2">
                                    @for (out of node.technicalSpecs.outputs; track out) {
                                      <li class="text-xs font-mono text-emerald-200 opacity-80">> {{ out }}</li>
                                    }
                                  </ul>
                               </div>
                            </div>
                            
                            @if (node.technicalSpecs.math) {
                               <div class="mt-12 pt-8 border-t border-white/10">
                                  <div class="text-[9px] font-black uppercase tracking-[0.3em] text-amber-400/50 mb-4">Mathematical_Grounding</div>
                                  <pre class="text-[13px] font-mono text-amber-500/90 leading-relaxed">{{ node.technicalSpecs.math }}</pre>
                               </div>
                            }
                         </section>
                      </div>
                   </div>
                </div>
              } @else {
                <div class="flex-1 flex items-center justify-center">
                   <div class="text-center">
                      <mat-icon class="text-6xl text-white/10 mb-4 h-16 w-16">psychology</mat-icon>
                      <div class="text-xs font-black uppercase tracking-[0.5em] text-slate-600">Select Node to Inspect Twin</div>
                   </div>
                </div>
              }
           </div>

           <aside class="w-96 bg-black/40 flex flex-col p-8 overflow-y-auto custom-scrollbar">
              <h3 class="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-8">Topology_Neighborhood</h3>
              <div class="space-y-4">
                 @for (neighbor of relatedNodes(); track neighbor.id) {
                    <div (click)="selectNode(neighbor)" class="group cursor-pointer p-4 border border-white/5 bg-white/2 hover:bg-sky-500/10 hover:border-sky-500/30 transition-all">
                       <div class="text-[8px] font-black uppercase tracking-[0.3em] text-slate-600 group-hover:text-sky-400 transition-colors mb-1">{{ neighbor.category }}</div>
                       <div class="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{{ neighbor.label }}</div>
                    </div>
                 }
              </div>
              
              <div class="mt-auto pt-8">
                 <button (click)="setViewMode('GRAPH')" class="w-full py-4 border border-white/20 text-[10px] font-black uppercase tracking-[0.3em] text-white hover:bg-white/10 transition-all">
                    Return_To_Graph
                 </button>
              </div>
           </aside>
        </section>
      }
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
  `]
})
export class KnowledgeGraph {
  store = inject(KnowledgeGraphStore);

  readonly categories = PLATFORM_NODE_CATEGORIES;
  readonly areas = PLATFORM_AREAS;

  viewMode = signal<KnowledgeGraphViewMode>('GRAPH');

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

  setViewMode(mode: KnowledgeGraphViewMode) {
    this.viewMode.set(mode);
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
