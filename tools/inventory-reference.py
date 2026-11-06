"""Summarize source modules and EN locales for planning, without executing source code."""
import argparse
import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path
from scenario_evidence import scenario_evidence


def source_group(root, relative):
    return sorted((root / relative).rglob('*.hs'))


def built_in_player_registry(root, kind, registry, definitions, catalog):
    text = registry.read_text(encoding='utf-8')
    homebrew = f'Homebrew.player{kind}sMap'
    match = re.search(rf'^allPlayer{kind}Cards =\s*\({re.escape(homebrew)} <>\)\s*\$\s*'
                      r'mapFromList\s*\$ concatMap\s+toCardCodePairs\s*\[([^]]+)\]', text, re.M)
    if not match:
        raise ValueError(f'unsupported allPlayer{kind}Cards registry')
    counts = Counter(symbol.strip() for symbol in match[1].split(','))
    symbols = counts.keys()
    rows = {}
    constructors = {
        'Skill': 'skill',
        'Event': 'event|multiClassEvent|weakness|basicWeakness',
        'Asset': 'asset|multiClassAsset|weakness|basicWeakness|storyWeakness|storyAsset(?:_|WithMany)?',
    }
    for path in definitions:
        text = path.read_text(encoding='utf-8')
        blocks = re.split(r'^([a-z]\w*)\s*::[^\n]*\n', text, flags=re.M)
        for symbol, body in zip(blocks[1::2], blocks[2::2]):
            if symbol not in symbols:
                continue
            codes = re.findall(rf'\b(?:{constructors[kind]})\s+"([^"]+)"', body)
            if len(codes) != 1:
                raise ValueError(f'cannot resolve player {kind} {symbol}: {codes}')
            alternates = re.findall(r'withAlternate\s+"([^"]+)"', body)
            for group in re.findall(r'(?:cdAlternateCardCodes\s*=|withAlternates)\s*\[([^]]*)\]', body):
                alternates.extend(re.findall(r'"([^"]+)"', group))
            if symbol in rows:
                raise ValueError(f'duplicate player {kind} definition {symbol}')
            rows[symbol] = {'canonical': codes[0], 'alternateCodes': alternates,
                            'source': path.relative_to(root).as_posix()}
    if missing := sorted(set(symbols) - rows.keys()):
        raise ValueError(f'unresolved player {kind} registry symbols: {missing}')
    codes = {}
    for symbol in symbols:
        row = rows[symbol]
        for code in [row['canonical'], *row['alternateCodes']]:
            codes.setdefault(code, []).append(symbol)
    return {'source': registry.relative_to(root).as_posix(),
            'excludes': [homebrew],
            'symbols': dict(sorted(rows.items())),
            'repeatedSymbols': {symbol: count for symbol, count in sorted(counts.items()) if count > 1},
            'overlappingCodes': {code: owners for code, owners in sorted(codes.items()) if len(owners) > 1},
            'missingFromExport': sorted(codes.keys() - catalog.keys())}


def fingerprint(root, paths):
    digest = hashlib.sha256()
    for path in sorted(set(paths)):
        digest.update(path.relative_to(root).as_posix().encode())
        digest.update(b'\0')
        digest.update(b'directory' if path.is_dir() else hashlib.sha256(path.read_bytes()).digest())
    return digest.hexdigest()


def unique_rows(rows, label):
    result = {}
    for code, row in rows:
        if code in result:
            raise ValueError(f'duplicate {label} ID: {code}')
        result[code] = row
    return dict(sorted(result.items()))


