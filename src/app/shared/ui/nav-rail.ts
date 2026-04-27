import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CapabilityOrchestrator } from '../../core/services/capability-orchestrator';
import { ThemeManager } from '../../core/services/theme-manager';
import { TacticalStore } from '../../core/state/tactical.store';
import { FeatureFlagService } from '../../core/services/feature-flag.service';
import { ShellLayoutService } from '../../core/services/shell-layout.service';

interface NavItem {
  path: string;
  icon: string;
  label: string;
  flag: string | null;
}

interface NavGroup {
  id: string;
  label: string;
  icon: string;
  items: NavItem[];
  badge: () => boolean;
}

@Component({
  selector: 'app-nav-rail',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  template: `
    <aside
      class="fixed inset-y-0 left-0 z-40 flex w-[19rem] max-w-[88vw] -translate-x-full flex-col border-r border-boreal-border bg-boreal-panel/95 py-4 text-boreal-text-primary shadow-2xl backdrop-blur-md transition-transform duration-200 select-none lg:static lg:z-auto lg:h-full lg:w-72 lg:max-w-none lg:translate-x-0 lg:shadow-none"
      [class.translate-x-0]="layout.compact() && layout.navOpen()"
    >
      <div class="flex w-full items-center justify-between gap-3 px-4 pb-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-md bg-boreal-blue shadow-lg shadow-boreal-blue/10">
            <mat-icon class="text-white">radar</mat-icon>
          </div>
          <div class="flex flex-col">
            <span class="text-[9px] font-black uppercase tracking-[0.25em] text-boreal-text-muted">Navigation</span>
            <span class="text-[11px] font-bold uppercase tracking-[0.16em] text-boreal-text-primary">Northern Vanguard</span>
            <span class="text-[10px] text-boreal-text-muted">Command surface and mission tools</span>
          </div>
        </div>

        @if (layout.compact()) {
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-md border border-boreal-border text-boreal-text-muted transition-colors hover:bg-boreal-panel-muted hover:text-boreal-text-primary lg:hidden"
            (click)="layout.closeNav()"
            aria-label="Close navigation drawer"
          >
            <mat-icon class="!text-sm">close</mat-icon>
          </button>
        }
      </div>

      <nav aria-label="Primary" class="flex flex-1 flex-col overflow-y-auto overflow-x-hidden px-3 scrollbar-thin">
        @for (group of navGroups; track group.id) {
          @if (isGroupVisible(group)) {
            <section class="mt-4 first:mt-0">
              <div class="mb-2 flex items-center gap-2 px-3 text-[10px] font-black uppercase tracking-[0.22em] text-boreal-text-muted">
                <mat-icon class="!h-4 !w-4 !text-base opacity-70">{{group.icon}}</mat-icon>
                <span>{{group.label}}</span>
                @if (group.badge()) {
                  <span class="ml-auto h-2 w-2 rounded-full bg-boreal-red ring-2 ring-boreal-panel animate-pulse"></span>
                }
              </div>

              <div class="flex flex-col gap-1">
                @for (item of group.items; track item.path) {
                  @if (!item.flag || flags.isEnabled(item.flag)) {
                    <a
                      [routerLink]="item.path"
                      routerLinkActive="border-boreal-blue/40 bg-boreal-blue/10 text-boreal-text-primary ring-1 ring-inset ring-boreal-blue/20"
                      class="group relative flex min-h-11 items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-boreal-text-muted transition-all hover:border-boreal-border/70 hover:bg-boreal-panel-muted/70 hover:text-boreal-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boreal-blue/60"
                      [attr.aria-label]="item.label"
                      (click)="onItemClick()"
                    >
                      <span class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-boreal-border/60 bg-boreal-panel-muted/60 text-boreal-text-primary transition-colors group-hover:border-boreal-blue/30 group-hover:text-boreal-blue">
                        <mat-icon class="transition-transform group-hover:scale-110">{{item.icon}}</mat-icon>
                      </span>

                      <span class="min-w-0 flex-1">
                        <span class="block truncate text-[12px] font-semibold tracking-[0.02em] text-current">
                          {{item.label}}
                        </span>
                        <span class="block truncate text-[10px] uppercase tracking-[0.16em] text-boreal-text-muted">
                          {{group.label}}
                        </span>
                      </span>

                      @if (item.path === '/tactical' && tactical.activeThreats().length > 0) {
                        <span class="flex items-center gap-2 text-boreal-red">
                          <span class="h-2 w-2 rounded-full bg-boreal-red animate-pulse"></span>
                          <span class="text-[9px] font-black uppercase tracking-[0.18em]">Hot</span>
                        </span>
                      }
                    </a>
                  }
                }
              </div>
            </section>
          }
        }
      </nav>

      <div class="mt-auto border-t border-boreal-border/30 px-3 pb-4 pt-4">
        <div class="space-y-2">
          <button
            type="button"
            (click)="theme.toggleTheme()"
            class="flex min-h-11 w-full items-center gap-3 rounded-md border border-boreal-border bg-boreal-panel-muted/40 px-3 py-2 text-left text-boreal-text-muted transition-all hover:border-boreal-blue/30 hover:bg-boreal-blue/5 hover:text-boreal-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boreal-blue/60"
            [title]="theme.theme() === 'dark' ? 'Switch to Day Operation (Light Theme)' : 'Switch to Night Operation (Dark Theme)'"
        >
            <span class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-boreal-border/60 bg-boreal-panel text-boreal-text-primary">
              <mat-icon>{{ theme.theme() === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-[10px] font-black uppercase tracking-[0.18em]">Appearance</span>
              <span class="block truncate text-[11px] text-current">
                {{ theme.theme() === 'dark' ? 'Night operation enabled' : 'Day operation enabled' }}
              </span>
            </span>
          </button>

          <div class="rounded-md border border-boreal-border bg-boreal-panel-muted/30 p-3">
            <div class="mb-3 flex items-start justify-between gap-3">
              <div>
                <div class="text-[10px] font-black uppercase tracking-[0.22em] text-boreal-text-muted">Operational Node</div>
                <div class="mt-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-boreal-text-primary">Northern Vanguard</div>
              </div>
              <span class="flex h-9 w-9 items-center justify-center rounded-md border border-boreal-blue/20 bg-boreal-blue/5 text-boreal-blue shadow-inner">
                <mat-icon class="!text-sm">fingerprint</mat-icon>
              </span>
            </div>

            <div class="space-y-2 text-[10px]">
              <div class="flex items-center justify-between gap-3">
                <span class="uppercase tracking-[0.16em] text-boreal-text-muted">Role ID</span>
                <span class="font-black uppercase tracking-[0.14em] text-boreal-blue">Alpha_Cmd_01</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="uppercase tracking-[0.16em] text-boreal-text-muted">Link State</span>
                <span class="font-black uppercase tracking-[0.16em] text-boreal-green">Synchronized</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="uppercase tracking-[0.16em] text-boreal-text-muted">Audit Loop</span>
                <span class="font-black uppercase tracking-[0.16em] text-boreal-amber">Active</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            (click)="orchestrator.showFeature('system-config')"
            class="flex min-h-11 w-full items-center gap-3 rounded-md border border-boreal-border bg-boreal-panel-muted/40 px-3 py-2 text-left text-boreal-text-muted transition-all hover:border-boreal-border/80 hover:bg-boreal-panel-muted hover:text-boreal-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boreal-blue/60"
            title="System Configuration"
          >
            <span class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-boreal-border/60 bg-boreal-panel text-boreal-text-primary">
              <mat-icon class="!text-sm">settings_input_component</mat-icon>
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-[10px] font-black uppercase tracking-[0.18em]">System</span>
              <span class="block truncate text-[11px] text-current">Configuration and station controls</span>
            </span>
          </button>
        </div>
      </div>
    </aside>
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

  navItems: NavItem[] = [
    { path: '/overview',        icon: 'dashboard',             label: 'Mission Overview',        flag: null },
    { path: '/tactical',        icon: 'track_changes',         label: 'Tactical Console',        flag: null },
    { path: '/lab/c2-resilience', icon: 'verified_user',        label: 'C2 Resilience Lab',       flag: null },
    { path: '/commander',       icon: 'account_tree',          label: 'Commander Orchestrator',  flag: null },
    { path: '/lab/readiness',   icon: 'battery_charging_full', label: 'Base Resilience',         flag: null },
    { path: '/logistics',       icon: 'local_shipping',        label: 'Logistics & Supply',      flag: null },
    { path: '/threat-inspector',icon: 'visibility',            label: 'Threat Inspector',        flag: null },
    { path: '/lab/robustness',  icon: 'science',               label: 'Robustness Lab',          flag: null },
    { path: '/lab/counterfactual', icon: 'psychology',          label: 'Counterfactual Lab',      flag: null },
    { path: '/governance',      icon: 'gavel',                 label: 'Governance',              flag: null },
    { path: '/authority',       icon: 'policy',                label: 'Authority Control',       flag: null },
    { path: '/governance/knowledge-graph', icon: 'hub',                   label: 'Knowledge Graph (KGSA)',  flag: 'kgsa' },
    { path: '/lab/drawing-board', icon: 'draw',                label: 'Drawing Board',           flag: null },
    { path: '/lab/force-catalog', icon: 'inventory_2',         label: 'Force Catalog Lab',      flag: null },
    { path: '/lab/forest',     icon: 'park',                  label: 'Forest Constellation',   flag: null },
    { path: '/field',           icon: 'tablet_android',        label: 'Field Terminal',          flag: null },
    { path: '/demo',            icon: 'settings',              label: 'Demo Director',           flag: null },
  ];

  navGroups: NavGroup[] = [
    {
      id: 'ops',
      label: 'Operations',
      icon: 'dashboard',
      items: this.navItems.filter(item => [
        '/overview',
        '/tactical',
        '/threat-inspector',
        '/field',
      ].includes(item.path)),
      badge: () => this.tactical.activeThreats().length > 0,
    },
    {
      id: 'lab',
      label: 'Labs',
      icon: 'science',
      items: this.navItems.filter(item => item.path.startsWith('/lab/')),
      badge: () => false,
    },
    {
      id: 'command',
      label: 'Command',
      icon: 'account_tree',
      items: this.navItems.filter(item => [
        '/commander',
        '/authority',
        '/demo',
      ].includes(item.path)),
      badge: () => false,
    },
    {
      id: 'governance',
      label: 'Governance',
      icon: 'gavel',
      items: this.navItems.filter(item => [
        '/governance',
        '/governance/knowledge-graph',
        '/logistics',
      ].includes(item.path)),
      badge: () => false,
    },
  ];

  isGroupVisible(group: NavGroup): boolean {
    return group.items.some(item => !item.flag || this.flags.isEnabled(item.flag));
  }

  onItemClick(): void {
    if (this.layout.compact()) {
      this.layout.closeNav();
    }
  }
}
