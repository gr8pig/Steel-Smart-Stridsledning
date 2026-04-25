import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { PolicyStore } from '../core/state/policy.store';
import { ReadinessStore } from '../core/state/readiness.store';
import { LabStore } from '../core/state/lab.store';
import { OrchestrationStore } from '../core/state/orchestration.store';
import { CapabilityLayerStore } from '../core/state/capability-layer.store';
import { CapabilityOrchestrator } from '../core/services/capability-orchestrator';
import { PublicCapabilityCard } from '../shared/domain/public-capability';

@Component({
  selector: 'app-commander-orchestrator',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full w-full p-4 flex flex-col gap-4 overflow-hidden bg-boreal-canvas text-boreal-text-primary">
      <header class="flex items-center justify-between border-b border-boreal-border pb-3">
        <div class="flex flex-col gap-1">
            <h1 class="text-2xl font-light tracking-tight text-boreal-text-primary uppercase tracking-[0.2em]">Commander Orchestrator</h1>
            <p class="text-[10px] text-boreal-text-muted font-mono uppercase tracking-widest italic leading-none">Policy-driven COA tradeoff analysis & intent publication</p>
        </div>
        <div class="flex gap-4">
             <!-- Mode Indicator -->
             <div class="flex flex-col items-end pr-4 border-r border-boreal-border">
                <span class="text-[9px] font-mono text-boreal-text-muted uppercase">Remapping Mode</span>
                <div class="flex items-center gap-2">
                    @if (capabilityStore.mode() !== 'SYNTHETIC') {
                        <span class="px-1.5 py-0.5 bg-boreal-amber/20 text-boreal-amber text-[8px] font-mono font-black tracking-widest rounded-sm border border-boreal-amber/40 animate-pulse cursor-help" 
                              title="Public Interpretation Active: Capability estimates are derived from open-source patterns and may contain deceptive signals. Use with caution.">
                            PUBLIC INTERPRETATION ACTIVE
                        </span>
                    }
                    <span class="text-[10px] font-mono font-bold uppercase text-boreal-text-primary">
                        {{ capabilityStore.mode() }}
                    </span>
                </div>
             </div>

             <div class="flex flex-col items-end">
                <span class="text-[9px] font-mono text-boreal-text-muted uppercase">Decision Status</span>
                <span class="text-[10px] font-mono font-bold uppercase" [class.text-boreal-amber]="!orchestration.publishedIntent()" [class.text-boreal-green]="orchestration.publishedIntent()">
                    {{ orchestration.publishedIntent() ? 'Intent Published' : 'Awaiting Authorization' }}
                </span>
             </div>
        </div>
      </header>

      <!-- Capability Context Card -->
      @if (capabilityStore.mode() !== 'SYNTHETIC') {
        <div class="design-card bg-boreal-blue/5 border-boreal-blue/30 flex items-start gap-6 animate-in slide-in-from-top-2 duration-500">
           <div class="flex flex-col gap-1 min-w-[200px]">
              <span class="text-[9px] font-black text-boreal-blue uppercase tracking-widest">Active Interpretation Layer</span>
              <h3 class="text-xs font-bold text-boreal-text-primary uppercase">{{ capabilityStore.mode().replace('_', ' ') }}</h3>
              <div class="flex items-center gap-2 mt-1">
                 <span class="w-1.5 h-1.5 rounded-full bg-boreal-blue animate-pulse"></span>
                 <span class="text-[8px] font-mono text-boreal-text-muted uppercase tracking-tighter">OSINT-DATA-FETCH: OK</span>
              </div>
           </div>
           
           <div class="flex-grow">
              <p class="text-[10px] text-boreal-text-secondary leading-relaxed italic max-w-2xl">
                 Applying cross-domain remapping based on {{ capabilityStore.mode() === 'SWEDEN_SAAB_PUBLIC' ? 'Saab public product catalog' : 'identified archetypes' }}. 
                 Boreal Twin is currently correlating synthetic threat behavior with these public signatures to provide human-readable capability estimates.
              </p>
           </div>

           <div class="flex flex-col gap-2 min-w-[220px] border-l border-boreal-blue/20 pl-6">
              <span class="text-[8px] font-bold text-boreal-text-muted uppercase tracking-widest">Active Archetypes</span>
              <div class="flex flex-wrap gap-1">
                 @for (card of activeArchetypes(); track card.id) {
                    <span class="px-1.5 py-0.5 bg-boreal-panel border border-boreal-border rounded-sm text-[7px] font-mono text-boreal-text-secondary uppercase">
                       {{ card.displayName }}
                    </span>
                 }
              </div>
           </div>
        </div>
      }
      
      <!-- Wave-2 Readiness Projection -->
      <div class="design-card !p-0 overflow-hidden shadow-lg flex-shrink-0">
        <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted bg-boreal-panel-muted/20 flex justify-between pr-3 border-b border-boreal-border">
          <span>Wave-2 Readiness Projection — 12h Horizon</span>
          <div class="flex items-center gap-6">
            <div class="flex items-center gap-2">
              <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="var(--boreal-blue, #3b82f6)" stroke-width="2"/></svg>
              <span class="text-[8px] font-bold text-boreal-blue uppercase tracking-tighter">BDT Policy</span>
            </div>
            <div class="flex items-center gap-2">
              <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="var(--boreal-red, #ef4444)" stroke-width="2" stroke-dasharray="4,2"/></svg>
              <span class="text-[8px] font-bold text-boreal-red uppercase tracking-tighter">Legacy Baseline</span>
            </div>
          </div>
        </div>
        <div class="relative px-6 pt-3 pb-1 bg-boreal-canvas/20">
          <!-- viewBox 0 0 450 88: X chart area 32→422 (T+0→T+12), Y area 5→80 (100%→0%) -->
          <!-- Y formula: y = 5 + (1 - readiness) * 75 -->
          <svg viewBox="0 0 450 88" class="w-full" preserveAspectRatio="none" style="height:88px">
            <!-- Y-axis grid lines at 100%, 75%, 50%, 25% -->
            <line x1="32" y1="5"  x2="422" y2="5"  stroke="currentColor" stroke-width="0.3" stroke-dasharray="2,4" class="text-boreal-border" opacity="0.4"/>
            <line x1="32" y1="24" x2="422" y2="24" stroke="currentColor" stroke-width="0.3" stroke-dasharray="2,4" class="text-boreal-border" opacity="0.4"/>
            <line x1="32" y1="43" x2="422" y2="43" stroke="currentColor" stroke-width="0.3" stroke-dasharray="2,4" class="text-boreal-border" opacity="0.4"/>
            <line x1="32" y1="61" x2="422" y2="61" stroke="currentColor" stroke-width="0.3" stroke-dasharray="2,4" class="text-boreal-border" opacity="0.4"/>
            <!-- Y-axis labels -->
            <text x="28" y="8"  text-anchor="end" font-size="5.5" fill="currentColor" class="text-boreal-text-muted" opacity="0.55">100%</text>
            <text x="28" y="27" text-anchor="end" font-size="5.5" fill="currentColor" class="text-boreal-text-muted" opacity="0.55">75%</text>
            <text x="28" y="46" text-anchor="end" font-size="5.5" fill="currentColor" class="text-boreal-text-muted" opacity="0.55">50%</text>
            <text x="28" y="64" text-anchor="end" font-size="5.5" fill="currentColor" class="text-boreal-text-muted" opacity="0.55">25%</text>
            <!-- X-axis labels: X = 32 + hour * (390/12) = 32 + hour * 32.5 -->
            <text x="32"  y="84" text-anchor="middle" font-size="5" fill="currentColor" class="text-boreal-text-muted" opacity="0.5">T+0</text>
            <text x="97"  y="84" text-anchor="middle" font-size="5" fill="currentColor" class="text-boreal-text-muted" opacity="0.5">T+2h</text>
            <text x="162" y="84" text-anchor="middle" font-size="5" fill="currentColor" class="text-boreal-text-muted" opacity="0.5">T+4h</text>
            <text x="227" y="84" text-anchor="middle" font-size="5" fill="currentColor" class="text-boreal-text-muted" opacity="0.5">T+6h</text>
            <text x="292" y="84" text-anchor="middle" font-size="5" fill="currentColor" class="text-boreal-text-muted" opacity="0.5">T+8h</text>
            <text x="357" y="84" text-anchor="middle" font-size="5" fill="currentColor" class="text-boreal-text-muted" opacity="0.5">T+10h</text>
            <text x="422" y="84" text-anchor="middle" font-size="5" fill="currentColor" class="text-boreal-text-muted" opacity="0.5">T+12h</text>
            <!-- Legacy fill: under dashed red line to baseline y=80 -->
            <path d="M32,16 L97,28 L162,41 L227,53 L292,63 L357,70 L422,74 L422,80 L32,80 Z"
                  fill="var(--boreal-red, #ef4444)" fill-opacity="0.06"/>
            <!-- BDT fill: under solid blue line to baseline y=80 -->
            <path d="M32,16 L97,19 L162,22 L227,25 L292,29 L357,31 L422,34 L422,80 L32,80 Z"
                  fill="var(--boreal-blue, #3b82f6)" fill-opacity="0.08"/>
            <!-- Legacy line (red dashed) — 85%→70%→52%→36%→23%→14%→8% -->
            <polyline points="32,16 97,28 162,41 227,53 292,63 357,70 422,74"
                      fill="none" stroke="var(--boreal-red, #ef4444)" stroke-width="1.5" stroke-dasharray="5,3" stroke-linecap="round" stroke-linejoin="round"/>
            <!-- BDT line (blue solid) — 85%→82%→78%→73%→68%→65%→62% -->
            <polyline points="32,16 97,19 162,22 227,25 292,29 357,31 422,34"
                      fill="none" stroke="var(--boreal-blue, #3b82f6)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <!-- T+12 endpoint: Legacy 8% at y=74 -->
            <circle cx="422" cy="74" r="2.5" fill="var(--boreal-red, #ef4444)"/>
            <text x="417" y="69" text-anchor="end" font-size="7" font-weight="bold" fill="var(--boreal-red, #ef4444)">8%</text>
            <!-- T+12 endpoint: BDT 62% at y=34 -->
            <circle cx="422" cy="34" r="3" fill="var(--boreal-blue, #3b82f6)"/>
            <text x="417" y="29" text-anchor="end" font-size="7" font-weight="bold" fill="var(--boreal-blue, #3b82f6)">62%</text>
            <!-- Divergence bracket at T+12 -->
            <line x1="430" y1="34" x2="430" y2="74" stroke="var(--boreal-amber, #f59e0b)" stroke-width="0.6" opacity="0.6"/>
            <line x1="427" y1="34" x2="433" y2="34" stroke="var(--boreal-amber, #f59e0b)" stroke-width="0.6" opacity="0.6"/>
            <line x1="427" y1="74" x2="433" y2="74" stroke="var(--boreal-amber, #f59e0b)" stroke-width="0.6" opacity="0.6"/>
            <text x="436" y="56" text-anchor="start" font-size="6" font-weight="bold" fill="var(--boreal-amber, #f59e0b)" opacity="0.8">Δ54pp</text>
          </svg>
        </div>
      </div>

      <div class="grid grid-cols-12 gap-4 flex-grow min-h-0">
         
         <!-- Left: Policy Steering & Intent -->
         <div class="col-span-12 lg:col-span-3 flex flex-col gap-4 overflow-hidden">
            <div class="design-card flex flex-col !p-0 overflow-hidden flex-grow shadow-2xl">
                <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted bg-boreal-panel-muted/20 flex justify-between pr-3 border-b border-boreal-border">
                    <span>Policy Steering Vector</span>
                    <div class="flex gap-1 py-1">
                        <div class="w-2 h-0.5 bg-boreal-blue" [style.opacity]="vm().weights.safety"></div>
                        <div class="w-2 h-0.5 bg-boreal-amber" [style.opacity]="vm().weights.sustainability"></div>
                        <div class="w-2 h-0.5 bg-boreal-green" [style.opacity]="vm().weights.resilience"></div>
                    </div>
                </div>
                <div class="flex-grow overflow-y-auto p-4 space-y-8">
                    <!-- Stochastic Feedback Banner -->
                    @if (lab.latestInsight(); as insight) {
                        <div class="p-3 bg-boreal-blue/10 border border-boreal-blue/30 rounded-sm flex flex-col gap-2 animate-in slide-in-from-left-2 duration-500 mb-4">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <mat-icon class="!text-sm text-boreal-blue">biotech</mat-icon>
                                    <span class="text-[9px] font-bold text-boreal-blue uppercase tracking-widest">Lab Feedback</span>
                                </div>
                                <span class="text-[8px] font-mono text-boreal-text-muted">{{ insight.timestamp | date:'HH:mm:ss' }}</span>
                            </div>
                            <p class="text-[10px] text-boreal-text-secondary leading-relaxed">
                                <span class="text-boreal-blue font-bold uppercase tracking-tighter">Recommended Adjustment:</span><br>
                                {{ insight.recommendedPolicyAdjustment }}
                            </p>
                            <div class="flex items-center gap-4 mt-1">
                                <div class="flex flex-col">
                                    <span class="text-[7px] text-boreal-text-muted uppercase">Robustness</span>
                                    <span class="text-[10px] font-bold text-boreal-blue">{{ (insight.robustnessScore * 100).toFixed(0) }}%</span>
                                </div>
                                <div class="flex flex-col">
                                    <span class="text-[7px] text-boreal-text-muted uppercase">Fragility</span>
                                    <span class="text-[10px] font-bold text-boreal-red uppercase">{{ insight.fragilityPoint }}</span>
                                </div>
                                <button (click)="lab.clearInsights()" class="ml-auto text-boreal-text-muted hover:text-boreal-text-primary transition-colors">
                                    <mat-icon class="!text-xs">close</mat-icon>
                                </button>
                            </div>
                        </div>
                    }

                    @if (policy.activePolicy(); as p) {
                        <!-- Weight Sliders -->
                        <div class="space-y-6">
                            <div class="flex flex-col gap-2 group">
                                <div class="flex justify-between items-center text-boreal-text-secondary">
                                    <div class="flex items-center gap-2">
                                        <div class="w-1.5 h-1.5 rounded-full bg-boreal-blue shadow-[0_0_8px_var(--boreal-blue)]"></div>
                                        <span class="text-[10px] font-bold uppercase tracking-wider">Safety Priority</span>
                                    </div>
                                    <span class="text-[10px] font-mono text-boreal-blue font-bold tracking-tighter">{{ (p.weights.safety * 100).toFixed(0) }}%</span>
                                </div>
                                <input type="range" class="w-full h-1 accent-boreal-blue cursor-pointer bg-boreal-canvas rounded-lg appearance-none border border-boreal-border"
                                    [value]="p.weights.safety * 100" 
                                    (input)="updateWeight('safety', $event)"/>
                                <p class="text-[9px] text-boreal-text-muted leading-tight italic">Intercept expenditure vs asset leakage risk.</p>
                            </div>

                            <div class="flex flex-col gap-2 group">
                                <div class="flex justify-between items-center text-boreal-text-secondary">
                                    <div class="flex items-center gap-2">
                                        <div class="w-1.5 h-1.5 rounded-full bg-boreal-amber shadow-[0_0_8px_var(--boreal-amber)]"></div>
                                        <span class="text-[10px] font-bold uppercase tracking-wider">Sustainability</span>
                                    </div>
                                    <span class="text-[10px] font-mono text-boreal-amber font-bold tracking-tighter">{{ (p.weights.sustainability * 100).toFixed(0) }}%</span>
                                </div>
                                <input type="range" class="w-full h-1 accent-boreal-amber cursor-pointer bg-boreal-canvas rounded-lg appearance-none border border-boreal-border"
                                    [value]="p.weights.sustainability * 100" 
                                    (input)="updateWeight('sustainability', $event)"/>
                                <p class="text-[9px] text-boreal-text-muted leading-tight italic">Present safety vs future interceptor depth.</p>
                            </div>

                             <div class="flex flex-col gap-2 group">
                                <div class="flex justify-between items-center text-boreal-text-secondary">
                                    <div class="flex items-center gap-2">
                                        <div class="w-1.5 h-1.5 rounded-full bg-boreal-green shadow-[0_0_8px_var(--boreal-green)]"></div>
                                        <span class="text-[10px] font-bold uppercase tracking-wider">Resilience</span>
                                    </div>
                                    <span class="text-[10px] font-mono text-boreal-green font-bold tracking-tighter">{{ (p.weights.resilience * 100).toFixed(0) }}%</span>
                                </div>
                                <input type="range" class="w-full h-1 accent-boreal-green cursor-pointer bg-boreal-canvas rounded-lg appearance-none border border-boreal-border"
                                    [value]="p.weights.resilience * 100" 
                                    (input)="updateWeight('resilience', $event)"/>
                                <p class="text-[9px] text-boreal-text-muted leading-tight italic">Base recovery rate & sortie durability.</p>
                            </div>
                        </div>

                        <!-- Guardrail Section -->
                        <div class="pt-6 border-t border-boreal-border space-y-4">
                            <span class="text-[9px] font-bold text-boreal-text-muted uppercase tracking-widest block">Commander Guardrails</span>
                            
                            <div class="space-y-4">
                                <div class="flex flex-col gap-2">
                                    <div class="flex justify-between">
                                        <span class="text-[9px] text-boreal-text-muted uppercase">Reserve Interceptor Floor</span>
                                        <span class="text-[10px] font-mono text-boreal-text-primary font-bold">{{p.guardrails.reserveInterceptorFloor}} <span class="text-[8px] text-boreal-text-muted">UNITS</span></span>
                                    </div>
                                    <input type="range" class="w-full accent-boreal-text-muted h-1 bg-boreal-canvas rounded-lg appearance-none border border-boreal-border" 
                                        min="0" max="100" [value]="p.guardrails.reserveInterceptorFloor"
                                        (input)="updateGuardrail('reserveInterceptorFloor', $event)">
                                </div>

                                <div class="flex flex-col gap-2">
                                    <div class="flex justify-between">
                                        <span class="text-[9px] text-boreal-text-muted uppercase">Min Readiness Threshold</span>
                                        <span class="text-[10px] font-mono text-boreal-text-primary font-bold">{{ (p.guardrails.minReadinessThreshold * 100).toFixed(0) }}%</span>
                                    </div>
                                    <input type="range" class="w-full accent-boreal-amber h-1 bg-boreal-canvas rounded-lg appearance-none border border-boreal-border" 
                                        min="0" max="100" [value]="p.guardrails.minReadinessThreshold * 100"
                                        (input)="updateGuardrailPercent('minReadinessThreshold', $event)">
                                </div>

                                <div class="flex flex-col gap-2">
                                    <div class="flex justify-between">
                                        <span class="text-[9px] text-boreal-text-muted uppercase">Critical Asset Priority</span>
                                        <span class="text-[10px] font-mono text-boreal-blue font-bold tracking-tighter">{{ (p.guardrails.criticalAssetPriority * 100).toFixed(0) }}%</span>
                                    </div>
                                    <input type="range" class="w-full accent-boreal-blue h-1 bg-boreal-canvas rounded-lg appearance-none border border-boreal-border" 
                                        min="0" max="100" [value]="p.guardrails.criticalAssetPriority * 100"
                                        (input)="updateGuardrailPercent('criticalAssetPriority', $event)">
                                    <p class="text-[8px] text-boreal-text-muted uppercase tracking-tighter italic">Weight applied to tier-1 defense nodes.</p>
                                </div>

                                <div class="flex items-center justify-between p-3 rounded bg-boreal-canvas/40 border border-boreal-border">
                                    <span class="text-[9px] text-boreal-text-muted uppercase font-bold tracking-widest leading-none">Authority</span>
                                    <div class="flex gap-1">
                                        @for (level of ['AUTO', 'SEMI', 'MANUAL']; track level) {
                                            <button 
                                                (click)="updateGuardrail('engagementAuthority', level)"
                                                class="px-2 py-1 rounded-[1px] text-[8px] font-bold border transition-all uppercase tracking-widest"
                                                [class.bg-boreal-blue]="p.guardrails.engagementAuthority === level"
                                                [class.border-boreal-blue]="p.guardrails.engagementAuthority === level"
                                                [class.text-white]="p.guardrails.engagementAuthority === level"
                                                [class.shadow-[0_0_8px_var(--boreal-blue)]]="p.guardrails.engagementAuthority === level"
                                                [class.border-boreal-border]="p.guardrails.engagementAuthority !== level"
                                                [class.text-boreal-text-muted]="p.guardrails.engagementAuthority !== level"
                                                [class.bg-transparent]="p.guardrails.engagementAuthority !== level"
                                            >
                                                {{level}}
                                            </button>
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Published Intent Summary -->
                        @if (orchestration.publishedIntent(); as intent) {
                           <div class="pt-6 border-t border-boreal-border space-y-3">
                               <span class="text-[9px] font-black text-boreal-blue uppercase tracking-[0.2em] block">Active Strategic Intent</span>
                               <div class="p-3 bg-boreal-blue/5 border border-boreal-blue/20 rounded-[2px] space-y-2 relative overflow-hidden group">
                                   <div class="absolute right-[-4px] top-[-4px] opacity-10 group-hover:opacity-20 transition-opacity">
                                       <mat-icon class="!text-3xl text-boreal-blue">verified</mat-icon>
                                   </div>
                                   <div class="flex justify-between items-center">
                                       <span class="text-[8px] text-boreal-text-muted font-mono tracking-tighter">{{ intent.timestamp }}</span>
                                       <span class="px-1.5 py-0.5 bg-boreal-blue/20 text-boreal-blue text-[7px] font-black tracking-widest rounded-sm border border-boreal-blue/40">COMMITTED</span>
                                   </div>
                                   <p class="text-[10px] text-boreal-text-primary font-medium leading-tight">
                                       {{ intent.commanderRationale }}
                                   </p>
                                   <div class="flex gap-2 pt-1">
                                        <div class="flex flex-col">
                                           <span class="text-[7px] text-boreal-text-muted uppercase">Track Count</span>
                                           <span class="text-[9px] font-mono text-boreal-text-secondary">5 ACTIVE</span>
                                        </div>
                                        <div class="flex flex-col">
                                           <span class="text-[7px] text-boreal-text-muted uppercase">Policy ID</span>
                                           <span class="text-[9px] font-mono text-boreal-text-secondary">POL-01-V4</span>
                                        </div>
                                   </div>
                               </div>
                           </div>
                        } @else {
                           <!-- Asset Priorities Stub -->
                           <div class="pt-6 border-t border-boreal-border space-y-2">
                                <div class="flex justify-between items-center">
                                   <span class="text-[9px] font-bold text-boreal-text-muted uppercase tracking-widest">Asset Priorities</span>
                                   <mat-icon class="!text-[10px] text-boreal-text-muted cursor-help">info</mat-icon>
                                </div>
                                <div class="space-y-1">
                                    <div class="flex items-center justify-between p-1.5 bg-boreal-canvas/40 rounded-sm border border-boreal-border">
                                        <span class="text-[9px] text-boreal-text-primary uppercase tracking-tighter">Nordvik Power Plant</span>
                                        <span class="text-[8px] px-1.5 py-0.5 bg-boreal-red/20 text-boreal-red font-bold rounded-sm uppercase tracking-tighter">CRITICAL</span>
                                    </div>
                                    <div class="flex items-center justify-between p-1.5 bg-boreal-canvas/40 rounded-sm border border-boreal-border opacity-60">
                                        <span class="text-[9px] text-boreal-text-primary uppercase tracking-tighter">Boreal Watch-1</span>
                                        <span class="text-[8px] px-1.5 py-0.5 bg-boreal-amber/20 text-boreal-amber font-bold rounded-sm uppercase tracking-tighter">HIGH</span>
                                    </div>
                                </div>
                           </div>
                        }
                    }
                </div>

                <div class="p-4 bg-boreal-canvas/40 border-t border-boreal-border space-y-2">
                    <button 
                        (click)="publishPolicy()"
                        class="w-full py-2 bg-boreal-text-primary text-boreal-canvas rounded-sm text-[10px] font-bold shadow-xl hover:brightness-110 active:scale-[0.98] transition-all uppercase tracking-[0.2em] font-sans"
                    >
                        Publish Policy Shift
                    </button>
                    @if (orchestration.publishedIntent()) {
                        <button 
                            (click)="orchestration.clearIntent()"
                            class="w-full py-2 bg-transparent text-boreal-text-muted rounded-sm text-[8px] font-bold uppercase tracking-widest hover:text-boreal-red transition-colors font-sans"
                        >
                            Revoke Intent
                        </button>
                    }
                </div>
            </div>
         </div>

         <!-- Center: Pareto Plot (Choice Architecture) -->
         <div class="col-span-12 lg:col-span-6 flex flex-col gap-4 overflow-hidden">
            <div class="design-card flex flex-col !p-0 overflow-hidden flex-grow shadow-lg">
                <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted bg-boreal-panel-muted/20 flex justify-between pr-3 border-b border-boreal-border">
                    <span>COA Pareto Space / Robustness Frontier</span>
                    <div class="flex items-center gap-4">
                        <div class="flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full bg-boreal-blue border border-white"></span>
                            <span class="text-[8px] text-boreal-text-muted font-bold uppercase tracking-tighter">Selected</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <span class="w-1.5 h-1.5 rounded-full border border-boreal-amber border-dashed"></span>
                            <span class="text-[8px] text-boreal-text-muted font-bold uppercase tracking-tighter text-boreal-amber">Legacy Baseline</span>
                        </div>
                    </div>
                </div>
                
                <div class="flex-grow relative p-16 select-none group bg-[radial-gradient(circle_at_center,var(--boreal-text-primary),transparent_100%)] bg-opacity-[0.02]">
                    <!-- Axes -->
                    <div class="absolute left-16 bottom-16 right-12 h-[2px] bg-boreal-border"></div>
                    <div class="absolute left-16 bottom-16 top-12 w-[2px] bg-boreal-border"></div>

                    <div class="absolute bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-mono text-boreal-text-muted uppercase tracking-[0.4em] font-black">
                        Sustainability Cost <span class="text-boreal-border tracking-normal px-2">••••</span> Future Depletion
                    </div>
                    <div class="absolute left-6 top-1/2 -rotate-90 origin-center text-[9px] font-mono text-boreal-text-muted uppercase tracking-[0.4em] font-black">
                        Protection Score <span class="text-boreal-border tracking-normal px-2">••••</span> Asset Safety
                    </div>

                    <!-- Legacy Baseline Reference -->
                    @let legacy = policy.legacyBaseline();
                    <div class="absolute w-4 h-4 rounded-full border border-boreal-amber border-dashed z-10 shadow-[0_0_15px_rgba(245,158,11,0.2)] flex items-center justify-center translate-x-[-50%] translate-y-[50%]"
                        title="Legacy System Baseline (Fixed Logic)"
                        [style.left.%]="16 + (legacy.cost / 2000000) * 70"
                        [style.bottom.%]="16 + (legacy.robustnessScore) * 70">
                        <div class="absolute -top-3 left-1/2 -translate-x-1/2 text-[7px] text-boreal-amber font-black uppercase whitespace-nowrap tracking-widest">LEGACY-01</div>
                        <div class="w-1 h-1 bg-boreal-amber rounded-full"></div>
                    </div>

                    <!-- Plot Curve Guide -->
                    <div class="absolute left-16 bottom-16 right-12 top-12 overflow-hidden pointer-events-none opacity-10">
                         <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d="M10,20 Q40,30 85,85" fill="none" stroke="currentColor" stroke-width="0.5" stroke-dasharray="1,2" class="text-boreal-text-primary"></path>
                            <defs>
                                <pattern id="pareto-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.1" class="text-boreal-text-primary"/>
                                </pattern>
                            </defs>
                            <rect width="100" height="100" fill="url(#pareto-grid)" />
                         </svg>
                    </div>

                    <!-- Dynamic COA Points -->
                    @for (coa of policy.availableCOAs(); track coa.id) {
                        @let isSelected = policy.selectedCOAId() === coa.id;
                        @let isRecommended = policy.recommendedCOA().id === coa.id;
                        
                        <button 
                            (click)="policy.selectCOA(coa.id)"
                            class="absolute w-5 h-5 rounded-full border-2 cursor-pointer transition-all hover:scale-125 z-20 flex items-center justify-center translate-x-[-50%] translate-y-[50%] focus:outline-none group/point"
                            [class.bg-boreal-blue]="isSelected"
                            [class.border-boreal-text-primary]="isSelected"
                            [class.shadow-[0_0_15px_rgba(59,130,246,0.6)]]="isSelected"
                            [class.bg-boreal-panel-elevated]="!isSelected"
                            [class.border-boreal-border]="!isSelected"
                            [style.left.%]="16 + (coa.projectedOutcome.cost / 2000000) * 70"
                            [style.bottom.%]="16 + (coa.projectedOutcome.robustnessScore) * 70"
                        >
                                       @if (isRecommended) {
                                <div class="absolute inset-[-6px] rounded-full border border-boreal-text-primary/20 animate-pulse pointer-events-none"></div>
                                <div class="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[6px] font-black text-boreal-text-muted uppercase tracking-tighter whitespace-nowrap">REC</div>
                            }

                            @if (isSelected) {
                                <div class="absolute inset-0 rounded-full animate-ping bg-boreal-blue opacity-20"></div>
                                <mat-icon class="!text-[10px] text-white">check</mat-icon>
                            } @else {
                                <div class="w-1.5 h-1.5 rounded-full" [class.bg-boreal-text-primary]="isRecommended" [class.bg-boreal-text-muted]="!isRecommended"></div>
                            }

                            <!-- Tooltip -->
                            <div class="absolute -top-12 left-1/2 -translate-x-1/2 px-2 py-1 bg-boreal-panel border border-boreal-border rounded shadow-2xl opacity-0 group-hover/point:opacity-100 transition-all text-[9px] pointer-events-none z-30 whitespace-nowrap">
                                <div class="font-bold text-boreal-text-primary mb-0.5">{{coa.name}}</div>
                                <div class="flex gap-2">
                                    <span class="text-boreal-text-muted font-mono text-[7px] uppercase tracking-tighter">Robustness: <span class="text-boreal-text-primary">{{(coa.projectedOutcome.robustnessScore*100).toFixed(0)}}%</span></span>
                                    <span class="text-boreal-text-muted font-mono text-[7px] uppercase tracking-tighter">Cost: <span class="text-boreal-amber">{{(coa.projectedOutcome.cost/1000).toFixed(0)}}k</span></span>
                                </div>
                            </div>
                        </button>
                    }

                    <!-- Pareto Profile Clusters -->
                    <div class="absolute left-[24%] top-[25%] flex flex-col items-center pointer-events-none opacity-30 group-hover:opacity-60 transition-opacity">
                        <span class="text-[8px] font-bold text-boreal-text-primary uppercase tracking-[0.2em] mb-1">Max Protection</span>
                        <div class="w-px h-6 bg-gradient-to-b from-boreal-text-primary to-transparent"></div>
                    </div>
                    <div class="absolute left-[54%] top-[45%] flex flex-col items-center pointer-events-none opacity-30 group-hover:opacity-60 transition-opacity">
                        <span class="text-[8px] font-bold text-boreal-text-primary uppercase tracking-[0.2em] mb-1">Balanced Posture</span>
                        <div class="w-px h-6 bg-gradient-to-b from-boreal-text-primary to-transparent"></div>
                    </div>
                    <div class="absolute left-[84%] bottom-[25%] flex flex-col items-center pointer-events-none opacity-30 group-hover:opacity-60 transition-opacity">
                        <span class="text-[8px] font-bold text-boreal-text-primary uppercase tracking-[0.2em] mb-1">Deep Sustainability</span>
                        <div class="w-px h-6 bg-gradient-to-b from-boreal-text-primary to-transparent"></div>
                    </div>
                </div>

                <!-- Strategic Summary / Profile Overlay -->
                <div class="p-4 bg-boreal-canvas/40 border-t border-boreal-border grid grid-cols-4 gap-4">
                    <div class="flex flex-col gap-1">
                        <span class="text-[7px] text-boreal-text-muted uppercase font-bold tracking-widest">Profile</span>
                        <span class="text-[10px] font-bold text-boreal-text-primary uppercase truncate">{{vm().selectedProfile}}</span>
                    </div>
                    <div class="flex flex-col gap-1">
                        <span class="text-[7px] text-boreal-text-muted uppercase font-bold tracking-widest">Efficiency</span>
                        <span class="text-[10px] font-bold text-boreal-green">{{vm().asymmetry}}x</span>
                    </div>
                    <div class="flex flex-col gap-1">
                        <span class="text-[7px] text-boreal-text-muted uppercase font-bold tracking-widest">Confidence</span>
                        <span class="text-[10px] font-bold text-boreal-text-primary">{{vm().avgConfidence}}%</span>
                    </div>
                    <div class="flex flex-col gap-1">
                        <span class="text-[7px] text-boreal-text-muted uppercase font-bold tracking-widest">Robustness</span>
                        <span class="text-[10px] font-bold text-boreal-blue">{{vm().robustness}}%</span>
                    </div>
                </div>
            </div>

         <!-- Right: Selected COA Deep Analysis -->
         <div class="col-span-12 lg:col-span-3 flex flex-col gap-4 overflow-hidden">
            <div class="design-card flex flex-col overflow-hidden h-full !p-0 border-l-2 border-l-boreal-blue/40 shadow-2xl">
                <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted bg-boreal-panel-muted/20 flex justify-between pr-3 border-b border-boreal-border">
                    <span>COA Projected Outcome</span>
                    <mat-icon class="!text-[11px] text-boreal-blue">analytics</mat-icon>
                </div>
                
                @if (policy.selectedCOA(); as coa) {
                    <div class="flex-grow overflow-y-auto p-5 space-y-6">
                        <header>
                            <h2 class="text-lg font-light text-boreal-text-primary tracking-widest uppercase">{{coa.name}}</h2>
                            <div class="flex items-center gap-3 mt-3">
                                <span class="px-2 py-0.5 rounded-sm bg-boreal-blue text-white text-[8px] font-bold uppercase tracking-widest">{{coa.type}}</span>
                                <span class="text-[9px] text-boreal-text-muted font-mono italic">CONF: {{coa.projectedOutcome.confidence * 100 | number:'1.0-0'}}%</span>
                            </div>
                        </header>

                        <!-- Primary Metrics Grid -->
                        <div class="grid grid-cols-2 gap-3">
                            <div class="p-3 bg-boreal-canvas/40 border border-boreal-border rounded-sm">
                                <span class="text-[8px] uppercase text-boreal-text-muted font-bold tracking-widest block mb-1">Expected Intercepts</span>
                                <div class="text-xl font-mono font-bold text-boreal-green leading-none">{{coa.projectedOutcome.intercepts}} / 5</div>
                            </div>
                             <div class="p-3 bg-boreal-canvas/40 border border-boreal-border rounded-sm" [class.border-boreal-red/40]="coa.projectedOutcome.leakage > 0">
                                <span class="text-[8px] uppercase text-boreal-text-muted font-bold tracking-widest block mb-1">Expected Leakage</span>
                                <div class="text-xl font-mono font-bold leading-none" [class.text-boreal-red]="coa.projectedOutcome.leakage > 0" [class.text-boreal-text-muted]="coa.projectedOutcome.leakage === 0">
                                    {{coa.projectedOutcome.leakage}}
                                </div>
                            </div>
                        </div>

                        <!-- Readiness & Fatigue Forecast -->
                        <div class="space-y-4">
                             <div class="flex flex-col gap-2">
                                <div class="flex justify-between items-baseline">
                                    <span class="text-[9px] uppercase text-boreal-text-muted font-bold tracking-widest">Sustainability Delta (12h)</span>
                                    <span class="text-[9px] font-mono text-boreal-text-primary">{{ (coa.projectedOutcome.cost / 2000000 * 100).toFixed(1) }}% LOSS</span>
                                </div>
                                <div class="h-1.5 bg-boreal-canvas border border-boreal-border rounded-full overflow-hidden">
                                     <div class="h-full bg-boreal-amber" [style.width.%]="coa.projectedOutcome.cost / 2000000 * 100"></div>
                                </div>
                                <p class="text-[9px] text-boreal-text-muted leading-relaxed italic border-l-2 border-boreal-border pl-3">
                                    {{coa.rationale}}
                                </p>
                            </div>

                             <div class="flex flex-col gap-2">
                                <div class="flex justify-between items-baseline">
                                    <span class="text-[9px] uppercase text-boreal-text-muted font-bold tracking-widest">Decision Robustness Score</span>
                                    <span class="text-[9px] font-mono text-boreal-blue">{{coa.projectedOutcome.robustnessScore}}</span>
                                </div>
                                <div class="h-1 bg-boreal-canvas border border-boreal-border rounded-full overflow-hidden">
                                    <div class="h-full bg-boreal-blue" [style.width.%]="coa.projectedOutcome.robustnessScore * 100"></div>
                                </div>
                            </div>

                             <div class="flex flex-col gap-1.5 p-3 bg-boreal-green/5 border border-boreal-green/20 rounded-sm">
                                <span class="text-[8px] uppercase text-boreal-green font-bold tracking-widest">Asymmetry Ratio (Operational Value)</span>
                                <div class="flex items-baseline gap-2">
                                    <span class="text-2xl font-bold text-boreal-text-primary leading-none tracking-tighter">{{coa.projectedOutcome.asymmetryRatio}}x</span>
                                    <span class="text-[8px] text-boreal-text-muted italic uppercase">Protection : Depletion Ratio</span>
                                </div>
                            </div>
                        </div>

                        <!-- Per-Base Impact -->
                        <div class="pt-4 border-t border-boreal-border space-y-3">
                             <span class="text-[9px] font-bold text-boreal-text-muted uppercase tracking-widest block">Base Recovery Forecast</span>
                             <div class="space-y-2">
                                @for (base of readiness.bases(); track base.id) {
                                    @let delta = coa.projectedOutcome.readinessDeltaByBase[base.id] || 0;
                                    <div class="flex items-center justify-between text-[10px] font-mono">
                                        <span class="text-boreal-text-muted uppercase">{{base.name}}</span>
                                        <div class="flex items-center gap-2">
                                            <span [class.text-boreal-red]="delta < -0.05" [class.text-boreal-green]="delta >= 0" [class.text-boreal-text-muted]="delta < 0 && delta >= -0.05">
                                                {{ delta * 100 | number:'1.1-1' }}%
                                            </span>
                                            <mat-icon class="!text-[10px]" [class.text-boreal-red]="delta < -0.05" [class.text-boreal-text-muted]="delta >= -0.05">
                                                {{ delta < 0 ? 'south_east' : 'north_east' }}
                                            </mat-icon>
                                        </div>
                                    </div>
                                }
                             </div>
                        </div>
                    </div>

                    <!-- Intent Publication State (What Tactical Inherits) -->
                    <div class="p-4 border-t border-boreal-border bg-boreal-canvas/60 space-y-4">
                         <div class="flex flex-col gap-2">
                            <span class="text-[9px] font-bold text-boreal-blue uppercase tracking-widest block mb-1">Intent Publication State</span>
                            <div class="grid grid-cols-2 gap-2">
                                <div class="p-2 bg-boreal-canvas/40 rounded-sm border border-boreal-border">
                                    <span class="text-[8px] text-boreal-text-muted uppercase block">Mode</span>
                                    <span class="text-[9px] text-boreal-text-primary font-bold uppercase">{{policy.activePolicy()?.guardrails?.engagementAuthority}}</span>
                                </div>
                                <div class="p-2 bg-boreal-canvas/40 rounded-sm border border-boreal-border">
                                    <span class="text-[8px] text-boreal-text-muted uppercase block">Burn Constraint</span>
                                    <span class="text-[9px] text-boreal-text-primary font-bold uppercase">Sustainability {{ (vm().sustainWeight * 10).toFixed(0) }}</span>
                                </div>
                            </div>
                         </div>
                         
                         <div class="flex flex-col gap-2">
                            <button 
                                (click)="approveCOA()"
                                class="w-full py-2 bg-boreal-blue text-white rounded-sm text-[10px] font-bold tracking-widest uppercase hover:brightness-110 shadow-xl shadow-boreal-blue/20 transition-all font-sans"
                            >
                            Commit Intent to Tactical
                            </button>
                            <button 
                                (click)="analyzeInLab()"
                                class="w-full py-2 bg-boreal-panel-elevated border border-boreal-border rounded-sm text-[10px] font-bold tracking-widest uppercase text-boreal-text-muted hover:text-boreal-text-primary transition-colors font-sans"
                            >
                            Analyze in Lab
                            </button>
                         </div>
                    </div>
                }
            </div>
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
export class CommanderOrchestrator {
    policy = inject(PolicyStore);
    readiness = inject(ReadinessStore);
    lab = inject(LabStore);
    orchestration = inject(OrchestrationStore);
    capabilityStore = inject(CapabilityLayerStore);
    orchestrator = inject(CapabilityOrchestrator);

    activeArchetypes = computed<PublicCapabilityCard[]>(() => {
        const seen = new Set<string>();
        return this.capabilityStore.remappedTracks()
            .map(track => track.publicInterpretation)
            .filter((card): card is PublicCapabilityCard => {
                if (!card || seen.has(card.id)) return false;
                seen.add(card.id);
                return true;
            });
    });

    vm = computed(() => {
        const selectedCOA = this.policy.selectedCOA();
        const coas = this.policy.availableCOAs();
        const activePolicy = this.policy.activePolicy();

        const avgConfidence = coas.length 
            ? (coas.reduce((acc, c) => acc + c.projectedOutcome.confidence, 0) / coas.length * 100).toFixed(0)
            : '0';

        const avgAsymmetry = coas.length
            ? (coas.reduce((acc, c) => acc + c.projectedOutcome.asymmetryRatio, 0) / coas.length).toFixed(1)
            : '0';

        const robustness = selectedCOA 
            ? (selectedCOA.projectedOutcome.robustnessScore * 100).toFixed(0)
            : '0';

        const w = activePolicy?.weights;
        let policyDesc = 'Balanced Command: Hedges safety against future readiness.';
        if (w) {
            if (w.safety > 0.75) policyDesc = 'Maximum Protection: Asset safety is paramount. High interceptor burn authorized.';
            else if (w.sustainability > 0.75) policyDesc = 'Strategic Conservation: Preserving interceptor depth for future waves. Tolerating leakage.';
            else if (w.resilience > 0.75) policyDesc = 'Distributed Resilience: Focus on base recovery and sortie persistence.';
        }

        return {
            selectedProfile: selectedCOA?.type.replace('_', ' ') || 'NONE',
            avgConfidence,
            asymmetry: avgAsymmetry,
            robustness,
            policyDesc,
            sustainWeight: activePolicy?.weights.sustainability || 0,
            weights: activePolicy?.weights || { safety: 0, sustainability: 0, resilience: 0 }
        };
    });

    updateWeight(key: 'safety' | 'sustainability' | 'resilience', event: Event) {
        const val = parseInt((event.target as HTMLInputElement).value, 10) / 100;
        if (key === 'safety') this.policy.updateWeights({ safety: val });
        if (key === 'sustainability') this.policy.updateWeights({ sustainability: val });
        if (key === 'resilience') this.policy.updateWeights({ resilience: val });
    }

    updateGuardrail(key: string, event: Event | string) {
        const value = typeof event === 'string' ? event : (event.target as HTMLInputElement).value;
        const parsedValue = isNaN(Number(value)) ? value : Number(value);
        this.policy.updateGuardrails({ [key]: parsedValue });
    }

    updateGuardrailPercent(key: string, event: Event) {
        const val = parseInt((event.target as HTMLInputElement).value, 10) / 100;
        this.policy.updateGuardrails({ [key]: val });
    }

    publishPolicy() {
        this.orchestrator.showFeature({
            name: 'Policy Propagation Engine',
            operationalFunction: 'Synchronizes current commander weights and guardrails across the theater. This will force Tactical AI to recalculate every track engagement priority in 4.2ms.',
            persona: 'Air Defense Commander / Orchestrator',
            decisionImproved: 'Strategic Alignment & Resource Allocation',
            inputs: 'Weight shifts (Safety, Sustainability, Resilience), Guardrail triggers',
            outputs: 'Synchronized Theater State Update',
            rationale: 'Decoupling policy from execution leads to "orphan intercepts" that waste strategic reserves. Propagation ensures vertical coherence.',
            status: 'OPERATIONAL',
            tier: 'MVP',
            nextStep: 'Implement websocket push to tactical operator stations.'
        });
    }

    approveCOA() {
        const coa = this.policy.selectedCOA();
        const desc = this.vm().policyDesc;
        if (coa) {
            this.orchestration.publishIntent(`${desc} | ${coa.rationale}`);
        }

        this.orchestrator.showFeature({
             name: 'Commander Intent Commitment',
             operationalFunction: 'Authorizes the selected Course of Action, committing specific base effectors and sortie capacities. Tactical stations will receive "PUBLISHED_INTENT" with these constraints.',
             persona: 'Air Defense Commander',
             decisionImproved: 'Tactical Execution Under Uncertainty',
             inputs: 'Selected COA, Active Weight Profile',
             outputs: 'Published Intent Token',
             rationale: 'Tactical operators need bound constraints, not just raw targets. Publishing intent provides the "why" behind the engagement limits.',
             status: 'OPERATIONAL',
             tier: 'MVP',
             nextStep: 'Tactical Console is now reactively aware of this published intent.'
        });
    }

    analyzeInLab() {
        this.orchestration.handoffCOAToLab();

        this.orchestrator.showFeature({
            name: 'Choice Sensitivity Lab',
            operationalFunction: 'Exports the current tradeoff curve to Robustness Lab to verify if your "Balanced" choice holds up against Red-Behavior-B (Deceptive Swarm).',
            persona: 'Air Defense Commander',
            decisionImproved: 'Decision Robustness',
            inputs: 'COA Outcome, Pareto Frontier',
            outputs: 'Robustness Heatmap',
            rationale: 'The Pareto front shows the best options for NOW. The Lab shows which options survive the NEXT surprise.',
            status: 'PARTIAL_FRONTEND',
            tier: 'MVP',
            nextStep: 'The Lab now displays the COA being stress tested.'
        });
    }
}
