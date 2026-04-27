import { Component, inject, ChangeDetectionStrategy, computed, ElementRef, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ScenarioStore } from '../../core/state/scenario.store';

@Component({
  selector: 'app-scenario-selector',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="relative" #container>
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-sm border border-boreal-border bg-boreal-panel-muted px-2.5 py-1 transition-colors hover:border-boreal-blue/40 hover:bg-boreal-panel-elevated focus:outline-none focus-visible:ring-1 focus-visible:ring-boreal-blue"
        [class.cursor-wait]="scenario.loading()"
        [attr.aria-label]="'Select scenario: ' + scenario.scenarioName()"
        [attr.aria-expanded]="open"
        (click)="toggleDropdown()"
        (keydown.enter)="toggleDropdown()"
        (keydown.space)="toggleDropdown(); $event.preventDefault()"
      >
        <mat-icon class="!text-sm text-boreal-blue">map</mat-icon>
        <span class="truncate text-[11px] font-bold uppercase tracking-tight text-boreal-text-primary max-w-[140px]">{{scenario.scenarioName()}}</span>
        <mat-icon class="!text-xs text-boreal-text-muted">{{open ? 'expand_less' : 'expand_more'}}</mat-icon>
      </button>

      @if (open) {
        <div
          class="absolute left-0 top-full z-50 mt-1 min-w-[260px] rounded border border-boreal-border bg-boreal-canvas shadow-xl"
          role="listbox"
          tabindex="-1"
          (click)="$event.stopPropagation()"
          (keydown.escape)="open = false"
        >
          <div class="border-b border-boreal-border px-3 py-1.5">
            <span class="text-[8px] font-mono font-black text-boreal-text-muted uppercase tracking-[0.2em]">Pre-Built Scenarios</span>
          </div>
          @for (s of prebuiltScenarios; track s.id) {
            <button
              type="button"
              class="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-boreal-panel-elevated focus:outline-none focus-visible:ring-1 focus-visible:ring-boreal-blue"
              [class.bg-boreal-blue/10]="scenario.scenarioName() === s.name"
              (click)="selectScenario(s.id)"
            >
              <mat-icon class="!text-sm mt-0.5" [class.text-boreal-blue]="scenario.scenarioName() === s.name" [class.text-boreal-text-muted]="scenario.scenarioName() !== s.name">
                {{scenario.scenarioName() === s.name ? 'radio_button_checked' : 'radio_button_unchecked'}}
              </mat-icon>
              <div class="flex flex-col">
                <span class="text-[11px] font-bold uppercase tracking-tight text-boreal-text-primary">{{s.name}}</span>
                <span class="text-[9px] text-boreal-text-muted leading-tight">{{s.description}}</span>
              </div>
            </button>
          }

          @if (drawingBoardScenarios().length > 0) {
            <div class="border-b border-t border-boreal-border px-3 py-1.5">
              <span class="text-[8px] font-mono font-black text-boreal-text-muted uppercase tracking-[0.2em]">Drawing Board</span>
            </div>
            @for (s of drawingBoardScenarios(); track s.id) {
              <button
                type="button"
                class="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-boreal-panel-elevated focus:outline-none focus-visible:ring-1 focus-visible:ring-boreal-blue"
                [class.bg-boreal-blue/10]="scenario.scenarioName() === s.name"
                (click)="selectScenario(s.id)"
              >
                <mat-icon class="!text-sm mt-0.5" [class.text-boreal-blue]="scenario.scenarioName() === s.name" [class.text-boreal-text-muted]="scenario.scenarioName() !== s.name">
                  {{scenario.scenarioName() === s.name ? 'radio_button_checked' : 'radio_button_unchecked'}}
                </mat-icon>
                <div class="flex flex-col">
                  <span class="text-[11px] font-bold uppercase tracking-tight text-boreal-text-primary">{{s.name}}</span>
                  <span class="text-[9px] text-boreal-text-muted leading-tight">{{s.description}}</span>
                </div>
              </button>
            }
          }

          @if (scenario.loading()) {
            <div class="flex items-center justify-center gap-2 px-3 py-2">
              <span class="text-[9px] text-boreal-text-muted animate-pulse">Loading scenario...</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScenarioSelector implements OnDestroy {
  private el = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);
  scenario = inject(ScenarioStore);
  open = false;

  private onOutsideClick = (event: Event) => {
    if (this.open && !this.el.nativeElement.contains(event.target)) {
      this.open = false;
    }
  };

  prebuiltScenarios = [
    { id: 'boreal-sentinel-i', name: 'Boreal Sentinel I', description: '3 initial threats, standard policy weights' },
    { id: 'boreal-strike', name: 'Boreal Strike', description: '5 kinetic missiles targeting Highridge Command' },
    { id: 'ghost-feint', name: 'Ghost Feint', description: '10 aircraft with probe/feint intent across bases' },
  ];

  drawingBoardScenarios = computed(() =>
    this.scenario.scenarios().filter(s => s.source === 'drawing-board')
  );

  constructor() {
    this.scenario.loadScenarios();
    if (isPlatformBrowser(this.platformId)) {
      document.addEventListener('click', this.onOutsideClick);
    }
  }

  toggleDropdown() {
    this.open = !this.open;
  }

  selectScenario(id: string) {
    this.open = false;
    this.scenario.selectScenario(id);
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      document.removeEventListener('click', this.onOutsideClick);
    }
  }
}
