import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ReadinessStore } from '../core/state/readiness.store';
import { PolicyStore } from '../core/state/policy.store';
import { OrchestrationStore } from '../core/state/orchestration.store';
import { CapabilityOrchestrator } from '../core/services/capability-orchestrator';
import { SteelApiService, ReadinessProjection } from '../core/services/steel-api.service';

@Component({
  selector: 'app-readiness-console',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full w-full p-6 flex flex-col gap-6 overflow-y-auto bg-boreal-canvas selection:bg-boreal-blue/30">
      <header class="flex items-center justify-between border-b border-boreal-border pb-6">
        <div class="flex flex-col gap-1">
            <div class="flex items-center gap-3">
                <h1 class="text-3xl font-light tracking-tight text-boreal-text-primary uppercase tracking-[0.2em]">Base Resilience</h1>
                <div class="px-2 py-1 bg-boreal-blue/10 border border-boreal-blue/30 rounded-sm">
                    <span class="text-[8px] font-black text-boreal-blue uppercase tracking-widest leading-none">Status: ACTIVE_FORECAST</span>
                </div>
            </div>
            <p class="text-boreal-text-muted text-[10px] font-mono uppercase tracking-widest italic">Force preservation, depletion awareness & sustainability forecast</p>
        </div>
        
        <div class="flex items-center gap-6 bg-boreal-panel border border-boreal-border px-6 py-3 rounded-sm shadow-2xl relative overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-r from-boreal-blue/5 to-transparent pointer-events-none"></div>
            <div class="flex flex-col relative z-10">
                <span class="text-[9px] text-boreal-text-muted uppercase font-bold tracking-widest">Active Posture</span>
                <div class="flex items-center gap-2">
                    <span class="text-[11px] font-bold text-boreal-blue font-mono uppercase tracking-tighter">{{ vm().selectedCOAName }}</span>
                    @if (isPublished()) {
                         <div class="flex items-center gap-1 px-1.5 py-0.5 bg-boreal-blue/20 text-boreal-blue font-bold rounded-sm border border-boreal-blue/30 scale-90 origin-left">
                            <mat-icon class="!text-[8px]">verified</mat-icon>
                            <span class="text-[7px] uppercase tracking-widest">COMMITTED</span>
                         </div>
                    }
                </div>
            </div>
            <div class="h-8 w-[1px] bg-boreal-border relative z-10"></div>
            <div class="flex flex-col relative z-10">
                <span class="text-[9px] text-boreal-text-muted uppercase font-bold tracking-widest">Fleet Readiness</span>
                <span class="text-base font-mono font-black" [class.text-boreal-green]="vm().fleetReadiness > 0.8" [class.text-boreal-amber]="vm().fleetReadiness <= 0.8">{{ vm().fleetReadiness * 100 | number:'1.0-0' }}%</span>
            </div>
             <div class="h-8 w-[1px] bg-boreal-border relative z-10"></div>
            <div class="flex flex-col relative z-10">
                <span class="text-[9px] text-boreal-text-muted uppercase font-bold tracking-widest">Next-Wave Viability</span>
                <div class="flex items-center gap-2">
                    <span class="text-base font-mono font-black" [class.text-boreal-green]="vm().nextWaveViabilityNum > 80" [class.text-boreal-amber]="vm().nextWaveViabilityNum <= 80">{{ vm().nextWaveViability }}%</span>
                    <mat-icon class="!text-[10px] text-boreal-text-muted">trending_down</mat-icon>
                </div>
            </div>
        </div>
      </header>

      <!-- Main Base Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         @for (base of vm().bases; track base.id) {
            <section class="design-card flex flex-col overflow-hidden group !p-0 shadow-xl border-t-2 transition-all hover:bg-boreal-panel-muted/50" 
                [style.border-top-color]="base.projectedReadiness < 0.6 ? 'var(--boreal-red)' : (base.isReserved ? 'var(--boreal-blue)' : 'var(--boreal-border)')">
                
                <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted bg-boreal-panel-muted/20 flex justify-between items-center group-hover:bg-boreal-panel-muted transition-colors px-4">
                    <div class="flex items-center gap-2">
                        <div class="relative">
                            <span class="w-2 h-2 rounded-full block" [class.bg-boreal-green]="base.readiness > 0.8" [class.bg-boreal-amber]="base.readiness <= 0.8 && base.readiness > 0.5" [class.bg-boreal-red]="base.readiness <= 0.5"></span>
                            @if (base.isReserved) {
                                <div class="absolute inset-0 rounded-full bg-boreal-blue animate-ping opacity-40"></div>
                            }
                        </div>
                        <span class="text-boreal-text-primary font-bold tracking-tight text-[10px]">{{base.name}}</span>
                        @if (base.isReserved) {
                            <span class="text-[7px] bg-boreal-blue text-white px-1 py-0.5 rounded-sm font-black tracking-widest">RESERVED</span>
                        }
                    </div>
                    <span class="text-[8px] opacity-60 font-mono tracking-tighter">{{base.role}}</span>
                </div>

                <div class="p-6">
                    <!-- Twin Readout: Current vs Projected -->
                    <div class="grid grid-cols-2 gap-4 mb-8">
                        <div class="flex flex-col">
                            <span class="text-[8px] text-boreal-text-muted uppercase font-black tracking-widest mb-1">Current State</span>
                            <div class="flex items-baseline gap-1">
                                <span class="text-3xl font-mono font-black text-boreal-text-primary leading-none">
                                    {{base.readiness * 100 | number:'1.0-0'}}
                                </span>
                                <span class="text-[10px] font-mono text-boreal-text-muted">%</span>
                            </div>
                        </div>
                        <div class="flex flex-col items-end">
                            <span class="text-[8px] text-boreal-text-muted uppercase font-black tracking-widest mb-1">Future (After {{vm().selectedCOAName}})</span>
                            <div class="flex items-center gap-2">
                                <mat-icon class="!text-sm" [class.text-boreal-red]="base.delta < -0.05" [class.text-boreal-green]="base.delta >= 0">
                                    {{ base.delta < 0 ? 'south_east' : 'north_east' }}
                                </mat-icon>
                                <span class="text-3xl font-mono font-black leading-none" [class.text-boreal-red]="base.delta < -0.05" [class.text-boreal-amber]="base.delta < 0 && base.delta >= -0.05" [class.text-boreal-green]="base.delta >= 0">
                                    {{base.projectedReadiness * 100 | number:'1.0-0'}}
                                </span>
                                <span class="text-[10px] font-mono text-boreal-text-muted">%</span>
                            </div>
                            <span class="text-[8px] font-mono mt-1 font-bold" [class.text-boreal-red]="base.delta < -0.05">DELTA {{ base.delta * 100 | number:'1.1-1' }}%</span>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-x-8 gap-y-5 mb-8 pt-6 border-t border-boreal-border">
                        <div class="flex flex-col gap-1.5">
                            <div class="flex justify-between text-[8px] uppercase font-black tracking-widest text-boreal-text-muted">
                                <span>Crew Fatigue</span>
                                <span class="text-boreal-text-primary font-mono">{{ (base.crewFatigue * 100).toFixed(0) }}%</span>
                            </div>
                            <div class="h-1 bg-boreal-panel-muted rounded-full overflow-hidden">
                                <div class="h-full bg-boreal-amber transition-all duration-1000" [style.width.%]="base.crewFatigue * 100"></div>
                            </div>
                        </div>
                        <div class="flex flex-col gap-1.5">
                             <div class="flex justify-between text-[8px] uppercase font-black tracking-widest text-boreal-text-muted">
                                <span>Fuel Depth</span>
                                <span class="text-boreal-text-primary font-mono">{{base.fuelStock * 100}}%</span>
                            </div>
                            <div class="h-1 bg-boreal-panel-muted rounded-full overflow-hidden">
                                <div class="h-full bg-boreal-green transition-all duration-1000" [style.width.%]="base.fuelStock * 100"></div>
                            </div>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[8px] text-boreal-text-muted uppercase font-black tracking-widest mb-1">Depletion Risk</span>
                            <div class="flex items-center gap-1.5">
                                <div class="w-1.5 h-1.5 rounded-full" [class.bg-boreal-red]="base.projectedReadiness < 0.4" [class.bg-boreal-green]="base.projectedReadiness >= 0.4"></div>
                                <span class="text-[10px] font-bold uppercase transition-colors tracking-tighter" [class.text-boreal-red]="base.projectedReadiness < 0.4" [class.text-boreal-green]="base.projectedReadiness >= 0.4">
                                    {{ base.projectedReadiness < 0.4 ? 'CRITICAL_DEPLETION' : 'STABLE_ORBIT' }}
                                </span>
                            </div>
                        </div>
                        <div class="flex flex-col text-right">
                            <span class="text-[8px] text-boreal-text-muted uppercase font-black tracking-widest mb-1">Burn Rate</span>
                            <div class="flex items-baseline justify-end gap-1">
                                <span class="text-xs font-black font-mono tracking-tighter text-boreal-amber">
                                    -{{(base.burnRate * 100).toFixed(1)}}
                                </span>
                                <span class="text-[8px] font-mono text-boreal-text-muted">% / WAVE</span>
                            </div>
                        </div>
                        <div class="flex flex-col text-right">
                            <span class="text-[8px] text-boreal-text-muted uppercase font-black tracking-widest mb-1">Life Expectancy</span>
                            <div class="flex items-baseline justify-end gap-1">
                                @if (base.lifeExpectancyHours !== null) {
                                    <span class="text-xs font-black font-mono tracking-tighter"
                                          [class.text-boreal-red]="base.lifeExpectancyHours < 24"
                                          [class.text-boreal-amber]="base.lifeExpectancyHours < 48 && base.lifeExpectancyHours >= 24"
                                          [class.text-boreal-text-primary]="base.lifeExpectancyHours >= 48">
                                        ~{{base.lifeExpectancyHours | number:'1.0-0'}}
                                    </span>
                                    <span class="text-[8px] font-mono text-boreal-text-muted">HRS</span>
                                } @else {
                                    <span class="text-xs font-black font-mono tracking-tighter"
                                          [class.text-boreal-red]="base.lifeExpectancy < 2"
                                          [class.text-boreal-amber]="base.lifeExpectancy < 4 && base.lifeExpectancy >= 2"
                                          [class.text-boreal-text-primary]="base.lifeExpectancy >= 4">
                                        ~{{base.lifeExpectancy | number:'1.1-1'}}
                                    </span>
                                    <span class="text-[8px] font-mono text-boreal-text-muted">WAVES</span>
                                }
                            </div>
                        </div>
                    </div>

                    <!-- Operational Context -->
                    <div class="space-y-4 mb-8">
                         <div class="p-3 bg-boreal-panel-muted/20 border border-boreal-border rounded-sm flex flex-col gap-2 group/ctx relative overflow-hidden">
                            <div class="absolute inset-y-0 left-0 w-0.5 bg-boreal-blue opacity-30 group-hover/ctx:w-1 transition-all"></div>
                            <div class="flex justify-between items-center">
                                <span class="text-[8px] text-boreal-text-muted font-bold uppercase tracking-widest">Sustainability Rationale</span>
                                <span class="text-[8px] px-1.5 py-0.5 bg-boreal-blue/10 text-boreal-blue font-bold rounded-sm uppercase tracking-widest border border-boreal-blue/20">Floor: {{ (base.readinessFloor * 100).toFixed(0) }}%</span>
                            </div>
                            <p class="text-[10px] text-boreal-text-secondary italic leading-tight px-1">
                                {{ base.isReserved ? 'Tactical engagement inhibited. Strictly enforcing commander reserves.' : (base.delta < -0.1 ? 'High-burn sortie projection. Critical readiness drift ahead.' : 'Nominal depletion projected. Asset prioritized for next-wave viability.') }}
                            </p>
                         </div>
                    </div>

                    <!-- Depletion Detail -->
                    <div class="pt-6 border-t border-boreal-border">
                        <div class="flex justify-between items-center mb-4">
                            <span class="text-[8px] font-black text-boreal-text-muted uppercase tracking-[0.2em]">Depletion Forecast</span>
                            <span class="text-[7px] text-boreal-text-muted italic font-mono">{{base.id}}-V22-PROJ</span>
                        </div>
                        <div class="grid grid-cols-3 gap-6">
                             <div class="flex flex-col gap-1">
                                <span class="text-[7px] text-boreal-text-muted uppercase font-black">SHORAD</span>
                                <div class="flex items-baseline gap-1">
                                    <span class="text-[11px] font-mono font-bold text-boreal-text-secondary">{{base.missileInventory.interceptorShort}}</span>
                                    <span class="text-[7px] text-boreal-text-muted">STK</span>
                                </div>
                             </div>
                             <div class="flex flex-col gap-1 border-l border-boreal-border pl-4">
                                <span class="text-[7px] text-boreal-text-muted uppercase font-black">MID-RANGE</span>
                                <div class="flex items-baseline gap-1">
                                    <span class="text-[11px] font-mono font-bold text-boreal-text-secondary">{{base.missileInventory.interceptorMid}}</span>
                                    <span class="text-[7px] text-boreal-text-muted">STK</span>
                                </div>
                             </div>
                             <div class="flex flex-col gap-1 border-l border-boreal-border pl-4">
                                <span class="text-[7px] text-boreal-text-muted uppercase font-black">STRATEGIC</span>
                                <div class="flex items-baseline gap-1">
                                    <span class="text-[11px] font-mono font-bold text-boreal-text-secondary">{{base.missileInventory.interceptorLong}}</span>
                                    <span class="text-[7px] text-boreal-text-muted">STK</span>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>

                <!-- Footer Actions -->
                <div class="mt-auto p-4 bg-boreal-panel-muted/40 border-t border-boreal-border flex flex-col gap-3">
                     <div class="grid grid-cols-2 gap-3">
                        <button 
                            (click)="enforceReserve(base.id)"
                            class="py-2.5 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-[0.98] border"
                            [class.bg-boreal-blue]="!base.isReserved"
                            [class.text-white]="!base.isReserved"
                            [class.border-boreal-blue]="!base.isReserved"
                            [class.bg-transparent]="base.isReserved"
                            [class.text-boreal-red]="base.isReserved"
                            [class.border-boreal-red]="base.isReserved"
                        >
                            {{ base.isReserved ? 'REVOKE RESERVE' : 'ENFORCE RESERVE' }}
                        </button>
                        <button 
                            (click)="rebalance(base.id)"
                            class="py-2.5 bg-boreal-panel-elevated border border-boreal-border rounded-sm text-[10px] text-boreal-text-secondary font-bold uppercase tracking-widest hover:text-boreal-text-primary hover:bg-boreal-panel transition-all active:scale-[0.98]"
                        >
                            REBALANCE
                        </button>
                     </div>
                     <button 
                        (click)="viewMaintenanceDrag(base.id)"
                        class="w-full py-2 bg-transparent border border-boreal-border rounded-sm text-[8px] font-bold text-boreal-text-muted hover:text-boreal-text-secondary hover:border-boreal-text-muted uppercase tracking-widest transition-all"
                    >
                        View maintenance drag ({{ (base.crewFatigue * 10).toFixed(1) }}h delta)
                    </button>
                </div>
            </section>
         }
      </div>

       <!-- Bottom Forecast Segment: Detailed Sustainability View -->
       <section class="bg-boreal-panel border border-boreal-border rounded-sm min-h-80 mt-10 flex flex-col overflow-hidden shadow-2xl relative">
            <div class="panel-header uppercase tracking-[0.2em] text-[10px] font-bold text-boreal-text-muted bg-boreal-panel-muted/20 flex justify-between pr-4 h-12 items-center">
                <div class="flex items-center gap-3">
                    <mat-icon class="!text-sm text-boreal-blue">analytics</mat-icon>
                    <span>Fleet Sustainability Forecast // Wave+1 Projection</span>
                </div>
                <div class="flex gap-6">
                    <div class="flex items-center gap-2">
                        <div class="w-2.5 h-2.5 rounded-[1px] bg-boreal-panel-elevated border border-boreal-border"></div>
                        <span class="text-[8px] text-boreal-text-muted uppercase font-black tracking-widest">Current Posture</span>
                    </div>
                    <div class="flex items-center gap-2">
                         <div class="w-1.5 h-1.5 rounded-full bg-boreal-blue shadow-[0_0_8px_var(--boreal-blue)]"></div>
                        <span class="text-[8px] text-boreal-text-muted uppercase font-black tracking-widest">Forecast ({{vm().selectedCOAName}})</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-4 h-[1px] border-t border-boreal-text-muted/40 border-dashed"></div>
                        <span class="text-[8px] text-boreal-text-muted uppercase font-black tracking-widest">Commander Policy Floor</span>
                    </div>
                </div>
            </div>
            
            <div class="flex-grow relative p-12 bg-boreal-canvas/40">
                <!-- Forecast Chart -->
                <div class="grid grid-cols-4 h-full gap-12 relative z-10">
                    <div class="col-span-3 flex items-end justify-around px-8 border-r border-boreal-border">
                        @for (base of vm().bases; track base.id) {
                            <div class="flex flex-col items-center gap-6 group relative">
                                <div class="w-16 flex flex-col-reverse gap-px relative h-48">
                                     <!-- Axis Label -->
                                     <div class="absolute left-[-20%] bottom-0 top-0 w-px bg-boreal-border"></div>
                                     
                                     <!-- Current Bar (Dark Background) -->
                                     <div class="absolute inset-x-0 bottom-0 bg-boreal-panel-elevated border border-boreal-border transition-all duration-700" [style.height.%]="base.readiness * 100">
                                         <div class="absolute top-[-16px] left-1/2 -translate-x-1/2 text-[9px] text-boreal-text-muted font-mono font-bold">{{(base.readiness * 100).toFixed(0)}}%</div>
                                     </div>
                                     <!-- After COA Bar (Primary Accent) -->
                                     <div class="absolute inset-x-3 bottom-0 bg-boreal-blue shadow-[0_0_20px_var(--boreal-blue)] transition-all duration-1000 delay-300 border-x border-t border-white/20" 
                                        [style.height.%]="base.projectedReadiness * 100">
                                         <div class="absolute top-[-20px] left-1/2 -translate-x-1/2 text-[10px] text-boreal-blue font-black font-mono tracking-tighter">{{(base.projectedReadiness * 100).toFixed(0)}}%</div>
                                     </div>
                                     <!-- Policy Floor Marker -->
                                     <div class="absolute left-[-15%] right-[-15%] border-t-[1.5px] border-boreal-text-muted/40 border-dashed z-20 group-hover:border-boreal-text-primary transition-colors" 
                                        [style.bottom.%]="base.readinessFloor * 100">
                                         <div class="absolute right-[-24px] top-[-6px] text-[7px] text-boreal-text-muted font-black uppercase tracking-widest">FLOOR</div>
                                     </div>
                                </div>
                                <div class="flex flex-col items-center">
                                    <span class="text-[10px] text-boreal-text-primary font-bold tracking-widest uppercase mb-0.5">{{base.name}}</span>
                                    <span class="text-[8px] text-boreal-text-muted font-mono uppercase tracking-tighter">{{base.role}}</span>
                                </div>
                            </div>
                        }
                    </div>

                    <!-- Summary Panel -->
                    <div class="col-span-1 flex flex-col justify-center gap-8 pl-4">
                        <div class="space-y-3">
                            <span class="text-[10px] text-boreal-text-muted uppercase font-black tracking-[0.2em] block">Projected Theater Burn</span>
                            <div class="p-4 bg-boreal-canvas border border-boreal-border rounded-sm space-y-2">
                                <div class="flex justify-between items-baseline">
                                    <span class="text-[9px] text-boreal-text-muted uppercase font-bold">Aggregate Burn</span>
                                    <span class="text-sm font-mono font-black text-boreal-amber">{{ vm().totalBurn * 100 | number:'1.1-1' }}%</span>
                                </div>
                                <div class="w-full h-1 bg-boreal-panel-muted rounded-full overflow-hidden">
                                     <div class="h-full bg-boreal-amber" [style.width.%]="vm().totalBurn * 100 * 5"></div>
                                </div>
                                <p class="text-[9px] text-boreal-text-muted leading-tight italic pt-2">
                                    Depletion for <span class="text-boreal-text-primary">{{vm().selectedCOAName}}</span> reflects a <span [class.text-boreal-green]="vm().isSustainable" [class.text-boreal-amber]="!vm().isSustainable">{{ vm().isSustainable ? 'sustainable' : 'high-burn' }}</span> resource exit state.
                                </p>
                            </div>
                        </div>

                        <div class="space-y-3">
                            <span class="text-[10px] text-boreal-text-muted uppercase font-black tracking-[0.2em] block">Reserve Preservation</span>
                            <div class="p-4 bg-boreal-blue/5 border border-boreal-blue/20 rounded-sm space-y-2">
                                <div class="flex justify-between items-baseline">
                                    <span class="text-[9px] text-boreal-text-muted uppercase font-bold">Theater Floor</span>
                                    <span class="text-sm font-mono font-black text-boreal-blue">70.0%</span>
                                </div>
                                <div class="flex justify-between items-baseline">
                                    <span class="text-[9px] text-boreal-text-muted uppercase font-bold">Forecast Surplus</span>
                                    <span class="text-[11px] font-mono font-bold text-boreal-text-primary">+{{ (vm().projectedFleetReadiness * 100 - 70).toFixed(1) }}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer Metadata -->
                <div class="absolute bottom-6 left-12 flex gap-8 items-center">
                    <div class="py-1.5 px-4 bg-boreal-canvas border border-boreal-border rounded-sm text-[9px] font-mono text-boreal-text-muted uppercase tracking-[0.3em] flex items-center gap-3">
                        <span class="text-boreal-text-muted/70">COORD::{{vm().scenarioId}}</span>
                        <span class="w-1 h-1 rounded-full bg-boreal-border"></span>
                        <span>PERIOD: 12H-PROJ</span>
                        <span class="w-1 h-1 rounded-full bg-boreal-border"></span>
                        <span class="text-boreal-blue">VALID_STATE</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-2 h-2 rounded-full bg-boreal-green animate-pulse"></div>
                        <span class="text-[8px] text-boreal-text-muted uppercase font-black tracking-widest leading-none">Simulation Delta Synced</span>
                    </div>
                </div>
            </div>
       </section>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .mat-icon { font-size: 16px; width: 16px; height: 16px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReadinessConsole {
    readiness = inject(ReadinessStore);
    policy = inject(PolicyStore);
    orchestration = inject(OrchestrationStore);
    orchestrator = inject(CapabilityOrchestrator);
    private api = inject(SteelApiService);

    private _projectionMap = signal<Record<string, ReadinessProjection>>({});

    constructor() {
      this.api.getReadinessProjection().subscribe({
        next: rows => this._projectionMap.set(Object.fromEntries(rows.map(r => [r.baseId, r]))),
        error: () => {},
      });
    }

    isPublished = computed(() => {
        const published = this.orchestration.publishedIntent();
        const selected = this.policy.selectedCOA();
        return !!published && !!selected && published.coaId === selected.id;
    });

    vm = computed(() => {
        const bases = this.readiness.bases();
        const selectedCOA = this.policy.selectedCOA();
        const activePolicy = this.policy.activePolicy();
        const deltas = selectedCOA?.projectedOutcome.readinessDeltaByBase || {};
        const floors = activePolicy?.readinessFloors || {};
        const proj = this._projectionMap();

        const enhancedBases = bases.map(base => {
            const delta = deltas[base.id] || -0.05; // Fallback to a nominal burn if none specified
            const floor = floors[base.id] || 0.6;
            const projectedReadiness = Math.max(0, base.readiness + delta);

            // Burn Rate: readiness reduction per wave
            const burnRate = Math.abs(delta);

            // Life Expectancy: how many waves before hitting the policy floor?
            const reserveBuffer = base.readiness - floor;
            const wavesToFloor = reserveBuffer > 0 && burnRate > 0
                ? (reserveBuffer / burnRate)
                : (base.readiness / Math.max(0.01, burnRate));

            // Backend projection (null when backend hasn't responded yet)
            const backendProj = proj[base.id];
            const lifeExpectancyHours: number | null = backendProj?.lifeExpectancyHours ?? null;

            return {
                ...base,
                delta,
                burnRate,
                projectedReadiness,
                readinessFloor: floor,
                lifeExpectancy: Math.min(12, wavesToFloor),
                lifeExpectancyHours,
            };
        });

        const currentOverall = this.readiness.overallReadiness();
        const projectedOverall = enhancedBases.reduce((acc, b) => acc + b.projectedReadiness, 0) / enhancedBases.length;
        const totalBurn = currentOverall - projectedOverall;

        return {
            bases: enhancedBases,
            fleetReadiness: currentOverall,
            projectedFleetReadiness: projectedOverall,
            totalBurn: totalBurn,
            selectedCOAName: selectedCOA?.name || 'BALANCED',
            nextWaveViability: (projectedOverall * 100).toFixed(1),
            nextWaveViabilityNum: projectedOverall * 100,
            scenarioId: activePolicy?.id || 'ALPHA-00',
            policyName: activePolicy?.name || 'DEFAULT',
            isSustainable: projectedOverall > 0.7
        };
    });

    enforceReserve(baseId: string) {
        this.readiness.toggleReserve(baseId);
        
        const base = this.readiness.bases().find(b => b.id === baseId);
        const isReservedNow = base?.isReserved;

        this.orchestrator.showFeature({
            name: isReservedNow ? 'Reserve Enforced' : 'Reserve Revoked',
            operationalFunction: isReservedNow 
                ? 'Base strictly inhibited for tactical assignments to preserve future capability.'
                : 'Base released back to theater-wide tactical engagement queue.',
            persona: 'Base Readiness Officer',
            decisionImproved: 'Strategic Capacity Management',
            rationale: 'Force preservation ensures that even if local defense metrics drop now, strategic reserves are held for predicted saturation waves.',
            status: 'PARTIAL_FRONTEND',
            tier: 'MVP',
            nextStep: 'Connect reserve status to Tactical engagement assignment logic.'
        });
    }

    rebalance(baseId: string) {
        this.readiness.rebalanceBase(baseId);
        
        this.orchestrator.showFeature({
            name: 'Inter-Base Rebalance',
            operationalFunction: 'Shifting mission-ready assets and personnel cross-theater to stabilize the selected node.',
            persona: 'Logistics Officer',
            decisionImproved: 'Theater-Wide Resource Efficiency',
            rationale: 'Readiness asymmetry is a vulnerability. Active rebalancing smooths the depletion curve.',
            status: 'PARTIAL_FRONTEND',
            tier: 'MVP',
            nextStep: 'Implement timed logistics delivery curves.'
        });
    }

    viewMaintenanceDrag(baseId: string) {
        this.orchestrator.showFeature({
            name: 'Maintenance Drag Inspector',
            operationalFunction: 'Root-cause analysis identifies if readiness drift is material-fatigue or crew-burnout driven.',
            persona: 'Maintenance Officer',
            decisionImproved: 'Sortie Accuracy',
            inputs: `Selected Base: ${baseId}`,
            rationale: 'Distinguishing between human fatigue and material failure allows for precise logarithmic recovery planning.',
            status: 'STUBBED_UI',
            tier: 'SECONDARY',
            nextStep: 'Integrate telemetry from Base Maintenance Twin.'
        });
    }
}

