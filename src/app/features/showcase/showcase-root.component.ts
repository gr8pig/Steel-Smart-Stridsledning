import { Component, ChangeDetectionStrategy, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterOutlet } from "@angular/router";

@Component({
  selector: "app-showcase-root",
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="showcase-shell">
      <header class="showcase-header">
        <h1>Showcase</h1>
      </header>
      <main class="showcase-main">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .showcase-shell { display: flex; flex-direction: column; height: 100vh; }
  `]
})
export class ShowcaseRootComponent {
  currentSlide = signal(0);
}

