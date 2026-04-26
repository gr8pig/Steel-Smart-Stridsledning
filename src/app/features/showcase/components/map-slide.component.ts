import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-map-slide',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="slide slide-map animate-in">
      <div class="slide-split">
        <div class="slide-left-panel">
          <div class="slide-eyebrow">{{ eyebrow() }}</div>
          <h2 class="slide-title">{{ title() }}</h2>
          <p class="slide-sub">{{ subtitle() }}</p>
          
          <ng-content select="[scenario-info]"></ng-content>
          <ng-content select="[recommendation-info]"></ng-content>
          <ng-content select="[map-controls]"></ng-content>
          <ng-content select="[track-details]"></ng-content>
        </div>
        
        <div class="map-container">
          <ng-content select="[map-svg]"></ng-content>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .slide-map .slide-split {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 16px;
      align-items: start;
    }
    .slide-left-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow-y: auto;
      height: 100%;
    }
    .map-container {
      position: relative;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--s-border);
      background: rgba(3, 7, 12, 0.8);
      min-height: 700px;
    }
  `]
})
export class MapSlideComponent {
  eyebrow = input.required<string>();
  title = input.required<string>();
  subtitle = input.required<string>();
}
