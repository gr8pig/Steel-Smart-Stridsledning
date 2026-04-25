import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CapabilityOrchestrator } from '../../core/services/capability-orchestrator';
import { ThemeManager } from '../../core/services/theme-manager';
import { TacticalStore } from '../../core/state/tactical.store';
import { FeatureFlagService } from '../../core/services/feature-flag.service';
import { ShellLayoutService } from '../../core/services/shell-layout.service';

@Component({
  selector: 'app-nav-rail',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  template: `
    <div
      class="fixed inset-y-0 left-0 z-40 flex w-[18rem] max-w-[85vw] -translate-x-full flex-col overflow-y-auto border-r border-boreal-border bg-boreal-panel py-4 text-boreal-text-primary shadow-2xl transition-transform duration-300 select-none lg:static lg:z-auto lg:h-full lg:w-16 lg:max-w-none lg:translate-x-0 lg:items-center lg:gap-2 lg:overflow-hidden lg:border-r lg:shadow-none"
      [class.translate-x-0]="layout.compact() && layout.navOpen()"
    >
      <div class="flex w-full items-center justify-between px-4 pb-3 lg:mb-4 lg:justify-center lg:px-0">
        <div class="flex items-center gap-3 lg:mb-0 lg:flex-col">
          <div class="flex h-10 w-10 items-center justify-center rounded-sm bg-boreal-blue shadow-lg shadow-boreal-blue/10">
            <mat-icon class="text-white">radar</mat-icon>
          </div>
          <div class="flex flex-col lg:hidden">
            <span class="text-[9px] font-black uppercase tracking-[0.25em] text-boreal-text-muted">Navigation</span>
            <span class="text-[10px] font-bold uppercase tracking-tight text-boreal-text-primary">Northern Vanguard</span>
          </div>
        </div>

        @if (layout.compact()) {
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-sm border border-boreal-border text-boreal-text-muted transition-colors hover:bg-boreal-panel-muted hover:text-boreal-text-primary lg:hidden"
            (click)="layout.closeNav()"
            aria-label="Close navigation drawer"
          >
            <mat-icon class="!text-sm">close</mat-icon>
          </button>
        }
      </div>

      <div class="flex flex-col w-full gap-2 px-3 lg:px-0">
        @for (item of visibleItems(); track item.path) {
          <a 
            [routerLink]="item.path" 
            routerLinkActive="bg-boreal-panel-muted/50 text-boreal-text-primary border-l-2 border-boreal-blue"
            class="relative flex items-center gap-3 rounded-sm border border-transparent px-4 py-3 text-boreal-text-muted transition-all hover:bg-boreal-panel-muted/50 hover:text-boreal-text-primary group lg:w-full lg:flex-col lg:items-center lg:justify-center lg:border-l-2 lg:px-0 lg:py-2"
            [title]="item.label"
            (click)="layout.closeNav()"
          >
            <mat-icon class="transition-transform group-hover:scale-110">{{item.icon}}</mat-icon>
            <span class="text-[10px] font-mono uppercase tracking-[0.15em] text-boreal-text-primary lg:hidden">
              {{item.label}}
            </span>
            <span class='hidden lg:block text-[7px] font-mono uppercase tracking-tighter text-boreal-text-muted text-center leading-tight mt-0.5 w-full truncate px-0.5'>
              {{item.label}}
            </span>
            
            @if (item.path === '/tactical' && tactical.activeThreats().length > 0) {
              <div class="absolute right-4 top-1/2 z-10 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-boreal-red ring-2 ring-boreal-panel animate-pulse lg:right-3 lg:top-3 lg:translate-y-0"></div>
            }

            <span class="pointer-events-none absolute left-14 z-[100] whitespace-nowrap border border-boreal-border bg-boreal-panel-elevated px-2 py-1 text-[8px] font-mono uppercase tracking-tighter opacity-0 transition-opacity group-hover:opacity-100 skew-x-[-4deg] lg:block hidden">
              {{item.label}}
            </span>
          </a>
        }
      </div>

      <div class="mt-auto flex w-full flex-col items-center gap-4 border-t border-boreal-border/30 px-3 pb-4 pt-6 lg:px-0">
        <!-- Station Illumination Toggle -->
        <button 
            (click)="theme.toggleTheme()"
            class="flex h-9 w-full items-center justify-center gap-2 rounded-sm border border-boreal-border text-boreal-text-muted transition-all focus:outline-none group hover:bg-boreal-blue/5 hover:text-boreal-blue lg:w-9 lg:flex-col lg:justify-center" 
            [title]="theme.theme() === 'dark' ? 'Switch to Day Operation (Light Theme)' : 'Switch to Night Operation (Dark Theme)'"
        >
          <mat-icon class="!text-[12px] !w-3 !h-3">{{ theme.theme() === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
          <span class="text-[9px] font-mono font-black uppercase tracking-tighter opacity-60 group-hover:opacity-100 lg:text-[6px]">MODE</span>
        </button>

        <!-- Station Context Module -->
        <div class="group relative flex cursor-help flex-col items-center gap-1">
          <div class="flex h-9 w-9 items-center justify-center rounded-sm border border-boreal-blue/20 bg-boreal-blue/5 text-boreal-blue shadow-inner transition-all group-hover:bg-boreal-blue group-hover:text-white">
            <mat-icon class="!text-sm">fingerprint</mat-icon>
          </div>
          <div class="text-[7px] font-mono font-black uppercase tracking-tighter text-boreal-text-muted transition-colors group-hover:text-boreal-blue">STN: 04</div>
          
          <!-- Context Tooltip -->
          <div class="pointer-events-none hidden w-56 rounded-sm border border-boreal-border bg-boreal-panel-elevated p-4 shadow-[10px_0_50px_var(--boreal-shadow)] group-hover:block absolute left-14 bottom-0 z-[100]">
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
            class="flex h-9 w-full items-center justify-center rounded-sm border border-white/5 text-zinc-600 transition-all focus:outline-none hover:bg-white/5 hover:text-white lg:w-9" 
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
  layout       = inject(ShellLayoutService);

  navItems = [
    { path: '/overview',        icon: 'dashboard',             label: 'Mission Overview',        flag: null },
    { path: '/tactical',        icon: 'track_changes',         label: 'Tactical Console',        flag: null },
    { path: '/c2-resilience',   icon: 'verified_user',          label: 'C2 Resilience Lab',       flag: null },
    { path: '/commander',       icon: 'account_tree',          label: 'Commander Orchestrator',  flag: null },
    { path: '/readiness',       icon: 'battery_charging_full', label: 'Base Resilience',         flag: null },
    { path: '/logistics',       icon: 'local_shipping',        label: 'Logistics & Supply',      flag: null },
    { path: '/reference',       icon: 'menu_book',             label: 'Reference Graph',         flag: null },
    { path: '/threat-inspector',icon: 'visibility',            label: 'Threat Inspector',        flag: null },
    { path: '/robustness-lab',  icon: 'science',               label: 'Robustness Lab',          flag: null },
    { path: '/counterfactual-lab', icon: 'psychology',          label: 'Counterfactual Lab',      flag: null },
    { path: '/governance',      icon: 'gavel',                 label: 'Governance',              flag: null },
    { path: '/authority',       icon: 'policy',                label: 'Authority Control',       flag: null },
    { path: '/knowledge-graph', icon: 'hub',                   label: 'Knowledge Graph (KGSA)',  flag: 'kgsa' },
    { path: '/drawing-board',    icon: 'draw',                  label: 'Drawing Board',           flag: null },
    { path: '/field',           icon: 'tablet_android',        label: 'Field Terminal',          flag: null },
    { path: '/demo',            icon: 'settings',              label: 'Demo Director',           flag: null },
  ];

  visibleItems() {
    return this.navItems.filter(item => !item.flag || this.flags.isEnabled(item.flag));
  }
}
