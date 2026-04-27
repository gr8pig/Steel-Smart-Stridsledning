import {
  AfterViewInit,
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TacticalStore } from '../../core/state/tactical.store';
import { ReadinessStore } from '../../core/state/readiness.store';
import { AuditLogger } from '../../core/services/audit-logger';
import { BaseTwin, MapFeature, ThreatTwin } from '../../shared/domain/models';
import { ENGAGEMENT_MAP_FEATURES } from '../../shared/domain/engagement-map.data';
import { ShellLayoutService } from '../../core/services/shell-layout.service';

interface Toast { message: string; icon: string; type: 'alert' | 'intercept' | 'sync' | 'warning'; }

interface SceneCapture {
  fileName: string;
  capturedAt: string;
  dataUrl: string;
  sizeLabel: string;
}

interface FieldBaseMarker {
  key: string;
  fullName: string;
  readinessId?: string;
  x: number;
  y: number;
  side: 'north' | 'south';
}

interface MapPoint {
  x: number;
  y: number;
}

interface PointerState {
  clientX: number;
  clientY: number;
}

interface ViewportMetrics {
  rect: DOMRect;
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

type FieldSelection =
  | { type: 'base'; key: string }
  | { type: 'track'; id: string };

interface FieldIntentEntry {
  label: string;
  value: number;
  isPrimary: boolean;
}

interface BaseInspectorModel {
  type: 'base';
  key: string;
  title: string;
  side: 'north' | 'south';
  subtypeLabel: string;
  note: string;
  role: string | null;
  readiness: number | null;
  runwayStatus: BaseTwin['runwayStatus'] | null;
  sortieCapacity: number | null;
  airframesAvailable: number | null;
  threatExposure: number | null;
  reserve: boolean;
  inventoryLabel: string | null;
}

interface TrackInspectorModel {
  type: 'track';
  id: string;
  title: string;
  classLabel: string;
  statusLabel: string;
  intent: ThreatTwin['intent'];
  confidence: number;
  targetLabel: string;
  etaSeconds: number;
  velocity: number;
  heading: number;
  platformLabel: string | null;
  originLabel: string | null;
  armamentLabel: string | null;
  sensorQuality: number | null;
  classificationConfidence: number | null;
  jammingProbability: number | null;
  uncertaintySource: string | null;
  intentDistribution: FieldIntentEntry[];
}

type FieldInspectorModel = BaseInspectorModel | TrackInspectorModel;

// Base dots scaled from tactical viewBox 1670×1300 → field viewBox 400×300
const FIELD_BASES: FieldBaseMarker[] = [
  { key: 'NVB', fullName: 'Northern Vanguard Base', readinessId: 'BASE-1', x: 47,  y: 77,  side: 'north' },
  { key: 'HRC', fullName: 'Highridge Command', readinessId: 'BASE-2', x: 201, y: 17,  side: 'north' },
  { key: 'BWP', fullName: 'Boreal Watch Post', readinessId: 'BASE-3', x: 277, y: 89,  side: 'north' },
  { key: 'SPB', fullName: 'Spear Point Base', readinessId: 'BASE-4', x: 220, y: 193, side: 'south' },
  { key: 'SRD', fullName: 'Southern Redoubt', readinessId: 'BASE-5', x: 77,  y: 231, side: 'south' },
];

const COMMANDER_LOCATION = {
  label: 'FIELD CMD',
  sector: 'Sector 4',
  grid: 'G-12',
  x: 235,
  y: 176,
};

const FIELD_VIEWBOX_WIDTH = 400;
const FIELD_VIEWBOX_HEIGHT = 300;
const TRACK_VIEWBOX_WIDTH = 1670;
const TRACK_VIEWBOX_HEIGHT = 1300;
const RESET_SENT_MS = 4000;
const SYNCING_MS = 1200;
const SYNC_RESET_MS = 5000;
const MIN_MAP_ZOOM = 1;
const MAX_MAP_ZOOM = 4;
const MAP_ZOOM_STEP = 1.18;

@Component({
  selector: 'app-field-console',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="boreal-map-surface relative h-full w-full bg-boreal-canvas overflow-hidden flex flex-col">

      <!-- ── BACKGROUND FULL-SCREEN MAP ─────────────────────────────────── -->
      <div
        #mapViewport
        class="field-map-viewport absolute inset-0 z-0 select-none"
        [class.cursor-grab]="!isMapDragging()"
        [class.cursor-grabbing]="isMapDragging()"
        (wheel)="onMapWheel($event)"
        (pointerdown)="onMapPointerDown($event)"
        (pointermove)="onMapPointerMove($event)"
        (pointerup)="onMapPointerUp($event)"
        (pointercancel)="onMapPointerUp($event)"
      >
        <svg [attr.viewBox]="mapViewBox()" class="h-full w-full" [attr.preserveAspectRatio]="'xMidYMid slice'" role="img" aria-label="Field operations situational map">
          <defs>
            <pattern id="field-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.5" fill="var(--boreal-blue)" opacity="0.1"/>
            </pattern>
          </defs>

          <!-- Background fill -->
          <rect width="400" height="300" fill="#020408" />
          <rect width="400" height="300" fill="url(#field-grid)" />

          <!-- Coastline -->
          <path d="M0,0 L0,300 L28,285 L18,255 L32,210 L22,160 L38,115 L22,65 L32,20 L0,0 Z" fill="var(--boreal-blue)" fill-opacity="0.04" stroke="var(--boreal-blue)" stroke-opacity="0.15" stroke-width="0.5" />

          <!-- IFZ circle -->
          <circle cx="200" cy="160" r="55" fill="none" stroke="var(--boreal-amber)" stroke-opacity="0.2" stroke-width="0.5" stroke-dasharray="3,2" />
          <circle cx="200" cy="160" r="55" fill="var(--boreal-amber)" fill-opacity="0.02" />

          <!-- Commander location -->
          <g [attr.transform]="'translate(' + commanderLocation.x + ',' + commanderLocation.y + ')'">
            <circle r="8" fill="var(--boreal-amber)" fill-opacity="0.1" stroke="var(--boreal-amber)" stroke-width="0.8" />
            <circle r="2" fill="var(--boreal-amber)" />
            <text y="-10" text-anchor="middle" font-family="monospace" font-size="5.5" font-weight="bold" fill="var(--boreal-amber)" opacity="0.7">{{ commanderLocation.label }}</text>
          </g>

          <!-- Base dots -->
          @for (base of bases; track base.key) {
            <g
              [attr.transform]="'translate(' + base.x + ',' + base.y + ')'"
              class="cursor-pointer"
              (click)="selectBase(base, $event)"
            >
              @if (isBaseSelected(base)) {
                <circle r="6" fill="none" [attr.stroke]="base.side === 'north' ? '#38bdf8' : '#fb7185'" stroke-opacity="0.55" stroke-width="0.7" />
              }
              <circle r="3" fill="transparent" [attr.stroke]="base.side === 'north' ? '#0ea5e9' : '#f43f5e'" [attr.stroke-width]="isBaseSelected(base) ? 1.4 : 1" />
              <circle r="1.15" [attr.fill]="base.side === 'north' ? '#0ea5e9' : '#f43f5e'" />
              <text y="8" text-anchor="middle" font-family="monospace" font-size="4.5" font-weight="bold" [attr.fill]="base.side === 'north' ? '#0ea5e9' : '#f43f5e'" [attr.opacity]="isBaseSelected(base) ? 0.85 : 0.5">{{ base.key }}</text>
            </g>
          }

          <!-- Active threat triangles -->
          @for (track of tactical.activeThreats(); track track.id) {
            @if (projectTrack(track); as projectedTrack) {
              <g
                [attr.transform]="'translate(' + projectedTrack.x + ',' + projectedTrack.y + ') rotate(' + projectedTrack.heading + ')'"
                class="cursor-pointer"
                (click)="selectTrack(track, $event)"
              >
                @if (isTrackSelected(track)) {
                  <circle r="7" fill="none" stroke="#fbbf24" stroke-opacity="0.55" stroke-width="0.7" />
                }
                <polygon points="0,-4 3,3 -3,3" fill="#f43f5e" fill-opacity="0.8" stroke="#f43f5e" stroke-width="0.5" />
                <line x1="0" y1="-4" x2="0" y2="-10" stroke="#f43f5e" stroke-opacity="0.4" stroke-width="0.5" stroke-dasharray="2,1" />
              </g>
            }
          }
        </svg>
      </div>

      <!-- ── OVERLAY HUD ────────────────────────────────────────────────── -->
      
      <!-- Top Left: Title & Status -->
      <div class="absolute left-4 right-4 top-3 z-20 flex flex-col gap-1.5 pointer-events-none sm:left-6 sm:right-auto sm:top-4 sm:gap-1">
        <div class="flex items-center gap-2">
           <span class="text-[9px] font-black uppercase tracking-[0.4em] text-sky-400/70">Field_Operations</span>
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
        <h1 class="text-lg font-light tracking-tighter text-white uppercase sm:text-xl">
          <span class="sm:hidden">Terminal // NVB</span>
          <span class="hidden sm:inline">Terminal // Northern Vanguard</span>
        </h1>
        <div class="mt-1 flex flex-wrap gap-2">
           <span class="px-2 py-0.5 border border-rose-500/30 bg-rose-500/5 text-[8px] font-black text-rose-400 uppercase tracking-widest">
             <span class="sm:hidden">{{ tactical.activeThreats().length }} Tracks</span>
             <span class="hidden sm:inline">{{ tactical.activeThreats().length }} Active_Tracks</span>
           </span>
           <span class="px-2 py-0.5 border border-sky-500/30 bg-sky-500/5 text-[8px] font-black text-sky-400 uppercase tracking-widest">
             <span class="sm:hidden">{{ avgReadiness() }}% Ready</span>
             <span class="hidden sm:inline">{{ avgReadiness() }}% Readiness</span>
           </span>
         </div>
       </div>

      <!-- Confirmation toast -->
      @if (_toast()) {
        <div class="absolute left-4 right-4 top-3 z-50 flex items-center justify-center gap-2 rounded-sm border px-3 py-2 text-center shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 sm:left-1/2 sm:right-auto sm:top-4 sm:-translate-x-1/2 sm:px-4"
          [class.bg-rose-500/20]="_toast()!.type === 'alert'"
          [class.border-rose-500/50]="_toast()!.type === 'alert'"
          [class.text-rose-400]="_toast()!.type === 'alert'"
          [class.bg-sky-500/20]="_toast()!.type === 'intercept'"
          [class.border-sky-500/50]="_toast()!.type === 'intercept'"
          [class.text-sky-400]="_toast()!.type === 'intercept'"
          [class.bg-emerald-500/20]="_toast()!.type === 'sync'"
          [class.border-emerald-500/50]="_toast()!.type === 'sync'"
          [class.text-emerald-400]="_toast()!.type === 'sync'"
          [class.bg-amber-500/20]="_toast()!.type === 'warning'"
          [class.border-amber-500/50]="_toast()!.type === 'warning'"
          [class.text-amber-400]="_toast()!.type === 'warning'"
        >
          <mat-icon class="!text-sm !w-4 !h-4">{{ _toast()!.icon }}</mat-icon>
          <span class="text-[9px] font-black uppercase tracking-widest">{{ _toast()!.message }}</span>
        </div>
      }

      <!-- Map controls -->
      <div class="absolute bottom-24 right-4 z-20 flex items-end gap-3 sm:bottom-6 sm:left-6 sm:right-auto">
        <div class="flex flex-col overflow-hidden rounded-sm border border-white/10 bg-[#080c12]/80 backdrop-blur-xl shadow-2xl">
          <button
            type="button"
            (click)="zoomIn()"
            [disabled]="!canZoomIn()"
            class="p-2.5 text-slate-300 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            title="Zoom in"
          >
            <mat-icon class="!text-base !w-4 !h-4">add</mat-icon>
          </button>
          <div class="h-px bg-white/10"></div>
          <button
            type="button"
            (click)="zoomOut()"
            [disabled]="!canZoomOut()"
            class="p-2.5 text-slate-300 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            title="Zoom out"
          >
            <mat-icon class="!text-base !w-4 !h-4">remove</mat-icon>
          </button>
          <div class="h-px bg-white/10"></div>
          <button
            type="button"
            (click)="resetView()"
            class="p-2.5 text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            title="Reset map view"
          >
            <mat-icon class="!text-base !w-4 !h-4">restart_alt</mat-icon>
          </button>
        </div>

        <div class="hidden max-w-52 rounded-sm border border-white/10 bg-[#080c12]/75 px-3 py-2 shadow-2xl backdrop-blur-xl sm:block">
          <div class="text-[7px] font-black uppercase tracking-[0.28em] text-slate-500">Map_Navigation</div>
          <div class="mt-1 text-[8px] font-mono uppercase tracking-tight text-slate-300">
            {{ mapZoomLabel() }} // drag to pan // wheel or pinch to zoom
          </div>
        </div>
      </div>

      <!-- Top Right: Scene feed upload panel -->
      <div class="absolute left-4 right-4 top-20 z-20 flex w-auto flex-col overflow-hidden rounded-sm border border-white/10 bg-[#080c12]/80 shadow-2xl backdrop-blur-xl sm:left-auto sm:right-6 sm:top-4 sm:w-72">
        <div class="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2 sm:px-4 sm:py-2.5">
          <input #sceneInput type="file" accept="image/*" capture="environment" class="hidden" (change)="onSceneUpload($event)" />
          <div class="min-w-0 flex flex-1 flex-col">
             <span class="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-tight">Spatial_Feed</span>
             <span class="truncate text-[8px] font-mono uppercase text-slate-500 tracking-tighter">
              {{ commanderLocationLabel() }}
             </span>
          </div>
          <button type="button" (click)="sceneInput.click()"
            class="rounded-sm border border-sky-400/40 bg-sky-400/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-sky-200 hover:bg-sky-400/20 transition-colors">
            Upload
          </button>
        </div>

        @if (sceneCapture(); as capture) {
          <div class="relative h-24 sm:h-40">
             <img [src]="capture.dataUrl" alt="" class="h-full w-full object-cover grayscale opacity-80" />
             <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
             <div class="absolute bottom-2 left-3 right-3 flex items-end justify-between sm:bottom-3 sm:left-4 sm:right-4">
                 <div>
                    <div class="max-w-[140px] truncate text-[8px] font-black uppercase tracking-widest text-white sm:max-w-[150px]">{{ capture.fileName }}</div>
                    <div class="text-[7px] font-mono text-slate-400 uppercase">{{ capture.capturedAt | date:'HH:mm:ss' }}</div>
                 </div>
                 <span class="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest text-amber-200 animate-pulse">LIVE</span>
             </div>
           </div>
          <div class="flex items-center justify-between bg-black/20 p-3">
             <span class="text-[7px] font-mono text-slate-500 uppercase tracking-widest">{{ capture.sizeLabel }}</span>
              <button (click)="clearSceneCapture()" class="text-[7px] font-black uppercase tracking-widest text-rose-500/70 hover:text-rose-500 transition-colors">Discard_Scene</button>
           </div>
        } @else {
          <div class="flex flex-col items-center justify-center gap-2 border-b border-white/5 px-4 py-5 text-center sm:gap-3 sm:px-6 sm:py-12">
            <mat-icon class="!text-2xl !w-7 !h-7 text-white/10 sm:!text-3xl sm:!w-8 sm:!h-8">add_a_photo</mat-icon>
            <div class="space-y-1">
                <p class="text-[9px] font-bold uppercase tracking-widest text-slate-400 leading-tight">No scene image</p>
                <p class="text-[7px] font-mono uppercase leading-relaxed text-slate-500">Capture current field coordinates for C2 grounding.</p>
             </div>
          </div>
        }
      </div>

      @if (selectedObjectDetails(); as selected) {
        <div class="absolute bottom-24 left-4 right-20 z-20 overflow-hidden rounded-sm border border-white/10 bg-[#080c12]/90 shadow-2xl backdrop-blur-xl sm:bottom-auto sm:left-6 sm:right-auto sm:top-28 sm:w-80">
          <div class="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div class="min-w-0">
              <div class="text-[7px] font-black uppercase tracking-[0.28em] text-slate-500">
                {{ selected.type === 'track' ? 'Track Inspector' : 'Field Ontology' }}
              </div>
              <div class="mt-1 truncate text-[11px] font-black uppercase tracking-[0.14em] text-white">
                {{ selected.title }}
              </div>
              <div class="mt-1 text-[8px] font-mono uppercase tracking-tight text-slate-400">
                @if (selected.type === 'track') {
                  {{ selected.id }} // {{ selected.statusLabel }}
                } @else {
                  {{ selected.key }} // {{ selected.subtypeLabel }}
                }
              </div>
            </div>

            <button
              type="button"
              (click)="clearSelectedObject($event)"
              class="rounded-sm border border-white/10 p-1 text-slate-400 transition-colors hover:border-white/20 hover:text-white"
              aria-label="Close object inspector"
            >
              <mat-icon class="!text-sm !w-4 !h-4">close</mat-icon>
            </button>
          </div>

          <div class="space-y-3 px-4 py-3">
            @if (selected.type === 'track') {
              <div class="flex flex-wrap gap-2 text-[7px] font-black uppercase tracking-[0.18em]">
                <span
                  class="rounded border px-2 py-1"
                  [class.border-rose-500/40]="selected.intent === 'STRIKE' || selected.intent === 'STRATEGIC_STRIKE'"
                  [class.bg-rose-500/10]="selected.intent === 'STRIKE' || selected.intent === 'STRATEGIC_STRIKE'"
                  [class.text-rose-300]="selected.intent === 'STRIKE' || selected.intent === 'STRATEGIC_STRIKE'"
                  [class.border-amber-500/40]="selected.intent === 'SATURATION' || selected.intent === 'FEINT'"
                  [class.bg-amber-500/10]="selected.intent === 'SATURATION' || selected.intent === 'FEINT'"
                  [class.text-amber-200]="selected.intent === 'SATURATION' || selected.intent === 'FEINT'"
                  [class.border-sky-500/40]="selected.intent === 'PROBE'"
                  [class.bg-sky-500/10]="selected.intent === 'PROBE'"
                  [class.text-sky-200]="selected.intent === 'PROBE'"
                  [class.border-white/15]="selected.intent === 'DECOY' || selected.intent === 'TACTICAL_CAP'"
                  [class.bg-white/5]="selected.intent === 'DECOY' || selected.intent === 'TACTICAL_CAP'"
                  [class.text-slate-200]="selected.intent === 'DECOY' || selected.intent === 'TACTICAL_CAP'"
                >
                  {{ humanizeLabel(selected.intent) }}
                </span>
                <span class="rounded border border-white/10 bg-white/5 px-2 py-1 text-slate-200">{{ selected.confidence * 100 | number:'1.0-0' }}% confidence</span>
                <span class="rounded border border-white/10 bg-white/5 px-2 py-1 text-slate-400">Target {{ selected.targetLabel }}</span>
              </div>

              <div class="grid grid-cols-2 gap-2 text-[8px] font-mono uppercase tracking-tight">
                <div class="rounded-sm border border-white/5 bg-white/[0.03] px-2 py-2 text-slate-300">
                  <div class="text-[7px] text-slate-500">ETA</div>
                  <div class="mt-1 text-white">{{ selected.etaSeconds }} s</div>
                </div>
                <div class="rounded-sm border border-white/5 bg-white/[0.03] px-2 py-2 text-slate-300">
                  <div class="text-[7px] text-slate-500">Velocity</div>
                  <div class="mt-1 text-white">{{ selected.velocity }} km/h</div>
                </div>
                <div class="rounded-sm border border-white/5 bg-white/[0.03] px-2 py-2 text-slate-300">
                  <div class="text-[7px] text-slate-500">Platform</div>
                  <div class="mt-1 text-white">{{ selected.platformLabel || selected.classLabel }}</div>
                </div>
                <div class="rounded-sm border border-white/5 bg-white/[0.03] px-2 py-2 text-slate-300">
                  <div class="text-[7px] text-slate-500">Heading</div>
                  <div class="mt-1 text-white">{{ selected.heading }} deg</div>
                </div>
                <div class="rounded-sm border border-white/5 bg-white/[0.03] px-2 py-2 text-slate-300">
                  <div class="text-[7px] text-slate-500">Sensor</div>
                  <div class="mt-1 text-white">{{ selected.sensorQuality !== null ? ((selected.sensorQuality * 100 | number:'1.0-0') + '%') : 'N/A' }}</div>
                </div>
                <div class="rounded-sm border border-white/5 bg-white/[0.03] px-2 py-2 text-slate-300">
                  <div class="text-[7px] text-slate-500">Jamming</div>
                  <div class="mt-1 text-white">{{ selected.jammingProbability !== null ? ((selected.jammingProbability * 100 | number:'1.0-0') + '%') : 'Low' }}</div>
                </div>
              </div>

              <div class="space-y-1.5">
                <div class="text-[7px] font-black uppercase tracking-[0.24em] text-slate-500">Intent Spread</div>
                @for (intent of selected.intentDistribution; track intent.label) {
                  <div class="space-y-1">
                    <div class="flex items-center justify-between text-[8px] font-mono uppercase tracking-tight" [class.text-white]="intent.isPrimary" [class.text-slate-400]="!intent.isPrimary">
                      <span>{{ intent.label }}</span>
                      <span>{{ intent.value * 100 | number:'1.0-0' }}%</span>
                    </div>
                    <div class="h-1 rounded-full bg-white/5">
                      <div
                        class="h-full rounded-full"
                        [style.width.%]="intent.value * 100"
                        [class.bg-rose-500]="intent.label === 'STRIKE' || intent.label === 'STRATEGIC STRIKE'"
                        [class.bg-amber-400]="intent.label === 'SATURATION' || intent.label === 'FEINT'"
                        [class.bg-sky-400]="intent.label === 'PROBE'"
                        [class.bg-slate-400]="intent.label === 'DECOY' || intent.label === 'TACTICAL CAP'"
                      ></div>
                    </div>
                  </div>
                }
              </div>

              @if (selected.originLabel || selected.armamentLabel || selected.uncertaintySource) {
                <div class="rounded-sm border border-white/5 bg-white/[0.03] px-3 py-2 text-[8px] font-mono uppercase tracking-tight text-slate-400">
                  <div>Origin {{ selected.originLabel || 'Unknown' }}</div>
                  <div class="mt-1">Loadout {{ selected.armamentLabel || 'Unresolved' }}</div>
                  <div class="mt-1">Ontology {{ selected.uncertaintySource || 'Nominal multi-spectral lock' }}</div>
                </div>
              }
            } @else {
              <div class="flex flex-wrap gap-2 text-[7px] font-black uppercase tracking-[0.18em]">
                <span class="rounded border px-2 py-1" [class.border-sky-500/40]="selected.side === 'north'" [class.bg-sky-500/10]="selected.side === 'north'" [class.text-sky-200]="selected.side === 'north'" [class.border-rose-500/40]="selected.side === 'south'" [class.bg-rose-500/10]="selected.side === 'south'" [class.text-rose-200]="selected.side === 'south'">
                  {{ selected.side === 'north' ? 'Blue Force' : 'Adversary' }}
                </span>
                <span class="rounded border border-white/10 bg-white/5 px-2 py-1 text-slate-200">{{ selected.runwayStatus || 'Ontology node' }}</span>
                @if (selected.reserve) {
                  <span class="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-amber-200">Reserve</span>
                }
              </div>

              <p class="text-[9px] leading-relaxed text-slate-300">{{ selected.note }}</p>

              <div class="grid grid-cols-2 gap-2 text-[8px] font-mono uppercase tracking-tight">
                <div class="rounded-sm border border-white/5 bg-white/[0.03] px-2 py-2 text-slate-300">
                  <div class="text-[7px] text-slate-500">Readiness</div>
                  <div class="mt-1 text-white">{{ selected.readiness !== null ? ((selected.readiness * 100 | number:'1.0-0') + '%') : 'N/A' }}</div>
                </div>
                <div class="rounded-sm border border-white/5 bg-white/[0.03] px-2 py-2 text-slate-300">
                  <div class="text-[7px] text-slate-500">Role</div>
                  <div class="mt-1 text-white">{{ selected.role || 'Field node' }}</div>
                </div>
                <div class="rounded-sm border border-white/5 bg-white/[0.03] px-2 py-2 text-slate-300">
                  <div class="text-[7px] text-slate-500">Sorties</div>
                  <div class="mt-1 text-white">{{ selected.sortieCapacity !== null ? selected.sortieCapacity : 'N/A' }}</div>
                </div>
                <div class="rounded-sm border border-white/5 bg-white/[0.03] px-2 py-2 text-slate-300">
                  <div class="text-[7px] text-slate-500">Airframes</div>
                  <div class="mt-1 text-white">{{ selected.airframesAvailable !== null ? selected.airframesAvailable : 'N/A' }}</div>
                </div>
                <div class="rounded-sm border border-white/5 bg-white/[0.03] px-2 py-2 text-slate-300">
                  <div class="text-[7px] text-slate-500">Threat</div>
                  <div class="mt-1 text-white">{{ selected.threatExposure !== null ? ((selected.threatExposure * 100 | number:'1.0-0') + '%') : 'N/A' }}</div>
                </div>
                <div class="rounded-sm border border-white/5 bg-white/[0.03] px-2 py-2 text-slate-300">
                  <div class="text-[7px] text-slate-500">Inventory</div>
                  <div class="mt-1 text-white">{{ selected.inventoryLabel || 'Ontology only' }}</div>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Bottom HUD Action Bar -->
      <div class="absolute bottom-4 left-4 right-4 z-20 grid grid-cols-3 gap-2 rounded-sm border border-white/10 bg-[#080c12]/85 p-2 shadow-2xl backdrop-blur-md sm:bottom-6 sm:left-1/2 sm:right-auto sm:flex sm:w-auto sm:-translate-x-1/2 sm:items-center sm:gap-4 sm:bg-[#080c12]/80 sm:p-1.5">
          <button (click)="onAlertCommander()"
            class="flex h-16 w-full flex-col items-center justify-center gap-1 rounded-sm border px-1 transition-all active:scale-[0.97] sm:h-14 sm:w-40 sm:gap-0.5"
            [class.bg-rose-500/30]="_alertSent()"
            [class.border-rose-500]="_alertSent()"
            [class.text-rose-400]="_alertSent()"
            [class.bg-rose-500/10]="!_alertSent()"
            [class.border-rose-500/30]="!_alertSent()"
            [class.text-rose-500/70]="!_alertSent()"
          >
            <mat-icon class="!text-base !w-4 !h-4 sm:!text-lg sm:!w-5 sm:!h-5">{{ _alertSent() ? 'check_circle' : 'report' }}</mat-icon>
            <span class="text-[8px] font-black uppercase tracking-[0.18em] leading-none sm:hidden">
              {{ _alertSent() ? 'Sent' : 'Alert' }}
            </span>
            <span class="hidden text-[9px] font-black uppercase tracking-widest leading-none sm:inline">
              {{ _alertSent() ? 'Dispatched' : 'Alert Commander' }}
            </span>
          </button>

          <button (click)="onRequestIntercept()"
            class="flex h-16 w-full flex-col items-center justify-center gap-1 rounded-sm border px-1 transition-all active:scale-[0.97] sm:h-14 sm:w-40 sm:gap-0.5"
            [disabled]="!hasActiveThreats() || _syncing()"
            [class.bg-sky-500/30]="_interceptSent()"
            [class.border-sky-500]="_interceptSent()"
            [class.text-sky-400]="_interceptSent()"
            [class.bg-sky-500/10]="!_interceptSent()"
            [class.border-sky-500/30]="!_interceptSent()"
            [class.text-sky-500/70]="!_interceptSent()"
            [class.opacity-40]="!hasActiveThreats() || _syncing()"
          >
            <mat-icon class="!text-base !w-4 !h-4 sm:!text-lg sm:!w-5 sm:!h-5">{{ _interceptSent() ? 'verified' : 'sensors' }}</mat-icon>
            <span class="text-[8px] font-black uppercase tracking-[0.16em] leading-none sm:hidden">
              {{ _interceptSent() ? 'Live' : 'Intercept' }}
            </span>
            <span class="hidden text-[9px] font-black uppercase tracking-widest leading-none sm:inline">
              {{ _interceptSent() ? 'Authorized' : 'Req. Intercept' }}
            </span>
          </button>

          <button (click)="onSyncStatus()"
            class="flex h-16 w-full flex-col items-center justify-center gap-1 rounded-sm border px-1 transition-all active:scale-[0.97] sm:h-14 sm:w-40 sm:gap-0.5"
            [class.bg-emerald-500/10]="_synced()"
            [class.border-emerald-500]="_synced()"
            [class.text-emerald-400]="_synced()"
            [class.bg-white/5]="!_synced()"
            [class.border-white/10]="!_synced()"
            [class.text-slate-500]="!_synced()"
          >
            <mat-icon class="!text-base !w-4 !h-4 sm:!text-lg sm:!w-5 sm:!h-5" [class.animate-spin]="_syncing()">{{ _synced() ? 'cloud_done' : 'sync' }}</mat-icon>
            <span class="text-[8px] font-black uppercase tracking-[0.16em] leading-none sm:hidden">
              {{ _syncing() ? 'Sync' : (_synced() ? 'Ready' : 'Status') }}
            </span>
            <span class="hidden text-[9px] font-black uppercase tracking-widest leading-none sm:inline">
              {{ _syncing() ? 'Syncing…' : (_synced() ? 'Synchronized' : 'Sync Status') }}
            </span>
          </button>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; width: 100%; }
    .mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .field-map-viewport { touch-action: none; }
    .animate-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FieldConsole implements AfterViewInit {
  @ViewChild('mapViewport') private mapViewportRef?: ElementRef<HTMLDivElement>;

  tactical  = inject(TacticalStore);
  readiness = inject(ReadinessStore);
  audit     = inject(AuditLogger);
  layout    = inject(ShellLayoutService);
  private destroyRef = inject(DestroyRef);

  readonly bases = FIELD_BASES;
  readonly mapFeatures = ENGAGEMENT_MAP_FEATURES;

  readonly _syncing       = signal(false);
  readonly _synced        = signal(false);
  readonly _alertSent     = signal(false);
  readonly _interceptSent = signal(false);
  readonly _toast         = signal<Toast | null>(null);
  readonly commanderLocation = COMMANDER_LOCATION;
  readonly sceneCapture = signal<SceneCapture | null>(null);
  readonly selectedObject = signal<FieldSelection | null>(null);
  readonly mapZoom = signal(MIN_MAP_ZOOM);
  readonly mapLeft = signal(0);
  readonly mapTop = signal(0);
  readonly viewportAspect = signal(FIELD_VIEWBOX_WIDTH / FIELD_VIEWBOX_HEIGHT);
  readonly isMapDragging = signal(false);

  readonly canZoomIn = computed(() => this.mapZoom() < MAX_MAP_ZOOM);
  readonly canZoomOut = computed(() => this.mapZoom() > MIN_MAP_ZOOM);
  readonly mapZoomLabel = computed(() => `${Math.round(this.mapZoom() * 100)}%`);
  readonly mapViewBox = computed(() => {
    const { width, height } = this._viewportDimensions(this.mapZoom());
    return `${this.mapLeft()} ${this.mapTop()} ${width} ${height}`;
  });
  readonly selectedObjectDetails = computed<FieldInspectorModel | null>(() => {
    const selected = this.selectedObject();
    if (!selected) return null;

    return selected.type === 'base'
      ? this._buildBaseInspector(selected.key)
      : this._buildTrackInspector(selected.id);
  });

  private _toastTimer: ReturnType<typeof setTimeout> | null = null;
  private _alertResetTimer: ReturnType<typeof setTimeout> | null = null;
  private _interceptResetTimer: ReturnType<typeof setTimeout> | null = null;
  private _syncTimer: ReturnType<typeof setTimeout> | null = null;
  private _syncResetTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly activePointers = new Map<number, PointerState>();
  private pinchAnchor: MapPoint | null = null;
  private pinchStartDistance = 0;
  private pinchStartZoom = MIN_MAP_ZOOM;
  private pointerOrigin: PointerState | null = null;
  private didPan = false;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this._clearTimers();
      this._clearPointerState();
    });
  }

  ngAfterViewInit(): void {
    this._syncViewportAspect(true);
  }

  avgReadiness = computed(() => {
    const bases = this.readiness.bases();
    if (!bases.length) return 0;
    return Math.round(bases.reduce((sum, b) => sum + b.readiness * 100, 0) / bases.length);
  });

  commanderLocationLabel = computed(() => `${this.commanderLocation.sector} / ${this.commanderLocation.grid}`);

  hasActiveThreats(): boolean {
    return this.tactical.activeThreats().length > 0;
  }

  humanizeLabel(value: string): string {
    return value.replace(/_/g, ' ');
  }

  onMapViewportClick(): void {
    if (this.didPan) {
      this.didPan = false;
      return;
    }

    this.clearSelectedObject();
  }

  clearSelectedObject(event?: Event): void {
    event?.stopPropagation();
    const selected = this.selectedObject();
    if (selected?.type === 'track') {
      this.tactical.selectTrack(null);
    }
    this.selectedObject.set(null);
  }

  selectBase(base: FieldBaseMarker, event?: Event): void {
    event?.stopPropagation();
    if (this.didPan) return;

    const current = this.selectedObject();
    this.tactical.selectTrack(null);

    if (current?.type === 'base' && current.key === base.key) {
      this.selectedObject.set(null);
      return;
    }

    this.selectedObject.set({ type: 'base', key: base.key });
  }

  selectTrack(track: ThreatTwin, event?: Event): void {
    event?.stopPropagation();
    if (this.didPan) return;

    const current = this.selectedObject();
    if (current?.type === 'track' && current.id === track.id) {
      this.tactical.selectTrack(null);
      this.selectedObject.set(null);
      return;
    }

    this.tactical.selectTrack(track.id);
    this.selectedObject.set({ type: 'track', id: track.id });
  }

  isBaseSelected(base: FieldBaseMarker): boolean {
    const selected = this.selectedObject();
    return selected?.type === 'base' && selected.key === base.key;
  }

  isTrackSelected(track: ThreatTwin): boolean {
    const selected = this.selectedObject();
    return selected?.type === 'track' && selected.id === track.id;
  }

  onMapWheel(event: WheelEvent): void {
    event.preventDefault();
    const anchor = this._screenToMap(event.clientX, event.clientY);
    const factor = event.deltaY > 0 ? 1 / MAP_ZOOM_STEP : MAP_ZOOM_STEP;
    this._setZoomAt(anchor, event.clientX, event.clientY, this.mapZoom() * factor);
  }

  onMapPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (!this.activePointers.has(event.pointerId) && this.activePointers.size >= 2) return;

    const viewport = this.mapViewportRef?.nativeElement;
    viewport?.setPointerCapture(event.pointerId);

    const currentPoint = {
      clientX: event.clientX,
      clientY: event.clientY,
    };

    if (this.activePointers.size === 0) {
      this.pointerOrigin = currentPoint;
      this.didPan = false;
    }

    this.activePointers.set(event.pointerId, currentPoint);

    if (this.activePointers.size >= 2) {
      this.isMapDragging.set(false);
      this._startPinchGesture();
      return;
    }

    this.isMapDragging.set(true);
  }

