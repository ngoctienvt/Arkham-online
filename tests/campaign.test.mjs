import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Engine} from '../dist/engine.js';
import {CULTISTS} from '../dist/campaign-data.js';
import {render} from '../dist/view.js';
import {cardDialog,outcomeDialog,pendingDialog} from '../dist/dialogs.js';

const cards=JSON.parse(readFileSync(new URL('../dist/cards.json',import.meta.url),'utf8'));
const game=()=>new Engine(cards,null,()=>0.5);
const begin=engine=>{
 while(engine.s.pending?.kind==='story')engine.command('continueStory');
 engine.command('mulligan',{indices:[]});
};
const masks=(resolution='R1')=>{
 const engine=game();
 engine.finish(resolution);
 engine.command('nextChapter');
 begin(engine);
 return engine;
};
const forest=(resolution='R1')=>{
 const engine=masks();
 engine.finish(resolution);
 engine.command('nextChapter');
 begin(engine);
 return engine;
};

test('solo setup for Masks and Devourer agrees with the source inventory',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../plans/261105-2030-campaign-rules-parity/source-inventory.json',import.meta.url),'utf8'));
 for(const engine of [masks(),forest()]){
  const sample=manifest.scenarioSamples[engine.chapterInfo().id];
  const sets=[...sample.encounterSets];
  if(sample.randomEncounterSets){
   const selected=sample.randomEncounterSets.filter(set=>
    engine.s.encounter.some(code=>cards[code].encounter_code===set));
   assert.equal(selected.length,1);
   sets.push(...selected);
  }
  const expected=Object.values(cards).filter(card=>sets.includes(card.encounter_code)&&
   ['enemy','treachery'].includes(card.type_code)&&!sample.setAside.includes(card.code))
   .flatMap(card=>Array(card.quantity).fill(card.code));
  expected.push(sample.setupRules.priestIfAlive);
  assert.deepEqual([...engine.s.encounter].sort(),expected.sort());
  assert.equal(engine.here().code,sample.startLocation??sample.startLocations.houseBurned);
  assert.equal(engine.nextScenarioInfo()?.id??null,sample.nextScenario);
 }
});

test('English story follows a saved game through all three scenarios and endings',()=>{
 const engine=game();
 engine.setupCampaign();
 engine.command('selectStoryLanguage',{language:'en'});
 engine.command('selectInvestigator',{code:'01001'});
 assert.match(pendingDialog(engine),/Campaign Prologue/);
 engine.command('continueStory');
 assert.match(pendingDialog(engine),/Part I: The Gathering/);
 engine.finish('R2');
 assert.match(outcomeDialog(engine),/Resolution 2/);
 const loaded=new Engine(cards,JSON.parse(JSON.stringify(engine.s)),()=>0.5);
 loaded.command('nextChapter');
 assert.match(pendingDialog(loaded),/Part II: The Midnight Masks/);
 loaded.finish('R1');
 assert.match(outcomeDialog(loaded),/Resolution 1/);
 loaded.command('nextChapter');
 assert.match(pendingDialog(loaded),/Part III: The Devourer Below/);
 loaded.finish('R3');
 assert.match(outcomeDialog(loaded),/Resolution 3/);
});

test('Elusive uses the saved Taboo list to determine legal destinations',()=>{
 for(const taboo of [false,true]){
  const engine=game();
  engine.setupCampaign();
  if(taboo)engine.command('toggleOptionalRule',{rule:'TabooList25'});
  engine.command('selectInvestigator',{code:'01003'});
  engine.finish('R2');
  engine.command('nextChapter');
  begin(engine);
  if(engine.s.pending?.kind==='window')engine.command('closeWindow');
  engine.s.hand=['01050'];
  engine.revealLocation('downtown');
  engine.spawn('01159');
  const restored=new Engine(cards,JSON.parse(JSON.stringify(engine.s)),()=>0.5);
  restored.command('action',{kind:'play',index:0});
  assert.equal(restored.s.actions,3);
  assert.equal(restored.s.resources,3);
  const destinations=restored.s.pending.options.map(option=>option.ops[0].id);
  assert.deepEqual(destinations,taboo?['rivertown']:['downtown']);
  restored.command('choose',{index:0});
  assert.equal(restored.s.location,taboo?'rivertown':'downtown');
  assert.equal(restored.s.enemies[0].engaged,false);
  assert.equal(restored.s.enemies[0].location,'house');
 }
 assert.match(cardDialog(cards,'01050',{fromLibrary:true}),/Taboo 2.5/);
});

test('Charisma is bought without replacing a card and grants its slot on scenario setup',()=>{
 const engine=game();
 engine.finish('R2');
 assert.match(outcomeDialog(engine),/Mua Charisma/);
 const ordinary=engine.s.campaign.deck.length;
 assert.throws(()=>engine.command('upgrade',{add:'02158',remove:'01018'}),/Permanent/);
 engine.command('upgrade',{add:'02158'});
 assert.equal(engine.s.campaign.xp,0);
 assert.equal(engine.s.campaign.deck.length,ordinary+1);
 engine.command('nextChapter');
 const charisma=engine.asset('02158');
 assert.ok(charisma);
 assert.ok(![...engine.s.deck,...engine.s.hand].includes('02158'));
 engine.discardAsset(charisma.id);
 assert.equal(engine.asset('02158'),charisma);
 engine.equip('01018');
 engine.equip('01117');
 assert.equal(engine.s.pending.kind,'story');
 assert.ok(engine.asset('01018')&&engine.asset('01117'));
 engine.finish('R1');
 const restored=new Engine(cards,JSON.parse(JSON.stringify(engine.s)),()=>0.5);
 restored.command('nextChapter');
 assert.equal(restored.s.assets.filter(asset=>asset.code==='02158').length,1);
});

