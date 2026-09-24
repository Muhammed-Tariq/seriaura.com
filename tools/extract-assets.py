"""Extract the original portrait from the supplied Photoshop layer data."""
from pathlib import Path
import struct
import zlib
from PIL import Image

data = Path('S:/Downloads/websitepreview.psd').read_bytes()
pos = 26
def number(fmt):
    global pos
    size = struct.calcsize('>' + fmt)
    value = struct.unpack_from('>' + fmt, data, pos)[0]
    pos += size
    return value
for _ in range(2):
    size = number('I')
    pos += size
number('I')
number('I')
count = abs(number('h'))
layers = []
for _ in range(count):
    top, left, bottom, right = [number('i') for _ in range(4)]
    channels = [(number('h'), number('I')) for _ in range(number('H'))]
    pos += 12
    length = number('I')
    end = pos + length
    length = number('I'); pos += length
    length = number('I'); pos += length
    length = number('B')
    name = data[pos:pos+length].decode('latin1')
    pos = end
    layers.append((name, (left, top, right, bottom), channels))

def unpack_rle(raw):
    out = bytearray()
    i = 0
    while i < len(raw):
        n = raw[i]; i += 1
        if n < 128:
            out.extend(raw[i:i+n+1]); i += n+1
        elif n > 128:
            out.extend(raw[i:i+1] * (257-n)); i += 1
    return bytes(out)

for name, box, channels in layers:
    planes = {}
    width, height = box[2]-box[0], box[3]-box[1]
    for channel, size in channels:
        raw = data[pos:pos+size]; pos += size
        if name != 'pfp-Photoroom' or not width or not height:
            continue
        compression = struct.unpack('>H', raw[:2])[0]
        if compression == 0: pixels = raw[2:]
        elif compression == 1: pixels = unpack_rle(raw[2+height*2:])
        elif compression == 2: pixels = zlib.decompress(raw[2:])
        else: raise ValueError(compression)
        planes[channel] = Image.frombytes('L', (width,height), pixels)
    if planes:
        Image.merge('RGBA', [planes[n] for n in [0,1,2,-1]]).save('assets/portrait.png')
        print('Extracted portrait', width, height)
