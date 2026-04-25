import {ChangeDetectionStrategy, Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {NavRail} from './shared/ui/nav-rail';
import {CommandBar} from './shared/ui/command-bar';
import {RationaleDrawer} from './shared/ui/rationale-drawer';
import {PlannedCapabilityModal} from './shared/ui/planned-capability-modal';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [RouterOutlet, NavRail, CommandBar, RationaleDrawer, PlannedCapabilityModal],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
