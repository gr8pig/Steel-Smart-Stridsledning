import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { PolicyStore } from '../../core/state/policy.store';
import { AuditLogger } from '../../core/services/audit-logger';
import { Injectable } from '@angular/core';
import { RouterLink } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class RationaleOrchestrator {
  private _isOpen = signal(false);
  isOpen = this._isOpen.asReadonly();

  open() { this._isOpen.set(true); }
  close() { this._isOpen.set(false); }
  toggle() { this._isOpen.update(v => !v); }
}

@Component({
  selector: 'app-rationale-drawer',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink],
  template: `
    <div 
      class="fixed font-sans inset-y-0 right-0 w-96 z-40 bg-boreal-panel border-l border-boreal-border shadow-2xl transition-transform duration-300 transform"
      [class.translate-x-0]="orchestrator.isOpen()"
      [class.translate-x-full]="!orchestrator.isOpen()"
    >
      <div class="flex flex-col h-full overflow-hidden">
        <header class="panel-header flex items-center justify-between p-4 border-b border-boreal-border shrink-0 bg-boreal-panel-muted/20">
          <div class="flex items-center gap-2">
            <mat-icon class="text-boreal-blue !text-base">gavel</mat-icon>
            <span class="text-[10px] uppercase tracking-[0.2em] font-black text-boreal-text-primary">Rationale & Governance</span>
          </div>
          <button (click)="orchestrator.close()" class="p-2 hover:bg-boreal-blue/10 rounded transition-colors group">
            <mat-icon class="text-boreal-text-muted group-hover:text-boreal-blue">close</mat-icon>
          </button>
        </header>

        <div class="flex-grow overflow-y-auto p-6 space-y-8 bg-boreal-panel">
            <!-- Confidence & Uncertainty -->
            <section>
                <header class="flex justify-between items-center mb-4">
                    <span class="text-[9px] uppercase tracking-widest font-black text-boreal-text-muted">Uncertainty Drivers</span>
                    <span class="text-[8px] bg-boreal-amber/10 text-boreal-amber px-2 py-0.5 rounded-sm border border-boreal-amber/30 font-black uppercase tracking-widest">
                        {{ vm().confidence > 80 ? 'HIGH' : 'MEDIUM' }} CONFIDENCE
                    </span>
                </header>
                <div class="space-y-3">
                    @for (driver of vm().uncertaintyDrivers; track driver.label) {
                        <div class="flex justify-between items-center text-[10px]">
                            <span class="text-boreal-text-secondary font-medium tracking-tight">{{ driver.label }}</span>
                            <span class="text-boreal-text-primary font-mono font-bold">{{ driver.value }}%</span>
                        </div>
                    }
                </div>
            </section>

            <!-- Binding Constraints -->
            <section>
               <span class="text-[9px] uppercase tracking-widest font-black text-boreal-text-muted mb-4 block">Active Guardrails</span>
               <div class="space-y-4">
                  @if (policy.activePolicy(); as p) {
                    <div class="flex items-start gap-3 p-3 rounded-sm bg-boreal-panel-elevated border border-boreal-border">
                        <mat-icon class="text-boreal-green !text-sm mt-0.5">check_circle</mat-icon>
                        <div class="flex flex-col gap-0.5">
                            <span class="text-[11px] font-bold text-boreal-text-primary">Civilian Asset Shielding</span>
                            <span class="text-[10px] text-boreal-text-muted font-medium">Constraint: Primary. Non-violable.</span>
                        </div>
                    </div>
                    <div class="flex items-start gap-3 p-3 rounded-sm bg-boreal-panel-elevated border border-boreal-border">
                        <mat-icon class="text-boreal-amber !text-sm mt-0.5">shield</mat-icon>
                        <div class="flex flex-col gap-0.5">
                            <span class="text-[11px] font-bold text-boreal-text-primary">Strategic Reserve Floor</span>
                            <span class="text-[10px] text-boreal-text-muted font-medium">Floor: {{p.guardrails.reserveInterceptorFloor}} units. Reached at 18:00.</span>
                        </div>
                    </div>
                  }
               </div>
            </section>

            <!-- Audit History Snapshot -->
            <section>
                <span class="text-[9px] uppercase tracking-widest font-black text-boreal-text-muted mb-4 block">Recent Authority Audit</span>
                <div class="space-y-3 pt-2">
                    @for (log of vm().recentLogs; track log.id) {
                        <div class="text-[10px] border-l-2 border-boreal-border pl-4 py-1.5 hover:bg-boreal-panel-muted/30 transition-colors rounded-r-sm group">
                            <span class="text-boreal-blue font-mono font-bold block text-[8px] mb-1 opacity-70 group-hover:opacity-100 transition-opacity">{{ log.time }}</span>
                            <span class="text-boreal-text-primary font-medium tracking-tight leading-relaxed">{{ log.action }}</span>
                        </div>
                    } @empty {
                        <span class="text-[10px] italic text-boreal-text-muted">No recent logs.</span>
                    }
                </div>
            </section>
        </div>

        <footer class="p-4 border-t border-boreal-border bg-boreal-panel-muted/40 shrink-0">
           <button routerLink="/governance" (click)="orchestrator.close()" class="w-full py-2.5 bg-boreal-blue text-white rounded-sm text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-boreal-blue/20 hover:brightness-110 transition-all active:scale-95">
               FULL GOVERNANCE VIEW
           </button>
        </footer>
      </div>
    </div>

    <!-- Backdrop when open -->
    @if (orchestrator.isOpen()) {
      <div 
          class="fixed inset-0 z-30 bg-boreal-canvas/50 backdrop-blur-[1px]"
          (click)="orchestrator.close()"
          (keydown.escape)="orchestrator.close()"
          tabindex="0"
          role="button"
          aria-label="Close rationale drawer backdrop"
      ></div>
    }
  `,
  styles: [`
    :host { display: block; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RationaleDrawer {
    orchestrator = inject(RationaleOrchestrator);
    policy = inject(PolicyStore);
    audit = inject(AuditLogger);

    vm = computed(() => {
        const logs = this.audit.logs();
        const selectedCOA = this.policy.selectedCOA();
        const activePolicy = this.policy.activePolicy();

        // Dynamically compute uncertainty drivers based on policy weights for high-fidelity feel
        const w = activePolicy?.weights || { safety: 0.5, sustainability: 0.5 };
        
        return {
            confidence: selectedCOA ? selectedCOA.projectedOutcome.confidence * 100 : 85,
            uncertaintyDrivers: [
                { label: 'Sensor Noise', value: Math.floor(10 + w.safety * 10) },
                { label: 'Path Degradiation', value: Math.floor(15 + w.sustainability * 15) },
                { label: 'Policy Jitter', value: Math.floor(activePolicy ? 5 : 25) }
            ],
            recentLogs: logs.slice(0, 5)
        };
    });
}
