import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Engine} from '../dist/engine.js';
import {fillOpeningHand,investigatorDeck,mulliganOpeningHand,prepareBondedCards} from '../dist/investigator-state.js';
import {render} from '../dist/view.js';
import {pendingDialog} from '../dist/dialogs.js';
import {replayHistory,startPortableGame,readPortableGame,writePortableGame} from '../dist/game-history.js';
const cards=JSON.parse(fs.readFileSync(new URL('../dist/cards.json',import.meta.url),'utf8'));
const game=()=>{const g=new Engine(cards,null,()=>0.5);g.command('mulligan');return g;};
const testSuccess=g=>{g.s.bag=['0'];g.command('reveal');g.command('continue');};
const choose=(g,index=0)=>g.command('choose',{index});

test('investigator setup resolves signature, weakness and bonded pool from the selected seat',()=>{
 const roland={investigator:'01001',customDeck:['05313','05316']};
 const skids={investigator:'01003'};
 const firstDeck=investigatorDeck(roland);
 const secondDeck=investigatorDeck(skids);
 assert.deepEqual(firstDeck,['05313','05316','01006','01007','01097']);
 assert.deepEqual(secondDeck.slice(-3),['01010','01011','01097']);
 prepareBondedCards(roland,firstDeck,code=>cards[code]);
 prepareBondedCards(skids,secondDeck,code=>cards[code]);
 assert.equal(skids.bonded,undefined);
 assert.deepEqual(roland.bonded,{'05314':3,'05317':3});
 assert.deepEqual(roland.customDeck,['05313','05316']);
});

test('opening hand and mulligan keep weaknesses and returned cards out of the draw for each seat',()=>{
 const first={hand:[],deck:['replacement','weakness-2','opening','weakness-1']};
 const second={hand:[],deck:['other']};
 const isWeakness=code=>code.startsWith('weakness-');
 const keepOrder=()=>{};
 fillOpeningHand(first,1,isWeakness,keepOrder);
 fillOpeningHand(second,1,isWeakness,keepOrder);
 assert.deepEqual(first.hand,['opening']);
 assert.throws(()=>mulliganOpeningHand(first,[0,1],1,isWeakness,keepOrder),/đổi/);
 assert.deepEqual(first.hand,['opening']);
 mulliganOpeningHand(first,[0],1,isWeakness,keepOrder);
 assert.deepEqual(first.hand,['replacement']);
 assert.deepEqual(first.deck.sort(),['opening','weakness-1','weakness-2']);
 assert.deepEqual(second,{hand:['other'],deck:[]});
});

test('portable save replays from the seed and rejects altered versions or invalid commands',()=>{
 const seed=982523;
 const original=startPortableGame(cards,seed);
 const commands=[
  {type:'selectStoryLanguage',args:{language:'en'}},
  {type:'toggleOptionalRule',args:{rule:'BoonOfThoth'}},
  {type:'selectDifficulty',args:{difficulty:'Expert'}},
  {type:'selectInvestigator',args:{code:'01003'}},
  {type:'continueStory',args:{}},
  {type:'continueStory',args:{}},
  {type:'mulligan',args:{indices:[0,2]}},
  {type:'action',args:{kind:'resource'}}
 ];
 for(const {type,args} of commands)original.command(type,args);
 const save=writePortableGame(cards,seed,commands,original.s);
 const imported=readPortableGame(cards,JSON.parse(JSON.stringify(save)));
 assert.deepEqual(imported.engine.s,original.s);
 assert.throws(()=>readPortableGame(cards,{...save,content:'unknown'}),/không được hỗ trợ/);
 const forged=structuredClone(save);
 forged.commands.at(-1).args.indices=[0];
 assert.throws(()=>readPortableGame(cards,forged),new RegExp('bước '+forged.commands.length));
 const wrongType=structuredClone(save);
 wrongType.commands.find(command=>command.type==='mulligan').args.indices=['0'];
 assert.throws(()=>readPortableGame(cards,wrongType),/Lệnh không hợp lệ/);
 assert.throws(()=>readPortableGame(cards,{...save,commands:[{type:'equip',args:{code:'01117'}},...commands.slice(1)]}),/bước 1/);
 assert.throws(()=>readPortableGame(cards,{...save,commands:[{type:'choose',args:{index:0}},...commands.slice(1)]}),/phát lại bước 1/);
 const changed={...cards,'01118':{...cards['01118'],quantity:2}};
 assert.throws(()=>readPortableGame(changed,save),/không khớp ở bước 0/);
 assert.throws(()=>writePortableGame(cards,seed,commands,{...original.s,resources:99}),/không dựng lại/);
});