test('upgrade dialog offers only legal replacement pairs and charges the quoted XP',()=>{
 const engine=game();
 engine.finish('R2');
 const dialog=outcomeDialog(engine);
 assert.match(dialog,/value="01028:01018"[^>]*>Thay Beat Cop · 2 XP/);
 assert.doesNotMatch(dialog,/value="01028:01016"|value="01028:01006"/);
 assert.throws(()=>engine.command('upgrade',{add:'01028',remove:'01016'}),/hai bản cùng tên/);
 assert.equal(engine.s.campaign.xp,3);
 engine.command('upgrade',{add:'01028',remove:'01018'});
 assert.equal(engine.s.campaign.xp,1);
 assert.equal(engine.s.campaign.deck.filter(code=>code==='01028').length,1);
 assert.doesNotMatch(outcomeDialog(engine),/value="01028:01018"/);
});

test('Crypt Chill applies its damage when only a Permanent is in play',()=>{
 const engine=game();
 engine.equip('02158');
 engine.command('mulligan');
 engine.resolveEncounter('01167');
 engine.run();
 engine.s.bag=['auto_fail'];
 engine.command('reveal');
 engine.command('continue');
 assert.equal(engine.s.hp,2);
 assert.ok(engine.asset('02158'));
});

test('stable scenario IDs drive transitions and reject mismatched legacy chapters',()=>{
 const engine=game();
 assert.equal(engine.chapterInfo().id,'01104');
 assert.equal(engine.nextScenarioInfo().id,'01120');
 engine.s.campaignId='01';
 engine.s.scenarioId='01104';
 engine.finish('R1');
 engine.command('nextChapter');
 assert.equal(engine.s.scenarioId,'01120');
 assert.equal(engine.nextScenarioInfo().id,'01142');
 const badSave=structuredClone(engine.s);
 badSave.scenarioId='01142';
 assert.throws(()=>new Engine(cards,badSave).validate(),/Kịch bản/);
});

test('starting hand and resource options stack and persist across saved chapters',()=>{
 const cases=[
  [['UltimatumOfHardship','UltimatumOfForbiddenKnowledge'],3,4],
  [['BoonOfHades','BoonOfThoth'],7,6],
  [['UltimatumOfHardship','UltimatumOfForbiddenKnowledge','BoonOfHades','BoonOfThoth'],5,5]
 ];
 for(const [rules,resources,hand] of cases){
  const engine=game();
  engine.setupCampaign();
  for(const rule of rules)engine.command('toggleOptionalRule',{rule});
  engine.command('toggleOptionalRule',{rule:'UltimatumOfInduction'});
  const restored=new Engine(cards,JSON.parse(JSON.stringify(engine.s)),()=>0.5);
  restored.command('selectInvestigator',{code:'01001'});
  assert.equal(restored.s.resources,resources);
  assert.equal(restored.s.hand.length,hand);
  assert.throws(()=>restored.command('toggleOptionalRule',{rule:rules[0]}),/Không thể đổi/);
  while(restored.s.pending?.kind==='story')restored.command('continueStory');
  restored.command('mulligan',{indices:[0,hand-1]});
  assert.equal(restored.s.hand.length,hand);
  restored.finish('R2');
  assert.equal(restored.s.outcome.xp,0);
  assert.equal(restored.s.campaign.xp,0);
  restored.command('nextChapter');
  assert.equal(restored.s.resources,resources);
  assert.equal(restored.s.hand.length,hand);
 }
});

test('Hermes pays for one move per turn, including when no ordinary actions remain',()=>{
 const engine=game();
 engine.setupCampaign();
 engine.command('toggleOptionalRule',{rule:'BoonOfHermes'});
 engine.command('selectInvestigator',{code:'01001'});
 begin(engine);
 engine.advanceAct(true);
 engine.s.actions=0;
 assert.equal(engine.actionCost('move'),0);
 assert.throws(()=>engine.command('action',{kind:'resource'}),/Cần 1 action/);
 engine.command('action',{kind:'move',to:'attic'});
 assert.equal(engine.s.actions,0);
 assert.equal(engine.s.location,'attic');
 const loaded=new Engine(cards,JSON.parse(JSON.stringify(engine.s)),()=>0.5);
 assert.equal(loaded.actionCost('move'),1);
 assert.throws(()=>loaded.command('action',{kind:'move',to:'hallway'}),/Cần 1 action/);
 loaded.s.encounter.push('01166');
 loaded.command('action',{kind:'end'});
 loaded.command('resolveEncounter');
 assert.equal(loaded.actionCost('move'),0);
});

