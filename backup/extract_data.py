import sys

# Read the dump file (UTF-16LE)
with open('backup/dump_banco_2026-03-08_1856.sql', 'r', encoding='utf-16-le') as f:
    content = f.read()

lines = content.split('\n')
out = ['SET session_replication_role = replica;\n']
in_copy = False

for line in lines:
    stripped = line.strip()
    if stripped.startswith('COPY '):
        in_copy = True
        out.append(line + '\n')
    elif in_copy:
        out.append(line + '\n')
        if stripped == '\\.':
            in_copy = False

out.append('\nSET session_replication_role = DEFAULT;\n')

with open('backup/data_only.sql', 'w', encoding='utf-8') as f:
    f.writelines(out)

copy_count = len([l for l in out if l.strip().startswith('COPY')])
print('Extracted {} COPY blocks'.format(copy_count))
print('Total lines: {}'.format(len(out)))
