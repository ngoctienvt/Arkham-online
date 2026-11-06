import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Engine} from '../dist/engine.js';

const cards=JSON.parse(readFileSync(new URL('../dist/cards.json',import.meta.url),'utf8'));
const game=()=>{
 const engine=new Engine(cards,null,()=>0.5);
 engine.command('mulligan');
 return engine;
};
const choose=(engine,index)=>engine.command('choose',{index});

test('Extra Ammunition chooses a firearm before paying and reloads only that firearm',()=>{
 const engine=game();
 engine.equip('01006');
 engine.equip('01016');
 const first=engine.asset('01006');
 const second=engine.asset('01016');
 first.uses=0;
 second.uses=1;
 engine.s.hand=['01026'];

 engine.command('action',{kind:'supply',index:0});
 assert.equal(engine.s.pending.kind,'choice');
 assert.equal(engine.s.pending.options.length,2);
 assert.equal(engine.s.actions,3);
 assert.equal(engine.s.resources,5);
 assert.deepEqual(engine.s.hand,['01026']);
 choose(engine,1);
 assert.equal(first.uses,0);
 assert.equal(second.uses,4);
 assert.equal(engine.s.actions,2);
 assert.equal(engine.s.resources,3);
 assert.deepEqual(engine.s.hand,[]);
 assert.deepEqual(engine.s.discard,['01026']);
});

test('Beat Cop can deal damage during a fight test and its combat bonus ends when discarded',()=>{
 const engine=game();
 engine.equip('01018');
 const cop=engine.asset('01018');
 const enemy=engine.spawn('01160');
 engine.s.bag=['-3'];
 engine.command('action',{kind:'fight',target:enemy.id});

 engine.command('fast',{kind:'cop',asset:cop.id,target:enemy.id});
 assert.equal(engine.s.pending.kind,'test');
 assert.equal(engine.s.pending.target,enemy.id);
 assert.equal(enemy.damage,1);
 assert.equal(engine.s.actions,2);
 assert.equal(engine.asset('01018'),undefined);
 engine.command('reveal');
 assert.equal(engine.s.pending.result.base,4);
 assert.equal(engine.s.pending.result.success,false);
 engine.command('continue');
 assert.equal(enemy.damage,1);
});

test('assigning tablet damage defeats Beat Cop before the test calculates combat',()=>{
 const engine=game();
 engine.equip('01018');
 engine.asset('01018').hp=1;
 const enemy=engine.spawn('01161');
 engine.s.bag=['tablet'];
 engine.command('action',{kind:'fight',target:enemy.id});
 engine.command('reveal');

 assert.equal(engine.s.pending.kind,'choice');
 choose(engine,1);
 assert.equal(engine.asset('01018'),undefined);
 assert.equal(engine.s.hp,0);
 assert.equal(engine.s.pending.kind,'result');
 assert.equal(engine.s.pending.result.base,4);
 assert.equal(engine.s.pending.result.total,2);
 assert.equal(engine.s.pending.result.success,false);
});

test('a simultaneous lethal attack gives a choice of one trauma after save and resume',()=>{
 const engine=game();
 engine.s.hp=7;
 engine.s.horror=3;
 engine.s.clues=1;
 engine.spawn('01116');
 engine.command('action',{kind:'resource'});
 assert.equal(engine.s.pending.kind,'choice');
 assert.equal(engine.s.pending.options.length,2);
 assert.equal(engine.s.outcome,null);

 for(const [index,physical,mental] of [[0,1,0],[1,0,1]]){
  const restored=new Engine(cards,structuredClone(engine.s),()=>0.5);
  choose(restored,index);
  assert.equal(restored.s.outcome.resolution,'defeated');
  assert.equal(restored.s.physicalTrauma,physical);
  assert.equal(restored.s.mentalTrauma,mental);
  assert.equal(restored.s.clues,0);
  assert.equal(restored.here().clues,3);
  assert.equal(restored.s.resources,5);
 }
});

test('Cryptic Research reshuffles during its draw and only then enters the discard pile',()=>{
 const engine=game();
 engine.s.deck=['01020'];
 engine.s.hand=['01043'];
 engine.s.discard=['01097','01087'];

 engine.command('action',{kind:'play',index:0});
 assert.deepEqual(engine.s.hand,['01020','01087']);
 assert.deepEqual(engine.s.deck,[]);
 assert.deepEqual(engine.s.discard,['01097','01043']);
 assert.equal(engine.s.horror,1);
 assert.equal(engine.s.resources,0);
 assert.equal(engine.s.actions,3);
});

test('Mysterious Chanting lets the player pick among tied nearest Cultists',()=>{
 const engine=game();
 engine.finish('R1');
 engine.command('nextChapter');
 if(engine.s.pending.kind==='story')engine.command('continueStory');
 engine.command('mulligan');
 const university=engine.spawn('01169','university');
 const easttown=engine.spawn('01170','easttown');
 const far=engine.spawn('01169','northside');
 engine.spawn('01160','rivertown');
 engine.s.pending={kind:'encounter',code:'01171'};

 engine.command('resolveEncounter');
 assert.equal(engine.s.pending.kind,'choice');
 assert.deepEqual(engine.s.pending.options.map(option=>option.ops[0].id),[university.id,easttown.id]);
 choose(engine,1);
 assert.equal(university.doom,1);
 assert.equal(easttown.doom,2);
 assert.equal(far.doom,1);
 assert.ok(engine.s.encDiscard.includes('01171'));
});
