import json
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image


repo = Path(__file__).resolve().parents[2]
assets = repo / 'meu-fluxo-app' / 'icons'
res = repo / 'android-app' / 'android' / 'app' / 'src' / 'main' / 'res'
manifest = json.loads((assets.parent / 'manifest.webmanifest').read_text(encoding='utf-8'))
color = manifest['theme_color']
launcher = Image.open(assets / 'icon-512.png').convert('RGBA')
foreground = Image.open(assets / 'icon-foreground.png').convert('RGBA')

for density, legacy, adaptive in [
    ('mdpi', 48, 108), ('hdpi', 72, 162), ('xhdpi', 96, 216),
    ('xxhdpi', 144, 324), ('xxxhdpi', 192, 432),
]:
    directory = res / f'mipmap-{density}'
    directory.mkdir(parents=True, exist_ok=True)
    legacy_image = launcher.resize((legacy, legacy), Image.Resampling.LANCZOS)
    legacy_image.save(directory / 'ic_launcher.png')
    legacy_image.save(directory / 'ic_launcher_round.png')
    foreground.resize((adaptive, adaptive), Image.Resampling.LANCZOS).save(directory / 'ic_launcher_foreground.png')

(res / 'values' / 'ic_launcher_background.xml').write_text(
    f'<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="ic_launcher_background">{color}</color></resources>\n',
    encoding='utf-8',
)
style_file = res / 'values' / 'styles.xml'
tree = ET.parse(style_file)
launch = tree.getroot().find("style[@name='AppTheme.NoActionBarLaunch']")
if launch is None:
    raise RuntimeError('Tema inicial Android não encontrado')
for item in list(launch):
    launch.remove(item)
for name, value in [
    ('windowSplashScreenBackground', color),
    ('windowSplashScreenAnimatedIcon', '@mipmap/ic_launcher'),
    ('postSplashScreenTheme', '@style/AppTheme.NoActionBar'),
    ('android:background', color),
]:
    ET.SubElement(launch, 'item', {'name': name}).text = value
ET.indent(tree, space='    ')
tree.write(style_file, encoding='utf-8', xml_declaration=True)
