import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {startPortableGame,readPortableGame,writePortableGame} from '../dist/game-history.js';
import {readDeckFile,writeDeckFile,validateStartingDeck} from '../dist/deck-library.js';
import {starterDraft} from '../dist/deck-editor.js';
import {Engine} from '../dist/engine.js';
import {filterLibraryCards,cardLibraryDialog} from '../dist/card-library.js';
import {cardDialog} from '../dist/dialogs.js';

const cards=JSON.parse(readFileSync(new URL('../dist/cards.json',import.meta.url),'utf8'));

test('library filters compose and preserve selected filters in the rendered form',()=>{
 const filters={query:'mirror',pack:'bbt',faction:'guardian',type:'asset',trait:'Relic',level:'0',effect:'fixture'};
 assert.deepEqual(filterLibraryCards(cards,filters).map(card=>card.code),['05313']);
 assert.equal(filterLibraryCards(cards,{...filters,level:'none'}).length,0);
 const dialog=cardLibraryDialog(cards,filters);
 assert.match(dialog,/<option value="bbt" selected>/);
 assert.match(dialog,/data-library-card="05313"/);
 assert.doesNotMatch(dialog,/data-library-card="05314"/);
 assert.match(cardDialog(cards,'01109',{fromLibrary:true}),/Luật tiếng Anh/);
 assert.match(cardDialog(cards,'05313',{fromLibrary:true}),/Before the Black Throne/);
});

test('custom decks round-trip as files, start a campaign and survive portable replay',()=>{
 const draft=starterDraft(cards,'01003');
 draft.deck[0]='01086';
 const imported=readDeckFile(writeDeckFile(draft));
 assert.deepEqual(writeDeckFile(imported),writeDeckFile(draft));
 const seed=1234;
 const engine=startPortableGame(cards,seed);
 const commands=[{type:'selectInvestigator',args:{code:imported.investigator,deck:imported.deck}}];
 engine.command(commands[0].type,commands[0].args);
 assert.equal(engine.investigatorDeck().filter(code=>code==='01086').length,1);
 assert.ok(engine.investigatorDeck().includes('01010'));
 const save=writePortableGame(cards,seed,commands,engine.s);
 assert.deepEqual(readPortableGame(cards,save).engine.s,engine.s);
 engine.finish('R1');
 engine.command('nextChapter');
 assert.ok(engine.s.campaign.deck.includes('01086'));
});

test('drafts preserve missing cards, but engine setup rejects them without changing state',()=>{
 const draft=starterDraft(cards,'01001');
 draft.deck[0]='09999';
 assert.ok(readDeckFile(writeDeckFile(draft)).deck.includes('09999'));
 const engine=startPortableGame(cards,1234);
 const before=structuredClone(engine.s);
 assert.throws(()=>engine.command('selectInvestigator',{code:draft.investigator,deck:draft.deck}),/09999/);
 assert.deepEqual(engine.s,before);
 assert.throws(()=>validateStartingDeck(cards,'01001',Array(30).fill('01086')),/hai bản/);
});

test('Revised Core printings import under canonical codes and share copy limits',()=>{
 const draft=starterDraft(cards,'01001');
 const {slots}=writeDeckFile(draft);
 slots['01016']=1;
 Object.assign(slots,{'01516':1,'01506':1,'01507':1,'01597':1});
 const imported=readDeckFile({name:'Revised Core',investigator_code:'01501',slots});
 assert.equal(imported.investigator,'01001');
 assert.equal(imported.deck.length,30);
 assert.equal(imported.deck.filter(code=>code==='01016').length,2);
 assert.deepEqual(validateStartingDeck(cards,imported.investigator,imported.deck),imported.deck);
 assert.throws(()=>readDeckFile({name:'Parallel',investigator_code:'90001',slots}),/chưa được hỗ trợ/);
});

