import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShowcaseState } from '../showcase-data';

@Component({
  selector: 'app-map-slide',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="slide slide-map animate-in">
      <div class="slide-split">
        <div class="slide-left-panel">
          <div class="slide-eyebrow">{{ state.slides[1].eyebrow }}</div>
          <h2 class="slide-title">{{ state.slides[1].title }}</h2>
          <p class="slide-sub">{{ state.slides[1].subtitle }}</p>

          <div class="scenario-story">
            <div class="scenario-story-kicker">{{ state.currentScenarioStory().lead }}</div>
            <div class="scenario-story-detail">{{ state.currentScenarioStory().detail }}</div>
            <div class="scenario-story-decision">Beslutspunkt: {{ state.currentScenarioStory().decision }}</div>
          </div>

          <div class="recommendation-panel">
            <div class="recommendation-panel-head">
              <span class="recommendation-panel-kicker">Rekommendation</span>
              <span class="recommendation-panel-meta">{{ state.currentRecommendation().title }}</span>
            </div>
            <div class="recommendation-panel-current">
              <div class="recommendation-panel-decision">{{ state.currentRecommendation().decision }}</div>
              <div class="recommendation-panel-impact">{{ state.currentRecommendation().impact }}</div>
            </div>
          </div>

          <div class="board-features">
            @for (step of state.operatorSteps; track step.id) {
              <div class="board-feat">
                <div class="feat-icon">{{ step.tag }}</div>
                <div class="feat-text">
                  <div class="feat-title">{{ step.title }}</div>
                  <div class="feat-sub">{{ step.body }}</div>
                </div>
              </div>
            }
          </div>

          <div class="scenario-tabs">
            @for (s of state.scenarioLabels; track $index) {
              <button class="s-tab" [class.active]="state.mapScenario() === $index" (click)="state.selectScenario($index)">
                <span class="s-tab-num">{{ $index + 1 }}</span>
                <span class="s-tab-label">{{ s }}</span>
              </button>
            }
          </div>

          <div class="recommendation-panel">
            <div class="recommendation-panel-head">
              <span class="recommendation-panel-kicker">Rekommendationer</span>
              <span class="recommendation-panel-meta">{{ state.currentRecommendation().title }}</span>
            </div>
            <div class="recommendation-panel-current">
              <div class="recommendation-panel-decision">{{ state.currentRecommendation().decision }}</div>
              <div class="recommendation-panel-impact">{{ state.currentRecommendation().impact }}</div>
            </div>
            <div class="recommendation-tabs">
              @for (rec of state.scenarioRecommendations; track rec.id; let i = $index) {
                <button class="recommendation-card" [class.recommendation-card-active]="state.recommendationIndex() === i" (click)="state.selectRecommendation(i)">
                  <div class="recommendation-card-top">
                    <span class="recommendation-card-index">0{{ i + 1 }}</span>
                    <span class="recommendation-card-flag">{{ rec.scenarioIndex === 2 ? 'Logistics' : rec.scenarioIndex === 1 ? 'Intercept' : 'Attack' }}</span>
                  </div>
                  <div class="recommendation-card-title">{{ rec.title }}</div>
                  <div class="recommendation-card-summary">{{ rec.summary }}</div>
                </button>
              }
            </div>
          </div>

          <div class="map-legend">
            <div class="legend-row"><span class="legend-dot blue"></span> Egna styrkor och egna baser</div>
            <div class="legend-row"><span class="legend-dot red"></span> Hotsignatur och inkommande tryck</div>
            <div class="legend-row"><span class="legend-dot amber"></span> Sensor- och intressezoner</div>
            <div class="legend-row"><span class="legend-dot white"></span> Lägesbilden som ska bli RAP</div>
          </div>

          <div class="map-stats">
            <div class="stat"><span class="stat-v">{{ state.animatedTracks().length }}</span><span class="stat-l">Spår i den aktuella vågen</span></div>
            <div class="stat">
              <span class="stat-v" [class.stat-g]="!state.intercepting()" [class.stat-r]="state.intercepting()">{{ state.intercepting() ? 'HOLD' : '0.81' }}</span>
              <span class="stat-l">{{ state.intercepting() ? 'Skyddad beredskap' : 'Beslutssäkerhet' }}</span>
            </div>
            <div class="stat"><span class="stat-v stat-a">127ms</span><span class="stat-l">Svarstid till operatören</span></div>
          </div>
          <div class="map-phase-bar">
            <div class="map-phase-label" [class.phase-intercept]="state.intercepting()">
              {{ state.intercepting() ? '⬡ RESERV SKYDDAS' : '→ RAP BYGGS' }}
            </div>
            <div class="phase-bar-track">
              <div class="phase-bar-fill" [style.width]="(state.trackProgress() * 100) + '%'" [class.phase-fill-intercept]="state.intercepting()"></div>
            </div>
          </div>

          @if (state.selectedScenarioTrack(); as selectedTrack) {
            <div class="track-decision-card">
              <div class="track-decision-head">
                <div>
                  <div class="track-decision-kicker">Valt objekt</div>
                  <div class="track-decision-title">{{ selectedTrack.id }} · {{ selectedTrack.type.toUpperCase() }}</div>
                </div>
                <div class="track-decision-badge">{{ state.mapScenario() === 2 ? 'Supply' : selectedTrack.type === 'missile' ? 'Threat' : 'Track' }}</div>
              </div>
              <div class="track-decision-summary">{{ state.trackSummary(selectedTrack) }}</div>
              <div class="decision-support-grid">
                @for (point of state.trackDecisionSupport(selectedTrack); track point.label) {
                  <div class="decision-support-card">
                    <div class="decision-support-label">{{ point.label }}</div>
                    <div class="decision-support-value">{{ point.value }}</div>
                    <div class="decision-support-detail">{{ point.detail }}</div>
                  </div>
                }
              </div>
              <div class="track-decision-foot">{{ state.scenarioLabels[state.mapScenario()] }}</div>
            </div>
            <div class="track-facts">
              @for (fact of state.trackFacts(selectedTrack); track fact.label) {
                <div class="track-fact">
                  <span class="track-fact-label">{{ fact.label }}</span>
                  <span class="track-fact-value">{{ fact.value }}</span>
                </div>
              }
            </div>
          }

          <div class="timeline-control">
            <div class="timeline-top">
              <button class="s-tab" type="button" (click)="state.toggleTrackPlayback()">
                <span class="s-tab-num">{{ state.trackPlaying() ? 'II' : '▶' }}</span>
                <span class="s-tab-label">{{ state.trackPlaying() ? 'Pausa demo' : 'Spela demo' }}</span>
              </button>
              <span class="timeline-label">Demo {{ (state.trackProgress() * 100) | number:'1.0-0' }}%</span>
            </div>
            <input
              class="timeline-slider"
              type="range"
              min="0"
              max="100"
              [value]="state.trackProgress() * 100"
              (input)="state.onTrackScrub($event)"
            />
          </div>
        </div>

        <!-- SVG map -->
        <div class="map-container">
          <svg viewBox="-90 -70 1840 1440" preserveAspectRatio="xMidYMid slice" class="map-svg" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="sc-glow-r"><feGaussianBlur stdDeviation="3" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
              <filter id="sc-glow-b"><feGaussianBlur stdDeviation="2" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
            </defs>

            <!-- Grid -->
            <g opacity="0.06" class="pointer-events-none">
              @for (x of [0,400,800,1200,1600]; track x) {
                <line [attr.x1]="x" y1="0" [attr.x2]="x" y2="1300" stroke="#9ab0c8" stroke-width="0.5"/>
              }
              @for (y of [0,400,800,1200]; track y) {
                <line x1="0" [attr.y1]="y" x2="1670" [attr.y2]="y" stroke="#9ab0c8" stroke-width="0.5"/>
              }
            </g>

            <!-- North terrain -->
            <polygon [attr.points]="state.terrain.north" fill="rgba(92,167,255,0.06)" stroke="rgba(92,167,255,0.18)" stroke-width="1.5"/>
            <!-- South terrain -->
            <polygon [attr.points]="state.terrain.south" fill="rgba(239,68,68,0.05)" stroke="rgba(239,68,68,0.14)" stroke-width="1.5"/>
            <!-- Islands -->
            <polygon [attr.points]="state.terrain.islandWest" fill="rgba(92,167,255,0.08)" stroke="rgba(92,167,255,0.25)" stroke-width="1"/>
            <polygon [attr.points]="state.terrain.islandEast" fill="rgba(92,167,255,0.08)" stroke="rgba(92,167,255,0.25)" stroke-width="1"/>
            <polygon [attr.points]="state.terrain.southFwd" fill="rgba(239,68,68,0.07)" stroke="rgba(239,68,68,0.18)" stroke-width="1"/>

            @if (state.mapScenario() === 2) {
              <g opacity="0.95">
                <path d="M 240 1140 C 330 1000, 370 860, 430 720 C 480 600, 520 510, 590 430" fill="none" stroke="rgba(245,158,11,0.7)" stroke-width="2.4" stroke-dasharray="10,6"/>
                <path d="M 430 1120 C 500 980, 560 830, 640 690 C 700 580, 740 500, 780 400" fill="none" stroke="rgba(245,158,11,0.55)" stroke-width="2.4" stroke-dasharray="10,6"/>
                <path d="M 860 1140 C 910 990, 950 850, 980 710 C 1010 570, 1040 500, 1080 430" fill="none" stroke="rgba(245,158,11,0.45)" stroke-width="2.4" stroke-dasharray="10,6"/>
                <text x="320" y="1088" font-size="10" font-family="monospace" fill="rgba(245,158,11,0.68)" letter-spacing="0.2em">SUPPLY LINES</text>
                <text x="980" y="1080" font-size="10" font-family="monospace" fill="rgba(245,158,11,0.68)" letter-spacing="0.2em">DRONE SWARM</text>
              </g>
            }

            <!-- Strait label -->
            <text x="835" y="720" text-anchor="middle" font-size="22" font-family="monospace" fill="rgba(156,176,199,0.3)" font-weight="bold" letter-spacing="8">BOREALIS SUND</text>

            <!-- Sensor rings around blue bases -->
            @for (b of state.basesNorth; track b.label) {
              <circle [attr.cx]="b.x" [attr.cy]="b.y" r="180" fill="none" stroke="rgba(124,224,190,0.15)" stroke-width="0.8" stroke-dasharray="6,5"/>
              <circle [attr.cx]="b.x" [attr.cy]="b.y" r="90" fill="none" stroke="rgba(124,224,190,0.08)" stroke-width="0.5" stroke-dasharray="2,7"/>
            }

            <!-- Blue bases -->
            @for (b of state.basesNorth; track b.label) {
              <g [attr.transform]="'translate('+b.x+','+b.y+')'">
                <circle r="10" fill="rgba(92,167,255,0.15)" stroke="#5ca7ff" stroke-width="1.5"/>
                <circle r="4" fill="#5ca7ff"/>
                <text x="14" y="4" font-size="9" fill="#5ca7ff" font-family="monospace" font-weight="bold">{{ b.label }}</text>
              </g>
            }

            <!-- Threat tracks (animated) -->
            @for (track of state.animatedTracks(); track track.id) {
              <g class="cursor-pointer" (click)="state.selectScenarioTrack(track.id)">
              <!-- Full path line (faint ghost) -->
              <line
                [attr.x1]="track.x" [attr.y1]="track.y" [attr.x2]="track.tx" [attr.y2]="track.ty"
                stroke="rgba(239,68,68,0.12)" stroke-width="1" stroke-dasharray="6,4"
              />
              <!-- Traveled trail (brighter) -->
              <line
                [attr.x1]="track.x" [attr.y1]="track.y" [attr.x2]="track.cx" [attr.y2]="track.cy"
                stroke="rgba(239,68,68,0.55)" stroke-width="1.5"
              />
              <!-- Intercept marker at target -->
              <g [attr.transform]="'translate('+track.tx+','+track.ty+')'">
                <circle r="6" fill="none" stroke="rgba(92,167,255,0.4)" stroke-width="1" stroke-dasharray="3,2"/>
                <circle r="2.5" fill="rgba(92,167,255,0.7)"/>
              </g>
              <!-- IFZ circle follows icon -->
              <circle
                [attr.cx]="track.cx" [attr.cy]="track.cy" r="55"
                fill="rgba(239,68,68,0.04)" stroke="rgba(239,68,68,0.35)" stroke-width="0.8" stroke-dasharray="4,3"
                class="track-pulse"
              />
              <!-- Intercept burst when arrived -->
              @if (state.intercepting()) {
                <g [attr.transform]="'translate('+track.tx+','+track.ty+')'">
                  <circle r="7" fill="rgba(92,167,255,0.95)" class="intercept-core"/>
                  <circle r="18" fill="none" stroke="#5ca7ff" stroke-width="2" class="intercept-ring"/>
                  <circle r="32" fill="none" stroke="#7ce0be" stroke-width="1" class="intercept-ring intercept-ring-2"/>
                </g>
              }
              <!-- Threat icon at animated position -->
              <g [attr.transform]="'translate('+track.cx+','+track.cy+')'" filter="url(#sc-glow-r)"
                 [class.track-intercepted]="state.intercepting()">
                @if (track.type === 'missile') {
                  <polygon points="0,-10 5,6 0,2 -5,6" fill="#ef4444"/>
                }
                @if (track.type === 'ship') {
                  <rect x="-8" y="-5" width="16" height="10" rx="2" fill="#ef4444"/>
                  <line x1="0" y1="-5" x2="0" y2="-12" stroke="#ef4444" stroke-width="1.5"/>
                }
                @if (track.type === 'air') {
                  <path d="M0,-10 L6,4 L0,0 L-6,4 Z" fill="#ef4444"/>
                  <line x1="-8" y1="0" x2="8" y2="0" stroke="#ef4444" stroke-width="1.5"/>
                }
              </g>
              @if (state.selectedScenarioTrackId() === track.id) {
                <circle [attr.cx]="track.cx" [attr.cy]="track.cy" r="24" fill="none" stroke="#5ca7ff" stroke-width="1.2" stroke-dasharray="4,3"/>
                <text [attr.x]="track.cx + 14" [attr.y]="track.cy - 12" font-size="9" font-family="monospace" fill="#5ca7ff" font-weight="bold">{{ track.id }}</text>
              }
              </g>
            }
          </svg>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .map-container {
      position: relative; border-radius: 8px; overflow: hidden;
      border: 1px solid var(--s-border); background: rgba(3,7,12,0.8);
      min-height: 700px;
    }
    .map-svg { display: block; width: 100%; height: 100%; }
    .scenario-story {
      display: flex; flex-direction: column; gap: 6px;
      padding: 12px 14px; border-radius: 8px;
      border: 1px solid rgba(92,167,255,0.18);
      background: rgba(92,167,255,0.04);
    }
    .scenario-story-kicker {
      font-size: 11px; font-weight: 800; color: var(--s-text); line-height: 1.45;
    }
    .scenario-story-detail {
      font-size: 12px; line-height: 1.6; color: var(--s-muted);
    }
    .scenario-story-decision {
      font-size: 10px; text-transform: uppercase; letter-spacing: 0.16em;
      color: var(--s-blue); font-weight: 900;
    }
    .scenario-tabs { display: flex; flex-direction: column; gap: 4px; }
    .recommendation-panel {
      display: flex; flex-direction: column; gap: 8px;
      padding: 12px; border: 1px solid rgba(92,167,255,0.14); border-radius: 10px;
      background: rgba(92,167,255,0.04); margin-top: 12px;
    }
    .recommendation-panel-head {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
    }
    .recommendation-panel-kicker {
      font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.18em;
      color: var(--s-blue);
    }
    .recommendation-panel-meta {
      font-size: 10px; font-weight: 700; color: var(--s-muted); text-align: right;
    }
    .recommendation-panel-current {
      display: flex; flex-direction: column; gap: 4px;
      padding: 10px 12px; border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.03);
    }
    .recommendation-panel-decision {
      font-size: 11px; font-weight: 900; color: var(--s-text); text-transform: uppercase; letter-spacing: 0.12em;
    }
    .recommendation-panel-impact {
      font-size: 11px; line-height: 1.5; color: var(--s-muted);
    }
    .recommendation-tabs { display: flex; flex-direction: column; gap: 6px; }
    .recommendation-card {
      display: flex; flex-direction: column; gap: 4px; text-align: left;
      padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);
      background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.2s;
    }
    .recommendation-card:hover { border-color: rgba(92,167,255,0.24); background: rgba(92,167,255,0.05); }
    .recommendation-card-active { border-color: rgba(124,224,190,0.32); background: rgba(124,224,190,0.06); }
    .recommendation-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .recommendation-card-index {
      font-size: 9px; font-weight: 900; color: var(--s-blue); font-family: monospace; letter-spacing: 0.14em;
    }
    .recommendation-card-flag {
      font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.16em;
      padding: 2px 6px; border-radius: 999px; background: rgba(255,255,255,0.04); color: var(--s-muted);
    }
    .recommendation-card-title { font-size: 11px; font-weight: 800; color: var(--s-text); }
    .recommendation-card-summary { font-size: 10px; line-height: 1.45; color: var(--s-muted); }
    .s-tab {
      display: flex; align-items: center; gap: 8px; padding: 8px 12px;
      border-radius: 6px; border: 1px solid var(--s-border);
      background: transparent; color: var(--s-muted);
      font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s; text-align: left;
    }
    .s-tab.active { border-color: rgba(92,167,255,0.4); background: rgba(92,167,255,0.08); color: var(--s-blue); }
    .s-tab:hover:not(.active) { border-color: rgba(148,189,255,0.2); color: var(--s-text); }
    .s-tab-num {
      width: 18px; height: 18px; border-radius: 50%;
      background: rgba(92,167,255,0.15); display: grid; place-items: center;
      font-size: 9px; font-weight: 900; color: var(--s-blue);
    }
    .s-tab.active .s-tab-num { background: rgba(92,167,255,0.3); }
    .map-legend { display: flex; flex-direction: column; gap: 5px; }
    .map-stats { display: flex; gap: 12px; }
    .stat { display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--s-border); background: rgba(255,255,255,0.02); flex: 1; }
    .stat-v { font-size: 18px; font-weight: 700; font-family: monospace; color: var(--s-text); }
    .stat-g { color: var(--s-green); }
    .stat-a { color: var(--s-amber); }
    .stat-l { font-size: 9px; color: var(--s-muted); text-transform: uppercase; letter-spacing: 0.1em; }
    .track-pulse { animation: trackPulse 2s ease-in-out infinite; }
    .track-intercepted { opacity: 0.3; transition: opacity 0.4s ease; }
    .intercept-core { animation: interceptCoreFade 0.3s ease-out both; }
    .intercept-ring {
      transform-box: fill-box; transform-origin: center;
      animation: interceptRingPing 1.1s ease-out infinite;
    }
    .intercept-ring-2 { animation-delay: 0.35s; }
    .map-phase-bar { display: flex; flex-direction: column; gap: 4px; }
    .phase-bar-track { height: 2px; background: rgba(148,189,255,0.1); border-radius: 1px; overflow: hidden; }
    .phase-bar-fill { height: 100%; background: linear-gradient(90deg, #5ca7ff, #7ce0be); border-radius: 1px; transition: width 0.06s linear; }
    .phase-bar-fill.phase-fill-intercept { background: linear-gradient(90deg, #7ce0be, #5ca7ff); }
    .stat-r { color: var(--s-red); }
    .timeline-control {
      display: flex; flex-direction: column; gap: 8px;
      padding: 12px; border-radius: 6px;
      border: 1px solid var(--s-border); background: rgba(255,255,255,0.02);
    }
    .timeline-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .timeline-label { font-size: 10px; color: var(--s-muted); font-family: monospace; font-weight: 700; }
    .timeline-slider {
      width: 100%;
      accent-color: var(--s-blue);
      background: transparent;
    }
    .track-facts {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }
    .track-fact {
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid var(--s-border);
      background: rgba(255,255,255,0.02);
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .track-fact-label {
      font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.16em;
      color: var(--s-muted);
    }
    .track-fact-value {
      font-size: 12px; color: var(--s-text); line-height: 1.4;
    }
    .track-decision-card {
      display: flex; flex-direction: column; gap: 10px;
      padding: 14px; border-radius: 10px;
      border: 1px solid rgba(92,167,255,0.16); background: rgba(92,167,255,0.04);
    }
    .track-decision-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .track-decision-kicker {
      font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.18em;
      color: var(--s-blue);
    }
    .track-decision-title { font-size: 14px; font-weight: 800; color: var(--s-text); line-height: 1.3; }
    .track-decision-badge {
      font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.16em;
      padding: 3px 8px; border-radius: 999px; background: rgba(124,224,190,0.12); color: var(--s-green);
    }
    .track-decision-summary { font-size: 12px; line-height: 1.6; color: var(--s-muted); }
    .decision-support-grid {
      display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px;
    }
    .decision-support-card {
      padding: 10px 12px; border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02);
      display: flex; flex-direction: column; gap: 4px;
    }
    .decision-support-label {
      font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.16em;
      color: var(--s-muted);
    }
    .decision-support-value { font-size: 12px; font-weight: 800; color: var(--s-text); line-height: 1.35; }
    .decision-support-detail { font-size: 10px; line-height: 1.45; color: var(--s-muted); }
    .track-decision-foot {
      font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.18em;
      color: var(--s-blue);
    }
  `],
})
export class MapSlide {
  readonly state = inject(ShowcaseState);
}
