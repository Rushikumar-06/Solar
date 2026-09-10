"""Builds the real surface maps in public/maps from public-domain imagery.

Run it once, by hand, and commit what it writes:  python3 scripts/build-maps.py
Needs Pillow and a network connection. Nothing else in the project runs it.

Sources, all public domain:
  Earth colour   NASA Blue Marble, as shipped with the three.js examples
  Earth land     the matching Blue Marble specular mask (water is white)
  Moon           NASA SVS CGI Moon Kit, LRO/LROC albedo
  Mercury        NASA / JHUAPL / Carnegie MESSENGER MDIS basemap, via Wikimedia

The maps carry geography only. Colour, relief, weather and lighting all stay in
the shaders, so these stay small: the whole set is well under 200 kB.
"""

import io
import os
import urllib.request
from PIL import Image, ImageFilter, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "maps")
CACHE = os.path.join(os.environ.get("TMPDIR", "/tmp"), "orrery-map-sources")

SOURCES = {
    "earth": "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg",
    "earth-spec": "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg",
    "moon": "https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_1k.jpg",
    "mercury": "https://commons.wikimedia.org/wiki/Special:FilePath/"
    "Mercury%20MESSENGER%20MDIS%20Basemap%20MD3Color%20Mosaic%20Global%2032ppd.jpg?width=1280",
}


def source(name: str) -> Image.Image:
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, name + ".jpg")
    if not os.path.exists(path):
        request = urllib.request.Request(SOURCES[name], headers={"User-Agent": "orrery-build-maps/1.0"})
        with urllib.request.urlopen(request, timeout=120) as response:
            data = response.read()
        with open(path, "wb") as handle:
            handle.write(data)
        print(f"  fetched {name} ({len(data) // 1024} kB)")
    return Image.open(path)


def curve(image: Image.Image, lo: float, hi: float, gamma: float) -> Image.Image:
    """Stretches lo..hi (as 0..1 fractions) to the full range, then applies gamma."""
    lut = []
    for i in range(256):
        v = (i / 255.0 - lo) / (hi - lo)
        v = min(max(v, 0.0), 1.0) ** gamma
        lut.append(int(round(v * 255)))
    return image.point(lut)


def levels(count: int):
    """LUT that posterises to `count` evenly spaced values, keeping 0 and 255."""
    step = count - 1
    return [min(255, int(round(i / 255 * step)) * (256 // step)) for i in range(256)]


def write(image: Image.Image, name: str, **options) -> None:
    path = os.path.join(OUT, name)
    image.save(path, **options)
    print(f"  {name:16} {image.size[0]}x{image.size[1]}  {os.path.getsize(path) // 1024} kB")


def build_earth() -> None:
    print("earth")
    colour = source("earth").convert("RGB").resize((1024, 512), Image.LANCZOS)
    write(colour, "earth.jpg", quality=82, optimize=True, progressive=True)

    # The specular map is white on water; invert it into land coverage. Resizing
    # from 2048 wide leaves antialiased coasts, which the shader sharpens back up.
    # Five levels of coverage are plenty once the texture is filtered, and they
    # cost a fifth of what the full eight bits do.
    land = ImageOps.invert(source("earth-spec").convert("L")).resize((1024, 512), Image.LANCZOS)
    write(land.point(levels(5)), "earth-land.png", optimize=True)


def polar_fade(image: Image.Image, rows: int) -> Image.Image:
    """Blurs the top and bottom rows, where equirectangular mosaics go to streaks."""
    blurred = image.filter(ImageFilter.GaussianBlur(6))
    width, height = image.size
    mask = Image.new("L", (width, height), 0)
    for y in range(rows):
        value = int(255 * (1.0 - y / rows) ** 2)
        mask.paste(value, (0, y, width, y + 1))
        mask.paste(value, (0, height - 1 - y, width, height - y))
    return Image.composite(blurred, image, mask)


def build_moon() -> None:
    print("moon")
    albedo = source("moon").convert("L").resize((512, 256), Image.LANCZOS)
    # LROC albedo sits in a narrow band; open it up so maria read as dark seas.
    albedo = curve(albedo, 0.12, 0.78, 1.0).filter(ImageFilter.GaussianBlur(0.5))
    write(albedo, "moon.jpg", quality=84, optimize=True, progressive=True)


def build_mercury() -> None:
    print("mercury")
    albedo = source("mercury").convert("L").resize((512, 256), Image.LANCZOS)
    # Only the broad albedo is wanted; the craters come from the shader, so a
    # touch of blur here costs nothing and saves a third of the file.
    albedo = polar_fade(curve(albedo, 0.10, 0.80, 1.0), 14).filter(ImageFilter.GaussianBlur(0.6))
    write(albedo, "mercury.jpg", quality=78, optimize=True, progressive=True)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    build_earth()
    build_moon()
    build_mercury()
