import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-lab-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <router-outlet></router-outlet>
  `,
  styles: [`
    :host { display: block; height: 100%; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LabRootComponent {}
