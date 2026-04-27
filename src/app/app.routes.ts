import {Routes} from '@angular/router';

export const routes: Routes = [
  {
    path: 'showcase/final',
    loadComponent: () => import('./features/showcase/showcase-final.component').then(m => m.FinalShowcase)
  },
  {
    path: 'showcase',
    loadComponent: () => import('./features/showcase/showcase.component').then(m => m.Showcase)
  },
  {
    path: '',
    loadComponent: () => import('./shared/ui/shell-layout.component').then(m => m.ShellLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'overview',
        pathMatch: 'full'
      },
      {
        path: 'commander',
        loadComponent: () => import('./features/c2/c2-orchestrator.component').then(m => m.CommanderOrchestrator)
      },
      {
        path: 'lab',
        loadComponent: () => import('./features/lab/lab-root.component').then(m => m.LabRootComponent),
        children: [
          {
            path: 'readiness',
            loadComponent: () => import('./features/lab/readiness-console.component').then(m => m.ReadinessConsole)
          },
          {
            path: 'robustness',
            loadComponent: () => import('./features/lab/robustness-lab.component').then(m => m.RobustnessLab)
          },
          {
            path: 'counterfactual',
            loadComponent: () => import('./features/lab/counterfactual-lab.component').then(m => m.CounterfactualLab)
          },
          {
            path: 'c2-resilience',
            loadComponent: () => import('./features/lab/c2-resilience-lab.component').then(m => m.C2ResilienceLabComponent)
          },
          {
            path: 'drawing-board',
            loadComponent: () => import('./features/lab/drawing-board.component').then(m => m.DrawingBoard)
          },
          {
            path: 'force-catalog',
            loadComponent: () => import('./features/lab/force-catalog-lab.component').then(m => m.ForceCatalogLabComponent)
          },
          {
            path: 'forest',
            loadComponent: () => import('./features/lab/forest-lab.component').then(m => m.ForestLabComponent)
          },
        ]
      },
      {
        path: 'governance',
        loadComponent: () => import('./features/governance/governance-root.component').then(m => m.GovernanceRootComponent),
        children: [
          {
            path: '',
            loadComponent: () => import('./features/governance/governance-overview.component').then(m => m.Governance)
          },
          {
            path: 'knowledge-graph',
            loadComponent: () => import('./features/governance/knowledge-graph.component').then(m => m.KnowledgeGraph)
          },
        ]
      },
      {
        path: 'authority',
        loadComponent: () => import('./features/c2/authority-dashboard.component').then(m => m.AuthorityDashboard)
      },
      {
        path: 'reference',
        loadChildren: () => import('./features/reference/reference.routes').then(m => m.referenceRoutes)
      },
      {
        path: 'demo',
        loadComponent: () => import('./features/ops/demo-director.component').then(m => m.DemoDirector)
      },
      {
        path: '',
        loadComponent: () => import('./features/ops/ops-root.component').then(m => m.OpsRootComponent),
        children: [
          {
            path: 'overview',
            loadComponent: () => import('./features/ops/mission-overview.component').then(m => m.MissionOverview)
          },
          {
            path: 'tactical',
            loadComponent: () => import('./features/ops/tactical-console.component').then(m => m.TacticalConsole)
          },
          {
            path: 'threat-inspector',
            loadComponent: () => import('./features/ops/threat-inspector.component').then(m => m.ThreatInspector)
          },
          {
            path: 'logistics',
            loadComponent: () => import('./features/ops/logistics-console.component').then(m => m.LogisticsConsole)
          },
          {
            path: 'field',
            loadComponent: () => import('./features/ops/field-console.component').then(m => m.FieldConsole)
          }
        ]
      },
      {
        path: '**',
        redirectTo: 'overview'
      }
    ]
  },
];
