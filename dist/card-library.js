import {esc} from './ui-utils.js';

const effectFixtures=new Set(['01022','01023','01050','01086','02158','05313','05314','05316','05317','53002']);
export function hasCardEffectFixture(code){return effectFixtures.has(code);}
const packNames={core:'Core Set',tece:'The Essex County Express',bbt:'Before the Black Throne',rttfa:'Return to The Forgotten Age'};
const filterFields=[
 ['pack','Gói'],['faction','Faction'],['type','Loại'],['trait','Trait'],['level','Level'],['effect','Kiểm thử hiệu ứng']
];

export function libraryPackName(code){
 return Object.hasOwn(packNames,code)?packNames[code]:code??'Chưa rõ';
}
function cardFacets(card){
 return {
  pack:card.pack_code??'unknown',faction:card.faction_code,type:card.type_code,
  trait:(card.traits??'').split('.').map(trait=>trait.trim()).filter(Boolean),
  level:card.xp==null?'none':String(card.xp),effect:hasCardEffectFixture(card.code)?'fixture':'untracked'
 };
}

export function filterLibraryCards(cards,filters={}){
 const query=String(filters.query??'').trim().toLowerCase();
 return Object.values(cards).filter(card=>{
  const values=cardFacets(card);
  if(query&&![card.code,card.name,values.type,values.faction,card.traits].some(
   value=>String(value??'').toLowerCase().includes(query)))return false;
  return filterFields.every(([field])=>!filters[field]||
   (Array.isArray(values[field])?values[field].includes(filters[field]):values[field]===filters[field]));
 });
}

function facetLabel(field,value){
 if(field==='pack')return value==='unknown'?'Chưa rõ':libraryPackName(value);
 if(field==='level'&&value==='none')return 'Không có level';
 if(field==='effect')return value==='fixture'?'Có fixture theo mã':'Chưa gắn fixture theo mã';
 return value;
}

export function cardLibraryDialog(cards,filters={}){
 const available=Object.values(cards).map(cardFacets);
 const list=filterLibraryCards(cards,filters);
 const controls=filterFields.map(([field,label])=>{
  const values=[...new Set(available.flatMap(item=>item[field]??[]))].sort();
  return `<label>${label}<select name="${field}"><option value="">Tất cả</option>${values.map(value=>
   `<option value="${esc(value)}"${filters[field]===value?' selected':''}>${esc(facetLabel(field,value))}</option>`
  ).join('')}</select></label>`;
 }).join('');
 return `<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="library-title">
  <h2 id="library-title">Thư viện lá bài</h2><form id="card-library-form">
  <label for="card-library-search">Tìm theo tên, mã hoặc trait</label>
  <input id="card-library-search" name="query" type="search" value="${esc(filters.query??'')}" maxlength="100">
  <div class="library-filters">${controls}</div><button>Lọc</button>
  <button type="button" data-library-clear>Xóa bộ lọc</button></form>
  <p>${list.length} / ${available.length} lá</p>
  <div class="choices">${list.map(card=>`<button data-library-card="${esc(card.code)}">${esc(card.name)} · ${esc(card.code)}</button>`).join('')}</div>
  <div class="actions"><button data-deck-editor>Quản lý deck</button><button data-close-inspect>Đóng</button></div></section></div>`;
}
