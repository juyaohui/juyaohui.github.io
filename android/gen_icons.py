from PIL import Image, ImageDraw, ImageFont
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
SIZE = 512
TOP = (91, 108, 255)
BOTTOM = (58, 70, 224)

img = Image.new("RGB", (SIZE, SIZE), TOP)
draw = ImageDraw.Draw(img)
for y in range(SIZE):
    t = y / (SIZE - 1)
    color = tuple(int(TOP[i] + (BOTTOM[i] - TOP[i]) * t) for i in range(3))
    draw.line([(0, y), (SIZE, y)], fill=color)

# soft highlight
glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.ellipse((-120, -180, 380, 260), fill=(255, 255, 255, 28))
img = Image.alpha_composite(img.convert("RGBA"), glow)

draw = ImageDraw.Draw(img)
font = None
for candidate in (
    "C:/Windows/Fonts/msyhbd.ttc",
    "C:/Windows/Fonts/msyh.ttc",
    "C:/Windows/Fonts/simhei.ttf",
):
    if os.path.exists(candidate):
        font = ImageFont.truetype(candidate, 300)
        break
if font is None:
    font = ImageFont.load_default()

draw.text((SIZE // 2, SIZE // 2 - 6), "记", font=font, fill=(255, 255, 255, 255), anchor="mm")

# rounded corners
mask = Image.new("L", (SIZE, SIZE), 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, SIZE, SIZE), radius=110, fill=255)
img.putalpha(mask)

img.save(os.path.join(ROOT, "icon.png"))
for name, px in (
    ("mipmap-mdpi", 48),
    ("mipmap-hdpi", 72),
    ("mipmap-xhdpi", 96),
    ("mipmap-xxhdpi", 144),
    ("mipmap-xxxhdpi", 192),
):
    out = os.path.join(ROOT, "app", "res", name, "ic_launcher.png")
    img.resize((px, px), Image.LANCZOS).save(out)
    print("wrote", out)
