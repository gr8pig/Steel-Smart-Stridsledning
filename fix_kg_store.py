import re

file_path = 'src/app/core/models/knowledge-graph.types.ts'
with open(file_path, 'r') as f:
    content = f.read()

# Add the new properties to TechNode technicalSpecs
injection = """
  technicalSpecs: {
    inputs: string[];
    outputs: string[];
    logic?: string;
    math?: string;
    doctrine?: string;
    verif?: string;
    uncertaintySource?: string;
    fatiguePenalty?: string;
    policyDriftOffset?: string;
  };
"""

content = re.sub(r'technicalSpecs: \{\s*inputs: string\[\];\s*outputs: string\[\];\s*logic\?: string;\s*math\?: string;\s*doctrine\?: string;\s*verif\?: string;\s*\}', injection, content)

with open(file_path, 'w') as f:
    f.write(content)

print("TYPES UPDATED")
