import { Component, ChangeDetectionStrategy, DestroyRef, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TacticalStore } from '../../core/state/tactical.store';
import { ReadinessStore } from '../../core/state/readiness.store';
import { AuditLogger } from '../../core/services/audit-logger';
import { ThreatTwin } from '../../shared/domain/models';
import { ShellLayoutService } from '../../core/services/shell-layout.service';

interface Toast { message: string; icon: string; type: 'alert' | 'intercept' | 'sync' | 'warning'; }

interface SceneCapture {
  fileName: string;
  capturedAt: string;
  dataUrl: string;
  sizeLabel: string;
}

// Base dots scaled from tactical viewBox 1670×1300 → field viewBox 400×300
const FIELD_BASES = [
  { name: 'NVB',  x: 47,  y: 77,  side: 'north' },
  { name: 'HRC',  x: 201, y: 17,  side: 'north' },
  { name: 'BWP',  x: 277, y: 89,  side: 'north' },
  { name: 'FWS',  x: 335, y: 247, side: 'south' },
  { name: 'SRD',  x: 77,  y: 231, side: 'south' },
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

@Component({
  selector: 'app-field-console',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="relative h-full w-full bg-boreal-canvas overflow-hidden flex flex-col">

      <!-- ── BACKGROUND FULL-SCREEN MAP ─────────────────────────────────── -->
      <div class="absolute inset-0 z-0">
        <svg viewBox="0 0 400 300" class="h-full w-full" [attr.preserveAspectRatio]="'xMidYMid slice'">
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
            <text y="-10" text-anchor="middle" font-family="monospace" font-size="5" font-weight="bold" fill="var(--boreal-amber)" opacity="0.7">{{ commanderLocation.label }}</text>
          </g>

          <!-- Base dots -->
          @for (base of bases; track base.name) {
            <g [attr.transform]="'translate(' + base.x + ',' + base.y + ')'">
              <circle r="3" fill="transparent" [attr.stroke]="base.side === 'north' ? '#0ea5e9' : '#f43f5e'" stroke-width="1" />
              <circle r="1" [attr.fill]="base.side === 'north' ? '#0ea5e9' : '#f43f5e'" />
              <text y="8" text-anchor="middle" font-family="monospace" font-size="4" font-weight="bold" [attr.fill]="base.side === 'north' ? '#0ea5e9' : '#f43f5e'" opacity="0.5">{{ base.name }}</text>
            </g>
          }

          <!-- Active threat triangles -->
          @for (track of tactical.activeThreats(); track track.id) {
            @if (projectTrack(track); as projectedTrack) {
              <g [attr.transform]="'translate(' + projectedTrack.x + ',' + projectedTrack.y + ') rotate(' + projectedTrack.heading + ')'">
                <polygon points="0,-4 3,3 -3,3" fill="#f43f5e" fill-opacity="0.8" stroke="#f43f5e" stroke-width="0.5" />
                <line x1="0" y1="-4" x2="0" y2="-10" stroke="#f43f5e" stroke-opacity="0.4" stroke-width="0.5" stroke-dasharray="2,1" />
              </g>
            }
          }
        </svg>
      </div>

      <!-- ── OVERLAY HUD ────────────────────────────────────────────────── -->
      
      <!-- Top Left: Title & Status -->
      <div class="absolute top-4 left-6 z-20 flex flex-col gap-1 pointer-events-none">
        <div class="flex items-center gap-2">
           <span class="text-[9px] font-black uppercase tracking-[0.4em] text-sky-400/70">Field_Operations</span>
           <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
        <h1 class="text-xl font-light tracking-tighter text-white uppercase">Terminal // Northern Vanguard</h1>
        <div class="flex gap-2 mt-1">
           <span class="px-2 py-0.5 border border-rose-500/30 bg-rose-500/5 text-[8px] font-black text-rose-400 uppercase tracking-widest">{{ tactical.activeThreats().length }} Active_Tracks</span>
           <span class="px-2 py-0.5 border border-sky-500/30 bg-sky-500/5 text-[8px] font-black text-sky-400 uppercase tracking-widest">{{ avgReadiness() }}% Readiness</span>
        </div>
      </div>

      <!-- Confirmation toast -->
      @if (_toast()) {
        <div class="absolute left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-2 rounded-sm border px-4 py-2 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200"
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

      <!-- Top Right: Scene feed upload panel -->
      <div class="absolute top-4 right-6 w-72 z-20 overflow-hidden rounded-sm border border-white/10 bg-[#080c12]/80 backdrop-blur-xl shadow-2xl flex flex-col">
        <div class="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
          <input #sceneInput type="file" accept="image/*" capture="environment" class="hidden" (change)="onSceneUpload($event)" />
          <div class="flex flex-col">
            <span class="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-tight">Spatial_Feed</span>
            <span class="text-[8px] font-mono uppercase text-slate-500 tracking-tighter">
              {{ commanderLocation.sector }} // {{ commanderLocation.grid }}
            </span>
          </div>
          <button type="button" (click)="sceneInput.click()"
            class="rounded-sm border border-sky-400/40 bg-sky-400/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-sky-200 hover:bg-sky-400/20 transition-colors">
            Upload
          </button>
        </div>

        @if (sceneCapture(); as capture) {
          <div class="relative h-40">
             <img [src]="capture.dataUrl" alt="" class="h-full w-full object-cover grayscale opacity-80" />
             <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
             <div class="absolute bottom-3 left-4 right-4 flex justify-between items-end">
                <div>
                   <div class="text-[8px] font-black text-white uppercase tracking-widest truncate max-w-[150px]">{{ capture.fileName }}</div>
                   <div class="text-[7px] font-mono text-slate-400 uppercase">{{ capture.capturedAt | date:'HH:mm:ss' }}</div>
                </div>
                <span class="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest text-amber-200 animate-pulse">LIVE</span>
             </div>
          </div>
          <div class="p-3 bg-black/20 flex justify-between items-center">
             <span class="text-[7px] font-mono text-slate-500 uppercase tracking-widest">{{ capture.sizeLabel }}</span>
             <button (click)="clearSceneCapture()" class="text-[7px] font-black uppercase tracking-widest text-rose-500/70 hover:text-rose-500 transition-colors">Discard_Scene</button>
          </div>
        } @else {
          <div class="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center border-b border-white/5">
            <mat-icon class="!text-3xl !w-8 !h-8 text-white/10">add_a_photo</mat-icon>
            <div class="space-y-1">
               <p class="text-[9px] font-bold uppercase tracking-widest text-slate-400 leading-tight">No scene image</p>
               <p class="text-[7px] font-mono uppercase leading-relaxed text-slate-500">Capture current field coordinates for C2 grounding.</p>
            </div>
          </div>
        }
      </div>

      <!-- Bottom HUD Action Bar -->
      <div class="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 bg-[#080c12]/80 backdrop-blur-md border border-white/10 rounded-sm p-1.5 shadow-2xl">
          <button (click)="onAlertCommander()"
            class="flex h-14 w-40 flex-col items-center justify-center gap-0.5 rounded-sm border transition-all active:scale-[0.97]"
            [class.bg-rose-500/30]="_alertSent()"
            [class.border-rose-500]="_alertSent()"
            [class.text-rose-400]="_alertSent()"
            [class.bg-rose-500/10]="!_alertSent()"
            [class.border-rose-500/30]="!_alertSent()"
            [class.text-rose-500/70]="!_alertSent()"
          >
            <mat-icon class="!text-lg !w-5 !h-5">{{ _alertSent() ? 'check_circle' : 'report' }}</mat-icon>
            <span class="text-[9px] font-black uppercase tracking-widest leading-none">
              {{ _alertSent() ? 'Dispatched' : 'Alert Commander' }}
            </span>
          </button>

          <button (click)="onRequestIntercept()"
            class="flex h-14 w-40 flex-col items-center justify-center gap-0.5 rounded-sm border transition-all active:scale-[0.97]"
            [disabled]="!hasActiveThreats() || _syncing()"
            [class.bg-sky-500/30]="_interceptSent()"
            [class.border-sky-500]="_interceptSent()"
            [class.text-sky-400]="_interceptSent()"
            [class.bg-sky-500/10]="!_interceptSent()"
            [class.border-sky-500/30]="!_interceptSent()"
            [class.text-sky-500/70]="!_interceptSent()"
            [class.opacity-40]="!hasActiveThreats() || _syncing()"
          >
            <mat-icon class="!text-lg !w-5 !h-5">{{ _interceptSent() ? 'verified' : 'sensors' }}</mat-icon>
            <span class="text-[9px] font-black uppercase tracking-widest leading-none">
              {{ _interceptSent() ? 'Authorized' : 'Req. Intercept' }}
            </span>
          </button>

          <button (click)="onSyncStatus()"
            class="flex h-14 w-40 flex-col items-center justify-center gap-0.5 rounded-sm border transition-all active:scale-[0.97]"
            [class.bg-emerald-500/10]="_synced()"
            [class.border-emerald-500]="_synced()"
            [class.text-emerald-400]="_synced()"
            [class.bg-white/5]="!_synced()"
            [class.border-white/10]="!_synced()"
            [class.text-slate-500]="!_synced()"
          >
            <mat-icon class="!text-lg !w-5 !h-5" [class.animate-spin]="_syncing()">{{ _synced() ? 'cloud_done' : 'sync' }}</mat-icon>
            <span class="text-[9px] font-black uppercase tracking-widest leading-none">
              {{ _syncing() ? 'Syncing…' : (_synced() ? 'Synchronized' : 'Sync Status') }}
            </span>
          </button>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; width: 100%; }
    .mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .animate-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FieldConsole {
  tactical  = inject(TacticalStore);
  readiness = inject(ReadinessStore);
  audit     = inject(AuditLogger);
  layout    = inject(ShellLayoutService);
  private destroyRef = inject(DestroyRef);

  readonly bases = FIELD_BASES;

  readonly _syncing       = signal(false);
  readonly _synced        = signal(false);
  readonly _alertSent     = signal(false);
  readonly _interceptSent = signal(false);
  readonly _toast         = signal<Toast | null>(null);
  readonly commanderLocation = COMMANDER_LOCATION;
  readonly sceneCapture = signal<SceneCapture | null>(null);

  private _toastTimer: ReturnType<typeof setTimeout> | null = null;
  private _alertResetTimer: ReturnType<typeof setTimeout> | null = null;
  private _interceptResetTimer: ReturnType<typeof setTimeout> | null = null;
  private _syncTimer: ReturnType<typeof setTimeout> | null = null;
  private _syncResetTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this._clearTimers());
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

  projectTrack(track: ThreatTwin): { x: number; y: number; heading: number } | null {
    const geometry = track?.geometry;
    if (!geometry) return null;
    const x = (geometry.x / TRACK_VIEWBOX_WIDTH) * FIELD_VIEWBOX_WIDTH;
    const y = (geometry.y / TRACK_VIEWBOX_HEIGHT) * FIELD_VIEWBOX_HEIGHT;
    const heading = Number.isFinite(geometry.heading) ? geometry.heading : 0;
    return { x, y, heading };
  }

  private _clearTimers(): void {
    if (this._toastTimer) clearTimeout(this._toastTimer);
    if (this._alertResetTimer) clearTimeout(this._alertResetTimer);
    if (this._interceptResetTimer) clearTimeout(this._interceptResetTimer);
    if (this._syncTimer) clearTimeout(this._syncTimer);
    if (this._syncResetTimer) clearTimeout(this._syncResetTimer);
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
