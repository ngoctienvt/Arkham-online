import {Engine} from './engine.js';
import {validPortableCommand} from './command-schema.js';
import {validSaveState,assertSafeSnapshotTree} from './save-slots.js';

const portableContent='notz-1';
export const portableSaveMaxBytes=2_000_000;

export function replayFingerprint(state){
 const {log,...rulesState}=state;
 let hash=2166136261;
 // Named windows describe existing timing. Keep checksums from older saves readable.
 const encoded=JSON.stringify(rulesState,function(key,value){
  if(key==='point'&&(this.kind==='window'||this.type==='window'))return undefined;
  return value;
 });
 for(let index=0;index<encoded.length;index++){
  hash=Math.imul(hash^encoded.charCodeAt(index),16777619);
 }
 return (hash>>>0).toString(16).padStart(8,'0');
}

export function validFingerprints(fingerprints,commandCount){
 return Array.isArray(fingerprints)&&fingerprints.length===commandCount+1&&
  fingerprints.every(value=>typeof value==='string'&&/^[0-9a-f]{8}$/.test(value));
}

export function checkReplayStep(fingerprints,state,index){
 if(replayFingerprint(state)!==fingerprints[index]){
  throw Error('Dữ liệu ván chơi không khớp ở bước '+index+'.');
 }
}

export function startPortableGame(cards,seed){
 const engine=new Engine(cards,null,null,seed);
 engine.setupCampaign();
 return engine;
}

export function readPortableGame(cards,save){
 if(save?.format!=='arkham-gathering-save'||![1,2].includes(save.version)||save.content!==portableContent||
    !Array.isArray(save.commands)||save.commands.length>5000||
    !validFingerprints(save.fingerprints,save.commands.length))throw Error('Tệp ván chơi không được hỗ trợ.');
 let checkpoint,seed=null;
 if(save.version===1){
  seed=save.seed;
  if(!validPortableSeed(seed))throw Error('Tệp ván chơi không được hỗ trợ.');
  checkpoint=startPortableGame(cards,seed).s;
 }else{
  checkpoint=save.checkpoint;
  validatePortableCheckpoint(cards,checkpoint);
 }
 const commands=save.commands.map((entry,index)=>{
  if(!validPortableCommand(entry?.type,entry?.args)){
   throw Error('Lệnh không hợp lệ ở bước '+(index+1)+'.');
  }
  if(entry.actor!==undefined&&entry.actor!=='seat-1')throw Error('Ghế không hợp lệ ở bước '+(index+1)+'.');
  return {type:entry.type,args:entry.args,...(entry.actor===undefined?{}:{actor:entry.actor})};
 });
 const engine=replayHistory(cards,checkpoint,commands,commands.length,(state,index)=>{
  checkReplayStep(save.fingerprints,state,index);
 });
 return {engine,checkpoint,commands,seed,fingerprints:save.fingerprints};
}

function validPortableSeed(seed){return Number.isInteger(seed)&&seed>=0&&seed<=0xffffffff;}
function validatePortableCheckpoint(cards,checkpoint){
 assertSafeSnapshotTree(checkpoint);
 if(!validSaveState(checkpoint,cards)||!validPortableSeed(checkpoint.rngState)||
    checkpoint.queue.length>500||checkpoint.log.length>700){
  throw Error('Checkpoint trong tệp ván chơi không hợp lệ.');
 }
}

export function writePortableGame(cards,seed,commands,current,savedCheckpoint){
 if((seed!==null&&!validPortableSeed(seed))||commands.length>5000){
  throw Error('Ván chơi không thể xuất ở định dạng này.');
 }
 for(const [index,entry] of commands.entries()){
  if(!validPortableCommand(entry?.type,entry?.args)||(entry.actor!==undefined&&entry.actor!=='seat-1')){
   throw Error('Lệnh không hợp lệ ở bước '+(index+1)+'.');
  }
 }
 const checkpoint=seed===null?savedCheckpoint:startPortableGame(cards,seed).s;
 if(seed===null)validatePortableCheckpoint(cards,checkpoint);
 const fingerprints=[];
 replayHistory(cards,checkpoint,commands,commands.length,state=>fingerprints.push(replayFingerprint(state)));
 if(current&&fingerprints.at(-1)!==replayFingerprint(current)){
  throw Error('Lịch sử không dựng lại được trạng thái đang chơi.');
 }
 return {format:'arkham-gathering-save',version:seed===null?2:1,content:portableContent,
  ...(seed===null?{checkpoint}:{seed}),commands,fingerprints};
}

export function replayHistory(cards, checkpoint, commands, count=commands.length,visit){
 if(!Number.isInteger(count)||count<0||count>commands.length)throw Error('Mốc lịch sử không hợp lệ.');
 const replay=new Engine(cards,structuredClone(checkpoint));
 replay.validate();
 visit?.(replay.s,0);
 for(let i=0;i<count;i++){
  const {type,args,actor}=commands[i];
  try{replay.command(type,args,actor);}
  catch(error){throw Error('Không thể phát lại bước '+(i+1)+': '+error.message);}
  visit?.(replay.s,i+1);
 }
 return replay;
}

export function historyStepLabel(entry){
 const labels={action:'Hành động',choose:'Lựa chọn',reveal:'Rút token',continue:'Xong kiểm tra',
  nextChapter:'Sang màn',mulligan:'Đổi bài',resolveEncounter:'Xử lý Encounter',commit:'Góp bài',
  selectInvestigator:'Chọn điều tra viên',continueStory:'Đọc dẫn truyện',upgrade:'Nâng cấp deck'};
 return Object.hasOwn(labels,entry.type)?labels[entry.type]:entry.type;
}
