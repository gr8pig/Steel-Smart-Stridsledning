import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {RouterLink} from '@angular/router';
import {ScenarioStore} from '../core/state/scenario.store';

type MeshMode = 'redundant' | 'degraded' | 'isolated';

interface MeshProfile {
  id: MeshMode;
  label: string;
  summary: string;
  score: number;
  latency: string;
  packetLoss: string;
  posture: string;
  tone: 'blue' | 'green' | 'amber';
}

const MESH_PROFILES: Record<MeshMode, MeshProfile> = {
  redundant: {
    id: 'redundant',
    label: 'Redundant Mesh',
    summary: 'Primary and secondary C2 links are live with automatic failover and stable retransmission depth.',
    score: 94,
    latency: '62 ms',
    packetLoss: '< 1%',
    posture: 'RESILIENT',
    tone: 'green'
  },
  degraded: {
    id: 'degraded',
    label: 'Degraded Mesh',
    summary: 'One relay is impaired. Command traffic still flows, but the failover path is carrying most of the load.',
    score: 73,
    latency: '118 ms',
    packetLoss: '4%',
    posture: 'WATCH',
    tone: 'amber'
  },
  isolated: {
    id: 'isolated',
    label: 'Isolated Node',
    summary: 'The command mesh is partitioned. The lab is evaluating satellite relay and burst sync fallback paths.',
    score: 41,
    latency: '306 ms',
    packetLoss: '17%',
    posture: 'CRITICAL',
    tone: 'blue'
  }
};

