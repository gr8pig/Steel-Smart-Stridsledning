import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ShowcaseState } from '../showcase-data';

@Component({
  selector: 'app-welcome-slide',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="slide slide-welcome animate-in">
      <div class="slide-welcome-inner">
        <div class="slide-eyebrow">{{ state.slides[0].eyebrow }}</div>
        <h1 class="slide-hero-title">{{ state.slides[0].title }}</h1>
        <p class="slide-hero-sub">{{ state.slides[0].subtitle }}</p>

        <div class="welcome-chips">
          <div class="w-chip"><span class="w-chip-dot blue"></span>Sensorfusion måste bli RAP, inte bara en vy</div>
          <div class="w-chip"><span class="w-chip-dot green"></span>Resursallokering måste ta nästa våg i beräkning</div>
          <div class="w-chip"><span class="w-chip-dot purple"></span>Uthållighet måste skyddas när hoten eskalerar</div>
        </div>

        <div class="welcome-stack">
          <div class="stack-row">
            <span class="stack-label">Användare</span>
            <span class="stack-value">Luftbevakare, flygstridsledare och command authority</span>
          </div>
          <div class="stack-row">
            <span class="stack-label">Problem</span>
            <span class="stack-value">Fatta rätt beslut under sekundnivå-friktion och osäkerhet</span>
          </div>
          <div class="stack-row">
            <span class="stack-label">Metod</span>
            <span class="stack-value">Policy, robusthet och ontologi i ett delat theater state</span>
          </div>
          <div class="stack-row">
            <span class="stack-label">Mål</span>
            <span class="stack-value">Nästa våg ska fortfarande kunna mötas med styrka kvar</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .welcome-chips { display: flex; flex-wrap: wrap; gap: 10px; }
    .w-chip {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 6px 14px; border-radius: 999px;
      border: 1px solid var(--s-border); background: rgba(255,255,255,0.03);
      font-size: 12px; color: var(--s-text);
    }
    .w-chip-dot { width: 7px; height: 7px; border-radius: 50%; }
    .w-chip-dot.blue { background: var(--s-blue); box-shadow: 0 0 8px var(--s-blue); }
    .w-chip-dot.green { background: var(--s-green); box-shadow: 0 0 8px var(--s-green); }
    .w-chip-dot.purple { background: var(--s-purple); box-shadow: 0 0 8px var(--s-purple); }
    .w-chip-dot.amber { background: var(--s-amber); box-shadow: 0 0 8px var(--s-amber); }
    .welcome-stack { display: flex; flex-direction: column; gap: 1px; border: 1px solid var(--s-border); border-radius: 8px; overflow: hidden; }
  `],
})
export class WelcomeSlide {
  readonly state = inject(ShowcaseState);
}