test('a command from the wrong actor is rejected before consuming actions or a pending choice',()=>{
 const engine=game();
 const before=structuredClone(engine.s);
 assert.throws(()=>engine.command('action',{kind:'resource'},'seat-2'),/seat-1/);
 assert.deepEqual(engine.s,before);
 engine.command('action',{kind:'investigate'},'seat-1');
 const pending=structuredClone(engine.s);
 assert.throws(()=>engine.command('reveal',{},'seat-2'),/seat-1/);
 assert.deepEqual(engine.s,pending);
 engine.command('reveal',{},'seat-1');
 assert.equal(engine.s.pending.kind,'result');
});

test('a saved checkpoint preserves random draws when replaying commands',()=>{
 const original=new Engine(cards);
 const checkpoint=structuredClone(original.s);
 const resumed=new Engine(cards,checkpoint);
 original.command('mulligan',{indices:[0,1]});
 resumed.command('mulligan',{indices:[0,1]});
 assert.deepEqual(resumed.s,original.s);
});

test('history restores a prior command without changing the checkpoint or live game',()=>{
 const original=new Engine(cards);
 const checkpoint=structuredClone(original.s);
 const commands=[{type:'mulligan',args:{indices:[0]}},{type:'action',args:{kind:'resource'}}];
 for(const {type,args} of commands)original.command(type,args);
 assert.deepEqual(replayHistory(cards,checkpoint,commands).s,original.s);
 assert.equal(replayHistory(cards,checkpoint,commands,1).s.resources,5);
 assert.equal(original.s.resources,6);
 assert.equal(checkpoint.pending.kind,'mulligan');
});

test('a sandbox can force a token in its bag, but the live game rejects it',()=>{
 const g=game();
 g.command('action',{kind:'investigate'});
 assert.throws(()=>g.command('reveal',{token:'auto_fail'}),/Sandbox/);
 assert.equal(g.s.pending.kind,'test');
 g.s.sandbox=true;
 assert.throws(()=>g.command('reveal',{token:'not-in-bag'}),/Sandbox/);
 g.command('reveal',{token:'auto_fail'});
 assert.equal(g.s.pending.result.token,'auto_fail');
 assert.equal(g.s.pending.result.success,false);
});

test('the round tracker retains the encounter step across reload',()=>{
 const g=game();
 g.command('action',{kind:'end'});
 assert.equal(g.s.phase,'mythos');
 assert.equal(g.s.phaseStep,'encounter');
 const resumed=new Engine(cards,structuredClone(g.s));
 assert.match(render(resumed),/Mythos · Lá Encounter/);
 assert.equal(resumed.s.pending.kind,'encounter');
});

test('Enemy timing survives reload and reopens after paying a Fast cost',()=>{
 const original=game();
 original.revealWeakness('01011');
 original.command('action',{kind:'end'});
 assert.equal(original.s.pending.point,'before-enemy-attacks');
 const resumed=new Engine(cards,JSON.parse(JSON.stringify(original.s)),()=>0.5);
 const resources=resumed.s.resources;
 resumed.command('fast',{kind:'hospitalDebts'});
 assert.equal(resumed.s.resources,resources-1);
 assert.equal(resumed.s.pending.point,'before-enemy-attacks');
 resumed.command('closeWindow');
 assert.equal(resumed.s.pending.point,'after-enemy-attacks');
 const again=new Engine(cards,JSON.parse(JSON.stringify(resumed.s)),()=>0.5);
 again.command('closeWindow');
 assert.equal(again.s.pending.point,'before-upkeep-ready');
 assert.equal(again.s.resources,resources-1);
 assert.equal(again.s.hospitalDebts,1);
 assert.match(pendingDialog(again),/trước khi làm mới bài/);
});

test('Upkeep hand limit resumes without drawing or gaining resources twice',()=>{
 const original=game();
 original.s.hand=Array(8).fill('01088');
 original.s.deck.push('01088');
 original.command('action',{kind:'end'});
 assert.equal(original.s.phaseStep,'hand-limit');
 assert.equal(original.s.hand.length,9);
 const resumed=new Engine(cards,JSON.parse(JSON.stringify(original.s)),()=>0.5);
 resumed.command('choose',{index:0});
 assert.equal(resumed.s.resources,6);
 assert.equal(resumed.s.hand.length,8);
 assert.equal(resumed.s.pending.kind,'encounter');
 assert.equal(resumed.s.round,2);
});