  onMapPointerMove(event: PointerEvent): void {
    const previous = this.activePointers.get(event.pointerId);
    if (!previous) return;

    event.preventDefault();

    const current = { clientX: event.clientX, clientY: event.clientY };
    this.activePointers.set(event.pointerId, current);

    if (this.activePointers.size >= 2) {
      const [first, second] = this._activePointerPair();
      if (!first || !second || !this.pinchAnchor || this.pinchStartDistance <= 0) return;

      const midpoint = this._midpoint(first, second);
      const distance = this._distance(first, second);
      const nextZoom = this.pinchStartZoom * (distance / this.pinchStartDistance);

      this._setZoomAt(this.pinchAnchor, midpoint.clientX, midpoint.clientY, nextZoom);
      return;
    }

    if (this.pointerOrigin && !this.didPan && this._distance(this.pointerOrigin, current) > 4) {
      this.didPan = true;
    }

    this._panByPixels(current.clientX - previous.clientX, current.clientY - previous.clientY);
  }

  onMapPointerUp(event: PointerEvent): void {
    this._releasePointer(event.pointerId);
  }

  @HostListener('window:pointerup', ['$event'])
  onWindowPointerUp(event: PointerEvent): void {
    this._releasePointer(event.pointerId);
  }

  @HostListener('window:pointercancel', ['$event'])
  onWindowPointerCancel(event: PointerEvent): void {
    this._releasePointer(event.pointerId);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this._syncViewportAspect();
  }

