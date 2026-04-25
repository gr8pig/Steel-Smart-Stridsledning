import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KnowledgeGraphStore } from '../core/state/knowledge-graph.store';
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

type ViewEdge = {
  key: string;
  source: TechNode;
  target: TechNode;
  highlighted: boolean;
  active: boolean;
  visible: boolean;
};

@Component({
  selector: 'app-knowledge-graph',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-full w-full flex-col overflow-hidden bg-[#05080d] text-[#E2E8F0]">
      <header class="flex items-center justify-between gap-4 border-b border-white/10 bg-[#080c12]/95 px-6 py-4 backdrop-blur">
        <div class="min-w-0">
          <div class="text-[9px] font-black uppercase tracking-[0.35em] text-sky-300/80">Boreal Info_Arch</div>
          <h1 class="mt-1 text-xl font-semibold tracking-tight text-white">Platform Knowledge Graph</h1>
          <p class="mt-1 max-w-3xl text-[11px] leading-relaxed text-slate-400">
            A truth-first map of runtime UI, state, services, backend seams, docs, research, and scaffold assets.
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
            class="rounded-sm border px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] transition-colors"
            [class.border-sky-400]="viewMode() === 'GRAPH'"
            [class.bg-sky-400/10]="viewMode() === 'GRAPH'"
            [class.text-sky-200]="viewMode() === 'GRAPH'"
            [class.border-white/10]="viewMode() !== 'GRAPH'"
            [class.text-slate-400]="viewMode() !== 'GRAPH'"
            (click)="setViewMode('GRAPH')"
          >
            Graph
          </button>
          <button
            type="button"
            class="rounded-sm border px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] transition-colors"
            [class.border-sky-400]="viewMode() === 'TWIN'"
            [class.bg-sky-400/10]="viewMode() === 'TWIN'"
            [class.text-sky-200]="viewMode() === 'TWIN'"
            [class.border-white/10]="viewMode() !== 'TWIN'"
            [class.text-slate-400]="viewMode() !== 'TWIN'"
            (click)="setViewMode('TWIN')"
          >
            Twin
          </button>
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
        <section class="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
          <div class="relative min-w-0 flex-1 overflow-hidden border-r border-white/10">
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.10),transparent_28%),linear-gradient(180deg,rgba(5,8,13,0.86),rgba(5,8,13,1))]"></div>

            <div class="absolute left-4 top-4 z-20 flex max-w-[70%] flex-wrap gap-2">
              @for (category of categories; track category) {
                <button
                  type="button"
                  class="rounded-sm border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.22em] transition-colors"
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

            <div class="absolute right-4 top-4 z-20 flex max-w-[30%] flex-wrap justify-end gap-2">
              @for (area of areas; track area) {
                <button
                  type="button"
                  class="rounded-sm border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.22em] transition-colors"
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

            <div class="absolute bottom-4 left-4 z-20 flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.22em] text-slate-400">
              <span>Nodes {{ visibleNodes().length }} / {{ store.nodes().length }}</span>
              <span>Edges {{ visibleEdges().length }}</span>
              <span>Selected {{ selectedNode()?.label ?? 'None' }}</span>
            </div>

            <div class="absolute bottom-4 right-4 z-20 flex items-center gap-2">
              <button
                type="button"
                class="rounded-sm border border-white/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-slate-300 transition-colors hover:bg-white/5"
                (click)="zoomOut()"
              >
                Zoom-
              </button>
              <button
                type="button"
                class="rounded-sm border border-white/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-slate-300 transition-colors hover:bg-white/5"
                (click)="resetZoom()"
              >
                Reset
              </button>
              <button
                type="button"
                class="rounded-sm border border-white/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-slate-300 transition-colors hover:bg-white/5"
                (click)="zoomIn()"
              >
                Zoom+
              </button>
            </div>

            <div class="absolute inset-0 p-6">
              <div class="h-full w-full overflow-hidden rounded-sm border border-white/8 bg-[#05080d]/80 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
                <div
                  class="h-full w-full transition-transform duration-300 ease-out"
                  [style.transform]="'scale(' + zoom() + ')'"
                  style="transform-origin: center center;"
                >
                  <svg class="h-full w-full select-none" viewBox="0 0 1360 1320" preserveAspectRatio="xMidYMid meet">
                    <g>
                      @for (edge of visibleEdges(); track edge.key) {
                        <line
                          [attr.x1]="edge.source.x"
                          [attr.y1]="edge.source.y"
                          [attr.x2]="edge.target.x"
                          [attr.y2]="edge.target.y"
                          [attr.stroke]="edgeStroke(edge)"
                          [attr.stroke-opacity]="edgeOpacity(edge)"
                          [attr.stroke-width]="edge.highlighted ? 2.4 : 1.1"
                          [attr.stroke-dasharray]="edge.highlighted ? 'none' : '4 6'"
                        />
                      }

                      @for (node of visibleNodes(); track node.id) {
                        <g
                          class="cursor-pointer"
                          tabindex="0"
                          (click)="selectNode(node); $event.stopPropagation()"
                          (keydown.enter)="selectNode(node)"
                          [attr.transform]="'translate(' + node.x + ',' + node.y + ')'"
                        >
                          <circle
                            [attr.r]="isRelatedToSelected(node.id) ? 40 : 32"
                            fill="transparent"
                            [attr.stroke]="isRelatedToSelected(node.id) ? '#fbbf24' : 'rgba(255,255,255,0.06)'"
                            [attr.stroke-opacity]="isRelatedToSelected(node.id) ? 0.35 : 0.18"
                          />

                          @switch (node.category) {
                            @case ('CORE') {
                              <rect
                                x="-8" y="-8" width="16" height="16"
                                [attr.fill]="nodeFill(node.area)"
                                [attr.stroke]="nodeStroke(node)"
                                [attr.stroke-width]="nodeStrokeWidth(node)"
                              />
                            }
                            @case ('DECISION') {
                              <rect
                                x="-8" y="-8" width="16" height="16"
                                transform="rotate(45)"
                                [attr.fill]="nodeFill(node.area)"
                                [attr.stroke]="nodeStroke(node)"
                                [attr.stroke-width]="nodeStrokeWidth(node)"
                              />
                            }
                            @case ('LOGISTICS') {
                              <path
                                d="M0,-10 L10,8 L-10,8 Z"
                                [attr.fill]="nodeFill(node.area)"
                                [attr.stroke]="nodeStroke(node)"
                                [attr.stroke-width]="nodeStrokeWidth(node)"
                              />
                            }
                            @case ('INTELLIGENCE') {
                              <polygon
                                points="0,-10 9,-5 9,5 0,10 -9,5 -9,-5"
                                [attr.fill]="nodeFill(node.area)"
                                [attr.stroke]="nodeStroke(node)"
                                [attr.stroke-width]="nodeStrokeWidth(node)"
                              />
                            }
                            @case ('GOVERNANCE') {
                              <circle
                                r="10"
                                [attr.fill]="nodeFill(node.area)"
                                [attr.stroke]="nodeStroke(node)"
                                [attr.stroke-width]="nodeStrokeWidth(node)"
                              />
                            }
                            @default {
                              <rect
                                x="-10" y="-6" width="20" height="12" rx="4"
                                [attr.fill]="nodeFill(node.area)"
                                [attr.stroke]="nodeStroke(node)"
                                [attr.stroke-width]="nodeStrokeWidth(node)"
                              />
                            }
                          }

                          <text
                            [attr.x]="16"
                            [attr.y]="4"
                            class="pointer-events-none text-[10px] font-black uppercase tracking-[0.22em]"
                            [attr.fill]="isSelected(node.id) ? '#ffffff' : '#d7dce6'"
                            [attr.opacity]="isRelatedToSelected(node.id) ? 1 : 0.55"
                          >
                            {{ node.label }}
                          </text>

                          <text
                            [attr.x]="16"
                            [attr.y]="16"
                            class="pointer-events-none text-[7px] font-mono uppercase tracking-[0.28em]"
                            fill="#94a3b8"
                            [attr.opacity]="isRelatedToSelected(node.id) ? 0.8 : 0.45"
                          >
                            {{ node.area }} / {{ node.status }}
                          </text>
                        </g>
                      }
                    </g>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <aside class="flex w-full flex-col border-t border-white/10 bg-[#080b11]/95 md:w-[430px] md:border-l md:border-t-0">
            @if (selectedNode(); as node) {
              <div class="flex h-full min-h-0 flex-col overflow-hidden">
                <div class="border-b border-white/10 px-6 py-6">
                  <div class="text-[9px] font-black uppercase tracking-[0.32em] text-sky-300/80">Node Details</div>
                  <h2 class="mt-2 text-2xl font-semibold tracking-tight text-white">{{ node.label }}</h2>
                  <p class="mt-3 text-[12px] leading-relaxed text-slate-300">{{ node.description }}</p>
                </div>

                <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                  <div class="grid gap-3 sm:grid-cols-2">
                    <div class="rounded-sm border border-white/10 bg-white/3 p-3">
                      <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Status</div>
                      <div class="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">{{ node.status }}</div>
                    </div>
                    <div class="rounded-sm border border-white/10 bg-white/3 p-3">
                      <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Area</div>
                      <div class="mt-1 text-[11px] font-bold uppercase tracking-[0.18em]" [style.color]="areaText(node.area)">{{ node.area }}</div>
                    </div>
                  </div>

                  <div class="mt-4 space-y-4">
                    <div class="rounded-sm border border-white/10 bg-white/3 p-4">
                      <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">What</div>
                      <p class="mt-2 text-[12px] leading-relaxed text-slate-200">{{ node.what }}</p>
                    </div>
                    <div class="rounded-sm border border-white/10 bg-white/3 p-4">
                      <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Why</div>
                      <p class="mt-2 text-[12px] leading-relaxed text-slate-200">{{ node.why }}</p>
                    </div>
                    <div class="rounded-sm border border-white/10 bg-white/3 p-4">
                      <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Who</div>
                      <p class="mt-2 text-[12px] leading-relaxed text-slate-200">{{ node.who }}</p>
                    </div>
                  </div>

                  <div class="mt-4 rounded-sm border border-white/10 bg-white/3 p-4">
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

                  <div class="mt-4 rounded-sm border border-white/10 bg-white/3 p-4">
                    <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Source</div>
                    <code class="mt-2 block break-all text-[10px] text-sky-200">{{ node.sourcePath ?? 'No explicit source path' }}</code>
                  </div>

                  <div class="mt-4 rounded-sm border border-white/10 bg-white/3 p-4">
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

                  <div class="mt-4 rounded-sm border border-white/10 bg-white/3 p-4">
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

                  <div class="mt-4 flex gap-2">
                    <button
                      type="button"
                      class="rounded-sm border border-white/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-slate-300 transition-colors hover:bg-white/5"
                      (click)="clearSelection()"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      class="rounded-sm border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-sky-200 transition-colors hover:bg-sky-400/15"
                      (click)="setViewMode('TWIN')"
                    >
                      Step Into Twin
                    </button>
                  </div>
                </div>
              </div>
            } @else {
              <div class="flex h-full items-center justify-center p-8 text-center text-slate-400">
                <div>
                  <div class="text-[9px] font-black uppercase tracking-[0.32em] text-slate-500">No selection</div>
                  <p class="mt-3 text-[12px] leading-relaxed">
                    Select a node to inspect its route anchors, supporting files, and dependency links.
                  </p>
                </div>
              </div>
            }
          </aside>
        </section>
      } @else {
        <section class="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1.1fr_0.9fr]">
          <div class="min-h-0 overflow-y-auto border-r border-white/10 px-6 py-6">
            @if (selectedNode(); as node) {
              <div class="max-w-4xl">
                <div class="text-[9px] font-black uppercase tracking-[0.32em] text-sky-300/80">Twin Portal</div>
                <h2 class="mt-2 text-4xl font-semibold tracking-tight text-white">{{ node.label }}</h2>
                <p class="mt-3 max-w-3xl text-[13px] leading-relaxed text-slate-300">{{ node.description }}</p>

                <div class="mt-6 grid gap-3 sm:grid-cols-3">
                  <div class="rounded-sm border border-white/10 bg-white/3 p-4">
                    <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Status</div>
                    <div class="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">{{ node.status }}</div>
                  </div>
                  <div class="rounded-sm border border-white/10 bg-white/3 p-4">
                    <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Category</div>
                    <div class="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">{{ node.category }}</div>
                  </div>
                  <div class="rounded-sm border border-white/10 bg-white/3 p-4">
                    <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Area</div>
                    <div class="mt-1 text-[11px] font-bold uppercase tracking-[0.18em]" [style.color]="areaText(node.area)">{{ node.area }}</div>
                  </div>
                </div>

                <div class="mt-6 grid gap-4 lg:grid-cols-2">
                  <div class="rounded-sm border border-white/10 bg-white/3 p-5">
                    <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">What / Why</div>
                    <p class="mt-3 text-[12px] leading-relaxed text-slate-200">{{ node.what }}</p>
                    <p class="mt-3 text-[12px] leading-relaxed text-slate-300">{{ node.why }}</p>
                  </div>
                  <div class="rounded-sm border border-white/10 bg-white/3 p-5">
                    <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Where / Who</div>
                    <p class="mt-3 text-[12px] leading-relaxed text-slate-200">{{ node.where }}</p>
                    <p class="mt-3 text-[12px] leading-relaxed text-slate-300">{{ node.who }}</p>
                  </div>
                </div>

                <div class="mt-6 rounded-sm border border-white/10 bg-white/3 p-5">
                  <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Technical Spec</div>
                  <div class="mt-4 grid gap-4 lg:grid-cols-2">
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
                        <p class="mt-2 text-[12px] leading-relaxed text-slate-300">{{ node.technicalSpecs.logic }}</p>
                      </div>
                    }
                    @if (node.technicalSpecs.math) {
                      <div>
                        <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Math</div>
                        <p class="mt-2 whitespace-pre-line font-mono text-[11px] leading-relaxed text-slate-300">{{ node.technicalSpecs.math }}</p>
                      </div>
                    }
                    @if (node.technicalSpecs.doctrine) {
                      <div>
                        <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Doctrine</div>
                        <p class="mt-2 text-[12px] leading-relaxed text-slate-300">{{ node.technicalSpecs.doctrine }}</p>
                      </div>
                    }
                    @if (node.technicalSpecs.verif) {
                      <div>
                        <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Verification</div>
                        <p class="mt-2 text-[12px] leading-relaxed text-slate-300">{{ node.technicalSpecs.verif }}</p>
                      </div>
                    }
                  </div>
                </div>

                <div class="mt-6 rounded-sm border border-white/10 bg-white/3 p-5">
                  <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Source Anchors</div>
                  <div class="mt-3 grid gap-2 text-[11px] leading-relaxed text-slate-300">
                    <code class="break-all rounded-sm border border-white/10 bg-black/20 px-3 py-2 text-sky-200">{{ node.sourcePath ?? 'No explicit source path' }}</code>
                    <code class="break-all rounded-sm border border-white/10 bg-black/20 px-3 py-2 text-slate-300">{{ node.where }}</code>
                  </div>
                </div>

                <div class="mt-6 flex items-center gap-2">
                  @if (node.route) {
                    <a
                      [routerLink]="node.route"
                      class="rounded-sm border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-sky-200 transition-colors hover:bg-sky-400/15"
                    >
                      Open Route
                    </a>
                  }
                  <button
                    type="button"
                    class="rounded-sm border border-white/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-slate-300 transition-colors hover:bg-white/5"
                    (click)="setViewMode('GRAPH')"
                  >
                    Return To Graph
                  </button>
                </div>
              </div>
            } @else {
              <div class="flex h-full items-center justify-center p-8 text-slate-400">
                No node selected.
              </div>
            }
          </div>

          <aside class="min-h-0 overflow-y-auto px-6 py-6">
            @if (selectedNode(); as node) {
              <div class="space-y-4">
                <div class="rounded-sm border border-white/10 bg-white/3 p-4">
                  <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Neighborhood</div>
                  <div class="mt-3 flex flex-wrap gap-2">
                    @for (related of relatedNodes(); track related.id) {
                      <button
                        type="button"
                        class="rounded-sm border border-white/10 bg-black/20 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-slate-200 transition-colors hover:border-sky-400/30 hover:bg-sky-400/10"
                        (click)="selectNode(related)"
                      >
                        {{ related.label }}
                      </button>
                    }
                  </div>
                </div>

                <div class="rounded-sm border border-white/10 bg-white/3 p-4">
                  <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Graph Metrics</div>
                  <div class="mt-3 grid gap-3 text-[11px] uppercase tracking-[0.18em] text-slate-300">
                    <div class="flex items-center justify-between">
                      <span>Visible nodes</span>
                      <span>{{ visibleNodes().length }}</span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span>Visible edges</span>
                      <span>{{ visibleEdges().length }}</span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span>Filters active</span>
                      <span>{{ hasFilters() ? 'Yes' : 'No' }}</span>
                    </div>
                  </div>
                </div>

                <div class="rounded-sm border border-white/10 bg-white/3 p-4">
                  <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Current Filters</div>
                  <div class="mt-3 flex flex-wrap gap-2">
                    @for (category of store.activeCategories(); track category) {
                      <span class="rounded-sm border border-sky-400/20 bg-sky-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-sky-200">
                        {{ category }}
                      </span>
                    }
                    @for (area of store.activeAreas(); track area) {
                      <span class="rounded-sm border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-200">
                        {{ area }}
                      </span>
                    }
                    @if (store.searchQuery()) {
                      <span class="rounded-sm border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-amber-200">
                        {{ store.searchQuery() }}
                      </span>
                    }
                    @if (!hasFilters()) {
                      <span class="text-[10px] uppercase tracking-[0.18em] text-slate-500">No filters active</span>
                    }
                  </div>
                </div>
              </div>
            }
          </aside>
        </section>
      }
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

  viewMode = signal<KnowledgeGraphViewMode>('GRAPH');
  zoom = signal(1);

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

  visibleEdges = computed<ViewEdge[]>(() => {
    const nodes = this.store.nodes();
    const nodesById = new Map(nodes.map(node => [node.id, node] as const));
    const visibleIds = this.visibleNodeIds();
    const selected = this.selectedNode();
    const hasFilters = this.hasFilters();
    const edges: ViewEdge[] = [];

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
          key: `${source.id}__${target.id}`,
          source,
          target,
          highlighted: !!selected && (source.id === selected.id || target.id === selected.id),
          active: sourceVisible && targetVisible,
          visible,
        });
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

  setViewMode(mode: KnowledgeGraphViewMode) {
    this.viewMode.set(mode);
    this.store.setViewMode(mode);
  }

  toggleCategory(category: NodeCategory) {
    this.store.toggleCategory(category);
  }

  toggleArea(area: PlatformArea) {
    this.store.toggleArea(area);
  }

  resetFilters() {
    this.store.resetFilters();
    this.store.selectNode('PLAT_001');
    this.resetZoom();
  }

  zoomIn() {
    this.zoom.update(value => Math.min(1.6, value + 0.08));
  }

  zoomOut() {
    this.zoom.update(value => Math.max(0.72, value - 0.08));
  }

  resetZoom() {
    this.zoom.set(1);
  }

  edgeStroke(edge: ViewEdge): string {
    if (edge.highlighted) return '#fbbf24';
    if (edge.active) return '#334155';
    return '#1f2937';
  }

  edgeOpacity(edge: ViewEdge): number {
    if (edge.highlighted) return 0.85;
    if (edge.active) return 0.35;
    return 0.18;
  }

  nodeFill(area?: PlatformArea): string {
    return this.areaColor(area);
  }

  nodeStroke(node: TechNode): string {
    if (this.isSelected(node.id)) return '#fbbf24';
    if (this.isRelatedToSelected(node.id)) return '#94a3b8';
    return this.areaStroke(node.area);
  }

  nodeStrokeWidth(node: TechNode): number {
    if (this.isSelected(node.id)) return 2.2;
    if (this.isRelatedToSelected(node.id)) return 1.5;
    return 1.1;
  }

  areaText(area?: PlatformArea): string {
    switch (area) {
      case 'runtime':
        return '#7dd3fc';
      case 'backend':
        return '#c4b5fd';
      case 'docs':
        return '#6ee7b7';
      case 'research':
        return '#fbbf24';
      case 'scaffold':
        return '#cbd5e1';
      default:
        return '#cbd5e1';
    }
  }

  areaColor(area?: PlatformArea): string {
    switch (area) {
      case 'runtime':
        return 'rgba(56, 189, 248, 0.28)';
      case 'backend':
        return 'rgba(167, 139, 250, 0.28)';
      case 'docs':
        return 'rgba(52, 211, 153, 0.24)';
      case 'research':
        return 'rgba(251, 191, 36, 0.26)';
      case 'scaffold':
        return 'rgba(148, 163, 184, 0.22)';
      default:
        return 'rgba(148, 163, 184, 0.22)';
    }
  }

  areaStroke(area?: PlatformArea): string {
    switch (area) {
      case 'runtime':
        return '#38bdf8';
      case 'backend':
        return '#a78bfa';
      case 'docs':
        return '#34d399';
      case 'research':
        return '#fbbf24';
      case 'scaffold':
        return '#94a3b8';
      default:
        return '#94a3b8';
    }
  }

  isSelected(nodeId: string): boolean {
    return this.selectedNode()?.id === nodeId;
  }

  isRelatedToSelected(nodeId: string): boolean {
    return this.relatedNodeIds().has(nodeId);
  }

  onSearch(value: string) {
    this.store.setSearchQuery(value);
  }
}
