import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Engine} from '../dist/engine.js';
import {mapDetails} from '../dist/house-map.js';

const cards=JSON.parse(readFileSync(new URL('../dist/cards.json',import.meta.url),'utf8'));
const game=()=>{
 const engine=new Engine(cards,null,()=>0.5);
 engine.command('mulligan');
 return engine;
};

function panelActions(engine,selectedRoom=engine.s.location){
 const html=mapDetails(engine,{selectedRoom});
 return [...html.matchAll(/<button data-command="action" data-args="([^"]*)"([^>]*)>/g)].map(([,args,attrs])=>({
  args:JSON.parse(args.replace(/&quot;/g,'"')),
  disabled:/\bdisabled\b/.test(attrs)
 }));
}

function clickAction(engine,kind,details={}){
 const action=panelActions(engine).find(({args})=>args.kind===kind&&Object.entries(details).every(([key,value])=>args[key]===value));
 assert.ok(action,`Missing ${kind} action`);
 assert.equal(action.disabled,false,`${kind} action is disabled`);
 engine.command('action',action.args);
}

test('the Study panel can draw a card, heal with First Aid and advance the act',()=>{
 const engine=game();
 engine.equip('01019');
 engine.s.hp=1;
 engine.s.deck.push('01087');
 assert.equal(panelActions(engine).find(({args})=>args.kind==='advance').disabled,true);
 clickAction(engine,'draw');
 assert.equal(engine.s.hand.at(-1),'01087');
 clickAction(engine,'heal',{stat:'hp'});
 assert.equal(engine.s.hp,0);
 assert.equal(engine.asset('01019').uses,2);
 assert.equal(engine.s.actions,1);
 engine.s.clues=2;
 clickAction(engine,'advance');
 assert.equal(engine.s.location,'hallway');
 assert.equal(engine.s.clues,0);
});

test('a remote room only offers movement and honors the Frozen in Fear cost',()=>{
 const engine=game();
 engine.s.clues=2;
 clickAction(engine,'advance');
 engine.spawn('01160','attic');
 engine.s.fear=1;
 engine.s.actions=1;
 assert.deepEqual(panelActions(engine,'attic'),[{args:{kind:'move',to:'attic'},disabled:true}]);
 engine.s.actions=2;
 assert.deepEqual(panelActions(engine,'attic'),[{args:{kind:'move',to:'attic'},disabled:false}]);
 assert.deepEqual(panelActions(engine,'parlor'),[]);
});

test('Locked Door blocks investigation and can be removed from the location panel',()=>{
 const engine=game();
 engine.resolveEncounter('01174');
 engine.s.bag=['0'];
 engine.equip('01018'); // Beat Cop brings Roland's combat up to 5.
 assert.equal(panelActions(engine).find(({args})=>args.kind==='investigate').disabled,true);
 clickAction(engine,'unlock',{skill:'combat'});
 assert.equal(engine.s.pending.testKind,'unlock');
 assert.ok(panelActions(engine).every(({disabled})=>disabled));
 engine.command('reveal');
 engine.command('continue');
 assert.equal(engine.here().locked,false);
 assert.ok(!panelActions(engine).some(({args})=>args.kind==='unlock'));
 assert.equal(panelActions(engine).find(({args})=>args.kind==='investigate').disabled,false);
});
