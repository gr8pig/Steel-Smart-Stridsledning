import { Component, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterOutlet } from "@angular/router";

/**
 * C2RootComponent
 * 
 * Main shell component for the Command & Control (C2) feature domain.
 * Provides the routing entry point for all C2-related views.
 */
@Component({
  selector: "app-c2-root",
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="c2-container">
      <header class="c2-header">
        <h1>Command & Control Orchestrator</h1>
      </header>
      
      <main class="c2-main">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .c2-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      background: #0a0a0c;
      color: #e0e0e0;
    }
    .c2-header {
      padding: 1rem 2rem;
      border-bottom: 1px solid #2a2a2c;
      background: #141416;
    }
    .c2-header h1 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 500;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #00e5ff;
    }
    .c2-main {
      flex: 1;
      overflow: auto;
    }
  `]
})
export class C2RootComponent {}
