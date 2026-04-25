import { Routes } from '@angular/router';
import { ReferenceIndexPage } from './reference-index';
import { ReferencePage } from './reference-page';
import { ReferenceShell } from './reference-shell';
import { REFERENCE_DOCS } from './reference.manifest';

export const referenceRoutes: Routes = [
  {
    path: '',
    component: ReferenceShell,
    children: [
      {
        path: '',
        component: ReferenceIndexPage,
      },
      ...REFERENCE_DOCS.map(doc => ({
        path: doc.slug,
        component: ReferencePage,
        data: { slug: doc.slug },
      })),
      {
        path: '**',
        redirectTo: '',
      },
    ],
  },
];
