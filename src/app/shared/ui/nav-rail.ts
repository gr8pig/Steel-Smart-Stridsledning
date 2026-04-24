import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CapabilityOrchestrator } from '../../core/services/capability-orchestrator';
import { ThemeManager } from '../../core/services/theme-manager';
import { TacticalStore } from '../../core/state/tactical.store';
import { FeatureFlagService } from '../../core/services/feature-flag.service';

@Component({
  selector: 'app-nav-rail',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  template: `
    <div class="flex flex-col h-full bg-boreal-panel border-r border-boreal-border w-16 items-center py-4 gap-6 select-none">
      <div class="w-10 h-10 bg-boreal-blue rounded-sm flex items-center justify-center mb-4 cursor-pointer shadow-lg shadow-boreal-blue/10">
        <mat-icon class="text-white">radar</mat-icon>
      </div>

      <div class="flex flex-col w-full gap-2">
        @for (item of visibleItems(); track item.path) {
          <a 
            [routerLink]="item.path" 
            routerLinkActive="bg-boreal-panel-muted/50 text-boreal-text-primary border-l-2 border-boreal-blue"
            class="flex flex-col items-center justify-center w-full py-4 text-boreal-text-muted hover:text-boreal-text-primary transition-all cursor-pointer group relative border-l-2 border-transparent"
            [title]="item.label"
          >
            <mat-icon class="transition-transform group-hover:scale-110">{{item.icon}}</mat-icon>
            
            @if (item.path === '/tactical' && tactical.activeThreats().length > 0) {
              <div class="absolute top-3 right-3 w-1.5 h-1.5 bg-boreal-red rounded-full ring-2 ring-boreal-panel animate-pulse z-10"></div>
            }

            <span class="text-[8px] mt-1 font-mono uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap absolute left-14 bg-boreal-panel-elevated px-2 py-1 border border-boreal-border z-[100] pointer-events-none skew-x-[-4deg]">
              {{item.label}}
            </span>
          </a>
        }
      </div>

      <div class="mt-auto w-full flex flex-col items-center gap-4 pb-4 border-t border-boreal-border/30 pt-6">
        <!-- Station Illumination Toggle -->
        <button 
            (click)="theme.toggleTheme()"
            class="w-9 h-9 rounded-sm border border-boreal-border flex flex-col items-center justify-center text-boreal-text-muted hover:text-boreal-blue hover:bg-boreal-blue/5 transition-all focus:outline-none group" 
            [title]="theme.theme() === 'dark' ? 'Switch to Day Operation (Light Theme)' : 'Switch to Night Operation (Dark Theme)'"
        >
          <mat-icon class="!text-[12px] !w-3 !h-3">{{ theme.theme() === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
          <span class="text-[6px] font-mono font-black uppercase tracking-tighter mt-0.5 opacity-60 group-hover:opacity-100">MODE</span>
        </button>

        <!-- Station Context Module -->
        <div class="flex flex-col items-center gap-1 group relative cursor-help">
          <div class="w-9 h-9 rounded-sm bg-boreal-blue/5 border border-boreal-blue/20 flex items-center justify-center text-boreal-blue group-hover:bg-boreal-blue group-hover:text-white transition-all shadow-inner">
            <mat-icon class="!text-sm">fingerprint</mat-icon>
          </div>
          <div class="text-[7px] font-mono font-black text-boreal-text-muted uppercase tracking-tighter group-hover:text-boreal-blue transition-colors">STN: 04</div>
          
          <!-- Context Tooltip -->
          <div class="hidden group-hover:block absolute left-14 bottom-0 bg-boreal-panel-elevated border border-boreal-border p-4 rounded-sm z-[100] shadow-[10px_0_50px_var(--boreal-shadow)] w-56 pointer-events-none">
            <div class="text-[9px] font-black text-boreal-text-primary uppercase tracking-[0.2em] mb-3 border-b border-boreal-border pb-2">Operational Node Status</div>
            <div class="space-y-2.5">
              <div class="flex justify-between items-center">
                <span class="text-[8px] text-boreal-text-muted uppercase font-mono">Role ID</span>
                <span class="text-[9px] text-boreal-blue font-black uppercase">Alpha_Cmd_01</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-[8px] text-boreal-text-muted uppercase font-mono">Territory</span>
                <span class="text-[9px] text-boreal-text-primary font-bold uppercase tracking-tighter">Northern Vanguard</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-[8px] text-boreal-text-muted uppercase font-mono">Link State</span>
                <span class="text-[9px] text-boreal-green font-black uppercase tracking-widest animate-pulse">Synchronized</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-[8px] text-boreal-text-muted uppercase font-mono">Audit Loop</span>
                <span class="text-[9px] text-boreal-amber font-black uppercase tracking-widest">Active</span>
              </div>
            </div>
            <div class="mt-4 pt-2 border-t border-boreal-border text-[7px] font-mono text-boreal-text-muted uppercase tracking-widest text-center">
              Encryption: TLS_1.3_AES_256
            </div>
          </div>
        </div>

        <button 
            (click)="orchestrator.showFeature('system-config')"
            class="w-9 h-9 rounded-sm border border-white/5 flex items-center justify-center text-zinc-600 hover:text-white hover:bg-white/5 transition-all focus:outline-none" 
            title="System Configuration"
        >
          <mat-icon class="!text-sm">settings_input_component</mat-icon>
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
export class NavRail {
  orchestrator = inject(CapabilityOrchestrator);
  theme        = inject(ThemeManager);
  tactical     = inject(TacticalStore);
  flags        = inject(FeatureFlagService);

  navItems = [
    { path: '/overview',        icon: 'dashboard',             label: 'Mission Overview',        flag: null },
    { path: '/tactical',        icon: 'crosshairs',            label: 'Tactical Console',        flag: null },
    { path: '/commander',       icon: 'account_tree',          label: 'Commander Orchestrator',  flag: null },
    { path: '/readiness',       icon: 'battery_charging_full', label: 'Base Resilience',         flag: null },
    { path: '/logistics',       icon: 'local_shipping',        label: 'Logistics & Supply',      flag: null },
    { path: '/threat-inspector',icon: 'visibility',            label: 'Threat Inspector',        flag: null },
    { path: '/robustness-lab',  icon: 'science',               label: 'Robustness Lab',          flag: null },
    { path: '/governance',      icon: 'gavel',                 label: 'Governance',              flag: null },
    { path: '/authority',       icon: 'policy',                label: 'Authority Control',       flag: null },
    { path: '/knowledge-graph', icon: 'hub',                   label: 'Knowledge Graph (KGSA)',  flag: 'kgsa' },
    { path: '/field',           icon: 'tablet_android',        label: 'Field Terminal',          flag: null },
    { path: '/demo',            icon: 'settings',              label: 'Demo Director',           flag: null },
  ];

  visibleItems() {
    return this.navItems.filter(item => !item.flag || this.flags.isEnabled(item.flag));
  }
}
