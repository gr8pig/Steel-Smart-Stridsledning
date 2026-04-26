import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-decision-support-slide',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="slide slide-ai animate-in">
      <div class="slide-eyebrow">{{ eyebrow() }}</div>
      <h2 class="slide-title">{{ title() }}</h2>
      <p class="slide-sub">{{ subtitle() }}</p>
      
      <ng-content select="[data-strip]"></ng-content>
      <ng-content select="[coa-primer]"></ng-content>
      <ng-content select="[intent-card]"></ng-content>
      <ng-content select="[ai-grid]"></ng-content>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .slide-ai {
      overflow-y: auto;
    }
  `]
})
export class DecisionSupportSlideComponent {
  eyebrow = input.required<string>();
  title = input.required<string>();
  subtitle = input.required<string>();
}