  @HostListener('window:blur')
  onWindowBlur(): void {
    this._clearPointerState();
  }

  zoomIn(): void {
    this._zoomFromCenter(MAP_ZOOM_STEP);
  }

  zoomOut(): void {
    this._zoomFromCenter(1 / MAP_ZOOM_STEP);
  }

  resetView(): void {
    const defaults = this._defaultViewport(MIN_MAP_ZOOM);
    this._setViewport(MIN_MAP_ZOOM, defaults.left, defaults.top);
    this._clearPointerState();
  }

  projectTrack(track: ThreatTwin): { x: number; y: number; heading: number } | null {
    const geometry = track?.geometry;
    if (!geometry) return null;
    const x = (geometry.x / TRACK_VIEWBOX_WIDTH) * FIELD_VIEWBOX_WIDTH;
    const y = (geometry.y / TRACK_VIEWBOX_HEIGHT) * FIELD_VIEWBOX_HEIGHT;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const heading = Number.isFinite(geometry.heading) ? geometry.heading : 0;
    return { x, y, heading };
  }

  private _buildBaseInspector(key: string): BaseInspectorModel | null {
    const base = this.bases.find(entry => entry.key === key);
    if (!base) return null;

    const readinessTwin = this._readinessBaseForMarker(base);
    const ontology = this._ontologyForBase(base);

    return {
      type: 'base',
      key: base.key,
      title: base.fullName,
      side: base.side,
      subtypeLabel: this.humanizeLabel(ontology?.subtype ?? 'air_base'),
      note: ontology?.notes ?? 'Field node present in the current theater ontology.',
      role: readinessTwin?.role ?? null,
      readiness: readinessTwin?.readiness ?? null,
      runwayStatus: readinessTwin?.runwayStatus ?? null,
      sortieCapacity: readinessTwin?.sortieCapacity ?? null,
      airframesAvailable: readinessTwin?.airframesAvailable ?? null,
      threatExposure: readinessTwin?.threatExposure ?? null,
      reserve: readinessTwin?.isReserved ?? false,
      inventoryLabel: readinessTwin
        ? `S ${readinessTwin.missileInventory.interceptorShort} / M ${readinessTwin.missileInventory.interceptorMid} / L ${readinessTwin.missileInventory.interceptorLong}`
        : null,
    };
  }

