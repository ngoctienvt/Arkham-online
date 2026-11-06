import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Engine} from '../dist/engine.js';
import {replayFingerprint,readPortableGame,writePortableGame} from '../dist/game-history.js';
import {readSaveSlot,slotSource,slotStorageKey,writeSaveSlot} from '../dist/save-slots.js';

const cards=JSON.parse(readFileSync(new URL('../dist/cards.json',import.meta.url),'utf8'));
const start=()=>new Engine(cards,null,null,812);
const storage=()=>{
 const data=new Map();
 return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
};

test('legacy slots migrate beside the original bytes, including pending and completed scenarios',()=>{
 const store=storage();
 const gathering=start();
 gathering.command('mulligan');
 gathering.command('action',{kind:'investigate'});
 const masks=start();
 masks.finish('R1');
 masks.command('nextChapter');
 const forest=start();
 forest.finish('R1');
 forest.command('nextChapter');
 forest.finish('R2');
 forest.command('nextChapter');
 forest.finish('R1');
 for(const [index,engine] of [gathering,masks,forest].entries()){
  const slot=String(index+1);
  const oldKey=slotStorageKey(slot,1);
  const raw=JSON.stringify({state:engine.s,checkpoint:engine.s,commands:[]});
  store.setItem(oldKey,raw);
  const entry=readSaveSlot(store,slot,cards);
  assert.equal(entry.legacy,true);
  const resumed=new Engine(cards,entry.state);
  resumed.validate();
  writeSaveSlot(store,slot,{...entry.saved,state:resumed.s});
  const migrated=readSaveSlot(store,slot,cards);
  assert.equal(migrated.legacy,false);
  assert.equal(migrated.saved.rngVersion,1);
  assert.deepEqual(migrated.state,JSON.parse(raw).state);
  assert.equal(replayFingerprint(migrated.state),replayFingerprint(resumed.s));
  const stored=JSON.parse(store.getItem(slotStorageKey(slot,2)));
  assert.ok(stored.state.investigators['seat-1'].hand);
  assert.equal(stored.state.board.hand,undefined);
  assert.ok(stored.state.board.locations);
  assert.equal(store.getItem(oldKey),raw);
 }
});

test('corrupt current slots expose original bytes for recovery and preserve the v1 backup',()=>{
 const store=storage();
 const backup=JSON.stringify(start().s);
 store.setItem(slotStorageKey('1',1),backup);
 store.setItem(slotStorageKey('1',2),'{damaged');
 assert.throws(()=>readSaveSlot(store,'1',cards),/tải bản lưu gốc/);
 assert.equal(slotSource(store,'1').raw,'{damaged');
 assert.equal(store.getItem(slotStorageKey('1',1)),backup);
});

test('Agony keeps the damage target through save migration and allows a separate horror target',()=>{
 const engine=start();
 engine.setupCampaign();
 engine.command('toggleOptionalRule',{rule:'UltimatumOfAgony'});
 engine.command('selectInvestigator',{code:'01001'});
 engine.command('continueStory');
 engine.command('continueStory');
 engine.command('mulligan');
 engine.equip('01018');
 engine.push({type:'injury',d:3,h:1});
 engine.run();
 const store=storage();
 const oldKey=slotStorageKey('1',1);
 const raw=JSON.stringify(engine.s);
 store.setItem(oldKey,raw);
 const legacy=readSaveSlot(store,'1',cards);
 writeSaveSlot(store,'1',{state:legacy.state});
 const resumed=new Engine(cards,readSaveSlot(store,'1',cards).state);
 resumed.command('choose',{index:1});
 assert.equal(resumed.asset('01018').hp,2);
 assert.equal(resumed.s.hp,1);
 assert.match(resumed.s.pending.title,/Gán 1 horror/);
 assert.equal(resumed.s.pending.options.length,2);
 resumed.command('choose',{index:0});
 assert.equal(resumed.s.horror,1);
 assert.equal(resumed.asset('01018'),undefined);
 assert.equal(store.getItem(oldKey),raw);
});

test('a game without its original seed exports from a pending checkpoint and replays its continuation',()=>{
 const engine=start();
 engine.command('mulligan');
 engine.command('action',{kind:'investigate'});
 const checkpoint=structuredClone(engine.s);
 const commands=[{type:'reveal',args:{}},{type:'continue',args:{}}];
 for(const {type,args} of commands)engine.command(type,args);
 const save=writePortableGame(cards,null,commands,engine.s,checkpoint);
 assert.equal(save.version,2);
 assert.equal(save.checkpoint.pending.kind,'test');
 const reopened=readPortableGame(cards,JSON.parse(JSON.stringify(save)));
 assert.equal(reopened.seed,null);
 assert.equal(replayFingerprint(reopened.engine.s),replayFingerprint(engine.s));
 assert.throws(()=>readPortableGame(cards,{...save,checkpoint:{...checkpoint,sandbox:true}}),/Checkpoint/);
 assert.throws(()=>readPortableGame(cards,{...save,checkpoint:{...checkpoint,rngState:-1}}),/Checkpoint/);
});