test('Persephone awards defeat XP unless Induction prevents gaining it',()=>{
 for(const blocked of [false,true]){
  const engine=game();
  engine.setupCampaign();
  engine.command('toggleOptionalRule',{rule:'BoonOfPersephone'});
  if(blocked)engine.command('toggleOptionalRule',{rule:'UltimatumOfInduction'});
  engine.command('selectInvestigator',{code:'01001'});
  begin(engine);
  engine.s.hp=engine.healthLimit();
  engine.defeated();
  assert.equal(engine.s.outcome.resolution,'defeated');
  assert.equal(engine.s.outcome.xp,blocked?0:5);
 }
});

test('Destiny searches before the opening draw, protects its card from mulligan, and resets next scenario',()=>{
 let engine=new Engine(cards,null,null,123);
 engine.setupCampaign();
 for(const rule of ['BoonOfDestiny','BoonOfThoth'])engine.command('toggleOptionalRule',{rule});
 engine.command('selectInvestigator',{code:'01001'});
 while(engine.s.pending.kind==='story')engine.command('continueStory');
 assert.deepEqual(engine.s.hand,[]);
 assert.match(engine.s.pending.title,/Destiny/);
 const deck=[...engine.s.deck].sort();
 engine=new Engine(cards,JSON.parse(JSON.stringify(engine.s)));
 const index=engine.s.pending.options.findIndex(option=>option.ops[0].code==='01006');
 engine.command('choose',{index});
 assert.equal(engine.s.hand[0],'01006');
 assert.equal(engine.s.hand.length,7);
 assert.deepEqual([...engine.s.deck,...engine.s.hand].sort(),deck);
 assert.match(pendingDialog(engine),/data-mulligan="0" disabled/);
 assert.throws(()=>engine.command('mulligan',{indices:[0]}),/Destiny/);
 engine.command('mulligan',{indices:[1,2,3,4,5,6]});
 assert.equal(engine.s.hand[0],'01006');
 assert.equal(engine.s.hand.length,7);
 engine.finish('R2');
 engine.command('nextChapter');
 engine.command('continueStory');
 assert.match(engine.s.pending.title,/Destiny/);
 engine.command('choose',{index:0});
 assert.equal(engine.s.hand.length,6);
 assert.equal(engine.s.destinyCard,undefined);
});

test('a weakness found with Destiny resolves after the mulligan',()=>{
 const engine=game();
 engine.setupCampaign();
 engine.command('toggleOptionalRule',{rule:'BoonOfDestiny'});
 engine.command('selectInvestigator',{code:'01001'});
 while(engine.s.pending.kind==='story')engine.command('continueStory');
 engine.command('choose',{index:engine.s.pending.options.findIndex(option=>option.ops[0].code==='01097')});
 assert.equal(engine.s.hand[0],'01097');
 assert.equal(engine.s.resources,5);
 engine.command('mulligan');
 assert.equal(engine.s.resources,0);
 assert.ok(engine.s.discard.includes('01097'));
 assert.equal(engine.s.hand.length,5);
});

test('Athena can cancel or keep the first Auto-fail, with a new offer next scenario',()=>{
 for(const cancel of [true,false]){
  const engine=game();
  engine.setupCampaign();
  engine.command('toggleOptionalRule',{rule:'BoonOfAthena'});
  engine.command('selectInvestigator',{code:'01001'});
  begin(engine);
  engine.s.sandbox=true;
  engine.s.bag=['auto_fail','0','0'];
  engine.command('action',{kind:'investigate'});
  engine.command('reveal',{token:'auto_fail'});
  assert.match(engine.s.pending.title,/Athena/);
  const restored=new Engine(cards,JSON.parse(JSON.stringify(engine.s)),()=>0);
  restored.command('choose',{index:cancel?0:1});
  assert.deepEqual(restored.s.lastTest.tokens,[cancel?'0':'auto_fail']);
  assert.deepEqual(restored.s.bag,['auto_fail','0','0']);
  restored.command('continue');
  restored.command('action',{kind:'investigate'});
  restored.command('reveal',{token:'auto_fail'});
  assert.equal(restored.s.pending.kind,'result');
  restored.command('continue');
  restored.finish('R2');
  restored.command('nextChapter');
  begin(restored);
  restored.command('action',{kind:'investigate'});
  restored.command('reveal',{token:'auto_fail'});
  assert.match(restored.s.pending.title,/Athena/);
 }
});

test('Athena can redraw the returned Auto-fail without offering another cancellation',()=>{
 const engine=new Engine(cards,null,()=>0.99);
 engine.setupCampaign();
 engine.command('toggleOptionalRule',{rule:'BoonOfAthena'});
 engine.command('selectInvestigator',{code:'01001'});
 begin(engine);
 engine.s.sandbox=true;
 engine.s.bag=['0','auto_fail'];
 engine.command('action',{kind:'investigate'});
 engine.command('reveal',{token:'auto_fail'});
 engine.command('choose',{index:0});
 assert.equal(engine.s.pending.kind,'result');
 assert.deepEqual(engine.s.lastTest.tokens,['auto_fail']);
});