  private _buildTrackInspector(id: string): TrackInspectorModel | null {
    const track = this.tactical.tracks().find(entry => entry.id === id);
    if (!track) return null;

    return {
      type: 'track',
      id: track.id,
      title: track.platform
        ? `${this.humanizeLabel(track.platform)} / ${this.humanizeLabel(track.class)}`
        : this.humanizeLabel(track.class),
      classLabel: this.humanizeLabel(track.class),
      statusLabel: this.humanizeLabel(track.status),
      intent: track.intent,
      confidence: track.confidence,
      targetLabel: this._targetLabel(track.targetId),
      etaSeconds: Math.max(0, Math.round(track.timeToTarget)),
      velocity: Math.round(track.geometry.velocity),
      heading: Math.round(track.geometry.heading),
      platformLabel: track.platform ? this.humanizeLabel(track.platform) : null,
      originLabel: track.originCountry ? this.humanizeLabel(track.originCountry) : null,
      armamentLabel: track.armament
        ? this.humanizeLabel(track.armament)
        : (track.armaments?.map(armament => this.humanizeLabel(armament)).join(' / ') ?? null),
      sensorQuality: track.sensorQuality ?? null,
      classificationConfidence: track.classificationConfidence ?? null,
      jammingProbability: track.jammingProbability ?? null,
      uncertaintySource: track.uncertaintySource ?? null,
      intentDistribution: this._intentDistribution(track).slice(0, 3),
    };
  }

