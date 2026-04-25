import {
  Component, ChangeDetectionStrategy, inject, signal, computed,
  effect, OnDestroy, ElementRef, ViewChild, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SteelApiService } from '../core/services/steel-api.service';
import {
  DrawingBoardStore, DrawingUnit, DrawingUnitType, DrawingMode, DrawingSide, IntentPrediction,
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
    <div class="h-full w-full relative bg-boreal-canvas overflow-hidden">
      
      <!-- ── BACKGROUND FULL-SCREEN MAP ─────────────────────────────────── -->
      <div
          #mapContainer
          class="absolute inset-0 z-0 select-none"
          [class.cursor-crosshair]="store.mode() === 'PLACE' || store.mode() === 'WAYPOINT'"
          [class.cursor-move]="store.mode() === 'SELECT' && !_dragging"
          [class.cursor-grabbing]="_dragging"
          (wheel)="onWheel($event)"
          (mousedown)="onMapMouseDown($event)"
          (mousemove)="onMapMouseMove($event)"
          (click)="onMapClick($event)"
          tabindex="0"
          (keydown.enter)="onMapClick($any($event))"
          (keydown.space)="onMapClick($any($event))"
        >
          <!-- Dot grid -->
          <div class="absolute inset-0 opacity-5 pointer-events-none"
               [style.background-image]="'radial-gradient(var(--boreal-blue) 1px, transparent 1px)'"
               style="background-size: 80px 80px;"></div>

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

              @for (unit of store.units(); track unit.id) {
                @if (unit.waypoints.length > 0) {
                  <polyline [attr.points]="pathPoints(unit)" fill="none" [attr.stroke]="sideColor(unit.side)" stroke-width="1.2" stroke-dasharray="6,4" [attr.marker-end]="'url(#arrowhead-' + unit.side.toLowerCase() + ')'" opacity="0.55" />
                }
              }

              @if (store.mode() !== 'PLAYBACK') {
                @for (unit of store.units(); track unit.id) {
                  <g [attr.transform]="'translate(' + unit.startX + ',' + unit.startY + ')'" class="cursor-pointer" (click)="onUnitClick($event, unit.id)">
                    @if (store.selectedUnitId() === unit.id) { <circle r="16" fill="none" [attr.stroke]="sideColor(unit.side)" stroke-width="1" stroke-dasharray="3,2" opacity="0.7" /> }
                    <path [attr.d]="unitSymbolPath(unit.type)" fill="none" [attr.stroke]="sideColor(unit.side)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                    <text x="12" y="-10" font-size="7" [attr.fill]="sideColor(unit.side)" class="font-mono pointer-events-none" opacity="0.8">{{ unit.label }}</text>
                  </g>
                }
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

      <!-- Mode switcher (Glass) -->
      <div class="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex bg-[#080c12]/80 backdrop-blur-md border border-white/10 rounded-sm p-1 shadow-2xl">
         @for (m of modes; track m.value) {
            <button
              (click)="setMode(m.value)"
              class="flex items-center gap-2 px-4 py-2 rounded-sm text-[10px] font-bold uppercase tracking-[0.15em] transition-all"
              [class.bg-sky-500]="store.mode() === m.value"
              [class.text-white]="store.mode() === m.value"
              [class.text-slate-400]="store.mode() !== m.value"
            >
              <mat-icon class="!text-sm !w-4 !h-4">{{ m.icon }}</mat-icon>
              {{ m.label }}
            </button>
          }
      </div>

      <!-- Left Panel: Catalogue (Slide-out Overlay) -->
      <div class="absolute top-24 left-6 bottom-24 w-60 z-20 bg-[#080c12]/90 backdrop-blur-xl border border-white/10 rounded-sm flex flex-col shadow-2xl animate-in slide-in-from-left duration-500 overflow-hidden">
        <div class="panel-header uppercase tracking-[0.25em] text-[9px] font-black text-slate-500 border-b border-white/10 px-4 py-3">Force Unit Catalogue</div>
        
        <!-- Unit type palette -->
        <div class="flex-grow overflow-y-auto custom-scrollbar p-4 flex flex-col gap-6">
          
          <!-- Side Selection -->
          <div class="grid grid-cols-2 gap-px bg-white/10 rounded-sm overflow-hidden border border-white/10 p-0.5">
            <button (click)="store.activeSide.set('RED')" class="py-2 text-[9px] font-black uppercase tracking-widest transition-all" [class.bg-rose-500]="store.activeSide() === 'RED'" [class.text-white]="store.activeSide() === 'RED'" [class.text-slate-500]="store.activeSide() !== 'RED'">RED</button>
            <button (click)="store.activeSide.set('BLUE')" class="py-2 text-[9px] font-black uppercase tracking-widest transition-all" [class.bg-sky-500]="store.activeSide() === 'BLUE'" [class.text-white]="store.activeSide() === 'BLUE'" [class.text-slate-500]="store.activeSide() !== 'BLUE'">BLUE</button>
          </div>

          @for (group of groups; track group) {
            <div>
              <div class="text-[8px] text-slate-500 font-black uppercase tracking-[0.3em] mb-3 opacity-60">{{ group }}_ASSETS</div>
              <div class="grid grid-cols-2 gap-2">
                @for (item of unitsByGroup(group); track item.type) {
                  <button (click)="selectUnitType(item.type)" class="flex flex-col items-center gap-2 p-3 rounded-sm border border-white/5 bg-white/2 hover:bg-white/5 transition-all" [class.border-sky-500]="store.activeUnitType() === item.type && store.activeSide() === 'BLUE'" [class.border-rose-500]="store.activeUnitType() === item.type && store.activeSide() === 'RED'">
                    <svg viewBox="-20 -20 40 40" class="w-8 h-8 opacity-80">
                      <path [attr.d]="unitSymbolPath(item.type)" fill="none" [attr.stroke]="store.activeSide() === 'RED' ? '#f43f5e' : '#0ea5e9'" stroke-width="2" />
                    </svg>
                    <span class="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{{ item.label }}</span>
                  </button>
                }
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Right Panel: Selection (Slide-out Overlay) -->
      @if (store.selectedUnit(); as unit) {
        <div class="absolute top-24 right-6 bottom-24 w-72 z-30 bg-[#080c12]/95 backdrop-blur-2xl border border-white/10 rounded-sm flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
           <div class="px-6 py-6 border-b border-white/10">
              <div class="flex justify-between items-start mb-4">
                 <div class="text-[8px] font-black uppercase tracking-[0.4em] text-sky-400/60">Unit_Profile</div>
                 <button (click)="store.selectUnit(null)" class="text-slate-500 hover:text-white transition-colors"><mat-icon class="!text-sm">close</mat-icon></button>
              </div>
              <h2 class="text-2xl font-light text-white uppercase tracking-tighter">{{ unit.id }}</h2>
              <div class="text-[10px] text-slate-400 uppercase font-mono mt-1">{{ unit.type }} // {{ unit.side }}</div>
           </div>

           <div class="flex-grow p-6 overflow-y-auto custom-scrollbar space-y-6">
              <div class="grid grid-cols-2 gap-4">
                 <div class="bg-white/2 border border-white/5 p-3 rounded-sm">
                    <div class="text-[7px] font-black uppercase tracking-widest text-slate-500 mb-1">Velocity</div>
                    <div class="text-xs font-mono text-sky-200">{{ unit.speed }} U/S</div>
                 </div>
                 <div class="bg-white/2 border border-white/5 p-3 rounded-sm">
                    <div class="text-[7px] font-black uppercase tracking-widest text-slate-500 mb-1">Waypoints</div>
                    <div class="text-xs font-mono text-sky-200">{{ unit.waypoints.length }}</div>
                 </div>
              </div>

              <div>
                 <div class="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-3 border-b border-white/10 pb-2">Operational_Path</div>
                 <div class="space-y-2">
                    <div class="flex items-center gap-3 text-[10px] font-mono text-slate-300">
                       <span class="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                       <span>START // {{ unit.startX | number:'1.0-0' }},{{ unit.startY | number:'1.0-0' }}</span>
                    </div>
                    @for (wp of unit.waypoints; track $index) {
                      <div class="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                         <span class="w-1.5 h-1.5 rounded-full border border-white/30"></span>
                         <span>WP{{$index+1}} // {{ wp.x | number:'1.0-0' }},{{ wp.y | number:'1.0-0' }}</span>
                      </div>
                    }
                 </div>
              </div>
           </div>

           <div class="p-6 border-t border-white/10 bg-black/20 shrink-0">
              <button (click)="deleteSelected()" class="w-full py-3 border border-rose-500/30 text-rose-500 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-rose-500/10 transition-all">
                 Terminate_Asset
              </button>
           </div>
        </div>
      }

      <!-- Scenario Vault Sidebar -->
      @if (vaultVisible()) {
        <div class="absolute top-24 right-6 bottom-24 w-80 z-40 bg-[#080c12]/95 backdrop-blur-3xl border border-white/10 rounded-sm flex flex-col shadow-2xl animate-in slide-in-from-right duration-500">
           <div class="px-6 py-6 border-b border-white/10 flex justify-between items-center">
              <div class="text-[10px] font-black uppercase tracking-[0.4em] text-sky-400">Scenario_Vault</div>
              <button (click)="vaultVisible.set(false)" class="text-slate-500 hover:text-white transition-colors"><mat-icon class="!text-sm">close</mat-icon></button>
           </div>
           
           <div class="p-6 border-b border-white/10 bg-white/2">
              <button (click)="saveScenario()" class="w-full py-3 bg-sky-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-sm hover:brightness-110 transition-all">
                 Save_Current_State
              </button>
           </div>

           <div class="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-4">
              @for (s of store.scenarios(); track s.id) {
                <div class="group p-4 border border-white/5 bg-white/2 hover:border-sky-500/50 transition-all rounded-sm">
                   <div class="flex justify-between items-start mb-2">
                      <div class="text-xs font-bold text-white uppercase tracking-tight">{{ s.name }}</div>
                      <div class="text-[8px] font-mono text-slate-500">{{ s.updatedAt | date:'short' }}</div>
                   </div>
                   <div class="flex gap-2">
                      <button (click)="store.loadScenario(s.id)" class="px-3 py-1.5 bg-white/5 hover:bg-sky-500/20 text-sky-400 text-[8px] font-black uppercase tracking-widest transition-all rounded-xs">Load</button>
                      <button (click)="store.deleteScenario(s.id)" class="px-3 py-1.5 bg-white/5 hover:bg-rose-500/20 text-rose-400 text-[8px] font-black uppercase tracking-widest transition-all rounded-xs">Delete</button>
                   </div>
                </div>
              } @empty {
                <div class="h-full flex flex-col items-center justify-center opacity-20 py-20">
                   <mat-icon class="!w-12 !h-12 !text-5xl mb-4 text-slate-500">folder_open</mat-icon>
                   <div class="text-[10px] font-black uppercase tracking-widest text-slate-500">Vault_Empty</div>
                </div>
              }
           </div>
        </div>
      }

      <!-- Bottom Toolbar (Glass) -->
      <div class="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-6 bg-[#080c12]/80 backdrop-blur-md border border-white/10 rounded-sm px-6 py-3 shadow-2xl pointer-events-auto">
        <div class="flex items-center gap-3 border-r border-white/10 pr-6 mr-2">
           <div class="flex flex-col gap-1">
              <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Active_Assets</span>
              <span class="text-sm font-black text-white leading-none">{{ store.units().length }}</span>
           </div>
           <div class="flex gap-2 ml-4">
              <button (click)="runIntentInference()" class="px-4 py-2 bg-sky-500/20 border border-sky-500/30 text-sky-400 text-[10px] font-black uppercase tracking-widest rounded-sm hover:bg-sky-500/40 transition-all">
                Infer_Intent
              </button>
              <button (click)="store.runAdvancedSimulation()" class="px-4 py-2 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-sm hover:brightness-110 transition-all shadow-[0_0_15px_rgba(244,63,94,0.4)]">
                Run_Advanced_Sim
              </button>
           </div>
        </div>

        <!-- Simulation Mode Toggle -->
        <div class="flex items-center gap-1 border-r border-white/10 pr-6 mr-2">
           <div class="text-[8px] font-black text-slate-500 uppercase tracking-widest mr-2">Mode:</div>
           <button (click)="store.simulationMode.set('SIMPLE')" class="px-3 py-1 text-[9px] font-bold uppercase tracking-widest transition-all rounded-sm" [class.bg-sky-500/20]="store.simulationMode() === 'SIMPLE'" [class.text-sky-400]="store.simulationMode() === 'SIMPLE'" [class.text-slate-500]="store.simulationMode() !== 'SIMPLE'">Simple</button>
           <button (click)="store.simulationMode.set('ADVANCED')" class="px-3 py-1 text-[9px] font-bold uppercase tracking-widest transition-all rounded-sm" [class.bg-rose-500/20]="store.simulationMode() === 'ADVANCED'" [class.text-rose-400]="store.simulationMode() === 'ADVANCED'" [class.text-slate-500]="store.simulationMode() !== 'ADVANCED'">Advanced</button>
        </div>

        <div class="flex items-center gap-2">
           <button (click)="zoomOut()" class="p-2 text-slate-400 hover:text-white transition-colors"><mat-icon class="!w-5 !h-5">remove</mat-icon></button>
           <button (click)="resetView()" class="p-2 text-slate-400 hover:text-white transition-colors uppercase text-[9px] font-black tracking-widest">Reset_View</button>
           <button (click)="zoomIn()" class="p-2 text-slate-400 hover:text-white transition-colors"><mat-icon class="!w-5 !h-5">add</mat-icon></button>
           <div class="w-px h-4 bg-white/10 mx-2"></div>
           <button (click)="vaultVisible.set(!vaultVisible())" class="px-4 py-2 text-sky-400 hover:bg-sky-500/10 transition-all uppercase text-[9px] font-black tracking-widest rounded-sm border border-sky-500/20">
             Vault
           </button>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; width: 100%; }
    .custom-scrollbar::-webkit-scrollbar { width: 3px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
    .animate-in { animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
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
  readonly gridX  = [0, 400, 800, 1200, 1600];
  readonly gridY  = [0, 400, 800, 1200];

  posX      = signal(0);
  posY      = signal(0);
  zoomLevel = signal(1);
  vaultVisible = signal(false);

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
  onMouseLeave() { this._ghostVisible.set(false); }

  onMapClick(event: MouseEvent) {
    if (this._hasMoved) return;
    // Accessibility: ignore keyboard events if they don't have coordinates
    if (!(event instanceof MouseEvent) || event.clientX === undefined) return;
    
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

  unitsByGroup(group: string) {
    return UNIT_CATALOGUE.filter(u => u.group === group);
  }

  sideColor(side: DrawingSide): string {
    return side === 'RED' ? '#f43f5e' : '#0ea5e9';
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

  unitSymbolPath(type: DrawingUnitType): string {
    switch (type) {
      case 'INFANTRY': return 'M-7,-5 L7,-5 L7,5 L-7,5 Z M-4,-3 L4,3 M4,-3 L-4,3';
      case 'ARMOR': return 'M-7,-5 L7,-5 L7,5 L-7,5 Z M-4,0 A5,4 0 0,1 4,0';
      case 'ARTILLERY': return 'M-7,-5 L7,-5 L7,5 L-7,5 Z';
      case 'SPECIAL_FORCES': return 'M-7,-5 L7,-5 L7,5 L-7,5 Z M0,-3 L0,3 M-3,0 L3,0';
      case 'SHIP_DESTROYER': return 'M-13,-4 L-9,-7 L9,-7 L13,-4 L13,4 L9,7 L-9,7 L-13,4 Z M-6,0 L6,0';
      case 'SHIP_CARRIER': return 'M-16,-5 L-12,-8 L12,-8 L16,-5 L16,5 L12,8 L-12,8 L-16,5 Z M-8,0 L8,0 M0,-8 L0,-4';
      case 'SHIP_SUBMARINE': return 'M-14,0 L-8,-5 L8,-5 L14,0 L8,5 L-8,5 Z M-3,-5 L-3,-8';
      case 'SHIP_PATROL': return 'M-9,-3 L-5,-6 L5,-6 L9,-3 L9,3 L5,6 L-5,6 L-9,3 Z';
      case 'AIRCRAFT': return 'M0,-12 L2,-4 L12,2 L8,4 L2,0 L1,9 L-1,9 L-2,0 L-8,4 L-12,2 L-2,-4 Z';
      case 'DRONE': return 'M-6,-4 L6,0 L-6,4 M-3,-2 L4,0 L-3,2';
      case 'HELICOPTER': return 'M-11,0 L11,0 M-2,-6 L2,-6 L2,7 L-2,7 Z M4,-6 L7,-3';
      default: return 'M-5,-5 L5,-5 L5,5 L-5,5 Z';
    }
  }

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
