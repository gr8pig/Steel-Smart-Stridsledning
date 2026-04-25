import {Routes} from '@angular/router';
import {ReferencePage} from './reference-page';
import {ReferenceShell} from './reference-shell';

export const referenceRoutes: Routes = [
  {
    path: '',
    component: ReferenceShell,
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: ReferencePage
      }
    ]
  }
];
