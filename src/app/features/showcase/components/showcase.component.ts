import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MapSlideComponent } from "./map-slide.component";
import { DecisionSupportSlideComponent } from "./decision-support-slide.component";
import { RobustnessSlideComponent } from "./robustness-slide.component";
import { WelcomeSlideComponent } from "./welcome-slide.component";
import { ShowcaseSlide } from "../showcase-data";

@Component({
  selector: "app-showcase",
  standalone: true,
  imports: [
    CommonModule,
    MapSlideComponent,
    DecisionSupportSlideComponent,
    RobustnessSlideComponent,
    WelcomeSlideComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="showcase-shell" tabindex="0">
      <main class="showcase-main">
        @if (currentSlide() === 0) {
            <app-welcome-slide [config]="slides[0]"></app-welcome-slide>
        }
        @if (currentSlide() === 1) {
            <app-map-slide [eyebrow]="slides[1].eyebrow" [title]="slides[1].title" [subtitle]="slides[1].subtitle"></app-map-slide>
        }
        @if (currentSlide() === 2) {
            <app-decision-support-slide [eyebrow]="slides[2].eyebrow" [title]="slides[2].title" [subtitle]="slides[2].subtitle"></app-decision-support-slide>
        }
        @if (currentSlide() === 3) {
            <app-robustness-slide [title]="slides[3].title" [subtitle]="slides[3].subtitle" [content]="slides[3].content || []"></app-robustness-slide>
        }
      </main>
    </div>
  `
})
export class ShowcaseComponent implements OnInit, OnDestroy {
  currentSlide = signal(0);
  slides: ShowcaseSlide[] = [
    { eyebrow: "BDT Project", title: "Showcase", subtitle: "Decision Twin Prototype" },
    { eyebrow: "Module 1", title: "Map View", subtitle: "Operational Awareness" },
    { eyebrow: "Module 2", title: "Decision Support", subtitle: "AI-Augmented Logic" },
    { eyebrow: "Module 3", title: "Robustness Lab", subtitle: "Stress Testing", content: ["Simulation Results"] }
  ];

  ngOnInit(): void {}
  ngOnDestroy(): void {}
}
