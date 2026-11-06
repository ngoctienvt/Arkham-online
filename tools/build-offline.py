"""Create a self-contained file:// game. No runtime, server, or network required."""
import base64
import json
from pathlib import Path
import re

root = Path(__file__).resolve().parent.parent
dist = root / 'dist'
modules = ['rules-data', 'optional-rules', 'command-actor', 'command-schema', 'ui-utils', 'card-library', 'card-printings', 'deck-library', 'deck-remote-client', 'deck-editor', 'bonded-cards', 'timing-rules', 'campaign-data', 'sandbox', 'campaign-card-vi', 'campaign-story-vi', 'campaign-story-en', 'campaign', 'campaign-encounters', 'campaign-actions', 'campaign-rounds', 'campaign-view', 'scene-data', 'actions', 'effects', 'scenario', 'skill-tests', 'engine', 'game-history', 'investigator-state', 'save-slots', 'debug-report', 'scene-view', 'location-actions', 'house-map', 'table-cards', 'view', 'test-presentation', 'dialogs', 'scene-controller', 'map-controller', 'app']
art = {}
for path in sorted((dist / 'assets').glob('*.png')):
    data = path.read_bytes()
    mime = 'image/png' if data.startswith(b'\x89PNG') else 'image/jpeg'
    art[path.stem] = f'data:{mime};base64,' + base64.b64encode(data).decode('ascii')
parts = ['const ART = ' + json.dumps(art) + ';']
scene_art = {}
for path in sorted((dist / 'scene-art').glob('*.png')):
    scene_art[path.stem] = 'data:image/png;base64,' + base64.b64encode(path.read_bytes()).decode('ascii')
parts.append('const SCENE_ART = ' + json.dumps(scene_art) + ';')
cards = json.loads((dist / 'cards.json').read_text(encoding='utf-8-sig'))
for name in modules:
    source = (dist / f'{name}.js').read_text(encoding='utf-8-sig')
    source = re.sub(r'^import .*?;\s*$', '', source, flags=re.MULTILINE)
    source = re.sub(r'^export \{.*?\} from .*?;\s*$', '', source, flags=re.MULTILINE)
    source = re.sub(r'\bexport (?=(?:const|function|class)\b)', '', source)
    if name == 'deck-remote-client':
        source = "const remoteDeckAvailable=false;\nfunction loadRemoteDeck(){throw Error('Offline build');}"
    if name == 'ui-utils':
        expected = 'src="assets/${esc(code)}.png"'
        if expected not in source:
            raise ValueError('Card image renderer changed; update offline bundler.')
        source = source.replace(expected, 'src="${ART[code]}"')
        source = source.replace('`scene-art/${name}.png`', 'SCENE_ART[name]')
    if name == 'app':
        source, count = re.subn(r" const response=await fetch\('cards.json'\);.*? const cards=await response.json\(\);", lambda match: ' const cards=' + json.dumps(cards, ensure_ascii=True) + ';', source, count=1, flags=re.DOTALL)
        if count != 1:
            raise ValueError('Data loader changed; update offline bundler.')
    parts.append(source)
bundle = '\n'.join(parts)
if 'fetch(' in bundle or re.search(r'^import ', bundle, re.MULTILINE):
    raise ValueError('Offline bundle still has network or import dependencies.')
outputs = root / 'outputs'
outputs.mkdir(exist_ok=True)
(outputs / 'offline-bundle.mjs').write_text(bundle, encoding='utf-8')
html = (dist / 'index.html').read_text(encoding='utf-8')
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>' + (dist / 'style.css').read_text(encoding='utf-8-sig') + '</style>')
scene_css = (dist / 'scene.css').read_text(encoding='utf-8-sig')
for expression in re.findall(r'calc\([^)]*\)', scene_css):
    if re.search(r'\s[+-](?=\d)', expression):
        raise ValueError(f'CSS calc requires whitespace after binary operators: {expression}')
html = html.replace('<link rel="stylesheet" href="scene.css">', '<style>' + scene_css + '</style>')
html = html.replace('<link rel="stylesheet" href="house-map.css">', '<style>' + (dist / 'house-map.css').read_text(encoding='utf-8-sig') + '</style>')
html = html.replace('<script type="module" src="app.js"></script>', '<script type="module">' + bundle.replace('</script', '<\\/script') + '</script>')
# Avoid navigating away from file:// play when the brand is clicked.
html = html.replace('class="brand" href="./"', 'class="brand" href="#"')
target = root / 'the-gathering-offline.html'
target.write_text(html, encoding='utf-8')
print(f'Built {target.name}: {target.stat().st_size:,} bytes, {len(art)} embedded images, {len(cards)} cards.')
