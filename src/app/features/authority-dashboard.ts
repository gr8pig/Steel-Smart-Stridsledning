import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { PolicyStore } from '../core/state/policy.store';
import { TacticalStore } from '../core/state/tactical.store';
import { AuditLogger } from '../core/services/audit-logger';
import { PolicyTwin } from '../shared/domain/models';

type AuthLevel = PolicyTwin['guardrails']['engagementAuthority'];

interface AuthProfile {
  level: AuthLevel;
  hitlLabel: string;
  headline: string;
  description: string;
  engagementEffect: string;
  frictionLabel: string;
  color: string;
  icon: string;
}

const AUTH_PROFILES: AuthProfile[] = [
  {
    level: 'MANUAL',
    hitlLabel: 'HITL',
    headline: 'Human In The Loop',
    description: 'Every engagement requires explicit operator confirmation before execution. The system surfaces a confirmation gate and will not fire without positive authorization.',
    engagementEffect: 'Engagement blocked until operator presses AUTHORIZE. Maximum friction; maximum accountability.',
    frictionLabel: 'HIGH — Confirmation required',
    color: 'boreal-red',
    icon: 'lock',
  },
  {
    level: 'SEMI',
    hitlLabel: 'HOTL',
    headline: 'Human On The Loop',
    description: 'System recommends and queues engagements. Operator receives the recommendation and may override or hold; execution proceeds if no objection is raised within the engagement window.',
    engagementEffect: 'Recommendation shown; operator may hold or override. Default path proceeds without explicit confirmation.',
    frictionLabel: 'MEDIUM — Override available',
    color: 'boreal-amber',
    icon: 'manage_accounts',
  },
  {
    level: 'AUTO',
    hitlLabel: 'HNLT',
    headline: 'Human Not In The Loop',
    description: 'System executes engagements autonomously when policy and COA criteria are met. Operator retains post-hoc review capability via audit log. Requires explicit commander authorization.',
    engagementEffect: 'Engagements execute when policy thresholds are satisfied. Operator is notified after execution.',
    frictionLabel: 'LOW — Automated execution',
    color: 'boreal-blue',
    icon: 'bolt',
  },
];