def source_registries(root, backend, scenario_files, homebrew_files, frontend):
    campaign_file = backend / 'Campaign.hs'
    scenario_file = backend / 'Scenario.hs'
    campaign_text = campaign_file.read_text(encoding='utf-8')
    scenario_text = scenario_file.read_text(encoding='utf-8')
    frontend_rows = [(c['id'], c) for c in frontend]
    frontend_rows.extend((variant['id'], {**c, **variant}) for c in frontend
                         if isinstance(variant := c.get('returnTo'), dict))
    frontend_by_id = unique_rows(frontend_rows, 'frontend campaign')

    def origin(path):
        return path.relative_to(root).as_posix()

    def campaign(code, builder, path):
        meta = frontend_by_id.get(code, {})
        category = ('homebrew' if code.startswith(':') else 'return-to' if builder.startswith('returnTo')
                    else 'standalone' if code in {'00', '83'}
                    else 'campaign')
        return dict(builder=builder, source=origin(path), category=category, name=meta.get('name'),
                    difficultyLevels=meta.get('difficultyLevels'), owner='campaign', status='verify')

    campaigns = [(code, campaign(code, builder, campaign_file)) for code, builder in re.findall(
        r'\("([^"]+)",\s*SomeCampaign\s+(\w+)\)', campaign_text)]
    scenarios = []
    unresolved = []
    for path in scenario_files:
        source = path.read_text(encoding='utf-8')
        for builder, typ in re.findall(r'^([a-z]\w*)\s*::\s*Difficulty\s*->\s*([A-Z]\w*)\s*$', source, re.M):
            match = re.search(
                rf'^{builder}\b[^\n]*?=\s*(scenario(?:With)?|sideStory\w*)\s+'
                rf'(?:{typ}\b|\(\s*{typ}\b[^"]*\))\s+"([^"]+)"\s+"([^"]+)"',
                source, re.M)
            if not match:
                unresolved.append(dict(source=origin(path), builder=builder))
                continue
            constructor, code, name = match.groups()
            category = ('return-to' if builder.startswith('returnTo') else
                        'standalone-or-challenge' if constructor.startswith('sideStory') else 'campaign')
            scenarios.append((code, dict(name=name, builder=builder, source=origin(path),
                                         category=category, owner='scenario', status='verify')))
    for path in homebrew_files:
        source = path.read_text(encoding='utf-8')
        for code, builder in re.findall(r'\(\s*"([^"]+)"\s*,\s*HomebrewCampaign\s+(\w+)', source):
            campaigns.append((code, campaign(code, builder, path)))
        for code, encounter, builder in re.findall(
                r'\(\s*"([^"]+)"\s*,\s*HomebrewScenario\s+(\w+)\s+(\w+)', source):
            scenarios.append((code, dict(builder=builder, encounterSet=encounter, source=origin(path),
                                         category='homebrew', owner='scenario', status='verify')))
    campaigns = unique_rows(campaigns, 'campaign')
    scenarios = unique_rows(scenarios, 'scenario')
    aliases_block = re.search(r'^scenarioCardCodeAliases = (.+)$', scenario_text, re.M)
    aliases = unique_rows(re.findall(r'\("([^"]+)",\s*"([^"]+)"\)', aliases_block[1]), 'alias')
    for alias, canonical in aliases.items():
        if canonical not in scenarios or alias in scenarios:
            raise ValueError(f'invalid scenario alias: {alias} -> {canonical}')
    if not campaigns or not scenarios:
        raise ValueError('no campaign or scenario registry entries found')
    return dict(campaigns=campaigns, scenarios=scenarios, scenarioAliases=aliases,
                unresolvedScenarioBuilders=unresolved,
                frontendOnlyCampaigns=sorted(frontend_by_id.keys() - campaigns.keys()))


def card_catalog(cards):
    records = {}
    ids = set()
    for card in cards:
        code, quantity, row_id = card['code'], card['quantity'], card['id']
        if not isinstance(code, str) or not code or type(quantity) is not int or quantity < 0:
            raise ValueError(f'invalid card code or quantity: {code!r}, {quantity!r}')
        if not isinstance(row_id, str) or not row_id or row_id in ids:
            raise ValueError(f'invalid or duplicate card row ID: {row_id!r}')
        ids.add(row_id)
        records.setdefault(code, []).append({
            'id': card['id'], 'type': card['type_code'], 'pack': card.get('pack_code'),
            'encounterSet': card.get('encounter_code'), 'quantity': quantity,
            'doubleSided': card.get('double_sided', False), 'official': card.get('official'),
        })
    return dict(sorted(records.items()))


