import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveDeckSource,fetchRemoteDeck} from '../tools/remote-decks.cjs';

test('remote deck sources map to fixed HTTPS endpoints',()=>{
 assert.equal(resolveDeckSource('61463').url,'https://arkhamdb.com/api/public/decklist/61463.json');
 assert.equal(resolveDeckSource('https://arkham.build/deck/view/33039').url,
  'https://arkhamdb.com/api/public/deck/33039.json');
 assert.equal(resolveDeckSource('https://arkham.build/deck/view/qBw2w2pJJKM3OvB').url,
  'https://api.arkham.build/v1/public/share_history/qBw2w2pJJKM3OvB');
 for(const url of ['http://arkhamdb.com/deck/view/1','https://arkhamdb.com.evil.test/deck/view/1',
  'https://user@arkhamdb.com/deck/view/1','https://127.0.0.1/deck/view/1']){
  assert.throws(()=>resolveDeckSource(url));
 }
});

test('remote responses yield editable drafts and requests forbid redirects',async()=>{
 const deck={name:'Draft',investigator_code:'01001',slots:{'01016':2,'09999':1}};
 for(const [input,response] of [
  ['61463',deck],['arkham.build:qBw2w2pJJKM3OvB',{data:deck,history:[]}]
 ]){
  const imported=await fetchRemoteDeck(input,async(url,options)=>{
   assert.equal(url,resolveDeckSource(input).url);
   assert.equal(options.redirect,'error');
   return Response.json(response);
  });
  assert.deepEqual(imported,deck);
 }
 await assert.rejects(fetchRemoteDeck('61463',async()=>new Response(null,{status:404})),/HTTP 404/);
});