@Component({
  selector: 'app-authority-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full w-full p-6 flex flex-col gap-6 overflow-hidden text-boreal-text-secondary bg-boreal-canvas">

      <!-- Header -->
      <header class="flex items-start justify-between border-b border-boreal-border pb-4">
        <div class="flex flex-col gap-1">
          <h1 class="text-3xl font-light tracking-tight text-boreal-text-primary uppercase tracking-[0.2em]">Authority Control</h1>
          <p class="text-boreal-text-muted text-[10px] font-mono uppercase tracking-widest italic">
            Human-Machine Engagement Authority Surface
          </p>
        </div>
        <!-- Tempo / Pressure Gauge -->
        <div class="flex flex-col items-end gap-2">
          <span class="text-[9px] text-boreal-text-muted uppercase font-black tracking-widest">Theater Pressure</span>
          <div class="flex items-center gap-3">
            <div class="flex gap-1 items-end h-6">
              @for (bar of pressureBars(); track bar.i) {
                <div class="w-2 rounded-sm transition-all duration-500"
                  [style.height.px]="bar.height"
                  [class.bg-boreal-red]="vm().pressureLevel === 'HIGH'"
                  [class.bg-boreal-amber]="vm().pressureLevel === 'MODERATE'"
                  [class.bg-boreal-blue]="vm().pressureLevel === 'LOW'"
                  [class.bg-boreal-text-muted]="vm().pressureLevel === 'QUIET'"
                  [class.opacity-30]="!bar.active"
                ></div>
              }
            </div>
            <div class="flex flex-col items-end">
              <span class="text-sm font-black uppercase tracking-widest"
                [class.text-boreal-red]="vm().pressureLevel === 'HIGH'"
                [class.text-boreal-amber]="vm().pressureLevel === 'MODERATE'"
                [class.text-boreal-blue]="vm().pressureLevel === 'LOW'"
                [class.text-boreal-text-muted]="vm().pressureLevel === 'QUIET'"
              >{{ vm().pressureLevel }}</span>
              <span class="text-[9px] font-mono text-boreal-text-muted">{{ vm().activeThreats }} active threats</span>
            </div>
          </div>
        </div>
      </header>

      <div class="grid grid-cols-12 gap-6 flex-grow min-h-0">

        <!-- Left: Mode Selector -->
        <div class="col-span-12 lg:col-span-4 flex flex-col gap-4 overflow-y-auto">
          <div class="bg-boreal-panel border border-boreal-border rounded-sm overflow-hidden shadow-2xl">
            <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted">
              Current Authority Mode
            </div>
            <div class="p-4 space-y-3">
              @for (profile of authProfiles; track profile.level) {
                @let isActive = vm().currentLevel === profile.level;
                <button
                  (click)="setAuthority(profile.level)"
                  class="w-full text-left p-4 rounded-sm border transition-all group focus:outline-none"
                  [class.border-boreal-red]="isActive && profile.level === 'MANUAL'"
                  [class.bg-boreal-red/5]="isActive && profile.level === 'MANUAL'"
                  [class.shadow-boreal-red]="isActive && profile.level === 'MANUAL'"
                  [class.border-boreal-amber]="isActive && profile.level === 'SEMI'"
                  [class.bg-boreal-amber/5]="isActive && profile.level === 'SEMI'"
                  [class.border-boreal-blue]="isActive && profile.level === 'AUTO'"
                  [class.bg-boreal-blue/5]="isActive && profile.level === 'AUTO'"
                  [class.border-boreal-border]="!isActive"
                  [class.hover:border-boreal-text-muted]="!isActive"
                >
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-sm border flex items-center justify-center transition-colors"
                        [class.bg-boreal-red/10]="profile.level === 'MANUAL'"
                        [class.border-boreal-red/30]="profile.level === 'MANUAL' && isActive"
                        [class.text-boreal-red]="profile.level === 'MANUAL'"
                        [class.bg-boreal-amber/10]="profile.level === 'SEMI'"
                        [class.border-boreal-amber/30]="profile.level === 'SEMI' && isActive"
                        [class.text-boreal-amber]="profile.level === 'SEMI'"
                        [class.bg-boreal-blue/10]="profile.level === 'AUTO'"
                        [class.border-boreal-blue/30]="profile.level === 'AUTO' && isActive"
                        [class.text-boreal-blue]="profile.level === 'AUTO'"
                        [class.border-boreal-border]="!isActive"
                      >
                        <mat-icon class="!text-base">{{ profile.icon }}</mat-icon>
                      </div>
                      <div class="flex flex-col">
                        <span class="text-[10px] font-black uppercase tracking-[0.2em]"
                          [class.text-boreal-red]="profile.level === 'MANUAL' && isActive"
                          [class.text-boreal-amber]="profile.level === 'SEMI' && isActive"
                          [class.text-boreal-blue]="profile.level === 'AUTO' && isActive"
                          [class.text-boreal-text-muted]="!isActive"
                        >{{ profile.hitlLabel }}</span>
                        <span class="text-[9px] text-boreal-text-muted font-mono uppercase tracking-wider">{{ profile.level }}</span>
                      </div>
                    </div>
                    @if (isActive) {
                      <div class="flex items-center gap-1.5">
                        <span class="w-1.5 h-1.5 rounded-full animate-pulse"
                          [class.bg-boreal-red]="profile.level === 'MANUAL'"
                          [class.bg-boreal-amber]="profile.level === 'SEMI'"
                          [class.bg-boreal-blue]="profile.level === 'AUTO'"
                        ></span>
                        <span class="text-[8px] font-black uppercase tracking-widest text-boreal-text-muted">ACTIVE</span>
                      </div>
                    }
                  </div>
                  <p class="text-[10px] text-boreal-text-secondary leading-relaxed">{{ profile.headline }}</p>
                  @if (isActive) {
                    <div class="mt-3 pt-3 border-t border-boreal-border space-y-1.5 animate-in fade-in duration-300">
                      <div class="flex items-start gap-2">
                        <mat-icon class="!text-[10px] text-boreal-text-muted mt-0.5">info</mat-icon>
                        <p class="text-[9px] text-boreal-text-secondary italic leading-relaxed">{{ profile.engagementEffect }}</p>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-[8px] text-boreal-text-muted uppercase tracking-widest">Friction:</span>
                        <span class="text-[8px] font-black uppercase tracking-wider"
                          [class.text-boreal-red]="profile.level === 'MANUAL'"
                          [class.text-boreal-amber]="profile.level === 'SEMI'"
                          [class.text-boreal-blue]="profile.level === 'AUTO'"
                        >{{ profile.frictionLabel }}</span>
                      </div>
                    </div>
                  }
                </button>
              }
            </div>
          </div>

          <!-- HITL/HOTL/HNLT Reference Card -->
          <div class="bg-boreal-panel border border-boreal-border rounded-sm overflow-hidden shadow-xl">
            <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted">
              Authority Doctrine Reference
            </div>
            <div class="p-4 space-y-3 text-[9px]">
              <div class="flex gap-3">
                <span class="text-boreal-red font-black uppercase tracking-widest w-10">HITL</span>
                <span class="text-boreal-text-muted italic">Human must authorize each action. System cannot fire without positive confirmation. Maximum accountability chain.</span>
              </div>
              <div class="flex gap-3 border-t border-boreal-border pt-3">
                <span class="text-boreal-amber font-black uppercase tracking-widest w-10">HOTL</span>
                <span class="text-boreal-text-muted italic">Human monitors and can override. System proceeds unless operator intervenes within the decision window.</span>
              </div>
              <div class="flex gap-3 border-t border-boreal-border pt-3">
                <span class="text-boreal-blue font-black uppercase tracking-widest w-10">HNLT</span>
                <span class="text-boreal-text-muted italic">System acts autonomously within policy bounds. Human reviews audit trail post-hoc. Requires explicit commander authorization.</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Audit Log (authority changes + recent engagements) -->
        <div class="col-span-12 lg:col-span-8 bg-boreal-panel border border-boreal-border rounded-sm flex flex-col overflow-hidden shadow-2xl">
          <div class="panel-header uppercase tracking-widest text-[10px] font-bold text-boreal-text-muted flex justify-between items-center px-6 h-12">
            <div class="flex items-center gap-3">
              <span>Authority Change Log</span>
              <span class="px-2 py-0.5 bg-boreal-panel-elevated border border-boreal-border rounded text-[8px] font-mono text-boreal-text-muted">
                {{ vm().authorityLogs.length }} EVENTS
              </span>
            </div>
            <span class="text-boreal-text-muted/40 font-mono text-[9px]">IMMUTABLE TRACE</span>
          </div>

          <!-- Current Mode Summary -->
          <div class="px-6 py-3 bg-boreal-canvas/40 border-b border-boreal-border grid grid-cols-3 gap-6">
            <div class="flex flex-col gap-1">
              <span class="text-[8px] text-boreal-text-muted uppercase font-bold tracking-widest">Current Authority</span>
              <div class="flex items-center gap-2">
                <span class="text-sm font-black uppercase tracking-widest"
                  [class.text-boreal-red]="vm().currentLevel === 'MANUAL'"
                  [class.text-boreal-amber]="vm().currentLevel === 'SEMI'"
                  [class.text-boreal-blue]="vm().currentLevel === 'AUTO'"
                >{{ vm().hitlLabel }}</span>
                <span class="text-[9px] text-boreal-text-muted font-mono">({{ vm().currentLevel }})</span>
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-[8px] text-boreal-text-muted uppercase font-bold tracking-widest">Engagement Friction</span>
              <span class="text-[11px] font-bold uppercase tracking-tight"
                [class.text-boreal-red]="vm().currentLevel === 'MANUAL'"
                [class.text-boreal-amber]="vm().currentLevel === 'SEMI'"
                [class.text-boreal-blue]="vm().currentLevel === 'AUTO'"
              >{{ vm().currentProfile?.frictionLabel }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-[8px] text-boreal-text-muted uppercase font-bold tracking-widest">Active Threats</span>
              <div class="flex items-center gap-2">
                <span class="text-[11px] font-black font-mono"
                  [class.text-boreal-red]="vm().activeThreats > 3"
                  [class.text-boreal-amber]="vm().activeThreats > 0 && vm().activeThreats <= 3"
                  [class.text-boreal-text-muted]="vm().activeThreats === 0"
                >{{ vm().activeThreats }}</span>
                <span class="text-[9px] text-boreal-text-muted">in theater</span>
              </div>
            </div>
          </div>

          <!-- Log Table -->
          <div class="flex-grow overflow-y-auto">
            @if (vm().authorityLogs.length === 0) {
              <div class="flex flex-col items-center justify-center h-full gap-4 opacity-20">
                <mat-icon class="!text-4xl">history</mat-icon>
                <span class="text-xs uppercase tracking-widest font-bold">No Authority Changes Logged</span>
              </div>
            } @else {
              <table class="w-full text-left border-collapse">
                <thead class="bg-boreal-canvas/60 text-[9px] text-boreal-text-muted uppercase sticky top-0 z-20">
                  <tr>
                    <th class="px-6 py-3 font-bold border-b border-boreal-border tracking-widest">Time</th>
                    <th class="px-6 py-3 font-bold border-b border-boreal-border tracking-widest">Actor</th>
                    <th class="px-6 py-3 font-bold border-b border-boreal-border tracking-widest">Event</th>
                    <th class="px-6 py-3 font-bold border-b border-boreal-border tracking-widest">Rationale</th>
                  </tr>
                </thead>
                <tbody class="text-[11px]">
                  @for (log of vm().authorityLogs; track log.id) {
                    <tr class="border-b border-boreal-border/30 hover:bg-boreal-panel-muted/20 transition-colors group">
                      <td class="px-6 py-4 font-mono text-boreal-text-muted whitespace-nowrap">{{ log.time }}</td>
                      <td class="px-6 py-4">
                        <span class="px-2 py-0.5 rounded-[1px] text-[9px] font-bold tracking-widest uppercase border"
                          [class.bg-boreal-blue/10]="log.actor === 'SYSTEM'"
                          [class.border-boreal-blue/30]="log.actor === 'SYSTEM'"
                          [class.text-boreal-blue]="log.actor === 'SYSTEM'"
                          [class.bg-boreal-panel-muted]="log.actor !== 'SYSTEM'"
                          [class.border-boreal-border]="log.actor !== 'SYSTEM'"
                          [class.text-boreal-text-secondary]="log.actor !== 'SYSTEM'"
                        >{{ log.actor }}</span>
                      </td>
                      <td class="px-6 py-4 font-bold text-boreal-text-primary uppercase tracking-tight">{{ log.action }}</td>
                      <td class="px-6 py-4 text-boreal-text-secondary italic leading-relaxed pr-8">{{ log.rationale }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>

          <div class="p-3 bg-boreal-canvas/40 border-t border-boreal-border flex justify-between items-center">
            <span class="text-[8px] text-boreal-text-muted font-mono opacity-40">
              Authority chain governed by POL-01 // Changes propagate to all tactical stations
            </span>
            <div class="flex items-center gap-2 opacity-30">
              <mat-icon class="!text-xs">security</mat-icon>
              <span class="text-[8px] uppercase font-bold tracking-widest">SIEM Integrated</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display: block; height: 100%; } .mat-icon { font-size: 16px; width: 16px; height: 16px; }`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthorityDashboard {
  policy   = inject(PolicyStore);
  tactical = inject(TacticalStore);
  audit    = inject(AuditLogger);

  readonly authProfiles = AUTH_PROFILES;

  // Derive pressure bars (5 bars, filled based on threat count)
  pressureBars = () => {
    const count = this.tactical.activeThreats().length;
    const filled = Math.min(5, Math.ceil(count / 2));
    return [1, 2, 3, 4, 5].map(i => ({ i, height: 6 + i * 4, active: i <= filled }));
  };

  vm = computed(() => {
    const policy       = this.policy.activePolicy();
    const currentLevel = policy?.guardrails.engagementAuthority ?? 'SEMI';
    const activeThreats = this.tactical.activeThreats().length;

    const hitlMap: Record<AuthLevel, string> = { AUTO: 'HNLT', SEMI: 'HOTL', MANUAL: 'HITL' };
    const pressureMap: Record<string, string> = {
      '0': 'QUIET', '1': 'LOW', '2': 'LOW', '3': 'MODERATE',
      '4': 'MODERATE', '5': 'MODERATE',
    };
    const pressureLevel = pressureMap[String(Math.min(activeThreats, 5))] ?? 'HIGH';

    // Filter audit logs to authority-relevant events
    const authorityLogs = this.audit.logs().filter(l =>
      l.action.includes('Authority') || l.action.includes('Engagement Action') || l.action.includes('Intent Published')
    );

    const currentProfile = AUTH_PROFILES.find(p => p.level === currentLevel) ?? null;

    return {
      currentLevel,
      hitlLabel: hitlMap[currentLevel],
      currentProfile,
      activeThreats,
      pressureLevel,
      authorityLogs,
    };
  });

  setAuthority(level: AuthLevel) {
    this.policy.setEngagementAuthority(level);
  }
}
