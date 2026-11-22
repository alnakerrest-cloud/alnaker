import os
import re

patterns = [
    r'\bfrom\s+[\"\'](node:)?(fs|fs/promises|path|crypto|child_process|net|tls|os)[\"\']',
    r'\brequire\([\"\'](node:)?(fs|fs/promises|path|crypto|child_process|net|tls|os)[\"\']\)'
]

files_found = {}

for root_dir in ['app', 'lib', 'components']:
    for root, dirs, files in os.walk(root_dir):
        for f in files:
            if f.endswith(('.ts', '.tsx', '.js', '.jsx')):
                p = os.path.join(root, f)
                with open(p, 'r', encoding='utf-8', errors='ignore') as fp:
                    content = fp.read()
                    for pat in patterns:
                        matches = re.findall(pat, content)
                        for m in matches:
                            mod = m[1] if isinstance(m, tuple) else m
                            files_found.setdefault(mod, []).append(p)

for mod, paths in sorted(files_found.items()):
    unique_paths = sorted(set(paths))
    print(f"{mod}: {len(unique_paths)} files")
    for x in unique_paths:
        print(f"   {x}")
