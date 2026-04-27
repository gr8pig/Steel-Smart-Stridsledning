import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TacticalStore } from '../../../core/state/tactical.store';
import { PolicyStore } from '../../../core/state/policy.store';
import { ReadinessStore } from '../../../core/state/readiness.store';
import { OrchestrationStore } from '../../../core/state/orchestration.store';
import { CapabilityOrchestrator } from '../../../core/services/capability-orchestrator';
import { SensorFeedStore } from '../../../core/state/sensor-feed.store';
import { SteelApiService } from '../../../core/services/steel-api.service';
import { OperationalDirectiveQueueService } from '../../../core/services/operational-directive-queue.service';
import { CapabilityLayerStore } from '../../../core/state/capability-layer.store';
import { COATwin } from '../../../shared/domain/models';

@Component({
  selector: 'app-tactical-recommendations',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="tactical-panel tactical-panel--recommendations w-85 border-l border-boreal-border bg-boreal-panel flex flex-col h-full overflow-y-auto">
      <div class="panel-header uppercase tracking-widest text-[10px] text-boreal-text-muted">Recommendations</div>
      
      <!-- HITL Manual Confirmation Modal (Local to Recommendations or emitted to parent) -->
      @if (_pendingConfirm()) {
        <div class="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center backdrop-blur-sm">
          <div class="bg-boreal-panel border border-boreal-red/50 rounded-sm p-8 shadow-[0_0_60px_rgba(239,68,68,0.2)] max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
            <div class="flex items-center gap-3 mb-4">
              <mat-icon class="text-boreal-red !text-2xl !w-6 !h-6">lock</mat-icon>
              <div class="flex flex-col">
                <span class="text-boreal-red font-black text-xs uppercase tracking-[0.2em]">HITL Authority Active</span>
                <span class="text-[9px] text-boreal-text-muted font-mono uppercase tracking-wider">Manual Confirmation Required</span>
              </div>
            </div>
            @if (recommendation(); as rec) {
              <div class="mb-5 p-3 bg-boreal-canvas rounded-sm border border-boreal-border space-y-1">
                <div class="text-[8px] text-boreal-text-muted uppercase tracking-widest">Pending Engagement</div>
                <div class="text-[11px] font-black text-boreal-text-primary uppercase tracking-wider">{{ rec.trackId }}</div>
                <div class="text-[10px] text-boreal-text-secondary">{{ rec.title }}</div>
                <div class="flex gap-3 pt-1 text-[8px] font-mono text-boreal-text-muted">
                  <span>Base: <span class="text-boreal-text-secondary font-bold">{{ rec.baseName }}</span></span>
                  <span>Conf: <span class="text-boreal-text-secondary font-bold">{{ rec.confidence }}%</span></span>
                </div>
              </div>
            }
            <p class="text-[10px] text-boreal-text-secondary leading-relaxed mb-6 italic">
              Policy authority is <span class="font-black text-boreal-text-primary">MANUAL (HITL)</span>.
              All engagements require explicit operator confirmation before execution.
            </p>
            <div class="flex gap-3">
              <button (click)="_pendingConfirm.set(false)"
                class="flex-grow py-2.5 bg-transparent border border-boreal-border rounded-sm text-boreal-text-muted text-[10px] font-bold uppercase tracking-widest hover:text-boreal-text-primary transition-colors">
                CANCEL
              </button>
              <button (click)="confirmManualEngagement()"
                class="flex-grow py-2.5 bg-boreal-red border border-boreal-red rounded-sm text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-boreal-red/20">
                AUTHORIZE
              </button>
            </div>
          </div>
        </div>
      }

      <div class="flex-grow p-4 flex flex-col gap-4">
          @if (recommendation(); as rec) {
              <!-- Recommendation Card -->
              <div class="flex flex-col gap-4">
                  <div class="p-4 rounded-sm border shadow-lg transition-all" 
                       [class.border-boreal-blue/20]="rec.currentAction === 'PENDING'"
                       [class.bg-boreal-blue/5]="rec.currentAction === 'PENDING'"
                       [class.border-boreal-green/40]="rec.currentAction === 'ACCEPTED'"
                       [class.bg-boreal-green/5]="rec.currentAction === 'ACCEPTED'"
                       [class.border-boreal-amber/40]="rec.currentAction === 'HELD'"
                       [class.bg-boreal-amber/5]="rec.currentAction === 'HELD'">
                      
                      <header class="flex items-center justify-between mb-4">
                          <div class="flex items-center gap-2">
                              <span class="text-[10px] font-mono text-boreal-blue uppercase font-bold tracking-[0.2em]">
                                  {{ rec.currentAction === 'PENDING' ? 'Top Recommended COA' : 'Engagement Active' }}
                              </span>
                              @if (rec.currentAction !== 'PENDING') {
                                  <span class="px-1.5 py-0.5 bg-boreal-blue/20 text-boreal-blue text-[8px] font-black rounded-sm border border-boreal-blue/30">{{ rec.currentAction }}</span>
                              }
                          </div>
                          <span class="flex items-center gap-1">
                              <span class="w-1.5 h-1.5 rounded-full bg-boreal-green shadow-[0_0_8px_var(--boreal-green)]"></span>
                              <span class="text-[9px] text-boreal-green font-bold tracking-widest">{{ rec.confidence }}% CONF</span>
                          </span>
                      </header>
                      
                      <div class="mb-4">
                          <h3 class="text-xs font-black text-boreal-text-primary mb-2 uppercase tracking-tight">{{ rec.title }}</h3>
                          <div class="p-3 bg-boreal-canvas/40 border border-boreal-border rounded-sm relative overflow-hidden group/rationale">
                             <div class="absolute inset-y-0 left-0 w-0.5 bg-boreal-blue opacity-50"></div>
                             <span class="text-boreal-blue font-black uppercase text-[8px] block mb-2 tracking-widest">Decision Rationale</span>
                             <p class="text-[11px] text-boreal-text-secondary leading-relaxed italic">
                              {{ rec.rationale }}
                             </p>
                          </div>
                      </div>

                      <!-- Intent Distribution -->
                      <div class="mb-5 p-3 bg-boreal-panel-muted/20 border border-boreal-border rounded-sm">
                          <span class="text-[8px] font-black text-boreal-text-muted uppercase tracking-widest block mb-4">Intent Attribution (Live)</span>
                          <div class="space-y-3">
                              @for (item of rec.intentDist; track item.label) {
                                  <div class="flex items-center gap-3" [class.opacity-40]="item.label === 'DECOY'">
                                      <span class="text-[9px] text-boreal-text-muted w-16 font-mono font-bold uppercase tracking-tighter">{{ item.label }}</span>
                                      <div class="flex-grow h-1 bg-boreal-canvas rounded-full overflow-hidden border border-boreal-border">
                                          <div class="h-full bg-boreal-blue shadow-[0_0_8px_var(--boreal-blue)]" [style.width.%]="item.value"></div>
                                      </div>
                                      <span class="text-[9px] font-mono text-boreal-text-primary w-8 text-right font-bold">{{ item.value | number:'1.0-0' }}%</span>
                                  </div>
                              }
                          </div>
                      </div>

                      <div class="grid grid-cols-2 gap-4 mb-6 pt-4 border-t border-boreal-border">
                          <div class="flex flex-col gap-1">
                              <span class="text-[8px] text-boreal-text-muted uppercase font-bold tracking-widest">Base Node</span>
                              <span class="text-[11px] font-black text-boreal-text-primary uppercase tracking-tight">{{ rec.baseName }}</span>
                          </div>
                          <div class="flex flex-col gap-1">
                              <span class="text-[8px] text-boreal-text-muted uppercase font-bold tracking-widest">Effector</span>
                              <span class="text-[11px] font-black text-boreal-text-primary uppercase tracking-tight">{{ rec.effectorType }}</span>
                          </div>
                          <div class="flex flex-col gap-1">
                              <span class="text-[8px] text-boreal-text-muted uppercase font-bold tracking-widest">Readiness Drift</span>
                              <span class="text-[11px] font-mono font-black text-boreal-amber tracking-tighter">{{ rec.futureCost }}</span>
                          </div>
                          <div class="flex flex-col gap-1">
                              <span class="text-[8px] text-boreal-text-muted uppercase font-bold tracking-widest">Asymmetry</span>
                              <span class="text-[11px] font-mono font-black text-boreal-green tracking-tighter">1:{{ rec.asymmetry }}</span>
                          </div>
                      </div>

                      <!-- Authority badge — shows current mode above action buttons -->
                      <div class="flex items-center gap-2 mb-2">
                          <span class="text-[7px] text-boreal-text-muted uppercase tracking-widest">Authority:</span>
                          @let auth = policy.activePolicy()?.guardrails?.engagementAuthority ?? 'SEMI';
                          <span class="px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border"
                              [class.text-boreal-red]="auth === 'MANUAL'"
                              [class.border-boreal-red/40]="auth === 'MANUAL'"
                              [class.bg-boreal-red/10]="auth === 'MANUAL'"
                              [class.text-boreal-amber]="auth === 'SEMI'"
                              [class.border-boreal-amber/40]="auth === 'SEMI'"
                              [class.bg-boreal-amber/10]="auth === 'SEMI'"
                              [class.text-boreal-blue]="auth === 'AUTO'"
                              [class.border-boreal-blue/40]="auth === 'AUTO'"
                              [class.bg-boreal-blue/10]="auth === 'AUTO'"
                          >{{ auth === 'MANUAL' ? 'HITL' : auth === 'SEMI' ? 'HOTL' : 'HNLT' }} · {{ auth }}</span>
                      </div>

                      <div class="flex gap-2">
                          <button
                              (click)="acceptRecommendation()"
                              [disabled]="rec.currentAction !== 'PENDING'"
                              class="flex-grow py-3 bg-boreal-blue border border-boreal-blue shadow-lg shadow-boreal-blue/20 text-white rounded-sm text-[10px] font-black tracking-[0.2em] uppercase hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale"
                          >
                              {{ rec.currentAction === 'ACCEPTED' ? 'ENGAGEMENT_AUTHORIZED' : 'AUTHORIZE_INTERCEPT' }}
                          </button>
                          <button 
                              (click)="holdEngagement()"
                              [disabled]="rec.currentAction !== 'PENDING'"
                              class="px-4 py-2 bg-boreal-panel-elevated border border-boreal-border/40 rounded-sm hover:bg-boreal-panel-muted transition-colors text-boreal-text-secondary hover:text-boreal-text-primary disabled:opacity-30"
                              title="Hold Engagement"
                          >
                              <mat-icon class="!text-sm">pause</mat-icon>
                          </button>
                      </div>

                      <button 
                          (click)="orchestration.handoffToLab(tactical.selectedTrackId()!)"
                          class="w-full mt-3 py-2 bg-boreal-blue/5 border border-boreal-blue/20 rounded-sm text-boreal-blue text-[10px] font-bold uppercase tracking-widest hover:bg-boreal-blue/10 transition-all flex items-center justify-center gap-2"
                      >
                          <mat-icon class="!text-sm">science</mat-icon>
                          Run Sensitivity Analysis
                      </button>
                  </div>

                   <!-- Secondary Alternative (Expandable) -->
                  @if (alternativeCOA(); as alt) {
                      <div class="rounded-sm border border-boreal-border bg-boreal-canvas/40 transition-all overflow-hidden" [class.opacity-40]="!alternativeExpanded()">
                          <button 
                              (click)="alternativeExpanded.set(!alternativeExpanded())"
                              class="w-full p-4 flex items-center justify-between group text-left outline-none"
                          >
                              <div class="flex items-center gap-3">
                                  <span class="text-[9px] font-mono text-boreal-text-muted uppercase font-black tracking-widest">Alternative COA</span>
                                  @if (alternativeExpanded()) {
                                      <span class="px-1 bg-boreal-panel text-boreal-text-muted text-[7px] font-bold rounded uppercase">Detailed Tradeoff</span>
                                  }
                              </div>
                              <mat-icon class="!text-[12px] text-boreal-text-muted group-hover:text-boreal-text-primary transition-transform" [class.rotate-180]="alternativeExpanded()">
                                  expand_more
                              </mat-icon>
                          </button>
                          
                          @if (alternativeExpanded()) {
                              <div class="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                  <h3 class="text-[11px] font-black text-boreal-text-primary mb-1 uppercase tracking-tight">{{ alt.name }}</h3>
                                  <p class="text-[10px] text-boreal-text-secondary leading-relaxed italic mb-4">
                                      {{ alt.rationale }}
                                  </p>
                                  <div class="grid grid-cols-2 gap-4 text-[8px] border-t border-boreal-border pt-3">
                                      <div class="flex flex-col gap-0.5">
                                          <span class="text-boreal-text-muted font-bold uppercase">Confidence</span>
                                          <span class="text-boreal-green font-mono font-bold">{{ alt.projectedOutcome.confidence * 100 | number:'1.0-0' }}% P(S)</span>
                                      </div>
                                      <div class="flex flex-col gap-0.5">
                                          <span class="text-boreal-text-muted font-bold uppercase">Asymmetry</span>
                                          <span class="text-boreal-amber font-mono font-bold">Ratio 1:{{ alt.projectedOutcome.asymmetryRatio | number:'1.1-1' }}</span>
                                      </div>
                                  </div>
                              </div>
                          }
                      </div>
                  }

                  <!-- Strategic Engagement Controls -->
                  <div class="mt-4 pt-6 border-t border-boreal-border flex flex-col gap-3">
                      <button 
                          (click)="forceManualEngagement()"
                          [disabled]="rec.currentAction === 'MANUAL'"
                          class="w-full py-2.5 bg-boreal-red/5 text-boreal-red border border-boreal-red/20 rounded-sm text-[10px] font-black tracking-widest uppercase hover:bg-boreal-red/10 transition-all disabled:opacity-30"
                      >
                          {{ rec.currentAction === 'MANUAL' ? 'MANUAL_OVERRIDE_ACTIVE' : 'FORCE MANUAL OVERRIDE' }}
                      </button>
                      <button 
                          (click)="escalateToCommand()"
                          class="w-full py-2.5 bg-boreal-panel-elevated border border-boreal-border rounded-sm text-[10px] font-bold tracking-widest uppercase text-boreal-text-secondary hover:text-boreal-text-primary transition-colors"
                      >
                          {{ rec.currentAction === 'ESCALATED' ? 'ESCALATED_TO_HUB' : 'ESCALATE TO COMMAND' }}
                      </button>
                  </div>
              </div>
          } @else {
              <div class="h-full flex flex-col items-center justify-center p-10 text-center text-boreal-text-muted bg-boreal-canvas/10 rounded-sm border border-dashed border-boreal-border">
                  <mat-icon class="!text-4xl mb-6 !w-10 !h-10 opacity-10">radar</mat-icon>
                  <span class="text-[10px] font-bold uppercase tracking-[0.3em] opacity-30">Awaiting Track Selection</span>
                  <p class="text-[10px] mt-3 italic opacity-20 max-w-[180px] leading-relaxed">Select a track from the queue or map to view Twin-driven recommendations.</p>
              </div>
          }
      </div>
    </div>
  `,
  styles: [`
    .w-85 { width: 340px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TacticalRecommendationsComponent {
  tactical = inject(TacticalStore);
  policy = inject(PolicyStore);
  readiness = inject(ReadinessStore);
  orchestration = inject(OrchestrationStore);
  orchestrator = inject(CapabilityOrchestrator);
  sensorFeed = inject(SensorFeedStore);
  api = inject(SteelApiService);
  directiveQueue = inject(OperationalDirectiveQueueService);
  capabilityStore = inject(CapabilityLayerStore);

  alternativeExpanded = signal(false);
  _pendingConfirm = signal(false);

  alternativeCOA = computed(() => {
    const coas = this.policy.availableCOAs();
    const selectedId = this.policy.selectedCOAId();
    return coas.find((c: COATwin) => c.id !== selectedId) || null;
  });

  recommendation = computed(() => {
    const track = this.tactical.selectedTrack();
    const remappedTrack = this.capabilityStore.selectedTrack();
    const activePolicy = this.policy.activePolicy();
    const selectedCOA = this.policy.selectedCOA();
    const engagements = this.tactical.engagements();

    if (!track || !selectedCOA) return null;

    const currentAction = engagements[track.id];
    const assignment = selectedCOA.assignments.find(a => a.threatId === track.id);
    const base = assignment ? this.readiness.bases().find(b => b.id === assignment.baseId) : null;
    
    const readinessDelta = assignment && selectedCOA.projectedOutcome.readinessDeltaByBase[assignment.baseId] 
        ? selectedCOA.projectedOutcome.readinessDeltaByBase[assignment.baseId] 
        : -0.02;

    let focusText = 'Standard Intercept';
    if (activePolicy && activePolicy.weights.sustainability > 0.6) focusText = 'Sustainability-First Intercept';
    if (activePolicy && activePolicy.weights.safety > 0.8) focusText = 'Max-Protection Response';
    if (track.intent === 'FEINT') focusText = 'Conservation-Heavy Approach';

    const trackLabel = remappedTrack?.displayLabel ?? track.id;

    const dynamicRationale = track.intent === 'STRIKE' 
        ? `${trackLabel} presents a high-lethality strike profile. ${focusText} prioritizes ${base?.name || 'Northern Vanguard'} for immediate kinetic neutralization despite ${ (Math.abs(readinessDelta) * 100).toFixed(1) }% depletion.`
        : `${trackLabel} displays ${track.intent} characteristics. ${focusText} leverages ${base?.name || 'Theater Reserves'} to maintain coverage while preserving strategic effector depth.`;

    return {
        trackId: track.id,
        status: track.status,
        currentAction: (currentAction?.status || 'PENDING') as 'ACCEPTED' | 'MANUAL' | 'HELD' | 'ESCALATED' | 'PENDING',
        currentRationale: currentAction?.rationale || '',
        title: `${focusText} - ${base?.name || 'Optimal Node'}`,
        rationale: dynamicRationale,
        baseName: base?.name || 'Calculated Reserved Base',
        effectorType: assignment?.effectorType || 'Standard Kinetic',
        futureCost: (readinessDelta * 100).toFixed(1) + '%',
        asymmetry: selectedCOA.projectedOutcome.asymmetryRatio.toFixed(2),
        confidence: (selectedCOA.projectedOutcome.confidence * 100).toFixed(0),
        intentDist: [
            { label: track.intent, value: track.confidence * 100 },
            { label: 'DECOY', value: (1 - track.confidence) * 100 }
        ]
    };
  });

  acceptRecommendation() {
    const rec = this.recommendation();
    const authority = this.policy.activePolicy()?.guardrails?.engagementAuthority ?? 'SEMI';
    if (!rec) return;

    if (authority === 'MANUAL') {
        this._pendingConfirm.set(true);
        return;
    }
    this._doAcceptRecommendation(rec);
  }

  confirmManualEngagement() {
    this._pendingConfirm.set(false);
    const rec = this.recommendation();
    if (rec) this._doAcceptRecommendation(rec);
  }

  private _doAcceptRecommendation(rec: NonNullable<ReturnType<TacticalRecommendationsComponent['recommendation']>>) {
    const authority = this.policy.activePolicy()?.guardrails?.engagementAuthority ?? 'SEMI';
    const modeLabel = authority === 'AUTO' ? 'Auto-authorized (HNLT)' : 'Operator-authorized';
    const assignment = this.policy.selectedCOA()?.assignments.find(a => a.threatId === rec.trackId);
    const isOffline = this.sensorFeed.connectionStatus() === 'DISCONNECTED';
    
    this.tactical.updateEngagement(
        rec.trackId,
        'ACCEPTED',
        isOffline
          ? `${modeLabel}: ${rec.title}. Directive queued offline pending link restoration.`
          : `${modeLabel}: ${rec.title}. Optimal node: ${rec.baseName}.`,
        { deferLocalResolution: isOffline }
    );
    if (assignment) {
        if (isOffline) {
            this.directiveQueue.enqueueEngagement({
                trackId: rec.trackId,
                baseId: assignment.baseId,
                effectorType: assignment.effectorType,
                rationale: rec.rationale,
            });
        } else {
            this.api.engageTrack(rec.trackId, assignment.baseId, assignment.effectorType).subscribe({
                next: () => this.tactical.markEngaged(rec.trackId),
                error: (e) => console.error('[TacticalRecommendations]', e),
            });
        }
    }
  }

  holdEngagement() {
    const trackId = this.tactical.selectedTrackId();
    if (trackId) {
        this.tactical.updateEngagement(
            trackId, 
            'HELD', 
            'Intercept delayed for further multi-spectral intent analysis or clustering window optimization.'
        );
    }
  }

  forceManualEngagement() {
    const trackId = this.tactical.selectedTrackId();
    if (trackId) {
        this.tactical.updateEngagement(
            trackId, 
            'MANUAL', 
            'Operator enforced manual override. Bypassing AI-optimized COA and policy-weighted node selection.'
        );
    }
  }

  escalateToCommand() {
    const track = this.tactical.selectedTrack();
    const coa = this.policy.selectedCOA();
    
    if (track) {
        this.tactical.updateEngagement(
            track.id, 
            'ESCALATED', 
            'Track escalated to Air Defense Commander for strategic override. Operator reports tradeoff boundary violation.'
        );
    }

    this.orchestrator.showFeature({
        name: 'Command Escalation Flow',
        operationalFunction: `Escalates tactical track ${track?.id} to the Air Defense Commander / Orchestrator for high-level COA override or policy exception.`,
        persona: 'Tactical Operator / Stridsledare',
        decisionImproved: 'Engagement Authority & Strategic Reserve Allocation',
        inputs: `Selected Track: ${track?.id}, Assigned Base: ${coa?.assignments[0]?.baseId}, Confidence: ${track?.confidence}`,
        outputs: 'Commander Decision (Accept / Modify / Custom COA)',
        rationale: 'Certain tracks exceed tactical guardrails or present unique sustainability risks that require commander-level tradeoff balancing.',
        status: 'PARTIAL_FRONTEND',
        tier: 'MVP',
        nextStep: 'Implement Commander notification and shared track context signal.'
    });
  }
}