test('forced horror resolves before Roland can react, even across a reload',()=>{
 const original=game();
 original.equip('01018');
 original.spawn('01180');
 const enemy=original.s.enemies.at(-1);
 original.hitEnemy({id:enemy.id,amount:original.enemyHealth(enemy)});
 original.run();
 assert.match(original.s.pending.title,/Gán 1 horror/);
 const resumed=new Engine(cards,JSON.parse(JSON.stringify(original.s)),()=>0.5);
 resumed.command('choose',{index:0});
 assert.equal(resumed.s.horror,1);
 assert.match(resumed.s.pending.title,/Roland Banks/);
 resumed.command('choose',{index:0});
 assert.equal(resumed.s.clues,1);
 assert.equal(resumed.s.rolandUsed,true);
 resumed.spawn('01159');
 const rat=resumed.s.enemies.at(-1);
 resumed.hitEnemy({id:rat.id,amount:resumed.enemyHealth(rat)});
 resumed.run();
 assert.equal(resumed.s.pending,null);
});

test('Evidence and Roland can resolve in either order across a reload',()=>{
 for(const evidenceFirst of [false,true]){
  const engine=game();
  engine.s.hand=['01022'];
  assert.throws(()=>engine.command('action',{kind:'play',index:0}),/sau khi hạ/);
  engine.spawn('01159');
  engine.hitEnemy({id:engine.s.enemies[0].id,amount:1});
  assert.match(engine.s.pending.title,/Chọn phản ứng sau/);
  engine.command('choose',{index:evidenceFirst?1:0});
  assert.equal(engine.s.clues,1);
  assert.equal(engine.s.resources,evidenceFirst?4:5);
  const resumed=new Engine(cards,JSON.parse(JSON.stringify(engine.s)),()=>0.5);
  resumed.command('choose',{index:0});
  assert.equal(resumed.s.clues,2);
  assert.equal(resumed.s.resources,4);
  assert.equal(resumed.s.rolandUsed,true);
  assert.deepEqual(resumed.s.discard,['01022']);
  assert.equal(resumed.s.pending,null);
 }
});

test('Dodge interrupts one attack across a reload without canceling the action that provoked it',()=>{
 const engine=game();
 engine.s.hand=['01023','01023'];
 engine.spawn('01159');
 assert.throws(()=>engine.command('action',{kind:'play',index:0}),/Dodge chỉ chơi/);
 engine.command('action',{kind:'resource'});
 assert.match(engine.s.pending.title,/Dodge/);
 assert.equal(engine.s.actions,2);
 const resumed=new Engine(cards,JSON.parse(JSON.stringify(engine.s)),()=>0.5);
 resumed.command('choose',{index:0});
 assert.equal(resumed.s.hp,0);
 assert.equal(resumed.s.resources,5);
 assert.equal(resumed.s.hand.length,1);
 assert.equal(resumed.s.enemies[0].exhausted,false);
 resumed.push({type:'attack',id:resumed.s.enemies[0].id,enemyPhase:true});
 resumed.run();
 resumed.command('choose',{index:0});
 assert.equal(resumed.s.enemies[0].exhausted,true);
 assert.equal(resumed.s.hp,0);
 assert.equal(resumed.s.resources,4);
});

test('Survival Knife opens a nested test and resumes a surviving enemy attack',()=>{
 for(const succeeds of [true,false]){
  const engine=game();
  engine.s.hand=['01023'];
  engine.s.bag=[succeeds?'0':'auto_fail'];
  engine.equip('53002');
  engine.spawn('01160');
  engine.command('action',{kind:'end'});
  assert.match(engine.s.pending.title,/Chọn phản ứng/);
  engine.command('choose',{index:1});
  assert.equal(engine.s.pending.kind,'test');
  assert.equal(engine.s.pending.bonus,2);
  assert.equal(engine.s.pending.damage,2);
  assert.equal(engine.asset('53002').exhausted,true);
  const resumed=new Engine(cards,JSON.parse(JSON.stringify(engine.s)),()=>0.5);
  resumed.command('reveal');
  resumed.command('continue');
  if(succeeds){
   assert.match(resumed.s.pending.title,/Roland/);
   resumed.command('choose',{index:1});
   assert.equal(resumed.s.enemies.length,0);
  }else{
   assert.match(resumed.s.pending.title,/Dodge/);
   resumed.command('choose',{index:0});
   assert.equal(resumed.s.enemies.length,1);
   assert.ok(resumed.s.discard.includes('01023'));
  }
  assert.equal(resumed.s.hp,0);
  assert.equal(resumed.s.pending.kind,'encounter');
 }
});

