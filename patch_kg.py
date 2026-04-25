import re

with open('src/app/features/knowledge-graph.ts', 'r') as f:
    content = f.read()

new_template = """@Component({
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
  `"""

new_content = re.sub(r'@Component\(\{.*?styles: \[`', new_template + '\n  styles: [`', content, flags=re.DOTALL)

with open('src/app/features/knowledge-graph.ts', 'w') as f:
    f.write(new_content)
