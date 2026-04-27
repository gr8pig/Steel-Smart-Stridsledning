import {ChangeDetectionStrategy, Component} from '@angular/core';
import {inject} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {NavRail} from './nav-rail';
import {CommandBar} from './command-bar';
import {RationaleDrawer} from './rationale-drawer';
import {PlannedCapabilityModal} from './planned-capability-modal';
import {ShellLayoutService} from '../../core/services/shell-layout.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-shell-layout',
  imports: [RouterOutlet, NavRail, CommandBar, RationaleDrawer, PlannedCapabilityModal],
  template: `
    <div class="relative flex min-h-dvh w-full flex-col overflow-x-hidden bg-boreal-canvas text-boreal-text-primary lg:h-dvh lg:flex-row lg:overflow-hidden">
      @if (shell.compact() && shell.navOpen()) {
        <button
          type="button"
          class="fixed inset-0 z-30 cursor-default bg-boreal-canvas/60 backdrop-blur-[1px] lg:hidden"
          (click)="shell.closeNav()"
          aria-label="Close navigation drawer"
        ></button>
      }

      <app-nav-rail></app-nav-rail>

      <div class="flex min-w-0 flex-1 flex-col">
        <app-command-bar></app-command-bar>

        <main class="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <router-outlet />
        </main>
      </div>

      <app-rationale-drawer></app-rationale-drawer>
      <app-planned-capability-modal></app-planned-capability-modal>
    </div>
  `,
})
export class ShellLayoutComponent {
  shell = inject(ShellLayoutService);
}
