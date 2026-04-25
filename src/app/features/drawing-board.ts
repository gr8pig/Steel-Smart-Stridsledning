import {
  Component, ChangeDetectionStrategy, inject, signal, computed,
  effect, OnDestroy, ElementRef, ViewChild, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SteelApiService } from '../core/services/steel-api.service';
import {
  DrawingBoardStore, DrawingUnit, DrawingUnitType, DrawingMode, DrawingSide,
} from '../core/state/drawing-board.store';
import { ENGAGEMENT_MAP_FEATURES } from '../shared/domain/engagement-map.data';

// ─── Unit catalogue ─────────────────────────────────────────────────────────

const UNIT_CATALOGUE: { group: string; type: DrawingUnitType; label: string }[] = [
  { group: 'Ground', type: 'INFANTRY',       label: 'Infantry'   },
  { group: 'Ground', type: 'ARMOR',          label: 'Armor'      },
  { group: 'Ground', type: 'ARTILLERY',      label: 'Artillery'  },
  { group: 'Ground', type: 'SPECIAL_FORCES', label: 'SF'         },
  { group: 'Naval',  type: 'SHIP_DESTROYER', label: 'Destroyer'  },
  { group: 'Naval',  type: 'SHIP_CARRIER',   label: 'Carrier'    },
  { group: 'Naval',  type: 'SHIP_SUBMARINE', label: 'Submarine'  },
  { group: 'Naval',  type: 'SHIP_PATROL',    label: 'Patrol'     },
  { group: 'Air',    type: 'AIRCRAFT',       label: 'Aircraft'   },
  { group: 'Air',    type: 'DRONE',          label: 'Drone'      },
  { group: 'Air',    type: 'HELICOPTER',     label: 'Helicopter' },
];

const GROUPS = ['Ground', 'Naval', 'Air'];

