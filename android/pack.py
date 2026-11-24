import sys
import zipfile

src, dex, out = sys.argv[1], sys.argv[2], sys.argv[3]

with zipfile.ZipFile(src) as zin, zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zout:
    for info in zin.infolist():
        data = zin.read(info.filename)
        zi = zipfile.ZipInfo(info.filename, date_time=info.date_time)
        zi.external_attr = info.external_attr
        # resources.arsc must stay uncompressed and aligned for API 30+
        zi.compress_type = (
            zipfile.ZIP_STORED if info.filename == "resources.arsc" else zipfile.ZIP_DEFLATED
        )
        zout.writestr(zi, data)

    with open(dex, "rb") as f:
        dex_data = f.read()

    zi = zipfile.ZipInfo("classes.dex", date_time=(2024, 1, 1, 0, 0, 0))
    zi.external_attr = 0o600 << 16
    zi.compress_type = zipfile.ZIP_STORED
    zout.writestr(zi, dex_data)

print("packed ->", out)
