"""Create small, orientation-correct website copies; never change the originals."""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
NAMES = ['IMG_0710.JPEG', '8a8ac8f3-df0e-4162-ba3c-97312df76f27.JPEG',
         'IMG_1544.JPEG', 'IMG_1510.JPEG', 'IMG_1276.JPEG', 'IMG_1187.JPEG',
         'IMG_1796.JPEG', 'IMG_1808.JPEG', 'IMG_1031.JPEG', 'IMG_1587.JPEG',
         'IMG_1582.JPEG', 'IMG_1657.JPEG', 'IMG_1628.JPEG', 'IMG_1396.PNG']

if __name__ == '__main__':
    import sys
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('S:/Downloads')
    destination = ROOT / 'assets/photos'
    destination.mkdir(exist_ok=True)
    for name in NAMES:
        with Image.open(source / name) as original:
            photo = ImageOps.exif_transpose(original).convert('RGB')
            photo.thumbnail((1000, 1000))
            photo.save(destination / (Path(name).stem + '.webp'), quality=84, method=6)
    print(f'Prepared {len(NAMES)} photographs.')
