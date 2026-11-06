"""Index scenario source evidence without interpreting Haskell or inferring campaign order."""
import json
import re
from collections import defaultdict


PATTERNS = {
    'setup': r'\b(?:runScenarioSetup|startAt|placeAll|setAside)\b',
    'encounterSets': r'\bgather\s+(?:\w+\.)?(\w+)',
    'actAgenda': r'\b(?:setActDeck|setAgendaDeck|advanceToAct|advanceToAgenda)\w*\b',
    'layout': r'^\s*(?:scenario(?:With)?|sideStory\w*)\b|\b(?:locationLayout|setLayout|setScenarioLayout)\b',
    'tokenRules': r'\b(?:getChaosTokenValue|ResolveChaosToken|setChaosTokens)\b',
    'story': r'\b(?:storyI|storyWithTitle|PreScenarioSetup|flavor)\b',
    'campaignLog': r'\b(?:record|recordSetInsert|remember|setGlobal)\s+(\w+)',
    'resolution': r'\b(?:ScenarioResolution|resolutionWithXp|endOfScenario)\b',
}


def normalized(value):
    return re.sub(r'[^a-z0-9]', '', value.lower())


def scenario_evidence(root, locales, scenarios):
    locale_index = defaultdict(list)
    for path in sorted(locales.rglob('*.json')):
        if 'scenarios' in path.relative_to(locales).parts:
            locale_index[normalized(path.stem)].append(path)

    evidence = {}
    for code, scenario in scenarios.items():
        path = root / scenario['source']
        lines = path.read_text(encoding='utf-8').splitlines()
        source_references = {}
        for tag, pattern in PATTERNS.items():
            hits = []
            for line, text in enumerate(lines, 1):
                source = text.split('--', 1)[0]
                for match in re.finditer(pattern, source):
                    hits.append({'line': line, 'symbol': (match[1] if match.lastindex else match[0]).strip()})
            if hits:
                source_references[tag] = hits

        candidates = locale_index[normalized(scenario['builder'])]
        if not candidates and scenario['category'] == 'return-to':
            candidates = locale_index[normalized(scenario['builder'].removeprefix('returnTo'))]
        locale_candidates = []
        for candidate in candidates:
            data = json.loads(candidate.read_bytes())
            locale_candidates.append({
                'path': candidate.relative_to(root).as_posix(),
                'keys': sorted(data) if isinstance(data, dict) else [],
            })
        evidence[code] = {
            'sourceScope': 'registration-file' if scenario['category'] == 'homebrew' else 'module',
            'sourceReferences': source_references,
            'localeCandidates': locale_candidates,
            'localeMatch': 'candidate' if len(candidates) == 1 else 'ambiguous' if candidates else 'unresolved',
        }
    return evidence