test('Osiris replaces the first defeat, protects only damage until the next turn, and then expires',()=>{
 const engine=game();
 engine.setupCampaign();
 for(const rule of ['BoonOfOsiris','UltimatumOfFinality'])engine.command('toggleOptionalRule',{rule});
 engine.command('selectInvestigator',{code:'01001'});
 begin(engine);
 engine.push({type:'injury',d:engine.healthLimit(),h:engine.sanityLimit()});
 engine.run();
 assert.match(engine.s.pending.title,/Osiris/);
 const restored=new Engine(cards,JSON.parse(JSON.stringify(engine.s)));
 restored.command('choose',{index:1});
 assert.equal(restored.s.mentalTrauma,1);
 assert.equal(restored.s.physicalTrauma,0);
 assert.equal(restored.s.hp,0);
 assert.equal(restored.s.horror,0);
 assert.equal(restored.s.outcome,null);
 restored.push({type:'injury',d:2,h:1},{type:'directInjury',d:2,h:1});
 restored.run();
 assert.equal(restored.s.hp,0);
 assert.equal(restored.s.horror,2);
 restored.push({type:'begin'},{type:'injury',d:restored.healthLimit()});
 restored.run();
 assert.equal(restored.s.outcome.killed,true);
 assert.equal(restored.s.outcome.resolution,'defeated');
});

test('Osiris resets across scenarios and cannot save an investigator at the trauma limit',()=>{
 const engine=game();
 engine.setupCampaign();
 engine.command('toggleOptionalRule',{rule:'BoonOfOsiris'});
 engine.command('selectInvestigator',{code:'01001'});
 begin(engine);
 engine.push({type:'injury',h:engine.sanityLimit()});
 engine.run();
 assert.equal(engine.s.osirisUsed,true);
 engine.finish('R2');
 engine.command('nextChapter');
 begin(engine);
 assert.equal(engine.s.osirisUsed,undefined);
 assert.equal(engine.s.osirisProtected,undefined);
 engine.s.mentalTrauma=engine.investigator().sanity-1;
 engine.push({type:'injury',h:engine.sanityLimit()});
 engine.run();
 assert.equal(engine.s.outcome.resolution,'defeated');
 assert.equal(engine.s.mentalTrauma,engine.investigator().sanity);
 assert.equal(engine.canContinueCampaign(),false);
});

test('Child plays the topmost event from discard at its normal cost and puts it under the deck',()=>{
 const engine=game();
 engine.setupCampaign();
 engine.command('toggleOptionalRule',{rule:'BoonOfTheChild'});
 engine.command('selectInvestigator',{code:'01001'});
 begin(engine);
 engine.s.discard=['01043','01088','01016'];
 engine.s.actions=0;
 assert.throws(()=>engine.command('action',{kind:'child'}),/Boon of the Child/);
 assert.deepEqual(engine.s.discard,['01043','01088','01016']);
 engine.s.actions=1;
 engine.command('action',{kind:'child'});
 assert.equal(engine.s.actions,0);
 assert.equal(engine.s.resources,8);
 assert.deepEqual(engine.s.discard,['01043','01016']);
 assert.equal(engine.s.deck[0],'01088');
 const restored=new Engine(cards,JSON.parse(JSON.stringify(engine.s)));
 assert.throws(()=>restored.command('action',{kind:'child'}),/Boon of the Child/);
 restored.push({type:'mythos'});
 restored.run();
 assert.equal(restored.s.childUsed,undefined);
});

test('Child can play Fast events in a skill-test window and restore the test',()=>{
 const engine=game();
 engine.setupCampaign();
 engine.command('toggleOptionalRule',{rule:'BoonOfTheChild'});
 engine.command('selectInvestigator',{code:'01001'});
 begin(engine);
 engine.s.discard=['01043'];
 engine.command('action',{kind:'investigate'});
 const actions=engine.s.actions,resources=engine.s.resources,hand=engine.s.hand.length;
 engine.s.deck.push('01016','01016','01016');
 engine.command('fast',{kind:'child'});
 assert.equal(engine.s.pending.kind,'test');
 assert.equal(engine.s.actions,actions);
 assert.equal(engine.s.resources,resources-engine.playCost('01043'));
 assert.equal(engine.s.hand.length,hand+3);
 assert.equal(engine.s.deck[0],'01043');
});

test('Child reuses Dodge and Evidence only in their reaction windows',()=>{
 for(const code of ['01023','01022']){
  const engine=game();
  engine.setupCampaign();
  engine.command('toggleOptionalRule',{rule:'BoonOfTheChild'});
  engine.command('selectInvestigator',{code:'01001'});
  begin(engine);
  engine.s.discard=[code];
  assert.throws(()=>engine.command('action',{kind:'child'}),/Boon of the Child/);
  const rat=engine.spawn('01159');
  if(code==='01023')engine.attack(rat.id,false,true);
  else engine.hitEnemy({id:rat.id,amount:1});
  engine.run();
  const index=engine.s.pending.options.findIndex(option=>option.label.includes('Boon of the Child'));
  const resources=engine.s.resources,actions=engine.s.actions;
  engine.command('choose',{index});
  assert.equal(engine.s.resources,resources-engine.playCost(code));
  assert.equal(engine.s.actions,actions);
  assert.equal(engine.s.deck[0],code);
  assert.equal(engine.s.childUsed,true);
  if(code==='01023'){
   assert.equal(rat.exhausted,true);
   assert.equal(engine.s.hp,0);
  }else assert.equal(engine.s.clues,1);
 }
});

