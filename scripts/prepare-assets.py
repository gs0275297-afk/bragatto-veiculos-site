"""
Prepara os assets fornecidos pela loja para o seed inicial.

- Não altera os arquivos originais (pastas "imagens empresa" e "veiculos e suas informaçoes").
- Desfoca placas de veículos de terceiros que aparecem ao fundo e molduras de placa
  com identificação de outra loja.
- Remove artefatos de captura de tela (contador "2/8", barra de rolagem).
- Aplica apenas um ajuste leve de nitidez/contraste — sem alterar a aparência do veículo.
- Extrai a logo do avatar do Instagram com fundo transparente.

Uso:  python scripts/prepare-assets.py
Requer: Pillow
"""
from pathlib import Path
from PIL import Image, ImageFilter, ImageEnhance, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC_VEHICLES = ROOT / "veiculos e suas informaçoes"
SRC_BRAND = ROOT / "imagens empresa"
OUT_PHOTOS = ROOT / "seed" / "photos"
OUT_BRAND = ROOT / "public" / "brand"
PREFIX = "WhatsApp Image 2026-10-15 at "

# arquivo -> (saida, crop(l,t,r,b) ou None, [caixas a desfocar])
PHOTOS = {
    # Chevrolet Tracker Premier 2023
    "07.59.32.jpeg": ("tracker-01", None, []),
    "07.59.32 (1).jpeg": ("tracker-02", None, []),
    "07.59.33.jpeg": ("tracker-03", None, []),
    "07.59.34 (1).jpeg": ("tracker-04", None, []),
    "07.59.34.jpeg": ("tracker-05", None, []),
    # Honda Civic EXS 2007/2008
    "07.59.36 (1).jpeg": ("civic-01", None, []),
    "07.59.35 (1).jpeg": ("civic-02", None, []),
    "07.59.36.jpeg": ("civic-03", None, []),
    "07.59.37.jpeg": ("civic-04", None, [(1025, 212, 1145, 282)]),
    "07.59.36 (2).jpeg": ("civic-05", None, []),
    # Chevrolet Onix LT 2013/2013 (hatch)
    "07.59.38 (1).jpeg": ("onix-lt-01", None, []),
    "07.59.37 (2).jpeg": ("onix-lt-02", None, []),
    "07.59.38.jpeg": ("onix-lt-03", None, [(0, 632, 98, 690)]),
    "07.59.40.jpeg": ("onix-lt-04", None, []),
    "07.59.39 (1).jpeg": ("onix-lt-05", None, [(478, 66, 545, 128), (790, 100, 862, 165)]),
    "07.59.39.jpeg": ("onix-lt-06", None, []),
    "07.59.39 (2).jpeg": ("onix-lt-07", None, []),
    "07.59.38 (2).jpeg": ("onix-lt-08", None, []),
    # Chevrolet Onix Sedan LTZ 2024/2025
    "07.59.40 (2).jpeg": ("onix-ltz-01", (0, 0, 1150, 1546), [(1000, 538, 1044, 574)]),
    "07.59.41.jpeg": ("onix-ltz-02", None, []),
    "07.59.41 (1).jpeg": ("onix-ltz-03", None, []),
    "07.59.42.jpeg": ("onix-ltz-04", None, []),
    "07.59.41 (2).jpeg": ("onix-ltz-05", None, []),
    # Citroën C4 Cactus Feel Pack 2022 — fotos feitas em outra loja (rascunho)
    "07.59.43 (2).jpeg": ("cactus-01", (0, 24, 1179, 1056), [(965, 535, 1095, 655)]),
    "07.59.43 (1).jpeg": ("cactus-02", (0, 96, 1179, 1134), [(460, 686, 702, 778), (70, 415, 130, 458)]),
    "07.59.43.jpeg": ("cactus-03", None, [(232, 344, 328, 400), (58, 585, 192, 722)]),
    "07.59.44.jpeg": ("cactus-04", None, [(112, 574, 232, 672)]),
    # Ford Ka Sedan — sem dados cadastrados, fotos feitas em outra loja (rascunho)
    "07.59.44 (2).jpeg": ("ka-01", None, [(132, 692, 258, 801)]),
    "07.59.44 (3).jpeg": ("ka-02", None, [(486, 745, 718, 836), (84, 456, 146, 500), (232, 403, 282, 441)]),
    "07.59.45.jpeg": ("ka-03", None, [(993, 674, 1102, 792)]),
}


