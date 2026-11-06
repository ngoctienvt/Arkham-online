import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Engine} from '../dist/engine.js';
import {replayHistory,replayFingerprint} from '../dist/game-history.js';
import {createDebugReport,readDebugReport,readLegacyDebugSnapshot,readSandboxFixture,writeSandboxFixture} from '../dist/debug-report.js';

const cards=JSON.parse(readFileSync(new URL('../dist/cards.json',import.meta.url),'utf8'));
const scenario=()=>{
 const engine=new Engine(cards,null,null,123);
 engine.command('mulligan');
 return engine;
};

test('sandbox changes are gated and preserve the original game',()=>{
 const original=scenario();
 const before=structuredClone(original.s);
 assert.throws(()=>original.command('sandboxEdit',{kind:'bag',tokens:['0']}),/Chỉ chỉnh Sandbox/);
 const sandbox=new Engine(cards,{...structuredClone(original.s),sandbox:true});
 assert.throws(()=>sandbox.command('sandboxEdit',{kind:'move',from:'deck',to:'encounter',index:0}),/không hợp lệ/);
 assert.throws(()=>sandbox.command('sandboxEdit',{kind:'bag',tokens:['unknown']}),/token hợp lệ/);
 sandbox.command('sandboxEdit',{kind:'bag',tokens:['0']});
 sandbox.command('action',{kind:'investigate'});
 assert.throws(()=>sandbox.command('sandboxEdit',{kind:'phase',phase:'mythos'}),/Chỉ chỉnh Sandbox/);
 sandbox.command('reveal',{token:'0'});
 assert.equal(sandbox.s.lastTest.token,'0');
 assert.deepEqual(original.s,before);
});

test('sandbox fixture reproduces Upkeep and a pending Encounter in a debug report',()=>{
 const original=scenario();
 const checkpoint={...structuredClone(original.s),sandbox:true};
 const index=checkpoint.encounter.indexOf('01166');
 assert.notEqual(index,-1);
 const commands=[
  {type:'sandboxEdit',args:{kind:'move',from:'encounter',to:'encDiscard',index}},
  {type:'sandboxEdit',args:{kind:'move',from:'encDiscard',to:'encounter',index:0}},
  {type:'sandboxEdit',args:{kind:'phase',phase:'upkeep'}}
 ];
 const fingerprints=[];
 const engine=replayHistory(cards,checkpoint,commands,commands.length,state=>fingerprints.push(replayFingerprint(state)));
 assert.equal(engine.s.round,2);
 assert.equal(engine.s.resources,6);
 assert.equal(engine.s.hand.length,6);
 assert.equal(engine.s.phaseStep,'encounter');
 assert.deepEqual(engine.s.pending,{kind:'encounter',code:'01166'});
 assert.equal(replayHistory(cards,checkpoint,commands,1).s.encDiscard.at(-1),'01166');
 const report=createDebugReport(engine,{checkpoint,commands,fingerprints});
 const imported=readDebugReport(cards,JSON.parse(JSON.stringify(report)));
 assert.deepEqual(JSON.parse(JSON.stringify(imported.engine.s)),JSON.parse(JSON.stringify(engine.s)));
 const drifted=JSON.parse(JSON.stringify(report));
 drifted.commands[0].args.index=(index+1)%checkpoint.encounter.length;
 assert.throws(()=>readDebugReport(cards,drifted),/không khớp ở bước 1/);
 const path=join(tmpdir(),'arkham-sandbox-'+randomUUID()+'.json');
 writeFileSync(path,JSON.stringify(report),{flag:'wx'});
 try{
  const replayScript=fileURLToPath(new URL('../tools/replay-report.mjs',import.meta.url));
  const result=execFileSync(process.execPath,[replayScript,path],{encoding:'utf8'});
  assert.match(result,/matched the exported state/);
 }finally{unlinkSync(path);}
});