test('Child Extra Ammunition preserves the target choice and normal cost',()=>{
 const engine=game();
 engine.setupCampaign();
 engine.command('toggleOptionalRule',{rule:'BoonOfTheChild'});
 engine.command('selectInvestigator',{code:'01001'});
 begin(engine);
 engine.equip('01016');
 engine.equip('01006');
 engine.s.discard=['01026'];
 engine.command('action',{kind:'child'});
 assert.equal(engine.s.childUsed,undefined);
 const restored=new Engine(cards,JSON.parse(JSON.stringify(engine.s)));
 const [first,second]=restored.firearms();
 const [firstAmmo,secondAmmo]=[first.uses,second.uses];
 restored.command('choose',{index:1});
 assert.equal(first.uses,firstAmmo);
 assert.equal(second.uses,secondAmmo+3);
 assert.equal(restored.s.actions,2);
 assert.equal(restored.s.resources,5-restored.playCost('01026'));
 assert.equal(restored.s.deck[0],'01026');
});

test('Scream removes a defeated unique Ally and all its deck copies for the rest of the campaign',()=>{
 const engine=game();
 engine.setupCampaign();
 engine.command('toggleOptionalRule',{rule:'UltimatumOfTheScream'});
 engine.command('selectInvestigator',{code:'01003'});
 begin(engine);
 engine.s.pending=null;
 engine.equip('01048');
 engine.discardAsset(engine.asset('01048').id);
 assert.equal(engine.s.screamedAllies,undefined);
 engine.equip('01048');
 engine.asset('01048').horror=engine.card('01048').sanity;
 engine.injury({});
 assert.deepEqual(engine.s.screamedAllies,['01048']);
 assert.equal(engine.s.discard.filter(code=>code==='01048').length,1);
 engine.s.hand=['01048'];
 const restored=new Engine(cards,JSON.parse(JSON.stringify(engine.s)));
 assert.throws(()=>restored.command('action',{kind:'play',index:0}),/Scream/);
 restored.finish('R2');
 assert.ok(!restored.s.campaign.deck.includes('01048'));
 assert.match(outcomeDialog(restored),/Ally bị loại: Leo De Luca/);
 restored.command('nextChapter');
 assert.deepEqual(restored.s.screamedAllies,['01048']);
 assert.ok(![...restored.s.deck,...restored.s.hand].includes('01048'));
});

test('Scream does not remove non-unique and story Allies when defeated',()=>{
 const engine=masks();
 engine.s.optionalRules={version:1,active:['UltimatumOfTheScream']};
 for(const code of ['01018','01117']){
  engine.equip(code);
  engine.asset(code).hp=engine.card(code).health;
  engine.injury({});
  assert.ok(engine.s.discard.includes(code));
 }
 assert.equal(engine.s.screamedAllies,undefined);
});

test('Finality records terminal damage and horror defeats through reload',()=>{
 for(const [damage,horror] of [[true,false],[false,true],[true,true]]){
  const engine=game();
  engine.setupCampaign();
  engine.command('toggleOptionalRule',{rule:'UltimatumOfFinality'});
  engine.command('selectInvestigator',{code:'01001'});
  begin(engine);
  engine.s.hp=damage?engine.healthLimit():0;
  engine.s.horror=horror?engine.sanityLimit():0;
  engine.defeated();
  const restored=new Engine(cards,JSON.parse(JSON.stringify(engine.s)));
  if(damage&&horror)restored.command('choose',{index:0});
  const outcome=restored.s.outcome;
  assert.equal(outcome.resolution,'defeated');
  assert.equal(Boolean(outcome.killed),damage);
  assert.equal(Boolean(outcome.drivenInsane),horror);
  assert.equal(restored.s.campaign.history.at(-1).drivenInsane,outcome.drivenInsane);
  assert.equal(restored.canContinueCampaign(),false);
  assert.throws(()=>restored.command('nextChapter'),/Chiến dịch đã kết thúc/);
  assert.doesNotMatch(outcomeDialog(restored),/campaign-next/);
  if(damage)assert.match(outcomeDialog(restored),/thiệt mạng do damage/);
  if(horror)assert.match(outcomeDialog(restored),/mất trí do horror/);
 }
});

test('chaos bag Ultimatums and first-round Mythos carry through the campaign',()=>{
 const engine=game();
 engine.setupCampaign();
 for(const rule of ['UltimatumOfBrokenPromises','UltimatumOfFailure','UltimatumOfDread']){
  engine.command('toggleOptionalRule',{rule});
 }
 engine.command('selectDifficulty',{difficulty:'Expert'});
 engine.command('selectInvestigator',{code:'01001'});
 assert.ok(!engine.s.bag.includes('elder_sign'));
 assert.equal(engine.s.bag.filter(token=>token==='auto_fail').length,2);
 assert.ok(engine.s.bag.includes('-8'));
 engine.s.encounter.push('01166');
 begin(engine);
 assert.equal(engine.s.round,1);
 assert.equal(engine.s.doom,1);
 assert.equal(engine.s.pending.code,'01166');
 const loaded=new Engine(cards,JSON.parse(JSON.stringify(engine.s)),()=>0.5);
 loaded.command('resolveEncounter');
 assert.equal(loaded.s.phase,'investigation');
 assert.equal(loaded.s.doom,2);
 loaded.finish('R2');
 loaded.command('nextChapter');
 assert.ok(!loaded.s.bag.includes('elder_sign'));
 assert.equal(loaded.s.bag.filter(token=>token==='auto_fail').length,2);
 begin(loaded);
 assert.equal(loaded.s.round,1);
 assert.equal(loaded.s.pending.kind,'encounter');
});

