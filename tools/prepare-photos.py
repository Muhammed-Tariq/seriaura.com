"""Create small, orientation-correct website copies; never change the originals."""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
NAMES = ['IMG_0710.JPEG', '8a8ac8f3-df0e-4162-ba3c-97312df76f27.JPEG',
         'IMG_1544.JPEG', 'IMG_1510.JPEG', 'IMG_1276.JPEG', 'IMG_1187.JPEG',
         'IMG_1796.JPEG', 'IMG_1808.JPEG', 'IMG_1031.JPEG', 'IMG_1587.JPEG',
         'IMG_1582.JPEG', 'IMG_1657.JPEG', 'IMG_1628.JPEG', 'IMG_1396.PNG']
NAMES += ['aa4b3511-9190-45ef-b35b-b3c6972f94e5.JPEG', 'IMG_1912.JPEG',
          'IMG_1922.JPEG', 'IMG_1392.JPEG', 'IMG_1189.JPEG', 'IMG_0883.JPEG',
          'IMG_0888.JPEG', 'IMG_1598.JPEG']

if __name__ == '__main__':
    import sys
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('S:/Downloads')
    destination = ROOT / 'assets/photos'
    destination.mkdir(exist_ok=True)
    names = sys.argv[2:] or NAMES
    for name in names:
        with Image.open(source / name) as original:
            photo = ImageOps.exif_transpose(original).convert('RGB')
            photo.thumbnail((1000, 1000))
            photo.save(destination / (Path(name).stem + '.webp'), quality=84, method=6)
    print(f'Prepared {len(names)} photographs.')
