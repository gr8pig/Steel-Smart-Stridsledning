import { Component, ChangeDetectionStrategy, DestroyRef, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TacticalStore } from '../core/state/tactical.store';
import { ReadinessStore } from '../core/state/readiness.store';
import { AuditLogger } from '../core/services/audit-logger';
import { ThreatTwin } from '../shared/domain/models';
import { ShellLayoutService } from '../core/services/shell-layout.service';

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
    <div class="relative flex min-h-full w-full flex-col overflow-x-hidden bg-boreal-canvas lg:h-full">

      <!-- Confirmation toast -->
      @if (_toast()) {
        <div class="absolute left-1/2 top-3 z-50 flex max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-2 rounded-sm border px-4 py-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200"
          aria-live="polite"
          [class.bg-boreal-red/20]="_toast()!.type === 'alert'"
          [class.border-boreal-red/50]="_toast()!.type === 'alert'"
          [class.text-boreal-red]="_toast()!.type === 'alert'"
          [class.bg-boreal-blue/20]="_toast()!.type === 'intercept'"
          [class.border-boreal-blue/50]="_toast()!.type === 'intercept'"
          [class.text-boreal-blue]="_toast()!.type === 'intercept'"
          [class.bg-boreal-green/20]="_toast()!.type === 'sync'"
          [class.border-boreal-green/50]="_toast()!.type === 'sync'"
          [class.text-boreal-green]="_toast()!.type === 'sync'"
          [class.bg-boreal-amber/20]="_toast()!.type === 'warning'"
          [class.border-boreal-amber/50]="_toast()!.type === 'warning'"
          [class.text-boreal-amber]="_toast()!.type === 'warning'"
        >
          <mat-icon class="!text-sm !w-4 !h-4">{{ _toast()!.icon }}</mat-icon>
          <span class="text-[10px] font-black uppercase tracking-widest">{{ _toast()!.message }}</span>
        </div>
      }

      <!-- Header bar -->
      <header class="shrink-0 border-b border-boreal-border px-3 py-2 sm:px-4">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-3">
          <span class="text-[10px] font-mono uppercase tracking-widest text-boreal-text-muted">
            Field Terminal — Northern Vanguard
          </span>
          <span class="w-1.5 h-1.5 rounded-full bg-boreal-green animate-pulse"></span>
          <span class="text-[8px] font-mono text-boreal-green uppercase tracking-widest">SYNCHRONIZED</span>
          </div>
          <div class="flex flex-wrap items-center gap-2">
          <span class="rounded border border-boreal-red/40 bg-boreal-red/10 px-2 py-0.5 text-[9px] font-mono font-bold text-boreal-red">
            {{ tactical.activeThreats().length }} TRK
          </span>
          <span class="rounded border border-boreal-blue/40 bg-boreal-blue/10 px-2 py-0.5 text-[9px] font-mono font-bold text-boreal-blue">
            {{ avgReadiness() }}% RDY
          </span>
          <span class="rounded border border-boreal-amber/40 bg-boreal-amber/10 px-2 py-0.5 text-[9px] font-mono font-bold text-boreal-amber">
            CMD {{ commanderLocationLabel() }}
          </span>
          </div>
        </div>
      </header>

      <div class="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:h-full lg:p-4">
        <section class="relative flex min-h-0 flex-1 flex-col gap-3 lg:overflow-hidden">
          <!-- Full-bleed SVG map -->
          <div class="relative aspect-[4/3] min-h-[18rem] overflow-hidden rounded-sm border border-boreal-border bg-boreal-canvas shadow-2xl lg:h-full lg:min-h-0 lg:aspect-auto lg:rounded-none lg:border-0 lg:shadow-none">
            <svg viewBox="0 0 400 300" class="absolute inset-0 h-full w-full" [attr.preserveAspectRatio]="mapPreserveAspectRatio()">

              <defs>
                <pattern id="field-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="0.5" fill="var(--boreal-blue)" opacity="0.15"/>
                </pattern>
              </defs>

              <!-- Background fill -->
              <rect width="400" height="300" fill="var(--boreal-canvas)" />
              <rect width="400" height="300" fill="url(#field-grid)" />

              <!-- Coastline (western edge of theater) -->
              <path
                d="M0,0 L0,300 L28,285 L18,255 L32,210 L22,160 L38,115 L22,65 L32,20 L0,0 Z"
                fill="var(--boreal-blue)" fill-opacity="0.06"
                stroke="var(--boreal-blue)" stroke-opacity="0.25" stroke-width="1"
              />

              <!-- IFZ circle (central theater zone) -->
              <circle cx="200" cy="160" r="55"
                fill="none"
                stroke="var(--boreal-amber)" stroke-opacity="0.3"
                stroke-width="0.8" stroke-dasharray="4,3"
              />
              <circle cx="200" cy="160" r="55"
                fill="var(--boreal-amber)" fill-opacity="0.03"
              />
              <text x="200" y="102" text-anchor="middle"
                font-family="monospace" font-size="6" fill="var(--boreal-amber)" opacity="0.5"
                font-weight="bold" letter-spacing="1">IFZ</text>

              <!-- Commander location -->
              <g [attr.transform]="'translate(' + commanderLocation.x + ',' + commanderLocation.y + ')'">
                <circle r="10"
                  fill="var(--boreal-amber)" fill-opacity="0.14"
                  stroke="var(--boreal-amber)" stroke-width="1.2"
                />
                <circle r="3"
                  fill="var(--boreal-amber)"
                />
                <line x1="-8" y1="0" x2="8" y2="0"
                  stroke="var(--boreal-amber)" stroke-opacity="0.5" stroke-width="0.8"
                />
                <line x1="0" y1="-8" x2="0" y2="8"
                  stroke="var(--boreal-amber)" stroke-opacity="0.5" stroke-width="0.8"
                />
                <text y="-12" text-anchor="middle"
                  font-family="monospace" font-size="5.5" font-weight="bold"
                  fill="var(--boreal-amber)" opacity="0.85">{{ commanderLocation.label }}</text>
              </g>

              <!-- Base dots -->
              @for (base of bases; track base.name) {
                <g [attr.transform]="'translate(' + base.x + ',' + base.y + ')'">
                  <circle r="4"
                    fill="var(--boreal-canvas)"
                    [attr.stroke]="base.side === 'north' ? 'var(--boreal-blue)' : 'var(--boreal-red)'"
                    stroke-width="1.5"
                  />
                  <circle r="1.5"
                    [attr.fill]="base.side === 'north' ? 'var(--boreal-blue)' : 'var(--boreal-red)'"
                  />
                  <text y="12" text-anchor="middle"
                    font-family="monospace" font-size="5.5" font-weight="bold"
                    [attr.fill]="base.side === 'north' ? 'var(--boreal-blue)' : 'var(--boreal-red)'"
                    opacity="0.7">{{ base.name }}</text>
                </g>
              }

              <!-- Active threat triangles -->
              @for (track of tactical.activeThreats(); track track.id) {
                @if (projectTrack(track); as projectedTrack) {
                  <g [attr.transform]="'translate(' + projectedTrack.x + ',' + projectedTrack.y + ') rotate(' + projectedTrack.heading + ')'">
                    <polygon points="0,-5 4,4 -4,4"
                      fill="var(--boreal-red)" fill-opacity="0.7"
                      stroke="var(--boreal-red)" stroke-width="0.8"
                    />
                    <line x1="0" y1="-5" x2="0" y2="-12"
                      stroke="var(--boreal-red)" stroke-opacity="0.4" stroke-width="0.8"
                      stroke-dasharray="2,2"
                    />
                  </g>
                }
              }

            </svg>

            <!-- Track count overlay (bottom-left of map) -->
            @if (tactical.activeThreats().length === 0) {
              <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span class="text-[9px] font-mono text-boreal-text-muted uppercase tracking-widest opacity-30">
                  No Active Tracks
                </span>
              </div>
            }
          </div>

          <!-- Scene feed upload panel -->
          <div class="w-full overflow-hidden rounded-sm border border-boreal-border bg-boreal-panel/90 shadow-2xl backdrop-blur lg:absolute lg:right-4 lg:top-4 lg:z-40 lg:w-72">
            <div class="flex items-center justify-between gap-3 border-b border-boreal-border px-3 py-2">
              <input
                #sceneInput
                type="file"
                accept="image/*"
                capture="environment"
                class="hidden"
                (change)="onSceneUpload($event)"
              />
              <div class="flex flex-col">
                <span class="text-[9px] font-black uppercase tracking-widest text-boreal-text-primary">Scene Feed</span>
                <span class="text-[8px] font-mono uppercase text-boreal-text-muted">
                  {{ commanderLocation.sector }} · {{ commanderLocation.grid }}
                </span>
              </div>
              <button
                type="button"
                (click)="sceneInput.click()"
                class="rounded-sm border border-boreal-blue/40 bg-boreal-blue/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-boreal-blue transition-colors"
              >
                Upload
              </button>
            </div>

            @if (sceneCapture(); as capture) {
              <img [src]="capture.dataUrl" [alt]="'Scene upload ' + capture.fileName" class="h-40 w-full object-cover sm:h-44" />
              <div class="space-y-2 p-3">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate text-[10px] font-bold uppercase tracking-tight text-boreal-text-primary">
                      {{ capture.fileName }}
                    </p>
                    <p class="text-[8px] font-mono uppercase text-boreal-text-muted">
                      {{ capture.capturedAt | date:'HH:mm:ss' }}
                    </p>
                  </div>
                  <span class="shrink-0 rounded border border-boreal-amber/40 bg-boreal-amber/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-boreal-amber">
                    LIVE
                  </span>
                </div>

                <div class="grid grid-cols-2 gap-2 text-[8px] font-mono uppercase">
                  <div class="rounded border border-boreal-border bg-boreal-canvas/50 px-2 py-1">
                    <span class="block text-boreal-text-muted">Commander</span>
                    <span class="block font-bold text-boreal-text-primary">{{ commanderLocation.label }}</span>
                  </div>
                  <div class="rounded border border-boreal-border bg-boreal-canvas/50 px-2 py-1">
                    <span class="block text-boreal-text-muted">Position</span>
                    <span class="block font-bold text-boreal-text-primary">{{ commanderLocationLabel() }}</span>
                  </div>
                </div>

                <div class="flex items-center justify-between text-[8px] font-mono uppercase text-boreal-text-muted">
                  <span>{{ capture.sizeLabel }}</span>
                  <button type="button" (click)="clearSceneCapture()" class="text-boreal-text-secondary">Clear</button>
                </div>
              </div>
            } @else {
              <div class="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                <mat-icon class="!text-2xl !w-6 !h-6 text-boreal-text-muted">photo_camera</mat-icon>
                <p class="text-[10px] font-bold uppercase tracking-widest text-boreal-text-primary">
                  No scene image attached
                </p>
                <p class="text-[8px] font-mono uppercase leading-relaxed text-boreal-text-muted">
                  Use the camera or upload a field image from the scene.
                </p>
              </div>
            }
          </div>
        </section>

        <!-- Bottom action bar -->
        <div class="grid grid-cols-1 gap-2 border-t border-boreal-border bg-boreal-panel p-3 sm:grid-cols-3">
          <button
            (click)="onAlertCommander()"
            class="flex h-14 flex-col items-center justify-center gap-0.5 rounded-sm border transition-all active:scale-[0.97]"
            [class.bg-boreal-red/30]="_alertSent()"
            [class.border-boreal-red]="true"
            [class.text-boreal-red]="true"
            [class.bg-boreal-red/20]="!_alertSent()"
            [class.shadow-lg]="_alertSent()"
            [class.shadow-boreal-red/30]="_alertSent()"
          >
            <mat-icon class="!text-lg !w-5 !h-5">{{ _alertSent() ? 'check_circle' : 'report' }}</mat-icon>
            <span class="text-[9px] font-bold uppercase tracking-widest leading-none">
              {{ _alertSent() ? 'Sent ✓' : 'Alert Commander' }}
            </span>
          </button>

          <button
            (click)="onRequestIntercept()"
            class="flex h-14 flex-col items-center justify-center gap-0.5 rounded-sm border transition-all active:scale-[0.97]"
            [disabled]="!hasActiveThreats() || _syncing()"
            [class.bg-boreal-blue/30]="_interceptSent()"
            [class.border-boreal-blue]="true"
            [class.text-boreal-blue]="true"
            [class.bg-boreal-blue/20]="!_interceptSent()"
            [class.shadow-lg]="_interceptSent()"
            [class.shadow-boreal-blue/30]="_interceptSent()"
            [class.opacity-40]="!hasActiveThreats() || _syncing()"
            [class.cursor-not-allowed]="!hasActiveThreats() || _syncing()"
          >
            <mat-icon class="!text-lg !w-5 !h-5">{{ _interceptSent() ? 'verified' : 'sensors' }}</mat-icon>
            <span class="text-[9px] font-bold uppercase tracking-widest leading-none">
              {{ _interceptSent() ? 'Requested ✓' : 'Req. Intercept' }}
            </span>
          </button>

          <button
            (click)="onSyncStatus()"
            class="flex h-14 flex-col items-center justify-center gap-0.5 rounded-sm border transition-all active:scale-[0.97]"
            [class.bg-boreal-green/10]="_synced()"
            [class.border-boreal-green]="_synced()"
            [class.text-boreal-green]="_synced()"
            [class.bg-boreal-panel-elevated]="!_synced() && !_syncing()"
            [class.border-boreal-border]="!_synced()"
            [class.text-boreal-text-muted]="!_synced() && !_syncing()"
          >
            <mat-icon class="!text-lg !w-5 !h-5" [class.animate-spin]="_syncing()">{{ _synced() ? 'cloud_done' : 'sync' }}</mat-icon>
            <span class="text-[9px] font-bold uppercase tracking-widest leading-none">
              {{ _syncing() ? 'Syncing…' : (_synced() ? 'In Sync ✓' : 'Sync Status') }}
            </span>
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100%; }
    .mat-icon { font-size: 20px; width: 20px; height: 20px; }
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
  mapPreserveAspectRatio = computed(() => this.layout.compact() ? 'xMidYMid meet' : 'xMidYMid slice');

  hasActiveThreats(): boolean {
    return this.tactical.activeThreats().length > 0;
  }

  projectTrack(track: ThreatTwin): { x: number; y: number; heading: number } | null {
    const geometry = track?.geometry;
    if (!geometry) return null;

    const x = this._projectCoordinate(geometry.x, TRACK_VIEWBOX_WIDTH, FIELD_VIEWBOX_WIDTH);
    const y = this._projectCoordinate(geometry.y, TRACK_VIEWBOX_HEIGHT, FIELD_VIEWBOX_HEIGHT);
    if (x === null || y === null) return null;

    const heading = Number.isFinite(geometry.heading) ? geometry.heading : 0;
    return { x, y, heading };
  }

  private _projectCoordinate(value: unknown, sourceSize: number, targetSize: number): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    const clamped = Math.max(0, Math.min(value, sourceSize));
    return (clamped / sourceSize) * targetSize;
  }

  private _formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes < 0) return 'Unknown size';
    if (bytes < 1024) return `${bytes.toFixed(0)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private _clearTimers(): void {
    if (this._toastTimer) clearTimeout(this._toastTimer);
    if (this._alertResetTimer) clearTimeout(this._alertResetTimer);
    if (this._interceptResetTimer) clearTimeout(this._interceptResetTimer);
    if (this._syncTimer) clearTimeout(this._syncTimer);
    if (this._syncResetTimer) clearTimeout(this._syncResetTimer);
    this._toastTimer = null;
    this._alertResetTimer = null;
    this._interceptResetTimer = null;
    this._syncTimer = null;
    this._syncResetTimer = null;
  }

  private _showToast(toast: Toast, duration = 2000): void {
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toast.set(toast);
    this._toastTimer = setTimeout(() => {
      this._toast.set(null);
      this._toastTimer = null;
    }, duration);
  }

  onSceneUpload(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.audit.log({
        actor: 'OPERATOR',
        action: 'Scene Upload Rejected',
        rationale: `Rejected ${file.name} because it is not an image.`,
        category: 'TACTICAL',
      });
      this._showToast({ message: 'Only image files are supported', icon: 'warning', type: 'warning' });
      if (input) input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : null;
      if (!dataUrl) {
        this._showToast({ message: 'Scene image could not be read', icon: 'warning', type: 'warning' });
        return;
      }

      this.sceneCapture.set({
        fileName: file.name,
        capturedAt: new Date().toISOString(),
        dataUrl,
        sizeLabel: this._formatBytes(file.size),
      });

      this.audit.log({
        actor: 'OPERATOR',
        action: 'Scene Image Uploaded',
        rationale: `Attached ${file.name} from the field scene for ${this.commanderLocation.label} at ${this.commanderLocation.sector}.`,
        category: 'TACTICAL',
      });
      this._showToast({ message: 'Scene image attached', icon: 'photo_camera', type: 'sync' });
    };

    reader.onerror = () => {
      this._showToast({ message: 'Scene image upload failed', icon: 'warning', type: 'warning' });
    };

    reader.readAsDataURL(file);
    if (input) input.value = '';
  }

  clearSceneCapture(): void {
    if (!this.sceneCapture()) return;
    this.sceneCapture.set(null);
    this.audit.log({
      actor: 'OPERATOR',
      action: 'Scene Image Cleared',
      rationale: `Cleared the current field scene image for ${this.commanderLocation.label}.`,
      category: 'TACTICAL',
    });
    this._showToast({ message: 'Scene image cleared', icon: 'close', type: 'warning' });
  }

  onAlertCommander(): void {
    const count = this.tactical.activeThreats().length;
    if (this._alertResetTimer) clearTimeout(this._alertResetTimer);
    this._alertSent.set(true);
    this.audit.log({
      actor: 'OPERATOR',
      action: 'Field Alert Sent',
      rationale: `Field terminal dispatched alert to commander: ${count} active track${count !== 1 ? 's' : ''} in theater.`,
      category: 'TACTICAL',
    });
    this._showToast({ message: 'Alert dispatched to commander', icon: 'report', type: 'alert' });
    this._alertResetTimer = setTimeout(() => {
      this._alertSent.set(false);
      this._alertResetTimer = null;
    }, RESET_SENT_MS);
  }

  onRequestIntercept(): void {
    if (!this.hasActiveThreats()) {
      this.audit.log({
        actor: 'OPERATOR',
        action: 'Intercept Request Blocked',
        rationale: 'Intercept request suppressed because no active tracks are currently available.',
        category: 'TACTICAL',
      });
      this._showToast({ message: 'No active tracks to intercept', icon: 'warning', type: 'warning' });
      return;
    }

    const track = this.tactical.activeThreats()[0];
    if (this._interceptResetTimer) clearTimeout(this._interceptResetTimer);
    this._interceptSent.set(true);
    this.audit.log({
      actor: 'OPERATOR',
      action: 'Intercept Requested',
      rationale: `Field operator requested intercept authorization${track ? ` for ${track.id} (${track.intent})` : ''}.`,
      category: 'TACTICAL',
    });
    this._showToast({ message: 'Intercept request transmitted', icon: 'sensors', type: 'intercept' });
    this._interceptResetTimer = setTimeout(() => {
      this._interceptSent.set(false);
      this._interceptResetTimer = null;
    }, RESET_SENT_MS);
  }

  onSyncStatus(): void {
    if (this._syncTimer) clearTimeout(this._syncTimer);
    if (this._syncResetTimer) clearTimeout(this._syncResetTimer);
    this._syncing.set(true);
    this._synced.set(false);
    this._syncTimer = setTimeout(() => {
      this._syncing.set(false);
      this._synced.set(true);
      this._showToast({ message: 'Status synchronized', icon: 'cloud_done', type: 'sync' }, 1800);
      this._syncResetTimer = setTimeout(() => {
        this._synced.set(false);
        this._syncResetTimer = null;
      }, SYNC_RESET_MS);
      this._syncTimer = null;
    }, SYNCING_MS);
  }
}