test('Hard survives reload and chapter transitions and draws another token after Cultist',()=>{
 const engine=game();
 engine.setupCampaign();
 engine.command('selectDifficulty',{difficulty:'Hard'});
 assert.equal(engine.s.bag.length,17);
 assert.match(pendingDialog(engine),/aria-pressed="true" class="primary">Hard/);
 const restored=new Engine(cards,JSON.parse(JSON.stringify(engine.s)),()=>0);
 restored.command('selectInvestigator',{code:'01001'});
 begin(restored);
 assert.throws(()=>restored.command('selectDifficulty',{difficulty:'Easy'}),/Độ khó/);
 restored.s.sandbox=true;
 restored.s.bag=['cultist','-4'];
 restored.command('action',{kind:'investigate'});
 restored.command('reveal',{token:'cultist'});
 assert.deepEqual(restored.s.lastTest.tokens,['cultist','-4']);
 assert.equal(restored.s.lastTest.modifier,-4);
 restored.command('continue');
 restored.command('choose',{index:0});
 assert.equal(restored.s.horror,2);
 restored.finish('R1');
 restored.command('nextChapter');
 assert.equal(restored.difficulty(),'Hard');
 assert.equal(restored.s.bag.length,17);
 assert.ok(restored.s.bag.includes('-5'));
});

for(const [difficulty,numericTokens] of Object.entries({
 Easy:'+1 +1 0 0 0 -1 -1 -1 -2 -2',
 Standard:'+1 0 0 -1 -1 -1 -2 -2 -3 -4',
 Hard:'0 0 0 -1 -1 -2 -2 -3 -3 -4 -5',
 Expert:'0 -1 -1 -2 -2 -3 -3 -4 -4 -5 -6 -8'
})){
 test(`${difficulty} chaos bag survives all three Night of the Zealot setups and reloads`,()=>{
  let engine=new Engine(cards,null,null,123);
  engine.setupCampaign();
  engine.command('selectDifficulty',{difficulty});
  engine.command('selectInvestigator',{code:'01001'});
  const base=[...numericTokens.split(' '),'skull','skull','cultist','tablet','auto_fail','elder_sign'];
  for(const [chapter,scenario] of ['01104','01120','01142'].entries()){
   engine=new Engine(cards,JSON.parse(JSON.stringify(engine.s)));
   assert.equal(engine.difficulty(),difficulty);
   assert.equal(engine.chapterInfo().id,scenario);
   const expected=chapter===2?[...base,'elder_thing']:base;
   assert.deepEqual([...engine.s.bag].sort(),[...expected].sort());
   begin(engine);
   if(chapter<2){
    engine.finish('R2');
    engine.command('nextChapter');
   }
  }
 });
}

test('house, trauma, Lita and XP carry across an upgraded and restored Gathering save',()=>{
 let engine=game();
 engine.s.victory.push('01116');
 engine.finish('R1');
 engine.command('upgrade',{add:'01028',remove:'01018'});
 engine=new Engine(cards,JSON.parse(JSON.stringify(engine.s)),()=>0.5);
 engine.command('nextChapter');
 assert.equal(engine.s.location,'rivertown');
 assert.equal(engine.s.locations.house,undefined);
 assert.equal(engine.s.horror,1);
 assert.equal(engine.s.campaign.xp,2);
 assert.ok(engine.s.campaign.deck.includes('01117'));
 assert.ok(engine.s.campaign.deck.includes('01028'));
 assert.ok(!engine.s.encounter.includes('01116'));
 assert.equal(engine.s.cultistDeck.length,5);
});

test('Masks Cultist token falls back to disconnected cultists when none are reachable',()=>{
 const engine=masks();
 engine.s.sandbox=true;
 engine.here().links=[];
 const first=engine.spawn('01170','downtown');
 const second=engine.spawn('01137','northside');
 const rat=engine.spawn('01159');
 engine.command('action',{kind:'investigate'});
 engine.command('reveal',{token:'cultist'});
 assert.equal(engine.s.pending.kind,'choice');
 assert.deepEqual(engine.s.pending.options.map(option=>option.ops[0].id),[first.id,second.id]);
 engine.command('choose',{index:1});
 assert.equal(engine.s.lastTest.modifier,-2);
 assert.equal(first.doom,0);
 assert.equal(second.doom,1);
 assert.equal(rat.doom,0);
});

test('Mysterious Chanting prioritizes reachable cultists over disconnected ones',()=>{
 const engine=masks();
 engine.here().links=[];
 const nearby=engine.spawn('01170');
 const remote=engine.spawn('01137','northside');
 engine.s.pending={kind:'encounter',code:'01171'};
 engine.command('resolveEncounter');
 assert.equal(nearby.doom,2);
 assert.equal(remote.doom,0);
});

