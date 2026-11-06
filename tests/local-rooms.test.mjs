import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {roomStore,roomRoutes} from '../tools/local-rooms.cjs';
import {INVESTIGATORS} from '../dist/rules-data.js';
import {writeDeckFile} from '../dist/deck-library.js';

test('local rooms claim four distinct seats and reconnect after reopening storage',()=>{
 const file=fileURLToPath(new URL('../outputs/arkham-rooms-test-'+randomUUID()+'.json',import.meta.url));
 try{
  const store=roomStore(file);
  const host=store.create(4);
  assert.throws(()=>store.join(host.id,host.token),{status:403});
  const guests=Array.from({length:3},()=>store.join(host.id,host.invite));
  assert.deepEqual(guests.map(seat=>seat.seat),['seat-2','seat-3','seat-4']);
  assert.throws(()=>store.join(host.id,host.invite),{status:409});
  const reopened=roomStore(file);
  const result=reopened.resume(host.id,guests[1].token);
  assert.equal(result.seat,'seat-3');
  assert.equal(result.revision,4);
  assert.equal(result.seats.length,4);
  assert.throws(()=>reopened.resume(host.id,host.invite),{status:403});
  assert.ok(!Object.hasOwn(result,'invite')&&!Object.hasOwn(result,'token'));
  const saved=readFileSync(file,'utf8');
  for(const value of [host.invite,host.token,...guests.map(guest=>guest.token)])assert.ok(!saved.includes(value));
 }finally{
  rmSync(file,{force:true});
  rmSync(file+'.tmp',{force:true});
 }
});

test('room HTTP routes reject cross-origin writes and invalid request bodies',async()=>{
 const file=fileURLToPath(new URL('../outputs/arkham-rooms-test-'+randomUUID()+'.json',import.meta.url));
 const origin='http://127.0.0.1:8786';
 const route=roomRoutes(roomStore(file),origin);
 async function create(body,from=origin){
  const req=Readable.from([Buffer.from(body)]);
  req.method='POST';
  req.headers={origin:from,'content-type':'application/json'};
  const result={};
  const res={writeHead:status=>{result.status=status;},end:data=>{result.body=JSON.parse(data);}};
  await route(req,res,'/api/rooms/create');
  return result;
 }
 try{
  assert.equal((await create('{"capacity":2}','http://example.test')).status,403);
  assert.equal((await create('["invalid"]')).status,400);
  assert.equal((await create(' '.repeat(4097))).status,413);
  const result=await create('{"capacity":2}');
  assert.equal(result.status,201);
  assert.equal(result.body.seat,'seat-1');
 }finally{
  rmSync(file,{force:true});
  rmSync(file+'.tmp',{force:true});
 }
});

test('deck selection is seat-scoped, private, revision-checked and safe to retry after restart',()=>{
 const file=fileURLToPath(new URL('../outputs/arkham-rooms-test-'+randomUUID()+'.json',import.meta.url));
 try{
  const store=roomStore(file);
  const host=store.create(2);
  const guest=store.join(host.id,host.invite);
  const {deck}=INVESTIGATORS['01001'];
  const request={
   id:host.id,token:host.token,actor:host.seat,revision:guest.revision,requestId:randomUUID(),
   deck:writeDeckFile({name:'Private Roland',investigator:'01001',deck:[...deck,...deck]})
  };
  assert.throws(()=>store.selectDeck({...request,actor:guest.seat}),{status:403});
  assert.throws(()=>store.selectDeck({...request,revision:1}),{status:409});
  assert.throws(()=>store.selectDeck({...request,deck:{...request.deck,slots:{'01016':30}}}),{status:400});
  const selected=store.selectDeck(request);
  assert.equal(selected.revision,guest.revision+1);
  assert.equal(selected.deck.name,'Private Roland');
  const reopened=roomStore(file);
  assert.equal(reopened.selectDeck(request).revision,selected.revision);
  assert.throws(()=>reopened.selectDeck({...request,deck:{...request.deck,name:'Changed'}}),{status:409});
  const otherView=reopened.resume(guest.id,guest.token);
  assert.deepEqual(otherView.readySeats,['seat-1']);
  assert.equal(otherView.deck,null);
  assert.doesNotMatch(JSON.stringify(otherView),/Private Roland|01016/);
 }finally{
  rmSync(file,{force:true});
  rmSync(file+'.tmp',{force:true});
 }
});
