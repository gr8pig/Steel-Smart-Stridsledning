import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CapabilityOrchestrator, PlannedCapabilityInfo } from '../../core/services/capability-orchestrator';
import { AuditLogger } from '../../core/services/audit-logger';
import { PolicyStore } from '../../core/state/policy.store';
import { ScenarioStore } from '../../core/state/scenario.store';
import { SensorFeedStore } from '../../core/state/sensor-feed.store';
import { PolicyTwin } from '../domain/models';

type LogFilter = 'ALL' | 'TACTICAL' | 'POLICY' | 'READINESS' | 'LAB' | 'SYSTEM';
type MetricTone = 'blue' | 'amber' | 'green' | 'muted' | 'red';

interface FeatureMetric {
  label: string;
  value: string;
  tone: MetricTone;
}

interface FeatureViewModel {
  id?: string;
  variant?: 'STATIC' | 'POLICY_PROPAGATION' | 'INTENT_COMMITMENT' | 'LAB_HANDOFF';
  name: string;
  operationalFunction: string;
  persona: string;
  decisionImproved: string;
  inputs?: string;
  outputs?: string;
  dependencies?: string[];
  affectedScreens?: string[];
  rationale: string;
  status: 'STUBBED_UI' | 'PARTIAL_FRONTEND' | 'MOCK_DATA' | 'AWAITING_BACKEND' | 'OPERATIONAL' | 'OPERATIONAL_MOCK';
  tier: 'MVP' | 'SECONDARY' | 'STRETCH';
  nextStep: string;
  acknowledgeLabel?: string;
  liveMetrics?: FeatureMetric[];
}