  private _readinessBaseForMarker(base: FieldBaseMarker): BaseTwin | null {
    if (base.readinessId) {
      const matchedById = this.readiness.bases().find(entry => entry.id === base.readinessId);
      if (matchedById) return matchedById;
    }

    return this.readiness.bases().find(entry => entry.name === base.fullName) ?? null;
  }

  private _ontologyForBase(base: FieldBaseMarker): MapFeature | null {
    return this.mapFeatures.find(feature =>
      feature.recordType === 'location' && feature.geometryType === 'point' && feature.name === base.fullName
    ) ?? null;
  }

  private _targetLabel(targetId: string): string {
    const readinessBase = this.readiness.bases().find(base => base.id === targetId);
    if (readinessBase) return readinessBase.name;

    const fieldBase = this.bases.find(base => base.readinessId === targetId);
    return fieldBase?.fullName ?? targetId;
  }

  private _intentDistribution(track: ThreatTwin): FieldIntentEntry[] {
    const liveDistribution = track.intentDistribution;
    if (liveDistribution) {
      return Object.entries(liveDistribution)
        .map(([label, value]) => ({
          label: this.humanizeLabel(label.toUpperCase()),
          value: value as number,
          isPrimary: label.toUpperCase() === track.intent,
        }))
        .sort((left, right) => right.value - left.value);
    }

    const order = Array.from(new Set<ThreatTwin['intent']>([
      'PROBE',
      'FEINT',
      'STRIKE',
      'SATURATION',
      'DECOY',
      track.intent,
    ]));

    return order
      .map(intent => {
        let value = 0.05;
        if (intent === track.intent) value = track.confidence;
        if (intent === 'PROBE' && track.intent !== 'PROBE') value = (1 - track.confidence) * 0.4;
        if (intent === 'DECOY' && track.class === 'DRONE') value += 0.15;

        return {
          label: this.humanizeLabel(intent),
          value,
          isPrimary: intent === track.intent,
        };
      })
      .sort((left, right) => right.value - left.value);
  }

