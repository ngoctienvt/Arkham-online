import {readFile, readdir} from 'node:fs/promises';
import {CAMPAIGNS, SCENARIOS} from '../dist/campaign-data.js';
import {campaignStoryEn} from '../dist/campaign-story-en.js';
import {hasCardEffectFixture} from '../dist/card-library.js';
import {hasLocalTextFace} from '../dist/ui-utils.js';
import {roundSteps, windowPoints} from '../dist/effects.js';
import {alternatePrintings} from '../dist/card-printings.js';

const root=new URL('../',import.meta.url);
const manifestPath='plans/261105-2030-campaign-rules-parity/source-inventory.json';
const load=async path=>JSON.parse(await readFile(new URL(path,root),'utf8'));
const missing=(source,runtime)=>Object.keys(source).filter(code=>!Object.hasOwn(runtime,code)).sort();
const sorted=values=>[...values].sort();
const hasImage=(assets,code)=>assets.has(code+'.png');

function registryCoverage(registry,cards){
 const rows=Object.values(registry.symbols);
 const codesFor=row=>[row.canonical,...row.alternateCodes];
 return {
  source:registry.source,
  excludes:registry.excludes,
  definitions:rows.length,
  registeredCodes:new Set(rows.flatMap(codesFor)).size,
  overlappingCodes:registry.overlappingCodes,
  missingFromExport:registry.missingFromExport,
  missingFromRuntime:sorted(rows.filter(row=>!codesFor(row).some(code=>
   Object.hasOwn(cards,code)&&!Object.hasOwn(registry.overlappingCodes,code))).map(row=>row.canonical))
 };
}

async function main(){
 const [manifest,cards,files]=await Promise.all([
  load(manifestPath),load('dist/cards.json'),readdir(new URL('dist/assets/',root))
 ]);
 const images=new Set(files);
 const cardCodes=Object.keys(cards);
 const registries=Object.fromEntries(Object.entries(manifest.cardRegistries)
  .map(([name,registry])=>[name,registryCoverage(registry,cards)]));
 const report={
  schemaVersion:1,
  sourceFingerprint:manifest.fingerprint,
  denominator:{
   campaigns:Object.keys(manifest.campaigns).length,
   scenarios:Object.keys(manifest.scenarios).length,
   scenarioAliases:Object.keys(manifest.scenarioAliases).length,
   cardCodes:Object.keys(manifest.cardCatalog).length,
   cardSource:manifest.cardCatalogSummary.source,
   cardRegistryReconciled:false
  },
  campaigns:{registered:sorted(Object.keys(CAMPAIGNS)),missing:missing(manifest.campaigns,CAMPAIGNS)},
  scenarios:{
   registered:sorted(Object.keys(SCENARIOS)),
   englishNarrative:sorted(Object.keys(campaignStoryEn.scenarios)),
   unresolvedSourceLocale:sorted(Object.entries(manifest.scenarioEvidence??{})
    .filter(([,entry])=>entry.localeMatch!=='candidate').map(([code])=>code)),
   missing:missing(manifest.scenarios,SCENARIOS),
   aliases:Object.entries(manifest.scenarioAliases).map(([alias,canonical])=>({
    alias,canonical,canonicalRegistered:Object.hasOwn(SCENARIOS,canonical)
   }))
  },
  timing:{namedSteps:sorted(new Set(Object.values(roundSteps))),namedWindows:sorted(new Set(Object.values(windowPoints)))},
  verification:{
   timingAndReplay:'tests/engine.test.mjs',
   saveMigration:'tests/save-slots.test.mjs',
   sandboxReport:'tests/sandbox.test.mjs',
   scenarioTransitions:'tests/campaign.test.mjs',
   offlineBuild:'tools/build-offline.py',
   pending:['desktop/mobile browser acceptance','two-to-four-seat playthrough','online playthrough']
  },
  cards:{
   ...registries,
   packaged:cardCodes.length,
   outsideExport:missing(cards,manifest.cardCatalog),
   missing:missing(manifest.cardCatalog,cards),
   recognizedAlternatePrintings:sorted(Object.keys(alternatePrintings)),
   withTrackedEffectFixture:sorted(cardCodes.filter(hasCardEffectFixture)),
   withoutTrackedEffectFixture:sorted(cardCodes.filter(code=>!hasCardEffectFixture(code))),
   textFaces:sorted(cardCodes.filter(hasLocalTextFace)),
   missingFrontArt:sorted(cardCodes.filter(code=>!hasImage(images,code)&&!hasLocalTextFace(code))),
   missingBackArt:sorted(cardCodes.filter(code=>cards[code].double_sided&&!hasImage(images,code+'b')))
  }
 };
 if(process.argv.includes('--summary')){
  const {denominator,campaigns,scenarios,cards}=report;
  console.log(`Campaigns registered: ${campaigns.registered.length}/${denominator.campaigns}`);
  console.log(`Scenarios registered: ${scenarios.registered.length}/${denominator.scenarios}; ${scenarios.englishNarrative.length} with English narrative`);
  console.log(`Card codes packaged: ${cards.packaged}; ${cards.outsideExport.length} outside the source export`);
  console.log(`Card codes missing from runtime: ${cards.missing.length}/${denominator.cardCodes} (MCP export; registry reconciliation pending)`);
  for(const [label,coverage] of [['Skills',registries.builtInPlayerSkills],['Events',registries.builtInPlayerEvents]]){
   const {definitions,missingFromRuntime,registeredCodes,missingFromExport,overlappingCodes}=coverage;
   console.log(`Built-in player ${label}: ${definitions-missingFromRuntime.length}/${definitions} definitions packaged; ${registeredCodes} registered codes, ${missingFromExport.length} absent from MCP, ${Object.keys(overlappingCodes).length} overlapping`);
  }
  console.log(`Effect fixtures tracked by code: ${cards.withTrackedEffectFixture.length}; untracked: ${cards.withoutTrackedEffectFixture.length}`);
  console.log(`Art gaps: ${cards.missingFrontArt.length} fronts, ${cards.missingBackArt.length} backs; ${cards.textFaces.length} local text faces`);
 }else console.log(JSON.stringify(report,null,2));
}

await main();
