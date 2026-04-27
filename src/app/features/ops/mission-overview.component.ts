import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ReadinessStore } from '../../core/state/readiness.store';
import { PolicyStore } from '../../core/state/policy.store';
import { ScenarioStore } from '../../core/state/scenario.store';
import { TacticalStore } from '../../core/state/tactical.store';
import { AuditLogger } from '../../core/services/audit-logger';

import { ENGAGEMENT_MAP_FEATURES } from '../../shared/domain/engagement-map.data';

@Component({
  selector: 'app-mission-overview',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink],
  template: `
    <div class="h-full w-full p-4 flex flex-col gap-4 overflow-y-auto bg-boreal-canvas">
      
      <!-- Operational Summary Strip (System Entry Context) -->
      <header class="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-px bg-boreal-border border border-boreal-border rounded-sm overflow-hidden shadow-2xl">
        <div class="bg-boreal-panel p-3 flex flex-col gap-1">
            <span class="text-[9px] font-mono text-boreal-text-muted uppercase tracking-widest">Scenario</span>
            <span class="text-[11px] font-bold text-boreal-text-primary uppercase truncate">{{ vm().scenarioName }}</span>
        </div>
        <div class="bg-boreal-panel p-3 flex flex-col gap-1">
            <span class="text-[9px] font-mono text-boreal-text-muted uppercase tracking-widest">Phase</span>
            <span class="text-[11px] font-bold text-boreal-blue uppercase">{{ vm().currentPhase }}</span>
        </div>
        <div class="bg-boreal-panel p-3 flex flex-col gap-1">
            <span class="text-[9px] font-mono text-boreal-text-muted uppercase tracking-widest">Fleet Readiness</span>
            <span class="text-[11px] font-bold" [class.text-boreal-green]="vm().readiness > 0.7" [class.text-boreal-amber]="vm().readiness <= 0.7">
                {{ vm().readiness * 100 | number:'1.0-0' }}% BASELINE
            </span>
        </div>
        <div class="bg-boreal-panel p-3 flex flex-col gap-1 border-l border-boreal-border/50">
            <span class="text-[9px] font-mono text-boreal-text-muted uppercase tracking-widest">Active Threats</span>
            <span class="text-[11px] font-bold text-boreal-red uppercase">{{ vm().activeThreats }} HOT TRACKS</span>
        </div>
        <div class="bg-boreal-panel p-3 flex flex-col gap-1">
            <span class="text-[9px] font-mono text-boreal-text-muted uppercase tracking-widest">Assets at Risk</span>
            <span class="text-[11px] font-bold text-boreal-text-primary uppercase">{{ vm().assetsAtRisk }} CRITICAL NODES</span>
        </div>
        <div class="bg-boreal-panel p-3 flex flex-col gap-1">
            <span class="text-[9px] font-mono text-boreal-text-muted uppercase tracking-widest">Active Policy</span>
            <span class="text-[11px] font-bold text-boreal-text-secondary uppercase truncate">{{ vm().policyName }}</span>
        </div>
        <div class="bg-boreal-panel p-3 flex flex-col gap-1 border-l-2 border-l-boreal-amber/40">
            <span class="text-[9px] font-mono text-boreal-amber uppercase tracking-widest">Recommended COA</span>
            <span class="text-[11px] font-bold text-boreal-text-primary uppercase truncate">{{ vm().recommendedCOA }}</span>
        </div>
      </header>

      <!-- Primary Navigation Grid -->
      <div class="grid grid-cols-12 gap-4">
        <!-- Strategic Posture Card -->
        <div class="col-span-12 lg:col-span-8 design-card flex flex-col gap-4 !p-0 overflow-hidden min-h-[440px]">
            <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted bg-boreal-panel-muted/20 flex justify-between items-center pr-3">
                <span>Theater Engagement Geography</span>
                <div class="flex items-center gap-4">
                    <span class="text-boreal-blue font-mono">RELIANCE: 88%</span>
                    <span class="text-boreal-text-muted font-mono">GRID: 4Q-NX-21</span>
                </div>
            </div>
            
            <div class="boreal-map-surface flex-grow relative bg-boreal-canvas/40 group">
                <svg class="absolute inset-0 w-full h-full opacity-30 pointer-events-none p-8" viewBox="0 0 1670 1300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Mission overview engagement geography preview">
                    @for (feature of mapFeatures; track feature.name) {
                        @if (feature.recordType === 'terrain' && feature.coordinates) {
                            <polygon 
                                [attr.points]="formatCoordinates(feature.coordinates)"
                                [class.fill-boreal-blue/20]="feature.side === 'north'"
                                [class.fill-boreal-red/20]="feature.side === 'south'"
                                class="stroke-boreal-border/30"
                                stroke-width="1"
                            />
                        }
                    }
                </svg>
                
                <div class="absolute inset-0 flex items-center justify-center">
                    <div class="flex flex-col items-center gap-6 p-8 bg-boreal-canvas/90 backdrop-blur-md border border-boreal-border rounded shadow-2xl max-w-sm text-center">
                        <div class="w-12 h-12 rounded-full bg-boreal-blue/10 flex items-center justify-center border border-boreal-blue/20">
                            <mat-icon class="text-boreal-blue !w-6 !h-6 !text-2xl">radar</mat-icon>
                        </div>
                        <div class="space-y-2">
                             <h3 class="text-lg font-light text-boreal-text-primary tracking-tight">Tactical COP Ready</h3>
                             <p class="text-[11px] text-boreal-text-muted leading-relaxed italic">Live track feeds and automated intercept geometry are active for TRK-2401 through TRK-2403.</p>
                        </div>
                        <button routerLink="/tactical" class="w-full py-2 bg-boreal-blue text-white rounded-sm text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-lg shadow-boreal-blue/20">
                            Enter Tactical COP
                        </button>
                    </div>
                </div>

                <!-- Subtle corner telemetry -->
                <div class="absolute bottom-4 left-4 p-2 bg-boreal-canvas/60 border border-boreal-border rounded-sm font-mono text-[8px] text-boreal-text-muted space-y-1">
                    <div class="flex justify-between gap-4"><span>SCAN_RATE</span><span>4.2Hz</span></div>
                    <div class="flex justify-between gap-4"><span>SENS_LEVEL</span><span>NOMINAL</span></div>
                </div>
            </div>
        </div>

        <!-- Theater Readiness Quick View -->
        <div class="col-span-12 lg:col-span-4 flex flex-col gap-4">
             <section class="design-card overflow-hidden flex flex-col h-full !p-0">
                <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted bg-boreal-panel-muted/20">Theater Readiness Twin</div>
                <div class="p-5 flex flex-col gap-6">
                    <div class="flex items-center justify-between border-b border-boreal-border pb-4">
                        <div class="flex flex-col gap-1">
                            <span class="text-[9px] uppercase font-bold text-boreal-text-muted tracking-widest">Global Readiness</span>
                            <span class="text-3xl font-mono font-bold text-boreal-text-primary tracking-tighter">{{ vm().readiness * 100 | number:'1.0-0' }}%</span>
                        </div>
                        <div class="text-right flex flex-col gap-1 text-boreal-text-muted">
                             <span class="text-[9px] uppercase font-bold tracking-widest">Sortie Capacity</span>
                             <span class="text-2xl font-mono font-bold tracking-tighter">{{ vm().totalSorties }}</span>
                        </div>
                    </div>

                    <div class="space-y-4">
                        @for (base of vm().bases; track base.id) {
                            <div class="flex flex-col gap-2">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <div class="w-1.5 h-1.5 rounded-full" [class.bg-boreal-green]="base.readiness > 0.7" [class.bg-boreal-amber]="base.readiness <= 0.7"></div>
                                        <span class="text-[10px] uppercase font-bold tracking-tight text-boreal-text-primary">{{base.name}}</span>
                                    </div>
                                    <span class="text-[10px] font-mono text-boreal-text-muted">{{base.readiness * 100 | number:'1.0-0'}}%</span>
                                </div>
                                <div class="w-full h-1 bg-boreal-panel-elevated rounded-full overflow-hidden">
                                    <div class="h-full bg-boreal-blue/40" [style.width.%]="base.readiness * 100"></div>
                                </div>
                            </div>
                        }
                    </div>

                    <!-- Wave-2 depletion warning -->
                    <div class="mt-2 p-3 bg-boreal-red/5 border border-boreal-red/20 rounded-sm">
                        <div class="flex items-center gap-2 mb-1.5">
                            <span class="w-1.5 h-1.5 rounded-full bg-boreal-red animate-pulse"></span>
                            <span class="text-[9px] text-boreal-red font-black uppercase tracking-widest">Wave-2 Depletion Risk</span>
                        </div>
                        <div class="flex items-baseline gap-3">
                            <div class="flex flex-col">
                                <span class="text-[7px] text-boreal-text-muted uppercase tracking-widest">Legacy @ T+12</span>
                                <span class="text-base font-black text-boreal-red font-mono tracking-tighter">8%</span>
                            </div>
                            <div class="text-boreal-text-muted text-[10px]">vs</div>
                            <div class="flex flex-col">
                                <span class="text-[7px] text-boreal-text-muted uppercase tracking-widest">SSS @ T+12</span>
                                <span class="text-base font-black text-boreal-blue font-mono tracking-tighter">62%</span>
                            </div>
                            <div class="ml-auto text-right">
                                <span class="text-[8px] text-boreal-green font-black uppercase">+54pp</span>
                                <div class="text-[7px] text-boreal-text-muted uppercase">resilience</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="mt-auto border-t border-boreal-border p-4 bg-boreal-panel-muted/20">
                     <button routerLink="/lab/readiness" class="w-full py-2 bg-boreal-panel-elevated border border-boreal-border text-boreal-text-secondary rounded-sm text-[10px] uppercase font-bold tracking-[0.2em] hover:bg-boreal-panel-muted transition-all">
                        Analyze Base Resilience
                     </button>
                </div>
            </section>
        </div>
      </div>

      <!-- Demo Path & Secondary Navigation -->
      <div class="grid grid-cols-12 gap-4">
         <!-- Demo Hook: Commander / Depletion Curve -->
         <div class="col-span-12 lg:col-span-4">
            <button routerLink="/commander" class="group w-full design-card overflow-hidden !p-0 border-l-2 border-l-boreal-blue hover:scale-[1.01] transition-all text-left bg-gradient-to-r from-boreal-blue/5 to-transparent">
                <div class="p-5 flex flex-col gap-3">
                    <div class="flex items-center justify-between">
                        <span class="text-[9px] font-bold text-boreal-blue uppercase tracking-[0.2em]">Commander Orchestrator</span>
                        <mat-icon class="text-boreal-blue group-hover:translate-x-1 transition-transform !w-3.5 !h-3.5 !text-sm">arrow_forward</mat-icon>
                    </div>
                    <div class="flex flex-col">
                        <h2 class="text-sm font-bold text-boreal-text-primary uppercase tracking-tight">Wave-2 Readiness Projection</h2>
                        <p class="text-[10px] text-boreal-text-muted mt-1 leading-relaxed italic">
                            SSS holds 62% readiness at T+12. Legacy depletes to 8%. Select COA and see the divergence curve live.
                        </p>
                    </div>
                </div>
            </button>
         </div>

         <!-- Demo Hook: Robustness Lab -->
         <div class="col-span-12 lg:col-span-4">
            <button routerLink="/lab/robustness" class="group w-full design-card overflow-hidden !p-0 border-l-2 border-l-boreal-amber hover:scale-[1.01] transition-all text-left bg-gradient-to-r from-boreal-amber/5 to-transparent">
                <div class="p-5 flex flex-col gap-3">
                    <div class="flex items-center justify-between">
                        <span class="text-[9px] font-bold text-boreal-amber uppercase tracking-[0.2em]">Robustness Lab</span>
                        <mat-icon class="text-boreal-amber group-hover:translate-x-1 transition-transform !w-3.5 !h-3.5 !text-sm">arrow_forward</mat-icon>
                    </div>
                    <div class="flex flex-col">
                        <h2 class="text-sm font-bold text-boreal-text-primary uppercase tracking-tight">Monte Carlo Stress Test</h2>
                        <p class="text-[10px] text-boreal-text-muted mt-1 leading-relaxed italic">
                            SSS: 73% robustness against SATURATION. Legacy: 18%. Run 500 iterations and watch the heatmap converge.
                        </p>
                    </div>
                </div>
            </button>
         </div>

         <!-- Demo Hook: Governance -->
         <div class="col-span-12 lg:col-span-4">
            <button routerLink="/governance" class="group w-full design-card overflow-hidden !p-0 border-l-2 border-l-boreal-green hover:scale-[1.01] transition-all text-left bg-gradient-to-r from-boreal-green/5 to-transparent">
                <div class="p-5 flex flex-col gap-3">
                    <div class="flex items-center justify-between">
                        <span class="text-[9px] font-bold text-boreal-green uppercase tracking-[0.2em]">Governance & Rationale</span>
                        <mat-icon class="text-boreal-green group-hover:translate-x-1 transition-transform !w-3.5 !h-3.5 !text-sm">arrow_forward</mat-icon>
                    </div>
                    <div class="flex flex-col">
                        <h2 class="text-sm font-bold text-boreal-text-primary uppercase tracking-tight">AI-Explained Tradeoffs</h2>
                        <p class="text-[10px] text-boreal-text-muted mt-1 leading-relaxed italic">
                            Mistral Large explains every COA decision in plain language. Immutable audit trail for every engagement.
                        </p>
                    </div>
                </div>
            </button>
         </div>

         <!-- Demo Hook: Reference Graph -->
         <div class="col-span-12 lg:col-span-4">
            <button routerLink="/reference" class="group w-full design-card overflow-hidden !p-0 border-l-2 border-l-boreal-text-muted hover:scale-[1.01] transition-all text-left bg-gradient-to-r from-boreal-text-muted/5 to-transparent">
                <div class="p-5 flex flex-col gap-3">
                    <div class="flex items-center justify-between">
                        <span class="text-[9px] font-bold text-boreal-text-muted uppercase tracking-[0.2em]">Reference Graph</span>
                        <mat-icon class="text-boreal-text-muted group-hover:translate-x-1 transition-transform !w-3.5 !h-3.5 !text-sm">menu_book</mat-icon>
                    </div>
                    <div class="flex flex-col">
                        <h2 class="text-sm font-bold text-boreal-text-primary uppercase tracking-tight">Truth-First Docs</h2>
                        <p class="text-[10px] text-boreal-text-muted mt-1 leading-relaxed italic">
                            Browse the 00-12 backbone mapped to the actual repo, with status labels grounded in implementation reality.
                        </p>
                    </div>
                </div>
            </button>
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
export class MissionOverview {
    readiness = inject(ReadinessStore);
    policy = inject(PolicyStore);
    scenario = inject(ScenarioStore);
    tactical = inject(TacticalStore);
    audit = inject(AuditLogger);

    mapFeatures = ENGAGEMENT_MAP_FEATURES;

    // Local computed view-model for cleaner template logic
    vm = computed(() => {
        const activeTracks = this.tactical.activeThreats();
        const activePolicy = this.policy.activePolicy();
        const recommendedCOA = this.policy.recommendedCOA();
        const currentPhase = this.scenario.currentPhase();
        const bases = this.readiness.bases();
        const latestAudit = this.audit.logs()[0];

        // Sum sortie capacity from bases
        const totalSorties = bases.reduce((sum, b) => sum + (b.sortieCapacity || 0), 0);

        return {
            scenarioName: this.scenario.scenarioName(),
            currentPhase: currentPhase?.name || 'INITIAL_POSTURE',
            simTime: this.scenario.simTime(),
            readiness: this.readiness.overallReadiness(),
            activeThreats: activeTracks.length,
            assetsAtRisk: new Set(activeTracks.filter(t => !!t.targetId).map(t => t.targetId)).size,
            policyName: activePolicy?.name || 'NO_ACTIVE_POLICY',
            recommendedCOA: recommendedCOA?.name || 'AWAITING_ANALYSIS',
            bases: bases,
            totalSorties: totalSorties || 44, // Fallback
            lastAuditTime: latestAudit?.time || 'Awaiting Sync'
        };
    });

    formatCoordinates(coords: [number, number][]): string {
        return coords.map(c => `${c[0]},${c[1]}`).join(' ');
    }
}