def gathering_sample(scenario, campaigns, catalog, load, root):
    locale = 'frontend/src/locales/en/nightOfTheZealot/scenarios/theGathering.json'
    code_sets = ('rats', 'ghouls', 'striking_fear', 'ancient_evils', 'chilling_cold')
    acts = ['01108', '01109', '01110']
    agendas = ['01105', '01106', '01107']
    set_aside = ['01112', '01113', '01114', '01115', '01116', '01117']
    encounter = {}
    for code, rows in catalog.items():
        for row in rows:
            if row['pack'] == 'core' and (row['encounterSet'] in code_sets or code in {'01118', '01119'}):
                if code in encounter or row['quantity'] < 1:
                    raise ValueError(f'invalid Gathering encounter quantity for {code}')
                encounter[code] = row['quantity']
    for code in (*acts, *agendas, *set_aside, '01111', '01104'):
        if code not in catalog:
            raise ValueError(f'missing Gathering card: {code}')
    layout = re.search(r'^\s*\[\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\]',
                       (root / scenario['source']).read_text(encoding='utf-8'), re.M)
    if not layout:
        raise ValueError('The Gathering source layout was not found')
    locale_keys = load(locale)
    return dict(campaignId='01', source=scenario['source'], locale=locale,
                encounterSets=['torch', *code_sets], encounterDeck=encounter, acts=acts,
                agendas=agendas, setAside=set_aside, startLocation='01111',
                layout=[row.split() for row in layout.groups()], nextScenario='01120',
                difficultyLevels=campaigns['01']['difficultyLevels'],
                resolutionLocaleKeys=sorted(locale_keys['resolutions']))