test('discarding Knife pays the cost before the boosted fight test',()=>{
 const engine=startPortableGame(cards,1234);
 engine.command('selectInvestigator',{code:'01001'});
 engine.command('continueStory');
 engine.command('continueStory');
 engine.command('mulligan',{indices:[]});
 engine.equip('01086');
 const knife=engine.asset('01086');
 engine.spawn('01159');
 const enemy=engine.s.enemies.at(-1);
 engine.command('action',{kind:'fight',target:enemy.id,weapon:knife.id});
 assert.equal(engine.s.pending.bonus,1);
 assert.equal(engine.s.pending.damage,1);
 assert.equal(engine.asset('01086'),knife);
 engine.s.bag=['auto_fail'];
 engine.command('reveal');
 engine.command('continue');
 engine.command('action',{kind:'fight',target:enemy.id,weapon:knife.id,discardKnife:true});
 assert.equal(engine.s.pending.bonus,2);
 assert.equal(engine.s.pending.damage,2);
 assert.equal(engine.asset('01086'),undefined);
 assert.ok(engine.s.discard.includes('01086'));
});

test('Mirror releases three bonded cards once and retrieves them after a reloaded Melody choice',()=>{
 const engine=startPortableGame(cards,1234);
 const draft=starterDraft(cards,'01001');
 draft.deck[0]='05313';
 const tooMany=[...draft.deck];
 tooMany[1]='05313';
 assert.throws(()=>validateStartingDeck(cards,'01001',tooMany),/Giới hạn 1/);
 engine.command('selectInvestigator',{code:'01001',deck:draft.deck});
 engine.command('continueStory');
 engine.command('continueStory');
 engine.command('mulligan');
 assert.deepEqual(engine.s.bonded,{'05314':3});
 engine.equip('05313');
 engine.run();
 assert.equal(engine.s.bonded['05314'],0);
 assert.equal(engine.s.deck.filter(code=>code==='05314').length,2);
 assert.equal(engine.s.hand.filter(code=>code==='05314').length,1);
 engine.releaseBonded('05313');
 assert.equal(engine.s.hand.filter(code=>code==='05314').length,1);
 engine.s.hp=2;
 engine.s.horror=1;
 engine.command('action',{kind:'play',index:engine.s.hand.indexOf('05314')});
 assert.equal(engine.s.pending.kind,'choice');
 const resumed=new Engine(cards,JSON.parse(JSON.stringify(engine.s)));
 resumed.command('choose',{index:0});
 resumed.command('choose',{index:1});
 assert.equal(resumed.s.hp,1);
 assert.equal(resumed.s.horror,0);
 assert.ok(resumed.s.discard.includes('05314'));
 resumed.discardAsset(resumed.asset('05313').id);
 assert.equal(resumed.s.bonded['05314'],3);
 assert.ok(![...resumed.s.deck,...resumed.s.hand,...resumed.s.discard].includes('05314'));
});

test('Blood-Rite draws then resolves two choices without provoking an attack',()=>{
 const engine=startPortableGame(cards,1234);
 const draft=starterDraft(cards,'01001');
 draft.deck[0]='05316';
 assert.throws(()=>validateStartingDeck(cards,'01003',draft.deck),/05316/);
 engine.command('selectInvestigator',{code:'01001',deck:draft.deck});
 engine.command('continueStory');
 engine.command('continueStory');
 engine.command('mulligan');
 engine.equip('05316');
 engine.run();
 engine.spawn('01160');
 engine.s.deck.push('01088','01089');
 const enemy=engine.s.enemies.at(-1);
 assert.equal(enemy.engaged,true);
 const hand=engine.s.hand.length;
 engine.command('action',{kind:'play',index:engine.s.hand.indexOf('05317')});
 assert.equal(engine.s.actions,2);
 assert.equal(engine.s.hp,0);
 assert.equal(engine.s.horror,0);
 assert.equal(engine.s.hand.length,hand+1);
 engine.command('choose',{index:0});
 const resumed=new Engine(cards,JSON.parse(JSON.stringify(engine.s)));
 resumed.command('choose',{index:0});
 resumed.command('choose',{index:1});
 assert.equal(resumed.s.enemies.at(-1).damage,1);
 assert.equal(resumed.s.resources,4);
 resumed.command('choose',{index:0});
 assert.equal(resumed.s.resources,5);
 resumed.discardAsset(resumed.asset('05316').id);
 assert.equal(resumed.s.bonded['05317'],3);
});
