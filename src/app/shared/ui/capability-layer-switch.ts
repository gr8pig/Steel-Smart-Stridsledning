import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CapabilityLayerStore } from '../../core/state/capability-layer.store';
import { CapabilityLayerMode } from '../../shared/domain/public-capability';

@Component({
  selector: 'app-capability-layer-switch',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="flex items-center bg-boreal-panel-elevated border border-boreal-border p-0.5 rounded shadow-inner">
      <button 
        (click)="setMode('SYNTHETIC')"
        [class]="getBtnClass(capabilityStore.mode() === 'SYNTHETIC')"
        title="Synthetic Mode (Default)"
      >
        <mat-icon class="!text-[10px] !w-2.5 !h-2.5">memory</mat-icon>
        <span class="text-[8px] font-black uppercase tracking-tighter">SYNTH</span>
      </button>

      <div class="w-[1px] h-3 bg-boreal-border mx-0.5"></div>

      <button 
        (click)="setMode('SWEDEN_SAAB_PUBLIC')"
        [class]="getBtnClass(capabilityStore.mode() === 'SWEDEN_SAAB_PUBLIC')"
        title="Swedish/Saab Public Domain Mapping"
      >
        <mat-icon class="!text-[10px] !w-2.5 !h-2.5">public</mat-icon>
        <span class="text-[8px] font-black uppercase tracking-tighter">SWE</span>
      </button>

      <button 
        (click)="setMode('NATO_PUBLIC')"
        [class]="getBtnClass(capabilityStore.mode() === 'NATO_PUBLIC')"
        title="NATO Public Domain Mapping"
      >
        <span class="text-[8px] font-black uppercase tracking-tighter">NATO</span>
      </button>

      <div class="w-[1px] h-3 bg-boreal-border mx-0.5"></div>

      <button 
        (click)="setMode('RUSSIA_ARCHETYPE')"
        [class]="getBtnClass(capabilityStore.mode() === 'RUSSIA_ARCHETYPE')"
        title="Russia Archetype Domain Mapping"
      >
        <span class="text-[8px] font-black uppercase tracking-tighter">RUS</span>
      </button>

      <button 
        (click)="setMode('CHINA_ARCHETYPE')"
        [class]="getBtnClass(capabilityStore.mode() === 'CHINA_ARCHETYPE')"
        title="China Archetype Domain Mapping"
      >
        <span class="text-[8px] font-black uppercase tracking-tighter">CHN</span>
      </button>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CapabilityLayerSwitch {
  capabilityStore = inject(CapabilityLayerStore);

  setMode(mode: CapabilityLayerMode) {
    this.capabilityStore.setMode(mode);
  }

  getBtnClass(isActive: boolean): string {
    const base = "flex items-center gap-1.5 px-2 py-1 transition-all rounded-[1px] focus:outline-none ";
    return isActive 
      ? base + "bg-boreal-blue text-white shadow-sm" 
      : base + "text-boreal-text-muted hover:text-boreal-text-primary hover:bg-white/5";
  }
}
