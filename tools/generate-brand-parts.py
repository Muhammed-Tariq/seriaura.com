"""Crop authored logo characters/hearts for independent animation; no resampling."""
from pathlib import Path
from PIL import Image

folder = Path(__file__).resolve().parents[1] / 'assets/brand'
logo = Image.open(folder / 'logo.png').convert('RGBA')
for name, left, right in [('se', 0, 375), ('ri', 375, 735), ('a', 735, 1145),
                          ('u', 1145, 1520), ('ra', 1520, 1886)]:
    logo.crop((left, 107, right, 474)).save(folder / f'glyph-{name}.png')
for index, left in enumerate([595, 699, 803, 907, 1011, 1115, 1219], 1):
    logo.crop((left, 0, left + 72, 72)).save(folder / f'heart-{index}.png')

partner = Image.open(folder / 'joshbuild.png').convert('RGBA')
for index, (left, right) in enumerate([(0, 100), (125, 214), (260, 376), (396, 506),
                                      (535, 640), (669, 778), (800, 904), (937, 1018),
                                      (1067, 1178), (1198, 1307)]):
    partner.crop((left, 0, right, 220)).save(folder / f'partner-glyph-{index}.png')
