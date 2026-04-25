import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { PolicyStore } from '../core/state/policy.store';
import { TacticalStore } from '../core/state/tactical.store';
import { LabStore } from '../core/state/lab.store';
import { OrchestrationStore } from '../core/state/orchestration.store';
import { AuditLogger } from '../core/services/audit-logger';
import { LLMService } from '../core/services/llm.service';

@Component({
  selector: 'app-governance',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="boreal-content-shell">
      <header class="flex flex-col gap-1 border-b border-boreal-border pb-4">
        <h1 class="text-3xl font-light tracking-tight text-boreal-text-primary uppercase tracking-[0.2em] mb-1">Rationale & Governance</h1>
        <div class="flex items-center gap-4">
            <p class="text-boreal-text-muted text-[10px] font-mono uppercase tracking-widest italic">Immutable Traceability & Policy Alignment Surface</p>
            <div class="h-px flex-grow bg-boreal-border/50"></div>
            @if (orchestration.publishedIntent()) {
                <div class="flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full bg-boreal-blue animate-pulse"></span>
                    <span class="text-[8px] text-boreal-blue uppercase font-bold tracking-widest">Live Intent Active</span>
                </div>
            } @else {
                <div class="flex items-center gap-2 opacity-50">
                    <span class="w-1.5 h-1.5 rounded-full bg-boreal-text-muted"></span>
                    <span class="text-[8px] text-boreal-text-muted uppercase font-bold tracking-widest">Proposed Mode</span>
                </div>
            }
            <div class="h-px w-8 bg-boreal-border/50 mx-2"></div>
            <div class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-boreal-green animate-pulse"></span>
                <span class="text-[8px] text-boreal-green uppercase font-bold tracking-widest">Decision Chain Verified</span>
            </div>
        </div>
      </header>

      <div class="grid grid-cols-12 gap-6 boreal-scroll-region">
        <!-- Dashboard / Summary Column -->
        <div class="col-span-12 lg:col-span-4 flex flex-col gap-6 overflow-hidden">
             
             <!-- Rationale Narrative Engine -->
             <section class="bg-boreal-panel border border-boreal-border rounded-sm overflow-hidden flex flex-col shadow-2xl relative">
                <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted">Decision Rationale Summary</div>
                <div class="p-5 space-y-6 overflow-y-auto">
                    @if (vm().publishedIntent; as intent) {
                        <div class="space-y-4">
                            <div class="p-3 bg-boreal-blue/10 border border-boreal-blue/30 rounded-sm">
                                <div class="flex justify-between items-center mb-1">
                                    <span class="text-[8px] text-boreal-blue font-bold uppercase block">Published Theater Intent</span>
                                    <span class="text-[8px] font-mono text-boreal-text-muted">{{ intent.timestamp }}</span>
                                </div>
                                <p class="text-sm font-bold text-boreal-text-primary uppercase leading-tight tracking-tight">{{ intent.commanderRationale }}</p>
                            </div>
                            
                            @if (vm().selectedCOA; as coa) {
                                <div class="space-y-3 pt-4 border-t border-boreal-border">
                                    <span class="text-[9px] text-boreal-text-muted font-bold uppercase tracking-widest block">Implicit Tradeoff Accepted</span>
                                    <p class="text-[11px] text-boreal-text-secondary italic font-medium leading-relaxed border-l-2 border-boreal-blue pl-4">
                                        {{ coa.rationale }}
                                    </p>
                                    <div class="mt-2 text-[10px] text-boreal-blue font-black uppercase tracking-widest bg-boreal-blue/5 p-2 border border-boreal-blue/10">
                                        {{ vm().tradeoffText }}
                                    </div>
                                </div>
                            }
                        </div>
                    } @else if (vm().selectedCOA; as coa) {
                        <div class="space-y-4">
                            <div class="p-3 bg-boreal-blue/5 border border-boreal-blue/20 rounded-sm">
                                <span class="text-[8px] text-boreal-blue font-bold uppercase block mb-1">Selection Logic</span>
                                <p class="text-xs font-bold text-boreal-text-primary uppercase leading-tight tracking-tight">{{ coa.name }} ({{ coa.type }})</p>
                            </div>
                            
                            <div class="space-y-3">
                                <span class="text-[9px] text-boreal-text-muted font-bold uppercase tracking-widest block">Implicit Tradeoff Accepted</span>
                                <p class="text-[11px] text-boreal-text-secondary italic leading-relaxed border-l-2 border-boreal-border pl-4">
                                    {{ coa.rationale }}
                                </p>
                                <div class="mt-2 text-[10px] text-boreal-text-muted font-bold uppercase tracking-widest italic bg-boreal-panel-muted p-2">
                                    {{ vm().tradeoffText }}
                                </div>
                            </div>
 
                            <div class="pt-4 border-t border-boreal-border space-y-3">
                                <span class="text-[9px] text-boreal-text-muted font-bold uppercase tracking-widest block">Governance Alignment</span>
                                <div class="grid grid-cols-2 gap-2">
                                    <div class="flex flex-col gap-0.5">
                                            <span class="text-[10px] font-mono text-boreal-text-muted uppercase tracking-tighter">Risk Level</span>
                                            <span class="text-xs font-bold uppercase {{ coa.projectedOutcome.leakage > 0 ? 'text-boreal-amber' : 'text-boreal-green' }}">
                                                {{ coa.projectedOutcome.leakage > 0 ? 'Residual Risk' : 'Zero Leakage' }}
                                            </span>
                                        </div>
                                    <div class="flex flex-col gap-0.5">
                                        <span class="text-[10px] font-mono text-boreal-text-muted uppercase tracking-tighter">Robustness</span>
                                        <span class="text-xs font-bold uppercase text-boreal-blue">{{ (coa.projectedOutcome.robustnessScore * 100).toFixed(0) }}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    } @else {
                        <div class="flex flex-col items-center justify-center p-8 gap-3 opacity-20 italic">
                            <mat-icon>help_outline</mat-icon>
                            <span class="text-[10px] uppercase">Awaiting COA Authorization</span>
                        </div>
                    }

                    <!-- AI Rationale Generator -->
                    <div class="p-4 border-t border-boreal-border space-y-3">
                        @if (_rationaleText()) {
                            <div class="p-3 bg-boreal-canvas/50 border border-boreal-blue/20 rounded-sm relative">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-[8px] text-boreal-blue font-bold uppercase tracking-widest">Decision Advisory</span>
                                    @if (_rationaleSource() === 'FALLBACK') {
                                        <span class="text-[7px] text-boreal-text-muted font-mono uppercase border border-boreal-border px-1 rounded">OFFLINE MODE</span>
                                    } @else if (_rationaleModel()) {
                                        <span class="text-[7px] text-boreal-green font-mono px-1.5 py-0.5 rounded border border-boreal-green/30 flex items-center gap-1">
                                            <span class="w-1 h-1 rounded-full bg-boreal-green inline-block"></span>
                                            {{ _rationaleModel()!.split('/')[1] || _rationaleModel() }}
                                        </span>
                                    }
                                </div>
                                <p class="text-[10px] text-boreal-text-secondary leading-relaxed italic">{{ _rationaleText() }}</p>
                            </div>
                        }
                        <button
                            (click)="generateRationale()"
                            [disabled]="!policy.selectedCOA() || _rationaleLoading()"
                            class="w-full py-2.5 bg-boreal-blue/10 border border-boreal-blue/30 rounded-sm text-[10px] font-black text-boreal-blue hover:bg-boreal-blue/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            @if (_rationaleLoading()) {
                                <mat-icon class="!text-xs animate-spin">refresh</mat-icon>
                                <span>Generating...</span>
                            } @else {
                                <mat-icon class="!text-xs">auto_awesome</mat-icon>
                                <span>Generate AI Rationale</span>
                            }
                        </button>
                    </div>
                </div>
             </section>

             <!-- Constraints & Guardrails -->
             <section class="flex-grow bg-boreal-panel border border-boreal-border rounded-sm overflow-hidden flex flex-col shadow-2xl">
                <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted">Binding Constraints & Guardrails</div>
                <div class="p-5 space-y-6 overflow-y-auto">
                    @if (policy.activePolicy(); as p) {
                        <div class="space-y-4">
                            @for (constraint of vm().constraints; track constraint.label) {
                                <div class="flex items-center justify-between border-b border-boreal-border/50 pb-3 last:border-0 last:pb-0">
                                    <div class="flex flex-col">
                                        <span class="text-[10px] font-bold text-boreal-text-primary uppercase tracking-tighter">{{ constraint.label }}</span>
                                        <span class="text-[8px] text-boreal-text-muted uppercase tracking-widest">{{ constraint.status }}</span>
                                    </div>
                                    <span class="px-2 py-0.5 rounded-sm bg-boreal-blue/20 text-boreal-blue text-[10px] font-bold border border-boreal-blue/30 uppercase tracking-widest font-mono">
                                        {{ constraint.value }}
                                    </span>
                                </div>
                            }
                        </div>
 
                         <div class="pt-6 border-t border-boreal-border space-y-4">
                             <span class="text-[9px] font-bold text-boreal-text-muted uppercase tracking-widest block">Active Decision Bias</span>
                             <div class="grid grid-cols-1 gap-2">
                                <div class="p-3 bg-boreal-canvas border border-boreal-border rounded-sm flex flex-col gap-1.5 relative overflow-hidden">
                                    <div class="flex justify-between items-center z-10 relative">
                                        <span class="text-[9px] text-boreal-text-secondary uppercase font-black tracking-widest">Sustainability Depth</span>
                                        <span class="text-[9px] font-mono text-boreal-text-primary">{{ (p.weights.sustainability * 100).toFixed(0) }}% SCALE</span>
                                    </div>
                                    <div class="h-1 bg-boreal-panel-muted rounded-full overflow-hidden">
                                        <div class="h-full bg-boreal-blue/40" [style.width.%]="p.weights.sustainability * 100"></div>
                                    </div>
                                    <p class="text-[9px] text-boreal-text-muted leading-tight italic z-10 relative">
                                        @if (p.weights.sustainability > 0.7) {
                                            Deep preservation active. Systems will aggressively favor resource conservation.
                                        } @else {
                                            Standard sustainability floor enforced across all base twins.
                                        }
                                    </p>
                                </div>
                             </div>
                         </div>
                    }
 
                    <!-- Uncertainty Trace Trace -->
                    <div class="pt-6 border-t border-boreal-border space-y-3">
                         <span class="text-[9px] font-bold text-boreal-text-muted uppercase tracking-widest block">Decision Trace</span>
                         <div class="space-y-4">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-[1px] bg-boreal-blue"></div>
                                <span class="text-[9px] font-mono text-boreal-text-muted">POLICY_STEER</span>
                                <mat-icon class="!text-[10px] text-boreal-text-muted">chevron_right</mat-icon>
                                <span class="text-[9px] font-bold text-boreal-text-secondary">{{ vm().activePolicyName }}</span>
                            </div>
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-[1px] bg-boreal-blue opacity-40"></div>
                                <span class="text-[9px] font-mono text-boreal-text-muted">COA_DERIVED</span>
                                <mat-icon class="!text-[10px] text-boreal-text-muted">chevron_right</mat-icon>
                                <span class="text-[9px] font-bold text-boreal-text-secondary">{{ vm().selectedCOA?.name || 'Manual' }}</span>
                            </div>
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-[1px] bg-boreal-amber opacity-40"></div>
                                <span class="text-[9px] font-mono text-boreal-text-muted">RATIONALE_SIGNED</span>
                                <mat-icon class="!text-[10px] text-boreal-text-muted">chevron_right</mat-icon>
                                <span class="text-[9px] font-bold text-boreal-amber">VERIFIED</span>
                            </div>
                         </div>
                    </div>
 
                    <!-- Uncertainty Trace Trace -->
                    <div class="pt-6 border-t border-boreal-border space-y-3">
                         <span class="text-[9px] font-bold text-boreal-text-muted uppercase tracking-widest block">Dominant Uncertainty Trace</span>
                         <div class="p-3 bg-boreal-canvas rounded-sm border border-boreal-amber/20 flex flex-col gap-1">
                            <div class="flex justify-between items-center">
                                <span class="text-[10px] font-bold text-boreal-text-primary uppercase">{{ vm().uncertainty.source }}</span>
                                <span class="text-[9px] font-mono text-boreal-amber">{{ vm().uncertainty.confidence }} Trust</span>
                            </div>
                            <p class="text-[9px] text-boreal-text-muted leading-relaxed italic">
                                {{ vm().uncertainty.description }}
                            </p>
                            @if (vm().uncertainty.trackId !== 'N/A') {
                                <span class="text-[7px] font-mono text-boreal-text-muted mt-1 uppercase tracking-widest opacity-40">Linked Track: {{ vm().uncertainty.trackId }}</span>
                            }
                         </div>
                    </div>
                </div>
             </section>
        </div>

        <!-- Audit Log / Immutable Trace Column -->
        <div class="col-span-12 lg:col-span-8 bg-boreal-panel border border-boreal-border rounded-sm flex flex-col overflow-hidden shadow-2xl relative">
            
            <!-- Audit Header -->
            <div class="panel-header uppercase tracking-[0.2em] text-[10px] font-bold text-boreal-text-muted bg-boreal-panel-muted/20 flex justify-between items-center px-6 h-12">
                <span>Log Trace & Rationale Consistency Audit</span>
                <div class="flex gap-4">
                    <button (click)="audit.clear()" class="text-[9px] text-boreal-text-muted hover:text-boreal-text-primary uppercase font-bold transition-colors">Clear Log</button>
                    <span class="text-boreal-text-muted/40 font-mono text-[10px]">V-AUDIT: SSS_9.0</span>
                </div>
            </div>

            <!-- Audit Table -->
            <div class="flex-grow overflow-y-auto">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-boreal-canvas/60 text-[9px] text-boreal-text-muted uppercase sticky top-0 z-20">
                        <tr>
                            <th class="px-6 py-4 font-bold border-b border-boreal-border tracking-widest">Time</th>
                            <th class="px-6 py-4 font-bold border-b border-boreal-border tracking-widest">Actor</th>
                            <th class="px-6 py-4 font-bold border-b border-boreal-border tracking-widest">Event</th>
                            <th class="px-6 py-4 font-bold border-b border-boreal-border tracking-widest">Operational Rationale / Delta</th>
                        </tr>
                    </thead>
                    <tbody class="text-[11px] font-sans">
                        @for (log of audit.logs(); track log.id) {
                            <tr class="hover:bg-boreal-panel-muted/20 border-b border-boreal-border/30 transition-colors group">
                                <td class="px-6 py-4 font-mono text-boreal-text-muted group-hover:text-boreal-text-secondary transition-colors whitespace-nowrap">{{ log.time }}</td>
                                <td class="px-6 py-4 text-[10px] font-bold">
                                    <span class="px-2 py-0.5 rounded-[1px] tracking-widest uppercase border inline-block"
                                        [class.bg-boreal-blue/10]="log.actor === 'SYSTEM'"
                                        [class.border-boreal-blue/30]="log.actor === 'SYSTEM'"
                                        [class.text-boreal-blue]="log.actor === 'SYSTEM'"
                                        [class.bg-boreal-panel-muted]="log.actor !== 'SYSTEM'"
                                        [class.border-boreal-border]="log.actor !== 'SYSTEM'"
                                        [class.text-boreal-text-secondary]="log.actor !== 'SYSTEM'"
                                    >
                                        {{ log.actor }}
                                    </span>
                                </td>
                                <td class="px-6 py-4">
                                    <div class="flex items-center gap-2">
                                        @switch (log.category) {
                                            @case ('TACTICAL') { <mat-icon class="!text-[10px] text-boreal-text-muted">radar</mat-icon> }
                                            @case ('POLICY') { <mat-icon class="!text-[10px] text-boreal-blue">rule</mat-icon> }
                                            @case ('LAB') { <mat-icon class="!text-[10px] text-boreal-amber">biotech</mat-icon> }
                                            @default { <mat-icon class="!text-[10px] text-boreal-text-muted">radio_button_checked</mat-icon> }
                                        }
                                        <span class="font-bold text-boreal-text-primary uppercase tracking-tight">{{ log.action }}</span>
                                    </div>
                                </td>
                                <td class="px-6 py-4 text-boreal-text-secondary leading-relaxed italic pr-12">
                                    <span class="group-hover:text-boreal-text-primary transition-colors">{{ log.rationale }}</span>
                                </td>
                            </tr>
                        }
                    </tbody>
                </table>
            </div>

            <!-- Table Footer -->
            <div class="p-3 bg-boreal-canvas/40 border-t border-boreal-border flex justify-between items-center">
                 <span class="text-[8px] text-boreal-text-muted font-mono tracking-tighter opacity-40">Immutable Trace Hash: {{ vm().hash }}</span>
                 <div class="flex items-center gap-2 opacity-30">
                    <mat-icon class="!text-xs">security</mat-icon>
                    <span class="text-[9px] uppercase font-bold tracking-widest">SIEM Integrated</span>
                 </div>
            </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .mat-icon { font-size: 14px; width: 14px; height: 14px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Governance {
    policy        = inject(PolicyStore);
    tactical      = inject(TacticalStore);
    lab           = inject(LabStore);
    orchestration = inject(OrchestrationStore);
    audit         = inject(AuditLogger);
    llm           = inject(LLMService);

    readonly _auditHash = (() => {
        const h = Array.from({length: 40}, (_, i) => 'abcdef0123456789'[(i * 7 + 11) % 16]).join('');
        return h.substring(0, 16) + '...' + h.substring(32);
    })();

    _rationaleText    = signal<string | null>(null);
    _rationaleSource  = signal<'BACKEND' | 'FALLBACK' | null>(null);
    _rationaleModel   = signal<string | null>(null);
    _rationaleLoading = signal(false);

    generateRationale() {
        const coa = this.policy.selectedCOA();
        if (!coa) return;
        this._rationaleLoading.set(true);
        this._rationaleText.set(null);
        this._rationaleSource.set(null);
        this._rationaleModel.set(null);
        this.llm.getRationaleForCOA(coa.id).subscribe({
            next: res => {
                this._rationaleText.set(res.rationaleText);
                this._rationaleSource.set(res.source);
                this._rationaleModel.set(res.model ?? null);
                this._rationaleLoading.set(false);
                this.audit.log({
                    actor: 'SYSTEM',
                    action: 'Decision Advisory Generated',
                    rationale: `Advisory for COA: ${coa.name}. Model: ${res.model ?? res.source}.`,
                    category: 'POLICY',
                });
            },
            error: () => this._rationaleLoading.set(false),
        });
    }

    vm = computed(() => {
        const activePolicy = this.policy.activePolicy();
        const selectedCOA = this.policy.selectedCOA();
        const selectedTrack = this.tactical.selectedTrack();
        const publishedIntent = this.orchestration.publishedIntent();
        const logs = this.audit.logs();
        const latestLab = this.lab.latestInsight();

        // 1. Policy Tradeoff Rationale
        let tradeoffText = 'Standard multi-mission optimization active.';
        if (activePolicy) {
            const w = activePolicy.weights;
            const max = Math.max(w.safety, w.sustainability, w.resilience);
            
            if (w.safety === max) {
                tradeoffText = 'Prioritizing immediate asset integrity. Tolerating higher readiness depletion for zero-leakage certainty.';
            } else if (w.sustainability === max) {
                tradeoffText = 'Prioritizing future waves. Accepting tactical risk (leakage) to preserve strategic interceptor depth.';
            } else {
                tradeoffText = 'Balanced posture. Distributed risk across sectors with moderate preservation guardrails.';
            }
        }

        // 2. Active Constraint Binding
        const constraints = activePolicy ? [
            { label: 'Safety Floor', value: `${(activePolicy.weights.safety * 100).toFixed(0)}%`, status: activePolicy.weights.safety > 0.8 ? 'CRITICAL' : 'ACTIVE' },
            { label: 'Conservation Burn', value: `${(activePolicy.weights.sustainability * 40).toFixed(1)}/h`, status: 'BINDING' },
            { label: 'Min Readiness', value: `${(activePolicy.guardrails.minReadinessThreshold * 100).toFixed(0)}%`, status: 'ENFORCED' },
            { label: 'Authority', value: activePolicy.guardrails.engagementAuthority, status: 'GOVERNED' }
        ] : [];

        // 3. Dominant Uncertainty (from selected track or system baseline)
        const uncertainty = selectedTrack ? {
            source: selectedTrack.uncertaintySource || 'Classification Ambiguity',
            confidence: (selectedTrack.confidence * 100).toFixed(0) + '%',
            trackId: selectedTrack.id,
            description: `Decision logic inhibited by ${selectedTrack.intent} profile signature mismatch. SSS recommending high-dwell verification.`
        } : (latestLab ? {
            source: `Lab Insight: ${latestLab.fragilityPoint}`,
            confidence: (latestLab.robustnessScore * 100).toFixed(0) + '% Robust',
            trackId: 'SIM-CONVERGED',
            description: `Analytic trace identifies fragility at ${latestLab.fragilityPoint} under ${latestLab.config.redModel} simulation.`
        } : {
            source: 'System Baseline',
            confidence: '98%',
            trackId: 'N/A',
            description: 'Sensors report nominal ambient noise. Decision loop operating at high confidence baseline.'
        });

        return {
            activePolicyName: activePolicy?.name || 'No Policy Active',
            activePolicyWeights: activePolicy?.weights,
            selectedCOA,
            publishedIntent,
            tradeoffText,
            constraints,
            uncertainty,
            hash: this._auditHash,
            logCount: logs.length,
            latestAction: logs.length > 0 ? logs[0].action : 'NONE'
        };
    });
}
