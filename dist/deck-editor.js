import {INVESTIGATORS} from './rules-data.js';
import {esc} from './ui-utils.js';
import {startingDeckPool,validateStartingDeck,writeDeckFile} from './deck-library.js';

export function starterDraft(cards,investigator){
 const {deck}=INVESTIGATORS[investigator];
 return {name:cards[investigator].name,investigator,deck:[...deck,...deck]};
}

export function deckEditorView(engine,drafts,draft,error='',remoteAvailable=false){
 const entries=Object.keys(INVESTIGATORS).map(code=>
  `<button type="button" data-deck-new="${code}">Deck mới · ${esc(engine.cards[code].name)}</button>`).join('');
 const saved=drafts.map((item,index)=>
  `<button type="button" data-deck-open="${index}">${esc(item.name)} · ${esc(engine.cards[item.investigator].name)}</button>`).join('');
 let editor='';
 if(draft){
  const {slots}=writeDeckFile(draft);
  const pool=[...new Set([...startingDeckPool(draft.investigator),...Object.keys(slots)])];
  const fields=pool.map(code=>
   `<label>${esc(engine.cards[code]?.name??'Thiếu lá '+code)}
    <input type="number" min="0" max="30" name="${code}" value="${slots[code]??0}" required></label>`).join('');
  editor=`<form id="deck-editor-form">
   <p>${esc(engine.cards[draft.investigator].name)} · ${draft.deck.length}/30 lá thường</p>
   <label>Tên deck <input name="name" maxlength="100" value="${esc(draft.name)}" required></label>
   <div class="deck-counts">${fields}</div>
   <div class="actions">
    <button name="operation" value="save">Lưu deck</button>
    <button name="operation" value="copy">Lưu bản sao</button>
    <button name="operation" value="export">Xuất JSON</button>
    ${engine.s.pending?.kind==='investigator'?'<button class="primary" name="operation" value="play">Chơi deck này</button>':''}
   </div>
  </form>`;
 }
 return `<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-label="Quản lý deck">
  <h2>Quản lý deck</h2><div class="actions">${entries}<button type="button" data-deck-import>Nhập JSON</button></div>
  ${remoteAvailable?`<form id="remote-deck-form" class="actions">
   <label>Link công khai hoặc ID deck <input name="source" maxlength="256" required></label>
   <button>Nhập từ mạng</button></form>`:''}
  <input hidden type="file" data-deck-file accept=".json,application/json">
  <div class="choices">${saved}</div>
  ${error?`<p role="alert">${esc(error)}</p>`:''}
  ${editor}<div class="actions"><button data-close-inspect>Đóng</button></div>
 </section></div>`;
}

export function playableDeckError(cards,draft){
 try{validateStartingDeck(cards,draft.investigator,draft.deck);return '';}
 catch(error){return error.message;}
}
