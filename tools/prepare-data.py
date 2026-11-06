"""Extract Night of the Zealot data and cache card art for offline play."""
import concurrent.futures
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
PLAYER_CODES = ['01016', '01017', '01018', '01019', '01020', '01025', '01030',
                '01022', '01023', '01039', '01086', '01087', '01088', '01089', '01090', '01091', '01092', '01093']
players = json.loads((ROOT / 'tools/core.json').read_text(encoding='utf-8-sig'))
encounters = json.loads((ROOT / 'tools/core-encounter.json').read_text(encoding='utf-8-sig'))
CAMPAIGN_PLAYERS = ['01001', '01003', '01006', '01007', '01010', '01011', '01048', '01049', '01026', '01027', '01028', '01043',
                    '01050', '01094', '01095', '01097', '01098', '01099', '01100']
permanents = json.loads((ROOT / 'tools/permanent-cards.json').read_text(encoding='utf-8'))
bonded = json.loads((ROOT / 'tools/bonded-cards.json').read_text(encoding='utf-8'))
timing = json.loads((ROOT / 'tools/timing-cards.json').read_text(encoding='utf-8'))
selected = [c for c in players if c['code'] in PLAYER_CODES + CAMPAIGN_PLAYERS] + encounters + permanents + bonded + timing
data = {c['code']: c for c in selected}
(ROOT / 'dist/cards.json').write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
(ROOT / 'dist/assets').mkdir(exist_ok=True)

def download(code):
    target = ROOT / 'dist/assets' / f'{code}.png'
    if target.exists():
        return
    source = '01121' if code == '01121a' else code
    url = f'https://arkhamdb.com/bundles/cards/{source}.png'
    try:
        with urllib.request.urlopen(url, timeout=40) as response:
            payload = response.read()
        if not payload.startswith(b'\x89PNG') and not payload.startswith(b'\xff\xd8'):
            raise ValueError('Response is not a card image')
        target.write_bytes(payload)
    except Exception as error:
        print(f'ASSET FAILED {code}: {error}')
        raise

codes = [code for code in data if code not in {'01022', '01023', '01050', '01086', '02158', '05313', '05314', '05316', '05317', '53002'}]  # Local text faces.
codes += [c['code'] + 'b' for c in selected if c.get('double_sided')]
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    list(pool.map(download, codes))
print(f'Prepared {len(data)} cards and {len(codes)} local images.')
