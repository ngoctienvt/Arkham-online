"""Extract the English narrative for the three base Night of the Zealot scenarios."""
import argparse
import json
import re
from html.parser import HTMLParser
from pathlib import Path


class NarrativeText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_endtag(self, tag):
        if tag in {'p', 'h1', 'h2', 'li', 'div'}:
            self.parts.append('\n')

    def handle_data(self, data):
        self.parts.append(data)


def narrative(source):
    parser = NarrativeText()
    parser.feed(source)
    # The game displays awarded XP from the actual outcome, including modifiers.
    parts = (line.strip() for line in ''.join(parser.parts).splitlines())
    return '\n'.join(re.sub(r'([*_])([^*_]+)\1', r'\2', line)
                     for line in parts if line and '{xp}' not in line)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    args = parser.parse_args()
    source = args.source / 'frontend/src/locales/en/nightOfTheZealot'
    campaign = json.loads((source / 'base.json').read_bytes())
    stories = {}
    for code, name in [('01104', 'theGathering'), ('01120', 'theMidnightMasks'), ('01142', 'theDevourerBelow')]:
        scenario = json.loads((source / f'scenarios/{name}.json').read_bytes())
        intro = scenario['intro']
        body = intro['body'] if code != '01120' else scenario['intro2'] + scenario['intro3']
        stories[code] = {
            'intro': {'title': intro['title'], 'body': narrative(body)},
            'ending': {key: {'title': entry['title'], 'body': narrative(entry['body'])}
                       for key, entry in scenario['resolutions'].items() if 'body' in entry},
        }
    data = {'prologue': narrative(campaign['prologue']), 'scenarios': stories}
    target = Path(__file__).resolve().parent.parent / 'dist/campaign-story-en.js'
    target.write_text('// Extracted by tools/extract-notz-en.py from the reference EN locale.\n'
                      'export const campaignStoryEn = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n',
                      encoding='utf-8', newline='\n')


if __name__ == '__main__':
    main()
