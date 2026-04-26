import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CapabilityLayerStore } from '../../../core/state/capability-layer.store';
import { OrchestrationStore } from '../../../core/state/orchestration.store';
import { PublicCapabilityCard } from '../../../shared/domain/public-capability';

@Component({
  selector: 'app-commander-header-panel',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <section class="design-card commander-header-shell overflow-hidden !p-0">
      <div class="panel-header flex-wrap gap-3">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-boreal-blue shadow-[0_0_12px_var(--boreal-blue)]"></span>
          <span>Commander Orchestrator</span>
        </div>
        <div class="flex items-center gap-2 text-[8px] text-boreal-text-muted tracking-[0.2em]">
          <span>Policy-driven COA tradeoff analysis</span>
          <span class="text-boreal-border">•</span>
          <span>Intent publication</span>
        </div>
      </div>

      <div class="grid gap-4 p-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)]">
        <div class="space-y-4">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="space-y-2">
              <div class="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.25em] text-boreal-text-muted">
                <span class="text-boreal-blue">Command Surface</span>
                <span class="text-boreal-border">/</span>
                <span>Policy Stack</span>
              </div>
              <div class="flex flex-wrap items-center gap-3 min-w-0">
                <h1 class="text-balance text-3xl lg:text-[2.6rem] font-light uppercase tracking-[0.18em] text-boreal-text-primary">
                  Commander Orchestrator
                </h1>
                <span class="px-2 py-1 bg-boreal-blue/10 border border-boreal-blue/25 text-boreal-blue text-[8px] font-black uppercase tracking-widest rounded-sm">
                  {{ statusLabel() }}
                </span>
              </div>
              <p class="max-w-3xl text-balance text-[11px] leading-relaxed text-boreal-text-secondary italic">
                Break the decision path into readable layers: a readiness outlook, a policy steering lane, a Pareto frontier, and the final intent publish surface.
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <div class="min-w-[160px] rounded-sm border border-boreal-border bg-boreal-panel-muted/30 px-4 py-3">
                <div class="text-[8px] font-black uppercase tracking-widest text-boreal-text-muted">Remapping Mode</div>
                <div class="mt-1 flex items-center gap-2">
                  @if (capabilityStore.mode() !== 'SYNTHETIC') {
                    <span class="w-1.5 h-1.5 rounded-full bg-boreal-amber animate-pulse"></span>
                  } @else {
                    <span class="w-1.5 h-1.5 rounded-full bg-boreal-blue"></span>
                  }
                  <span class="max-w-[12rem] truncate text-sm font-bold uppercase tracking-widest text-boreal-text-primary">
                    {{ capabilityStore.mode() | lowercase }}
                  </span>
                </div>
              </div>

              <div class="min-w-[170px] rounded-sm border border-boreal-border bg-boreal-panel-muted/30 px-4 py-3">
                <div class="text-[8px] font-black uppercase tracking-widest text-boreal-text-muted">Decision Status</div>
                <div class="mt-1 flex items-center gap-2">
                  <span class="w-1.5 h-1.5 rounded-full" [class.bg-boreal-green]="orchestration.publishedIntent()" [class.bg-boreal-amber]="!orchestration.publishedIntent()"></span>
                  <span class="max-w-[12rem] truncate text-sm font-bold uppercase tracking-widest" [class.text-boreal-green]="orchestration.publishedIntent()" [class.text-boreal-amber]="!orchestration.publishedIntent()">
                    {{ orchestration.publishedIntent() ? 'Intent Published' : 'Awaiting Authorization' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-sm border border-boreal-border bg-boreal-canvas/70 p-3">
              <span class="text-[8px] uppercase tracking-widest text-boreal-text-muted font-black block">Layer Health</span>
              <span class="mt-1 block text-[12px] font-mono font-bold text-boreal-green">Healthy</span>
              <p class="mt-1 text-[9px] text-boreal-text-muted">Synthetic provenance with public remapping available on demand.</p>
            </div>
            <div class="rounded-sm border border-boreal-border bg-boreal-canvas/70 p-3">
              <span class="text-[8px] uppercase tracking-widest text-boreal-text-muted font-black block">Active Archetypes</span>
              <span class="mt-1 block text-[12px] font-mono font-bold text-boreal-text-primary">{{ activeArchetypes().length }}</span>
              <p class="mt-1 text-[9px] text-boreal-text-muted">Public capability cards currently matched to theater tracks.</p>
            </div>
            <div class="rounded-sm border border-boreal-border bg-boreal-canvas/70 p-3">
              <span class="text-[8px] uppercase tracking-widest text-boreal-text-muted font-black block">Authorization</span>
              <span class="mt-1 block text-[12px] font-mono font-bold text-boreal-text-primary">{{ orchestration.publishedIntent() ? 'Committed' : 'Pending' }}</span>
              <p class="mt-1 text-[9px] text-boreal-text-muted">Intent propagation state for downstream tactical surfaces.</p>
            </div>
          </div>
        </div>

        <div class="rounded-sm border border-boreal-border bg-boreal-panel-muted/20 p-4">
          <div class="flex items-center justify-between gap-3">
            <div class="text-[8px] font-black uppercase tracking-widest text-boreal-text-muted">Active Archetypes</div>
            <mat-icon class="!text-[12px] text-boreal-blue">hub</mat-icon>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            @for (card of activeArchetypes(); track card.id) {
              <span class="inline-flex items-center gap-1 rounded-sm border border-boreal-border bg-boreal-canvas/70 px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-boreal-text-secondary">
                <span class="w-1.5 h-1.5 rounded-full" [class.bg-boreal-blue]="card.side === 'BLUE'" [class.bg-boreal-amber]="card.side === 'NEUTRAL'" [class.bg-boreal-red]="card.side === 'RED'"></span>
                {{ card.displayName }}
              </span>
            } @empty {
              <div class="rounded-sm border border-dashed border-boreal-border bg-boreal-canvas/50 px-3 py-2 text-[9px] italic text-boreal-text-muted">
                No public archetypes are active while the synthetic layer is selected.
              </div>
            }
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .commander-header-shell {
      box-shadow: 0 16px 50px rgba(0, 0, 0, 0.28);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommanderHeaderPanel {
  capabilityStore = inject(CapabilityLayerStore);
  orchestration = inject(OrchestrationStore);

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

  statusLabel = computed(() => this.orchestration.publishedIntent() ? 'Intent Published' : 'Awaiting Authorization');
}