test('Masks Tablet returns one clue on Easy and all clues on Expert after failure',()=>{
 for(const [difficulty,modifier,returned] of [['Easy',-3,1],['Expert',-4,3]]){
  const engine=masks();
  engine.s.difficulty=difficulty;
  engine.s.sandbox=true;
  engine.s.clues=3;
  const before=engine.here().clues;
  engine.command('action',{kind:'investigate'});
  engine.command('reveal',{token:'tablet'});
  assert.equal(engine.s.lastTest.modifier,modifier);
  assert.equal(engine.s.lastTest.success,false);
  assert.equal(engine.s.clues,3);
  engine.command('continue');
  engine.command('choose',{index:0});
  assert.equal(engine.s.clues,3-returned);
  assert.equal(engine.here().clues,before+returned);
 }
});

test('Midnight Masks spends clues, spawns a cultist at its printed location and tracks its capture',()=>{
 const engine=masks('R2');
 assert.equal(engine.s.location,'house');
 assert.ok(!engine.s.campaign.deck.includes('01117'));
 engine.s.clues=2;
 engine.s.cultistDeck=['01140'];
 engine.command('action',{kind:'cultist'});
 const enemy=engine.s.enemies.at(-1);
 assert.equal(enemy.location,'northside');
 assert.equal(engine.s.clues,0);
 engine.move('northside');
 engine.command('action',{kind:'interrogate',target:enemy.id});
 assert.deepEqual(engine.s.victory,['01140']);
 assert.equal(engine.s.resources,0);
});

test('doom on enemies advances the agenda and resets before The Masked Hunter engages',()=>{
 const engine=masks();
 engine.spawn('01169','northside');
 engine.s.doom=5;
 engine.checkAgenda();
 assert.equal(engine.s.agenda,2);
 assert.equal(engine.doomTotal(),0);
 const hunter=engine.s.enemies.find(e=>e.code==='01121b');
 assert.ok(hunter.engaged);
 assert.equal(engine.enemyHealth(hunter),6);
 engine.s.clues=3;
 assert.equal(engine.canSpendClues(1),false);
});

test('past midnight affects opening hand and uncaught cultists affect woods doom and arrivals',()=>{
 const engine=masks();
 engine.s.victory.push(...CULTISTS.slice(0,2));
 engine.finish('R2');
 assert.equal(engine.s.outcome.gotAway.length,4);
 engine.command('nextChapter');
 assert.equal(engine.s.doom,2);
 assert.equal(engine.s.bag.filter(t=>t==='elder_thing').length,1);
 assert.equal(new Set(Object.values(engine.s.locations).map(l=>l.code)).size,5);
 begin(engine);
 assert.equal(engine.s.hand.length,3);
 engine.s.clues=3;
 engine.command('action',{kind:'advance'});
 assert.equal(engine.s.act,2);
 assert.ok(engine.s.locations.main.links.includes('ritual'));
 assert.deepEqual(engine.s.locations.ritual.links,['main']);
 assert.equal(engine.s.enemies.filter(e=>e.location==='main').length,4);
});

test('disrupting the ritual reaches R1 through two successful checks',()=>{
 const engine=forest();
 engine.s.campaign.history.at(-1).gotAway=[];
 engine.s.clues=5;
 engine.command('action',{kind:'advance'});
 engine.s.encounter=[];
 engine.command('action',{kind:'move',to:'ritual'});
 assert.equal(engine.s.act,3);
 engine.s.bag=['0'];
 for(let n=0;n<2;n++){
  engine.command('action',{kind:'disrupt',skill:'willpower'});
  engine.command('reveal');
  engine.command('continue');
 }
 assert.equal(engine.s.outcome.result,'win');
 assert.equal(engine.s.outcome.resolution,'R1');
 assert.equal(engine.s.outcome.mentalTrauma,3);
});

test('Elder Thing draws another token only while Ancient One is in play',()=>{
 for(const [difficulty,penalty] of [['Standard',-5],['Expert',-7]]){
  const engine=forest();
  engine.s.difficulty=difficulty;
  engine.s.sandbox=true;
  engine.s.bag=['elder_thing','-1'];
  engine.command('action',{kind:'investigate'});
  engine.command('reveal',{token:'elder_thing'});
  assert.deepEqual(engine.s.lastTest.tokens,['elder_thing']);
  assert.equal(engine.s.lastTest.modifier,penalty);
  engine.command('continue');
  engine.s.agenda=3;
  engine.s.doom=5;
  engine.checkAgenda();
  assert.ok(engine.s.enemies.some(enemy=>enemy.code==='01157'&&enemy.location!==engine.s.location));
  engine.command('action',{kind:'investigate'});
  engine.command('reveal',{token:'elder_thing'});
  assert.deepEqual(engine.s.lastTest.tokens,['elder_thing','-1']);
  assert.equal(engine.s.lastTest.modifier,penalty-1);
  assert.deepEqual(engine.s.bag,['elder_thing','-1']);
 }
});

test('repeated Cultist faces each resolve their failure effect',()=>{
 const engine=game();
 begin(engine);
 engine.s.difficulty='Hard';
 engine.s.sandbox=true;
 engine.s.bag=['cultist','auto_fail','cultist'];
 engine.command('action',{kind:'investigate'});
 engine.command('reveal',{token:'cultist'});
 assert.deepEqual(engine.s.lastTest.tokens,['cultist','cultist','auto_fail']);
 engine.command('continue');
 engine.command('choose',{index:0});
 assert.equal(engine.s.horror,4);
});