  private _clearTimers(): void {
    if (this._toastTimer) clearTimeout(this._toastTimer);
    if (this._alertResetTimer) clearTimeout(this._alertResetTimer);
    if (this._interceptResetTimer) clearTimeout(this._interceptResetTimer);
    if (this._syncTimer) clearTimeout(this._syncTimer);
    if (this._syncResetTimer) clearTimeout(this._syncResetTimer);
  }

  private _viewportDimensions(zoom: number): { width: number; height: number } {
    const base = this._baseViewportDimensions();
    return {
      width: base.width / zoom,
      height: base.height / zoom,
    };
  }

  private _baseViewportDimensions(): { width: number; height: number } {
    const aspect = this.viewportAspect();
    const fieldAspect = FIELD_VIEWBOX_WIDTH / FIELD_VIEWBOX_HEIGHT;

    if (aspect > fieldAspect) {
      return {
        width: FIELD_VIEWBOX_WIDTH,
        height: FIELD_VIEWBOX_WIDTH / aspect,
      };
    }

    return {
      width: FIELD_VIEWBOX_HEIGHT * aspect,
      height: FIELD_VIEWBOX_HEIGHT,
    };
  }

  private _defaultViewport(zoom: number): { left: number; top: number; width: number; height: number } {
    const { width, height } = this._viewportDimensions(zoom);
    return {
      width,
      height,
      left: (FIELD_VIEWBOX_WIDTH - width) / 2,
      top: (FIELD_VIEWBOX_HEIGHT - height) / 2,
    };
  }

