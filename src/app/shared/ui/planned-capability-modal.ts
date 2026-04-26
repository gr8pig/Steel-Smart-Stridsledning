import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#080c12]/80 backdrop-blur-md animate-in fade-in duration-300"
        (click)="orchestrator.close()"
        (keydown.escape)="orchestrator.close()"
        tabindex="0"
        role="button"
        aria-label="Close modal backdrop"
      >
        <div
          class="design-card w-full flex flex-col max-h-[90vh] overflow-hidden !p-0 bg-[#080c12]/95 backdrop-blur-2xl border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] rounded-sm animate-in zoom-in-[0.98] slide-in-from-bottom-4 duration-300 ease-out"
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
              <header class="panel-header flex items-center justify-between border-b border-white/10 p-5 bg-black/20 shrink-0">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-sm bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.15)]">
                    <mat-icon class="text-rose-500 !text-xl">notifications_none</mat-icon>
                  </div>
                  <div>
                    <h2 class="text-[11px] uppercase tracking-[0.3em] font-black text-white">Tactical Alerts</h2>
                    <p class="text-[8px] text-slate-400 font-mono uppercase tracking-[0.2em] mt-0.5">{{audit.logs().length}} EVENTS LOGGED THIS SESSION</p>
                  </div>
                </div>
                <button (click)="orchestrator.close()" class="p-2 hover:bg-white/5 text-slate-500 hover:text-white rounded-sm transition-colors group">
                  <mat-icon class="!text-sm">close</mat-icon>
                </button>
              </header>

              <div class="flex gap-1.5 px-5 py-3 border-b border-white/5 bg-white/2 shrink-0 overflow-x-auto custom-scrollbar">
                @for (cat of alertCategories; track cat) {
                  <button
                    (click)="logFilter.set(cat)"
                    class="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-sm transition-all border border-transparent"
                    [class.bg-sky-500]="logFilter() === cat"
                    [class.text-white]="logFilter() === cat"
                    [class.shadow-[0_0_10px_rgba(14,165,233,0.3)]]="logFilter() === cat"
                    [class.text-slate-400]="logFilter() !== cat"
                    [class.hover:bg-white/5]="logFilter() !== cat"
                    [class.hover:text-slate-200]="logFilter() !== cat"
                    [class.hover:border-white/10]="logFilter() !== cat"
                  >{{cat}}</button>
                }
              </div>

              <div class="flex-grow overflow-y-auto bg-transparent divide-y divide-white/5">
                @for (log of filteredLogs(); track log.id) {
                  <div class="flex items-start gap-4 px-5 py-4 hover:bg-white/5 transition-colors group">
                    <span class="text-[9px] font-mono text-slate-500 shrink-0 pt-0.5 w-[4.5rem] opacity-70 group-hover:opacity-100 transition-opacity">{{log.time}}</span>
                    <span class="shrink-0 px-2 py-0.5 text-[7px] font-black uppercase tracking-wider rounded-[2px]" [class]="actorClass(log.actor)">{{log.actor}}</span>
                    <span class="shrink-0 px-2 py-0.5 text-[7px] font-black uppercase tracking-wider rounded-[2px]" [class]="categoryClass(log.category)">{{log.category}}</span>
                    <div class="flex flex-col gap-1 min-w-0 flex-grow">
                      <span class="text-[10.5px] font-bold text-slate-200 tracking-tight">{{log.action}}</span>
                      <span class="text-[9.5px] text-slate-400 leading-relaxed">{{log.rationale}}</span>
                    </div>
                  </div>
                }
                @empty {
                  <div class="flex flex-col items-center justify-center h-40 text-slate-500 text-[10px] font-black uppercase tracking-widest opacity-50">
                    <mat-icon class="!text-3xl mb-3 !w-8 !h-8 opacity-50">check_circle_outline</mat-icon>
                    No events in this category
                  </div>
                }
              </div>

              <footer class="p-4 px-5 border-t border-white/10 flex justify-between items-center bg-black/20 shrink-0">
                <button
                  (click)="audit.clear()"
                  class="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 border border-white/10 rounded-sm hover:text-rose-400 hover:border-rose-400/40 hover:bg-rose-400/10 transition-all"
                >
                  Clear Log
                </button>
                <button (click)="orchestrator.close()" class="px-8 py-2.5 bg-sky-500 text-white rounded-sm text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(14,165,233,0.3)]">
                  Close
                </button>
              </footer>
            }

            <!-- ============================================================ -->
            <!-- GOVERNANCE AUDIT EXPORT                                       -->
            <!-- ============================================================ -->
            @case ('audit-log-export') {
              <header class="panel-header flex items-center justify-between border-b border-white/10 p-5 bg-black/20 shrink-0">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-sm bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                    <mat-icon class="text-emerald-500 !text-xl">terminal</mat-icon>
                  </div>
                  <div>
                    <h2 class="text-[11px] uppercase tracking-[0.3em] font-black text-white">Governance Audit Trail</h2>
                    <p class="text-[8px] text-slate-400 font-mono uppercase tracking-[0.2em] mt-0.5">SESSION LOG · {{audit.logs().length}} ENTRIES · NON-REPUDIABLE</p>
                  </div>
                </div>
                <button (click)="orchestrator.close()" class="p-2 hover:bg-white/5 text-slate-500 hover:text-white rounded-sm transition-colors group">
                  <mat-icon class="!text-sm">close</mat-icon>
                </button>
              </header>

              <div class="flex gap-8 px-6 py-4 bg-white/2 border-b border-white/5 shrink-0">
                @for (stat of auditStats(); track stat.label) {
                  <div class="flex flex-col gap-1">
                    <span class="text-[7.5px] font-black text-slate-500 uppercase tracking-widest">{{stat.label}}</span>
                    <span class="text-[14px] font-black font-mono tracking-tight" [class]="stat.colorClass">{{stat.value}}</span>
                  </div>
                }
              </div>

              <div class="flex-grow overflow-y-auto bg-transparent divide-y divide-white/5">
                @for (log of audit.logs(); track log.id) {
                  <div class="flex items-start gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors group">
                    <span class="text-[9px] font-mono text-slate-500 shrink-0 pt-0.5 w-[4.5rem] opacity-70 group-hover:opacity-100 transition-opacity">{{log.time}}</span>
                    <span class="shrink-0 px-2 py-0.5 text-[7px] font-black uppercase tracking-wider rounded-[2px] w-[5rem] text-center" [class]="actorClass(log.actor)">{{log.actor}}</span>
                    <span class="shrink-0 px-2 py-0.5 text-[7px] font-black uppercase tracking-wider rounded-[2px] w-[5rem] text-center" [class]="categoryClass(log.category)">{{log.category}}</span>
                    <div class="flex flex-col gap-1 min-w-0">
                      <span class="text-[10px] font-bold text-slate-200 tracking-tight">{{log.action}}</span>
                      <span class="text-[9px] text-slate-400 leading-relaxed font-mono">{{log.rationale}}</span>
                    </div>
                  </div>
                }
              </div>

              <footer class="p-4 px-5 border-t border-white/10 flex justify-between items-center bg-black/20 shrink-0">
                <div class="flex gap-3">
                  <button
                    (click)="exportJSON()"
                    class="flex items-center gap-1.5 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-400/40 rounded-sm hover:bg-emerald-400/10 transition-all shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                  >
                    <mat-icon class="!text-sm">download</mat-icon>
                    Export JSON
                  </button>
                  <button
                    (click)="exportCSV()"
                    class="flex items-center gap-1.5 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 border border-white/10 rounded-sm hover:bg-white/5 hover:text-white transition-all"
                  >
                    <mat-icon class="!text-sm">table_chart</mat-icon>
                    Export CSV
                  </button>
                </div>
                <button (click)="orchestrator.close()" class="px-8 py-2.5 bg-sky-500 text-white rounded-sm text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(14,165,233,0.3)]">
                  Close
                </button>
              </footer>
            }

            <!-- ============================================================ -->
            <!-- POLICY LOGIC TRACE                                            -->
            <!-- ============================================================ -->
            @case ('policy-trace') {
              <header class="panel-header flex items-center justify-between border-b border-white/10 p-5 bg-black/20 shrink-0">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-sm bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.15)]">
                    <mat-icon class="text-sky-500 !text-xl">biotech</mat-icon>
                  </div>
                  <div>
                    <h2 class="text-[11px] uppercase tracking-[0.3em] font-black text-white">Policy Logic Trace</h2>
                    <p class="text-[8px] text-slate-400 font-mono uppercase tracking-[0.2em] mt-0.5">COA ATTRIBUTION · {{policy.availableCOAs().length}} ALTERNATIVES ON PARETO FRONT</p>
                  </div>
                </div>
                <button (click)="orchestrator.close()" class="p-2 hover:bg-white/5 text-slate-500 hover:text-white rounded-sm transition-colors group">
                  <mat-icon class="!text-sm">close</mat-icon>
                </button>
              </header>

              <div class="flex-grow overflow-y-auto p-6 space-y-8 bg-transparent">
                @if (policy.activePolicy(); as p) {

                  <!-- Weight Vector -->
                  <section>
                    <span class="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-4">Active Policy Weight Vector</span>
                    <div class="space-y-4">
                      <div class="flex items-center gap-4">
                        <span class="w-24 text-[9px] font-black text-slate-400 uppercase tracking-wider shrink-0">Safety</span>
                        <div class="flex-grow h-2 bg-white/5 rounded-full overflow-hidden">
                          <div class="h-full bg-rose-500 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" [style.width.%]="p.weights.safety * 100"></div>
                        </div>
                        <span class="w-10 text-right text-[10px] font-black text-white font-mono">{{(p.weights.safety * 100).toFixed(0)}}%</span>
                      </div>
                      <div class="flex items-center gap-4">
                        <span class="w-24 text-[9px] font-black text-slate-400 uppercase tracking-wider shrink-0">Sustainability</span>
                        <div class="flex-grow h-2 bg-white/5 rounded-full overflow-hidden">
                          <div class="h-full bg-emerald-500 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" [style.width.%]="p.weights.sustainability * 100"></div>
                        </div>
                        <span class="w-10 text-right text-[10px] font-black text-white font-mono">{{(p.weights.sustainability * 100).toFixed(0)}}%</span>
                      </div>
                      <div class="flex items-center gap-4">
                        <span class="w-24 text-[9px] font-black text-slate-400 uppercase tracking-wider shrink-0">Resilience</span>
                        <div class="flex-grow h-2 bg-white/5 rounded-full overflow-hidden">
                          <div class="h-full bg-sky-500 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]" [style.width.%]="p.weights.resilience * 100"></div>
                        </div>
                        <span class="w-10 text-right text-[10px] font-black text-white font-mono">{{(p.weights.resilience * 100).toFixed(0)}}%</span>
                      </div>
                    </div>
                    <div class="mt-5 p-4 bg-white/5 rounded-sm border border-white/10">
                      <span class="text-[8.5px] text-slate-400 font-mono leading-relaxed">
                        ATTRIBUTION CHAIN: Safety&nbsp;
                        @if (p.weights.safety > 0.75) {
                          &gt; 75% threshold → selects <span class="text-rose-400 font-bold">MAX_PROTECTION</span>
                        } @else if (p.weights.sustainability > 0.75) {
                          &lt; 75% · Sustainability &gt; 75% → selects <span class="text-emerald-400 font-bold">DEEP_SUSTAINABILITY</span>
                        } @else {
                          &lt; 75% · all balanced → selects <span class="text-sky-400 font-bold">BALANCED</span>
                        }
                      </span>
                    </div>
                  </section>

                  <!-- Recommended COA -->
                  @if (policy.recommendedCOA(); as rec) {
                    <section>
                      <span class="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-4">Recommended COA</span>
                      <div class="p-6 bg-sky-500/5 border border-sky-500/20 rounded-sm">
                        <div class="flex justify-between items-start mb-4">
                          <span class="text-lg font-bold text-white tracking-tight">{{rec.name}}</span>
                          <span class="px-2.5 py-1 bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[8px] font-black uppercase tracking-widest rounded-[2px]">{{rec.type}}</span>
                        </div>
                        <p class="text-[10px] text-slate-400 italic mb-5 leading-relaxed">{{rec.rationale}}</p>
                        <div class="grid grid-cols-4 gap-6">
                          <div class="flex flex-col gap-1">
                            <span class="text-[7.5px] font-black text-slate-500 uppercase tracking-widest">Intercepts</span>
                            <span class="text-[20px] font-black font-mono text-emerald-400 leading-none">{{rec.projectedOutcome.intercepts}}</span>
                          </div>
                          <div class="flex flex-col gap-1">
                            <span class="text-[7.5px] font-black text-slate-500 uppercase tracking-widest">Leakage</span>
                            <span class="text-[20px] font-black font-mono leading-none"
                              [class.text-emerald-400]="rec.projectedOutcome.leakage === 0"
                              [class.text-rose-400]="rec.projectedOutcome.leakage > 0">{{rec.projectedOutcome.leakage}}</span>
                          </div>
                          <div class="flex flex-col gap-1">
                            <span class="text-[7.5px] font-black text-slate-500 uppercase tracking-widest">Robustness</span>
                            <span class="text-[20px] font-black font-mono text-white leading-none">{{(rec.projectedOutcome.robustnessScore * 100).toFixed(0)}}%</span>
                          </div>
                          <div class="flex flex-col gap-1">
                            <span class="text-[7.5px] font-black text-slate-500 uppercase tracking-widest">Confidence</span>
                            <span class="text-[20px] font-black font-mono text-white leading-none">{{(rec.projectedOutcome.confidence * 100).toFixed(0)}}%</span>
                          </div>
                        </div>
                      </div>
                    </section>
                  }

                  <!-- Full Pareto Set -->
                  <section>
                    <span class="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-4">Full Pareto Comparison</span>
                    <div class="overflow-x-auto rounded-sm border border-white/10 bg-white/2">
                      <table class="w-full">
                        <thead>
                          <tr class="border-b border-white/10 bg-black/20 text-slate-400 text-[8px] font-black uppercase tracking-widest">
                            <th class="text-left py-3 px-4">COA ID</th>
                            <th class="text-left py-3 px-4">Type</th>
                            <th class="text-right py-3 px-4">Intercepts</th>
                            <th class="text-right py-3 px-4">Leakage</th>
                            <th class="text-right py-3 px-4">Robustness</th>
                            <th class="text-right py-3 px-4">Confidence</th>
                            <th class="text-right py-3 px-4">Cost ($K)</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-white/5">
                          @for (coa of policy.availableCOAs(); track coa.id) {
                            <tr class="transition-colors hover:bg-white/5 font-mono text-[10px] cursor-pointer"
                                (click)="policy.selectCOA(coa.id)"
                                [class.bg-sky-500/10]="coa.id === policy.selectedCOAId()">
                              <td class="py-3 px-4 font-bold text-slate-200">
                                {{coa.id}}
                                @if (coa.id === policy.selectedCOAId()) {
                                  <span class="ml-2 px-1.5 py-0.5 text-[7px] bg-sky-500/20 text-sky-400 rounded-[2px] uppercase tracking-widest font-black">Active</span>
                                }
                              </td>
                              <td class="py-3 px-4 text-slate-400 text-[9px]">{{coa.type.replace('_', ' ')}}</td>
                              <td class="py-3 px-4 text-right font-bold text-emerald-400">{{coa.projectedOutcome.intercepts}}</td>
                              <td class="py-3 px-4 text-right font-bold"
                                  [class.text-emerald-400]="coa.projectedOutcome.leakage === 0"
                                  [class.text-rose-400]="coa.projectedOutcome.leakage > 0">{{coa.projectedOutcome.leakage}}</td>
                              <td class="py-3 px-4 text-right text-slate-200">{{(coa.projectedOutcome.robustnessScore * 100).toFixed(0)}}%</td>
                              <td class="py-3 px-4 text-right text-slate-200">{{(coa.projectedOutcome.confidence * 100).toFixed(0)}}%</td>
                              <td class="py-3 px-4 text-right text-slate-500">{{(coa.projectedOutcome.cost / 1000).toFixed(0)}}</td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <!-- Guardrails -->
                  <section>
                    <span class="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-4">Active Guardrails</span>
                    <div class="grid grid-cols-2 gap-4">
                      <div class="p-4 bg-white/5 rounded-sm border border-white/10 flex justify-between items-center">
                        <span class="text-[10px] font-bold text-slate-400">Engagement Authority</span>
                        <span class="text-[10px] font-black text-white font-mono uppercase">{{p.guardrails.engagementAuthority}}</span>
                      </div>
                      <div class="p-4 bg-white/5 rounded-sm border border-white/10 flex justify-between items-center">
                        <span class="text-[10px] font-bold text-slate-400">Reserve Floor</span>
                        <span class="text-[10px] font-black text-white font-mono">{{p.guardrails.reserveInterceptorFloor}} units</span>
                      </div>
                      <div class="p-4 bg-white/5 rounded-sm border border-white/10 flex justify-between items-center">
                        <span class="text-[10px] font-bold text-slate-400">Min Readiness Threshold</span>
                        <span class="text-[10px] font-black text-white font-mono">{{(p.guardrails.minReadinessThreshold * 100).toFixed(0)}}%</span>
                      </div>
                      <div class="p-4 bg-white/5 rounded-sm border border-white/10 flex justify-between items-center">
                        <span class="text-[10px] font-bold text-slate-400">Civilian Protection</span>
                        <span class="text-[10px] font-black uppercase font-mono"
                          [class.text-emerald-400]="p.guardrails.civilianProtected"
                          [class.text-rose-400]="!p.guardrails.civilianProtected">
                          {{p.guardrails.civilianProtected ? 'ACTIVE' : 'INACTIVE'}}
                        </span>
                      </div>
                    </div>
                  </section>

                }
              </div>

              <footer class="p-4 px-5 border-t border-white/10 flex justify-end bg-black/20 shrink-0">
                <button (click)="orchestrator.close()" class="px-8 py-2.5 bg-sky-500 text-white rounded-sm text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(14,165,233,0.3)] hover:brightness-110 active:scale-95 transition-all">
                  Close
                </button>
              </footer>
            }

            <!-- ============================================================ -->
            <!-- SCENARIO REPLAY CONTROLS                                      -->
            <!-- ============================================================ -->
            @case ('replay-scrub') {
              <header class="panel-header flex items-center justify-between border-b border-white/10 p-5 bg-black/20 shrink-0">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-sm bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                    <mat-icon class="text-amber-500 !text-xl">history</mat-icon>
                  </div>
                  <div>
                    <h2 class="text-[11px] uppercase tracking-[0.3em] font-black text-white">Scenario Replay Controls</h2>
                    <p class="text-[8px] text-slate-400 font-mono uppercase tracking-[0.2em] mt-0.5">{{scenario.scenarioName()}} · {{scenario.currentPhase()?.name}}</p>
                  </div>
                </div>
                <button (click)="orchestrator.close()" class="p-2 hover:bg-white/5 text-slate-500 hover:text-white rounded-sm transition-colors group">
                  <mat-icon class="!text-sm">close</mat-icon>
                </button>
              </header>

              <div class="flex-grow overflow-y-auto p-6 space-y-8 bg-transparent">

                <!-- Time Display & Playback -->
                <section>
                  <div class="flex items-center justify-between">
                    <div class="flex flex-col gap-1.5">
                      <span class="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Simulation Clock</span>
                      <span class="text-[32px] font-mono font-black text-white tabular-nums tracking-tight">{{formatTime(scenario.simTime())}}</span>
                    </div>
                    <div class="flex items-center gap-4">
                      <span class="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-[2px] border"
                            [class.bg-emerald-500/10]="scenario.runState() === 'RUNNING'"
                            [class.text-emerald-400]="scenario.runState() === 'RUNNING'"
                            [class.border-emerald-500/30]="scenario.runState() === 'RUNNING'"
                            [class.bg-amber-500/10]="scenario.runState() === 'PAUSED'"
                            [class.text-amber-400]="scenario.runState() === 'PAUSED'"
                            [class.border-amber-500/30]="scenario.runState() === 'PAUSED'"
                            [class.bg-white/5]="scenario.runState() === 'IDLE' || scenario.runState() === 'REPLAY'"
                            [class.text-slate-400]="scenario.runState() === 'IDLE' || scenario.runState() === 'REPLAY'"
                            [class.border-white/10]="scenario.runState() === 'IDLE' || scenario.runState() === 'REPLAY'">
                        {{scenario.runState()}}
                      </span>
                      <div class="flex gap-2">
                        <button
                          (click)="toggleReplayPlayback()"
                          class="w-12 h-12 flex items-center justify-center border rounded-sm transition-all shadow-[0_0_15px_rgba(0,0,0,0.2)]"
                          [class.bg-emerald-500/10]="scenario.runState() !== 'RUNNING'"
                          [class.border-emerald-500/30]="scenario.runState() !== 'RUNNING'"
                          [class.text-emerald-400]="scenario.runState() !== 'RUNNING'"
                          [class.hover:bg-emerald-500/20]="scenario.runState() !== 'RUNNING'"
                          [class.bg-amber-500/10]="scenario.runState() === 'RUNNING'"
                          [class.border-amber-500/30]="scenario.runState() === 'RUNNING'"
                          [class.text-amber-400]="scenario.runState() === 'RUNNING'"
                          [class.hover:bg-amber-500/20]="scenario.runState() === 'RUNNING'"
                        >
                          <mat-icon class="!text-2xl">{{scenario.runState() === 'RUNNING' ? 'pause' : 'play_arrow'}}</mat-icon>
                        </button>
                        <button
                          (click)="resetReplay()"
                          class="w-12 h-12 flex items-center justify-center border border-white/10 rounded-sm text-slate-500 hover:text-white hover:bg-white/5 transition-all shadow-[0_0_15px_rgba(0,0,0,0.2)]"
                          title="Reset to T+0"
                        >
                          <mat-icon class="!text-2xl">skip_previous</mat-icon>
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <!-- Timeline Scrubber -->
                <section>
                  <span class="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-4">Timeline Scrub (0 – 2h)</span>
                  <div class="px-2 py-4 bg-white/5 border border-white/10 rounded-sm">
                    <input
                      type="range"
                      min="0"
                      max="7200"
                      [value]="scenario.simTime()"
                      (input)="onTimeSlider($event)"
                      class="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                    />
                    <div class="flex justify-between text-[8px] text-slate-500 font-mono mt-3 px-1">
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
                  <span class="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-4">Scenario Phases</span>
                  <div class="space-y-3">
                    @for (phase of scenario.phases(); track phase.id) {
                      <div
                        class="flex items-center gap-4 p-4 rounded-sm border transition-colors shadow-sm"
                        [class.bg-emerald-500/5]="phase.status === 'ACTIVE'"
                        [class.border-emerald-500/30]="phase.status === 'ACTIVE'"
                        [class.shadow-[0_0_15px_rgba(16,185,129,0.1)]]="phase.status === 'ACTIVE'"
                        [class.bg-black/20]="phase.status === 'COMPLETED'"
                        [class.border-white/5]="phase.status === 'COMPLETED'"
                        [class.bg-white/5]="phase.status === 'UPCOMING'"
                        [class.border-white/10]="phase.status === 'UPCOMING'"
                      >
                        <div
                          class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border"
                          [class.bg-emerald-500/20]="phase.status === 'ACTIVE'"
                          [class.border-emerald-500/40]="phase.status === 'ACTIVE'"
                          [class.bg-white/5]="phase.status !== 'ACTIVE'"
                          [class.border-transparent]="phase.status !== 'ACTIVE'"
                        >
                          @if (phase.status === 'COMPLETED') {
                            <mat-icon class="!text-sm text-emerald-500">check</mat-icon>
                          } @else if (phase.status === 'ACTIVE') {
                            <div class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                          } @else {
                            <div class="w-2 h-2 rounded-full bg-white/20"></div>
                          }
                        </div>
                        <div class="flex flex-col flex-grow min-w-0 gap-1">
                          <span
                            class="text-[11px] font-bold uppercase tracking-widest"
                            [class.text-emerald-400]="phase.status === 'ACTIVE'"
                            [class.text-slate-500]="phase.status === 'COMPLETED'"
                            [class.text-white]="phase.status === 'UPCOMING'"
                          >{{phase.name}}</span>
                          <span class="text-[10px] text-slate-400 truncate">{{phase.description}}</span>
                        </div>
                        <span
                          class="px-2.5 py-1 text-[8px] font-black uppercase tracking-widest rounded-[2px] shrink-0 border border-transparent"
                          [class.bg-emerald-500/10]="phase.status === 'ACTIVE'"
                          [class.border-emerald-500/20]="phase.status === 'ACTIVE'"
                          [class.text-emerald-400]="phase.status === 'ACTIVE'"
                          [class.bg-white/5]="phase.status !== 'ACTIVE'"
                          [class.text-slate-500]="phase.status !== 'ACTIVE'"
                        >{{phase.status}}</span>
                        @if (phase.status !== 'ACTIVE') {
                          <button
                            (click)="scenario.setPhase(phase.id)"
                            class="ml-2 px-4 py-2 text-[8px] font-black uppercase tracking-widest rounded-sm border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all shrink-0"
                          >Jump</button>
                        }
                      </div>
                    }
                  </div>
                </section>

              </div>

              <footer class="p-4 px-5 border-t border-white/10 flex justify-end bg-black/20 shrink-0">
                <button (click)="orchestrator.close()" class="px-8 py-2.5 bg-sky-500 text-white rounded-sm text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(14,165,233,0.3)] hover:brightness-110 active:scale-95 transition-all">
                  Close
                </button>
              </footer>
            }

            <!-- ============================================================ -->
            <!-- DEFAULT: Architecture Preview (ad-hoc / unregistered features) -->
            <!-- ============================================================ -->
            @default {
              <header class="panel-header flex items-center justify-between border-b border-white/10 p-5 bg-black/20 shrink-0">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-sm bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.15)]">
                    <mat-icon class="text-sky-500 !text-xl">architecture</mat-icon>
                  </div>
                  <div>
                    <h2 class="text-[11px] uppercase tracking-[0.3em] font-black text-white">Operational Intent</h2>
                    <p class="text-[8px] text-slate-400 font-mono uppercase tracking-[0.2em] mt-0.5">SYSTEM ARCHITECTURE PREVIEW</p>
                  </div>
                </div>
                <button (click)="orchestrator.close()" class="p-2 hover:bg-white/5 text-slate-500 hover:text-white rounded-sm transition-colors group">
                  <mat-icon class="!text-sm">close</mat-icon>
                </button>
              </header>

              <div class="flex-grow overflow-y-auto p-8 space-y-8 bg-transparent">
                <section>
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="text-2xl font-light text-white tracking-tight">{{feature.name}}</h3>
                    <div class="flex gap-2">
                      <span class="px-2.5 py-1 rounded-[2px] bg-white/5 text-slate-300 text-[8px] font-black border border-white/10 uppercase tracking-widest">
                        {{feature.status.replace('_', ' ')}}
                      </span>
                      <span
                        class="px-2.5 py-1 rounded-[2px] text-[8px] font-black border uppercase tracking-widest shadow-sm"
                        [class.bg-sky-500/10]="feature.tier === 'MVP'"
                        [class.text-sky-400]="feature.tier === 'MVP'"
                        [class.border-sky-500/30]="feature.tier === 'MVP'"
                        [class.bg-amber-500/10]="feature.tier === 'SECONDARY'"
                        [class.text-amber-400]="feature.tier === 'SECONDARY'"
                        [class.border-amber-500/30]="feature.tier === 'SECONDARY'"
                        [class.bg-white/5]="feature.tier === 'STRETCH'"
                        [class.text-slate-400]="feature.tier === 'STRETCH'"
                        [class.border-white/10]="feature.tier === 'STRETCH'"
                      >
                        Tier: {{feature.tier}}
                      </span>
                    </div>
                  </div>
                  <p class="text-sm text-slate-400 leading-relaxed font-sans italic border-l-2 border-sky-500/50 pl-5 py-1">{{feature.rationale}}</p>
                </section>

                @if (feature.liveMetrics?.length) {
                  <section class="grid grid-cols-2 gap-4 md:grid-cols-4">
                    @for (metric of feature.liveMetrics; track metric.label) {
                      <div
                        class="rounded-sm border bg-white/5 px-4 py-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                        [class.border-sky-500/30]="metric.tone === 'blue'"
                        [class.border-amber-500/30]="metric.tone === 'amber'"
                        [class.border-emerald-500/30]="metric.tone === 'green'"
                        [class.border-white/10]="metric.tone === 'muted'"
                        [class.border-rose-500/30]="metric.tone === 'red'"
                      >
                        <span class="block text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">{{metric.label}}</span>
                        <span
                          class="block pt-1.5 text-[11px] font-bold uppercase tracking-tight"
                          [class.text-sky-400]="metric.tone === 'blue'"
                          [class.text-amber-400]="metric.tone === 'amber'"
                          [class.text-emerald-400]="metric.tone === 'green'"
                          [class.text-white]="metric.tone === 'muted'"
                          [class.text-rose-400]="metric.tone === 'red'"
                        >{{metric.value}}</span>
                      </div>
                    }
                  </section>
                }

                <div class="grid grid-cols-2 gap-10 pt-8 border-t border-white/10">
                  <div class="space-y-6">
                    <div class="flex flex-col gap-1.5">
                      <span class="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Primary Persona</span>
                      <span class="text-[12px] font-bold text-white uppercase tracking-tight">{{feature.persona}}</span>
                    </div>
                    <div class="flex flex-col gap-1.5">
                      <span class="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Planned Inputs</span>
                      <span class="text-[11px] text-slate-400 italic leading-tight">{{feature.inputs || 'Not specified'}}</span>
                    </div>
                  </div>
                  <div class="space-y-6">
                    <div class="flex flex-col gap-1.5">
                      <span class="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Target Decision</span>
                      <span class="text-[12px] font-bold text-white uppercase tracking-tight">{{feature.decisionImproved}}</span>
                    </div>
                    <div class="flex flex-col gap-1.5">
                      <span class="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Planned Outputs</span>
                      <span class="text-[11px] text-slate-400 italic leading-tight">{{feature.outputs || 'Not specified'}}</span>
                    </div>
                  </div>
                </div>

                <section class="p-6 bg-white/5 border border-white/10 rounded-sm space-y-4">
                  <span class="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block">Operational Logic</span>
                  <p class="text-sm text-slate-300 leading-relaxed">{{feature.operationalFunction}}</p>
                </section>

                <section class="p-6 bg-amber-500/10 rounded-sm border border-amber-500/20 flex items-start gap-5 shadow-[0_0_15px_rgba(245,158,11,0.05)]">
                  <div class="w-10 h-10 rounded-sm bg-amber-500/20 flex items-center justify-center shrink-0">
                    <mat-icon class="text-amber-400 !text-xl">rocket_launch</mat-icon>
                  </div>
                  <div class="flex flex-col gap-1.5 pt-0.5">
                    <span class="text-[10px] font-black text-amber-500 uppercase tracking-widest">Next Implementation Step</span>
                    <span class="text-[13px] text-white font-bold leading-tight">{{feature.nextStep}}</span>
                  </div>
                </section>
              </div>

              <footer class="p-4 px-5 border-t border-white/10 flex justify-end bg-black/20 shrink-0">
                <button (click)="handleAcknowledge(feature)" class="px-8 py-2.5 bg-sky-500 text-white rounded-sm text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(14,165,233,0.3)] hover:brightness-110 active:scale-95 transition-all">
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
    .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlannedCapabilityModal {
  orchestrator = inject(CapabilityOrchestrator);
  audit        = inject(AuditLogger);
  policy       = inject(PolicyStore);
  scenario     = inject(ScenarioStore);
  sensorFeed   = inject(SensorFeedStore);
  private readonly router = inject(Router);

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
      { label: 'Total Events',   value: String(logs.length),                                          colorClass: 'text-white' },
      { label: 'Tactical',       value: String(logs.filter(l => l.category === 'TACTICAL').length),   colorClass: 'text-rose-400' },
      { label: 'Policy',         value: String(logs.filter(l => l.category === 'POLICY').length),     colorClass: 'text-sky-400' },
      { label: 'Readiness',      value: String(logs.filter(l => l.category === 'READINESS').length),  colorClass: 'text-amber-400' },
      { label: 'System',         value: String(logs.filter(l => l.category === 'SYSTEM').length),     colorClass: 'text-slate-400' },
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
      SYSTEM:    'bg-white/5 border border-white/10 text-slate-400',
      COMMANDER: 'bg-sky-500/20 border border-sky-500/30 text-sky-400',
      ANALYST:   'bg-amber-500/20 border border-amber-500/30 text-amber-400',
      OPERATOR:  'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400',
      ADMIN:     'bg-white/10 border border-white/20 text-slate-300',
      DIRECTOR:  'bg-rose-500/20 border border-rose-500/30 text-rose-400',
    };
    return map[actor] ?? 'bg-white/5 border border-white/10 text-slate-400';
  }

  categoryClass(category: string): string {
    const map: Record<string, string> = {
      TACTICAL:  'bg-rose-500/10 border border-rose-500/20 text-rose-400',
      POLICY:    'bg-sky-500/10 border border-sky-500/20 text-sky-400',
      READINESS: 'bg-amber-500/10 border border-amber-500/20 text-amber-400',
      LAB:       'bg-white/10 border border-white/20 text-slate-300',
      SYSTEM:    'bg-white/5 border border-white/10 text-slate-400',
    };
    return map[category] ?? 'bg-white/5 border border-white/10 text-slate-400';
  }

  handleAcknowledge(feature: FeatureViewModel) {
    if (feature.id === 'robustness-lab-handoff') {
      this.router.navigate(['/robustness-lab']);
    } else if (feature.id === 'commander-intent-commitment' || feature.id === 'policy-propagation') {
      this.router.navigate(['/tactical']);
    }
    this.orchestrator.close();
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
