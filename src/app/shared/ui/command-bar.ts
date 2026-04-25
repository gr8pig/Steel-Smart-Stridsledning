import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ScenarioStore } from '../../core/state/scenario.store';
import { PolicyStore } from '../../core/state/policy.store';
import { SensorFeedStore } from '../../core/state/sensor-feed.store';
import { AuditLogger } from '../../core/services/audit-logger';
import { DecisionFabricStore } from '../../core/state/decision-fabric.store';
import { CapabilityOrchestrator } from '../../core/services/capability-orchestrator';
import { RationaleOrchestrator } from './rationale-drawer';
import { CapabilityLayerSwitch } from './capability-layer-switch';
import { ShellLayoutService } from '../../core/services/shell-layout.service';

@Component({
  selector: 'app-command-bar',
  standalone: true,
  imports: [MatIconModule, CommonModule, CapabilityLayerSwitch, RouterLink],
  template: `
    <div class="flex flex-col gap-2 border-b border-boreal-border bg-boreal-canvas/80 px-3 py-2 backdrop-blur-xl select-none z-50 sm:px-4 lg:h-14 lg:flex-row lg:items-center lg:justify-between lg:px-6">
      <!-- Left: Operational Context -->
      <div class="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 lg:gap-6">
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-sm border border-boreal-border bg-boreal-panel-muted text-boreal-text-muted transition-colors hover:bg-boreal-panel-elevated hover:text-boreal-text-primary lg:hidden"
          (click)="layout.toggleNav()"
          [attr.aria-label]="layout.navOpen() ? 'Close navigation drawer' : 'Open navigation drawer'"
        >
          <mat-icon class="!text-base">{{ layout.navOpen() ? 'close' : 'menu' }}</mat-icon>
        </button>

        <div class="flex min-w-0 flex-col">
          <span class="text-[8px] font-mono font-black text-boreal-text-muted uppercase tracking-[0.2em]">Scenario</span>
          <span class="truncate text-[11px] font-bold uppercase tracking-tight text-boreal-text-primary sm:text-[12px]">{{scenario.scenarioName()}}</span>
        </div>

        <div class="hidden h-6 w-px bg-boreal-border lg:block"></div>

        <div class="flex flex-col">
          <span class="text-[8px] font-mono font-black text-boreal-text-muted uppercase tracking-[0.2em]">Authority</span>
          <div class="flex items-center gap-1.5">
            <div class="w-1.5 h-1.5 rounded-full" [class]="getAuthorityColor()"></div>
            <span class="text-[10px] font-mono font-black text-boreal-text-primary uppercase tracking-widest">{{policy.activePolicy()?.guardrails?.engagementAuthority}}</span>
          </div>
        </div>

        <div class="hidden h-6 w-px bg-boreal-border lg:block"></div>

        <div class="hidden sm:flex flex-col">
          <span class="text-[8px] font-mono font-black text-boreal-text-muted uppercase tracking-[0.2em]">Phase</span>
          <span class="text-[10px] font-mono font-bold text-boreal-green uppercase tracking-wide">{{scenario.currentPhase()?.name}}</span>
        </div>

        <div class="hidden h-6 w-px bg-boreal-border lg:block"></div>

        <app-capability-layer-switch class="hidden lg:block" />
      </div>

      <!-- Right: System Controls & Station Status -->
      <div class="flex flex-wrap items-center justify-end gap-2 lg:gap-3">
        @if (scenario.isJamming()) {
            <div class="hidden animate-pulse items-center gap-2 rounded-sm border border-boreal-red/20 bg-boreal-red/10 px-2 py-1 sm:flex">
                <mat-icon class="text-boreal-red !text-[10px] !w-2.5 !h-2.5">wifi_off</mat-icon>
                <span class="text-[8px] font-black text-boreal-red uppercase tracking-[0.15em]">EW: Saturation Jamming</span>
            </div>
        }

        <!-- Fabric Health Indicator -->
        <a 
          routerLink="/c2-resilience"
          class="flex h-9 items-center gap-2 rounded-sm border border-boreal-border bg-boreal-panel-muted px-3 no-underline transition-all group cursor-pointer hover:border-boreal-blue/40"
        >
          <div class="flex flex-col items-end">
            <span class="text-[7px] font-mono text-boreal-text-muted uppercase tracking-widest leading-none mb-0.5">Fabric Health</span>
            <span class="text-[9px] font-black uppercase tracking-tighter transition-colors group-hover:text-boreal-blue leading-none" [class]="getFabricStatusClass()">{{fabric.status()}}</span>
          </div>
          <div class="w-1 h-4 rounded-full" [class]="getFabricBarClass()"></div>
        </a>

        <div class="hidden h-6 w-px bg-boreal-border mx-1 lg:block"></div>

        <!-- Playback / Replay Module -->
        <div class="hidden sm:flex h-9 items-center gap-3 border border-boreal-border bg-boreal-panel-muted px-3 shadow-inner sm:gap-4">
          <div class="flex flex-col items-end">
            <span class="text-[7px] font-mono text-boreal-text-muted uppercase tracking-widest">T-Sim</span>
            <span class="text-xs font-mono font-bold tabular-nums text-boreal-text-primary leading-none">{{formatTime(scenario.simTime())}}</span>
          </div>
          <div class="flex gap-1.5 border-l border-boreal-border pl-3">
            <button (click)="togglePlayback()" class="p-1 hover:bg-boreal-blue/10 rounded-sm text-boreal-text-muted hover:text-boreal-blue transition-all">
                <mat-icon class="!text-sm">{{scenario.runState() === 'RUNNING' ? 'pause' : 'play_arrow'}}</mat-icon>
            </button>
            <button (click)="resetScenario()" class="p-1 hover:bg-boreal-blue/10 rounded-sm text-boreal-text-muted hover:text-boreal-blue transition-all">
                <mat-icon class="!text-sm">refresh</mat-icon>
            </button>
          </div>
        </div>

        <div class="hidden h-6 w-px bg-boreal-border mx-1 lg:block"></div>

        <!-- Boreal Station Semantics -->
        <div class="hidden sm:flex items-center gap-1">
             <!-- ALERTS -->
             <button 
                (click)="orchestrator.showFeature('detailed-alerts')"
                class="w-9 h-9 flex items-center justify-center text-boreal-text-muted hover:text-boreal-red transition-all relative border border-transparent hover:border-boreal-red/20 hover:bg-boreal-red/10 rounded-sm" title="Tactical Alerts"
             >
                <mat-icon class="!text-base">notifications_none</mat-icon>
                @if (alertCount() > 0) {
                    <span class="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-boreal-red rounded-full ring-2 ring-boreal-canvas animate-pulse"></span>
                }
             </button>

             <!-- AUDIT (Governance Log) -->
             <button 
                (click)="orchestrator.showFeature('audit-log-export')"
                class="w-9 h-9 flex items-center justify-center text-boreal-text-muted hover:text-boreal-text-primary transition-all border border-transparent hover:border-boreal-border/40 hover:bg-boreal-panel-muted rounded-sm" title="Governance Audit Trail"
             >
                <mat-icon class="!text-base">terminal</mat-icon>
             </button>

             <!-- TRACE -->
             <button 
                (click)="orchestrator.showFeature('policy-trace')"
                class="w-9 h-9 flex items-center justify-center text-boreal-text-muted hover:text-boreal-blue transition-all border border-transparent hover:border-boreal-blue/20 hover:bg-boreal-blue/10 rounded-sm" title="Policy Logic Trace"
             >
                <mat-icon class="!text-base">biotech</mat-icon>
             </button>

             <!-- REPLAY -->
             <button 
                (click)="orchestrator.showFeature('replay-scrub')"
                class="w-9 h-9 flex items-center justify-center text-boreal-text-muted hover:text-boreal-green transition-all border border-transparent hover:border-boreal-green/20 hover:bg-boreal-green/10 rounded-sm" title="Scenario Replay Controls"
             >
                <mat-icon class="!text-base">history</mat-icon>
             </button>
        </div>

        <div class="h-6 w-px bg-boreal-border mx-1"></div>

        <!-- Rationale Toggle -->
        <button 
            (click)="rationale.toggle()" 
            class="flex h-9 items-center gap-2 rounded-sm border border-boreal-blue/30 bg-boreal-blue/10 px-4 font-bold text-boreal-text-primary transition-all group hover:bg-boreal-blue/20"
        >
            <mat-icon class="text-boreal-blue !text-sm group-hover:scale-110 transition-transform">security</mat-icon>
            <span class="hidden text-[9px] font-black uppercase tracking-[0.2em] sm:inline">Rationale</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommandBar {
  scenario = inject(ScenarioStore);
  policy = inject(PolicyStore);
  audit = inject(AuditLogger);
  fabric = inject(DecisionFabricStore);
  orchestrator = inject(CapabilityOrchestrator);
  rationale = inject(RationaleOrchestrator);
  sensorFeed = inject(SensorFeedStore);
  layout = inject(ShellLayoutService);

  alertCount = computed(() => this.audit.logs().length);

  getFabricStatusClass(): string {
    const status = this.fabric.status();
    switch (status) {
      case 'HEALTHY': return 'text-boreal-green';
      case 'STRESSED': return 'text-boreal-amber';
      case 'COLLAPSED': return 'text-boreal-red';
      default: return 'text-boreal-text-muted';
    }
  }

  getFabricBarClass(): string {
    const status = this.fabric.status();
    switch (status) {
      case 'HEALTHY': return 'bg-boreal-green';
      case 'STRESSED': return 'bg-boreal-amber animate-pulse';
      case 'COLLAPSED': return 'bg-boreal-red animate-pulse';
      default: return 'bg-boreal-panel-muted';
    }
  }

  togglePlayback(): void {
    if (this.scenario.runState() === 'RUNNING') {
      this.scenario.setRunState('PAUSED');
      this.sensorFeed.setFeedMode('LIVE');
    } else {
      this.scenario.setRunState('RUNNING');
      this.sensorFeed.setFeedMode('REPLAY');
    }
  }

  resetScenario(): void {
    this.scenario.reset();
    this.sensorFeed.setFeedMode('LIVE');
  }

  getAuthorityColor(): string {
    const auth = this.policy.activePolicy()?.guardrails?.engagementAuthority;
    switch (auth) {
        case 'AUTO': return 'bg-boreal-red animate-pulse';
        case 'SEMI': return 'bg-boreal-amber';
        case 'MANUAL': return 'bg-boreal-text-muted';
        default: return 'bg-boreal-panel-muted';
    }
  }

  formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}