test('Umôrdhoth appears after agenda 3 advances, has 10 health and gives the combat ending',()=>{
 const engine=forest();
 engine.s.agenda=3;
 engine.s.doom=5;
 engine.checkAgenda();
 const boss=engine.s.enemies.find(e=>e.code==='01157');
 assert.equal(boss.location,'ritual');
 assert.equal(engine.enemyHealth(boss),10);
 engine.hitEnemy({id:boss.id,amount:9});
 assert.equal(engine.s.outcome,null);
 engine.hitEnemy({id:boss.id,amount:1});
 assert.equal(engine.s.outcome.resolution,'R2');
 assert.equal(engine.s.outcome.result,'win');
 assert.equal(engine.canContinueCampaign(),false);
});

test('sacrificing Lita gives R3 and records a Madness weakness',()=>{
 const engine=forest();
 engine.s.agenda=3;
 engine.s.doom=5;
 engine.checkAgenda();
 engine.move('ritual');
 engine.equip('01117');
 const boss=engine.s.enemies.find(e=>e.code==='01157');
 boss.exhausted=true;boss.engaged=false;
 engine.command('action',{kind:'sacrifice'});
 assert.equal(engine.s.outcome.result,'survived');
 assert.equal(engine.s.outcome.resolution,'R3');
 assert.ok(engine.s.campaign.deck.includes(engine.s.outcome.weakness));
});

test('the new chapters render near views, panoramic locations and continuation controls',()=>{
 const engine=masks();
 const ui={viewedRoom:engine.s.location,selectedRoom:engine.s.location,overview:true,moves:[]};
 assert.match(render(engine,ui),/arkham-city\.png/);
 assert.match(render(engine),/Lần ra giáo phái/);
 engine.finish('R1');
 assert.match(outcomeDialog(engine),/Tiếp tục · The Devourer Below/);
 engine.command('nextChapter');
 assert.match(render(engine,{...ui,viewedRoom:'main',selectedRoom:'main'}),/arkham-woods\.png/);
 assert.doesNotMatch(render(engine),/data-map-room="ritual"/);
});

test('a new campaign gates play behind investigator selection and the two opening stories',()=>{
 let engine=game();
 engine.setupCampaign();
 assert.match(pendingDialog(engine),/Chọn điều tra viên/);
 assert.throws(()=>engine.command('selectInvestigator',{code:'01002'}),/không hợp lệ/);
 engine.command('selectInvestigator',{code:'01003'});
 assert.equal(engine.healthLimit(),8);
 assert.equal(engine.sanityLimit(),6);
 assert.equal(engine.baseSkill('agility'),4);
 assert.match(pendingDialog(engine),/James Hankerson/);
 assert.throws(()=>engine.command('mulligan'),/đổi bài/);
 engine.command('continueStory');
 engine=new Engine(cards,structuredClone(engine.s),()=>0.5);
 assert.match(pendingDialog(engine),/Cảnh sát và báo chí/);
 begin(engine);
 if(engine.s.pending?.kind==='window')engine.command('closeWindow');
 engine.command('action',{kind:'skidsAction'});
 assert.equal(engine.s.actions,4);
 assert.equal(engine.s.resources,3);
 assert.throws(()=>engine.command('action',{kind:'skidsAction'}));
 engine.finish('R1');
 assert.match(outcomeDialog(engine),/vỉa hè/);
 engine.command('chooseLita',{recruit:false});
 engine.command('nextChapter');
 assert.ok(!engine.s.campaign.deck.includes('01117'));
 assert.equal(engine.investigator().code,'01003');
 assert.ok(engine.s.campaign.deck.includes('01011'));
 assert.match(pendingDialog(engine),/đốt cháy thành tro tàn/);
});

test('Act and Agenda inspectors show translated rules and story on both faces',()=>{
 assert.match(cardDialog(cards,'01109'),/Cuối vòng.*Hallway/);
 assert.match(cardDialog(cards,'01109b'),/Phá rào chắn/);
 assert.match(cardDialog(cards,'01109b'),/chiếc thùng/);
 assert.match(cardDialog(cards,'01144b'),/Ý chí của Umôrdhoth/);
 assert.match(cardDialog(cards,'01121a'),/data-inspect="01121b"/);
 assert.match(cardDialog(cards,'01121b'),/không thể tìm hoặc chi manh mối/);
});

test('On the Lam opens at turn start and protects Skids from non-Elite attacks',()=>{
 const engine=game();
 engine.setupCampaign();
 engine.command('selectInvestigator',{code:'01003'});
 engine.s.hand=['01010','01016','01048','01049','01088'];
 begin(engine);
 assert.equal(engine.s.pending.turnStart,true);
 assert.match(pendingDialog(engine),/Chơi On the Lam/);
 engine.command('fast',{kind:'play',index:0});
 assert.equal(engine.s.actions,3);
 assert.equal(engine.s.resources,4);
 const enemy=engine.spawn('01159')??engine.s.enemies.at(-1);
 engine.attack(enemy.id);
 assert.equal(engine.s.queue.length,0);
 engine.revealWeakness('01011');
 engine.command('action',{kind:'hospitalDebts'});
 engine.command('action',{kind:'hospitalDebts'});
 assert.throws(()=>engine.command('action',{kind:'hospitalDebts'}));
 engine.finish('R1');
 assert.equal(engine.s.outcome.xp,0);
});
