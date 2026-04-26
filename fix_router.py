import re

file_path = 'src/app/shared/ui/planned-capability-modal.ts'
with open(file_path, 'r') as f:
    content = f.read()

content = content.replace('router       = inject(Router);', 'private readonly router: Router = inject(Router);')

with open(file_path, 'w') as f:
    f.write(content)
print("UPDATED")
