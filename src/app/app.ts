import {ChangeDetectionStrategy, Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {NavRail} from './shared/ui/nav-rail';
import {CommandBar} from './shared/ui/command-bar';
import {RationaleDrawer} from './shared/ui/rationale-drawer';
import {PlannedCapabilityModal} from './shared/ui/planned-capability-modal';
import {SafetyBanner} from './shared/ui/safety-banner';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavRail, CommandBar, RationaleDrawer, PlannedCapabilityModal, SafetyBanner],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