def blur_boxes(im: Image.Image, boxes):
    for (l, t, r, b) in boxes:
        region = im.crop((l, t, r, b))
        # pixeliza e desfoca: ilegível sem chamar atenção
        w, h = region.size
        small = region.resize((max(1, w // 10), max(1, h // 10)), Image.BILINEAR)
        region = small.resize((w, h), Image.BILINEAR).filter(ImageFilter.GaussianBlur(4))
        mask = Image.new("L", (w, h), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, h - 1), radius=min(w, h) // 4, fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(2))
        im.paste(region, (l, t), mask)
    return im


def gentle_finish(im: Image.Image) -> Image.Image:
    im = ImageEnhance.Contrast(im).enhance(1.03)
    return im.filter(ImageFilter.UnsharpMask(radius=1.4, percent=30, threshold=3))


def process_photos(preview=False):
    OUT_PHOTOS.mkdir(parents=True, exist_ok=True)
    for name, (out, crop, boxes) in PHOTOS.items():
        im = ImageOps.exif_transpose(Image.open(SRC_VEHICLES / (PREFIX + name))).convert("RGB")
        if preview:
            d = ImageDraw.Draw(im)
            for bx in boxes:
                d.rectangle(bx, outline=(255, 0, 0), width=4)
            if crop:
                d.rectangle(crop, outline=(0, 255, 0), width=4)
        else:
            im = blur_boxes(im, boxes)
            if crop:
                im = im.crop(crop)
            im = gentle_finish(im)
        im.save(OUT_PHOTOS / f"{out}.jpg", quality=93, subsampling=0)
    print(f"{len(PHOTOS)} fotos -> {OUT_PHOTOS}")


def unblend_black(im: Image.Image) -> Image.Image:
    """Converte arte sobre preto em RGBA (alpha = luminância máxima), preservando a aparência sobre fundos escuros."""
    im = im.convert("RGB")
    px = im.load()
    out = Image.new("RGBA", im.size)
    opx = out.load()
    w, h = im.size
    floor = 26  # o fundo do avatar não é preto puro
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            r2, g2, b2 = (max(0, c - floor) * 255 // (255 - floor) for c in (r, g, b))
            a = max(r2, g2, b2)
            if a == 0:
                opx[x, y] = (0, 0, 0, 0)
            else:
                opx[x, y] = (min(255, r2 * 255 // a), min(255, g2 * 255 // a), min(255, b2 * 255 // a), a)
    return out


def process_logo():
    OUT_BRAND.mkdir(parents=True, exist_ok=True)
    src = Image.open(next(SRC_BRAND.glob("*.jpeg"))).convert("RGB")
    # isola o interior do avatar circular (fora dele há o fundo cinza do print)
    inner = Image.new("L", src.size, 0)
    ImageDraw.Draw(inner).ellipse((590 - 384, 492 - 384, 590 + 384, 492 + 384), fill=255)
    src = Image.composite(src, Image.new("RGB", src.size, (0, 0, 0)), inner)
    # lockup completo (emblema + BRAGATTO + VEÍCULOS), dentro do círculo
    lockup = unblend_black(src.crop((228, 222, 952, 734)))
    lockup = lockup.crop(lockup.getbbox())
    lockup.save(OUT_BRAND / "bragatto-logo.png", optimize=True)
    # assinatura horizontal (apenas BRAGATTO VEÍCULOS) para o cabeçalho
    word = lockup.crop((0, 342, lockup.width, lockup.height))
    word = word.crop(word.getbbox())
    word.save(OUT_BRAND / "bragatto-assinatura.png", optimize=True)
    # emblema "VB" isolado
    mark = unblend_black(src.crop((365, 222, 945, 560)))
    mark = mark.crop(mark.getbbox())
    mark.save(OUT_BRAND / "bragatto-emblema.png", optimize=True)
    # avatar circular original (para ícones/OG)
    cx, cy, r = 590, 492, 388
    avatar = src.crop((cx - r, cy - r, cx + r, cy + r))
    mask = Image.new("L", avatar.size, 0)
    ImageDraw.Draw(mask).ellipse((2, 2, 2 * r - 2, 2 * r - 2), fill=255)
    avatar.putalpha(mask)
    avatar.save(OUT_BRAND / "bragatto-avatar.png", optimize=True)
    print("logo ->", OUT_BRAND)


if __name__ == "__main__":
    import sys
    if "--preview" in sys.argv:
        process_photos(preview=True)
    else:
        process_photos()
        process_logo()
