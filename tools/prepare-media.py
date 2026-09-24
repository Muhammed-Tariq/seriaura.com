"""Prepare the supplied photos without copying camera metadata into the website."""
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[1]
names = ['IMG_1808.JPEG', 'IMG_1031.JPEG', 'IMG_1587.JPEG', 'IMG_1582.JPEG',
         'IMG_1657.JPEG', 'IMG_1628.JPEG', 'IMG_0710.JPEG',
         '8a8ac8f3-df0e-4162-ba3c-97312df76f27.JPEG', 'IMG_1544.JPEG',
         'IMG_1510.JPEG', 'IMG_1276.JPEG', 'IMG_1187.JPEG', 'IMG_1796.JPEG', 'IMG_1396.PNG']
destination = root / 'assets' / 'moments'
destination.mkdir(exist_ok=True)
for name in names:
    with Image.open(Path('S:/Downloads') / name) as source:
        original = ImageOps.exif_transpose(source).convert('RGB')
        for suffix, size in [('', 1600), ('-thumb', 640)]:
            photo = original.copy()
            photo.thumbnail((size, size), Image.Resampling.LANCZOS)
            photo.save(destination / (Path(name).stem.lower() + suffix + '.jpg'), quality=84, optimize=True)
print(f'Prepared {len(names)} photos, each with a small thumbnail and larger viewer image.')
