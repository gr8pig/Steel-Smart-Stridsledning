import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CapabilityLayerStore } from '../../core/state/capability-layer.store';

@Component({
  selector: 'app-safety-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (capabilityStore.isPublic()) {
      <div class="pointer-events-none absolute top-0 left-0 right-0 z-[100] h-6 bg-boreal-amber/90 backdrop-blur-md flex items-center justify-center border-b border-boreal-amber/40 shadow-lg">
        <span class="text-[9px] font-black text-black uppercase tracking-[0.25em] animate-pulse">
          PUBLIC-SOURCE MAPPING · NO LIVE LOCATIONS · NO READINESS CLAIMS · NOT OPERATIONAL DATA
        </span>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SafetyBanner {
  capabilityStore = inject(CapabilityLayerStore);
}