def notz_followup_samples(registries, catalog, load):
    locale_root = 'frontend/src/locales/en/nightOfTheZealot/scenarios'
    samples = {
        '01120': {
            'locale': f'{locale_root}/theMidnightMasks.json',
            'encounterSets': ['arkham', 'chilling_cold', 'nightgaunts', 'locked_doors', 'pentagram'],
            'acts': ['01123'], 'agendas': ['01121a', '01122'],
            'cultistDeck': ['01137', '01138', '01139', '01140', '01141'],
            'startLocations': {'houseBurned': '01125', 'houseStanding': '01124'},
            'randomLocations': [['01126', '01127'], ['01130', '01131']],
            'setAside': ['01121b'],
            'setupRules': {'preplacedAcolytes': 'investigatorCount - 1', 'priestIfAlive': '01116'},
            'nextScenario': '01142',
        },
        '01142': {
            'locale': f'{locale_root}/theDevourerBelow.json',
            'encounterSets': ['tentacles', 'ancient_evils', 'striking_fear', 'ghouls', 'pentagram'],
            'randomEncounterSets': ['agents_of_yog', 'agents_of_shub', 'agents_of_cthulhu', 'agents_of_hastur'],
            'acts': ['01146', '01147', '01148'], 'agendas': ['01143', '01144', '01145'],
            'setAside': ['01156', '01157'], 'startLocation': '01149',
            'randomLocations': [['01150', '01151', '01152', '01153', '01154', '01155']],
            'setupRules': {'woodsCount': 4, 'doom': 'ceil(cultistsWhoGotAway / 2)', 'lateDiscard': 2,
                           'addToken': 'elder_thing', 'priestIfAlive': '01116'},
            'nextScenario': None,
        },
    }
    for code, sample in samples.items():
        for card in [*sample['acts'], *sample['agendas'], *sample.get('setAside', []),
                     *sample.get('cultistDeck', []), *sample.get('startLocations', {}).values(),
                     *([sample['startLocation']] if 'startLocation' in sample else []),
                     *(card for group in sample['randomLocations'] for card in group)]:
            lookup = '01121' if card in {'01121a', '01121b'} else card
            if card not in catalog and lookup not in catalog:  # MCP groups both faces as 01121.
                raise ValueError(f'missing {code} setup card: {card}')
        sample.update(campaignId='01', source=registries['scenarios'][code]['source'],
                      resolutionLocaleKeys=sorted(load(sample['locale'])['resolutions']))
    return samples


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--output', type=Path, help='write manifest as UTF-8 instead of stdout')
    args = parser.parse_args()
    root = args.source.resolve()
    backend = root / 'backend/arkham-api/library/Arkham'
    locales = root / 'frontend/src/locales/en'
    if not (backend / 'Phase.hs').is_file() or not (locales / 'cards.json').is_file():
        parser.error('expected Arkham backend and frontend EN locales under source')

    campaign_path = backend / 'Campaign/Campaigns'
    scenario_path = backend / 'Scenario/Scenarios'
    campaigns = sorted(path.stem for path in campaign_path.glob('*.hs'))
    groups = {}
    for path in source_group(backend, 'Scenario/Scenarios'):
        parts = path.relative_to(scenario_path).parts
        group = parts[0] if len(parts) > 1 else '(standalone modules)'
        groups.setdefault(group, []).append('/'.join(parts[1:] if len(parts) > 1 else parts))

    card_paths = (
        'Asset/Assets', 'Event/Events', 'Skill/Cards', 'Treachery/Cards',
        'Enemy/Cards', 'Location/Cards', 'Investigator/Cards', 'Act/Cards', 'Agenda/Cards',
    )
    groups_to_hash = [
        source_group(backend, relative) for relative in (
            'Campaign/Campaigns', 'Scenario/Scenarios', *card_paths
        )
    ]
    reference_files = [path for group in groups_to_hash for path in group]
    reference_files.extend(path for path in locales.rglob('*') if path.suffix in ('.json', '.ts'))
    reference_files.extend(root / path for path in (
        'README.md', 'frontend/src/arkham/data/campaigns.json', 'mcp/data/cards.json',
        'backend/cards-discover/library/Cards/Discover/Exe.hs',
    ))
    homebrew_files = sorted((backend / 'Homebrew').glob('*/Content.hs'))
    frontend_homebrew = sorted(p for p in (root / 'frontend/homebrew').iterdir() if p.is_dir())
    locale_directories = sorted(p for p in locales.iterdir() if p.is_dir())
    reference_files.extend([backend / 'Campaign.hs', backend / 'Scenario.hs', *homebrew_files])
    reference_files.extend([*frontend_homebrew, *locale_directories])
    load = lambda path: json.loads((root / path).read_bytes())
    registries = source_registries(root, backend, groups_to_hash[1], homebrew_files,
                                 load('frontend/src/arkham/data/campaigns.json'))
    cards = load('mcp/data/cards.json')['data']['all_card']
    catalog = card_catalog(cards)
    card_registries = {}
    reference_files.append(backend / 'Card/CardDef.hs')
    for kind, directory in [('Skill', 'Skill/CardDefs'), ('Event', 'Event/Cards'), ('Asset', 'Asset/Cards')]:
        registry = backend / kind / 'Cards.hs'
        definitions = source_group(backend, directory)
        reference_files.extend([registry, *definitions])
        card_registries[f'builtInPlayer{kind}s'] = built_in_player_registry(
            root, kind, registry, definitions, catalog)
    data = {
        'schemaVersion': 2,
        'fingerprint': fingerprint(root, reference_files),
        'campaignModules': campaigns,
        'scenarioGroups': groups,
        'cardModuleCounts': {
            relative: len(source_group(backend, relative)) for relative in card_paths
        },
        'englishLocaleDirectories': [p.name for p in locale_directories],
        **registries,
        'scenarioEvidence': scenario_evidence(root, locales, registries['scenarios']),
        'scenarioSamples': {'01104': gathering_sample(registries['scenarios']['01104'],
                            registries['campaigns'], catalog, load, root),
                            **notz_followup_samples(registries, catalog, load)},
        'frontendHomebrewDirectories': [p.name for p in frontend_homebrew],
        'cardCatalog': catalog,
        'cardRegistries': card_registries,
        'cardCatalogSummary': {
            'source': 'mcp/data/cards.json',
            'owner': 'card-effects',
            'status': 'verify',
            'rows': len(cards),
            'rowsByType': dict(sorted(Counter(c['type_code'] for c in cards).items())),
            'uniqueCodes': len(catalog),
            'codesWithMultipleRows': sum(len(rows) > 1 for rows in catalog.values()),
            'scenarioIdsMissingCardRows': sorted(registries['scenarios'].keys() - catalog.keys()),
        },
    }
    output = json.dumps(data, indent=2) + '\n'
    if args.output:
        args.output.write_text(output, encoding='utf-8', newline='\n')
    else:
        print(output, end='')
    print(f"inventory: {len(registries['campaigns'])} campaigns, {len(registries['scenarios'])} "
          f"scenarios, {len(registries['unresolvedScenarioBuilders'])} unresolved builders, "
          f"{len(catalog)} card codes", file=sys.stderr)


if __name__ == '__main__':
    main()
