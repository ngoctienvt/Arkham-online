import {campaignCardFace} from './campaign-card-vi.js';
import {plain} from './rules-data.js';
import {actorHud,command,esc,img,inspect,skillIcon} from './ui-utils.js';

function rules(text) {
 return esc(plain(text??'')).replace(/\[(willpower|intellect|combat|agility)\]/g,(_,skill)=>skillIcon(skill));
}

function tableCard(code,name,label,text,extra='',flavor='') {
 return `<article class="table-card"><button class="table-card-art" data-hover-card="${code}" ${inspect(code,name)}>${img(code,name)}</button>
  <div class="table-card-body">${label}<h3>${esc(name)}</h3><p class="table-card-rules">${rules(text)}</p>${flavor?`<p class="table-card-rules muted">${rules(flavor)}</p>`:''}${extra}</div></article>`;
}

const useTokens={'01006':'ammo','01016':'ammo','01019':'supply','01087':'charge'};
const tokenLabels={clue:['◇','manh mối'],ammo:['▰','đạn'],supply:['✚','vật tư'],charge:['ϟ','pin']};

function cardTokens(type,count) {
 const [icon,label]=tokenLabels[type];
 const description=`${count} ${label}`;
 return `<span class="card-tokens token-${type}${count===0?' empty-tokens':''}" title="${description}" aria-label="${description}"><span aria-hidden="true">${icon}</span><b>${count}</b><span aria-hidden="true">${label}</span></span>`;
}

function zoneTile(code,name,status='',actions='',tokens='') {
 return `<article class="zone-tile"><button class="zone-card" data-hover-card="${code}" ${inspect(code,name)}>
  <span class="zone-card-face">${img(code,name)}${tokens}</span><span>${esc(name)}</span></button>${status}${actions}</article>`;
}

function cardArea(id,title,cards,empty) {
 return `<section id="${id}" class="investigator-area"><h2>${title} <small>${cards.length}</small></h2>
  ${cards.length?`<div class="investigator-card-row" tabindex="0" aria-label="${title}">${cards.join('')}</div>`:`<p class="muted">${empty}</p>`}</section>`;
}

// A crowded, read-only table for checking the four-seat layout.
const layoutPlayers = [
 ['Roland Banks','RB',['01116','01007','01164'],['01016','01030','01018']],
 ['Daisy Walker','DW',['01165','01182','01098'],['01030','01087','01019']],
 ['“Skids” O’Toole','SO',['01164','01099','01160'],['01020','01027','01087']],
 ['Agnes Baker','AB',['01182','01100','01165'],['01019','01087','01117']]
];

export function layoutSeats(engine) {
 const sampleTokens={'01007':cardTokens('clue',3),'01016':cardTokens('ammo',4),
  '01019':cardTokens('supply',3),'01087':cardTokens('charge',3)};
 const tiles=codes=>codes.map(code=>zoneTile(code,engine.card(code).name,'','',sampleTokens[code]??''));
 return layoutPlayers.map(([name,initials,threats,assets],index)=>{
  const seat=index+1;
  return `<aside class="table-seat seat-${seat}" aria-label="Người chơi ${seat}">
   <header class="layout-player"><span aria-hidden="true">${initials}</span><strong>${esc(name)}</strong></header>
   ${cardArea('demo-threat-'+seat,'Threat Area',tiles(threats),'')}
   ${cardArea('demo-play-'+seat,'Play Area',tiles(assets),'')}
  </aside>`;
 }).join('');
}

export function campaignCards(engine,act,agenda,mission,threshold) {
 const s=engine.s,info=engine.chapterInfo(),doom=engine.doomTotal();
 const actFace=campaignCardFace(act),agendaFace=campaignCardFace(agenda,s.boss);
 if(s.boss) {
  return `<section class="campaign-cards">${tableCard('01145b',agendaFace.name,'<span class="eyebrow">ACT &amp; AGENDA</span>',agendaFace.text,`<p class="campaign-progress">${esc(mission)}</p>`)}</section>`;
 }
 const actLabel=`<span class="eyebrow">ACT ${s.act} / ${info.acts.length}</span>`;
 const agendaLabel=`<span class="eyebrow">AGENDA ${Math.min(s.agenda,info.agendas.length)} / ${info.agendas.length}</span>`;
 const actProgress=`<p class="campaign-progress">${esc(mission)}</p>`;
 const remaining=Math.max(0,threshold-doom);
 const agendaProgress=`<div class="campaign-progress"><strong>Doom ${doom} / ${threshold}</strong>
  <div class="agenda-meter" role="meter" aria-label="Doom" aria-valuemin="0" aria-valuemax="${threshold}" aria-valuenow="${Math.min(doom,threshold)}"><span style="width:${100*Math.min(doom,threshold)/threshold}%"></span></div>
  <small>${remaining?`Còn ${remaining} doom đến ngưỡng`:'Đã đạt ngưỡng doom'}</small></div>`;
 return `<section class="campaign-cards">${tableCard(act.code,actFace.name,actLabel,actFace.text,actProgress,actFace.flavor)}
  ${tableCard(agenda.code,agendaFace.name,agendaLabel,agendaFace.text,agendaProgress,agendaFace.flavor)}</section>`;
}

export function investigatorAreas(engine,blocked) {
 const s=engine.s;
 const threats=[
  ['01011',s.hospitalDebts!=null?1:0],['01164',s.fear],['01165',s.voices],['01007',s.cover||s.coverInPlay?1:0],['01182',s.dreams],
  ...(s.madness??[]).map(code=>[code,1])
 ];
 const counts=new Map();
 for(const [code,count] of threats)if(count)counts.set(code,(counts.get(code)??0)+count);
 const threatCards=[...counts].map(([code,count])=>{
  const c=engine.card(code);
  const debt=code==='01011'?`<button ${command('action',{kind:'hospitalDebts'})} ${blocked||!engine.canPayHospitalDebts()?'disabled':''}>Trả 1 resource · ${s.hospitalDebts}/6</button>`:'';
  return zoneTile(code,c.name,count>1?`<small>×${count}</small>`:'',debt,code==='01007'?cardTokens('clue',s.cover):'');
 });
 for(const enemy of s.enemies.filter(e=>e.engaged)) {
  const c=engine.card(enemy.code);
  threatCards.push(zoneTile(c.code,c.name,`<small>${enemy.exhausted?'Kiệt sức':'Giao chiến'}</small>${actorHud(engine,c.code,enemy)}`));
 }
 const assets=s.assets.map(asset=>{
  const c=engine.card(asset.code);
  const token=useTokens[c.code];
  const counters=[c.health?`♥ ${c.health-asset.hp}/${c.health}`:'',
   c.sanity?`◈ ${c.sanity-asset.horror}/${c.sanity}`:'',asset.exhausted?'Kiệt sức':''].filter(Boolean);
  const heal=c.code==='01019'?['hp','horror'].map(stat=>
   `<button ${command('action',{kind:'heal',asset:asset.id,stat})} ${blocked||!s.actions||!s[stat]||!asset.uses?'disabled':''}>Hồi 1 ${stat==='hp'?'damage':'horror'}</button>`).join(''):'';
  return zoneTile(c.code,c.name,`<div class="table-card-state">${esc(counters.join(' · '))}</div>`,heal,token?cardTokens(token,asset.uses):'');
 });
 return `<div class="investigator-areas">${cardArea('threat-area','Threat Area',threatCards,'Không có mối đe dọa.')}
  ${cardArea('play-area','Play Area',assets,'Chưa có bài đang chơi.')}</div>`;
}
