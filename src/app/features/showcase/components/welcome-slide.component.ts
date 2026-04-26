import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShowcaseSlide } from '../showcase-data';

@Component({
  selector: 'app-welcome-slide',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="slide slide-welcome animate-in">
      <div class="slide-welcome-inner">
        <div class="slide-eyebrow">{{ config.eyebrow }}</div>
        <h1 class="slide-hero-title">{{ config.title }}</h1>
        <p class="slide-hero-sub">{{ config.subtitle }}</p>

        <div class="welcome-chips">
          <div class="w-chip">
            <span class="w-chip-dot blue"></span>Sensorfusion måste bli RAP, inte bara en vy
          </div>
          <div class="w-chip">
            <span class="w-chip-dot green"></span>Resursallokering måste ta nästa våg i beräkning
          </div>
          <div class="w-chip">
            <span class="w-chip-dot purple"></span>Uthållighet måste skyddas när hoten eskalerar
          </div>
        </div>

        <div class="welcome-stack">
          <div class="stack-row">
            <span class="stack-label">Personas</span>
            <span class="stack-value">Tactical Operator, Air Defense Commander, Base Readiness Officer, Intelligence & Analysis Officer</span>
          </div>
          <div class="stack-row">
            <span class="stack-label">Problem</span>
            <span class="stack-value">Mättnadsattack, begränsade verkansresurser, bevara framtida handlingsfrihet</span>
          </div>
          <div class="stack-row">
            <span class="stack-label">Metod</span>
            <span class="stack-value">Multi-objective Pareto-optimering, Digital Twins för readiness/logistik, Robustness Lab</span>
          </div>
          <div class="stack-row">
            <span class="stack-label">Mål</span>
            <span class="stack-value">Gå från "map-centric" nouns till "decision-centric" verbs</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .slide-welcome { display: flex; align-items: center; justify-content: center; height: 100%; }
    .slide-welcome-inner { max-width: 800px; padding: 2rem; }
    .slide-eyebrow { color: var(--s-muted); text-transform: uppercase; letter-spacing: 0.15em; font-size: 0.8rem; margin-bottom: 0.5rem; }
    .slide-hero-title { font-size: 4rem; font-weight: 900; margin-bottom: 1rem; color: var(--s-text); }
    .slide-hero-sub { font-size: 1.5rem; color: var(--s-text); margin-bottom: 2rem; opacity: 0.8; }
    .welcome-chips { display: grid; gap: 1rem; margin-bottom: 2rem; }
    .w-chip { display: flex; align-items: center; gap: 0.5rem; background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; }
    .w-chip-dot { width: 8px; height: 8px; border-radius: 50%; }
    .w-chip-dot.blue { background: #5ca7ff; }
    .w-chip-dot.green { background: #7ce0be; }
    .w-chip-dot.purple { background: #9b8cff; }
    .welcome-stack { display: grid; gap: 0.5rem; }
    .stack-row { display: grid; grid-template-columns: 120px 1fr; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem; }
    .stack-label { color: var(--s-muted); font-size: 0.8rem; }
    .stack-value { font-size: 0.9rem; }
  `]
})
export class WelcomeSlideComponent {
  @Input({ required: true }) config!: ShowcaseSlide;
}
