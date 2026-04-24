import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ScenarioStore } from '../core/state/scenario.store';
import { TacticalStore } from '../core/state/tactical.store';
import { PolicyStore } from '../core/state/policy.store';
import { OrchestrationStore } from '../core/state/orchestration.store';
import { Router } from '@angular/router';
import { AuditLogger } from '../core/services/audit-logger';
import { BdtApiService } from '../core/services/bdt-api.service';

@Component({
  selector: 'app-demo-director',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full w-full p-6 flex flex-col gap-6 overflow-y-auto bg-boreal-canvas text-boreal-text-secondary">
      <header class="flex flex-col gap-1 border-b border-boreal-border pb-4">
        <h1 class="text-3xl font-light tracking-tight text-boreal-text-primary uppercase tracking-[0.2em] mb-1">Demo Director</h1>
        <div class="flex items-center gap-4">
            <p class="text-boreal-amber text-[10px] font-bold uppercase tracking-widest italic">Theater Orchestration Internal Control Surface</p>
            <div class="h-px flex-grow bg-boreal-border"></div>
            @if (orchestration.activeStory(); as story) {
                <div class="flex items-center gap-2 px-3 py-1 bg-boreal-blue/10 border border-boreal-blue/30 rounded-sm">
                    <span class="text-[8px] text-boreal-blue uppercase font-black tracking-widest">Active Story: {{ story.name }}</span>
                </div>
            }
            <div class="flex items-center gap-2 pl-4">
                <span class="text-[9px] text-boreal-text-muted uppercase font-bold tracking-widest">Auth Level: DIRECTOR</span>
            </div>
        </div>
      </header>

      <div class="grid grid-cols-12 gap-6 pb-12">
        <!-- Phase & Injector Controls -->
        <div class="col-span-12 lg:col-span-8 flex flex-col gap-6">
            
            <section class="bg-boreal-panel border border-boreal-border rounded-sm overflow-hidden flex flex-col shadow-2xl">
                <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted bg-boreal-panel-muted/20 flex justify-between">
                    <span>Scenario Phases</span>
                    <span class="text-[8px] font-mono opacity-40">FORCE STATE SEQUENCING</span>
                </div>
                <div class="p-4 space-y-2">
                    @for (phase of scenario.phases(); track phase.id) {
                        <div 
                            class="flex items-center justify-between p-4 bg-boreal-canvas/30 border rounded-sm transition-all group"
                            [class.border-boreal-blue/40]="phase.status === 'ACTIVE'"
                            [class.bg-boreal-blue/5]="phase.status === 'ACTIVE'"
                            [class.border-boreal-border]="phase.status !== 'ACTIVE'"
                        >
                            <div class="flex items-center gap-4">
                                <span class="w-2 h-2 rounded-full" 
                                    [class.bg-boreal-green]="phase.status === 'COMPLETED'"
                                    [class.bg-boreal-blue]="phase.status === 'ACTIVE'"
                                    [class.bg-boreal-text-muted/20]="phase.status === 'UPCOMING'"
                                    [class.animate-pulse]="phase.status === 'ACTIVE'"
                                ></span>
                                <div class="flex flex-col">
                                    <div class="flex items-center gap-2">
                                        <span class="text-xs font-bold uppercase tracking-tight" [class.text-boreal-blue]="phase.status === 'ACTIVE'">{{phase.name}}</span>
                                        @if (phase.status === 'ACTIVE') {
                                            <span class="text-[8px] px-1.5 py-0.5 rounded-full bg-boreal-blue/20 text-boreal-blue font-bold uppercase tracking-[0.2em]">Live</span>
                                        }
                                    </div>
                                    <span class="text-[10px] text-boreal-text-muted mt-0.5">{{phase.description}}</span>
                                </div>
                            </div>
                            <button (click)="scenario.setPhase(phase.id)" 
                                [disabled]="phase.status === 'ACTIVE'"
                                class="px-4 py-1.5 bg-boreal-panel-elevated border border-boreal-border rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-boreal-panel-muted active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                                {{ phase.status === 'ACTIVE' ? 'Primary' : 'Trigger' }}
                            </button>
                        </div>
                    }
                </div>
            </section>

            <!-- Mission Path Shortcuts -->
             <section class="bg-boreal-panel border border-boreal-border rounded-sm overflow-hidden flex flex-col shadow-2xl">
                <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted bg-boreal-panel-muted/20 text-boreal-text-muted px-4 py-2">Strategic Narrative Jumps</div>
                <div class="p-6 grid grid-cols-2 gap-4">
                    <button 
                        (click)="applyResilienceShift()"
                        class="p-6 bg-boreal-panel-elevated border border-boreal-blue/20 rounded-sm hover:border-boreal-blue/60 transition-all flex flex-col gap-4 text-left group shadow-lg"
                    >
                        <div class="flex items-center justify-between">
                            <mat-icon class="text-boreal-blue !w-8 !h-8 !text-2xl">shield</mat-icon>
                            <span class="text-[10px] text-boreal-text-muted font-mono">FLOW_01</span>
                        </div>
                        <div class="space-y-1">
                            <h4 class="text-sm font-bold text-boreal-text-primary uppercase tracking-tight">Resilience Shift</h4>
                            <p class="text-[11px] text-boreal-text-secondary italic leading-relaxed">Focus on Wave 2 preservation. Shift Policy to Sustainability focus and move to Readiness Console.</p>
                        </div>
                    </button>

                    <button 
                        (click)="applyRobustnessProof()"
                        class="p-6 bg-boreal-panel-elevated border border-boreal-green/20 rounded-sm hover:border-boreal-green/60 transition-all flex flex-col gap-4 text-left group shadow-lg"
                    >
                        <div class="flex items-center justify-between">
                            <mat-icon class="text-boreal-green !w-8 !h-8 !text-2xl">biotech</mat-icon>
                            <span class="text-[10px] text-boreal-text-muted font-mono">FLOW_02</span>
                        </div>
                        <div class="space-y-1">
                            <h4 class="text-sm font-bold text-boreal-text-primary uppercase tracking-tight">Robustness Proof</h4>
                            <p class="text-[11px] text-boreal-text-secondary italic leading-relaxed">Trigger Kinetic Strike wave and pivot to Robustness Lab for adversarial stress comparison.</p>
                        </div>
                    </button>
                </div>
             </section>

            <section class="bg-boreal-panel border border-boreal-border rounded-sm overflow-hidden flex flex-col shadow-2xl">
                <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted bg-boreal-panel-muted/20 px-4 py-2">Immediate Stress Situation Injectors</div>
                <div class="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button 
                        (click)="triggerJamming()"
                        [class.border-boreal-red]="scenario.isJamming()"
                        class="flex flex-col items-center gap-3 p-4 bg-boreal-panel-elevated border border-boreal-border rounded-sm hover:border-boreal-red/50 group transition-all"
                    >
                        <mat-icon [class.animate-pulse]="scenario.isJamming()" class="text-boreal-red !w-8 !h-8 !text-2xl group-hover:scale-110 transition-transform">wifi_off</mat-icon>
                        <span class="text-[10px] uppercase font-bold tracking-tight text-boreal-text-primary">{{ scenario.isJamming() ? 'Disable Jamming' : 'Heavy Jamming' }}</span>
                    </button>
                    <button 
                        (click)="triggerFeintSwarm()"
                        class="flex flex-col items-center gap-3 p-4 bg-boreal-panel-elevated border border-boreal-border rounded-sm hover:border-boreal-amber/50 group transition-all"
                    >
                        <mat-icon class="text-boreal-amber !w-8 !h-8 !text-2xl group-hover:scale-110 transition-transform">error_outline</mat-icon>
                        <div class="flex flex-col items-center">
                            <span class="text-[10px] uppercase font-bold tracking-tight text-boreal-text-primary">Feint Swarm</span>
                            <span class="text-[8px] text-boreal-text-muted font-bold tracking-widest">+10 TRACKS</span>
                        </div>
                    </button>
                    <button 
                        (click)="triggerKineticWave()"
                        class="flex flex-col items-center gap-3 p-4 bg-boreal-panel-elevated border border-boreal-border rounded-sm hover:border-boreal-blue/50 group transition-all"
                    >
                        <mat-icon class="text-boreal-blue !w-8 !h-8 !text-2xl group-hover:scale-110 transition-transform">rocket_launch</mat-icon>
                         <div class="flex flex-col items-center">
                            <span class="text-[10px] uppercase font-bold tracking-tight text-boreal-text-primary">Kinetic Strike</span>
                            <span class="text-[8px] text-boreal-text-muted font-bold tracking-widest">+5 HI-VAL</span>
                        </div>
                    </button>
                    <button 
                        (click)="resetBaseline()"
                        class="flex flex-col items-center gap-3 p-4 bg-boreal-panel-elevated border border-boreal-border rounded-sm hover:bg-boreal-panel-muted group transition-all"
                    >
                        <mat-icon class="text-boreal-text-primary !w-8 !h-8 !text-2xl group-hover:scale-110 transition-transform">settings_backup_restore</mat-icon>
                        <span class="text-[10px] uppercase font-bold tracking-tight text-boreal-text-primary">Reset Baseline</span>
                    </button>
                </div>
            </section>
        </div>

        <!-- System State & Shortcuts -->
        <div class="col-span-12 lg:col-span-4 flex flex-col gap-6">
            <section class="bg-boreal-panel border border-boreal-border rounded-sm overflow-hidden flex flex-col shadow-2xl">
                <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted bg-boreal-panel-muted/20 px-4 py-2">Live Monitor State</div>
                <div class="p-6 space-y-6">
                     <div class="flex justify-between items-center text-xs">
                        <span class="text-boreal-text-muted uppercase tracking-widest text-[10px] font-black">Scenario Clock</span>
                        <div class="flex flex-col items-end">
                            <span class="font-mono text-boreal-text-primary text-xl font-bold tabular-nums">{{ simTimeFormatted() }}</span>
                            <span class="text-[8px] text-boreal-blue uppercase font-black tracking-widest">{{ scenario.runState() }}</span>
                        </div>
                    </div>

                    <div class="h-px bg-boreal-border"></div>

                    <div class="space-y-4">
                        <div class="flex justify-between items-center text-[11px]">
                            <span class="text-boreal-text-muted uppercase tracking-wider font-bold">Active Command Node</span>
                            <span class="text-boreal-text-primary font-black uppercase tracking-tight">{{ scenario.scenarioName() }}</span>
                        </div>
                        <div class="flex justify-between items-center text-[11px]">
                            <span class="text-boreal-text-muted uppercase tracking-wider font-bold">Detected Threat Count</span>
                            <span class="font-mono text-boreal-red px-2 py-0.5 bg-boreal-red/10 border border-boreal-red/20 rounded-sm font-bold">{{ tactical.activeThreats().length }} TRACKS</span>
                        </div>
                        <div class="flex justify-between items-center text-[11px]">
                            <span class="text-boreal-text-muted uppercase tracking-wider font-bold">Active Policy Twin</span>
                            <span class="font-black text-boreal-blue uppercase tracking-tight">{{ policy.activePolicy()?.name || 'INITIALIZING' }}</span>
                        </div>
                        <div class="flex justify-between items-center text-[11px]">
                            <span class="text-boreal-text-muted uppercase tracking-wider font-bold">Comm Status</span>
                            <span class="font-black {{ scenario.isJamming() ? 'text-boreal-red' : 'text-boreal-green' }} uppercase tracking-widest">
                                {{ scenario.isJamming() ? 'DEGRADED / JAMMED' : 'STABLE' }}
                            </span>
                        </div>
                    </div>
                </div>
            </section>

             <section class="bg-boreal-panel border border-boreal-border rounded-sm overflow-hidden shadow-2xl">
                <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted bg-boreal-panel-muted/20 px-4 py-2">Operation Surface Jump</div>
                <div class="p-4 grid grid-cols-2 gap-2">
                    <button (click)="jump('/tactical')" class="p-3 bg-boreal-canvas/50 border border-boreal-border rounded-sm text-[10px] uppercase font-black tracking-widest text-boreal-text-muted hover:text-boreal-blue hover:border-boreal-blue/50 transition-all font-mono">Tactical COP</button>
                    <button (click)="jump('/commander')" class="p-3 bg-boreal-canvas/50 border border-boreal-border rounded-sm text-[10px] uppercase font-black tracking-widest text-boreal-text-muted hover:text-boreal-blue hover:border-boreal-blue/50 transition-all font-mono">Commander</button>
                    <button (click)="jump('/readiness')" class="p-3 bg-boreal-canvas/50 border border-boreal-border rounded-sm text-[10px] uppercase font-black tracking-widest text-boreal-text-muted hover:text-boreal-blue hover:border-boreal-blue/50 transition-all font-mono">Readiness</button>
                    <button (click)="jump('/robustness-lab')" class="p-3 bg-boreal-canvas/50 border border-boreal-border rounded-sm text-[10px] uppercase font-black tracking-widest text-boreal-text-muted hover:text-boreal-blue hover:border-boreal-blue/50 transition-all font-mono">Robustness Lab</button>
                </div>
            </section>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .mat-icon { font-size: 16px; width: 16px; height: 16px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DemoDirector {
    scenario = inject(ScenarioStore);
    tactical = inject(TacticalStore);
    policy = inject(PolicyStore);
    orchestration = inject(OrchestrationStore);
    router = inject(Router);
    audit = inject(AuditLogger);
    api = inject(BdtApiService);

    simTimeFormatted = computed(() => {
        const totalSecs = this.scenario.simTime();
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    });

    jump(path: string) {
        this.router.navigate([path]);
    }

    applyResilienceShift() {
        this.orchestration.setDemoStory({ id: 'RESILIENCE', name: 'Resilience Shift', currentStep: 1, totalSteps: 3 });
        this.audit.log({
            actor: 'DIRECTOR',
            action: 'Demo Path: Resilience Shift',
            rationale: 'Orchestrating scenario flow for sustainability focus.',
            category: 'SYSTEM'
        });

        this.scenario.setPhase('phase-1');
        this.policy.updateWeights({ sustainability: 0.9, safety: 0.4, resilience: 0.8 });
        this.api.injectTracks(5, 'MIXED').subscribe();

        setTimeout(() => this.jump('/readiness'), 500);
    }

    applyRobustnessProof() {
        this.orchestration.setDemoStory({ id: 'ROBUSTNESS', name: 'Robustness Proof', currentStep: 1, totalSteps: 4 });
        this.audit.log({
            actor: 'DIRECTOR',
            action: 'Demo Path: Robustness Proof',
            rationale: 'Triggering high-stress kinetic strike for lab validation.',
            category: 'SYSTEM'
        });

        this.scenario.setPhase('phase-3');
        this.policy.updateWeights({ safety: 1.0, sustainability: 0.3 });
        this.api.injectTracks(8, 'KINETIC').subscribe();

        setTimeout(() => this.jump('/robustness-lab'), 500);
    }

    triggerJamming() {
        const newState = !this.scenario.isJamming();
        this.scenario.setJamming(newState);
        this.audit.log({
            actor: 'DIRECTOR',
            action: newState ? 'Inject Jamming' : 'Remove Jamming',
            rationale: `Manual electronic warfare state shift: ${newState ? 'DEGRADED' : 'NOMINAL'}`,
            category: 'SYSTEM'
        });
    }

    triggerFeintSwarm() {
        this.api.injectTracks(10, 'FEINT').subscribe();
    }

    triggerKineticWave() {
        this.api.injectTracks(5, 'KINETIC').subscribe();
    }

    resetBaseline() {
        this.scenario.reset();
        this.scenario.setPhase('phase-1');
        this.scenario.setJamming(false);
        this.policy.updateWeights({ safety: 0.7, sustainability: 0.5, resilience: 0.6 });
        // Clear local state immediately; backend reset broadcasts a FULL_SNAPSHOT via WS to reconcile
        this.tactical.clearTracks();
        this.api.resetScenario().subscribe();

        this.audit.log({
            actor: 'DIRECTOR',
            action: 'Scenario Baseline Reset',
            rationale: 'Returning theater to T-0 state. Backend seed restored.',
            category: 'SYSTEM'
        });
    }
}