test('admin bypasses act and agenda requirements without spending clues, and protects Roland until disabled',()=>{
 const g=game();
 assert.throws(()=>g.command('adminAdvance',{track:'act'}));
 g.command('adminToggle');
 g.command('adminAdvance',{track:'act'});
 assert.equal(g.s.location,'hallway');
 g.move('attic');g.run();
 g.command('adminAdvance',{track:'act'});
 assert.equal(g.s.act,3);
 assert.equal(g.s.clues,0);
 g.command('adminAdvance',{track:'agenda'});
 assert.equal(g.s.agenda,2);
 choose(g,1);
 assert.equal(g.s.horror,0);
 g.push({type:'directInjury',d:9,h:5});g.run();
 assert.equal(g.s.hp,0);
 assert.equal(g.s.outcome,null);
 g.command('adminToggle');
 g.injury({h:5});g.run();
 assert.equal(g.s.outcome.resolution,'defeated');
});

test('the Mythos draw shows the actual Encounter image and waits before spawning the enemy',()=>{
 const g=game();g.s.encounter=['01120','01160'];
 g.s.queue=[{type:'encounter'},{type:'begin'}];g.s.phase='mythos';g.run();
 assert.equal(g.s.pending.kind,'encounter');
 assert.equal(g.s.lastEncounter,'01160');
 assert.match(pendingDialog(g),/<img[^>]+src="assets\/01160\.png"/);
 assert.equal(g.s.enemies.length,0);
 const restored=new Engine(cards,structuredClone(g.s));
 restored.command('resolveEncounter');
 assert.equal(restored.s.enemies[0].code,'01160');
 assert.equal(restored.s.phase,'investigation');
});

