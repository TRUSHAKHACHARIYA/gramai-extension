#!/usr/bin/env python3
"""Generate GramAI extension icons at all required sizes."""

import struct, zlib, os

def create_png(size, output_path):
    """Create a gradient purple icon PNG without PIL."""
    pixels = []
    cx, cy = size / 2, size / 2
    r = size / 2

    for y in range(size):
        row = []
        for x in range(size):
            # Circle mask
            dist = ((x - cx)**2 + (y - cy)**2) ** 0.5
            if dist > r - 0.5:
                row.extend([0, 0, 0, 0])  # transparent
                continue

            # Gradient: top-left #6366f1, bottom-right #8b5cf6
            t = (x + y) / (size * 2)
            pr = int(0x63 + (0x8b - 0x63) * t)
            pg = int(0x66 + (0x5c - 0x66) * t)
            pb = int(0xf1 + (0xf6 - 0xf1) * t)

            # Anti-alias edge
            alpha = int(min(1.0, (r - dist)) * 255)
            row.extend([pr, pg, pb, alpha])
        pixels.append(row)

    # Draw sparkle "✨" as simple white shapes
    def set_pixel(px, py, a=255):
        if 0 <= px < size and 0 <= py < size:
            pixels[py][px*4+3] = min(255, pixels[py][px*4+3])
            pixels[py][px*4]   = 255
            pixels[py][px*4+1] = 255
            pixels[py][px*4+2] = 255
            pixels[py][px*4+3] = a

    # Draw a simple "G" letter or star depending on size
    if size >= 32:
        # Draw a white star/cross in center
        m = size // 2
        arm = max(2, size // 8)
        for i in range(-arm, arm+1):
            for thickness in range(-max(1, size//16), max(1, size//16)+1):
                set_pixel(m + i, m + thickness)  # horizontal
                set_pixel(m + thickness, m + i)  # vertical
        # Diagonal arms (shorter)
        short = max(1, arm // 2)
        for i in range(-short, short+1):
            set_pixel(m + i, m + i)
            set_pixel(m + i, m - i)

    # Encode as PNG
    def png_chunk(name, data):
        c = zlib.crc32(name + data) & 0xffffffff
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', c)

    raw = b''
    for row in pixels:
        raw += b'\x00' + bytes(row)

    compressed = zlib.compress(raw, 9)
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    png = (
        b'\x89PNG\r\n\x1a\n' +
        png_chunk(b'IHDR', ihdr) +
        png_chunk(b'IDAT', compressed) +
        png_chunk(b'IEND', b'')
    )
    with open(output_path, 'wb') as f:
        f.write(png)
    print(f'  Created {output_path} ({size}x{size})')

def main():
    icons_dir = os.path.join(os.path.dirname(__file__), 'icons')
    os.makedirs(icons_dir, exist_ok=True)
    for size in [16, 32, 48, 128]:
        create_png(size, os.path.join(icons_dir, f'icon{size}.png'))
    print('All icons generated!')

if __name__ == '__main__':
    main()