  private _clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private _setViewport(zoom: number, left: number, top: number): void {
    const nextZoom = this._clamp(zoom, MIN_MAP_ZOOM, MAX_MAP_ZOOM);
    const { width, height } = this._viewportDimensions(nextZoom);

    this.mapZoom.set(nextZoom);
    this.mapLeft.set(this._clamp(left, 0, Math.max(0, FIELD_VIEWBOX_WIDTH - width)));
    this.mapTop.set(this._clamp(top, 0, Math.max(0, FIELD_VIEWBOX_HEIGHT - height)));
  }

  private _syncViewportAspect(recenter = false): void {
    const viewport = this.mapViewportRef?.nativeElement;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const currentCenter = recenter ? null : this._currentMapCenter();

    this.viewportAspect.set(rect.width / rect.height);

    if (recenter) {
      const defaults = this._defaultViewport(MIN_MAP_ZOOM);
      this._setViewport(MIN_MAP_ZOOM, defaults.left, defaults.top);
      return;
    }

    if (!currentCenter) return;

    const { width, height } = this._viewportDimensions(this.mapZoom());
    this._setViewport(this.mapZoom(), currentCenter.x - width / 2, currentCenter.y - height / 2);
  }

  private _metricsForZoom(zoom = this.mapZoom()): ViewportMetrics | null {
    const viewport = this.mapViewportRef?.nativeElement;
    if (!viewport) return null;

    const rect = viewport.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const { width, height } = this._viewportDimensions(zoom);
    const scale = Math.max(rect.width / width, rect.height / height);

    return {
      rect,
      width,
      height,
      scale,
      offsetX: (width * scale - rect.width) / 2,
      offsetY: (height * scale - rect.height) / 2,
    };
  }

  private _offsetInView(clientX: number, clientY: number, metrics: ViewportMetrics): MapPoint {
    return {
      x: this._clamp((clientX - metrics.rect.left + metrics.offsetX) / metrics.scale, 0, metrics.width),
      y: this._clamp((clientY - metrics.rect.top + metrics.offsetY) / metrics.scale, 0, metrics.height),
    };
  }

  private _screenToMap(clientX: number, clientY: number): MapPoint {
    const metrics = this._metricsForZoom();
    const left = this.mapLeft();
    const top = this.mapTop();

    if (!metrics) {
      const { width, height } = this._viewportDimensions(this.mapZoom());
      return {
        x: left + width / 2,
        y: top + height / 2,
      };
    }

    const offset = this._offsetInView(clientX, clientY, metrics);
    return {
      x: left + offset.x,
      y: top + offset.y,
    };
  }

