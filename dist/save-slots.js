import {INVESTIGATORS} from './rules-data.js';
import {campaignScenario} from './campaign-data.js';
import {separateInvestigatorState,restoreInvestigatorState} from './investigator-state.js';

const originalSoloKey='arkham-gathering-roland-v1';
export const saveSlotIds=['1','2','3','4'];
const unsafeSnapshotKeys=new Set(['__proto__','prototype','constructor']);

export function assertSafeSnapshotTree(value,depth=0){
 if(depth>32)throw Error('Dữ liệu lồng quá sâu.');
 if(!value||typeof value!=='object')return;
 for(const [key,entry] of Object.entries(value)){
  if(unsafeSnapshotKeys.has(key))throw Error('Dữ liệu có khóa không hợp lệ.');
  assertSafeSnapshotTree(entry,depth+1);
 }
}

export function slotStorageKey(slot,version){
 if(!saveSlotIds.includes(slot))throw Error('Ô lưu không hợp lệ.');
 return 'arkham-gathering-history-v'+version+(slot==='1'?'':'-'+slot);
}

export function slotSource(storage,slot){
 const keys=[slotStorageKey(slot,2),slotStorageKey(slot,1)];
 if(slot==='1')keys.push(originalSoloKey);
 for(const key of keys){
  const raw=storage.getItem(key);
  if(raw!==null)return {key,raw};
 }
 return null;
}

export function validSaveState(state,cards,{allowSandbox=false}={}){
 if(!state||state.version!==1||!Object.hasOwn(INVESTIGATORS,state.investigator??'01001')||
    (state.sandbox&&!allowSandbox)||!Object.hasOwn(state.locations??{},state.location))return false;
 const zones=['hand','deck','discard','encounter','encDiscard','victory'];
 if(zones.some(zone=>!Array.isArray(state[zone])||state[zone].some(code=>!Object.hasOwn(cards,code)))||
    ['queue','assets','enemies','log','bag'].some(key=>!Array.isArray(state[key])))return false;
 const seed=state.rngState;
 if(seed!==undefined&&(!Number.isInteger(seed)||seed<0||seed>0xffffffff))return false;
 try{
  const {scenario}=campaignScenario(state);
  return state.act>=1&&state.act<=(scenario.id==='01142'&&state.boss?4:3)&&state.agenda>=1&&state.agenda<=4;
 }catch{return false;}
}

export function readSaveSlot(storage,slot,cards){
 const source=slotSource(storage,slot);
 if(!source)return null;
 try{
  const saved=JSON.parse(source.raw);
  const isCurrent=source.key===slotStorageKey(slot,2);
  if(isCurrent&&(saved?.format!=='arkham-gathering-slot'||saved.version!==2||saved.rngVersion!==1)){
   throw Error('Phiên bản không được hỗ trợ.');
  }
  const state=saved.layout==='investigators-v1'?restoreInvestigatorState(saved.state):saved.state??saved;
  if(!validSaveState(state,cards))throw Error('Trạng thái không hợp lệ.');
  if(saved.layout==='investigators-v1'&&saved.checkpoint){
   saved.checkpoint=restoreInvestigatorState(saved.checkpoint);
  }
  return {saved,state,legacy:!isCurrent};
 }catch(error){
  throw Error('Không đọc được ô '+slot+'. Có thể tải bản lưu gốc trong Ô lưu.',{cause:error});
 }
}

export function writeSaveSlot(storage,slot,{state,checkpoint,commands,portableSeed,fingerprints}){
 storage.setItem(slotStorageKey(slot,2),JSON.stringify({
  format:'arkham-gathering-slot',version:2,rngVersion:1,layout:'investigators-v1',
  state:separateInvestigatorState(state),checkpoint:checkpoint?separateInvestigatorState(checkpoint):undefined,
  commands,portableSeed,fingerprints
 }));
}