@Component({
  selector: 'app-planned-capability-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (featureView(); as feature) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-boreal-canvas/80 backdrop-blur-sm"
        (click)="orchestrator.close()"
        (keydown.escape)="orchestrator.close()"
        tabindex="0"
        role="button"
        aria-label="Close modal backdrop"
      >
        <div
          class="design-card w-full flex flex-col max-h-[90vh] overflow-hidden !p-0"
          [class.max-w-3xl]="feature.id === 'audit-log-export' || feature.id === 'policy-trace' || feature.id === 'detailed-alerts'"
          [class.max-w-2xl]="feature.id !== 'audit-log-export' && feature.id !== 'policy-trace' && feature.id !== 'detailed-alerts'"
          (click)="$event.stopPropagation()"
          (keydown)="$event.stopPropagation()"
          tabindex="-1"
          role="dialog"
        >
          @switch (feature.id) {

            <!-- ============================================================ -->
            <!-- TACTICAL ALERTS                                               -->
            <!-- ============================================================ -->
            @case ('detailed-alerts') {
              <header class="panel-header flex items-center justify-between border-b border-boreal-border p-4 h-14 bg-boreal-panel-muted/40">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded bg-boreal-red/20 flex items-center justify-center">
                    <mat-icon class="text-boreal-red !text-lg">notifications_none</mat-icon>
                  </div>
                  <div>
                    <h2 class="text-[10px] uppercase tracking-[0.25em] font-black text-boreal-text-primary">Tactical Alerts</h2>
                    <p class="text-[8px] text-boreal-text-muted font-mono uppercase tracking-[0.15em]">{{audit.logs().length}} EVENTS LOGGED THIS SESSION</p>
                  </div>
                </div>
                <button (click)="orchestrator.close()" class="p-2 hover:bg-boreal-blue/10 rounded transition-colors group">
                  <mat-icon class="text-boreal-text-muted group-hover:text-boreal-blue">close</mat-icon>
                </button>
              </header>

              <div class="flex gap-1 px-4 py-2 border-b border-boreal-border bg-boreal-canvas/20 shrink-0">
                @for (cat of alertCategories; track cat) {
                  <button
                    (click)="logFilter.set(cat)"
                    class="px-2.5 py-1 text-[8px] font-black uppercase tracking-widest rounded-sm transition-all"
                    [class.bg-boreal-blue]="logFilter() === cat"
                    [class.text-white]="logFilter() === cat"
                    [class.text-boreal-text-muted]="logFilter() !== cat"
                    [class.hover:bg-boreal-panel-elevated]="logFilter() !== cat"
                  >{{cat}}</button>
                }
              </div>

              <div class="flex-grow overflow-y-auto bg-boreal-panel divide-y divide-boreal-border/40">
                @for (log of filteredLogs(); track log.id) {
                  <div class="flex items-start gap-3 px-4 py-3 hover:bg-boreal-panel-elevated/40 transition-colors">
                    <span class="text-[9px] font-mono text-boreal-text-muted shrink-0 pt-0.5 w-[4.5rem]">{{log.time}}</span>
                    <span class="shrink-0 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider rounded-sm" [class]="actorClass(log.actor)">{{log.actor}}</span>
                    <span class="shrink-0 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider rounded-sm" [class]="categoryClass(log.category)">{{log.category}}</span>
                    <div class="flex flex-col gap-0.5 min-w-0 flex-grow">
                      <span class="text-[10px] font-bold text-boreal-text-primary">{{log.action}}</span>
                      <span class="text-[9px] text-boreal-text-muted leading-tight">{{log.rationale}}</span>
                    </div>
                  </div>
                }
                @empty {
                  <div class="flex items-center justify-center h-24 text-boreal-text-muted text-[10px] font-mono uppercase tracking-widest">
                    No events in this category
                  </div>
                }
              </div>

              <footer class="p-4 border-t border-boreal-border flex justify-between items-center bg-boreal-panel-muted/40 shrink-0">
                <button
                  (click)="audit.clear()"
                  class="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-boreal-text-muted border border-boreal-border rounded-sm hover:text-boreal-red hover:border-boreal-red/40 transition-colors"
                >
                  Clear Log
                </button>
                <button (click)="orchestrator.close()" class="px-8 py-2 bg-boreal-blue text-white rounded-sm text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-boreal-blue/20">
                  Close
                </button>
              </footer>
            }

            <!-- ============================================================ -->
            <!-- GOVERNANCE AUDIT EXPORT                                       -->
            <!-- ============================================================ -->
            @case ('audit-log-export') {
              <header class="panel-header flex items-center justify-between border-b border-boreal-border p-4 h-14 bg-boreal-panel-muted/40">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded bg-boreal-green/20 flex items-center justify-center">
                    <mat-icon class="text-boreal-green !text-lg">terminal</mat-icon>
                  </div>
                  <div>
                    <h2 class="text-[10px] uppercase tracking-[0.25em] font-black text-boreal-text-primary">Governance Audit Trail</h2>
                    <p class="text-[8px] text-boreal-text-muted font-mono uppercase tracking-[0.15em]">SESSION LOG · {{audit.logs().length}} ENTRIES · NON-REPUDIABLE</p>
                  </div>
                </div>
                <button (click)="orchestrator.close()" class="p-2 hover:bg-boreal-blue/10 rounded transition-colors group">
                  <mat-icon class="text-boreal-text-muted group-hover:text-boreal-blue">close</mat-icon>
                </button>
              </header>

              <div class="flex gap-6 px-6 py-3 bg-boreal-canvas/30 border-b border-boreal-border shrink-0">
                @for (stat of auditStats(); track stat.label) {
                  <div class="flex flex-col gap-0.5">
                    <span class="text-[7px] font-black text-boreal-text-muted uppercase tracking-widest">{{stat.label}}</span>
                    <span class="text-[13px] font-black font-mono" [class]="stat.colorClass">{{stat.value}}</span>
                  </div>
                }
              </div>

              <div class="flex-grow overflow-y-auto bg-boreal-panel divide-y divide-boreal-border/40">
                @for (log of audit.logs(); track log.id) {
                  <div class="flex items-start gap-3 px-4 py-2.5 hover:bg-boreal-panel-elevated/40 transition-colors">
                    <span class="text-[8px] font-mono text-boreal-text-muted shrink-0 pt-0.5 w-[4.5rem]">{{log.time}}</span>
                    <span class="shrink-0 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider rounded-sm w-[5rem] text-center" [class]="actorClass(log.actor)">{{log.actor}}</span>
                    <span class="shrink-0 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider rounded-sm w-[5rem] text-center" [class]="categoryClass(log.category)">{{log.category}}</span>
                    <div class="flex flex-col gap-0.5 min-w-0">
                      <span class="text-[9px] font-bold text-boreal-text-primary">{{log.action}}</span>
                      <span class="text-[8px] text-boreal-text-muted leading-tight font-mono">{{log.rationale}}</span>
                    </div>
                  </div>
                }
              </div>

              <footer class="p-4 border-t border-boreal-border flex justify-between items-center bg-boreal-panel-muted/40 shrink-0">
                <div class="flex gap-2">
                  <button
                    (click)="exportJSON()"
                    class="flex items-center gap-1.5 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-boreal-green border border-boreal-green/40 rounded-sm hover:bg-boreal-green/10 transition-colors"
                  >
                    <mat-icon class="!text-sm">download</mat-icon>
                    Export JSON
                  </button>
                  <button
                    (click)="exportCSV()"
                    class="flex items-center gap-1.5 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-boreal-text-muted border border-boreal-border rounded-sm hover:bg-boreal-panel-elevated transition-colors"
                  >
                    <mat-icon class="!text-sm">table_chart</mat-icon>
                    Export CSV
                  </button>
                </div>
                <button (click)="orchestrator.close()" class="px-8 py-2 bg-boreal-blue text-white rounded-sm text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-boreal-blue/20">
                  Close
                </button>
              </footer>
            }

            <!-- ============================================================ -->
            <!-- POLICY LOGIC TRACE                                            -->
            <!-- ============================================================ -->
            @case ('policy-trace') {
              <header class="panel-header flex items-center justify-between border-b border-boreal-border p-4 h-14 bg-boreal-panel-muted/40">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded bg-boreal-blue/20 flex items-center justify-center">
                    <mat-icon class="text-boreal-blue !text-lg">biotech</mat-icon>
                  </div>
                  <div>
                    <h2 class="text-[10px] uppercase tracking-[0.25em] font-black text-boreal-text-primary">Policy Logic Trace</h2>
                    <p class="text-[8px] text-boreal-text-muted font-mono uppercase tracking-[0.15em]">COA ATTRIBUTION · {{policy.availableCOAs().length}} ALTERNATIVES ON PARETO FRONT</p>
                  </div>
                </div>
                <button (click)="orchestrator.close()" class="p-2 hover:bg-boreal-blue/10 rounded transition-colors group">
                  <mat-icon class="text-boreal-text-muted group-hover:text-boreal-blue">close</mat-icon>
                </button>
              </header>

              <div class="flex-grow overflow-y-auto p-6 space-y-6 bg-boreal-panel">
                @if (policy.activePolicy(); as p) {

                  <!-- Weight Vector -->
                  <section>
                    <span class="text-[9px] font-black text-boreal-text-muted uppercase tracking-[0.2em] block mb-4">Active Policy Weight Vector</span>
                    <div class="space-y-3">
                      <div class="flex items-center gap-3">
                        <span class="w-24 text-[9px] font-black text-boreal-text-muted uppercase tracking-wider shrink-0">Safety</span>
                        <div class="flex-grow h-2 bg-boreal-panel-elevated rounded-full overflow-hidden">
                          <div class="h-full bg-boreal-red rounded-full transition-all duration-500" [style.width.%]="p.weights.safety * 100"></div>
                        </div>
                        <span class="w-10 text-right text-[10px] font-black text-boreal-text-primary font-mono">{{(p.weights.safety * 100).toFixed(0)}}%</span>
                      </div>
                      <div class="flex items-center gap-3">
                        <span class="w-24 text-[9px] font-black text-boreal-text-muted uppercase tracking-wider shrink-0">Sustainability</span>
                        <div class="flex-grow h-2 bg-boreal-panel-elevated rounded-full overflow-hidden">
                          <div class="h-full bg-boreal-green rounded-full transition-all duration-500" [style.width.%]="p.weights.sustainability * 100"></div>
                        </div>
                        <span class="w-10 text-right text-[10px] font-black text-boreal-text-primary font-mono">{{(p.weights.sustainability * 100).toFixed(0)}}%</span>
                      </div>
                      <div class="flex items-center gap-3">
                        <span class="w-24 text-[9px] font-black text-boreal-text-muted uppercase tracking-wider shrink-0">Resilience</span>
                        <div class="flex-grow h-2 bg-boreal-panel-elevated rounded-full overflow-hidden">
                          <div class="h-full bg-boreal-blue rounded-full transition-all duration-500" [style.width.%]="p.weights.resilience * 100"></div>
                        </div>
                        <span class="w-10 text-right text-[10px] font-black text-boreal-text-primary font-mono">{{(p.weights.resilience * 100).toFixed(0)}}%</span>
                      </div>
                    </div>
                    <div class="mt-4 p-3 bg-boreal-canvas/40 rounded-sm border border-boreal-border">
                      <span class="text-[8px] text-boreal-text-muted font-mono">
                        ATTRIBUTION CHAIN: Safety&nbsp;
                        @if (p.weights.safety > 0.75) {
                          &gt; 75% threshold → selects <span class="text-boreal-red font-bold">MAX_PROTECTION</span>
                        } @else if (p.weights.sustainability > 0.75) {
                          &lt; 75% · Sustainability &gt; 75% → selects <span class="text-boreal-green font-bold">DEEP_SUSTAINABILITY</span>
                        } @else {
                          &lt; 75% · all balanced → selects <span class="text-boreal-blue font-bold">BALANCED</span>
                        }
                      </span>
                    </div>
                  </section>

                  <!-- Recommended COA -->
                  @if (policy.recommendedCOA(); as rec) {
                    <section>
                      <span class="text-[9px] font-black text-boreal-text-muted uppercase tracking-[0.2em] block mb-3">Recommended COA</span>
                      <div class="p-5 bg-boreal-blue/5 border border-boreal-blue/30 rounded-sm">
                        <div class="flex justify-between items-start mb-3">
                          <span class="text-base font-bold text-boreal-text-primary">{{rec.name}}</span>
                          <span class="px-2 py-0.5 bg-boreal-blue/20 text-boreal-blue border border-boreal-blue/30 text-[7px] font-black uppercase tracking-widest rounded-sm">{{rec.type}}</span>
                        </div>
                        <p class="text-[9px] text-boreal-text-secondary italic mb-4 leading-relaxed">{{rec.rationale}}</p>
                        <div class="grid grid-cols-4 gap-4">
                          <div class="flex flex-col gap-0.5">
                            <span class="text-[7px] font-black text-boreal-text-muted uppercase tracking-widest">Intercepts</span>
                            <span class="text-[18px] font-black font-mono text-boreal-green leading-none">{{rec.projectedOutcome.intercepts}}</span>
                          </div>
                          <div class="flex flex-col gap-0.5">
                            <span class="text-[7px] font-black text-boreal-text-muted uppercase tracking-widest">Leakage</span>
                            <span class="text-[18px] font-black font-mono leading-none"
                              [class.text-boreal-green]="rec.projectedOutcome.leakage === 0"
                              [class.text-boreal-red]="rec.projectedOutcome.leakage > 0">{{rec.projectedOutcome.leakage}}</span>
                          </div>
                          <div class="flex flex-col gap-0.5">
                            <span class="text-[7px] font-black text-boreal-text-muted uppercase tracking-widest">Robustness</span>
                            <span class="text-[18px] font-black font-mono text-boreal-text-primary leading-none">{{(rec.projectedOutcome.robustnessScore * 100).toFixed(0)}}%</span>
                          </div>
                          <div class="flex flex-col gap-0.5">
                            <span class="text-[7px] font-black text-boreal-text-muted uppercase tracking-widest">Confidence</span>
                            <span class="text-[18px] font-black font-mono text-boreal-text-primary leading-none">{{(rec.projectedOutcome.confidence * 100).toFixed(0)}}%</span>
                          </div>
                        </div>
                      </div>
                    </section>
                  }

                  <!-- Full Pareto Set -->
                  <section>
                    <span class="text-[9px] font-black text-boreal-text-muted uppercase tracking-[0.2em] block mb-3">Full Pareto Comparison</span>
                    <div class="overflow-x-auto">
                      <table class="w-full">
                        <thead>
                          <tr class="border-b border-boreal-border text-boreal-text-muted text-[7px] font-black uppercase tracking-widest">
                            <th class="text-left py-2 pr-4">COA ID</th>
                            <th class="text-left py-2 pr-4">Type</th>
                            <th class="text-right py-2 pr-4">Intercepts</th>
                            <th class="text-right py-2 pr-4">Leakage</th>
                            <th class="text-right py-2 pr-4">Robustness</th>
                            <th class="text-right py-2 pr-4">Confidence</th>
                            <th class="text-right py-2">Cost ($K)</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-boreal-border/30">
                          @for (coa of policy.availableCOAs(); track coa.id) {
                            <tr class="transition-colors hover:bg-boreal-panel-elevated/50 font-mono text-[9px]"
                                [class.bg-boreal-blue/5]="coa.id === policy.selectedCOAId()">
                              <td class="py-2.5 pr-4 font-bold text-boreal-text-primary">
                                {{coa.id}}
                                @if (coa.id === policy.selectedCOAId()) {
                                  <span class="ml-1.5 px-1 py-0.5 text-[6px] bg-boreal-blue/20 text-boreal-blue rounded-sm uppercase tracking-widest font-black">Active</span>
                                }
                              </td>
                              <td class="py-2.5 pr-4 text-boreal-text-secondary text-[8px]">{{coa.type.replace('_', ' ')}}</td>
                              <td class="py-2.5 pr-4 text-right font-bold text-boreal-green">{{coa.projectedOutcome.intercepts}}</td>
                              <td class="py-2.5 pr-4 text-right font-bold"
                                  [class.text-boreal-green]="coa.projectedOutcome.leakage === 0"
                                  [class.text-boreal-red]="coa.projectedOutcome.leakage > 0">{{coa.projectedOutcome.leakage}}</td>
                              <td class="py-2.5 pr-4 text-right text-boreal-text-primary">{{(coa.projectedOutcome.robustnessScore * 100).toFixed(0)}}%</td>
                              <td class="py-2.5 pr-4 text-right text-boreal-text-primary">{{(coa.projectedOutcome.confidence * 100).toFixed(0)}}%</td>
                              <td class="py-2.5 text-right text-boreal-text-secondary">{{(coa.projectedOutcome.cost / 1000).toFixed(0)}}</td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <!-- Guardrails -->
                  <section>
                    <span class="text-[9px] font-black text-boreal-text-muted uppercase tracking-[0.2em] block mb-3">Active Guardrails</span>
                    <div class="grid grid-cols-2 gap-3">
                      <div class="p-3 bg-boreal-canvas/40 rounded-sm border border-boreal-border flex justify-between items-center">
                        <span class="text-[9px] font-bold text-boreal-text-secondary">Engagement Authority</span>
                        <span class="text-[9px] font-black text-boreal-text-primary font-mono uppercase">{{p.guardrails.engagementAuthority}}</span>
                      </div>
                      <div class="p-3 bg-boreal-canvas/40 rounded-sm border border-boreal-border flex justify-between items-center">
                        <span class="text-[9px] font-bold text-boreal-text-secondary">Reserve Floor</span>
                        <span class="text-[9px] font-black text-boreal-text-primary font-mono">{{p.guardrails.reserveInterceptorFloor}} units</span>
                      </div>
                      <div class="p-3 bg-boreal-canvas/40 rounded-sm border border-boreal-border flex justify-between items-center">
                        <span class="text-[9px] font-bold text-boreal-text-secondary">Min Readiness Threshold</span>
                        <span class="text-[9px] font-black text-boreal-text-primary font-mono">{{(p.guardrails.minReadinessThreshold * 100).toFixed(0)}}%</span>
                      </div>
                      <div class="p-3 bg-boreal-canvas/40 rounded-sm border border-boreal-border flex justify-between items-center">
                        <span class="text-[9px] font-bold text-boreal-text-secondary">Civilian Protection</span>
                        <span class="text-[9px] font-black uppercase font-mono"
                          [class.text-boreal-green]="p.guardrails.civilianProtected"
                          [class.text-boreal-red]="!p.guardrails.civilianProtected">
                          {{p.guardrails.civilianProtected ? 'ACTIVE' : 'INACTIVE'}}
                        </span>
                      </div>
                    </div>
                  </section>

                }
              </div>

              <footer class="p-4 border-t border-boreal-border flex justify-end bg-boreal-panel-muted/40 shrink-0">
                <button (click)="orchestrator.close()" class="px-8 py-2.5 bg-boreal-blue text-white rounded-sm text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-boreal-blue/20 hover:brightness-110 active:scale-95 transition-all">
                  Close
                </button>
              </footer>
            }

            <!-- ============================================================ -->
            <!-- SCENARIO REPLAY CONTROLS                                      -->
            <!-- ============================================================ -->
            @case ('replay-scrub') {
              <header class="panel-header flex items-center justify-between border-b border-boreal-border p-4 h-14 bg-boreal-panel-muted/40">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded bg-boreal-green/20 flex items-center justify-center">
                    <mat-icon class="text-boreal-green !text-lg">history</mat-icon>
                  </div>
                  <div>
                    <h2 class="text-[10px] uppercase tracking-[0.25em] font-black text-boreal-text-primary">Scenario Replay Controls</h2>
                    <p class="text-[8px] text-boreal-text-muted font-mono uppercase tracking-[0.15em]">{{scenario.scenarioName()}} · {{scenario.currentPhase()?.name}}</p>
                  </div>
                </div>
                <button (click)="orchestrator.close()" class="p-2 hover:bg-boreal-blue/10 rounded transition-colors group">
                  <mat-icon class="text-boreal-text-muted group-hover:text-boreal-blue">close</mat-icon>
                </button>
              </header>

              <div class="flex-grow overflow-y-auto p-6 space-y-6 bg-boreal-panel">

                <!-- Time Display & Playback -->
                <section>
                  <div class="flex items-center justify-between">
                    <div class="flex flex-col gap-1">
                      <span class="text-[9px] font-black text-boreal-text-muted uppercase tracking-[0.2em]">Simulation Clock</span>
                      <span class="text-3xl font-mono font-black text-boreal-text-primary tabular-nums tracking-tight">{{formatTime(scenario.simTime())}}</span>
                    </div>
                    <div class="flex items-center gap-3">
                      <span class="px-2.5 py-1 text-[8px] font-black uppercase tracking-widest rounded-sm border"
                            [class.bg-boreal-green/10]="scenario.runState() === 'RUNNING'"
                            [class.text-boreal-green]="scenario.runState() === 'RUNNING'"
                            [class.border-boreal-green/30]="scenario.runState() === 'RUNNING'"
                            [class.bg-boreal-amber/10]="scenario.runState() === 'PAUSED'"
                            [class.text-boreal-amber]="scenario.runState() === 'PAUSED'"
                            [class.border-boreal-amber/30]="scenario.runState() === 'PAUSED'"
                            [class.bg-boreal-panel-elevated]="scenario.runState() === 'IDLE' || scenario.runState() === 'REPLAY'"
                            [class.text-boreal-text-muted]="scenario.runState() === 'IDLE' || scenario.runState() === 'REPLAY'"
                            [class.border-boreal-border]="scenario.runState() === 'IDLE' || scenario.runState() === 'REPLAY'">
                        {{scenario.runState()}}
                      </span>
                      <button
                        (click)="toggleReplayPlayback()"
                        class="w-10 h-10 flex items-center justify-center border rounded-sm transition-all"
                        [class.bg-boreal-green/10]="scenario.runState() !== 'RUNNING'"
                        [class.border-boreal-green/30]="scenario.runState() !== 'RUNNING'"
                        [class.text-boreal-green]="scenario.runState() !== 'RUNNING'"
                        [class.bg-boreal-amber/10]="scenario.runState() === 'RUNNING'"
                        [class.border-boreal-amber/30]="scenario.runState() === 'RUNNING'"
                        [class.text-boreal-amber]="scenario.runState() === 'RUNNING'"
                      >
                        <mat-icon class="!text-base">{{scenario.runState() === 'RUNNING' ? 'pause' : 'play_arrow'}}</mat-icon>
                      </button>
                      <button
                        (click)="resetReplay()"
                        class="w-10 h-10 flex items-center justify-center border border-boreal-border rounded-sm text-boreal-text-muted hover:text-boreal-text-primary hover:bg-boreal-panel-elevated transition-all"
                        title="Reset to T+0"
                      >
                        <mat-icon class="!text-base">skip_previous</mat-icon>
                      </button>
                    </div>
                  </div>
                </section>

                <!-- Timeline Scrubber -->
                <section>
                  <span class="text-[9px] font-black text-boreal-text-muted uppercase tracking-[0.2em] block mb-3">Timeline Scrub (0 – 2h)</span>
                  <div class="px-1">
                    <input
                      type="range"
                      min="0"
                      max="7200"
                      [value]="scenario.simTime()"
                      (input)="onTimeSlider($event)"
                      class="w-full cursor-pointer accent-boreal-green"
                    />
                    <div class="flex justify-between text-[7px] text-boreal-text-muted font-mono mt-1.5 px-0.5">
                      <span>T+00:00</span>
                      <span>T+00:30</span>
                      <span>T+01:00</span>
                      <span>T+01:30</span>
                      <span>T+02:00</span>
                    </div>
                  </div>
                </section>

                <!-- Phase Navigation -->
                <section>
                  <span class="text-[9px] font-black text-boreal-text-muted uppercase tracking-[0.2em] block mb-3">Scenario Phases</span>
                  <div class="space-y-2">
                    @for (phase of scenario.phases(); track phase.id) {
                      <div
                        class="flex items-center gap-3 p-3 rounded-sm border transition-colors"
                        [class.bg-boreal-green/5]="phase.status === 'ACTIVE'"
                        [class.border-boreal-green/30]="phase.status === 'ACTIVE'"
                        [class.bg-boreal-canvas/20]="phase.status === 'COMPLETED'"
                        [class.border-boreal-border/40]="phase.status === 'COMPLETED'"
                        [class.bg-boreal-panel-elevated/20]="phase.status === 'UPCOMING'"
                        [class.border-boreal-border]="phase.status === 'UPCOMING'"
                      >
                        <div
                          class="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                          [class.bg-boreal-green/20]="phase.status === 'ACTIVE'"
                          [class.bg-boreal-panel-elevated]="phase.status !== 'ACTIVE'"
                        >
                          @if (phase.status === 'COMPLETED') {
                            <mat-icon class="!text-xs text-boreal-text-muted">check</mat-icon>
                          } @else if (phase.status === 'ACTIVE') {
                            <div class="w-2 h-2 rounded-full bg-boreal-green animate-pulse"></div>
                          } @else {
                            <div class="w-2 h-2 rounded-full bg-boreal-border"></div>
                          }
                        </div>
                        <div class="flex flex-col flex-grow min-w-0">
                          <span
                            class="text-[10px] font-bold uppercase tracking-tight"
                            [class.text-boreal-green]="phase.status === 'ACTIVE'"
                            [class.text-boreal-text-secondary]="phase.status === 'COMPLETED'"
                            [class.text-boreal-text-primary]="phase.status === 'UPCOMING'"
                          >{{phase.name}}</span>
                          <span class="text-[9px] text-boreal-text-muted truncate">{{phase.description}}</span>
                        </div>
                        <span
                          class="px-2 py-0.5 text-[7px] font-black uppercase tracking-widest rounded-sm shrink-0"
                          [class.bg-boreal-green/10]="phase.status === 'ACTIVE'"
                          [class.text-boreal-green]="phase.status === 'ACTIVE'"
                          [class.bg-boreal-panel-elevated]="phase.status !== 'ACTIVE'"
                          [class.text-boreal-text-muted]="phase.status !== 'ACTIVE'"
                        >{{phase.status}}</span>
                        @if (phase.status !== 'ACTIVE') {
                          <button
                            (click)="scenario.setPhase(phase.id)"
                            class="px-3 py-1.5 text-[8px] font-black uppercase tracking-widest rounded-sm border border-boreal-border text-boreal-text-muted hover:text-boreal-text-primary hover:bg-boreal-panel-elevated transition-all shrink-0"
                          >Jump</button>
                        }
                      </div>
                    }
                  </div>
                </section>

              </div>

              <footer class="p-4 border-t border-boreal-border flex justify-end bg-boreal-panel-muted/40 shrink-0">
                <button (click)="orchestrator.close()" class="px-8 py-2.5 bg-boreal-blue text-white rounded-sm text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-boreal-blue/20 hover:brightness-110 active:scale-95 transition-all">
                  Close
                </button>
              </footer>
            }

            <!-- ============================================================ -->
            <!-- DEFAULT: Architecture Preview (ad-hoc / unregistered features) -->
            <!-- ============================================================ -->
            @default {
              <header class="panel-header flex items-center justify-between border-b border-boreal-border p-4 h-14 bg-boreal-panel-muted/40">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded bg-boreal-blue/20 flex items-center justify-center">
                    <mat-icon class="text-boreal-blue !text-lg">architecture</mat-icon>
                  </div>
                  <div>
                    <h2 class="text-[10px] uppercase tracking-[0.25em] font-black text-boreal-text-primary">Operational Intent</h2>
                    <p class="text-[8px] text-boreal-text-muted font-mono uppercase tracking-[0.15em]">SYSTEM ARCHITECTURE PREVIEW</p>
                  </div>
                </div>
                <button (click)="orchestrator.close()" class="p-2 hover:bg-boreal-blue/10 rounded transition-colors group">
                  <mat-icon class="text-boreal-text-muted group-hover:text-boreal-blue">close</mat-icon>
                </button>
              </header>

              <div class="flex-grow overflow-y-auto p-8 space-y-8 bg-boreal-panel">
                <section>
                  <div class="flex items-center justify-between mb-3">
                    <h3 class="text-2xl font-light text-boreal-text-primary tracking-tight">{{feature.name}}</h3>
                    <div class="flex gap-2">
                      <span class="px-2 py-0.5 rounded-sm bg-boreal-panel-muted text-boreal-text-secondary text-[8px] font-black border border-boreal-border uppercase tracking-widest">
                        {{feature.status.replace('_', ' ')}}
                      </span>
                      <span
                        class="px-2 py-0.5 rounded-sm text-[8px] font-black border uppercase tracking-widest"
                        [class.bg-boreal-blue/10]="feature.tier === 'MVP'"
                        [class.text-boreal-blue]="feature.tier === 'MVP'"
                        [class.border-boreal-blue/20]="feature.tier === 'MVP'"
                        [class.bg-boreal-amber/10]="feature.tier === 'SECONDARY'"
                        [class.text-boreal-amber]="feature.tier === 'SECONDARY'"
                        [class.border-boreal-amber/20]="feature.tier === 'SECONDARY'"
                        [class.bg-boreal-panel-elevated]="feature.tier === 'STRETCH'"
                        [class.text-boreal-text-muted]="feature.tier === 'STRETCH'"
                        [class.border-boreal-border]="feature.tier === 'STRETCH'"
                      >
                        Tier: {{feature.tier}}
                      </span>
                    </div>
                  </div>
                  <p class="text-sm text-boreal-text-secondary leading-relaxed font-sans italic border-l-2 border-boreal-blue/30 pl-4 py-1">{{feature.rationale}}</p>
                </section>

                @if (feature.liveMetrics?.length) {
                  <section class="grid grid-cols-2 gap-3 md:grid-cols-4">
                    @for (metric of feature.liveMetrics; track metric.label) {
                      <div
                        class="rounded-sm border bg-boreal-canvas/40 px-3 py-2"
                        [class.border-boreal-blue/30]="metric.tone === 'blue'"
                        [class.border-boreal-amber/30]="metric.tone === 'amber'"
                        [class.border-boreal-green/30]="metric.tone === 'green'"
                        [class.border-boreal-border]="metric.tone === 'muted'"
                        [class.border-boreal-red/30]="metric.tone === 'red'"
                      >
                        <span class="block text-[7px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">{{metric.label}}</span>
                        <span
                          class="block pt-1 text-[10px] font-bold uppercase tracking-tight"
                          [class.text-boreal-blue]="metric.tone === 'blue'"
                          [class.text-boreal-amber]="metric.tone === 'amber'"
                          [class.text-boreal-green]="metric.tone === 'green'"
                          [class.text-boreal-text-primary]="metric.tone === 'muted'"
                          [class.text-boreal-red]="metric.tone === 'red'"
                        >{{metric.value}}</span>
                      </div>
                    }
                  </section>
                }

                <div class="grid grid-cols-2 gap-8 pt-8 border-t border-boreal-border">
                  <div class="space-y-4">
                    <div class="flex flex-col gap-1">
                      <span class="text-[9px] font-black text-boreal-text-muted uppercase tracking-[0.2em]">Primary Persona</span>
                      <span class="text-[11px] font-bold text-boreal-text-primary uppercase tracking-tight">{{feature.persona}}</span>
                    </div>
                    <div class="flex flex-col gap-1">
                      <span class="text-[9px] font-black text-boreal-text-muted uppercase tracking-[0.2em]">Planned Inputs</span>
                      <span class="text-[10px] text-boreal-text-secondary italic leading-tight">{{feature.inputs || 'Not specified'}}</span>
                    </div>
                  </div>
                  <div class="space-y-4">
                    <div class="flex flex-col gap-1">
                      <span class="text-[9px] font-black text-boreal-text-muted uppercase tracking-[0.2em]">Target Decision</span>
                      <span class="text-[11px] font-bold text-boreal-text-primary uppercase tracking-tight">{{feature.decisionImproved}}</span>
                    </div>
                    <div class="flex flex-col gap-1">
                      <span class="text-[9px] font-black text-boreal-text-muted uppercase tracking-[0.2em]">Planned Outputs</span>
                      <span class="text-[10px] text-boreal-text-secondary italic leading-tight">{{feature.outputs || 'Not specified'}}</span>
                    </div>
                  </div>
                </div>

                <section class="p-6 bg-boreal-canvas/40 border border-boreal-border rounded-sm space-y-3">
                  <span class="text-[9px] font-black text-boreal-text-muted uppercase tracking-[0.2em] block">Operational Logic</span>
                  <p class="text-xs text-boreal-text-secondary leading-relaxed">{{feature.operationalFunction}}</p>
                </section>

                <section class="p-5 bg-boreal-amber/5 rounded-sm border border-boreal-amber/20 flex items-start gap-4">
                  <mat-icon class="text-boreal-amber !text-base mt-1">rocket_launch</mat-icon>
                  <div class="flex flex-col gap-1">
                    <span class="text-[9px] font-black text-boreal-amber uppercase tracking-widest">Next Implementation Step</span>
                    <span class="text-xs text-boreal-text-primary font-bold">{{feature.nextStep}}</span>
                  </div>
                </section>
              </div>

              <footer class="p-4 border-t border-boreal-border flex justify-end bg-boreal-panel-muted/40 backdrop-blur-md shrink-0">
                <button (click)="orchestrator.close()" class="px-8 py-2.5 bg-boreal-blue text-white rounded-sm text-[10px] font-black transition-all uppercase tracking-[0.2em] shadow-lg shadow-boreal-blue/20 hover:brightness-110 active:scale-95">
                  {{feature.acknowledgeLabel || 'ACKNOWLEDGE PLAN'}}
                </button>
              </footer>
            }

          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlannedCapabilityModal {
  orchestrator = inject(CapabilityOrchestrator);
  audit        = inject(AuditLogger);
  policy       = inject(PolicyStore);
  scenario     = inject(ScenarioStore);
  sensorFeed   = inject(SensorFeedStore);

  readonly alertCategories: LogFilter[] = ['ALL', 'TACTICAL', 'POLICY', 'READINESS', 'LAB', 'SYSTEM'];
  logFilter = signal<LogFilter>('ALL');

  filteredLogs = computed(() => {
    const filter = this.logFilter();
    const logs = this.audit.logs();
    return filter === 'ALL' ? logs : logs.filter(l => l.category === filter);
  });

  featureView = computed<FeatureViewModel | null>(() => {
    const feature = this.orchestrator.activeFeature();
    if (!feature) return null;

    const policy = this.policy.activePolicy();
    const selectedCOA = this.policy.selectedCOA();
    const recommendedCOA = this.policy.recommendedCOA();

    if (!policy) {
      return this._withDefaults(feature);
    }

    switch (feature.variant) {
      case 'POLICY_PROPAGATION':
        return {
          ...this._withDefaults(feature),
          inputs: [
            `Safety ${(policy.weights.safety * 100).toFixed(0)}%`,
            `Sustainability ${(policy.weights.sustainability * 100).toFixed(0)}%`,
            `Resilience ${(policy.weights.resilience * 100).toFixed(0)}%`,
            `Authority ${policy.guardrails.engagementAuthority}`,
          ].join(' · '),
          outputs: selectedCOA
            ? `Synchronized theater state update for ${selectedCOA.name}`
            : 'Synchronized theater state update for the active commander posture',
          rationale: `${feature.rationale} Current posture is ${this._weightProfile(policy)} with reserve floor ${policy.guardrails.reserveInterceptorFloor} and min readiness ${this._formatPercent(policy.guardrails.minReadinessThreshold)}.`,
          operationalFunction: `Broadcasts the live commander posture to all downstream stations. ${selectedCOA ? `The selected COA is ${selectedCOA.name}, while the recommended posture remains ${recommendedCOA?.name ?? 'unresolved'}.` : 'No COA has been selected yet, so the theater will synchronize against the active policy baseline.'}`,
          nextStep: `Push the active policy snapshot to tactical stations and recalculate priorities around ${recommendedCOA?.name ?? 'the selected COA'}.`,
          acknowledgeLabel: feature.acknowledgeLabel ?? 'ACKNOWLEDGE SNAPSHOT',
          liveMetrics: [
            { label: 'Active COA', value: selectedCOA?.name ?? 'UNASSIGNED', tone: 'blue' },
            { label: 'Recommended', value: recommendedCOA?.name ?? 'UNRESOLVED', tone: 'green' },
            { label: 'Authority', value: policy.guardrails.engagementAuthority, tone: 'amber' },
            { label: 'Weight Profile', value: this._weightProfile(policy), tone: 'muted' },
          ],
        };

      case 'INTENT_COMMITMENT':
        return {
          ...this._withDefaults(feature),
          inputs: selectedCOA
            ? `Selected COA ${selectedCOA.name} · ${this._weightProfile(policy)}`
            : `Selected COA pending · ${this._weightProfile(policy)}`,
          outputs: selectedCOA
            ? `Published intent token for ${selectedCOA.id}`
            : 'Published intent token for the active policy posture',
          rationale: selectedCOA
            ? `${feature.rationale} The current selection is ${selectedCOA.name}, which will inherit authority ${policy.guardrails.engagementAuthority} and reserve floor ${policy.guardrails.reserveInterceptorFloor}.`
            : `${feature.rationale} No COA has been committed yet, so the command post is still staging the intent token.`,
          operationalFunction: selectedCOA
            ? `Authorizes ${selectedCOA.name} and commits its projected outcome to tactical stations under the current guardrails.`
            : 'Authorizes the selected Course of Action and commits the projected constraints to tactical stations.',
          nextStep: selectedCOA
            ? `Tactical Console now inherits ${selectedCOA.name} under ${policy.guardrails.engagementAuthority} authority.`
            : 'Select a COA before publishing intent to tactical stations.',
          acknowledgeLabel: feature.acknowledgeLabel ?? 'ACKNOWLEDGE INTENT',
          liveMetrics: [
            { label: 'Selected COA', value: selectedCOA?.name ?? 'NONE', tone: selectedCOA ? 'blue' : 'red' },
            { label: 'COA Type', value: selectedCOA?.type.replace('_', ' ') ?? 'UNASSIGNED', tone: 'green' },
            { label: 'Authority', value: policy.guardrails.engagementAuthority, tone: 'amber' },
            { label: 'Pub Payload', value: selectedCOA ? `${selectedCOA.projectedOutcome.intercepts} intercepts` : 'Pending', tone: 'muted' },
          ],
        };

      case 'LAB_HANDOFF':
        return {
          ...this._withDefaults(feature),
          inputs: selectedCOA
            ? `COA Outcome · ${selectedCOA.name} · Active Weight Profile`
            : 'COA Outcome · Active Weight Profile',
          outputs: selectedCOA
            ? `Robustness Heatmap for ${selectedCOA.name}`
            : 'Robustness Heatmap for the active posture',
          rationale: selectedCOA
            ? `${feature.rationale} The current selection is ${selectedCOA.name}, which will be stress-tested against adversarial red behavior before publication.`
            : `${feature.rationale} No COA has been selected yet, so the lab will evaluate the active posture baseline.`,
          operationalFunction: selectedCOA
            ? `Exports the current tradeoff curve for ${selectedCOA.name} into the Robustness Lab to test whether the chosen posture survives the next surprise.`
            : 'Exports the current tradeoff curve into the Robustness Lab so the active posture can be stress-tested.',
          nextStep: selectedCOA
            ? `The Lab now displays ${selectedCOA.name} as the active stress-test target.`
            : 'Select a COA before launching the robustness stress test.',
          acknowledgeLabel: feature.acknowledgeLabel ?? 'ACKNOWLEDGE HANDOFF',
          liveMetrics: [
            { label: 'Stress Target', value: selectedCOA?.name ?? 'NONE', tone: selectedCOA ? 'blue' : 'red' },
            { label: 'Robustness', value: selectedCOA ? `${(selectedCOA.projectedOutcome.robustnessScore * 100).toFixed(0)}%` : 'PENDING', tone: 'green' },
            { label: 'Confidence', value: selectedCOA ? `${(selectedCOA.projectedOutcome.confidence * 100).toFixed(0)}%` : 'PENDING', tone: 'amber' },
            { label: 'Weight Profile', value: this._weightProfile(policy), tone: 'muted' },
          ],
        };

      default:
        return this._withDefaults(feature);
    }
  });

  auditStats = computed(() => {
    const logs = this.audit.logs();
    return [
      { label: 'Total Events',   value: String(logs.length),                                          colorClass: 'text-boreal-text-primary' },
      { label: 'Tactical',       value: String(logs.filter(l => l.category === 'TACTICAL').length),   colorClass: 'text-boreal-red' },
      { label: 'Policy',         value: String(logs.filter(l => l.category === 'POLICY').length),     colorClass: 'text-boreal-blue' },
      { label: 'Readiness',      value: String(logs.filter(l => l.category === 'READINESS').length),  colorClass: 'text-boreal-amber' },
      { label: 'System',         value: String(logs.filter(l => l.category === 'SYSTEM').length),     colorClass: 'text-boreal-text-muted' },
    ];
  });

  private _withDefaults(feature: PlannedCapabilityInfo): FeatureViewModel {
    return {
      ...feature,
      acknowledgeLabel: feature.acknowledgeLabel ?? 'ACKNOWLEDGE PLAN',
    };
  }

  private _weightProfile(policy: PolicyTwin): string {
    return `S ${(policy.weights.safety * 100).toFixed(0)} / U ${(policy.weights.sustainability * 100).toFixed(0)} / R ${(policy.weights.resilience * 100).toFixed(0)}%`;
  }

  private _formatPercent(value: number): string {
    return `${(value * 100).toFixed(0)}%`;
  }

  actorClass(actor: string): string {
    const map: Record<string, string> = {
      SYSTEM:    'bg-boreal-panel-elevated text-boreal-text-muted',
      COMMANDER: 'bg-boreal-blue/20 text-boreal-blue',
      ANALYST:   'bg-boreal-amber/20 text-boreal-amber',
      OPERATOR:  'bg-boreal-green/20 text-boreal-green',
      ADMIN:     'bg-boreal-panel-elevated text-boreal-text-secondary',
      DIRECTOR:  'bg-boreal-red/20 text-boreal-red',
    };
    return map[actor] ?? 'bg-boreal-panel-elevated text-boreal-text-muted';
  }

  categoryClass(category: string): string {
    const map: Record<string, string> = {
      TACTICAL:  'bg-boreal-red/10 text-boreal-red',
      POLICY:    'bg-boreal-blue/10 text-boreal-blue',
      READINESS: 'bg-boreal-amber/10 text-boreal-amber',
      LAB:       'bg-boreal-panel-elevated text-boreal-text-secondary',
      SYSTEM:    'bg-boreal-panel-elevated text-boreal-text-muted',
    };
    return map[category] ?? 'bg-boreal-panel-elevated text-boreal-text-muted';
  }

  exportJSON(): void {
    this._download(
      JSON.stringify(this.audit.logs(), null, 2),
      `boreal-audit-${new Date().toISOString().slice(0, 10)}.json`,
      'application/json'
    );
  }

  exportCSV(): void {
    const header = 'id,time,actor,category,action,rationale';
    const rows = this.audit.logs().map(l =>
      [l.id, l.time, l.actor, l.category, `"${l.action}"`, `"${l.rationale}"`].join(',')
    );
    this._download(
      [header, ...rows].join('\n'),
      `boreal-audit-${new Date().toISOString().slice(0, 10)}.csv`,
      'text/csv'
    );
  }

  onTimeSlider(event: Event): void {
    this.scenario.setSimTime(Number((event.target as HTMLInputElement).value));
  }

  toggleReplayPlayback(): void {
    if (this.scenario.runState() === 'RUNNING') {
      this.scenario.setRunState('PAUSED');
      this.sensorFeed.setFeedMode('LIVE');
    } else {
      this.scenario.setRunState('RUNNING');
      this.sensorFeed.setFeedMode('REPLAY');
    }
  }

  resetReplay(): void {
    this.scenario.setSimTime(0);
    this.scenario.setRunState('IDLE');
    this.sensorFeed.setFeedMode('LIVE');
  }

  formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  private _download(content: string, filename: string, type: string): void {
    const blob = new Blob([content], { type });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