@Component({
  selector: 'app-c2-resilience-lab',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink],
  template: `
    <div class="h-full w-full overflow-y-auto bg-boreal-canvas p-6 text-boreal-text-primary">
      <header class="mb-6 flex flex-col gap-3 border-b border-boreal-border pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div class="space-y-1">
          <div class="flex items-center gap-3">
            <h1 class="text-3xl font-light tracking-[0.2em] uppercase">C2 Resilience Lab</h1>
            <span class="rounded-sm border border-boreal-blue/30 bg-boreal-blue/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-boreal-blue">LIVE</span>
          </div>
          <p class="text-[10px] font-mono uppercase tracking-widest italic text-boreal-text-muted">
            Command-and-control hardening, mesh survivability, and degraded-link recovery.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <div class="rounded-sm border border-boreal-border bg-boreal-panel-muted/20 px-3 py-2">
            <div class="text-[8px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Scenario</div>
            <div class="text-[11px] font-bold uppercase text-boreal-text-primary">{{ scenario.scenarioName() }}</div>
          </div>
          <a
            routerLink="/reference"
            class="rounded-sm border border-boreal-border px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-boreal-text-muted hover:text-boreal-text-primary hover:border-boreal-blue/30 transition-all"
          >
            Back to Atlas
          </a>
        </div>
      </header>

      <div class="grid min-h-0 grid-cols-12 gap-4">
        <section class="design-card col-span-12 lg:col-span-4 !p-0 overflow-hidden">
          <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted bg-boreal-panel-muted/20">Mesh Controls</div>
          <div class="p-4 space-y-3">
            @for (profile of profiles; track profile.id) {
              <button
                (click)="mode.set(profile.id)"
                class="w-full rounded-sm border p-3 text-left transition-all"
                [class.border-boreal-blue/40]="mode() === profile.id"
                [class.bg-boreal-blue/10]="mode() === profile.id"
                [class.border-boreal-border]="mode() !== profile.id"
                [class.bg-boreal-panel-muted/20]="mode() !== profile.id"
              >
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <span
                      class="h-2 w-2 rounded-full"
                      [class.bg-boreal-blue]="profile.tone === 'blue'"
                      [class.bg-boreal-green]="profile.tone === 'green'"
                      [class.bg-boreal-amber]="profile.tone === 'amber'">
                    </span>
                    <span class="text-[11px] font-bold uppercase tracking-tight text-boreal-text-primary">{{ profile.label }}</span>
                  </div>
                  <span class="text-[8px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">{{ profile.posture }}</span>
                </div>
                <p class="mt-2 text-[10px] leading-relaxed text-boreal-text-muted">{{ profile.summary }}</p>
              </button>
            }
          </div>
        </section>

        <section class="design-card col-span-12 lg:col-span-5 !p-0 overflow-hidden">
          <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted bg-boreal-panel-muted/20">Command Mesh / Failover Map</div>
          <div class="relative flex min-h-[420px] items-center justify-center overflow-hidden bg-boreal-canvas/30 p-6">
            <div class="absolute inset-0 opacity-[0.04]" style="background-image: radial-gradient(circle, var(--boreal-text-primary) 1px, transparent 1px); background-size: 36px 36px;"></div>

            <div class="relative h-[360px] w-full max-w-[420px]">
              <div class="absolute left-1/2 top-6 -translate-x-1/2 rounded-sm border border-boreal-border bg-boreal-panel px-4 py-3 text-center shadow-2xl">
                <div class="text-[8px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Command Core</div>
                <div class="mt-1 text-sm font-bold uppercase text-boreal-text-primary">Alpha_Cmd_01</div>
              </div>

              <div class="absolute left-6 top-1/2 -translate-y-1/2 rounded-sm border border-boreal-border bg-boreal-panel px-4 py-3 text-center">
                <div class="text-[8px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Relay West</div>
                <div class="mt-1 text-[10px] font-bold uppercase text-boreal-text-primary">UPLINK</div>
              </div>

              <div class="absolute right-6 top-1/2 -translate-y-1/2 rounded-sm border border-boreal-border bg-boreal-panel px-4 py-3 text-center">
                <div class="text-[8px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Relay East</div>
                <div class="mt-1 text-[10px] font-bold uppercase text-boreal-text-primary">UPLINK</div>
              </div>

              <div class="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-sm border border-boreal-border bg-boreal-panel px-4 py-3 text-center shadow-2xl">
                <div class="text-[8px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Burst Fallback</div>
                <div class="mt-1 text-[10px] font-bold uppercase text-boreal-text-primary">SATCOM</div>
              </div>

              <svg class="absolute inset-0 h-full w-full" viewBox="0 0 420 360" fill="none">
                <line x1="210" y1="70" x2="70" y2="180" stroke="var(--boreal-blue)" stroke-width="1.5" opacity="0.35"></line>
                <line x1="210" y1="70" x2="350" y2="180" stroke="var(--boreal-blue)" stroke-width="1.5" opacity="0.35"></line>
                <line x1="70" y1="180" x2="350" y2="180" stroke="var(--boreal-green)" stroke-width="1.5" opacity="0.28" stroke-dasharray="4 4"></line>
                <line x1="210" y1="70" x2="210" y2="300" stroke="var(--boreal-amber)" stroke-width="1.5" opacity="0.3" stroke-dasharray="6 6"></line>
              </svg>

              <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-boreal-blue/30 bg-boreal-blue/10 px-8 py-10 text-center shadow-[0_0_40px_rgba(59,130,246,0.15)]">
                <div class="text-[8px] font-black uppercase tracking-[0.3em] text-boreal-blue">C2 Node</div>
                <div class="mt-2 text-3xl font-mono font-black">{{ profile().score }}</div>
                <div class="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Resilience Score</div>
              </div>
            </div>
          </div>
        </section>

        <section class="design-card col-span-12 lg:col-span-3 !p-0 overflow-hidden">
          <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted bg-boreal-panel-muted/20">Telemetry</div>
          <div class="space-y-4 p-4">
            <div class="rounded-sm border border-boreal-border bg-boreal-panel-muted/20 p-4">
              <div class="text-[8px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Mode</div>
              <div class="mt-1 text-sm font-bold uppercase text-boreal-text-primary">{{ profile().label }}</div>
              <p class="mt-2 text-[10px] leading-relaxed text-boreal-text-muted">{{ profile().summary }}</p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="rounded-sm border border-boreal-border bg-boreal-canvas/60 p-3">
                <div class="text-[7px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Latency</div>
                <div class="mt-1 text-lg font-mono font-bold text-boreal-text-primary">{{ profile().latency }}</div>
              </div>
              <div class="rounded-sm border border-boreal-border bg-boreal-canvas/60 p-3">
                <div class="text-[7px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Packet Loss</div>
                <div class="mt-1 text-lg font-mono font-bold text-boreal-text-primary">{{ profile().packetLoss }}</div>
              </div>
              <div class="rounded-sm border border-boreal-border bg-boreal-canvas/60 p-3">
                <div class="text-[7px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">State</div>
                <div class="mt-1 text-lg font-mono font-bold text-boreal-text-primary">{{ scenario.isJamming() ? 'EW ACTIVE' : 'CLEAR' }}</div>
              </div>
              <div class="rounded-sm border border-boreal-border bg-boreal-canvas/60 p-3">
                <div class="text-[7px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Posture</div>
                <div class="mt-1 text-lg font-mono font-bold text-boreal-text-primary">{{ profile().posture }}</div>
              </div>
            </div>

            <div class="rounded-sm border border-boreal-border bg-boreal-panel-muted/20 p-4">
              <div class="text-[8px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Operating Note</div>
              <p class="mt-2 text-[10px] leading-relaxed text-boreal-text-secondary">
                The C2 mesh is being evaluated as a survivability surface, not a static status board. Use the mode selector to compare link collapse against redundant routing.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class C2ResilienceLab {
  readonly scenario = inject(ScenarioStore);
  readonly mode = signal<MeshMode>('redundant');
  readonly profiles = Object.values(MESH_PROFILES);

  readonly profile = computed(() => MESH_PROFILES[this.mode()]);
}
