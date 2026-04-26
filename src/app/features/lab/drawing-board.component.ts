import {
  Component, ChangeDetectionStrategy, inject, signal, computed,
  effect, OnDestroy, ElementRef, ViewChild, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SteelApiService } from '../../core/services/steel-api.service';
import {
  DrawingBoardStore, DrawingUnit, DrawingUnitType, DrawingMode, DrawingSide, IntentPrediction
} from '../../core/state/drawing-board.store';
import { MapLayerStore } from '../../core/state/map-layer.store';
import { ENGAGEMENT_MAP_FEATURES } from '../../shared/domain/engagement-map.data';

// ─── Unit catalogue ─────────────────────────────────────────────────────────

const GROUPS = ['Ground', 'Naval', 'Air'];

@Component({
  selector: 'app-drawing-board',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="relative w-full h-full bg-[#050b12] overflow-hidden select-none">
      
      <!-- ── MAP CANVAS ────────────────────────────────────────────────── -->
      <div 
        class="absolute inset-0 z-0 cursor-crosshair transition-transform duration-75 ease-out"
        (mousedown)="onMapMouseDown($event)"
        (mousemove)="onMapMouseMove($event)"
        (mouseup)="onMapClick($event)"
        (wheel)="onMapWheel($event)"
      >
          <svg #mapSvg viewBox="0 0 1670 1200" class="w-full h-full">
            <defs>
              <marker id="arrowhead-red" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#f43f5e" />
              </marker>
              <marker id="arrowhead-blue" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#0ea5e9" />
              </marker>
            </defs>

            <g #mapGroup [attr.transform]="mapTransform()">
              <!-- Grid -->
              <g class="grid-lines" opacity="0.05">
                @for (x of gridX; track x) {
                  <line [attr.x1]="x" y1="0" [attr.x2]="x" y2="1200" class="stroke-boreal-text-primary" stroke-width="0.5" />
                }
                @for (y of gridY; track y) {
                  <line x1="0" [attr.y1]="y" x2="1670" [attr.y2]="y" class="stroke-boreal-text-primary" stroke-width="0.5" />
                }
              </g>

              <!-- Terrain -->
              @if (layers.isLayerVisible('terrain')) {
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
              }

              <!-- Bases -->
              @if (layers.isLayerVisible('bases')) {
                @for (f of mapFeatures; track f.name) {
                  @if (f.recordType === 'location' && f.subtype === 'air_base') {
                    <g [attr.transform]="'translate(' + f.x + ',' + f.y + ')'">
                      <rect x="-4" y="-4" width="8" height="8" fill="none" [attr.stroke]="f.side === 'north' ? '#0ea5e9' : '#f43f5e'" stroke-width="1" />
                      <text y="12" font-size="6" text-anchor="middle" fill="#9ab0c8" class="font-mono uppercase tracking-tighter">{{f.name}}</text>
                    </g>
                  }
                }
              }

              <!-- ── DRAWING LAYER ──────────────────────────────────────── -->
              @for (pred of store.intentPredictions(); track pred.unitId) {
                @for (traj of pred.trajectories; track $index) {
                  <polyline [attr.points]="formatPointCoords(traj)" fill="none" stroke="var(--boreal-amber)" stroke-width="2" stroke-dasharray="4,4" opacity="0.6" />
                }
              }

              <!-- Simple Blue Reactions -->
              @for (react of store.simpleBlueReactions(); track react.id) {
                <line [attr.x1]="react.startX" [attr.y1]="react.startY" [attr.x2]="react.endX" [attr.y2]="react.endY" stroke="#0ea5e9" stroke-width="1" opacity="0.8" marker-end="url(#arrowhead-blue)" />
              }

              <!-- Ghost Trails (Advanced Simulation) -->
              @if (store.simulationMode() === 'ADVANCED' && store.advancedSimulationBundle(); as bundle) {
                @if (bundle.trajectories) {
                  @for (entry of bundle.trajectories | keyvalue; track entry.key) {
                    <polyline [attr.points]="formatPointCoords(entry.value)" fill="none" stroke="#0ea5e9" stroke-width="1" stroke-dasharray="2,4" opacity="0.3" />
                  }
                }

                <!-- Conflict Nodes -->
                @for (node of bundle.conflictNodes; track $index) {
                  <g [attr.transform]="'translate(' + node.x + ',' + node.y + ')'" class="animate-pulse">
                    <circle r="6" fill="#f43f5e" opacity="0.5" />
                    <circle r="2" fill="#fff" />
                  </g>
                }
              }

              @if (store.lastConflictEvent(); as node) {
                <g [attr.transform]="'translate(' + node.x + ',' + node.y + ')'" class="animate-bounce">
                   <circle r="12" fill="none" stroke="#f43f5e" stroke-width="2" class="animate-ping" />
                   <circle r="4" fill="#f43f5e" />
                </g>
              }

              @for (unit of filteredUnits(); track unit.id) {
                @if (unit.waypoints.length > 0) {
                  <polyline [attr.points]="pathPoints(unit)" fill="none" [attr.stroke]="sideColor(unit.side)" stroke-width="1.2" stroke-dasharray="6,4" [attr.marker-end]="'url(#arrowhead-' + unit.side.toLowerCase() + ')'" opacity="0.55" />
                }
              }

              @if (store.mode() !== 'PLAYBACK') {
                @for (unit of filteredUnits(); track unit.id) {
                  <g [attr.transform]="'translate(' + unit.startX + ',' + unit.startY + ')'" class="cursor-pointer" (click)="onUnitClick($event, unit.id)">
                    @if (store.selectedUnitId() === unit.id) { <circle r="16" fill="none" [attr.stroke]="sideColor(unit.side)" stroke-width="1" stroke-dasharray="3,2" opacity="0.7" /> }
                    <path [attr.d]="unitSymbolPath(unit.type)" fill="none" [attr.stroke]="sideColor(unit.side)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                    <text x="12" y="-10" font-size="7" [attr.fill]="sideColor(unit.side)" class="font-mono pointer-events-none" opacity="0.8">{{ unit.label }}</text>
                  </g>
                }
              }

              @if (store.mode() === 'PLAYBACK') {
                @for (pos of store.unitPositions(); track pos.unitId) {
                  @let unit = getUnit(pos.unitId);
                  @if (unit && (elevationFilter() === null || Math.abs((unit.elevation || 0) - elevationFilter()!) < 5000)) {
                    <g [attr.transform]="'translate(' + pos.x + ',' + pos.y + ') rotate(' + pos.heading + ')'">
                      <path [attr.d]="unitSymbolPath(unit.type)" fill="none" [attr.stroke]="sideColor(unit.side)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                      <text x="12" y="-10" font-size="7" [attr.fill]="sideColor(unit.side)" class="font-mono pointer-events-none" opacity="0.8">{{ unit.label }}</text>
                    </g>
                  }
                }
              }

              <!-- Ghost waypoint -->
              @if (_ghostVisible()) {
                <circle [attr.cx]="_ghostX()" [attr.cy]="_ghostY()" r="4" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="2,2" opacity="0.5" />
              }
            </g>
          </svg>
      </div>

      <!-- ── OVERLAY CONTROLS ─────────────────────────────────────────── -->
      
      <!-- Top HUD Header -->
      <div class="absolute top-4 left-6 z-10 flex flex-col gap-1 pointer-events-none">
        <div class="text-[9px] font-black uppercase tracking-[0.4em] text-sky-400/70">Tactical_Canvas</div>
        <h1 class="text-2xl font-light tracking-tighter text-white uppercase">Drawing Board</h1>
      </div>

      <!-- Map Controls Overlay (Filter Box) -->
      <div class="absolute top-24 left-72 ml-4 z-40 flex flex-col gap-2">
          <!-- Layers / Legend Toggle -->
          <div class="flex flex-col bg-[#080c12]/90 backdrop-blur-md border border-white/10 rounded-sm shadow-2xl overflow-hidden min-w-[12rem]">
              <div class="px-3 py-1.5 bg-white/5 border-b border-white/10 flex items-center justify-between">
                  <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Map Layers & Filters</span>
                  <mat-icon class="!w-3 !h-3 !text-[10px] text-sky-400">layers</mat-icon>
              </div>
              
              <!-- Elevation Filter -->
              <div class="px-2 py-2 bg-white/2 border-b border-white/10 flex flex-col gap-1.5">
                  <span class="text-[7px] font-black text-slate-500 uppercase tracking-widest">Elevation Filter</span>
                  <div class="flex items-center gap-1">
                      <button (click)="elevationFilter.set(null)" class="px-1.5 py-0.5 rounded-[1px] text-[7px] font-bold border transition-all uppercase tracking-tighter" [class.bg-sky-500]="elevationFilter() === null" [class.text-white]="elevationFilter() === null" [class.border-sky-500]="elevationFilter() === null" [class.text-slate-400]="elevationFilter() !== null" [class.border-white/10]="elevationFilter() !== null">ALL</button>
                      <button (click)="elevationFilter.set(0)" class="px-1.5 py-0.5 rounded-[1px] text-[7px] font-bold border transition-all uppercase tracking-tighter" [class.bg-sky-500]="elevationFilter() === 0" [class.text-white]="elevationFilter() === 0" [class.border-sky-500]="elevationFilter() === 0" [class.text-slate-400]="elevationFilter() !== null && elevationFilter() !== 0" [class.border-white/10]="elevationFilter() !== 0">SURFACE</button>
                      <button (click)="elevationFilter.set(5000)" class="px-1.5 py-0.5 rounded-[1px] text-[7px] font-bold border transition-all uppercase tracking-tighter" [class.bg-sky-500]="elevationFilter() === 5000" [class.text-white]="elevationFilter() === 5000" [class.border-sky-500]="elevationFilter() === 5000" [class.text-slate-400]="elevationFilter() !== 5000" [class.border-white/10]="elevationFilter() !== 5000">LOW ALT</button>
                      <button (click)="elevationFilter.set(15000)" class="px-1.5 py-0.5 rounded-[1px] text-[7px] font-bold border transition-all uppercase tracking-tighter" [class.bg-sky-500]="elevationFilter() === 15000" [class.text-white]="elevationFilter() === 15000" [class.border-sky-500]="elevationFilter() === 15000" [class.text-slate-400]="elevationFilter() !== 15000" [class.border-white/10]="elevationFilter() !== 15000">HIGH ALT</button>
                  </div>
              </div>

              <!-- General Layers -->
              <div class="flex flex-col p-1 gap-0.5">
                  @for (layer of layers.allLayers(); track layer.id) {
                      <button
                          (click)="layers.toggleLayer(layer.id)"
                          class="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-white/5 transition-colors group"
                          [class.opacity-40]="!layer.visible"
                      >
                          <mat-icon class="!w-3.5 !h-3.5 !text-[12px]" [class.text-sky-400]="layer.visible">{{ layer.visible ? 'check_box' : 'check_box_outline_blank' }}</mat-icon>
                          <span class="text-[9px] font-bold uppercase tracking-tight text-left flex-grow" [class.text-white]="layer.visible" [class.text-slate-400]="!layer.visible">{{ layer.label }}</span>
                          <mat-icon class="!w-3 !h-3 !text-[10px] opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">{{ layer.icon }}</mat-icon>
                      </button>
                  }
              </div>
          </div>
      </div>

      <!-- Mode Selector -->
      <div class="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex bg-[#080c12]/80 backdrop-blur-md border border-white/10 rounded-sm p-1 shadow-2xl">
         @for (m of modes; track m.value) {
            <button
              (click)="setMode(m.value)"
              class="flex items-center gap-2 px-4 py-2 rounded-sm transition-all"
              [class.bg-sky-500]="store.mode() === m.value"
              [class.text-white]="store.mode() === m.value"
              [class.text-slate-400]="store.mode() !== m.value"
              [class.hover:bg-white/5]="store.mode() !== m.value"
            >
              <mat-icon class="!text-base">{{ m.icon }}</mat-icon>
              <span class="text-[10px] font-bold uppercase tracking-widest">{{ m.label }}</span>
            </button>
         }
      </div>

      <!-- Left Sidebar: Catalogue -->
      <div class="absolute top-24 left-6 bottom-24 w-64 z-20 flex flex-col bg-[#080c12]/80 backdrop-blur-md border border-white/10 rounded-sm shadow-2xl overflow-hidden">
        <div class="p-4 border-b border-white/10 bg-white/5">
          <div class="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Asset_Catalogue</div>
          <div class="flex items-center justify-between">
            <h2 class="text-xs font-bold text-white uppercase tracking-tight">Units & Assets</h2>
            <div class="flex gap-1">
              <button (click)="store.activeSide.set('BLUE')" class="w-6 h-6 rounded-full border border-sky-500/30 flex items-center justify-center transition-all" [class.bg-sky-500]="store.activeSide() === 'BLUE'"><div class="w-2 h-2 rounded-full bg-sky-400"></div></button>
              <button (click)="store.activeSide.set('RED')" class="w-6 h-6 rounded-full border border-rose-500/30 flex items-center justify-center transition-all" [class.bg-rose-500]="store.activeSide() === 'RED'"><div class="w-2 h-2 rounded-full bg-rose-400"></div></button>
            </div>
          </div>
        </div>

        <div class="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-4">
          @for (g of groups; track g) {
            <div>
              <div class="px-2 mb-2 text-[8px] font-black text-slate-600 uppercase tracking-widest">{{ g }}</div>
              <div class="grid grid-cols-2 gap-1">
                @for (u of store.unitsByCategory(g); track u.type) {
                  <button
                    (click)="selectUnitType(u.type)"
                    class="flex flex-col items-center gap-2 p-3 rounded-sm border border-white/5 bg-white/2 hover:bg-white/5 hover:border-white/10 transition-all group"
                    [class.bg-sky-500/10]="store.activeUnitType() === u.type"
                    [class.border-sky-500/30]="store.activeUnitType() === u.type"
                  >
                    <svg viewBox="-20 -20 40 40" class="w-8 h-8 opacity-60 group-hover:opacity-100 transition-opacity">
                      <path [attr.d]="unitSymbolPath(u.type)" fill="none" [attr.stroke]="sideColor(store.activeSide())" stroke-width="1.5" />
                    </svg>
                    <span class="text-[9px] font-bold text-slate-400 uppercase group-hover:text-white transition-colors">{{ u.label }}</span>
                  </button>
                }
              </div>
            </div>
          }
        </div>

        <div class="p-4 border-t border-white/10 bg-white/5 space-y-3">
          <button (click)="vaultVisible.set(true)" class="w-full py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[9px] font-black uppercase tracking-[0.2em] transition-all rounded-sm">Open Scenario Vault</button>
          <button (click)="store.clearAll()" class="w-full py-2 text-rose-400 hover:text-rose-300 text-[9px] font-black uppercase tracking-[0.2em] transition-all">Reset Board</button>
        </div>
      </div>

      <!-- Right Sidebar: Inspection -->
      <div class="absolute top-24 right-6 bottom-24 w-72 z-20 flex flex-col bg-[#080c12]/80 backdrop-blur-md border border-white/10 rounded-sm shadow-2xl overflow-hidden">
        @if (store.selectedUnit(); as unit) {
          <div class="p-4 border-b border-white/10 bg-white/5">
            <div class="flex items-center justify-between mb-1">
               <div class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Asset_Inspector</div>
               <button (click)="deleteSelected()" class="text-rose-500 hover:text-rose-400"><mat-icon class="!text-xs">delete</mat-icon></button>
            </div>
            <h2 class="text-lg font-light text-white uppercase tracking-tighter">{{ unit.label }}</h2>
          </div>

          <div class="flex-grow p-4 space-y-6 overflow-y-auto custom-scrollbar">
             <div>
               <div class="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3">Specifications</div>
               <div class="space-y-2">
                 <div class="flex justify-between items-center py-2 border-b border-white/5">
                    <span class="text-[10px] text-slate-400 uppercase font-bold">Class</span>
                    <span class="text-[10px] text-white font-mono uppercase">{{ unit.type }}</span>
                 </div>
                 <div class="flex justify-between items-center py-2 border-b border-white/5">
                    <span class="text-[10px] text-slate-400 uppercase font-bold">Base Speed</span>
                    <span class="text-[10px] text-white font-mono">{{ unit.speed }} u/s</span>
                 </div>
                 <div class="flex justify-between items-center py-2 border-b border-white/5">
                    <span class="text-[10px] text-slate-400 uppercase font-bold">Altitude</span>
                    <span class="text-[10px] text-white font-mono">{{ (unit.elevation || 0).toLocaleString() }}m</span>
                 </div>
               </div>
             </div>

             <div>
               <div class="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3">Mission Details</div>
               <div class="space-y-4">
                 <div class="space-y-1.5">
                   <label for="unit-label" class="text-[8px] text-slate-500 uppercase font-black">Callsign / Label</label>
                   <input id="unit-label" type="text" [(ngModel)]="unit.label" class="w-full bg-white/5 border border-white/10 rounded-sm px-2 py-1.5 text-[10px] text-white focus:border-sky-500/50 outline-none" />
                 </div>
                 <div class="space-y-1.5">
                   <label for="unit-armament" class="text-[8px] text-slate-500 uppercase font-black">Primary Armament</label>
                   <select id="unit-armament" [(ngModel)]="unit.armament" class="w-full bg-white/5 border border-white/10 rounded-sm px-2 py-1.5 text-[10px] text-white focus:border-sky-500/50 outline-none">
                     <option value="Standard">Standard</option>
                     <option value="Kinetic Strike">Kinetic Strike</option>
                     <option value="EW Suite">EW Suite</option>
                     <option value="ISR Package">ISR Package</option>
                   </select>
                 </div>
               </div>
             </div>

             <div>
               <div class="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Waypoints ({{ unit.waypoints.length }})</div>
               <div class="space-y-1">
                 @for (w of unit.waypoints; track $index) {
                   <div class="flex items-center justify-between px-2 py-1.5 bg-white/2 border border-white/5 rounded-sm">
                      <span class="text-[9px] font-mono text-slate-500">W{{$index + 1}}: {{w.x.toFixed(0)}}, {{w.y.toFixed(0)}}</span>
                   </div>
                 }
                 @if (unit.waypoints.length > 0) {
                    <button (click)="store.removeLastWaypoint(unit.id)" class="w-full py-1 text-[8px] font-black text-rose-500/70 hover:text-rose-400 uppercase tracking-widest mt-2 transition-colors">Pop Last Waypoint</button>
                 }
               </div>
             </div>
          </div>

          <div class="p-4 border-t border-white/10 bg-white/5">
             <button (click)="runIntentInference()" class="w-full py-2.5 bg-sky-500 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:brightness-110 active:scale-95 transition-all rounded-sm">Commit Intent</button>
          </div>
        } @else {
          <div class="flex-grow flex flex-col items-center justify-center p-8 text-center">
            <mat-icon class="!text-4xl text-slate-800 mb-4 !w-10 !h-10">ads_click</mat-icon>
            <div class="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-relaxed">Select an asset on the map to inspect specifications.</div>
          </div>
        }
      </div>

      <!-- Bottom Bar -->
      <div class="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex bg-[#080c12]/80 backdrop-blur-md border border-white/10 rounded-sm p-1 px-4 shadow-2xl h-12 items-center min-w-[32rem]">
        
        <!-- Simulation Mode Toggle -->
        <div class="flex items-center gap-1 border-r border-white/10 pr-6 mr-2">
           <div class="text-[8px] font-black text-slate-500 uppercase tracking-widest mr-2">Mode:</div>
           <button (click)="store.simulationMode.set('SIMPLE')" class="px-3 py-1 text-[9px] font-bold uppercase tracking-widest transition-all rounded-sm" [class.bg-sky-500/20]="store.simulationMode() === 'SIMPLE'" [class.text-sky-400]="store.simulationMode() === 'SIMPLE'" [class.text-slate-500]="store.simulationMode() !== 'SIMPLE'">Simple</button>
           <button (click)="store.simulationMode.set('ADVANCED')" class="px-3 py-1 text-[9px] font-bold uppercase tracking-widest transition-all rounded-sm" [class.bg-rose-500/20]="store.simulationMode() === 'ADVANCED'" [class.text-rose-400]="store.simulationMode() === 'ADVANCED'" [class.text-slate-500]="store.simulationMode() !== 'ADVANCED'">Advanced</button>
        </div>

        @if (store.mode() === 'PLAYBACK') {
          <div class="flex items-center gap-3 border-r border-white/10 pr-6 mr-2">
            <button (click)="store.togglePlay()"
              class="flex items-center justify-center w-8 h-8 rounded-full transition-all"
              [class.bg-sky-500]="!store.isPlaying()"
              [class.hover:bg-sky-400]="!store.isPlaying()"
              [class.bg-rose-500]="store.isPlaying()"
              [class.hover:bg-rose-400]="store.isPlaying()">
              <mat-icon class="text-white !text-sm flex items-center justify-center">{{ store.isPlaying() ? 'pause' : 'play_arrow' }}</mat-icon>
            </button>
            <div class="flex flex-col gap-0.5">
              <span class="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none">Timeline</span>
              <span class="text-[10px] font-mono text-white leading-none">T+{{ (store.playbackTime() || 0).toFixed(1) }}s</span>
            </div>
            <button (click)="store.resetPlayback()" class="ml-2 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors border border-white/10 rounded-sm">
              Reset
            </button>
          </div>
        }

        <div class="flex items-center gap-2">
           <button (click)="zoomOut()" class="p-2 text-slate-400 hover:text-white transition-colors"><mat-icon class="!w-5 !h-5">remove</mat-icon></button>
           <button (click)="resetView()" class="px-3 py-1 text-[8px] font-black text-slate-500 uppercase tracking-widest hover:text-white border border-white/5 hover:border-white/20 transition-all rounded-sm whitespace-nowrap">Reset_View</button>
           <button (click)="zoomIn()" class="p-2 text-slate-400 hover:text-white transition-colors"><mat-icon class="!w-5 !h-5">add</mat-icon></button>
           <div class="w-px h-4 bg-white/10 mx-2"></div>
           <div class="text-[10px] font-mono text-slate-500 tracking-tighter">{{ (zoomLevel() * 100).toFixed(0) }}%</div>
        </div>

        <div class="flex-grow"></div>

        <button (click)="saveScenario()" class="flex items-center gap-2 px-6 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-sm transition-all group">
          <mat-icon class="!text-sm text-sky-400">cloud_upload</mat-icon>
          <span class="text-[9px] font-black uppercase tracking-[0.2em]">Save to Vault</span>
        </button>
      </div>

      <!-- Vault Dialog -->
      @if (vaultVisible()) {
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-[#080c12]/80 backdrop-blur-md animate-in fade-in duration-200">
           <div class="w-full max-w-xl bg-[#0b1219] border border-white/10 rounded-sm shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[80vh]">
              <div class="px-6 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <h3 class="text-xs font-black text-white uppercase tracking-widest">Scenario Vault</h3>
                <button (click)="vaultVisible.set(false)" class="text-slate-500 hover:text-white"><mat-icon>close</mat-icon></button>
              </div>
              <div class="flex-grow overflow-y-auto p-4 space-y-2 custom-scrollbar">
                @for (s of store.scenarios(); track s.id) {
                  <div class="flex items-center justify-between p-4 bg-white/2 border border-white/5 hover:bg-white/5 transition-all group">
                    <div>
                      <div class="text-[11px] font-bold text-white uppercase tracking-tight">{{ s.name }}</div>
                      <div class="text-[8px] font-mono text-slate-500">{{ s.updatedAt | date:'short' }}</div>
                    </div>
                    <div class="flex gap-2">
                      <button (click)="store.loadScenario(s.id)" class="px-3 py-1.5 bg-white/5 hover:bg-sky-500 text-[8px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all rounded-sm">Load</button>
                      <button (click)="store.deleteScenario(s.id)" class="px-3 py-1.5 bg-white/5 hover:bg-rose-500 text-[8px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all rounded-sm">Delete</button>
                    </div>
                  </div>
                } @empty {
                  <div class="py-12 text-center text-[10px] font-bold text-slate-700 uppercase tracking-widest">Vault Empty</div>
                }
              </div>
           </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .cursor-crosshair { cursor: crosshair; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
    :host { display: block; height: 100vh; width: 100vw; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawingBoard implements OnDestroy {
  store = inject(DrawingBoardStore);
  api = inject(SteelApiService);
  layers = inject(MapLayerStore);

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
  readonly gridX  = [0, 400, 800, 1200, 1600];
  readonly gridY  = [0, 400, 800, 1200];

  posX      = signal(0);
  posY      = signal(0);
  zoomLevel = signal(1);
  vaultVisible = signal(false);
  elevationFilter = signal<number | null>(null);
  readonly Math = Math;

  filteredUnits = computed(() => {
    const el = this.elevationFilter();
    const all = this.store.units();
    if (el === null) return all;
    return all.filter(u => u.elevation === undefined || Math.abs((u.elevation || 0) - el) < 5000); 
  });

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
      if (this.store.mode() === 'PLAYBACK' && this.store.isPlaying()) this._startLoop();
      else this._stopLoop();
    });
  }

  ngOnDestroy() { this._stopLoop(); }

  saveScenario() {
    const name = prompt('Enter scenario name:');
    if (name) {
      this.store.saveCurrentToVault(name);
    }
  }

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
      next: (res: { predictions: IntentPrediction[] }) => {
        if (res?.predictions) {
          this.store.intentPredictions.set(res.predictions);
        }
      },
      error: (err) => console.error('Intent inference failed', err)
    });
  }

  mapTransform = computed(() =>
    `translate(${this.posX()}, ${this.posY()}) scale(${this.zoomLevel()})`
  );

  onMapMouseDown(event: MouseEvent) {
    this._mousedownX = event.clientX;
    this._mousedownY = event.clientY;
    this._hasMoved   = false;
    this._dragging   = false;
  }

  onMapMouseMove(event: MouseEvent) {
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
  onMouseLeave() { this._dragging = false; }

  onMapClick(event: MouseEvent) {
    if (this._hasMoved) return;
    const pos = this._svgCoords(event);
    const mode = this.store.mode();

    if (mode === 'PLACE') {
      const id = this.store.addUnit(pos.x, pos.y);
      this.store.selectUnit(id);
    } else if (mode === 'WAYPOINT') {
      const id = this.store.selectedUnitId();
      if (id) this.store.addWaypoint(id, pos.x, pos.y);
    } else if (mode === 'SELECT') {
      // SVG click on background deselects
      if (event.target === this.mapSvgRef.nativeElement) {
        this.store.selectUnit(null);
      }
    }
  }

  onMapWheel(event: WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    this.zoomLevel.update(v => Math.min(5, Math.max(0.2, v * delta)));
  }

  onUnitClick(event: MouseEvent, id: string) {
    event.stopPropagation();
    this.store.selectUnit(id);
    if (this.store.mode() === 'SELECT') {
      // possibly do nothing else
    }
  }

  setMode(m: DrawingMode) { this.store.setMode(m); }

  selectUnitType(type: DrawingUnitType) {
    this.store.activeUnitType.set(type);
    if (this.store.mode() !== 'PLACE') this.store.setMode('PLACE');
  }

  getUnit(id: string) {
    return this.store.units().find(u => u.id === id);
  }

  deleteSelected() {
    const id = this.store.selectedUnitId();
    if (id) this.store.deleteUnit(id);
  }

  zoomIn()  { this.zoomLevel.update(v => Math.min(5, v * 1.2)); }
  zoomOut() { this.zoomLevel.update(v => Math.max(0.2, v / 1.2)); }
  resetView() { this.posX.set(0); this.posY.set(0); this.zoomLevel.set(1); }

  sideColor(side: DrawingSide) { return side === 'RED' ? '#f43f5e' : '#0ea5e9'; }

  unitSymbolPath(type: DrawingUnitType): string {
    switch (type) {
      case 'INFANTRY': return 'M-5,-5 L5,5 M5,-5 L-5,5 M-7,0 L7,0';
      case 'ARMOR':    return 'M-8,-5 L8,-5 L8,5 L-8,5 Z M-8,0 L8,0';
      case 'ARTILLERY': return 'M0,-8 L0,8 M-5,0 L5,0 C5,-5 -5,-5 0,-8';
      case 'AIRCRAFT': return 'M0,-10 L-8,5 L0,2 L8,5 Z';
      case 'DRONE':    return 'M-6,-6 L6,6 M6,-6 L-6,6 M0,-8 L0,8';
      case 'HELICOPTER': return 'M-8,0 L8,0 M0,-4 L0,4 M-4,-6 L4,-6';
      case 'SPECIAL_FORCES': return 'M-6,-6 L6,6 M0,-9 L0,9';
      default: return 'M-6,-6 L6,6 M6,-6 L-6,6';
    }
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

  private _svgCoords(event: MouseEvent) {
    const svg = this.mapSvgRef.nativeElement;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const transformed = pt.matrixTransform(this.mapGroupRef.nativeElement.getScreenCTM()!.inverse());
    return { x: transformed.x, y: transformed.y };
  }

  private _startLoop() {
    this._stopLoop();
    let lastTs = 0;
    const tick = (ts: number) => {
      if (!lastTs) lastTs = ts;
      const delta = (ts - lastTs) / 1000;
      lastTs = ts;
      this.store.advanceTime(delta);
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