test('debug import rejects unknown commands, unsafe keys and mismatched state',()=>{
 const engine=scenario();
 const report=JSON.parse(JSON.stringify(createDebugReport(engine,{checkpoint:engine.s,commands:[]})));
 assert.throws(()=>readDebugReport(cards,{...report,commands:[{type:'equip',args:{}}]}),/bước 1/);
 assert.throws(()=>readDebugReport(cards,{...report,commands:[
  {type:'sandboxEdit',args:{kind:'phase',phase:'upkeep',index:0}}
 ]}),/bước 1/);
 assert.throws(()=>readDebugReport(cards,{...report,state:{...report.state,resources:99}}),/không khớp/);
 const poisoned=JSON.parse(JSON.stringify(report).replace('"checkpoint":{','"checkpoint":{"__proto__":{},'));
 assert.throws(()=>readDebugReport(cards,poisoned),/khóa không hợp lệ/);
});

test('a Sandbox timing fixture starts after Encounter and resumes the next turn',()=>{
 const engine=scenario();
 engine.s.sandbox=true;
 engine.s.actions=0;
 engine.revealWeakness('01011');
 const checkpoint=structuredClone(engine.s);
 const commands=[
  {type:'sandboxEdit',args:{kind:'window',point:'after-encounter'}},
  {type:'closeWindow',args:{}}
 ];
 const paused=replayHistory(cards,checkpoint,commands,1);
 assert.equal(paused.s.pending.point,'after-encounter');
 assert.equal(paused.s.actions,0);
 const resumed=replayHistory(cards,checkpoint,commands);
 assert.equal(resumed.s.phase,'investigation');
 assert.equal(resumed.s.actions,3);
 const report=JSON.parse(JSON.stringify(createDebugReport(resumed,{checkpoint,commands})));
 assert.equal(readDebugReport(cards,report).engine.s.actions,3);
 const fixture=JSON.parse(JSON.stringify(writeSandboxFixture(paused,{checkpoint,commands:commands.slice(0,1)})));
 const imported=readSandboxFixture(cards,fixture);
 assert.equal(imported.engine.s.pending.point,'after-encounter');
 imported.engine.command('closeWindow');
 assert.equal(replayFingerprint(imported.engine.s),replayFingerprint(resumed.s));
 assert.throws(()=>readSandboxFixture(cards,{...fixture,checkpoint:{...checkpoint,sandbox:false}}),/fixture/);
 assert.throws(()=>readSandboxFixture(cards,{...fixture,content:'unknown'}),/fixture/);
 assert.throws(()=>readSandboxFixture(cards,{...fixture,state:{...fixture.state,actions:99}}),/khớp/);
});

test('a v1 report without RNG or trace is inspected as a snapshot',()=>{
 const engine=scenario();
 engine.command('action',{kind:'end'});
 const state=structuredClone(engine.s);
 delete state.rngState;
 const report={app:'The Gathering solo',version:1,state};
 const before=structuredClone(report);
 const snapshot=readLegacyDebugSnapshot(cards,report);
 assert.equal(snapshot.pending,'encounter');
 assert.equal(snapshot.round,2);
 assert.equal(snapshot.deckCount,state.deck.length);
 assert.equal(Object.hasOwn(snapshot,'rngState'),false);
 assert.deepEqual(report,before);
 assert.throws(()=>readDebugReport(cards,report),/v2/);
});

test('short reports show timing context without exposing the checkpoint, trace or local paths',()=>{
 const engine=scenario();
 engine.command('action',{kind:'end'});
 const report=createDebugReport(engine,{
  checkpoint:engine.s,commands:[{type:'action',args:{kind:'end'}}],mode:'basic',
  description:{steps:' Hết lượt ',expected:'Chờ Encounter',actual:'Đã rút'},
  errors:[{at:'now',message:'Could not read C:\\Users\\Player\\arkham.json',stack:'secret stack'}]
 });
 assert.equal(report.context.scenario,'01104');
 assert.equal(report.context.step,'encounter');
 assert.equal(report.steps,'Hết lượt');
 assert.equal(report.expected,'Chờ Encounter');
 assert.equal(report.actual,'Đã rút');
 for(const key of ['checkpoint','commands','state'])assert.equal(Object.hasOwn(report,key),false);
 assert.match(report.errors[0].message,/đường dẫn đã ẩn/);
 assert.doesNotMatch(JSON.stringify(report),/Player|secret stack/);
});