test('setup has a legal 33-card deck, 26 encounters, safe opening and standard chaos bag',()=>{
 const g=new Engine(cards);assert.equal(g.s.deck.length+g.s.hand.length,33);assert.equal(g.s.hand.length,5);
 assert(!g.s.hand.some(c=>g.weakness(c)));assert.equal(g.s.encounter.length,26);assert.equal(g.s.bag.length,16);
 assert.equal(g.s.locations.study.clues,2);
});
test('mulligan preserves all player cards and does not draw replaced cards immediately',()=>{
 const g=new Engine(cards,null,()=>0.3),all=[...g.s.hand,...g.s.deck].sort();
 g.command('mulligan',{indices:[0,1,2,3,4]});assert.equal(g.s.hand.length,5);assert.deepEqual([...g.s.hand,...g.s.deck].sort(),all);
 assert(!g.s.hand.some(c=>g.weakness(c)));assert.equal(g.s.phase,'investigation');
});
test('invalid commands roll back state, including costs and debug log',()=>{
 const g=game(),before=structuredClone(g.s);assert.throws(()=>g.command('action',{kind:'move',to:'parlor'}));assert.deepEqual(g.s,before);
 assert.throws(()=>g.command('action',{kind:'play',index:-1}));assert.deepEqual(g.s,before);
});
test('zero difficulty succeeds at clamped zero but auto-fail still fails',()=>{
 const g=game();g.s.assets=[{code:'01087',id:'flash',uses:3,hp:0,horror:0}];
 g.command('action',{kind:'investigate',tool:'flash'});g.s.bag=['-4'];g.command('reveal');assert(g.s.pending.result.success);g.command('continue');assert.equal(g.s.clues,1);
 g.command('action',{kind:'investigate',tool:'flash'});g.s.bag=['auto_fail'];g.command('reveal');assert(!g.s.pending.result.success);g.command('continue');assert.equal(g.s.clues,1);
});
test('Deduction and Perception contribute icons and successful effects',()=>{
 const g=game();g.s.hand=['01039','01090'];g.command('action',{kind:'investigate'});g.command('commit',{index:0});g.command('commit',{index:0});
 testSuccess(g);assert.match(g.s.pending.title,/hiệu ứng/);choose(g,1);
 assert.equal(g.s.clues,2);assert.equal(g.s.hand.length,1);assert(g.s.discard.includes('01039'));
});
test('max-one committed skills are enforced',()=>{
 const g=game();g.s.hand=['01093','01093'];g.command('action',{kind:'investigate'});g.command('commit',{index:0});assert.throws(()=>g.command('commit',{index:0}));
});
test('Act 1 discards Study enemies, moves Roland and removes Study',()=>{
 const g=game();g.s.clues=2;g.spawn('01160');g.command('action',{kind:'advance'});
 assert.equal(g.s.act,2);assert.equal(g.s.location,'hallway');assert(!g.s.locations.study);assert.equal(g.s.enemies.length,0);assert(g.s.encDiscard.includes('01160'));
});
test('Act 2 can advance only from Hallway at end of round and spawns boss',()=>{
 const g=game();g.s.clues=5;g.command('action',{kind:'advance'});
 assert.throws(()=>g.command('action',{kind:'advance'}));g.endRound();assert.equal(g.s.pending.kind,'choice');choose(g);
 assert.equal(g.s.act,3);assert(g.s.enemies.some(e=>e.code==='01116'));assert(g.s.litaAvailable);assert.equal(g.s.clues,0);
});
test('specific Spawn location absent means discard instead of spawning elsewhere',()=>{
 const g=game();g.resolveEncounter('01118');assert.equal(g.s.enemies.length,0);assert(g.s.encDiscard.includes('01118'));
});
test('Machete + Vicious Blow kills and optional Roland discovers a clue',()=>{
 const g=game();g.s.assets=[{code:'01020',id:'machete',uses:0,hp:0,horror:0}];g.s.hand=['01025'];g.spawn('01161');
 g.command('action',{kind:'fight',target:g.s.enemies[0].id,weapon:'machete'});g.command('commit',{index:0});testSuccess(g);
 assert.equal(g.s.enemies.length,0);choose(g);assert.equal(g.s.clues,1);assert(g.s.rolandUsed);
});
test('Machete only deals one damage with multiple engaged enemies',()=>{
 const g=game();g.s.assets=[{code:'01020',id:'machete',uses:0,hp:0,horror:0}];g.spawn('01160');g.spawn('01160');const id=g.s.enemies[0].id;
 g.command('action',{kind:'fight',target:id,weapon:'machete'});testSuccess(g);assert.equal(g.s.enemies.find(e=>e.id===id).damage,1);
});
test('evading exhausts an enemy; moving does not drag it or provoke its attack',()=>{
 const g=game();g.s.clues=2;g.command('action',{kind:'advance'});g.spawn('01159');const id=g.s.enemies[0].id;
 g.command('action',{kind:'evade',target:id});g.s.pending.bonus=4;testSuccess(g);assert(g.s.enemies[0].exhausted);assert(!g.s.enemies[0].engaged);
 g.command('action',{kind:'move',to:'cellar'});assert.equal(g.s.enemies[0].location,'hallway');assert.equal(g.s.hp,1);
});
test('opportunity attacks resolve before a non-combat action',()=>{
 const g=game();g.spawn('01160');g.command('action',{kind:'resource'});assert.equal(g.s.hp,1);assert.equal(g.s.horror,1);assert.equal(g.s.resources,6);
});
test('failed attacks against Ghoul Priest retaliate',()=>{
 const g=game();g.spawn('01116');g.command('action',{kind:'fight',target:g.s.enemies[0].id});g.s.bag=['-4'];g.command('reveal');g.command('continue');assert.equal(g.s.hp,2);assert.equal(g.s.horror,2);
});
test('Frozen in Fear charges once per round and end-turn test can clear it',()=>{
 const g=game();g.s.clues=2;g.command('action',{kind:'advance'});g.s.fear=1;g.command('action',{kind:'move',to:'cellar'});assert.equal(g.s.actions,1);
 g.command('action',{kind:'move',to:'hallway'});assert.equal(g.s.actions,0);g.command('action',{kind:'end'});assert.equal(g.s.pending.testKind,'fear');testSuccess(g);assert.equal(g.s.fear,0);
});
test('Cover Up replaces discovery without consuming location clues',()=>{
 const g=game();g.s.cover=3;g.s.coverActive=true;g.command('action',{kind:'investigate'});testSuccess(g);choose(g);assert.equal(g.s.cover,2);assert.equal(g.s.clues,0);assert.equal(g.here().clues,2);
});
test('Crypt Chill asks which asset to discard',()=>{
 const g=game();g.equip('01020');g.resolveEncounter('01167');g.run();g.s.bag=['auto_fail'];g.command('reveal');g.command('continue');assert.equal(g.s.pending.kind,'choice');choose(g);assert.equal(g.s.assets.length,0);assert(g.s.discard.includes('01020'));
});
test('Obscuring Fog increases shroud and goes away after successful investigation',()=>{
 const g=game();g.resolveEncounter('01168');g.command('action',{kind:'investigate'});assert.equal(g.s.pending.difficulty,4);g.s.pending.bonus=2;testSuccess(g);assert(!g.here().fog);assert(g.s.encDiscard.includes('01168'));
});
test('assets respect hand slots and replacement is chosen',()=>{
 const g=game();g.equip('01020');g.equip('01087');g.equip('01030');assert.equal(g.s.pending.kind,'choice');choose(g);assert.equal(g.s.assets.length,2);assert(g.asset('01030'));
});
test('damage and horror can be assigned to allies',()=>{
 const g=game();g.equip('01018');g.push({type:'injury',d:1,h:1});g.run();choose(g,1);choose(g,1);assert.equal(g.asset('01018').hp,1);assert.equal(g.asset('01018').horror,1);assert.equal(g.s.hp,0);
});
test('boss defeat has both house resolutions and records XP',()=>{
 for(const resolution of ['R1','R2']){const g=game();g.s.clues=5;g.advanceAct();g.advanceAct();const boss=g.s.enemies.find(e=>e.code==='01116');g.hitEnemy({id:boss.id,amount:5});choose(g,resolution==='R1'?0:1);assert.equal(g.s.outcome.resolution,resolution);assert.equal(g.s.outcome.xp,resolution==='R1'?4:5);assert.equal(g.s.outcome.lita,resolution==='R1');}
});
test('agenda thresholds progress and final timeout ends the game',()=>{
 const g=game();g.s.doom=2;g.push({type:'doom'});g.run();assert.equal(g.s.agenda,2);assert.equal(g.s.doom,0);choose(g);
 g.s.agenda=3;g.s.doom=9;g.push({type:'doom'});g.run();assert.equal(g.s.outcome.resolution,'R3');
});
test('save/resume preserves an unresolved test and its RNG-independent result',()=>{
 const g=game();g.command('action',{kind:'investigate'});const resumed=new Engine(cards,JSON.parse(JSON.stringify(g.s)));resumed.s.bag=['0'];resumed.command('reveal');
 const second=new Engine(cards,JSON.parse(JSON.stringify(resumed.s)));second.command('continue');assert.equal(second.s.clues,1);
});
test('UI renderer covers each Act including Act 3 without missing card IDs',()=>{
 const g=game();assert.match(render(g),/data-inspect="01108"/);g.s.clues=5;g.advanceAct();assert.match(render(g),/data-inspect="01109"/);g.advanceAct();assert.match(render(g),/data-inspect="01110"/);
});
test('cannot evade an unengaged enemy',()=>{
 const g=game();g.spawn('01159');g.s.enemies[0].engaged=false;g.s.enemies[0].exhausted=true;
 assert.throws(()=>g.command('action',{kind:'evade',target:g.s.enemies[0].id}),/giao chiến/);
});
test('Machete counts exhausted engaged enemies for its bonus condition',()=>{
 const g=game();g.equip('01020');g.spawn('01160');g.s.enemies[0].exhausted=true;
 g.command('action',{kind:'fight',target:g.s.enemies[0].id,weapon:g.asset('01020').id});assert.equal(g.s.pending.damage,2);testSuccess(g);
 const h=game();h.equip('01020');h.spawn('01160');h.spawn('01160');h.s.enemies[0].exhausted=true;
 h.command('action',{kind:'fight',target:h.s.enemies[1].id,weapon:h.asset('01020').id});assert.equal(h.s.pending.damage,1);
});
test('a committed Perception cannot reshuffle into its own success draw',()=>{
 const g=game();g.s.deck=[];g.s.discard=[];g.s.hand=['01090'];g.command('action',{kind:'investigate'});g.command('commit',{index:0});testSuccess(g);
 choose(g,1);assert.equal(g.s.hand.length,0);assert.deepEqual(g.s.discard,['01090']);assert.equal(g.s.horror,0);
});
test('one simultaneous hit can assign both damage and horror to an ally before defeat',()=>{
 const g=game();g.equip('01018');g.push({type:'injury',d:2,h:2});g.run();for(let i=0;i<4;i++)choose(g,1);
 assert(!g.asset('01018'));assert.equal(g.s.hp,0);assert.equal(g.s.horror,0);assert(g.s.discard.includes('01018'));
});
test('Lita leaves the game when discarded rather than entering player draw cycle',()=>{
 const g=game();g.equip('01117');g.discardAsset(g.asset('01117').id);assert(!g.s.discard.includes('01117'));
});