@Component({
  selector: 'app-drawing-board',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="h-full w-full flex overflow-hidden">

      <!-- ── LEFT PANEL ───────────────────────────────────────────────── -->
      <div class="w-56 border-r border-boreal-border bg-boreal-panel flex flex-col z-20 shadow-2xl shrink-0">

        <!-- Mode switcher -->
        <div class="panel-header uppercase tracking-widest text-[10px] text-boreal-text-muted">Mode</div>
        <div class="flex flex-col gap-1 p-2">
          @for (m of modes; track m.value) {
            <button
              (click)="setMode(m.value)"
              class="flex items-center gap-2 px-3 py-2 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all border"
              [class.bg-boreal-blue]="store.mode() === m.value"
              [class.text-white]="store.mode() === m.value"
              [class.border-boreal-blue]="store.mode() === m.value"
              [class.text-boreal-text-muted]="store.mode() !== m.value"
              [class.border-boreal-border]="store.mode() !== m.value"
              [class.hover:bg-white/5]="store.mode() !== m.value"
            >
              <mat-icon class="!text-sm !w-4 !h-4">{{ m.icon }}</mat-icon>
              {{ m.label }}
            </button>
          }
        </div>

        <!-- Side toggle (RED / BLUE) -->
        <div class="px-2 py-2 border-t border-boreal-border">
          <div class="text-[9px] font-black text-boreal-text-muted uppercase tracking-widest mb-1.5">Force Side</div>
          <div class="flex gap-1">
            <button (click)="store.activeSide.set('RED')"
              class="flex-1 py-1.5 rounded-sm text-[9px] font-black uppercase tracking-widest border transition-all"
              [class.bg-boreal-red]="store.activeSide() === 'RED'"
              [class.text-white]="store.activeSide() === 'RED'"
              [class.border-boreal-red]="store.activeSide() === 'RED'"
              [class.text-boreal-text-muted]="store.activeSide() !== 'RED'"
              [class.border-boreal-border]="store.activeSide() !== 'RED'"
            >RED</button>
            <button (click)="store.activeSide.set('BLUE')"
              class="flex-1 py-1.5 rounded-sm text-[9px] font-black uppercase tracking-widest border transition-all"
              [class.bg-boreal-blue]="store.activeSide() === 'BLUE'"
              [class.text-white]="store.activeSide() === 'BLUE'"
              [class.border-boreal-blue]="store.activeSide() === 'BLUE'"
              [class.text-boreal-text-muted]="store.activeSide() !== 'BLUE'"
              [class.border-boreal-border]="store.activeSide() !== 'BLUE'"
            >BLUE</button>
          </div>
        </div>

        <!-- Unit type palette -->
        <div class="border-t border-boreal-border px-2 py-2 flex flex-col gap-2">
          <div class="flex flex-col gap-1">
            <span class="text-[9px] font-black text-boreal-text-muted uppercase tracking-widest">Armament</span>
            <select
              [ngModel]="store.activeArmament()"
              (ngModelChange)="store.activeArmament.set($event)"
              class="w-full bg-boreal-canvas border border-boreal-border rounded-sm text-[10px] px-2 py-1 text-boreal-text-primary focus:outline-none focus:border-boreal-blue"
            >
              <option value="Standard">Standard</option>
              <option value="Heavy">Heavy</option>
              <option value="Anti-Air">Anti-Air</option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-[9px] font-black text-boreal-text-muted uppercase tracking-widest">Origin</span>
            <select
              [ngModel]="store.activeOrigin()"
              (ngModelChange)="store.activeOrigin.set($event)"
              class="w-full bg-boreal-canvas border border-boreal-border rounded-sm text-[10px] px-2 py-1 text-boreal-text-primary focus:outline-none focus:border-boreal-blue"
            >
              <option value="Base Alpha">Base Alpha</option>
              <option value="Base Bravo">Base Bravo</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>

          <div class="text-[9px] font-black text-boreal-text-muted uppercase tracking-widest mt-1">Unit Type</div>
          @for (group of groups; track group) {
            <div class="text-[8px] text-boreal-text-muted font-mono uppercase tracking-widest mt-1.5 mb-0.5 opacity-60">{{ group }}</div>
            <div class="grid grid-cols-2 gap-1">
              @for (item of unitsByGroup(group); track item.type) {
                <button
                  (click)="selectUnitType(item.type)"
                  class="flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-sm border transition-all cursor-pointer"
                  [class.border-boreal-red]="store.activeUnitType() === item.type && store.activeSide() === 'RED'"
                  [class.bg-boreal-red/10]="store.activeUnitType() === item.type && store.activeSide() === 'RED'"
                  [class.border-boreal-blue]="store.activeUnitType() === item.type && store.activeSide() === 'BLUE'"
                  [class.bg-boreal-blue/10]="store.activeUnitType() === item.type && store.activeSide() === 'BLUE'"
                  [class.border-boreal-border]="store.activeUnitType() !== item.type"
                  [class.hover:bg-white/5]="store.activeUnitType() !== item.type"
                  [title]="item.label"
                >
                  <svg viewBox="-20 -20 40 40" class="w-7 h-7 pointer-events-none">
                    <path [attr.d]="unitSymbolPath(item.type)"
                          fill="none"
                          [attr.stroke]="store.activeSide() === 'RED' ? 'var(--boreal-red)' : 'var(--boreal-blue)'"
                          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    @if (item.type === 'ARTILLERY') {
                      <circle r="3"
                              [attr.fill]="store.activeSide() === 'RED' ? 'var(--boreal-red)' : 'var(--boreal-blue)'" />
                    }
                  </svg>
                  <span class="text-[7px] font-mono text-boreal-text-muted uppercase leading-none">{{ item.label }}</span>
                </button>
              }
            </div>
          }
        </div>

        <!-- Placed units list -->
        <div class="flex-grow overflow-y-auto border-t border-boreal-border mt-1 flex flex-col">
          <div class="flex items-center justify-between px-2 py-1.5 shrink-0">
            <span class="text-[9px] font-black text-boreal-text-muted uppercase tracking-widest">Units ({{ store.units().length }})</span>
            @if (store.units().length > 0) {
              <div class="flex gap-2 items-center">
                <button (click)="runIntentInference()"
                  class="text-[8px] bg-boreal-blue/20 text-boreal-blue border border-boreal-blue/50 rounded-sm px-1.5 py-0.5 font-bold uppercase tracking-wider hover:bg-boreal-blue/30 transition-colors">
                  Infer Intent
                </button>
                <button (click)="store.clearAll()"
                  class="text-[8px] text-boreal-red font-bold uppercase tracking-wider hover:opacity-80 transition-opacity">
                  Clear All
                </button>
              </div>
            }
          </div>
          <div class="flex-grow overflow-y-auto">
            @for (unit of store.units(); track unit.id) {
            <button
              (click)="store.selectUnit(unit.id)"
              class="w-full text-left px-2 py-1.5 border-b border-boreal-border/40 flex items-center gap-2 transition-colors"
              [class.bg-boreal-panel-elevated]="store.selectedUnitId() === unit.id"
              [class.border-l-2]="store.selectedUnitId() === unit.id"
              [class.border-l-boreal-blue]="store.selectedUnitId() === unit.id && unit.side === 'BLUE'"
              [class.border-l-boreal-red]="store.selectedUnitId() === unit.id && unit.side === 'RED'"
            >
              <svg viewBox="-16 -16 32 32" class="w-5 h-5 shrink-0 pointer-events-none">
                <path [attr.d]="unitSymbolPath(unit.type)"
                      fill="none"
                      [attr.stroke]="sideColor(unit.side)"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                @if (unit.type === 'ARTILLERY') {
                  <circle r="2.5" [attr.fill]="sideColor(unit.side)" />
                }
              </svg>
              <div class="flex flex-col min-w-0">
                <span class="text-[9px] font-mono font-bold truncate"
                      [style.color]="sideColor(unit.side)">{{ unit.id }}</span>
                <span class="text-[7px] text-boreal-text-muted uppercase leading-none">
                  {{ unit.waypoints.length }} WP · {{ unit.type.replace('SHIP_','') }}
                </span>
              </div>
            </button>
          } @empty {
            <p class="text-[8px] text-boreal-text-muted italic text-center px-3 py-4 leading-relaxed">
              Switch to PLACE mode and click the map to add units.
            </p>
          }
        </div>
      </div>

      <!-- ── CENTER MAP ─────────────────────────────────────────────────── -->
      <div class="flex-grow bg-boreal-canvas relative overflow-hidden flex flex-col">

        <!-- Dot grid -->
        <div class="absolute inset-0 opacity-5 pointer-events-none"
             [style.background-image]="'radial-gradient(var(--boreal-blue) 1px, transparent 1px)'"
             style="background-size: 80px 80px;"></div>

        <!-- Mode hint banner -->
        <div class="absolute top-3 left-1/2 -translate-x-1/2 z-40 px-4 py-1.5
                    bg-boreal-panel/90 backdrop-blur-md border border-boreal-border rounded
                    text-[9px] font-mono text-boreal-text-muted uppercase tracking-widest pointer-events-none">
          {{ modeHint() }}
        </div>

        <!-- Zoom controls -->
        <div class="absolute top-4 right-4 z-40 flex flex-col bg-boreal-panel/90 backdrop-blur-md border border-boreal-border rounded shadow-2xl overflow-hidden">
          <button (click)="zoomIn()"  class="p-2.5 hover:bg-white/5 text-boreal-text-secondary hover:text-boreal-text-primary transition-colors"><mat-icon class="!w-4 !h-4 !text-base">add</mat-icon></button>
          <div class="h-[1px] bg-boreal-border"></div>
          <button (click)="zoomOut()" class="p-2.5 hover:bg-white/5 text-boreal-text-secondary hover:text-boreal-text-primary transition-colors"><mat-icon class="!w-4 !h-4 !text-base">remove</mat-icon></button>
          <div class="h-[1px] bg-boreal-border"></div>
          <button (click)="resetView()" class="p-2.5 hover:bg-white/5 text-boreal-text-secondary hover:text-boreal-text-primary transition-colors"><mat-icon class="!w-4 !h-4 !text-base">restart_alt</mat-icon></button>
        </div>

        <!-- Status strip -->
        <div class="absolute bottom-3 left-4 z-40 flex items-center gap-3 pointer-events-none">
          <div class="flex items-center gap-2 bg-boreal-panel/90 backdrop-blur-md border border-boreal-border rounded px-3 py-1 text-[8px] font-mono text-boreal-text-muted uppercase">
            <span class="w-1.5 h-1.5 rounded-full bg-boreal-amber animate-pulse"></span>
            <span>DRAWING BOARD</span>
            <span class="border-l border-boreal-border pl-2">Zoom: {{ zoomLevel().toFixed(1) }}×</span>
            <span class="border-l border-boreal-border pl-2">Units: {{ store.units().length }}</span>
          </div>
        </div>

        <!-- SVG Map -->
        <div
          #mapContainer
          class="flex-grow relative overflow-hidden select-none"
          [class.cursor-crosshair]="store.mode() === 'PLACE' || store.mode() === 'WAYPOINT'"
          [class.cursor-move]="store.mode() === 'SELECT' && !_dragging"
          [class.cursor-grabbing]="_dragging"
          (wheel)="onWheel($event)"
          (mousedown)="onMapMouseDown($event)"
          (mousemove)="onMapMouseMove($event)"
          (click)="onMapClick($event)"
        >
          <svg #mapSvg
               class="w-full h-full"
               viewBox="0 0 1670 1300"
               preserveAspectRatio="xMidYMid meet"
               xmlns="http://www.w3.org/2000/svg">
            <defs>
              <marker id="arrowhead-red"  markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                <polygon points="0 0, 6 2, 0 4" fill="var(--boreal-red)"  opacity="0.7" />
              </marker>
              <marker id="arrowhead-blue" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                <polygon points="0 0, 6 2, 0 4" fill="var(--boreal-blue)" opacity="0.7" />
              </marker>
            </defs>

            <g #mapGroup [attr.transform]="mapTransform()">

              <!-- Grid -->
              <g class="opacity-10 pointer-events-none">
                @for (x of gridX; track x) {
                  <line [attr.x1]="x" y1="0" [attr.x2]="x" y2="1300" class="stroke-boreal-text-primary" stroke-width="0.5" />
                }
                @for (y of gridY; track y) {
                  <line x1="0" [attr.y1]="y" x2="1670" [attr.y2]="y" class="stroke-boreal-text-primary" stroke-width="0.5" />
                }
              </g>

              <!-- Terrain -->
              @for (f of mapFeatures; track f.name) {
                @if (f.recordType === 'terrain' && f.coordinates) {
                  <polygon
                    [attr.points]="formatCoords(f.coordinates)"
                    [class.fill-boreal-blue/5]="f.side === 'north'"
                    [class.fill-boreal-red/5]="f.side === 'south'"
                    [class.stroke-boreal-blue/10]="f.side === 'north'"
                    [class.stroke-boreal-red/10]="f.side === 'south'"
                    stroke-width="1.5" />
                }
              }

              <!-- Base symbols (spatial reference) -->
              @for (f of mapFeatures; track f.name) {
                @if (f.recordType === 'location' && f.subtype === 'air_base' && f.x !== undefined && f.y !== undefined) {
                  <g [attr.transform]="'translate(' + f.x + ',' + f.y + ')'">
                    <circle r="110" fill="none" class="stroke-boreal-blue/10" stroke-width="0.4" stroke-dasharray="2,7" />
                    <g transform="rotate(45)">
                      <rect x="-5" y="-5" width="10" height="10" class="fill-boreal-canvas stroke-boreal-blue/40" stroke-width="1" />
                    </g>
                  </g>
                }
              }

              <!-- Location labels -->
              @for (f of mapFeatures; track f.name) {
                @if (f.recordType === 'location' && f.x !== undefined && f.y !== undefined) {
                  <text [attr.x]="f.x + 10" [attr.y]="f.y - 10"
                        class="text-[8px] font-mono fill-boreal-text-muted pointer-events-none"
                        font-size="8" opacity="0.4">
                    {{ f.name }}
                  </text>
                }
              }

              <!-- ── DRAWING LAYER ──────────────────────────────────────── -->

              <!-- Intent Predictions -->
              @for (pred of store.intentPredictions(); track pred.unitId) {
                @for (traj of pred.trajectories; track $index) {
                  <polyline
                    [attr.points]="formatPointCoords(traj)"
                    fill="none"
                    stroke="var(--boreal-amber)"
                    stroke-width="2"
                    stroke-dasharray="4,4"
                    opacity="0.6" />
                }
              }

              <!-- Waypoint paths (always visible) -->
              @for (unit of store.units(); track unit.id) {
                @if (unit.waypoints.length > 0) {
                  <polyline
                    [attr.points]="pathPoints(unit)"
                    fill="none"
                    [attr.stroke]="sideColor(unit.side)"
                    stroke-width="1.2"
                    stroke-dasharray="6,4"
                    [attr.marker-end]="'url(#arrowhead-' + unit.side.toLowerCase() + ')'"
                    opacity="0.55" />
                  @for (wp of unit.waypoints; track $index) {
                    <circle [attr.cx]="wp.x" [attr.cy]="wp.y" r="4"
                            [attr.fill]="sideColor(unit.side)"
                            opacity="0.75"
                            class="pointer-events-none" />
                    <text [attr.x]="wp.x + 6" [attr.y]="wp.y - 5"
                          font-size="7" opacity="0.6"
                          [attr.fill]="sideColor(unit.side)"
                          class="font-mono pointer-events-none">WP{{ $index + 1 }}</text>
                  }
                }
              }

              <!-- Ghost cursor dot (WAYPOINT mode + unit selected) -->
              @if (store.mode() === 'WAYPOINT' && store.selectedUnitId() && _ghostVisible()) {
                <circle [attr.cx]="_ghostX()" [attr.cy]="_ghostY()" r="4"
                        [attr.fill]="sideColor(store.selectedUnit()?.side ?? 'RED')"
                        opacity="0.35"
                        stroke-dasharray="2,2"
                        [attr.stroke]="sideColor(store.selectedUnit()?.side ?? 'RED')"
                        stroke-width="1"
                        class="pointer-events-none" />
              }

              <!-- Static unit symbols (non-playback modes) -->
              @if (store.mode() !== 'PLAYBACK') {
                @for (unit of store.units(); track unit.id) {
                  <g [attr.transform]="'translate(' + unit.startX + ',' + unit.startY + ')'"
                     class="cursor-pointer"
                     (click)="onUnitClick($event, unit.id)">
                    <!-- Selection halo -->
                    @if (store.selectedUnitId() === unit.id) {
                      <circle r="16" fill="none"
                              [attr.stroke]="sideColor(unit.side)"
                              stroke-width="1" stroke-dasharray="3,2" opacity="0.7" />
                    }
                    <!-- Unit symbol -->
                    <path [attr.d]="unitSymbolPath(unit.type)"
                          fill="none"
                          [attr.stroke]="sideColor(unit.side)"
                          stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                    @if (unit.type === 'ARTILLERY') {
                      <circle r="2.5" [attr.fill]="sideColor(unit.side)" />
                    }
                    <!-- Label -->
                    <text x="12" y="-10" font-size="7"
                          [attr.fill]="sideColor(unit.side)"
                          class="font-mono pointer-events-none" opacity="0.8">
                      {{ unit.label }}
                    </text>
                  </g>
                }
              }

              <!-- Animated unit symbols (PLAYBACK mode) -->
              @if (store.mode() === 'PLAYBACK') {
                @for (pos of store.unitPositions(); track pos.unitId) {
                  @if (unitById(pos.unitId); as unit) {
                    <g [attr.transform]="'translate(' + pos.x + ',' + pos.y + ')'">
                      <!-- Velocity vector -->
                      <line x1="0" y1="0"
                            [attr.x2]="cos(pos.heading) * 18"
                            [attr.y2]="sin(pos.heading) * 18"
                            [attr.stroke]="sideColor(unit.side)"
                            stroke-width="0.8" opacity="0.5" />
                      <!-- Rotated symbol -->
                      <g [attr.transform]="'rotate(' + pos.heading + ')'">
                        <path [attr.d]="unitSymbolPath(unit.type)"
                              fill="none"
                              [attr.stroke]="sideColor(unit.side)"
                              stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
                        @if (unit.type === 'ARTILLERY') {
                          <circle r="2.5" [attr.fill]="sideColor(unit.side)" />
                        }
                      </g>
                      <!-- Pulsing position marker -->
                      <circle r="5" [attr.fill]="sideColor(unit.side)" opacity="0.2"
                              class="animate-ping pointer-events-none" />
                      <!-- Label -->
                      <text x="14" y="-10" font-size="7"
                            [attr.fill]="sideColor(unit.side)"
                            class="font-mono pointer-events-none" opacity="0.85">
                        {{ unit.label }}
                      </text>
                    </g>
                  }
                }
              }

            </g><!-- /mapGroup -->
          </svg>
        </div>

        <!-- ── PLAYBACK BAR ───────────────────────────────────────────── -->
        @if (store.mode() === 'PLAYBACK') {
          <div class="shrink-0 border-t border-boreal-border bg-boreal-panel/95 backdrop-blur-md px-4 py-3 flex items-center gap-4 z-30">

            <!-- Play / Pause -->
            <button (click)="store.togglePlay()"
              class="w-9 h-9 rounded-sm border border-boreal-border flex items-center justify-center text-boreal-text-secondary hover:text-boreal-text-primary hover:bg-white/5 transition-all">
              <mat-icon class="!text-lg !w-5 !h-5">{{ store.isPlaying() ? 'pause' : 'play_arrow' }}</mat-icon>
            </button>

            <!-- Reset -->
            <button (click)="store.resetPlayback()"
              class="w-9 h-9 rounded-sm border border-boreal-border flex items-center justify-center text-boreal-text-muted hover:text-boreal-text-primary hover:bg-white/5 transition-all">
              <mat-icon class="!text-base !w-4 !h-4">skip_previous</mat-icon>
            </button>

            <!-- Time display -->
            <span class="text-[11px] font-mono tabular-nums text-boreal-text-primary font-bold w-20 shrink-0">
              {{ formatTime(store.playbackTime()) }} / {{ formatTime(store.totalDuration()) }}
            </span>

            <!-- Scrubber -->
            <div class="flex-grow h-6 flex items-center relative cursor-pointer" (click)="onScrubClick($event)">
              <div class="absolute inset-y-0 left-0 right-0 flex items-center">
                <div class="w-full h-1 bg-boreal-panel-elevated rounded-full relative">
                  <div class="absolute left-0 top-0 h-full bg-boreal-blue rounded-full transition-all"
                       [style.width]="scrubPercent() + '%'"></div>
                  <!-- thumb -->
                  <div class="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-boreal-blue border-2 border-boreal-panel shadow-md transition-all"
                       [style.left]="'calc(' + scrubPercent() + '% - 6px)'"></div>
                </div>
              </div>
            </div>

            <!-- Speed selector -->
            <div class="flex items-center gap-1 shrink-0">
              <span class="text-[8px] font-mono text-boreal-text-muted uppercase tracking-widest mr-1">Speed</span>
              @for (s of speeds; track s) {
                <button (click)="store.playbackSpeed.set(s)"
                  class="px-1.5 py-0.5 rounded-[2px] text-[8px] font-bold border transition-all"
                  [class.bg-boreal-blue]="store.playbackSpeed() === s"
                  [class.text-white]="store.playbackSpeed() === s"
                  [class.border-boreal-blue]="store.playbackSpeed() === s"
                  [class.text-boreal-text-muted]="store.playbackSpeed() !== s"
                  [class.border-boreal-border]="store.playbackSpeed() !== s"
                >{{ s }}×</button>
              }
            </div>

          </div>
        }
      </div>

      <!-- ── RIGHT PANEL (selected unit) ───────────────────────────────── -->
      @if (store.selectedUnit(); as unit) {
        <div class="w-64 border-l border-boreal-border bg-boreal-panel flex flex-col z-20 shadow-2xl shrink-0 animate-in slide-in-from-right-4 duration-200">

          <div class="panel-header uppercase tracking-widest text-[10px] text-boreal-text-muted flex items-center justify-between">
            <span>Unit Details</span>
            <button (click)="store.selectUnit(null)" class="text-boreal-text-muted hover:text-boreal-text-primary">
              <mat-icon class="!text-sm !w-4 !h-4">close</mat-icon>
            </button>
          </div>

          <!-- Unit identity -->
          <div class="p-3 border-b border-boreal-border">
            <div class="flex items-center gap-3 mb-2">
              <svg viewBox="-18 -18 36 36" class="w-9 h-9 shrink-0">
                <path [attr.d]="unitSymbolPath(unit.type)"
                      fill="none"
                      [attr.stroke]="sideColor(unit.side)"
                      stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                @if (unit.type === 'ARTILLERY') {
                  <circle r="3" [attr.fill]="sideColor(unit.side)" />
                }
              </svg>
              <div>
                <div class="text-[11px] font-black" [style.color]="sideColor(unit.side)">{{ unit.id }}</div>
                <div class="text-[9px] text-boreal-text-muted uppercase font-mono">{{ unit.type.replace('SHIP_', '') }}</div>
              </div>
              <span class="ml-auto px-2 py-0.5 rounded-sm text-[8px] font-black border"
                    [class.text-boreal-red]="unit.side === 'RED'"
                    [class.border-boreal-red/40]="unit.side === 'RED'"
                    [class.bg-boreal-red/10]="unit.side === 'RED'"
                    [class.text-boreal-blue]="unit.side === 'BLUE'"
                    [class.border-boreal-blue/40]="unit.side === 'BLUE'"
                    [class.bg-boreal-blue/10]="unit.side === 'BLUE'"
              >{{ unit.side }}</span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-[8px]">
              <div class="flex flex-col">
                <span class="text-boreal-text-muted uppercase tracking-widest">Start</span>
                <span class="font-mono text-boreal-text-secondary">{{ unit.startX | number:'1.0-0' }}, {{ unit.startY | number:'1.0-0' }}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-boreal-text-muted uppercase tracking-widest">Speed</span>
                <span class="font-mono text-boreal-text-secondary">{{ unit.speed }} u/s</span>
              </div>
              <div class="flex flex-col">
                <span class="text-boreal-text-muted uppercase tracking-widest">Waypoints</span>
                <span class="font-mono text-boreal-text-secondary">{{ unit.waypoints.length }}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-boreal-text-muted uppercase tracking-widest">Duration</span>
                <span class="font-mono text-boreal-text-secondary">{{ formatTime(unitDuration(unit)) }}</span>
              </div>
            </div>
          </div>

          <!-- WAYPOINT mode hint -->
          @if (store.mode() === 'WAYPOINT') {
            <div class="mx-2 my-2 px-2 py-1.5 bg-boreal-amber/10 border border-boreal-amber/30 rounded-sm text-[8px] text-boreal-amber font-mono">
              Click map to add waypoints. Right-click to undo last.
            </div>
          }

          <!-- Waypoints list -->
          <div class="flex-grow overflow-y-auto p-2">
            <div class="text-[9px] font-black text-boreal-text-muted uppercase tracking-widest mb-1">Path</div>
            <div class="flex flex-col gap-1">
              <!-- Start node -->
              <div class="flex items-center gap-2 px-2 py-1.5 rounded bg-boreal-panel-elevated/50">
                <div class="w-4 h-4 rounded-full border-2 shrink-0"
                     [class.border-boreal-red]="unit.side === 'RED'"
                     [class.border-boreal-blue]="unit.side === 'BLUE'"></div>
                <div class="flex flex-col min-w-0">
                  <span class="text-[8px] font-bold text-boreal-text-primary uppercase tracking-wider">Start</span>
                  <span class="text-[7px] font-mono text-boreal-text-muted">{{ unit.startX | number:'1.0-0' }}, {{ unit.startY | number:'1.0-0' }}</span>
                </div>
              </div>

              @for (wp of unit.waypoints; track $index; let last = $last) {
                <div class="flex items-center gap-2">
                  <!-- connector line -->
                  <div class="flex flex-col items-center self-stretch shrink-0 w-4">
                    <div class="w-px flex-grow" [class.bg-boreal-red/30]="unit.side === 'RED'" [class.bg-boreal-blue/30]="unit.side === 'BLUE'"></div>
                    <div class="w-2 h-2 rounded-full shrink-0"
                         [class.bg-boreal-red]="unit.side === 'RED'"
                         [class.bg-boreal-blue]="unit.side === 'BLUE'"></div>
                    @if (!last) {
                      <div class="w-px flex-grow" [class.bg-boreal-red/30]="unit.side === 'RED'" [class.bg-boreal-blue/30]="unit.side === 'BLUE'"></div>
                    }
                  </div>
                  <div class="flex items-center flex-grow py-1 min-w-0">
                    <div class="flex flex-col min-w-0 flex-grow">
                      <span class="text-[8px] font-mono text-boreal-text-muted">WP{{ $index + 1 }}</span>
                      <span class="text-[7px] font-mono text-boreal-text-secondary">{{ wp.x | number:'1.0-0' }}, {{ wp.y | number:'1.0-0' }}</span>
                    </div>
                    @if (last) {
                      <button (click)="store.removeLastWaypoint(unit.id)"
                              class="w-5 h-5 flex items-center justify-center text-boreal-text-muted hover:text-boreal-red transition-colors shrink-0">
                        <mat-icon class="!text-xs !w-3 !h-3">close</mat-icon>
                      </button>
                    }
                  </div>
                </div>
              } @empty {
                <p class="text-[7px] text-boreal-text-muted italic py-1 pl-6">No waypoints — switch to WAYPOINT mode and click.</p>
              }
            </div>
          </div>

          <!-- Delete unit -->
          <div class="p-2 border-t border-boreal-border">
            <button (click)="deleteSelected()"
              class="w-full py-2 text-[9px] font-bold uppercase tracking-widest border border-boreal-red/40 text-boreal-red hover:bg-boreal-red/10 transition-colors rounded-sm">
              Delete Unit
            </button>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .panel-header { padding: 10px 12px; border-bottom: 1px solid var(--boreal-border); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawingBoard implements OnDestroy {
  store = inject(DrawingBoardStore);
  api = inject(SteelApiService);

  @ViewChild('mapSvg')   mapSvgRef!:   ElementRef<SVGSVGElement>;
  @ViewChild('mapGroup') mapGroupRef!: ElementRef<SVGGElement>;

  mapFeatures = ENGAGEMENT_MAP_FEATURES;

  readonly modes: { value: DrawingMode; label: string; icon: string }[] = [
    { value: 'SELECT',   label: 'Select',   icon: 'near_me'   },
    { value: 'PLACE',    label: 'Place',    icon: 'add_location' },
    { value: 'WAYPOINT', label: 'Waypoint', icon: 'route'     },
    { value: 'PLAYBACK', label: 'Playback', icon: 'play_circle' },
  ];

  readonly groups = GROUPS;
  readonly speeds = [0.5, 1, 2, 4];
  readonly gridX  = [0, 400, 800, 1200, 1600];
  readonly gridY  = [0, 400, 800, 1200];

  posX      = signal(0);
  posY      = signal(0);
  zoomLevel = signal(1);

  _ghostX       = signal(0);
  _ghostY       = signal(0);
  _ghostVisible = signal(false);
  _dragging     = false;

  private _mousedownX = 0;
  private _mousedownY = 0;
  private _hasMoved   = false;
  private _rafId: number | null = null;
  private _lastTs:  number | null = null;

  constructor() {
    effect(() => {
      if (this.store.isPlaying()) this._startLoop();
      else this._stopLoop();
    });
  }

  ngOnDestroy() { this._stopLoop(); }

  runIntentInference() {
    const sketch = {
      timestamp: new Date().toISOString(),
      agents: this.store.units().map(u => ({
        id: u.id,
        type: u.type,
        side: u.side,
        x: u.startX,
        y: u.startY,
        armament: u.armament,
        origin: u.origin
      }))
    };
    
    this.api.predictSketchIntent(sketch).subscribe({
      next: (res: any) => {
        // Assume backend returns an array of predictions or map of { unitId: trajectories }
        if (res?.predictions) {
          this.store.intentPredictions.set(res.predictions);
        }
      },
      error: (err) => console.error('Intent inference failed', err)
    });
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  mapTransform = computed(() =>
    `translate(${this.posX()}, ${this.posY()}) scale(${this.zoomLevel()})`
  );

  scrubPercent = computed(() => {
    const total = this.store.totalDuration();
    return total > 0 ? (this.store.playbackTime() / total) * 100 : 0;
  });

  modeHint = computed(() => {
    switch (this.store.mode()) {
      case 'SELECT':   return 'Click a unit to select · Drag to pan';
      case 'PLACE':    return `Placing ${this.store.activeUnitType()} (${this.store.activeSide()}) — click map`;
      case 'WAYPOINT': return this.store.selectedUnitId()
        ? `Adding waypoints to ${this.store.selectedUnitId()} — click map · Right-click to undo`
        : 'Select a unit first, then click map to add waypoints';
      case 'PLAYBACK': return 'Playback mode — press play to run scenario';
    }
  });

  // ── Map interaction ───────────────────────────────────────────────────────

  onMapMouseDown(event: MouseEvent) {
    this._mousedownX = event.clientX;
    this._mousedownY = event.clientY;
    this._hasMoved   = false;
    this._dragging   = false;
  }

  onMapMouseMove(event: MouseEvent) {
    // Update ghost cursor
    if (this.store.mode() === 'WAYPOINT' && this.store.selectedUnitId()) {
      const pos = this._svgCoords(event);
      this._ghostX.set(pos.x);
      this._ghostY.set(pos.y);
      this._ghostVisible.set(true);
    } else {
      this._ghostVisible.set(false);
    }

    if (!event.buttons) return;
    const dx = Math.abs(event.clientX - this._mousedownX);
    const dy = Math.abs(event.clientY - this._mousedownY);
    if (!this._hasMoved && dx + dy > 4) this._hasMoved = true;
    if (this._hasMoved) {
      this._dragging = true;
      this.posX.update(v => v + event.movementX);
      this.posY.update(v => v + event.movementY);
    }
  }

  @HostListener('window:mouseup')
  onMouseUp() { this._dragging = false; }

  @HostListener('window:mouseleave')
  onMouseLeave() { this._ghostVisible.set(false); }

  onMapClick(event: MouseEvent) {
    if (this._hasMoved) return;
    const mode = this.store.mode();
    if (mode === 'PLACE') {
      const pos = this._svgCoords(event);
      const id  = this.store.addUnit(pos.x, pos.y);
      this.store.selectUnit(id);
    } else if (mode === 'WAYPOINT') {
      const id = this.store.selectedUnitId();
      if (id) {
        const pos = this._svgCoords(event);
        this.store.addWaypoint(id, pos.x, pos.y);
      }
    } else if (mode === 'SELECT') {
      this.store.selectUnit(null);
    }
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(event: MouseEvent) {
    if (this.store.mode() !== 'WAYPOINT') return;
    event.preventDefault();
    const id = this.store.selectedUnitId();
    if (id) this.store.removeLastWaypoint(id);
  }

  onUnitClick(event: MouseEvent, unitId: string) {
    event.stopPropagation();
    this.store.selectUnit(unitId);
    if (this.store.mode() === 'PLACE') this.store.setMode('SELECT');
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    this.zoomLevel.update(v => Math.min(Math.max(v + delta, 0.3), 10));
  }

  onScrubClick(event: MouseEvent) {
    const bar   = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const ratio = (event.clientX - bar.left) / bar.width;
    this.store.playbackTime.set(Math.max(0, ratio * this.store.totalDuration()));
  }

  // ── Controls ──────────────────────────────────────────────────────────────

  zoomIn()    { this.zoomLevel.update(v => Math.min(v + 0.5, 10));  }
  zoomOut()   { this.zoomLevel.update(v => Math.max(v - 0.5, 0.3)); }
  resetView() { this.zoomLevel.set(1); this.posX.set(0); this.posY.set(0); }

  setMode(m: DrawingMode) { this.store.setMode(m); }

  selectUnitType(type: DrawingUnitType) {
    this.store.activeUnitType.set(type);
    if (this.store.mode() !== 'PLACE') this.store.setMode('PLACE');
  }

  deleteSelected() {
    const id = this.store.selectedUnitId();
    if (id) this.store.deleteUnit(id);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  unitsByGroup(group: string) {
    return UNIT_CATALOGUE.filter(u => u.group === group);
  }

  unitById(id: string): DrawingUnit | undefined {
    return this.store.units().find(u => u.id === id);
  }

  sideColor(side: DrawingSide): string {
    return side === 'RED' ? 'var(--boreal-red)' : 'var(--boreal-blue)';
  }

  pathPoints(unit: DrawingUnit): string {
    const pts = [{ x: unit.startX, y: unit.startY }, ...unit.waypoints];
    return pts.map(p => `${p.x},${p.y}`).join(' ');
  }

  formatCoords(coords: [number, number][]): string {
    return coords.map(c => `${c[0]},${c[1]}`).join(' ');
  }

  formatPointCoords(pts: {x: number, y: number}[]): string {
    return pts.map(p => `${p.x},${p.y}`).join(' ');
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  unitDuration(unit: DrawingUnit): number {
    if (!unit.waypoints.length) return 0;
    let d = 0, px = unit.startX, py = unit.startY;
    for (const w of unit.waypoints) { d += Math.hypot(w.x - px, w.y - py); px = w.x; py = w.y; }
    return d / unit.speed;
  }

  cos(deg: number): number { return Math.cos(deg * Math.PI / 180); }
  sin(deg: number): number { return Math.sin(deg * Math.PI / 180); }

  unitSymbolPath(type: DrawingUnitType): string {
    switch (type) {
      case 'INFANTRY':
        return 'M-7,-5 L7,-5 L7,5 L-7,5 Z M-4,-3 L4,3 M4,-3 L-4,3';
      case 'ARMOR':
        return 'M-7,-5 L7,-5 L7,5 L-7,5 Z M-4,0 A5,4 0 0,1 4,0';
      case 'ARTILLERY':
        return 'M-7,-5 L7,-5 L7,5 L-7,5 Z'; // dot added via <circle>
      case 'SPECIAL_FORCES':
        return 'M-7,-5 L7,-5 L7,5 L-7,5 Z M0,-3 L0,3 M-3,0 L3,0';
      case 'SHIP_DESTROYER':
        return 'M-13,-4 L-9,-7 L9,-7 L13,-4 L13,4 L9,7 L-9,7 L-13,4 Z M-6,0 L6,0';
      case 'SHIP_CARRIER':
        return 'M-16,-5 L-12,-8 L12,-8 L16,-5 L16,5 L12,8 L-12,8 L-16,5 Z M-8,0 L8,0 M0,-8 L0,-4';
      case 'SHIP_SUBMARINE':
        return 'M-14,0 L-8,-5 L8,-5 L14,0 L8,5 L-8,5 Z M-3,-5 L-3,-8';
      case 'SHIP_PATROL':
        return 'M-9,-3 L-5,-6 L5,-6 L9,-3 L9,3 L5,6 L-5,6 L-9,3 Z';
      case 'AIRCRAFT':
        return 'M0,-12 L2,-4 L12,2 L8,4 L2,0 L1,9 L-1,9 L-2,0 L-8,4 L-12,2 L-2,-4 Z';
      case 'DRONE':
        return 'M-6,-4 L6,0 L-6,4 M-3,-2 L4,0 L-3,2';
      case 'HELICOPTER':
        return 'M-11,0 L11,0 M-2,-6 L2,-6 L2,7 L-2,7 Z M4,-6 L7,-3';
      default:
        return 'M-5,-5 L5,-5 L5,5 L-5,5 Z';
    }
  }

  // ── SVG coordinate conversion ─────────────────────────────────────────────

  private _svgCoords(event: MouseEvent): { x: number; y: number } {
    if (!this.mapSvgRef || !this.mapGroupRef) return { x: 0, y: 0 };
    const svg = this.mapSvgRef.nativeElement;
    const g   = this.mapGroupRef.nativeElement;
    const pt  = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const ctm = g.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }

  // ── RAF animation loop ────────────────────────────────────────────────────

  private _startLoop() {
    this._lastTs = null;
    const tick = (ts: number) => {
      if (this._lastTs !== null) this.store.advanceTime((ts - this._lastTs) / 1000);
      this._lastTs = ts;
      if (this.store.isPlaying()) this._rafId = requestAnimationFrame(tick);
      else this._rafId = null;
    };
    this._rafId = requestAnimationFrame(tick);
  }

  private _stopLoop() {
    if (this._rafId !== null) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    this._lastTs = null;
  }
}