  private _currentMapCenter(): MapPoint {
    const { width, height } = this._viewportDimensions(this.mapZoom());
    return {
      x: this.mapLeft() + width / 2,
      y: this.mapTop() + height / 2,
    };
  }

  private _screenCenter(): PointerState | null {
    const metrics = this._metricsForZoom();
    if (!metrics) return null;

    return {
      clientX: metrics.rect.left + metrics.rect.width / 2,
      clientY: metrics.rect.top + metrics.rect.height / 2,
    };
  }

  private _setZoomAt(anchor: MapPoint, clientX: number, clientY: number, nextZoom: number): void {
    const targetZoom = this._clamp(nextZoom, MIN_MAP_ZOOM, MAX_MAP_ZOOM);
    const metrics = this._metricsForZoom(targetZoom);

    if (!metrics) {
      const { width, height } = this._viewportDimensions(targetZoom);
      this._setViewport(targetZoom, anchor.x - width / 2, anchor.y - height / 2);
      return;
    }

    const offset = this._offsetInView(clientX, clientY, metrics);
    this._setViewport(targetZoom, anchor.x - offset.x, anchor.y - offset.y);
  }

  private _zoomFromCenter(factor: number): void {
    const anchor = this._currentMapCenter();
    const center = this._screenCenter();

    if (!center) {
      const nextZoom = this._clamp(this.mapZoom() * factor, MIN_MAP_ZOOM, MAX_MAP_ZOOM);
      const { width, height } = this._viewportDimensions(nextZoom);
      this._setViewport(nextZoom, anchor.x - width / 2, anchor.y - height / 2);
      return;
    }

    this._setZoomAt(anchor, center.clientX, center.clientY, this.mapZoom() * factor);
  }

  private _panByPixels(deltaX: number, deltaY: number): void {
    const metrics = this._metricsForZoom();
    if (!metrics) return;

    this._setViewport(
      this.mapZoom(),
      this.mapLeft() - deltaX / metrics.scale,
      this.mapTop() - deltaY / metrics.scale,
    );
  }

  private _activePointerPair(): [PointerState | null, PointerState | null] {
    const pointers = Array.from(this.activePointers.values());
    return [pointers[0] ?? null, pointers[1] ?? null];
  }

  private _midpoint(first: PointerState, second: PointerState): PointerState {
    return {
      clientX: (first.clientX + second.clientX) / 2,
      clientY: (first.clientY + second.clientY) / 2,
    };
  }

  private _distance(first: PointerState, second: PointerState): number {
    return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
  }

  private _startPinchGesture(): void {
    const [first, second] = this._activePointerPair();
    if (!first || !second) return;

    this.didPan = true;
    const midpoint = this._midpoint(first, second);
    this.pinchAnchor = this._screenToMap(midpoint.clientX, midpoint.clientY);
    this.pinchStartDistance = this._distance(first, second);
    this.pinchStartZoom = this.mapZoom();
  }

  private _releasePointer(pointerId: number): void {
    if (!this.activePointers.has(pointerId)) return;

    const viewport = this.mapViewportRef?.nativeElement;
    if (viewport?.hasPointerCapture(pointerId)) {
      viewport.releasePointerCapture(pointerId);
    }

    this.activePointers.delete(pointerId);

    if (this.activePointers.size >= 2) {
      this._startPinchGesture();
      return;
    }

    this.pinchAnchor = null;
    this.pinchStartDistance = 0;
    this.pinchStartZoom = this.mapZoom();
    this.pointerOrigin = this.activePointers.size === 1 ? Array.from(this.activePointers.values())[0] ?? null : null;
    this.isMapDragging.set(this.activePointers.size === 1);
  }

  private _clearPointerState(): void {
    const viewport = this.mapViewportRef?.nativeElement;

    for (const pointerId of this.activePointers.keys()) {
      if (viewport?.hasPointerCapture(pointerId)) {
        viewport.releasePointerCapture(pointerId);
      }
    }

    this.activePointers.clear();
    this.pinchAnchor = null;
    this.pinchStartDistance = 0;
    this.pinchStartZoom = this.mapZoom();
    this.pointerOrigin = null;
    this.didPan = false;
    this.isMapDragging.set(false);
  }

  private _showToast(toast: Toast, duration = 2000): void {
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toast.set(toast);
    this._toastTimer = setTimeout(() => {
      this._toast.set(null);
    }, duration);
  }

  onSceneUpload(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this._showToast({ message: 'Only image files are supported', icon: 'warning', type: 'warning' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : null;
      if (!dataUrl) return;

      this.sceneCapture.set({
        fileName: file.name,
        capturedAt: new Date().toISOString(),
        dataUrl,
        sizeLabel: `${(file.size / 1024).toFixed(1)} KB`,
      });

      this.audit.log({
        actor: 'OPERATOR',
        action: 'Scene Image Uploaded',
        rationale: `Attached ${file.name} from the field scene for ${this.commanderLocation.label}.`,
        category: 'TACTICAL',
      });
      this._showToast({ message: 'Scene image attached', icon: 'photo_camera', type: 'sync' });
    };
    reader.readAsDataURL(file);
    if (input) input.value = '';
  }

  clearSceneCapture(): void {
    this.sceneCapture.set(null);
    this._showToast({ message: 'Scene image cleared', icon: 'close', type: 'warning' });
  }

  onAlertCommander(): void {
    this._alertSent.set(true);
    this.audit.log({
      actor: 'OPERATOR',
      action: 'Field Alert Sent',
      rationale: `Field terminal dispatched alert to commander.`,
      category: 'TACTICAL',
    });
    this._showToast({ message: 'Alert dispatched to commander', icon: 'report', type: 'alert' });
    this._alertResetTimer = setTimeout(() => this._alertSent.set(false), RESET_SENT_MS);
  }

  onRequestIntercept(): void {
    this._interceptSent.set(true);
    this._showToast({ message: 'Intercept request transmitted', icon: 'sensors', type: 'intercept' });
    this._interceptResetTimer = setTimeout(() => this._interceptSent.set(false), RESET_SENT_MS);
  }

  onSyncStatus(): void {
    this._syncing.set(true);
    this._synced.set(false);
    this._syncTimer = setTimeout(() => {
      this._syncing.set(false);
      this._synced.set(true);
      this._showToast({ message: 'Status synchronized', icon: 'cloud_done', type: 'sync' }, 1800);
      this._syncResetTimer = setTimeout(() => this._synced.set(false), SYNC_RESET_MS);
    }, SYNCING_MS);
  }
}
