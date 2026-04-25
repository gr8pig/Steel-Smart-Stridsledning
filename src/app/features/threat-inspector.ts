import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { TacticalStore } from '../core/state/tactical.store';
import { PolicyStore } from '../core/state/policy.store';
import { CapabilityOrchestrator } from '../core/services/capability-orchestrator';

@Component({
  selector: 'app-threat-inspector',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full w-full p-6 flex flex-col gap-6 overflow-hidden text-boreal-text-secondary bg-boreal-canvas">
      <header class="flex flex-col gap-1 border-b border-boreal-border pb-4">
        <div class="flex items-center justify-between">
            <div class="flex flex-col gap-1">
                <h1 class="text-3xl font-light tracking-tight text-boreal-text-primary uppercase tracking-[0.2em]">Threat Inspector</h1>
                <p class="text-boreal-text-muted text-[10px] font-mono uppercase tracking-widest italic">Intelligence, Deception & Intent Analysis Surface</p>
            </div>
            <div class="flex items-center gap-4">
                <div class="flex flex-col items-end">
                    <span class="text-[9px] text-boreal-text-muted uppercase font-black tracking-widest">Active Policy</span>
                    <span class="text-xs font-bold text-boreal-blue uppercase tracking-tight">{{ analysis()?.policyName || 'Standard' }}</span>
                </div>
                <div class="h-8 w-[1px] bg-boreal-border mx-2"></div>
                <div class="flex flex-col items-end">
                    <span class="text-[9px] text-boreal-text-muted uppercase font-black tracking-widest">Decision Mode</span>
                    <span class="text-xs font-bold text-boreal-text-primary uppercase tracking-tight">{{ policy.activePolicy()?.guardrails?.engagementAuthority || 'AUTO' }}</span>
                </div>
            </div>
        </div>
      </header>

      <div class="grid grid-cols-12 gap-6 flex-grow min-h-0">
        <!-- Track List / Navigation -->
        <div class="col-span-12 lg:col-span-3 bg-boreal-panel border border-boreal-border rounded-sm flex flex-col overflow-hidden shadow-2xl">
            <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted bg-boreal-panel-muted/20 flex justify-between pr-3 items-center">
                <div class="flex items-center gap-2">
                    <mat-icon class="!text-xs">list</mat-icon>
                    <span>Analysis Queue</span>
                </div>
                <span class="text-boreal-blue font-mono font-bold">{{ tactical.tracks().length }} TRACKS</span>
            </div>
            <div class="flex-grow overflow-y-auto pt-1 scrollbar-thin">
                @for (track of tactical.tracks(); track track.id) {
                    <button (click)="tactical.selectTrack(track.id)"
                        class="w-full text-left p-4 border-b border-boreal-border hover:bg-boreal-panel-muted/50 cursor-pointer transition-all focus:outline-none group relative"
                        [class.bg-boreal-blue/10]="tactical.selectedTrackId() === track.id">
                        
                        @if (tactical.selectedTrackId() === track.id) {
                            <div class="absolute inset-y-0 left-0 w-1 bg-boreal-blue"></div>
                        }
 
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-[11px] font-black text-boreal-text-primary tracking-widest uppercase">{{track.id}}</span>
                            <span class="text-[8px] font-mono text-boreal-text-muted uppercase tracking-tighter">{{track.class}}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span class="text-[9px] uppercase font-black tracking-[0.15em] px-1.5 py-0.5 rounded-sm bg-boreal-canvas/40 border border-boreal-border" 
                                      [class.text-boreal-amber]="track.intent === 'FEINT'" 
                                      [class.text-boreal-red]="track.intent === 'STRIKE'"
                                      [class.text-boreal-blue]="track.intent === 'SATURATION'">
                                    {{track.intent}}
                                </span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-[9px] font-mono font-bold" [class.text-boreal-amber]="track.confidence < 0.6" [class.text-boreal-text-secondary]="track.confidence >= 0.6">
                                    {{(track.confidence * 100) | number:'1.0-0'}}%
                                </span>
                                @if (track.confidence < 0.6) {
                                    <mat-icon class="!text-[10px] text-boreal-amber animate-pulse">priority_high</mat-icon>
                                }
                            </div>
                        </div>
                    </button>
                }
            </div>
        </div>

        <!-- Center: Evidence & Geometry -->
        <div class="col-span-12 lg:col-span-5 flex flex-col gap-6 overflow-hidden">
             <section class="flex-grow bg-boreal-panel border border-boreal-border rounded-sm overflow-hidden flex flex-col relative shadow-2xl">
                <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted bg-boreal-panel-muted/20">Geometric Evidence / SensorTwin View</div>
                
                <div class="flex-grow bg-boreal-canvas/40 relative flex items-center justify-center border-b border-boreal-border overflow-hidden group">
                    <!-- Data Grid Background -->
                    <div class="absolute inset-0 opacity-[0.03] pointer-events-none" [style.background-image]="'radial-gradient(circle, var(--boreal-text-primary) 1px, transparent 1px)'" style="background-size: 40px 40px;"></div>
 
                    @if (tactical.selectedTrack(); as selected) {
                        <div class="relative w-85 h-85 border border-boreal-border rounded-full flex items-center justify-center">
                            <div class="absolute inset-0 bg-boreal-blue/5 rounded-full scale-110 blur-3xl opacity-20"></div>
                            <div class="absolute inset-2 border border-dashed border-boreal-border rounded-full"></div>
                            <div class="absolute inset-16 border border-boreal-border rounded-full opacity-20"></div>
                            
                            <!-- Track Marker -->
                            <div class="relative z-10 flex flex-col items-center">
                                <mat-icon class="!text-boreal-red !w-12 !h-12 !text-5xl drop-shadow-[0_0_15px_var(--boreal-red)]" 
                                          [style.transform]="'rotate(' + (selected.geometry.heading || 0) + 'deg)'">
                                    navigation
                                </mat-icon>
                                <div class="mt-4 px-3 py-1 bg-boreal-canvas/90 border border-boreal-border rounded-sm flex flex-col items-center gap-0.5 shadow-2xl">
                                    <span class="text-[10px] font-black text-boreal-text-primary uppercase tracking-widest">{{ selected.id }}</span>
                                    <span class="text-[8px] font-mono text-boreal-text-muted tracking-tighter">{{ selected.class }} // IDENTIFIED</span>
                                </div>
                            </div>
 
                            <!-- Telemetry Overlays -->
                            <div class="absolute top-8 right-8 p-3 bg-boreal-canvas/80 backdrop-blur-xl text-[9px] font-mono border border-boreal-border rounded shadow-2xl text-boreal-text-secondary min-w-32">
                                <div class="flex justify-between gap-6 mb-1.5 border-b border-boreal-border pb-1">
                                    <span class="text-boreal-text-muted font-bold uppercase tracking-widest">Altitude</span>
                                    <span class="text-boreal-text-primary font-black">{{ (selected.geometry.y * 100).toFixed(0) }}m</span>
                                </div>
                                <div class="flex justify-between gap-6 mb-1.5 border-b border-boreal-border pb-1">
                                    <span class="text-boreal-text-muted font-bold uppercase tracking-widest">Velocity</span>
                                    <span class="text-boreal-text-primary font-black">{{ selected.geometry.velocity }} kts</span>
                                </div>
                                <div class="flex justify-between gap-6">
                                    <span class="text-boreal-text-muted font-bold uppercase tracking-widest">Heading</span>
                                    <span class="text-boreal-text-primary font-black">{{ selected.geometry.heading }}°</span>
                                </div>
                            </div>
 
                            <div class="absolute bottom-8 left-8 p-3 bg-boreal-canvas/80 backdrop-blur-xl text-[9px] font-mono border border-boreal-border rounded shadow-2xl text-boreal-text-secondary min-w-32">
                                <div class="text-[8px] text-boreal-text-muted font-bold uppercase tracking-widest mb-1.5 block">Estimated Target Candidates</div>
                                <div class="space-y-1">
                                    @for (target of analysis()?.targetCandidates; track target) {
                                        <div class="flex items-center gap-2">
                                            <div class="w-1 h-1 rounded-full bg-boreal-blue animate-pulse"></div>
                                            <span class="text-boreal-text-secondary font-bold uppercase tracking-tight">{{ target }}</span>
                                        </div>
                                    }
                                </div>
                            </div>
                        </div>
 
                        <!-- Scan Sweep Effect -->
                        <div class="absolute inset-0 bg-gradient-to-tr from-boreal-blue/10 to-transparent origin-center animate-[spin_6s_linear_infinite] opacity-30 pointer-events-none"></div>
                    } @else {
                        <div class="flex flex-col items-center gap-6 opacity-20">
                            <mat-icon class="!w-16 !h-16 !text-6xl text-boreal-text-muted">radar</mat-icon>
                            <div class="flex flex-col items-center gap-1">
                                <span class="text-xs uppercase font-black tracking-[0.4em] text-boreal-text-primary">Awaiting Track Selection</span>
                                <span class="text-[9px] font-mono text-boreal-text-muted italic">Initiate Drill-down from analysis queue</span>
                            </div>
                        </div>
                    }
                </div>
 
                <div class="h-1/3 p-6 overflow-y-auto bg-boreal-canvas/20">
                    <div class="flex items-center justify-between mb-5">
                        <span class="text-[10px] text-boreal-text-muted font-black uppercase tracking-[0.2em] block">SensorTwin Signal Evidence</span>
                        <div class="flex items-center gap-1">
                            <span class="text-[8px] font-mono text-boreal-green font-bold">SIGNAL LOCK: 0.98 NOMINAL</span>
                        </div>
                    </div>
                                        @if (analysis(); as res) {
                        <div class="grid grid-cols-2 gap-x-12 gap-y-4">
                            <div class="flex flex-col gap-1.5 group">
                                <div class="flex justify-between items-center text-[9px] uppercase font-bold tracking-tight text-boreal-text-muted">
                                    <span>Track Quality</span>
                                    <span class="font-mono font-black transition-colors" [class.text-boreal-green]="res.trackQuality >= 0.8" [class.text-boreal-amber]="res.trackQuality < 0.8">
                                        {{ (res.trackQuality * 100).toFixed(0) }}%
                                    </span>
                                </div>
                                <div class="h-1 bg-boreal-canvas rounded-full overflow-hidden border border-boreal-border">
                                    <div class="h-full transition-all duration-700 font-bold" [class.bg-boreal-green]="res.trackQuality >= 0.8" [class.bg-boreal-amber]="res.trackQuality < 0.8" [style.width.%]="res.trackQuality * 100"></div>
                                </div>
                            </div>
 
                            <div class="flex flex-col gap-1.5 group">
                                <div class="flex justify-between items-center text-[9px] uppercase font-bold tracking-tight text-boreal-text-muted">
                                    <span>Jamming Influence</span>
                                    <span class="font-mono font-black transition-colors" [class.text-boreal-green]="res.jammerEffect < 0.2" [class.text-boreal-amber]="res.jammerEffect >= 0.2">
                                        {{ (res.jammerEffect * 100).toFixed(0) }}%
                                    </span>
                                </div>
                                <div class="h-1 bg-boreal-canvas rounded-full overflow-hidden border border-boreal-border">
                                    <div class="h-full transition-all duration-700" [class.bg-boreal-green]="res.jammerEffect < 0.2" [class.bg-boreal-amber]="res.jammerEffect >= 0.2" [style.width.%]="res.jammerEffect * 100"></div>
                                </div>
                            </div>
 
                            <div class="flex flex-col gap-1.5">
                                <div class="flex justify-between items-center text-[9px] uppercase font-bold tracking-tight text-boreal-text-muted">
                                    <span>Sensor Quality Index</span>
                                    <span class="font-mono font-black text-boreal-text-primary uppercase">{{ (res.sensorQuality * 100).toFixed(0) }}%</span>
                                </div>
                                <div class="h-1 bg-boreal-canvas rounded-full overflow-hidden">
                                     <div class="h-full bg-boreal-text-primary/20 transition-all duration-700" [style.width.%]="res.sensorQuality * 100"></div>
                                </div>
                            </div>
 
                            <div class="flex flex-col gap-1.5">
                                <div class="flex justify-between items-center text-[9px] uppercase font-bold tracking-tight text-boreal-text-muted">
                                    <span>Kinetic Reach Plausibility</span>
                                    <span class="font-mono font-black text-boreal-text-primary uppercase tracking-tighter">{{ (res.kineticReachPlausibility * 100).toFixed(0) }}% P(reach)</span>
                                </div>
                                <div class="h-1 bg-boreal-canvas rounded-full overflow-hidden">
                                     <div class="h-full bg-boreal-text-primary/20 transition-all duration-700" [style.width.%]="res.kineticReachPlausibility * 100"></div>
                                </div>
                            </div>
                        </div>
 
                         <div class="mt-6 p-4 bg-boreal-panel-elevated/80 border border-boreal-border rounded-sm shadow-xl relative overflow-hidden group/uncertainty">
                            <div class="absolute inset-y-0 left-0 w-0.5 bg-boreal-blue group-hover/uncertainty:bg-boreal-text-primary transition-colors"></div>
                            <span class="text-[9px] text-boreal-text-muted font-black uppercase tracking-widest block mb-2">Uncertainty Logic Vector</span>
                            <p class="text-[11px] text-boreal-text-secondary leading-relaxed italic">
                                Dominant uncertainty source identified as <span class="text-boreal-blue font-black tracking-tight uppercase">{{ res.uncertaintySource }}</span>. 
                                @if (res.humanReviewRequired) {
                                    <span class="text-boreal-amber font-bold ml-1">Automated engagement inhibited. Heuristics suggest high-entropy deception pattern.</span>
                                } @else {
                                    Intent distribution stabilized across {{ res.sensorCount }} sensor nodes with {{ (res.trackQuality * 100).toFixed(0) }}% node agreement.
                                }
                            </p>
                        </div>
                    }
                </div>
             </section>
        </div>

         <!-- Right: Intent Distribution & Decision Influence -->
         <div class="col-span-12 lg:col-span-4 flex flex-col gap-6 overflow-hidden">
              <section class="flex-grow bg-boreal-panel border border-boreal-border rounded-sm overflow-hidden flex flex-col shadow-2xl relative">
                  <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted bg-boreal-panel-muted/20 flex justify-between items-center pr-3 border-b border-boreal-border">
                      <div class="flex items-center gap-2">
                        <mat-icon class="!text-xs">analytics</mat-icon>
                        <span>ThreatTwin Analysis Console</span>
                      </div>
                      @if (tactical.selectedTrack(); as selected) {
                        <span class="text-boreal-text-muted font-mono font-bold tracking-[0.2em]">{{ selected.id }}</span>
                      }
                  </div>
                  
                  @if (analysis(); as res) {
                     <div class="p-6 flex-grow flex flex-col overflow-y-auto scrollbar-thin">
                        
                        <!-- High Uncertainty Banner -->
                        @if (res.humanReviewRequired) {
                            <div class="mb-8 p-4 bg-boreal-amber/10 border border-boreal-amber/30 flex items-start gap-4 shadow-[0_0_15px_var(--boreal-amber)]">
                                <mat-icon class="text-boreal-amber !text-2xl !w-6 !h-6">security_update_warning</mat-icon>
                                <div class="flex flex-col gap-1">
                                    <span class="text-[11px] font-black text-boreal-amber uppercase tracking-widest">Human Review Required</span>
                                    <p class="text-[10px] text-boreal-text-secondary leading-relaxed italic">Confidence locked at {{ (res.confidence * 100).toFixed(0) }}%. Safety guardrails active due to <span class="uppercase tracking-tighter">{{ res.uncertaintySource }}</span> discrepancy.</p>
                                </div>
                            </div>
                        }

                        <div class="mb-10 space-y-6">
                             <!-- Intent Bars -->
                             <div class="flex items-center gap-2">
                                 <span class="text-[10px] text-boreal-text-muted font-black uppercase tracking-[0.2em]">Intent Probability Distribution</span>
                                 <span class="px-1.5 py-0.5 rounded bg-boreal-blue/10 border border-boreal-blue/20 text-boreal-blue text-[7px] font-black uppercase tracking-widest">
                                     {{ res.intentSourceLabel }}
                                 </span>
                             </div>
                             <div class="space-y-5">
                                @for (intent of res.intentDistribution; track intent.label) {
                                    <div class="flex flex-col gap-2">
                                        <div class="flex justify-between items-center group">
                                            <div class="flex items-center gap-2">
                                                @if (intent.isPrimary) {
                                                    <div class="w-1.5 h-1.5 rounded-full bg-boreal-blue shadow-[0_0_8px_var(--boreal-blue)]"></div>
                                                }
                                                <span class="text-[11px] font-black tracking-widest uppercase transition-colors" [class.text-boreal-text-primary]="intent.isPrimary" [class.text-boreal-text-muted]="!intent.isPrimary">{{intent.label}}</span>
                                            </div>
                                            <span class="text-[10px] font-mono font-bold" [class.text-boreal-blue]="intent.isPrimary" [class.text-boreal-text-muted]="!intent.isPrimary">{{ (intent.value * 100).toFixed(0) }}%</span>
                                        </div>
                                        <div class="h-1 w-full bg-boreal-canvas rounded-full overflow-hidden border border-boreal-border">
                                            <div class="h-full transition-all duration-1000 ease-out shadow-[0_0_8px_var(--boreal-blue)]"
                                                 [style.background]="intent.isPrimary ? 'var(--boreal-blue)' : 'var(--boreal-panel-muted)'"
                                                 [style.width.%]="intent.value * 100">
                                            </div>
                                        </div>
                                    </div>
                                }
                             </div>
                        </div>

                         <div class="grid grid-cols-2 gap-8 mb-10 pt-8 border-t border-boreal-border">
                            <div class="flex flex-col gap-2">
                                <span class="text-[9px] text-boreal-text-muted uppercase font-black tracking-widest">Kinetic Reach</span>
                                <div class="flex items-center gap-2.5">
                                     <span class="text-[11px] font-black uppercase tracking-tight" 
                                           [class.text-boreal-red]="res.kineticReach === 'CRITICAL'" 
                                           [class.text-boreal-amber]="res.kineticReach === 'PLAUSIBLE'"
                                           [class.text-boreal-green]="res.kineticReach === 'NEGLEGIBLE'">
                                        {{ res.kineticReach }}
                                     </span>
                                     <mat-icon class="!text-[14px]" 
                                               [class.text-boreal-red]="res.kineticReach === 'CRITICAL'" 
                                               [class.text-boreal-amber]="res.kineticReach === 'PLAUSIBLE'"
                                               [class.text-boreal-green]="res.kineticReach === 'NEGLEGIBLE'">
                                        gps_fixed
                                     </mat-icon>
                                </div>
                                <span class="text-[8px] font-mono text-boreal-text-muted uppercase tracking-tighter">P(reach): {{ (res.kineticReachPlausibility * 100).toFixed(0) }}%</span>
                            </div>
                            <div class="flex flex-col gap-2 border-l border-boreal-border pl-6">
                                <span class="text-[9px] text-boreal-text-muted uppercase font-black tracking-widest">Confidence Index</span>
                                <div class="flex items-center gap-2">
                                     <span class="text-[11px] font-black text-boreal-text-primary uppercase tabular-nums tracking-widest">{{ (res.confidence * 100).toFixed(0) }}%</span>
                                     <div class="flex gap-0.5">
                                        @for (i of [1,2,3,4,5]; track i) {
                                            <div class="w-1 h-3 rounded-full" [class.bg-boreal-blue]="res.confidence >= (i * 0.2)" [class.bg-boreal-panel-muted]="res.confidence < (i * 0.2)"></div>
                                        }
                                     </div>
                                </div>
                                <span class="text-[8px] font-mono text-boreal-text-muted uppercase tracking-tighter">Stability: NOMINAL</span>
                            </div>
                        </div>
                         <!-- Treatment Recommendation -->
                        <div class="p-5 bg-boreal-canvas/40 border border-boreal-border rounded-sm mb-8 relative overflow-hidden group/treatment shadow-xl">
                            <div class="absolute top-0 right-0 px-2 py-1 bg-boreal-blue/20 border-b border-l border-boreal-border text-[8px] text-boreal-blue font-black uppercase tracking-widest">
                                Policy: {{ res.policyModeText }}
                            </div>
                            <span class="text-boreal-text-muted font-black uppercase text-[9px] block mb-4 tracking-[0.2em]">Recommended Policy Treatment</span>
                            
                            <div class="flex items-start gap-5">
                                <div class="w-12 h-12 rounded bg-boreal-blue/10 border border-boreal-blue/20 flex items-center justify-center text-boreal-blue shadow-[0_0_15px_var(--boreal-blue)]">
                                    <mat-icon class="!text-2xl !w-6 !h-6">{{ res.treatmentIcon }}</mat-icon>
                                </div>
                                <div class="flex flex-grow flex-col gap-1.5">
                                    <span class="text-[11px] font-black text-boreal-text-primary tracking-widest uppercase">{{ res.treatmentAction }}</span>
                                    <p class="text-[10px] text-boreal-text-secondary leading-relaxed italic">
                                        {{ res.treatmentRationale }}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class="mt-auto pt-6 border-t border-boreal-border space-y-3">
                            <div class="flex gap-3">
                                <button 
                                    (click)="adjustIntent()"
                                    class="flex-grow py-3 bg-boreal-panel-elevated border border-boreal-border rounded-sm text-[10px] font-black text-boreal-text-muted hover:text-boreal-text-primary hover:bg-boreal-panel transition-all active:scale-[0.98]"
                                >
                                    Adjust intent
                                </button>
                                <button 
                                    (click)="tagForLab(res.id)"
                                    class="flex-grow py-3 bg-boreal-blue text-white rounded-sm text-[10px] font-black tracking-[0.2em] uppercase hover:brightness-110 shadow-lg shadow-boreal-blue/20 transition-all active:scale-[0.98]"
                                >
                                   Export to Lab
                                </button>
                            </div>
                            <div class="flex items-center justify-center gap-2 py-2 opacity-30">
                                <mat-icon class="!text-[10px]">lock</mat-icon>
                                <span class="text-[8px] font-mono tracking-widest uppercase">Analytical Lock: Ver 22.4 // Handoff Available</span>
                            </div>
                        </div>
                     </div>
                  } @else {
                      <div class="flex-grow flex flex-col items-center justify-center p-12 text-center text-boreal-text-muted gap-6">
                         <div class="w-20 h-20 rounded-full border border-dashed border-boreal-border flex items-center justify-center">
                            <mat-icon class="!w-10 !h-10 !text-4xl opacity-20">biotech</mat-icon>
                         </div>
                         <div class="flex flex-col gap-2">
                            <span class="font-black text-xs uppercase tracking-[0.3em] text-boreal-text-muted">Awaiting Signal Acquisition</span>
                            <span class="italic text-[10px] tracking-tight text-boreal-text-muted max-w-xs">Select track from Analysis Queue to initiate multi-spectral ThreatTwin drill-down.</span>
                         </div>
                      </div>
                  }
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
export class ThreatInspector {
    tactical = inject(TacticalStore);
    policy = inject(PolicyStore);
    orchestrator = inject(CapabilityOrchestrator);
    router = inject(Router);

    analysis = computed(() => {
        const track = this.tactical.selectedTrack();
        const activePolicy = this.policy.activePolicy();
        if (!track) return null;

        // Intent Distribution — prefer live Bayesian data from backend, fall back to heuristics
        const liveDistrib = track.intentDistribution;
        const intents: { label: string; value: number; isPrimary: boolean }[] = liveDistrib
            ? Object.entries(liveDistrib).map(([label, value]) => ({
                label: label.toUpperCase(),
                value: value as number,
                isPrimary: label.toUpperCase() === track.intent
              })).sort((a, b) => b.value - a.value)
            : (['PROBE', 'FEINT', 'STRIKE', 'SATURATION', 'DECOY'] as const).map(i => {
                let val = 0.05;
                if (i === track.intent) val = track.confidence;
                if (i === 'PROBE' && track.intent !== 'PROBE') val = (1 - track.confidence) * 0.4;
                if (i === 'DECOY' && track.class === 'DRONE') val += 0.15;
                return { label: i, value: val, isPrimary: i === track.intent };
              }).sort((a, b) => b.value - a.value);

        // Uncertainty & Sensor Analysis — use live fields when present
        const humanReviewRequired = (track.classificationConfidence ?? track.confidence) < 0.6 || !!track.uncertaintySource;
        const trackQuality = track.classificationConfidence ?? (track.confidence > 0.8 ? 0.96 : (track.confidence > 0.6 ? 0.84 : 0.62));
        const jammerEffect = track.jammingProbability ?? (track.uncertaintySource === 'Electronic Jamming' ? 0.45 : 0.05);
        const sensorQuality = track.sensorQuality ?? (1 - (jammerEffect * 0.8) - (track.confidence < 0.5 ? 0.2 : 0));
        
        // Kinetic Reach Plausibility
        const kineticReachPlausibility = Math.min(0.98, (track.geometry.velocity / 600) + (1 - track.timeToTarget / 500));
        let kineticReach = 'LOW';
        if (kineticReachPlausibility > 0.8) kineticReach = 'CRITICAL';
        else if (kineticReachPlausibility > 0.5) kineticReach = 'PLAUSIBLE';
        else if (kineticReachPlausibility < 0.2) kineticReach = 'NEGLEGIBLE';

        // Target Candidates
        const targetCandidates = ['Boreal-Watch Base', 'Sector-4 Node', 'Civilian Corridor'];
        if (track.geometry.heading > 170 && track.geometry.heading < 190) {
            targetCandidates.unshift('Primary Command Hub');
        }

        // Treatment Logic based on Intent + Policy
        const policyMode = activePolicy?.name || 'Standard';
        let treatmentAction = 'MONITOR';
        let treatmentIcon = 'visibility';
        let treatmentRationale = 'Acquiring multi-spectral lock for classification convergence.';

        if (track.intent === 'STRIKE') {
            treatmentAction = 'AUTHORIZED_ENGAGEMENT';
            treatmentIcon = 'security';
            treatmentRationale = `STRIKE intent verified. Engagement authorized under ${policyMode} policy to ensure zero leakage.`;
        } else if (track.intent === 'SATURATION') {
            treatmentAction = 'STAGGER_DEFENSE';
            treatmentIcon = 'shield';
            treatmentRationale = 'Saturation logic detected. Deploying staggered interceptor waves to maximize depth and conservation.';
        } else if (track.intent === 'FEINT' || track.intent === 'DECOY') {
            treatmentAction = 'SENSOR_DWELL';
            treatmentIcon = 'wifi_tethering';
            treatmentRationale = 'Behavioral anomalies match deception training sets. Increasing radar dwell time to differentiate signature.';
        } else if (humanReviewRequired) {
            treatmentAction = 'INTEL_OVERRIDE';
            treatmentIcon = 'person';
            treatmentRationale = 'Automated classifier entropy high. Intelligence override required before effector assignment.';
        }

        const intentSourceLabel = liveDistrib ? 'BAYESIAN EST.' : 'HEURISTIC';

        return {
            id: track.id,
            confidence: track.confidence,
            humanReviewRequired,
            trackQuality,
            jammerEffect,
            sensorQuality,
            kineticReach,
            kineticReachPlausibility,
            uncertaintySource: track.uncertaintySource || 'Ambient Noise',
            sensorCount: 8,
            targetCandidates: targetCandidates.slice(0, 3),
            intentDistribution: intents,
            intentSourceLabel,
            treatmentAction,
            treatmentIcon,
            treatmentRationale,
            policyModeText: policyMode,
            policyName: policyMode
        };
    });

    adjustIntent() {
        this.orchestrator.showFeature({
            name: 'Intent Override Logic',
            operationalFunction: 'Allows the Intelligence & Analysis Officer to manually override or weight specific intent hypotheses, triggering a downstream recalculation of all COA recommendations.',
            persona: 'Intelligence & Analysis Officer',
            decisionImproved: 'Tactical Deception Recognition & Resource Conservation',
            inputs: 'Track metadata, Sensor trace, Officer expertise',
            outputs: 'Modified Intent Probability Distribution',
            rationale: 'Automated intent classification may lag behind human recognition of novel deception patterns or strategic context.',
            status: 'STUBBED_UI',
            tier: 'MVP',
            nextStep: 'Implement weight-based slider UI for intent distribution override.'
        });
    }

    tagForLab(trackId: string) {
        // Set state for Lab
        this.tactical.setLabHandoff(trackId);

        this.orchestrator.showFeature({
            name: 'Robustness Lab Handoff',
            operationalFunction: 'Exports the selected track and its current uncertainty envelope to the Robustness Lab for adversarial stress-testing against different policy vectors.',
            persona: 'Intelligence & Analysis Officer / Commander',
            decisionImproved: 'Long-term Policy Robustness & Scenario Resilience',
            inputs: `ThreatTwin State (ID: ${trackId}), Uncertainty Model, Current Policy`,
            outputs: 'Scenario Context Payload to Lab',
            rationale: 'High-uncertainty tracks require deeper simulation to verify if our current policy is fragile to specific adversarial behavior variations.',
            status: 'OPERATIONAL',
            tier: 'MVP',
            nextStep: 'Navigation to Robustness Lab requested.'
        });

        // Navigate after a delay to show the feature details
        setTimeout(() => {
            this.router.navigate(['/robustness-lab']);
        }, 1500);
    }
}
