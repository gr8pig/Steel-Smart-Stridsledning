import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TacticalStore } from '../core/state/tactical.store';
import { ReadinessStore } from '../core/state/readiness.store';
import { AuditLogger } from '../core/services/audit-logger';

interface Toast { message: string; icon: string; type: 'alert' | 'intercept' | 'sync'; }

// Base dots scaled from tactical viewBox 1670×1300 → field viewBox 400×300
const FIELD_BASES = [
  { name: 'NVB',  x: 47,  y: 77,  side: 'north' },
  { name: 'HRC',  x: 201, y: 17,  side: 'north' },
  { name: 'BWP',  x: 277, y: 89,  side: 'north' },
  { name: 'FWS',  x: 335, y: 247, side: 'south' },
  { name: 'SRD',  x: 77,  y: 231, side: 'south' },
];

@Component({
  selector: 'app-field-console',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full w-full flex flex-col bg-boreal-canvas overflow-hidden">

      <!-- Confirmation toast -->
      @if (_toast()) {
        <div class="absolute top-12 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-sm border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 flex items-center gap-2"
          [class.bg-boreal-red/20]="_toast()!.type === 'alert'"
          [class.border-boreal-red/50]="_toast()!.type === 'alert'"
          [class.text-boreal-red]="_toast()!.type === 'alert'"
          [class.bg-boreal-blue/20]="_toast()!.type === 'intercept'"
          [class.border-boreal-blue/50]="_toast()!.type === 'intercept'"
          [class.text-boreal-blue]="_toast()!.type === 'intercept'"
          [class.bg-boreal-green/20]="_toast()!.type === 'sync'"
          [class.border-boreal-green/50]="_toast()!.type === 'sync'"
          [class.text-boreal-green]="_toast()!.type === 'sync'"
        >
          <mat-icon class="!text-sm !w-4 !h-4">{{ _toast()!.icon }}</mat-icon>
          <span class="text-[10px] font-black uppercase tracking-widest">{{ _toast()!.message }}</span>
        </div>
      }

      <!-- Header bar -->
      <header class="flex items-center justify-between px-4 py-2 border-b border-boreal-border flex-shrink-0">
        <div class="flex items-center gap-3">
          <span class="text-[10px] font-mono uppercase tracking-widest text-boreal-text-muted">
            Field Terminal — Northern Vanguard
          </span>
          <span class="w-1.5 h-1.5 rounded-full bg-boreal-green animate-pulse"></span>
          <span class="text-[8px] font-mono text-boreal-green uppercase tracking-widest">SYNCHRONIZED</span>
        </div>
        <div class="flex gap-3">
          <span class="px-2 py-0.5 rounded border border-boreal-red/40 bg-boreal-red/10 text-boreal-red text-[9px] font-mono font-bold">
            {{ tactical.activeThreats().length }} TRK
          </span>
          <span class="px-2 py-0.5 rounded border border-boreal-blue/40 bg-boreal-blue/10 text-boreal-blue text-[9px] font-mono font-bold">
            {{ avgReadiness() }}% RDY
          </span>
        </div>
      </header>

      <!-- Full-bleed SVG map -->
      <div class="flex-grow relative">
        <svg viewBox="0 0 400 300" class="w-full h-full" preserveAspectRatio="xMidYMid slice">

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
            <g [attr.transform]="'translate(' + trackX(track.geometry.x) + ',' + trackY(track.geometry.y) + ') rotate(' + track.geometry.heading + ')'">
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

      <!-- Bottom action bar -->
      <div class="flex gap-2 p-3 border-t border-boreal-border flex-shrink-0 bg-boreal-panel">
        <button
          (click)="onAlertCommander()"
          class="flex-1 h-14 flex flex-col items-center justify-center gap-0.5 rounded-sm border transition-all active:scale-[0.97]"
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
          class="flex-1 h-14 flex flex-col items-center justify-center gap-0.5 rounded-sm border transition-all active:scale-[0.97]"
          [class.bg-boreal-blue/30]="_interceptSent()"
          [class.border-boreal-blue]="true"
          [class.text-boreal-blue]="true"
          [class.bg-boreal-blue/20]="!_interceptSent()"
          [class.shadow-lg]="_interceptSent()"
          [class.shadow-boreal-blue/30]="_interceptSent()"
        >
          <mat-icon class="!text-lg !w-5 !h-5">{{ _interceptSent() ? 'verified' : 'sensors' }}</mat-icon>
          <span class="text-[9px] font-bold uppercase tracking-widest leading-none">
            {{ _interceptSent() ? 'Requested ✓' : 'Req. Intercept' }}
          </span>
        </button>

        <button
          (click)="onSyncStatus()"
          class="flex-1 h-14 flex flex-col items-center justify-center gap-0.5 rounded-sm border transition-all active:scale-[0.97]"
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
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .mat-icon { font-size: 20px; width: 20px; height: 20px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FieldConsole {
  tactical  = inject(TacticalStore);
  readiness = inject(ReadinessStore);
  audit     = inject(AuditLogger);

  readonly bases = FIELD_BASES;

  readonly _syncing       = signal(false);
  readonly _synced        = signal(false);
  readonly _alertSent     = signal(false);
  readonly _interceptSent = signal(false);
  readonly _toast         = signal<Toast | null>(null);

  avgReadiness = computed(() => {
    const bases = this.readiness.bases();
    if (!bases.length) return 0;
    return Math.round(bases.reduce((sum, b) => sum + b.readiness * 100, 0) / bases.length);
  });

  trackX(x: number): number { return x * 400 / 1670; }
  trackY(y: number): number { return y * 300 / 1300; }

  private _showToast(toast: Toast, duration = 2000): void {
    this._toast.set(toast);
    setTimeout(() => this._toast.set(null), duration);
  }

  onAlertCommander(): void {
    const count = this.tactical.activeThreats().length;
    this._alertSent.set(true);
    this.audit.log({
      actor: 'OPERATOR',
      action: 'Field Alert Sent',
      rationale: `Field terminal dispatched alert to commander: ${count} active track${count !== 1 ? 's' : ''} in theater.`,
      category: 'TACTICAL',
    });
    this._showToast({ message: 'Alert dispatched to commander', icon: 'report', type: 'alert' });
    setTimeout(() => this._alertSent.set(false), 4000);
  }

  onRequestIntercept(): void {
    const track = this.tactical.activeThreats()[0];
    this._interceptSent.set(true);
    this.audit.log({
      actor: 'OPERATOR',
      action: 'Intercept Requested',
      rationale: `Field operator requested intercept authorization${track ? ` for ${track.id} (${track.intent})` : ''}.`,
      category: 'TACTICAL',
    });
    this._showToast({ message: 'Intercept request transmitted', icon: 'sensors', type: 'intercept' });
    setTimeout(() => this._interceptSent.set(false), 4000);
  }

  onSyncStatus(): void {
    this._syncing.set(true);
    this._synced.set(false);
    setTimeout(() => {
      this._syncing.set(false);
      this._synced.set(true);
      this._showToast({ message: 'Status synchronized', icon: 'cloud_done', type: 'sync' }, 1800);
      setTimeout(() => this._synced.set(false), 5000);
    }, 1200);
  }
}
