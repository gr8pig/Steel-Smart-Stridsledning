import { Injectable, signal } from "@angular/core";

@Injectable({
  providedIn: "root"
})
export class ShowcaseHelperService {
  private currentSlideSignal = signal(0);
  readonly currentSlide = this.currentSlideSignal.asReadonly();

  nextSlide() {
    this.currentSlideSignal.update(n => n + 1);
  }

  prevSlide() {
    this.currentSlideSignal.update(n => Math.max(0, n - 1));
  }

  setSlide(index: number) {
    this.currentSlideSignal.set(index);
  }
}
