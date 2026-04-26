import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommanderHeaderPanel } from './components/commander-header-panel';
import { CommanderReadinessProjection } from './components/commander-readiness-projection';
import { CommanderPolicyPanel } from './components/commander-policy-panel';
import { CommanderFrontierPanel } from './components/commander-frontier-panel';
import { CommanderOutcomePanel } from './components/commander-outcome-panel';

@Component({
  selector: 'app-commander-orchestrator',
  standalone: true,
  imports: [
    CommanderHeaderPanel,
    CommanderReadinessProjection,
    CommanderPolicyPanel,
    CommanderFrontierPanel,
    CommanderOutcomePanel,
  ],
  template: `
    <div class="commander-shell h-full w-full overflow-y-auto overflow-x-hidden bg-boreal-canvas text-boreal-text-primary selection:bg-boreal-blue/20">
      <div class="commander-shell__glow"></div>
      <div class="relative z-10 mx-auto flex min-h-full w-full max-w-[1800px] flex-col gap-4 p-4 lg:p-6">
        <app-commander-header-panel />
        <app-commander-readiness-projection />

        <div class="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div class="xl:col-span-3">
            <app-commander-policy-panel />
          </div>

          <div class="xl:col-span-6">
            <app-commander-frontier-panel />
          </div>

          <div class="xl:col-span-3">
            <app-commander-outcome-panel />
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .commander-shell {
      position: relative;
    }

    .commander-shell__glow {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        radial-gradient(circle at 12% 12%, rgba(59, 130, 246, 0.08), transparent 24%),
        radial-gradient(circle at 88% 0%, rgba(16, 185, 129, 0.05), transparent 20%),
        linear-gradient(180deg, rgba(255, 255, 255, 0.015), transparent 18%);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommanderOrchestrator {}
