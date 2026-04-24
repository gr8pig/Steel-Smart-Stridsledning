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
      },
      {
        path: 'c2-resilience-lab',
        loadComponent: () => import('../c2-resilience-lab').then(m => m.C2ResilienceLab)
      },
      {
        path: 'counterfactual-lab',
        loadComponent: () => import('../counterfactual-lab').then(m => m.CounterfactualLab)
      }
    ]
  }
];
