import {replayHistory,validFingerprints,checkReplayStep} from './game-history.js';
import {validSaveState,assertSafeSnapshotTree} from './save-slots.js';
import {validDebugCommand} from './command-schema.js';

export const debugBuildVersion='gathering-2';
export const debugContentVersion='notz-1';
export const debugImportMaxBytes=2_000_000;
const fixtureFormat='arkham-sandbox-fixture';

export function writeSandboxFixture(engine,trace){
 if(engine.s.sandbox!==true||trace.checkpoint?.sandbox!==true)throw Error('Chỉ xuất fixture từ Sandbox.');
 const {content,rngVersion,checkpoint,commands,state,fingerprints}=createDebugReport(engine,trace);
 return {format:fixtureFormat,version:1,content,rngVersion,checkpoint,commands,state,fingerprints};
}

export function readSandboxFixture(cards,fixture){
 if(fixture?.format!==fixtureFormat||fixture.version!==1||
    fixture.content!==debugContentVersion||fixture.rngVersion!==1||
    fixture.checkpoint?.sandbox!==true||fixture.state?.sandbox!==true){
  throw Error('Tệp fixture Sandbox không hợp lệ.');
 }
 assertSafeSnapshotTree(fixture);
 return readDebugReport(cards,{...fixture,app:'The Gathering solo',version:2,mode:'full'});
}

function reportStateMatches(actual,expected){
 if(actual===expected)return true;
 if(!actual||!expected||typeof actual!=='object'||typeof expected!=='object')return false;
 const ignored=key=>key==='log'||(key==='point'&&
  (actual.kind==='window'||actual.type==='window')&&!Object.hasOwn(expected,key));
 const keys=Object.keys(actual).filter(key=>actual[key]!==undefined&&!ignored(key));
 return keys.length===Object.keys(expected).filter(key=>!ignored(key)).length&&
  keys.every(key=>Object.hasOwn(expected,key)&&reportStateMatches(actual[key],expected[key]));
}

export function readLegacyDebugSnapshot(cards,report){
 if(report?.app!=='The Gathering solo'||report.version!==1){
  throw Error('Cần báo cáo snapshot v1 của The Gathering.');
 }
 assertSafeSnapshotTree(report);
 const {state}=report;
 if(!validSaveState(state,cards,{allowSandbox:true})){
  throw Error('Snapshot v1 không hợp lệ.');
 }
 return {
  chapter:state.chapter??1,round:state.round,phase:state.phase,step:state.phaseStep??null,
  pending:state.pending?.kind??null,location:state.location,
  investigator:state.investigator??'01001',
  healthDamage:state.hp,horror:state.horror,resources:state.resources,clues:state.clues,
  handCount:state.hand.length,deckCount:state.deck.length,
  encounterCount:state.encounter.length,queuedEffects:state.queue.length,
  resolution:state.outcome?.resolution??null,
  recentLog:state.log.slice(-20).map(entry=>reportError(entry?.message))
 };
}

export function readDebugReport(cards,report){
 if(report?.app!=='The Gathering solo'||report.version!==2||
    (report.mode!==undefined&&report.mode!=='full')||
    (report.content!==undefined&&report.content!==debugContentVersion)||
    (report.rngVersion!==undefined&&report.rngVersion!==1)){
  throw Error('Cần báo cáo đầy đủ v2 của The Gathering.');
 }
 assertSafeSnapshotTree(report);
 const {checkpoint,commands,state,fingerprints}=report;
 if(!validSaveState(checkpoint,cards,{allowSandbox:true})||
    !validSaveState(state,cards,{allowSandbox:true})||
    !Number.isInteger(checkpoint.rngState)||!Array.isArray(commands)||commands.length>5000){
  throw Error('Checkpoint hoặc lịch sử trong báo cáo không hợp lệ.');
 }
 if(fingerprints!==undefined&&!validFingerprints(fingerprints,commands.length)){
  throw Error('Danh sách dấu trạng thái không hợp lệ.');
 }
 for(const [index,entry] of commands.entries()){
  if(!validDebugCommand(entry?.type,entry?.args)){
   throw Error('Lệnh không hợp lệ ở bước '+(index+1)+'.');
  }
 }
 const engine=replayHistory(cards,checkpoint,commands,commands.length,
  fingerprints?(state,index)=>checkReplayStep(fingerprints,state,index):undefined);
 if(!reportStateMatches(engine.s,state))throw Error('Trạng thái sau phát lại không khớp báo cáo.');
 return {engine,checkpoint,commands,fingerprints};
}

function reportError(message){
 return String(message??'').slice(0,1000)
  .replace(/(?:file:\/\/\/|[a-z]:[\\/]|\\\\|\/(?:home|Users|tmp|var)\/)[^\r\n"'<>]*/gi,'[đường dẫn đã ẩn]');
}

export function createDebugReport(engine,{checkpoint,commands,fingerprints,errors=[],mode='full',description={},now=new Date()}){
 const state=engine.s;
 const report={
  app:'The Gathering solo',version:2,mode,build:debugBuildVersion,content:debugContentVersion,
  exportedAt:now.toISOString(),
  context:{
   campaign:engine.campaignInfo().id,scenario:engine.chapterInfo().id,difficulty:engine.difficulty(),
   round:state.round,phase:state.phase,step:state.phaseStep??null,
   pending:state.pending?.kind??null,window:state.pending?.point??null,
   sandbox:state.sandbox===true,optionalRules:state.optionalRules??null,storyLanguage:engine.storyLanguage()
  },
  notes:String(description.notes??'').trim().slice(0,4000),
  steps:String(description.steps??'').trim().slice(0,4000),
  expected:String(description.expected??'').trim().slice(0,4000),
  actual:String(description.actual??'').trim().slice(0,4000),
  errors:errors.slice(-50).map(({at,message})=>({at,message:reportError(message)}))
 };
 if(mode==='full'){
  report.rngVersion=1;
  Object.assign(report,{checkpoint,commands,state});
  if(validFingerprints(fingerprints,commands.length))report.fingerprints=fingerprints;
 }else if(mode!=='basic')throw Error('Loại báo cáo không hợp lệ.');
 return report;
}
