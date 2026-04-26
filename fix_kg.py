import re

file_path = 'src/app/features/knowledge-graph.ts'
with open(file_path, 'r') as f:
    content = f.read()

# Add the new math and intent inference sections to the sidebars if they are missing
# For the GRAPH drawer:
graph_drawer_injection = """
                  @if (node.technicalSpecs.verif) {
                    <div class="border-t border-white/5 pt-4">
                      <div class="mb-2 text-[7px] font-black uppercase tracking-[0.3em] text-slate-600">Verification_Signals</div>
                      <p class="text-[10px] leading-relaxed text-slate-400">{{ node.technicalSpecs.verif }}</p>
                    </div>
                  }
                  
                  <!-- IDEATION NEW FIELDS -->
                  @if (node.technicalSpecs.uncertaintySource) {
                    <div class="border-t border-white/5 pt-4">
                      <div class="mb-2 text-[7px] font-black uppercase tracking-[0.3em] text-slate-600">Dominant Uncertainty Source</div>
                      <p class="text-[10px] leading-relaxed text-amber-500/80">{{ node.technicalSpecs.uncertaintySource }}</p>
                    </div>
                  }
                  @if (node.technicalSpecs.fatiguePenalty) {
                    <div class="border-t border-white/5 pt-4">
                      <div class="mb-2 text-[7px] font-black uppercase tracking-[0.3em] text-slate-600">Fatigue Penalty (Δt)</div>
                      <p class="text-[10px] leading-relaxed text-rose-500/80">{{ node.technicalSpecs.fatiguePenalty }}</p>
                    </div>
                  }
                  @if (node.technicalSpecs.policyDriftOffset) {
                    <div class="border-t border-white/5 pt-4">
                      <div class="mb-2 text-[7px] font-black uppercase tracking-[0.3em] text-slate-600">Policy Drift Offset</div>
                      <p class="text-[10px] leading-relaxed text-sky-500/80">{{ node.technicalSpecs.policyDriftOffset }}</p>
                    </div>
                  }
"""
content = re.sub(r'(@if \(node.technicalSpecs.verif\) \{\s*<div class="border-t border-white/5 pt-4">\s*<div class="mb-2 text-\[7px\] font-black uppercase tracking-\[0.3em\] text-slate-600">Verification_Signals</div>\s*<p class="text-\[10px\] leading-relaxed text-slate-400">\{\{ node.technicalSpecs.verif \}\}</p>\s*</div>\s*\})', graph_drawer_injection, content, count=1)

# TWIN mode details section
twin_mode_injection = """
                    @if (node.technicalSpecs.verif) {
                      <div class="rounded-sm border border-white/5 bg-white/2 p-4">
                        <div class="mb-2 text-[7px] font-black uppercase tracking-[0.3em] text-slate-500">Verification</div>
                        <p class="text-[10px] leading-relaxed text-slate-400">{{ node.technicalSpecs.verif }}</p>
                      </div>
                    }
                    
                    <!-- IDEATION NEW FIELDS -->
                    @if (node.technicalSpecs.uncertaintySource) {
                      <div class="rounded-sm border border-white/5 bg-white/2 p-4">
                        <div class="mb-2 text-[7px] font-black uppercase tracking-[0.3em] text-slate-500">Dominant Uncertainty Source</div>
                        <p class="text-[10px] leading-relaxed text-amber-500/80">{{ node.technicalSpecs.uncertaintySource }}</p>
                      </div>
                    }
                    @if (node.technicalSpecs.fatiguePenalty) {
                      <div class="rounded-sm border border-white/5 bg-white/2 p-4">
                        <div class="mb-2 text-[7px] font-black uppercase tracking-[0.3em] text-slate-500">Fatigue Penalty (Δt)</div>
                        <p class="text-[10px] leading-relaxed text-rose-500/80">{{ node.technicalSpecs.fatiguePenalty }}</p>
                      </div>
                    }
                    @if (node.technicalSpecs.policyDriftOffset) {
                      <div class="rounded-sm border border-white/5 bg-white/2 p-4">
                        <div class="mb-2 text-[7px] font-black uppercase tracking-[0.3em] text-slate-500">Policy Drift Offset</div>
                        <p class="text-[10px] leading-relaxed text-sky-500/80">{{ node.technicalSpecs.policyDriftOffset }}</p>
                      </div>
                    }
"""
content = re.sub(r'(@if \(node.technicalSpecs.verif\) \{\s*<div class="rounded-sm border border-white/5 bg-white/2 p-4">\s*<div class="mb-2 text-\[7px\] font-black uppercase tracking-\[0.3em\] text-slate-500">Verification</div>\s*<p class="text-\[10px\] leading-relaxed text-slate-400">\{\{ node.technicalSpecs.verif \}\}</p>\s*</div>\s*\})', twin_mode_injection, content, count=1)

with open(file_path, 'w') as f:
    f.write(content)

print("UI UPDATED")
