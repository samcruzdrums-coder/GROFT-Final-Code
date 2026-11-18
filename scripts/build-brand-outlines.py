"""Generate font-independent, tightly cropped SVG artwork for GROFT.

Run with: uv run python scripts/build-brand-outlines.py
The resulting SVGs are runtime assets; Python is not required by the app.
"""
from pathlib import Path
import subprocess
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts/groft/public/brand"
font_path = subprocess.check_output(
    ["fc-match", "-f", "%{file}", "DejaVu Sans:style=Bold"], text=True
)
font = TTFont(font_path)
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()


def outlines(text):
    path = SVGPathPen(glyphs)
    bounds = BoundsPen(glyphs)
    advance = 0
    for char in text:
        glyph = glyphs[cmap[ord(char)]]
        transform = (1, 0, 0, 1, advance, 0)
        glyph.draw(TransformPen(path, transform))
        glyph.draw(TransformPen(bounds, transform))
        advance += glyph.width
    return path.getCommands(), bounds.bounds


gradient = (
    '<linearGradient id="word"><stop stop-color="#10ac35"/>'
    '<stop offset=".48" stop-color="#168e49"/>'
    '<stop offset="1" stop-color="#07536a"/></linearGradient>'
)


def label(filename, text, height):
    path, (x0, y0, x1, y1) = outlines(text)
    scale = height / (y1 - y0)
    width = (x1 - x0) * scale
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width+2:.3f}" '
        f'height="{height+2}" viewBox="0 0 {width+2:.3f} {height+2}">'
        f'<defs>{gradient}</defs>'
        f'<g fill="url(#word)"><path transform="translate(1 1) scale({scale}) '
        f'translate({-x0} {y1}) scale(1 -1)" d="{path}"/></g></svg>\n'
    )
    (OUT / filename).write_text(svg)


label("view-globe.svg", "GLOBE", 24)
label("view-index.svg", "INDEX", 24)
label("view-saved.svg", "SAVED TRADITIONS", 24)
label("groft-tagline.svg", "the global repository of folkloric traditions", 28)

path, (x0, y0, x1, y1) = outlines("GROFT")
scale = 582 / (x1 - x0)
top = 202.5 - (y1 - y0) * scale / 2
(OUT / "groft-logo.svg").write_text(
    '<svg xmlns="http://www.w3.org/2000/svg" width="897" height="405" viewBox="0 0 897 405">'
    '<defs><linearGradient id="disc"><stop stop-color="#424444"/>'
    '<stop offset=".5" stop-color="#8d8e8d"/><stop offset="1" stop-color="#e7e4e5"/>'
    '</linearGradient><linearGradient id="triangle"><stop stop-color="#12c21c"/>'
    '<stop offset=".55" stop-color="#098650"/><stop offset="1" stop-color="#003865"/>'
    f'</linearGradient>{gradient}</defs>'
    '<circle cx="202.5" cy="202.5" r="201.5" fill="url(#disc)"/>'
    '<path d="M63 118L306 116L186 327Z" fill="url(#triangle)"/>'
    f'<g fill="url(#word)"><path transform="translate(310 {top}) scale({scale}) '
    f'translate({-x0} {y1}) scale(1 -1)" d="{path}"/></g></svg>\n'
)
print("Generated five outlined SVGs without font dependencies or stretched glyphs.")
