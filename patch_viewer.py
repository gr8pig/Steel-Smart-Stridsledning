import re

with open('src/app/features/knowledge-graph.ts', 'r') as f:
    content = f.read()

# Add the import
import_line = "import { KnowledgeGraphViewerComponent } from '../shared/ui/knowledge-graph-viewer/knowledge-graph-viewer.component';\n"
content = re.sub(r"import \{ MatIconModule \}", import_line + "import { MatIconModule }", content)

# Add it to imports array
content = re.sub(r"imports: \[CommonModule, RouterLink, MatIconModule\],", "imports: [CommonModule, RouterLink, MatIconModule, KnowledgeGraphViewerComponent],", content)

# Replace the SVG with the 3D Viewer component, keeping the layout wrapper
svg_regex = re.compile(r'<div class="h-full w-full transition-transform duration-300 ease-out".*?</svg></div>', re.DOTALL)

viewer_html = """<div class="h-full w-full">
            <app-knowledge-graph-viewer 
               [nodes]="visibleNodes()"
               [edges]="visibleEdges()"
               [selectedNodeId]="store.selectedNodeId()"
               (nodeSelected)="store.selectNode($event)">
            </app-knowledge-graph-viewer>
          </div>"""

content = svg_regex.sub(viewer_html, content)

with open('src/app/features/knowledge-graph.ts', 'w') as f:
    f.write(content)
