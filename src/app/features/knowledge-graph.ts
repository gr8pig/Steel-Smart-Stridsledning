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
  imports: [CommonModule, RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-full w-full flex-col overflow-hidden bg-[#05080d] text-[#E2E8F0]" [class.dark]="isDark()">
      <header class="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-[#080c12]/95 px-6 py-4 backdrop-blur">
        <div class="min-w-0">
          <div class="text-[9px] font-black uppercase tracking-[0.35em] text-sky-300/80">Boreal Info_Arch</div>
          <h1 class="mt-1 text-xl font-semibold tracking-tight text-white">Platform Knowledge Graph</h1>
          <p class="mt-1 max-w-3xl text-[11px] leading-relaxed text-slate-400">
            A 3D-styled map of runtime UI, state, services, backend seams, docs, research, and scaffold assets.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <label class="hidden items-center gap-2 rounded-sm border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-slate-400 md:flex">
            <mat-icon class="h-[14px] w-[14px] text-[14px]">search</mat-icon>
            <input
              type="text"
              class="w-60 bg-transparent text-[10px] uppercase tracking-[0.16em] text-slate-200 outline-none placeholder:text-slate-500"
              [value]="store.searchQuery()"
              placeholder="label, file, route, who..."
              (input)="onSearch($any($event.target).value)"
            />
          </label>

          <div class="flex items-center gap-px rounded-sm border border-white/10 bg-white/5 p-0.5">
            <button
              type="button"
              class="rounded-sm px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] transition-colors"
              [class.bg-sky-500]="viewMode() === 'GRAPH'"
              [class.text-white]="viewMode() === 'GRAPH'"
              [class.text-slate-500]="viewMode() !== 'GRAPH'"
              (click)="setViewMode('GRAPH')"
            >
              Graph
            </button>
            <button
              type="button"
              class="rounded-sm px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] transition-colors"
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

          <button
            type="button"
            class="rounded-sm border border-white/10 p-2 text-slate-300 transition-colors hover:border-white/20 hover:bg-white/5"
            (click)="toggleTheme()"
            [attr.aria-label]="isDark() ? 'Switch to light theme' : 'Switch to dark theme'"
          >
            <mat-icon class="text-sm">{{ isDark() ? 'wb_sunny' : 'nightlight_round' }}</mat-icon>
          </button>
        </div>
      </header>

      @if (viewMode() === 'GRAPH') {
        <section class="relative flex min-h-0 flex-1 overflow-hidden">
          <div
            class="relative min-w-0 flex-1 overflow-hidden border-r border-white/10"
            [class.bg-[#050505]]="isDark()"
            [class.bg-[#f0f2f5]]="!isDark()"
          >
            <div class="absolute left-6 top-6 z-20 flex flex-col gap-4">
              <div class="flex max-w-3xl flex-wrap gap-2">
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

              <div class="flex max-w-3xl flex-wrap gap-2">
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

            <div class="absolute bottom-6 left-6 z-20 flex items-center gap-4 text-[9px] font-mono uppercase tracking-[0.25em] text-slate-500 pointer-events-none">
              <div class="flex flex-col gap-1">
                <span class="text-white/40">Entities</span>
                <span class="font-bold text-sky-300">{{ visibleNodes().length }} / {{ nodes().length }}</span>
              </div>
              <div class="h-6 w-px bg-white/10"></div>
              <div class="flex flex-col gap-1">
                <span class="text-white/40">Active_Filter</span>
                <span class="font-bold text-emerald-300">{{ hasFilters() ? 'ON' : 'OFF' }}</span>
              </div>
              @if (selectedNode(); as node) {
                <div class="h-6 w-px bg-white/10"></div>
                <div class="flex flex-col gap-1">
                  <span class="text-white/40">Selection</span>
                  <span class="font-bold text-white">{{ node.label }}</span>
                </div>
              }
            </div>

            <div class="absolute bottom-8 right-8 z-20 flex gap-2">
              <button
                type="button"
                class="rounded-sm border px-3 py-2 text-[8px] uppercase tracking-widest transition-colors"
                (click)="resetView()"
                [class.bg-white/5]="isDark()"
                [class.border-white/10]="isDark()"
                [class.text-white]="isDark()"
                [class.bg-white]="!isDark()"
                [class.border-slate-200]="!isDark()"
                [class.text-slate-600]="!isDark()"
              >
                Reset_View
              </button>
              <div class="flex border" [class.border-white/10]="isDark()" [class.border-slate-200]="!isDark()">
                <button
                  type="button"
                  class="border-r p-2 transition-colors"
                  (click)="zoomIn()"
                  [class.text-white]="isDark()"
                  [class.hover:bg-white/5]="isDark()"
                  [class.border-white/10]="isDark()"
                  [class.text-slate-600]="!isDark()"
                  [class.hover:bg-slate-50]="!isDark()"
                  [class.border-slate-200]="!isDark()"
                >
                  <mat-icon class="text-sm">add</mat-icon>
                </button>
                <button
                  type="button"
                  class="p-2 transition-colors"
                  (click)="zoomOut()"
                  [class.text-white]="isDark()"
                  [class.hover:bg-white/5]="isDark()"
                  [class.text-slate-600]="!isDark()"
                  [class.hover:bg-slate-50]="!isDark()"
                >
                  <mat-icon class="text-sm">remove</mat-icon>
                </button>
              </div>
            </div>

            <div
              class="absolute inset-0 pointer-events-none opacity-20"
              [style.background-image]="isDark() ? 'radial-gradient(#ffffff 1px, transparent 1px)' : 'radial-gradient(#000000 1px, transparent 1px)'"
              [style.background-size]="'40px 40px'"
            ></div>
            @if (isDark()) {
              <div class="absolute inset-0 z-10 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%)] bg-[length:100%_4px] opacity-10"></div>
            }

            <div class="absolute inset-0 z-10 transition-transform duration-700 ease-out preserve-3d" [style.transform]="graphPerspective()">
              <svg
                class="h-full w-full select-none cursor-grab active:cursor-grabbing"
                (mousedown)="onMouseDown($event)"
                (mousemove)="onMouseMove($event)"
                (mouseup)="onMouseUp()"
                (mouseleave)="onMouseUp()"
                (wheel)="onWheel($event)"
              >
                <defs>
                  <marker id="arrowhead-dark" markerWidth="8" markerHeight="6" refX="18" refY="3" orient="auto">
                    <path d="M0,0 L8,3 L0,6 Z" fill="#fbbf24" opacity="0.8" />
                  </marker>
                  <marker id="arrowhead-light" markerWidth="8" markerHeight="6" refX="18" refY="3" orient="auto">
                    <path d="M0,0 L8,3 L0,6 Z" fill="#2563eb" opacity="0.8" />
                  </marker>
                </defs>

                <g [attr.transform]="'translate(' + panX() + ',' + panY() + ') scale(' + zoom() + ')'">
                  <g class="transition-opacity duration-700">
                    @for (line of graphLines(); track line.id) {
                      <path
                        [attr.d]="'M' + line.x1 + ',' + line.y1 + ' L' + line.x2 + ',' + line.y2"
                        [attr.stroke]="lineStroke(line)"
                        fill="none"
                        [attr.stroke-width]="line.highlighted ? 2 : line.active ? 1.5 : 1"
                        [attr.stroke-dasharray]="line.active ? 'none' : '4 4'"
                        [attr.marker-end]="line.highlighted ? (isDark() ? 'url(#arrowhead-dark)' : 'url(#arrowhead-light)') : 'none'"
                        [style.opacity]="lineOpacity(line)"
                        class="transition-all duration-500"
                      />

                      @if (line.active || line.highlighted) {
                        <circle
                          r="1.5"
                          [attr.fill]="isDark() ? '#fbbf24' : '#2563eb'"
                          class="animate-flow-particle"
                          [style.opacity]="line.highlighted ? 1 : 0.6"
                        >
                          <animateMotion
                            [attr.path]="'M' + line.x1 + ',' + line.y1 + ' L' + line.x2 + ',' + line.y2"
                            [attr.dur]="line.highlighted ? '1.2s' : '3s'"
                            repeatCount="indefinite"
                          />
                        </circle>
                      }
                    }
                  </g>

                  @for (node of nodes(); track node.id) {
                    @let isDimmed = isNodeDimmed(node.id);
                    @let isHovered = hoveredNodeId() === node.id;
                    @let isSelected = selectedNode()?.id === node.id;

                    <g
                      class="cursor-pointer group outline-none transition-all duration-500 preserve-3d"
                      tabindex="0"
                      [class.opacity-20]="isDimmed"
                      [class.opacity-100]="!isDimmed"
                      [style.transform]="'translateZ(' + (node.z + (isHovered ? 40 : 0)) + 'px)'"
                      (mouseenter)="hoveredNodeId.set(node.id)"
                      (mouseleave)="hoveredNodeId.set(null)"
                      (click)="selectNode(node); $event.stopPropagation()"
                      (keydown.enter)="selectNode(node)"
                    >
                      <line
                        [attr.x1]="node.x"
                        [attr.y1]="node.y"
                        [attr.x2]="node.x"
                        [attr.y2]="node.y"
                        stroke-width="0.5"
                        stroke-dasharray="2 4"
                        [attr.stroke]="isDark() ? '#ffffff08' : '#00000008'"
                        [style.transform]="'translateZ(' + (-node.z - 200) + 'px)'"
                      ></line>

                      <circle
                        [attr.cx]="node.x"
                        [attr.cy]="node.y"
                        r="40"
                        class="transition-all duration-700 opacity-0 group-hover:opacity-100"
                        [class.fill-amber-500/5]="isDark()"
                        [class.fill-blue-500/5]="!isDark()"
                      ></circle>

                      <g transform-origin="center" [style.transform]="isHovered ? 'scale(1.2)' : 'scale(1)'" class="transition-transform duration-300">
                        @switch (node.category) {
                          @case ('DECISION') {
                            <rect
                              [attr.x]="node.x - 5"
                              [attr.y]="node.y - 5"
                              width="10"
                              height="10"
                              class="rotate-45 fill-none"
                              [attr.stroke]="nodeStroke(node, isSelected, isHovered)"
                              stroke-width="1.5"
                            ></rect>
                            <circle
                              [attr.cx]="node.x"
                              [attr.cy]="node.y"
                              r="1.5"
                              [attr.fill]="nodeStroke(node, isSelected, isHovered)"
                            ></circle>
                          }
                          @case ('CORE') {
                            <rect
                              [attr.x]="node.x - 5"
                              [attr.y]="node.y - 5"
                              width="10"
                              height="10"
                              class="fill-none"
                              [attr.stroke]="nodeStroke(node, isSelected, isHovered)"
                              stroke-width="1.5"
                            ></rect>
                            <rect
                              [attr.x]="node.x - 1.5"
                              [attr.y]="node.y - 1.5"
                              width="3"
                              height="3"
                              [attr.fill]="nodeStroke(node, isSelected, isHovered)"
                            ></rect>
                          }
                          @case ('LOGISTICS') {
                            <path
                              [attr.d]="'M' + node.x + ',' + (node.y - 6) + ' L' + (node.x + 6) + ',' + (node.y + 4) + ' L' + (node.x - 6) + ',' + (node.y + 4) + ' Z'"
                              class="fill-none"
                              [attr.stroke]="nodeStroke(node, isSelected, isHovered)"
                              stroke-width="1.5"
                            ></path>
                          }
                          @case ('INTELLIGENCE') {
                            <path
                              [attr.d]="'M' + node.x + ',' + (node.y - 6) + ' L' + (node.x + 6) + ',' + (node.y - 2) + ' L' + (node.x + 6) + ',' + (node.y + 2) + ' L' + (node.x) + ',' + (node.y + 6) + ' L' + (node.x - 6) + ',' + (node.y + 2) + ' L' + (node.x - 6) + ',' + (node.y - 2) + ' Z'"
                              class="fill-none"
                              [attr.stroke]="nodeStroke(node, isSelected, isHovered)"
                              stroke-width="1.4"
                            ></path>
                          }
                          @case ('GOVERNANCE') {
                            <rect
                              [attr.x]="node.x - 3"
                              [attr.y]="node.y - 7"
                              width="6"
                              height="14"
                              rx="3"
                              class="fill-none"
                              [attr.stroke]="nodeStroke(node, isSelected, isHovered)"
                              stroke-width="1.4"
                            ></rect>
                          }
                          @default {
                            <line [attr.x1]="node.x - 4" [attr.y1]="node.y" [attr.x2]="node.x + 4" [attr.y2]="node.y" [attr.stroke]="nodeStroke(node, isSelected, isHovered)" stroke-width="1"></line>
                            <line [attr.x1]="node.x" [attr.y1]="node.y - 4" [attr.x2]="node.x" [attr.y2]="node.y + 4" [attr.stroke]="nodeStroke(node, isSelected, isHovered)" stroke-width="1"></line>
                          }
                        }
                      </g>

                      <text
                        [attr.x]="node.x + 16"
                        [attr.y]="node.y + 4"
                        class="pointer-events-none text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300"
                        [class.fill-white]="isDark()"
                        [class.fill-slate-900]="!isDark()"
                        [class.opacity-40]="selectedNode() && !isSelected && !isRelatedToFocus(node.id)"
                        [class.opacity-100]="!selectedNode() || isSelected || isRelatedToFocus(node.id)"
                      >
                        {{ node.label }}
                      </text>

                      <text
                        [attr.x]="node.x + 16"
                        [attr.y]="node.y + 16"
                        class="pointer-events-none text-[7px] font-mono uppercase tracking-widest opacity-40"
                        [class.fill-slate-400]="isDark()"
                        [class.fill-slate-500]="!isDark()"
                      >
                        {{ node.category }} / {{ node.area ?? 'UNSPECIFIED' }}
                      </text>
                    </g>
                  }
                </g>
              </svg>
            </div>
          </div>

          @if (selectedNode(); as node) {
            <aside class="absolute right-0 top-0 bottom-0 z-40 flex w-[450px] flex-col overflow-hidden border-l border-white/10 bg-[#080b11]/95 backdrop-blur shadow-2xl animate-in slide-in-from-right">
              <div class="shrink-0 border-b border-white/10 px-8 py-8">
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <div class="text-[8px] font-black uppercase tracking-[0.4em] text-sky-400/70">Structural_Metadata</div>
                    <h2 class="mt-2 truncate text-3xl font-light uppercase tracking-tighter text-white">{{ node.label }}</h2>
                  </div>
                  <button (click)="clearSelection()" class="rounded-full p-2 text-slate-500 transition-colors hover:bg-white/5">
                    <mat-icon class="text-sm">close</mat-icon>
                  </button>
                </div>
                <p class="mt-4 text-[12px] leading-relaxed text-slate-300 font-light">{{ node.description }}</p>
              </div>

              <div class="custom-scrollbar flex-1 overflow-y-auto px-8 py-6 space-y-8">
                <div class="grid grid-cols-2 gap-4">
                  <div class="rounded-sm border border-white/5 bg-white/2 p-4">
                    <div class="mb-1 text-[7px] font-black uppercase tracking-[0.3em] text-slate-500">Status</div>
                    <div class="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-200">{{ node.status }}</div>
                  </div>
                  <div class="rounded-sm border border-white/5 bg-white/2 p-4">
                    <div class="mb-1 text-[7px] font-black uppercase tracking-[0.3em] text-slate-500">Platform_Area</div>
                    <div class="text-[10px] font-bold uppercase tracking-[0.2em]" [style.color]="areaText(node.area)">{{ node.area ?? 'UNSPECIFIED' }}</div>
                  </div>
                </div>

                @if (node.what || node.why) {
                  <div class="space-y-4">
                    @if (node.what) {
                      <div class="rounded-sm border border-white/5 bg-white/2 p-5">
                        <div class="mb-2 text-[7px] font-black uppercase tracking-[0.3em] text-slate-500">Technical_Purpose</div>
                        <p class="text-[11px] leading-relaxed text-slate-200">{{ node.what }}</p>
                      </div>
                    }
                    @if (node.why) {
                      <div class="rounded-sm border border-white/5 bg-white/2 p-5">
                        <div class="mb-2 text-[7px] font-black uppercase tracking-[0.3em] text-slate-500">Architectural_Rationale</div>
                        <p class="text-[11px] leading-relaxed italic text-slate-300">{{ node.why }}</p>
                      </div>
                    }
                  </div>
                }

                <div class="rounded-sm border border-white/10 bg-white/2 p-5 space-y-6">
                  <div class="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">Computational_Interface</div>
                  <div class="grid grid-cols-2 gap-6">
                    <div>
                      <div class="mb-3 text-[7px] font-black uppercase tracking-[0.3em] text-sky-400/50">Inputs</div>
                      <div class="flex flex-wrap gap-2">
                        @for (input of node.technicalSpecs.inputs; track input) {
                          <span class="border-b border-sky-500/20 pb-0.5 text-[9px] font-mono text-sky-200">{{ input }}</span>
                        }
                      </div>
                    </div>
                    <div>
                      <div class="mb-3 text-[7px] font-black uppercase tracking-[0.3em] text-emerald-400/50">Outputs</div>
                      <div class="flex flex-wrap gap-2">
                        @for (output of node.technicalSpecs.outputs; track output) {
                          <span class="border-b border-emerald-500/20 pb-0.5 text-[9px] font-mono text-emerald-200">{{ output }}</span>
                        }
                      </div>
                    </div>
                  </div>

                  @if (node.technicalSpecs.logic) {
                    <div class="border-t border-white/5 pt-4">
                      <div class="mb-2 text-[7px] font-black uppercase tracking-[0.3em] text-slate-600">Process_Logic</div>
                      <p class="text-[10px] leading-relaxed text-slate-400">{{ node.technicalSpecs.logic }}</p>
                    </div>
                  }

                  @if (node.technicalSpecs.math) {
                    <div class="border-t border-white/5 pt-4">
                      <div class="mb-2 text-[7px] font-black uppercase tracking-[0.3em] text-slate-600">Mathematical_Grounding</div>
                      <p class="whitespace-pre-wrap font-mono text-[10px] text-amber-500/80">{{ node.technicalSpecs.math }}</p>
                    </div>
                  }

                  @if (node.technicalSpecs.doctrine) {
                    <div class="border-t border-white/5 pt-4">
                      <div class="mb-2 text-[7px] font-black uppercase tracking-[0.3em] text-slate-600">Doctrinal_Mapping</div>
                      <p class="text-[10px] italic text-slate-300">"{{ node.technicalSpecs.doctrine }}"</p>
                    </div>
                  }

                  @if (node.technicalSpecs.verif) {
                    <div class="border-t border-white/5 pt-4">
                      <div class="mb-2 text-[7px] font-black uppercase tracking-[0.3em] text-slate-600">Verification_Signals</div>
                      <p class="text-[10px] leading-relaxed text-slate-400">{{ node.technicalSpecs.verif }}</p>
                    </div>
                  }
                </div>

                <div class="rounded-sm border border-white/5 bg-white/2 p-5">
                  <div class="mb-3 text-[7px] font-black uppercase tracking-[0.3em] text-slate-500">Repository_Seams</div>
                  <div class="flex flex-col gap-2">
                    <code class="break-all rounded-sm border border-white/5 bg-black/40 p-2 text-[9px] text-sky-300">{{ node.sourcePath }}</code>
                    @if (node.route) {
                      <a [routerLink]="node.route" class="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-sky-400 transition-colors hover:text-sky-300">
                        Navigate_To_Surface
                        <mat-icon class="text-[12px]">open_in_new</mat-icon>
                      </a>
                    }
                    @if (node.where) {
                      <p class="text-[10px] leading-relaxed text-slate-400">{{ node.where }}</p>
                    }
                    @if (node.who) {
                      <p class="text-[10px] leading-relaxed text-slate-400">Who: {{ node.who }}</p>
                    }
                  </div>
                </div>

                <div class="pb-8">
                  <div class="mb-4 text-[7px] font-black uppercase tracking-[0.3em] text-slate-500">Topology_Neighborhood</div>
                  <div class="flex flex-wrap gap-2">
                    @for (related of relatedNodes(); track related.id) {
                      <button
                        type="button"
                        (click)="selectNode(related)"
                        class="rounded-sm border border-white/5 bg-white/3 px-3 py-1.5 text-[9px] uppercase tracking-widest text-slate-400 transition-all hover:border-sky-500/40 hover:text-sky-200"
                      >
                        {{ related.label }}
                      </button>
                    }
                  </div>
                </div>
              </div>
            </aside>
          }
        </section>
      }

      @if (viewMode() === 'TWIN') {
        @if (twinNode(); as node) {
          <div class="relative flex flex-1 flex-col overflow-hidden p-12 transition-colors duration-500" [class.bg-[#050505]]="isDark()" [class.bg-slate-50]="!isDark()">
            <button
              type="button"
              (click)="viewMode.set('GRAPH')"
              class="absolute left-12 top-12 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all hover:translate-x-[-4px]"
              [class.text-white/40]="isDark()"
              [class.text-slate-400]="!isDark()"
              [class.hover:text-amber-500]="isDark()"
              [class.hover:text-blue-600]="!isDark()"
            >
              <mat-icon class="text-sm">arrow_back</mat-icon>
              Return_To_Mesh
            </button>

            <div class="mx-auto flex w-full max-w-6xl flex-1 flex-col pt-12">
              <div class="mb-12 flex items-end justify-between gap-8">
                <div class="space-y-2">
                  <div class="flex items-center gap-4">
                    <span
                      class="border px-2 py-0.5 text-[10px] uppercase tracking-widest opacity-50"
                      [class.border-white/10]="isDark()"
                      [class.border-slate-200]="!isDark()"
                      [class.text-white]="isDark()"
                      [class.text-slate-900]="!isDark()"
                    >
                      LIVE_INSTANCE :: {{ node.id }}
                    </span>
                  </div>
                  <h1
                    class="text-6xl font-light uppercase tracking-[2px] transition-colors"
                    [class.text-white]="isDark()"
                    [class.text-slate-900]="!isDark()"
                  >
                    {{ node.label }}
                  </h1>
                </div>

                <div class="text-right">
                  <div class="text-[9px] uppercase tracking-[0.3em] text-slate-500">Twin_Portal</div>
                  <div class="mt-2 text-[11px] uppercase tracking-[0.18em] text-sky-300">Status :: {{ node.status }}</div>
                </div>
              </div>

              <div class="grid flex-1 gap-6 lg:grid-cols-[1.2fr_0.9fr]">
                <section
                  class="rounded-md border p-6 shadow-2xl"
                  [class.border-white/10]="isDark()"
                  [class.bg-black/40]="isDark()"
                  [class.border-slate-200]="!isDark()"
                  [class.bg-white]="!isDark()"
                >
                  <div class="mb-6 flex flex-wrap items-center gap-3">
                    <span class="rounded-sm border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[8px] font-black uppercase tracking-[0.22em] text-sky-200">
                      {{ node.category }}
                    </span>
                    <span class="rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[8px] font-black uppercase tracking-[0.22em] text-emerald-200">
                      {{ node.area ?? 'UNSPECIFIED' }}
                    </span>
                    @if (node.route) {
                      <a [routerLink]="node.route" class="rounded-sm border border-white/10 px-3 py-1 text-[8px] font-black uppercase tracking-[0.22em] text-slate-300 transition-colors hover:border-white/20 hover:bg-white/5">
                        Route
                      </a>
                    }
                  </div>

                  <p class="max-w-3xl text-[12px] leading-relaxed text-slate-300">{{ node.description }}</p>

                  <div class="mt-8 grid gap-4 md:grid-cols-2">
                    <div class="rounded-sm border border-white/5 bg-white/2 p-4">
                      <div class="mb-2 text-[7px] font-black uppercase tracking-[0.3em] text-slate-500">What</div>
                      <p class="text-[11px] leading-relaxed text-slate-200">{{ node.what ?? 'No explicit what field.' }}</p>
                    </div>
                    <div class="rounded-sm border border-white/5 bg-white/2 p-4">
                      <div class="mb-2 text-[7px] font-black uppercase tracking-[0.3em] text-slate-500">Why</div>
                      <p class="text-[11px] leading-relaxed italic text-slate-300">{{ node.why ?? 'No explicit why field.' }}</p>
                    </div>
                  </div>

                  <div class="mt-4 rounded-sm border border-white/5 bg-white/2 p-5">
                    <div class="mb-3 text-[7px] font-black uppercase tracking-[0.3em] text-slate-500">Interface</div>
                    <div class="grid gap-6 md:grid-cols-2">
                      <div>
                        <div class="mb-2 text-[7px] font-black uppercase tracking-[0.3em] text-sky-400/50">Inputs</div>
                        <div class="flex flex-wrap gap-2">
                          @for (input of node.technicalSpecs.inputs; track input) {
                            <span class="rounded-sm border border-sky-500/20 px-2 py-1 text-[9px] font-mono text-sky-200">{{ input }}</span>
                          }
                        </div>
                      </div>
                      <div>
                        <div class="mb-2 text-[7px] font-black uppercase tracking-[0.3em] text-emerald-400/50">Outputs</div>
                        <div class="flex flex-wrap gap-2">
                          @for (output of node.technicalSpecs.outputs; track output) {
                            <span class="rounded-sm border border-emerald-500/20 px-2 py-1 text-[9px] font-mono text-emerald-200">{{ output }}</span>
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="mt-4 rounded-sm border border-white/5 bg-white/2 p-5">
                    <div class="mb-3 text-[7px] font-black uppercase tracking-[0.3em] text-slate-500">Repository_Seams</div>
                    <code class="block break-all rounded-sm border border-white/5 bg-black/40 p-2 text-[9px] text-sky-300">{{ node.sourcePath }}</code>
                    @if (node.where) {
                      <p class="mt-3 text-[10px] leading-relaxed text-slate-400">{{ node.where }}</p>
                    }
                    @if (node.who) {
                      <p class="mt-2 text-[10px] leading-relaxed text-slate-400">Who: {{ node.who }}</p>
                    }
                  </div>
                </section>

                <section
                  class="rounded-md border p-6 shadow-2xl"
                  [class.border-white/10]="isDark()"
                  [class.bg-black/40]="isDark()"
                  [class.border-slate-200]="!isDark()"
                  [class.bg-white]="!isDark()"
                >
                  <div class="text-[9px] uppercase tracking-[0.3em] text-slate-500">Twin_Neighborhood</div>
                  <div class="mt-5 flex flex-wrap gap-2">
                    @for (related of relatedNodes(); track related.id) {
                      <button
                        type="button"
                        (click)="selectNode(related)"
                        class="rounded-sm border border-white/10 px-3 py-1.5 text-[9px] uppercase tracking-widest text-slate-300 transition-colors hover:border-sky-500/40 hover:text-sky-200"
                      >
                        {{ related.label }}
                      </button>
                    }
                  </div>

                  <div class="mt-8 space-y-4">
                    <div class="rounded-sm border border-white/5 bg-white/2 p-4">
                      <div class="mb-2 text-[7px] font-black uppercase tracking-[0.3em] text-slate-500">Status</div>
                      <div class="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-200">{{ node.status }}</div>
                    </div>
                    <div class="rounded-sm border border-white/5 bg-white/2 p-4">
                      <div class="mb-2 text-[7px] font-black uppercase tracking-[0.3em] text-slate-500">Area</div>
                      <div class="text-[10px] font-bold uppercase tracking-[0.2em]" [style.color]="areaText(node.area)">{{ node.area ?? 'UNSPECIFIED' }}</div>
                    </div>
                    @if (node.technicalSpecs.logic) {
                      <div class="rounded-sm border border-white/5 bg-white/2 p-4">
                        <div class="mb-2 text-[7px] font-black uppercase tracking-[0.3em] text-slate-500">Logic</div>
                        <p class="text-[10px] leading-relaxed text-slate-400">{{ node.technicalSpecs.logic }}</p>
                      </div>
                    }
                    @if (node.technicalSpecs.doctrine) {
                      <div class="rounded-sm border border-white/5 bg-white/2 p-4">
                        <div class="mb-2 text-[7px] font-black uppercase tracking-[0.3em] text-slate-500">Doctrine</div>
                        <p class="text-[10px] italic text-slate-300">"{{ node.technicalSpecs.doctrine }}"</p>
                      </div>
                    }
                    @if (node.technicalSpecs.verif) {
                      <div class="rounded-sm border border-white/5 bg-white/2 p-4">
                        <div class="mb-2 text-[7px] font-black uppercase tracking-[0.3em] text-slate-500">Verification</div>
                        <p class="text-[10px] leading-relaxed text-slate-400">{{ node.technicalSpecs.verif }}</p>
                      </div>
                    }
                  </div>
                </section>
              </div>
            </div>
          </div>
        }
      }
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
