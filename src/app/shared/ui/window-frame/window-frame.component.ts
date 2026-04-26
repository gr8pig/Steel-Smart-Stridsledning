import { Component, Input } from '@angular/core';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-window-frame',
  standalone: true,
  imports: [CdkDrag, CdkDragHandle],
  template: `
    <div cdkDrag class="absolute bg-boreal-panel border border-boreal-border shadow-2xl rounded-sm z-[100] min-w-[200px]">
      <div cdkDragHandle class="cursor-move p-2 bg-boreal-panel-muted text-[8px] uppercase tracking-widest text-boreal-text-muted border-b border-boreal-border">
        {{title}}
      </div>
      <div class="p-4">
        <ng-content></ng-content>
      </div>
    </div>
  `
})
export class WindowFrameComponent {
  @Input() title = 'Window';
}
