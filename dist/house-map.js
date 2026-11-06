import {esc,art,inspect,actorHud,img} from './ui-utils.js';
import {locationActionButton,locationActionGroups} from './location-actions.js';
import {monsterArt} from './scene-data.js';
export const MAP_POINTS={
 study:[50,53],attic:[50,19],cellar:[17,61],hallway:[50,61],parlor:[83,61],
 northside:[17,15],downtown:[50,15],easttown:[83,15],
 university:[17,43],rivertown:[50,43],graveyard:[83,43],
 hospital:[17,72],southside:[50,72],house:[83,72],
 main:[50,50],wood1:[17,23],wood2:[83,23],wood3:[17,75],wood4:[83,75],ritual:[50,14]
};
const CUTAWAY_POINTS={study:[52,81],attic:[56,25],hallway:[51,59],parlor:[83,58],cellar:[44,92]};
function mapPoint(state,id,world) {
 return world?(state.locations[id].point??CUTAWAY_POINTS[id]):MAP_POINTS[id];
}
export function roomPath(state,from,to){
 const queue=[[from]],seen=new Set([from]);
 while(queue.length){const route=queue.shift(),last=route.at(-1);if(last===to)return route;
  for(const next of state.locations[last]?.links??[]){if(seen.has(next)||!state.locations[next]||(next==='parlor'&&state.act<3))continue;seen.add(next);queue.push([...route,next]);}
 }return [];
}
export function roomEntities(engine,id){
 const s=engine.s,entries=[];
 if(id===s.location){const {name,code}=engine.investigator();entries.push({name,art:code==='01001'?'roland':null,kind:'investigator',code});
  if(engine.asset('01117'))entries.push({name:'Lita Chantler',art:'lita',kind:'ally',code:'01117',state:engine.asset('01117')});
  for(const a of s.assets.filter(a=>['01018','01028'].includes(a.code)))entries.push({name:'Beat Cop',kind:'ally',code:a.code,state:a});
 }
 if(id==='parlor'&&s.litaAvailable)entries.push({name:'Lita Chantler',art:'lita',kind:'ally',code:'01117'});
 for(const e of s.enemies.filter(e=>e.location===id)){
  const card=engine.card(e.code);
  entries.push({name:card.name,art:monsterArt(e.code,card),kind:'enemy',code:e.code,id:e.id,state:e,exhausted:e.exhausted,doom:e.doom});
 }
 return entries;
}
function connections(state,moves=[],world=false){
 const paths=[],seen=new Set();
 for(const [id,room] of Object.entries(state.locations))for(const next of room.links??[]){
  if(!state.locations[next])continue;const key=[id,next].sort().join('-');if(seen.has(key))continue;seen.add(key);
  const a=mapPoint(state,id,world),b=mapPoint(state,next,world),locked=(id==='parlor'||next==='parlor')&&state.act<3;
  paths.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" class="${locked?'locked-link':''}"/>`);
 }
 const transit=moves.map(m=>{
  const route=roomPath(state,m.from,m.to);if(route.length<2)return '';
  const path=route.map((id,i)=>(i?'L':'M')+mapPoint(state,id,world).join(',')).join(' ');
  return `<circle class="map-moving-enemy" r="1.5"><title>${esc(m.name)}</title><animateMotion dur="1.4s" path="${path}" fill="freeze"/></circle>`;
 }).join('');
 return `<svg class="map-connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${paths.join('')}${transit}</svg>`;
}
export function mapView(engine,ui){
 const s=engine.s;
 return `<div class="house-diagram mini-map ${engine.chapter()>1?'campaign-mini':''}" aria-label="Sơ đồ địa điểm và đường nối">${connections(s,ui.moves)}${Object.keys(s.locations).map(id=>{
  const room=s.locations[id],[x,y]=MAP_POINTS[id],current=id===s.location,selected=id===ui.selectedRoom,locked=id==='parlor'&&s.act<3,entities=roomEntities(engine,id);
  return `<button class="map-room ${current?'player-here':''} ${selected?'selected':''} ${locked?'room-locked':''} ${room.revealed?'revealed':'unrevealed'}" style="left:${x}%;top:${y}%" data-map-room="${id}" aria-label="Xem ${room.name}${current?' · Điều tra viên ở đây':''}"><span class="map-room-heading">${esc(room.name)}${locked?' <b>♜</b>':''}</span><span class="map-room-clues">${room.revealed?'◇ '+room.clues:'Chưa khám phá'}</span><span class="map-occupants">${['investigator','ally','enemy'].map(kind=>{
   const count=entities.filter(e=>e.kind===kind).length;
   return count?`<span class="map-token ${kind}">${kind==='investigator'?'R':kind==='ally'?'A':'☠'}${count>1?' '+count:''}</span>`:'';
  }).join('')}</span></button>`;
 }).join('')}</div>`;
}
export function mapDetails(engine,ui){
 const s=engine.s,id=s.locations[ui.selectedRoom]?ui.selectedRoom:s.location,room=s.locations[id],route=roomPath(s,s.location,id),current=id===s.location,locked=id==='parlor'&&s.act<3;
 const blocked=Boolean(s.pending||s.outcome||s.phase!=='investigation'),cost=engine.actionCost('move');
 const entities=roomEntities(engine,id),next=route[1];
 const actions=current?locationActionGroups(engine,blocked):next?
  `<div class="map-detail-actions">${locationActionButton(route.length===2?'Di chuyển đến đây':'Bước tiếp: '+s.locations[next].name,{kind:'move',to:next},blocked||s.actions<cost)}</div>`:'';
 const roster=entities.map(e=>
  `<li class="${e.kind}"><button data-hover-card="${e.code}" ${inspect(e.code,e.name)}>${esc(e.name)}</button>${e.exhausted?' <small>Kiệt sức</small>':e.state?.engaged?' <small>Giao chiến</small>':''}${actorHud(engine,e.code,e.state)}</li>`
 ).join('');
 return `<section class="map-details location-float" aria-label="Địa điểm đã chọn"><div class="map-detail-title"><h3>${esc(room.name)}</h3><button ${inspect(room.code+(room.revealed?'':'b'),room.name)}>Luật</button><button data-close-location aria-label="Đóng địa điểm">✕</button></div><p>${current?'Điều tra viên đang ở đây.':locked?'Lối vào bị rào chắn khóa.':route.length?'Đường đi: '+route.map(r=>s.locations[r].name).join(' → '):'Hiện không có lối nối đến đây.'}</p><div class="map-known-info">${room.revealed?`<span>◇ ${room.clues} manh mối</span><span>Độ che phủ ${room.shroud+(room.fog?2:0)}</span>`:'Chưa khám phá'}</div>${actions}<ul class="map-entity-list">${roster||'<li>Địa điểm trống.</li>'}</ul></section>`;

}
export function housePanel(engine,ui){return `<aside class="house-panel"><div class="house-panel-heading"><div><span class="eyebrow">ĐỊNH HƯỚNG</span><h3>${['','Toàn ngôi nhà','Thành phố Arkham','Rừng Arkham'][engine.chapter()]}</h3></div><button data-toggle-overview>${ui.overview?'Cảnh gần':'Toàn cảnh ⤢'}</button></div>${ui.overview?mapDetails(engine,ui):''}${mapView(engine,ui)}<div class="map-legend"><span class="investigator">● Điều tra viên</span><span class="ally">● Ally</span><span class="enemy">● Quái</span></div>${ui.overview?'':mapDetails(engine,ui)}${ui.moves.length?`<p class="map-movement-note">${ui.moves.map(m=>esc(m.name)+' → '+esc(engine.s.locations[m.to]?.name)).join('<br>')}</p>`:''}</aside>`;}
export function overviewView(engine,ui){
 const s=engine.s,chapter=engine.chapter();
 const background=chapter===1?(s.locations.study?'study':'house-cutaway'):engine.chapterInfo().art;
 const veil=chapter===3&&!s.locations.ritual?'<span class="ritual-veil"></span>':'';
 const fire=chapter===1&&s.locations.parlor&&s.act<3?'<span class="world-barrier" title="Rào chắn Parlor"></span>':'';
 const rooms=Object.entries(s.locations).map(([id,room])=>{
  const [x,y]=mapPoint(s,id,true);
  const actors=roomEntities(engine,id).filter(e=>e.art||e.kind==='investigator');
  const enemies=actors.filter(e=>e.kind==='enemy');
  const group=enemies.length>1;
  const representative=enemies.find(e=>e.art==='umordhoth')??enemies.find(e=>e.state.engaged)??enemies[0];
  const figures=[...actors.filter(e=>e.kind!=='enemy'),...(representative?[representative]:[])].map(e=>{
   const grouped=e.kind==='enemy'&&group;
   const label=grouped?`${enemies.length} quái tại ${room.name} · Xem danh sách`:e.name;
   const interaction=e.kind==='enemy'||e.kind==='investigator'?`data-map-room="${id}" ${grouped?'':'data-hover-card="'+e.code+'"'}`:`data-hover-card="${e.code}" data-inspect="${e.code}"`;
   const marker=grouped?`<span class="world-enemy-count">×${enemies.length}</span>`:e.kind==='investigator'?actorHud(engine,e.code,e.state):'';
   return `<button class="world-figure ${e.kind} ${grouped?'enemy-group':''}" ${interaction} aria-label="${esc(label)}" title="${esc(label)}">${marker}${e.art?`<img src="${art(e.art)}" class="${e.exhausted&&!grouped?'exhausted':''} ${e.art==='umordhoth'?'ancient-one':''}" alt="">`:img(e.code,e.name)}</button>`;
  }).join('');
  return `<div class="world-location ${id===ui.selectedRoom?'selected':''} ${id===s.location?'player-here':''}" style="left:${x}%;--world-y:${y}%"><span class="world-figures">${figures}</span><button class="world-label" data-map-room="${id}">${esc(room.name)} ${room.revealed&&room.clues?'◇ '+room.clues:room.revealed?'':'· ?'}${id==='parlor'&&s.act<3?' · ♜':''}</button></div>`;
 }).join('');
 return `<section class="house-overview world-overview ${chapter===1?'cutaway-overview':''}" style="background-image:url('${art(background)}')"><span class="world-round">TOÀN CẢNH · VÒNG ${s.round}</span>${veil}${fire}${connections(s,ui.moves,true)}${rooms}</section>`;
}
