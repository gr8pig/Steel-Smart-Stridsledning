import { Component, Input, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-robustness-slide",
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="slide-content">
      <h2>{{ title }}</h2>
      <p>{{ subtitle }}</p>
      <ul>
        @for (item of content; track item) {
          <li>{{ item }}</li>
        }
      </ul>
    </div>
  `
})
export class RobustnessSlideComponent {
  @Input() title: string = "";
  @Input() subtitle: string = "";
  @Input() content: string[] = [];
}
