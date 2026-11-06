import {Engine} from './engine.js';
import {render,esc,img} from './view.js';
import {pendingDialog,cardDialog,helpDialog,outcomeDialog} from './dialogs.js';
import {MapController} from './map-controller.js';
import {animateTestFeedback,testFeedback} from './test-presentation.js';
import {historyStepLabel,replayHistory,replayFingerprint,validFingerprints,startPortableGame,readPortableGame,writePortableGame,portableSaveMaxBytes} from './game-history.js';
import {readDeckFile,writeDeckFile} from './deck-library.js';
import {deckEditorView,starterDraft,playableDeckError} from './deck-editor.js';
import {loadRemoteDeck,remoteDeckAvailable} from './deck-remote-client.js';
import {sandboxDialog} from './sandbox.js';
import {cardLibraryDialog} from './card-library.js';
import {createDebugReport,readDebugReport,readLegacyDebugSnapshot,debugImportMaxBytes,readSandboxFixture,writeSandboxFixture} from './debug-report.js';
import {saveSlotIds as SLOT_IDS,slotSource,readSaveSlot,writeSaveSlot,validSaveState} from './save-slots.js';
const SLOT_KEY='arkham-gathering-active-slot';
const DECK_KEY='arkham-gathering-decks-v1';
let activeSlot='1';
let unreadableSlot=null;
const app=document.querySelector('#app'),modal=document.querySelector('#modal-root'),inspector=document.querySelector('#inspect-root');
const actorPreview=document.querySelector('#actor-preview');
let engine,selected=new Set(),dismissed=false,toastTimer,storageFailed=false;
const errors=[];
let checkpoint,commands=[],portableSeed=null,fingerprints;
let historyIndex=null,sandbox=null;
let viewingReplay=false;
let deckDraft=null,deckIndex=-1;
let libraryFilters={},libraryCardOpen=false;
const mapController=new MapController({getEngine:()=>engine,repaint:paint});
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.style.display='none',5000);}
function failure(error){errors.push({at:new Date().toISOString(),message:error.message,stack:error.stack});console.error('[Arkham]',error);toast(error.message);}
window.addEventListener('error',e=>errors.push({at:new Date().toISOString(),message:e.message}));
window.addEventListener('unhandledrejection',e=>failure(e.reason instanceof Error?e.reason:new Error(String(e.reason))));
function save(){
 if(sandbox||activeSlot===unreadableSlot)return false;
 try{
  writeSaveSlot(localStorage,activeSlot,{state:engine.s,checkpoint,commands,portableSeed,fingerprints});
  storageFailed=false;return true;
 }catch(e){storageFailed=true;console.warn('[Arkham] Save unavailable',e.message);return false;}
}
function paint(){
 actorPreview.hidden=true;
 const layoutButton=document.querySelector('.masthead [data-layout-preview]');
 layoutButton.textContent=mapController.layoutPreview?'Quay lại ván':'Xem bàn 4 người';
 const title=engine.chapterInfo().name;
 document.querySelector('.scenario-heading h1').textContent=title;
 document.querySelector('.scenario-heading .eyebrow').textContent=engine.campaignInfo().name.toUpperCase()+' / MÀN '+engine.chapterInfo().label;
 document.title=title+' · Arkham Horror';
 mapController.sync();app.innerHTML=render(engine,mapController);
 modal.innerHTML=mapController.layoutPreview?'':engine.s.outcome&&!dismissed?outcomeDialog(engine):pendingDialog(engine,selected);
 if((storageFailed||activeSlot===unreadableSlot)&&!mapController.layoutPreview)document.querySelector('#save-status').textContent='⚠ Không lưu được';
 if(sandbox&&!mapController.layoutPreview)document.querySelector('#save-status').textContent='Sandbox · không ghi vào ván';
 // Dialogs trap focus. Preserve the last control where possible across redraws.
 const dialog=modal.querySelector('[role=dialog]');if(dialog&&!inspector.innerHTML)dialog.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
}
function act(type,args={}){
 try {
  const {clues,cover,location,enemies,pending}=engine.s;
  const before={clues,cover,location,enemies:enemies.map(enemy=>({...enemy})),pending};
  const actor=engine.commandActor(type);
  engine.command(type,args,actor);
  commands.push({type,args:structuredClone(args),actor});
  fingerprints?.push(replayFingerprint(engine.s));
  if(type==='nextChapter')dismissed=false;
  const effects=type==='nextChapter'?[]:testFeedback(before,engine.s,engine);
  save();paint();
  animateTestFeedback(app,effects);
  return true;
 } catch(e){failure(e);return false;}
}
function showCard(code){inspector.innerHTML=cardDialog(engine.cards,code,{fromLibrary:libraryCardOpen});inspector.querySelector('button')?.focus();}
function previewActor(event){
 const actor=event.target.closest('[data-hover-card]');
 if(!actor||modal.innerHTML||inspector.innerHTML)return;
 if(actor.contains(event.relatedTarget)&&!actorPreview.hidden)return;
 const code=actor.dataset.hoverCard,card=engine.card(code);
 actorPreview.classList.toggle('preview-left',actor.getBoundingClientRect().left>window.innerWidth/2);
 actorPreview.innerHTML=img(code,card.name);
 actorPreview.hidden=false;
}
function hideActorPreview(event){
 const actor=event.target.closest('[data-hover-card]');
 if(actor&&!actor.contains(event.relatedTarget))actorPreview.hidden=true;
}
app.addEventListener('pointerover',previewActor);
app.addEventListener('pointerout',hideActorPreview);
app.addEventListener('focusin',previewActor);
app.addEventListener('focusout',hideActorPreview);
app.addEventListener('click',()=>{actorPreview.hidden=true;});
function help(){inspector.innerHTML=helpDialog();inspector.querySelector('button')?.focus();}
function closeInspect(){
 libraryCardOpen=false;
 historyIndex=null;inspector.innerHTML='';
 if(viewingReplay){
  viewingReplay=false;
  app.inert=false;
  app.classList.remove('viewing-replay');
  document.querySelector('.masthead').inert=false;
  paint();
 }
 modal.querySelector('button:not(:disabled)')?.focus();
}
function currentDebugReport(){
 const form=inspector.querySelector('#report-form');
 const {mode='full',...description}=form?Object.fromEntries(new FormData(form)):{};
 return createDebugReport(engine,{checkpoint,commands,fingerprints,errors,mode,description});
}
function download(){
 downloadJson(currentDebugReport(),'the-gathering-debug-log.json');
}
function downloadJson(value,name){
 downloadSaveText(JSON.stringify(value,null,2),name);
}
function downloadSaveText(raw,name){
 const blob=new Blob([raw],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function reportDialog(){
 inspector.innerHTML=`<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="report-heading">
  <h2 id="report-heading">Báo lỗi</h2>
  <form id="report-form" class="report-fields">
   <label>Phạm vi <select name="mode"><option value="basic">Ngắn · thông tin màn và lỗi</option>
    <option value="full">Đầy đủ · kèm ván và lịch sử để tái hiện</option></select></label>
   <label>Mô tả lỗi <textarea name="notes" rows="2" maxlength="4000"></textarea></label>
   <label>Các bước tái hiện <textarea name="steps" rows="2" maxlength="4000"></textarea></label>
   <label>Kết quả mong đợi <textarea name="expected" rows="2" maxlength="4000"></textarea></label>
   <label>Kết quả thực tế <textarea name="actual" rows="2" maxlength="4000"></textarea></label>
   <div class="actions"><button type="button" data-close-inspect>Đóng</button>
    <button type="button" data-preview-log>Xem trước</button>
    <button type="submit" class="primary">Tải báo cáo</button></div>
  </form>
  <pre class="report-preview" hidden></pre>
  <div class="actions"><button data-import-report>Mở tệp báo cáo</button></div>
  <input hidden type="file" data-report-file accept=".json,application/json">
 </section></div>`;
 inspector.querySelector('textarea').focus();
}
function resetReport(){
 checkpoint=structuredClone(engine.s);commands=[];errors.length=0;
 fingerprints=[replayFingerprint(checkpoint)];
}
function readSlot(slot,cards){
 return readSaveSlot(localStorage,slot,cards);
}
function prepareSlot(cards,entry){
 const seed=entry?null:crypto.getRandomValues(new Uint32Array(1))[0];
 const next=entry?new Engine(cards,entry.state):startPortableGame(cards,seed);
 next.validate();
 return {next,seed};
}
function activateSlot({next,seed},entry){
 engine=next;resetReport();
 portableSeed=seed;
 const saved=entry?.saved;
 if(saved?.checkpoint&&validSaveState(saved.checkpoint,engine.cards)&&Number.isInteger(saved.checkpoint.rngState)&&Array.isArray(saved.commands)){
  checkpoint=saved.checkpoint;commands=saved.commands;
  fingerprints=validFingerprints(saved.fingerprints,commands.length)?saved.fingerprints:
   commands.length===0?[replayFingerprint(checkpoint)]:undefined;
  portableSeed=saved.portableSeed??null;
 }
}
function showSlots(){
 const canImport=!sandbox&&SLOT_IDS.some(slot=>slot!==activeSlot&&slotEmpty(slot));
 const slots=SLOT_IDS.map(slot=>{
  const recovery=`<button data-download-slot="${slot}">Ô ${slot} · Tải bản lưu lỗi</button>`;
  let label;
  try{
   if(slot===unreadableSlot&&slotSource(localStorage,slot))return recovery;
   const entry=readSlot(slot,engine.cards);
   label=entry?'Màn '+(entry.state.chapter??1)+' · Vòng '+entry.state.round:'Bắt đầu ván mới';
  }catch{return recovery;}
  return `<button data-open-slot="${slot}" ${slot===activeSlot||label==='Bản lưu lỗi'?'disabled':''}>Ô ${slot} · ${esc(slot===activeSlot?'Đang chơi':label)}</button>`;
 }).join('');
 inspector.innerHTML=`<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-label="Ô lưu ván">
  <h2>Ô lưu ván</h2><div class="choices">${slots}</div>
  <div class="actions">
  <button data-export-save ${sandbox?'disabled':''}>Xuất ván</button>
  <button data-import-save ${canImport?'':'disabled'}>Nhập vào ô trống</button>
  <input data-save-file type="file" accept=".json,application/json" hidden>
  <button data-close-inspect>Đóng</button></div></section></div>`;
 inspector.querySelector('button:not(:disabled)')?.focus();
}
function slotEmpty(slot){
 return slotSource(localStorage,slot)===null;
}
async function importSave(file){
 if(!file)return;
 if(file.size>portableSaveMaxBytes)throw Error('Tệp ván chơi vượt quá 2 MB.');
 const data=JSON.parse(await file.text());
 if(sandbox)throw Error('Hãy thoát Sandbox trước khi nhập ván.');
 const imported=readPortableGame(engine.cards,data);
 render(imported.engine);
 pendingDialog(imported.engine);
 if(imported.engine.s.outcome)outcomeDialog(imported.engine);
 const slot=SLOT_IDS.find(id=>id!==activeSlot&&slotEmpty(id));
 if(!slot)throw Error('Cần một ô lưu trống để nhập ván.');
 writeSaveSlot(localStorage,slot,{
  state:imported.engine.s,checkpoint:imported.checkpoint,commands:imported.commands,
  portableSeed:imported.seed,fingerprints:imported.fingerprints
 });
 showSlots();toast('Đã nhập ván vào ô '+slot+'.');
}
function openSlot(slot){
 if(sandbox)throw Error('Hãy thoát Sandbox trước khi đổi ô lưu.');
 if(!SLOT_IDS.includes(slot)||slot===activeSlot)return;
 const entry=readSlot(slot,engine.cards);
 const next=prepareSlot(engine.cards,entry);
 if(activeSlot!==unreadableSlot&&!save())throw Error('Không lưu được ván đang chơi.');
 localStorage.setItem(SLOT_KEY,slot);
 activeSlot=slot;activateSlot(next,entry);
 selected.clear();dismissed=false;closeInspect();save();paint();
}
function showHistory(index=commands.length){
 const replay=index===commands.length?engine:replayHistory(engine.cards,checkpoint,commands,index);
 historyIndex=index;
 const s=replay.s;
 const stateLabel=`Vòng ${s.round} · ${s.phase} · ${s.actions} action · ${s.resources} resource · ${s.clues} clue`;
 const recent=commands.slice(Math.max(0,index-8),index);
 const entries=recent.map((entry,offset)=>{
  const step=index-recent.length+offset+1;
  return `<li><button data-history-step="${step}">${step}. ${esc(historyStepLabel(entry))}</button></li>`;
 }).join('');
 inspector.innerHTML=`<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="history-title">
  <h2 id="history-title">Lịch sử ván</h2><p>Bước ${index} / ${commands.length} · ${esc(replay.chapterInfo().name)}</p>
  <p>${esc(stateLabel)}</p><ol>${entries}</ol>
  <div class="actions"><button data-history-step="0" ${index===0?'disabled':''}>Về đầu</button>
  <button data-history-step="${index-1}" ${index===0?'disabled':''}>← Bước trước</button>
  <button data-history-step="${index+1}" ${index===commands.length?'disabled':''}>Bước sau →</button>
  <button data-history-step="${commands.length}" ${index===commands.length?'disabled':''}>Mới nhất</button></div>
  <div class="actions"><button data-close-inspect>Đóng</button>
  <button data-board-replay>Xem lại trên bàn</button>
  <button data-restore-history ${index===commands.length?'disabled':''}>Quay về đây…</button></div></section></div>`;
 inspector.querySelector('button:not(:disabled)')?.focus();
}
function showBoardReplay(index=historyIndex){
 const replay=replayHistory(engine.cards,checkpoint,commands,index);
 historyIndex=index;
 viewingReplay=true;
 app.inert=true;
 app.classList.add('viewing-replay');
 document.querySelector('.masthead').inert=true;
 app.innerHTML=render(replay);
 modal.innerHTML='';
 actorPreview.hidden=true;
 const pending=pendingDialog(replay);
 inspector.innerHTML=`<section class="replay-controls" aria-label="Điều khiển phát lại">
  <p><strong>Phát lại · ${esc(replay.chapterInfo().name)}</strong>
   <span aria-live="polite">Bước ${index} / ${commands.length}</span></p>
  <div class="actions">
   <button data-board-step="0" ${index===0?'disabled':''}>Về đầu</button>
   <button data-board-step="${index-1}" ${index===0?'disabled':''}>← Bước trước</button>
   <button data-board-step="${index+1}" ${index===commands.length?'disabled':''}>Bước sau →</button>
   <button data-board-step="${commands.length}" ${index===commands.length?'disabled':''}>Mới nhất</button>
   <button data-replay-history>Lịch sử</button><button data-close-inspect>Về ván đang chơi</button>
  </div>
  ${pending?`<details><summary>Lựa chọn đang chờ</summary><div class="replay-pending">${pending}</div></details>`:''}
 </section>`;
 const preview=inspector.querySelector('.replay-pending');
 if(preview){
  const dialog=preview.querySelector('[role="dialog"]');
  dialog?.removeAttribute('role');
  dialog?.removeAttribute('aria-modal');
  for(const control of preview.querySelectorAll('button,input,select,textarea'))control.disabled=true;
 }
 inspector.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
}
function confirmHistory(){
 inspector.innerHTML=`<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-label="Quay về mốc lịch sử">
  <h2>Quay về bước ${historyIndex}?</h2><p>Các bước sau mốc này sẽ bị bỏ khỏi lịch sử đang chơi.</p>
  <div class="actions"><button data-history-step="${historyIndex}">Quay lại</button><button data-apply-history>Quay về mốc</button></div></section></div>`;
 inspector.querySelector('button').focus();
}
function restoreHistory(){
 const restored=replayHistory(engine.cards,checkpoint,commands,historyIndex);
 commands=commands.slice(0,historyIndex);
 fingerprints=fingerprints?.slice(0,historyIndex+1)??(historyIndex===0?[replayFingerprint(restored.s)]:undefined);
 engine=restored;selected.clear();dismissed=false;closeInspect();save();paint();
}
function toggleSandbox(){
 if(sandbox){
  ({engine,checkpoint,commands,dismissed,portableSeed,fingerprints}=sandbox);
  errors.splice(0,errors.length,...sandbox.errors);
  sandbox=null;
 }else{
  sandbox={engine,checkpoint,commands,dismissed,portableSeed,fingerprints,errors:[...errors]};
  engine=new Engine(engine.cards,structuredClone(engine.s));
  engine.s.sandbox=true;
  resetReport();
 }
 selected.clear();closeInspect();paint();
 document.querySelector('#sandbox-button').textContent=sandbox?'Thoát sandbox':'Sandbox';
 document.querySelector('#sandbox-edit').hidden=!sandbox;
}
async function importDebugFile(input){
 const fixture=input.hasAttribute('data-fixture-file');
 const file=input.files[0];
 input.value='';
 if(!file)return;
 if(file.size>debugImportMaxBytes)throw Error('Tệp vượt quá 2 MB.');
 const raw=await file.text();
 if(!input.isConnected)return;
 const report=JSON.parse(raw);
 if(!fixture&&report?.version===1){
  const snapshot=readLegacyDebugSnapshot(engine.cards,report);
  inspector.innerHTML=`<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-label="Snapshot v1">
   <h2>Snapshot v1</h2><p>Báo cáo chỉ có trạng thái tại thời điểm xuất. Có thể đọc tóm tắt bên dưới.</p>
   <pre class="report-preview"></pre><div class="actions"><button data-close-inspect>Đóng</button></div>
  </section></div>`;
  inspector.querySelector('pre').textContent=JSON.stringify(snapshot,null,2);
  inspector.querySelector('button').focus();
  return;
 }
 const imported=fixture?readSandboxFixture(engine.cards,report):readDebugReport(engine.cards,report);
 render(imported.engine);
 pendingDialog(imported.engine);
 if(imported.engine.s.outcome)outcomeDialog(imported.engine);
 if(!sandbox){
  sandbox={engine,checkpoint,commands,dismissed,portableSeed,fingerprints,errors:[...errors]};
 }
 engine=imported.engine;
 engine.s.sandbox=true;
 if(imported.checkpoint.sandbox){
  checkpoint=imported.checkpoint;commands=imported.commands;fingerprints=imported.fingerprints;errors.length=0;
 }else resetReport();
 portableSeed=null;dismissed=false;selected.clear();closeInspect();paint();
 document.querySelector('#sandbox-button').textContent='Thoát sandbox';
 document.querySelector('#sandbox-edit').hidden=false;
 toast(fixture?'Đã mở fixture trong Sandbox.':'Đã phát lại báo cáo trong Sandbox.');
}
function showSandboxEditor(){
 if(!sandbox)return;
 inspector.innerHTML=sandboxDialog(engine);
 inspector.querySelector('select,input,button')?.focus();
}
function submitSandbox(event){
 const fields=new FormData(event.target);
 if(event.target.dataset.sandboxForm==='move'){
  const [from,index]=fields.get('source').split(':');
  if(act('sandboxEdit',{kind:'move',from,to:fields.get('to'),index:Number(index)}))showSandboxEditor();
 }else{
  const tokens=fields.get('tokens').split(/[\s,]+/).filter(Boolean);
  if(act('sandboxEdit',{kind:'bag',tokens}))showSandboxEditor();
 }
}
function showCardLibrary(filters=libraryFilters){
 libraryFilters=filters;libraryCardOpen=false;
 inspector.innerHTML=cardLibraryDialog(engine.cards,filters);
 inspector.querySelector('input').focus();
}
function storedDecks(){
 const records=JSON.parse(localStorage.getItem(DECK_KEY)??'[]');
 if(!Array.isArray(records)||records.length>40)throw Error('Thư viện deck đã lưu không hợp lệ.');
 return records.map(readDeckFile);
}
function showDeckEditor(error=''){
 inspector.innerHTML=deckEditorView(engine,storedDecks(),deckDraft,error,remoteDeckAvailable);
 inspector.querySelector('button')?.focus();
}
function submitDeck(event){
 const fields=new FormData(event.target);
 const name=fields.get('name');
 fields.delete('name');
 const slots=Object.fromEntries([...fields].map(([code,count])=>[code,Number(count)]));
 deckDraft=readDeckFile({name,investigator_code:deckDraft.investigator,slots});
 const operation=event.submitter?.value??'save';
 const error=playableDeckError(engine.cards,deckDraft);
 if(operation==='play'){
  if(error){showDeckEditor(error);return;}
  closeInspect();
  act('selectInvestigator',{code:deckDraft.investigator,deck:deckDraft.deck});
  return;
 }
 if(operation==='export'){
  downloadJson(writeDeckFile(deckDraft),'arkham-deck.json');
 }else{
  const decks=storedDecks();
  if(operation==='copy')deckDraft.name=(deckDraft.name.slice(0,91)+' (bản sao)');
  const index=operation==='copy'||deckIndex<0?decks.length:deckIndex;
  if(index>=40)throw Error('Thư viện đã có 40 deck.');
  decks[index]=deckDraft;
  localStorage.setItem(DECK_KEY,JSON.stringify(decks.map(writeDeckFile)));
  deckIndex=index;
  toast('Đã lưu deck.');
 }
 showDeckEditor(error);
}
document.addEventListener('submit',event=>{
 if(event.target.id==='remote-deck-form'){
  event.preventDefault();
  const form=event.target,button=event.submitter;
  if(button)button.disabled=true;
  loadRemoteDeck(new FormData(form).get('source')).then(data=>{
   if(!form.isConnected)return;
   deckDraft=readDeckFile(data);deckIndex=-1;
   showDeckEditor(playableDeckError(engine.cards,deckDraft));
  }).catch(failure).finally(()=>{if(button)button.disabled=false;});
  return;
 }
 if(event.target.id==='report-form'){
  event.preventDefault();download();return;
 }
 if(event.target.matches('[data-sandbox-form]')){
  event.preventDefault();submitSandbox(event);return;
 }
 if(event.target.id==='deck-editor-form'){
  event.preventDefault();
  try{submitDeck(event);}catch(error){failure(error);}
  return;
 }
 if(event.target.id!=='card-library-form')return;
 event.preventDefault();showCardLibrary(Object.fromEntries(new FormData(event.target)));
});
inspector.addEventListener('change',event=>{
 if(event.target.matches('[data-report-file],[data-fixture-file]')){
  importDebugFile(event.target).catch(failure);return;
 }
 if(event.target.matches('[data-deck-file]')){
  const file=event.target.files[0];
  if(!file)return;
  if(file.size>100_000){failure(Error('Tệp deck vượt quá 100 KB.'));return;}
  file.text().then(text=>{
   if(!event.target.isConnected)return;
   deckDraft=readDeckFile(JSON.parse(text));deckIndex=-1;
   showDeckEditor(playableDeckError(engine.cards,deckDraft));
  }).catch(failure);
  return;
 }
 if(event.target.matches('[data-save-file]')){
  const file=event.target.files[0];
  event.target.value='';
  importSave(file).catch(failure);
 }
});
function restart(){
 inspector.innerHTML=`<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-label="Bắt đầu ván mới"><span class="eyebrow">VÁN MỚI</span><h2>Thay ván đang lưu?</h2><p>Ván hiện tại sẽ được thay bằng một ván The Gathering mới. Bạn có thể tải nhật ký trước khi bắt đầu lại.</p><div class="actions"><button data-download-log>Tải nhật ký</button><button data-close-inspect>Tiếp tục ván cũ</button><button class="primary" data-confirm-restart>Bắt đầu ván mới</button></div></section></div>`;
 inspector.querySelector('button')?.focus();
}
document.addEventListener('click',event=>{
 const el=event.target.closest('button');
 if(!el){if(event.target.classList.contains('overlay')&&event.target.closest('#inspect-root'))closeInspect();return;}
 if(el.disabled)return;
 if(viewingReplay){
  try{
   if(el.hasAttribute('data-board-step'))showBoardReplay(Number(el.dataset.boardStep));
   else if(el.hasAttribute('data-replay-history')){
    const index=historyIndex;
    closeInspect();showHistory(index);
   }else if(el.hasAttribute('data-close-inspect'))closeInspect();
  }catch(error){failure(error);}
  return;
 }
 if(el.hasAttribute('data-layout-preview')){
  mapController.layoutPreview=!mapController.layoutPreview;
  paint();window.scrollTo(0,0);return;
 }
 if(!mapController.layoutPreview&&engine&&mapController.click(event))return;
 if(mapController.layoutPreview&&!el.matches('[data-inspect],[data-close-inspect]'))return;
 if(el.hasAttribute('data-buy-upgrade')){
  const [add,remove]=document.querySelector('#upgrade-choice').value.split(':');
  act('upgrade',{add,remove});return;
 }
 if(el.dataset.command){
  if(el.dataset.command==='sandboxEdit')closeInspect();
  act(el.dataset.command,JSON.parse(el.dataset.args||'{}'));return;
 }
 if(el.hasAttribute('data-inspect')){showCard(el.dataset.inspect);return;}
 if(el.hasAttribute('data-mulligan')){const i=Number(el.dataset.mulligan);selected.has(i)?selected.delete(i):selected.add(i);paint();return;}
 if(el.hasAttribute('data-start')){act('mulligan',{indices:[...selected]});selected.clear();return;}
 if(el.hasAttribute('data-help')||el.id==='help-button'){help();return;}
 if(el.hasAttribute('data-close-inspect')){closeInspect();return;}
 try{
  if(el.id==='history-button'){showHistory();return;}
  if(el.hasAttribute('data-board-replay')){showBoardReplay();return;}
  if(el.hasAttribute('data-history-step')){showHistory(Number(el.dataset.historyStep));return;}
  if(el.hasAttribute('data-restore-history')){confirmHistory();return;}
  if(el.hasAttribute('data-apply-history')){restoreHistory();return;}
  if(el.id==='sandbox-button'){toggleSandbox();return;}
  if(el.id==='sandbox-edit'){showSandboxEditor();return;}
  if(el.id==='library-button'||el.hasAttribute('data-library-back')){showCardLibrary();return;}
  if(el.hasAttribute('data-library-clear')){showCardLibrary({});return;}
  if(el.hasAttribute('data-deck-editor')){deckDraft=null;deckIndex=-1;showDeckEditor();return;}
  if(el.dataset.deckNew){deckDraft=starterDraft(engine.cards,el.dataset.deckNew);deckIndex=-1;showDeckEditor();return;}
  if(el.hasAttribute('data-deck-open')){
   deckIndex=Number(el.dataset.deckOpen);deckDraft=storedDecks()[deckIndex];
   showDeckEditor(playableDeckError(engine.cards,deckDraft));return;
  }
  if(el.hasAttribute('data-deck-import')){inspector.querySelector('[data-deck-file]').click();return;}
  if(el.dataset.libraryCard){libraryCardOpen=true;showCard(el.dataset.libraryCard);return;}
  if(el.id==='slots-button'){showSlots();return;}
  if(el.dataset.downloadSlot){
   const slot=el.dataset.downloadSlot;
   const source=slotSource(localStorage,slot);
   if(source)downloadSaveText(source.raw,'arkham-slot-'+slot+'-recovery.json');
   return;
  }
  if(el.hasAttribute('data-import-save')){inspector.querySelector('[data-save-file]').click();return;}
  if(el.hasAttribute('data-export-save')){
   const exported=writePortableGame(engine.cards,portableSeed,commands,engine.s,checkpoint);
   const json=JSON.stringify(exported);
   if(new Blob([json]).size>portableSaveMaxBytes)throw Error('Tệp ván chơi vượt quá 2 MB.');
   downloadSaveText(json,'arkham-gathering-save.json');return;
  }
  if(el.dataset.openSlot){openSlot(el.dataset.openSlot);return;}
 }catch(error){failure(error);return;}
 if(el.id==='log-button'||el.hasAttribute('data-open-report')){reportDialog();return;}
 if(el.hasAttribute('data-preview-log')){
  const preview=inspector.querySelector('.report-preview');
  const json=JSON.stringify(currentDebugReport(),null,2);
  preview.textContent=json.length>12000?json.slice(0,12000)+'\n… (tệp tải xuống chứa toàn bộ)':json;
  preview.hidden=false;return;
 }
 if(el.hasAttribute('data-import-report')){inspector.querySelector('[data-report-file]').click();return;}
 if(el.hasAttribute('data-import-fixture')){inspector.querySelector('[data-fixture-file]').click();return;}
 if(el.hasAttribute('data-export-fixture')&&sandbox){
  downloadJson(writeSandboxFixture(engine,{checkpoint,commands,fingerprints}),'arkham-sandbox-fixture.json');return;
 }
 if(el.hasAttribute('data-download-log')){download();return;}
 if(el.hasAttribute('data-restart')||el.id==='restart-button'){restart();return;}
 if(el.hasAttribute('data-confirm-restart')){
  const fresh=prepareSlot(engine.cards,null);
  if(sandbox)fresh.next.s.sandbox=true;
  activateSlot(fresh,null);selected.clear();dismissed=false;closeInspect();save();paint();return;
 }
 if(el.hasAttribute('data-dismiss-outcome')){dismissed=true;paint();return;}
 if(el.hasAttribute('data-show-outcome')){dismissed=false;paint();}
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape')actorPreview.hidden=true;
 if(event.key==='Escape'&&inspector.innerHTML){closeInspect();return;}
 if(event.key==='Tab'){
  const dialog=inspector.querySelector('[role=dialog]')??modal.querySelector('[role=dialog]');if(!dialog)return;
  const focus=[...dialog.querySelectorAll('button:not(:disabled),a[href],textarea:not(:disabled),select:not(:disabled),input:not(:disabled):not([hidden])')];if(!focus.length)return;
  const first=focus[0],last=focus.at(-1);
  if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus();}
 }
});
try{
 const response=await fetch('cards.json');if(!response.ok)throw Error('Không tải được dữ liệu bài. Hãy chạy bằng launcher hoặc máy chủ cục bộ.');
 const cards=await response.json();
 let entry,next;
 try{
  const slot=localStorage.getItem(SLOT_KEY);
  if(SLOT_IDS.includes(slot))activeSlot=slot;
  entry=readSlot(activeSlot,cards);next=prepareSlot(cards,entry);
 }catch(e){
  unreadableSlot=activeSlot;
  entry=null;next=prepareSlot(cards,null);
  toast('Không đọc được ô lưu. Mở Ô lưu để tải bản gốc hoặc chuyển sang ô khác.');
 }
 activateSlot(next,entry);if(entry)save();paint();
}catch(e){failure(e);app.innerHTML=`<div class="loading"><h2>Chưa thể mở bàn chơi</h2><p>${esc(e.message)}</p><p>Chạy start-game.cmd trong thư mục trò chơi.</p></div>`;}
