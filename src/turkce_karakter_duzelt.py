from pathlib import Path
import shutil
import sys

try:
    from ftfy import fix_text
except ImportError:
    print('ftfy paketi yok. Önce: python -m pip install ftfy')
    sys.exit(2)

ROOT = Path.cwd()
BACKUP = ROOT / 'turkce_oncesi_yedek'
EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.scss', '.xml', '.java', '.kt', '.gradle', '.properties', '.md', '.txt', '.yml', '.yaml', '.sql'}
SKIP_DIRS = {'node_modules', '.git', 'build', '.gradle', 'dist', 'turkce_oncesi_yedek'}
MARKERS = ('Ã', 'Ä', 'Å', 'Â', '�', 'â€', 'ðŸ', 'ğŸ')
changed, unreadable = [], []

for path in ROOT.rglob('*'):
    if not path.is_file() or path.suffix.lower() not in EXTENSIONS:
        continue
    rel = path.relative_to(ROOT)
    if any(part in SKIP_DIRS for part in rel.parts):
        continue
    try:
        original = path.read_text(encoding='utf-8')
    except (UnicodeDecodeError, OSError):
        unreadable.append(str(rel))
        continue
    if not any(marker in original for marker in MARKERS):
        continue
    repaired = fix_text(original)
    if repaired != original:
        backup = BACKUP / rel
        backup.parent.mkdir(parents=True, exist_ok=True)
        if not backup.exists():
            shutil.copy2(path, backup)
        with path.open('w', encoding='utf-8', newline='') as f:
            f.write(repaired)
        changed.append(str(rel))

print(f'Proje: {ROOT}')
print(f'Yedek klasörü: {BACKUP}')
print(f'Düzeltilen dosya: {len(changed)}')
for item in changed:
    print('DÜZELTİLDİ:', item)
if unreadable:
    print(f'UTF-8 olarak okunamayan dosya: {len(unreadable)}')
    for item in unreadable:
        print('KONTROL ET:', item)
print("Not: '�' ile tamamen kaybolmuş özgün karakterler otomatik olarak geri getirilemeyebilir.")
