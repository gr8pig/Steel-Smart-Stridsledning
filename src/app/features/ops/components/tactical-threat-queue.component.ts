import { Component, ChangeDetectionStrategy, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TacticalStore } from '../../../core/state/tactical.store';
import { CapabilityLayerStore } from '../../../core/state/capability-layer.store';
import { ScenarioStore } from '../../../core/state/scenario.store';
import { SteelApiService } from '../../../core/services/steel-api.service';
import { AuditLogger } from '../../../core/services/audit-logger';

@Component({
  selector: 'app-tactical-threat-queue',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="tactical-panel tactical-panel--queue w-85 flex flex-col h-full">
      <div class="panel-header uppercase tracking-widest text-[10px] text-boreal-text-muted flex items-center justify-between mb-2">
        <span>Live Threats</span>
        <div class="flex items-center gap-1.5">
          <span class="px-1 rounded border text-[8px] font-black"
            [class.border-boreal-blue/40]="tactical.sync().source === 'AUTHORITATIVE'"
            [class.text-boreal-blue]="tactical.sync().source === 'AUTHORITATIVE'"
            [class.border-boreal-amber/40]="tactical.sync().source !== 'AUTHORITATIVE'"
            [class.text-boreal-amber]="tactical.sync().source !== 'AUTHORITATIVE'">
            {{ tactical.sync().source }}
          </span>
          <span class="bg-boreal-red/10 text-boreal-red px-1 rounded">{{capabilityStore.remappedTracks().length}} TOTAL</span>
          
          <div class='relative'>
            <button (click)='showScenarioPicker.set(!showScenarioPicker())'
              class='flex items-center gap-1 px-2 py-0.5 rounded-sm border border-boreal-border/50
                     text-[8px] font-black uppercase tracking-widest text-boreal-text-muted
                     hover:border-boreal-blue/50 hover:text-boreal-blue transition-all'>
              <mat-icon class='!text-[10px] !w-3 !h-3'>tune</mat-icon>
              SCENARIO
            </button>
            @if (showScenarioPicker()) {
              <div class='fixed inset-0 z-40' 
                   (click)='showScenarioPicker.set(false)'
                   (keydown.escape)='showScenarioPicker.set(false)'
                   (keydown.enter)='showScenarioPicker.set(false)'
                   tabindex="0" role="button" aria-label="Close scenario picker"></div>
              <div class='absolute left-0 top-full mt-1 z-50 w-64 bg-boreal-panel border
                          border-boreal-border rounded-sm shadow-2xl overflow-hidden'>
                <div class='px-3 py-2 text-[8px] font-black uppercase tracking-widest
                            text-boreal-text-muted bg-boreal-panel-muted/30 border-b border-boreal-border'>
                  Load Scenario Preset
                </div>
                @for (preset of scenarioPresets; track preset.id) {
                  <button (click)='loadPreset(preset)'
                    class='w-full flex items-start gap-3 px-3 py-2.5 text-left
                           hover:bg-boreal-panel-muted/50 border-b border-boreal-border/30
                           transition-colors last:border-0'>
                    <span class='shrink-0 mt-0.5 px-1 py-px rounded-sm text-[7px] font-black
                                 uppercase tracking-widest'
                          [class.bg-boreal-red/20]='preset.color === "boreal-red"'
                          [class.text-boreal-red]='preset.color === "boreal-red"'
                          [class.bg-boreal-amber/20]='preset.color === "boreal-amber"'
                          [class.text-boreal-amber]='preset.color === "boreal-amber"'>
                      {{preset.badge}}
                    </span>
                    <div class='flex flex-col min-w-0'>
                      <span class='text-[10px] font-bold text-boreal-text-primary uppercase
                                   tracking-tight truncate'>{{preset.name}}</span>
                      <span class='text-[8px] text-boreal-text-muted leading-relaxed mt-0.5'>
                        {{preset.description}}
                      </span>
                    </div>
                  </button>
                }
              </div>
            }
          </div>
        </div>
      </div>
      
      <div class="flex-grow overflow-y-auto select-none max-h-[400px]">
          @for (track of capabilityStore.remappedTracks(); track track.id) {
              <button 
                  (click)="onTrackClick(track.id)"
                  [class.bg-boreal-panel-elevated]="tactical.selectedTrackId() === track.id"
                  [class.border-l-3]="tactical.selectedTrackId() === track.id"
                  [class.border-boreal-blue]="tactical.selectedTrackId() === track.id"
                  class="w-full text-left p-4 border-b border-boreal-border hover:bg-boreal-panel-muted/50 transition-colors cursor-pointer group focus:outline-none focus:bg-boreal-panel-muted/50"
              >
                  <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-2">
                          <span class="text-[10px] font-mono text-boreal-text-muted">{{track.id}}</span>
                          @if (track.publicInterpretation; as pi) {
                              <span class="text-[10px] font-black text-boreal-blue uppercase tracking-tight">{{pi.displayName}}</span>
                          } @else {
                              <span class="text-xs font-bold leading-none" [class.text-boreal-red]="track.class === 'MISSILE'">{{track.class}}</span>
                          }
                      </div>
                      <span class="text-[10px] font-mono tabular-nums" [class.text-boreal-red]="track.timeToTarget < 100" [class.text-boreal-amber]="track.timeToTarget >= 100">
                          {{track.timeToTarget}}s
                      </span>
                  </div>
                  
                  <div class="flex items-center justify-between">
                      <div class="flex gap-1 items-center">
                          @if (track.publicInterpretation; as pi) {
                              <span class="px-1.5 py-0.5 rounded bg-boreal-blue/10 text-[8px] font-black border border-boreal-blue/20 text-boreal-blue uppercase">
                                  {{pi.steelAbstraction}}
                              </span>
                          } @else {
                              <span class="px-1.5 py-0.5 rounded bg-boreal-canvas/40 text-[9px] font-mono border border-boreal-border text-boreal-text-secondary uppercase">
                                  {{track.intent}}
                              </span>
                          }
                          <span class="text-[9px] text-boreal-text-muted font-medium italic">Conf: {{track.confidence * 100 | number:'1.0-0'}}%</span>
                      </div>
                      <mat-icon class="!text-xs text-boreal-text-muted opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</mat-icon>
                  </div>
              </button>
          } @empty {
              <div class="p-8 text-center text-boreal-text-muted text-xs italic">No active tracks detected.</div>
          }
      </div>

      <div class="p-3 bg-boreal-panel-muted/20 border-t border-boreal-border mt-auto">
           <div class="flex items-center justify-between text-[10px] text-boreal-text-muted mb-2">
              <span>SECTOR 4 STATUS</span>
              <span class="text-boreal-green">STABLE</span>
           </div>
           <div class="h-1 w-full bg-boreal-panel-elevated rounded-full">
              <div class="h-full bg-boreal-green w-3/4"></div>
           </div>
      </div>
    </div>
  `,
  styles: [`
    .w-85 { width: 340px; }
    .panel-header { padding: 4px 12px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TacticalThreatQueueComponent {
  tactical = inject(TacticalStore);
  capabilityStore = inject(CapabilityLayerStore);
  scenario = inject(ScenarioStore);
  api = inject(SteelApiService);
  audit = inject(AuditLogger);

  trackSelected = output<string>();

  onTrackClick(id: string) {
    this.trackSelected.emit(id);
  }


  readonly scenarioPresets = [
    { id: 'SCOUT_PROBE',    name: 'Scout Probe',           badge: 'RECON',      color: 'boreal-amber',
      description: '6 low-confidence feint probes — sensor and ID stress',
      phase: 'phase-1', tracks: [{ count: 6,  type: 'FEINT'   as const }], jamming: false },
    { id: 'DRONE_SWARM',    name: 'Drone Swarm',           badge: 'SWARM',      color: 'boreal-amber',
      description: '14 drone threats — exhaust intercept inventory',
      phase: 'phase-2', tracks: [{ count: 14, type: 'DRONE'   as const }], jamming: false },
    { id: 'KINETIC_STRIKE', name: 'Kinetic Strike',        badge: 'HI-VAL',     color: 'boreal-red',
      description: '7 cruise missiles at high confidence — COA decision required',
      phase: 'phase-3', tracks: [{ count: 7,  type: 'KINETIC' as const }], jamming: false },
    { id: 'SATURATION_WAVE',name: 'Saturation Wave',       badge: 'SATURATION', color: 'boreal-red',
      description: '12 mixed threats across all sectors — solver stress test',
      phase: 'phase-3', tracks: [{ count: 12, type: 'MIXED'   as const }], jamming: false },
    { id: 'FULL_SPECTRUM',  name: 'Full Spectrum + Jamming',badge: 'FULL SPEC', color: 'boreal-red',
      description: '8 feints + 6 kinetics under active jamming — worst case',
      phase: 'phase-3', tracks: [{ count: 8,  type: 'FEINT'   as const },
                                  { count: 6,  type: 'KINETIC' as const }], jamming: true },
  ] as const;

  showScenarioPicker = signal(false);

  loadPreset(preset: typeof this.scenarioPresets[number]): void {
    this.showScenarioPicker.set(false);
    this.scenario.reset();
    this.scenario.setPhase(preset.phase);
    this.scenario.setJamming(preset.jamming);
    this.tactical.clearTracks();
    this.api.resetScenario().subscribe(() => {
      for (const wave of preset.tracks) {
        this.api.injectTracks(wave.count, wave.type).subscribe();
      }
    });
    this.audit.log({ actor: 'OPERATOR', action: 'Scenario Loaded: ' + preset.name,
                     rationale: preset.description, category: 'SYSTEM' });
  }
}
