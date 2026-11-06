import {SKILLS} from './rules-data.js';
import {esc,command,img,inspect,art,skillIcon,handPlayOption} from './ui-utils.js';
import {chapterMission,chapterControls} from './campaign-view.js';
import {campaignCards,investigatorAreas,layoutSeats} from './table-cards.js';
import {mapDetails,overviewView} from './house-map.js';
export {esc,command,img,inspect} from './ui-utils.js';
export function render(engine,ui={selectedRoom:engine.s.location,moves:[]}){
 if(ui.layoutPreview)return `<main class="layout-preview"><header class="layout-banner"><div><strong>Bàn mẫu · 4 người</strong><small>Mỗi người có 3 lá Threat và 3 lá Play. Rê chuột hoặc bấm lá để xem.</small></div><button data-layout-preview>Quay lại ván</button></header><section class="panorama-table layout-board">${overviewView(engine,ui)}<div class="table-seats">${layoutSeats(engine)}</div></section></main>`;
 const s=engine.s,cards=engine.cards,blocked=Boolean(s.pending||s.outcome||s.phase!=='investigation');
 const info=engine.chapterInfo();
 const act=cards[info.acts[Math.min(s.act,info.acts.length)-1]];
 const agenda=cards[info.agendas[Math.min(s.agenda,info.agendas.length)-1]];
 const threshold=s.boss?0:agenda.doom;
 const off=yes=>yes?'disabled':'';
 const phases={setup:'Chuẩn bị',investigation:'Điều tra',enemy:'Kẻ địch',upkeep:'Upkeep',mythos:'Mythos',finished:'Kết thúc'};
 const steps={'turn-end':'Cuối lượt',hunter:'Hunter di chuyển',attacks:'Kẻ địch tấn công','enemy-end':'Cuối pha kẻ địch',
  'upkeep-start':'Bắt đầu Upkeep',ready:'Làm mới bài','draw-resource':'Rút bài và nhận resource',
  'hand-limit':'Giới hạn tay bài','round-end':'Cuối vòng','mythos-start':'Bắt đầu Mythos',
  doom:'Kiểm tra doom',encounter:'Lá Encounter'};
 const phaseLabel=[phases[s.phase],steps[s.phaseStep],s.pending?.kind==='window'?'Cửa sổ Fast':null].filter(Boolean).join(' · ');
 const mission=chapterMission(engine);
 const goal=campaignCards(engine,act,agenda,mission,threshold);
 const skills=Object.entries(SKILLS).map(([key,name])=>{
  const value=engine.skill(key),base=engine.baseSkill(key);
  const investigate=key==='intellect'?engine.skill(key,'investigate'):value;
  const conditional=investigate!==value;
  const detail=conditional?`${name} ${value} · ${investigate} khi điều tra`:`${name} ${value} · Gốc ${base}`;
  return `<span class="seat-skill" title="${detail}" aria-label="${detail}">${skillIcon(key)}
   <b class="${value>base?'stat-up':value<base?'stat-down':''}">${value}</b>${conditional?`<small class="stat-context">→${investigate}<span>điều tra</span></small>`:''}</span>`;
 }).join('');
 const identity=engine.investigator();
 const investigator=`<header class="seat-identity"><button data-hover-card="${identity.code}" ${inspect(identity.code,identity.name)}>${identity.code==='01001'?`<img src="${art('roland')}" alt="${esc(identity.name)}">`:img(identity.code,identity.name)}</button><div><strong>${esc(identity.name)}</strong><div class="seat-skills">${skills}</div><small>${s.resources} resource · ${s.clues} manh mối</small></div></header>`;
 const toolbar=`<div class="scene-actions"><div class="actions-remaining"><strong>${'●'.repeat(s.actions)}${'○'.repeat(Math.max(0,3-s.actions))}</strong><small>${s.actions} ACTION · VÒNG ${s.round}</small></div><span class="current-phase" role="status">${phaseLabel}</span><div class="utility-actions"><button data-map-room="${s.location}">Địa điểm</button><button ${command('action',{kind:'resource'})} ${off(blocked||!s.actions)}>+1 resource</button><button ${command('action',{kind:'draw'})} ${off(blocked||!s.actions)}>Rút bài</button><button class="primary" ${command('action',{kind:'end'})} ${off(blocked)}>Kết thúc lượt →</button></div></div>`;
 const adminBlocked=s.pending||s.outcome||s.boss||s.phase!=='investigation';
 const adminControls=s.outcome?'':`<div class="admin-tools"><button ${command('adminToggle')} aria-pressed="${s.admin===true}">Admin: ${s.admin?'Bật':'Tắt'}</button>${s.admin?`<span>Điều tra viên bất tử</span><button ${command('adminAdvance',{track:'act'})} ${off(adminBlocked)}>Tiến Act</button><button ${command('adminAdvance',{track:'agenda'})} ${off(adminBlocked)}>Tiến Agenda</button>`:''}</div>`;
 const campaignControls=chapterControls(engine,blocked);
 const handPage=Math.min(ui.handPage??0,Math.max(0,Math.ceil(s.hand.length/5)-1));
 const hand=`<section class="duel-hand${ui.handOpen?' is-open':''}" aria-label="Tay bài"><div class="duel-hand-label"><button data-hand-page="-1" ${off(!handPage)} aria-label="Các lá trước">‹</button><button data-toggle-hand aria-pressed="${Boolean(ui.handOpen)}" title="Ghim hoặc thu tay bài">Tay bài · ${s.hand.length}</button><button data-hand-page="1" ${off((handPage+1)*5>=s.hand.length)} aria-label="Các lá tiếp theo">›</button></div><div class="duel-hand-window"><div class="duel-fan">${s.hand.slice(handPage*5,handPage*5+5).map((code,slot)=>{
  const index=handPage*5+slot;
  const c=cards[code],play=handPlayOption(engine,index);
  return `<article class="hand-card" style="--fan-slot:${slot-(Math.min(5,s.hand.length-handPage*5)-1)/2}"><button class="card-art" data-hover-card="${code}" ${inspect(code,c.name)}>${img(code,c.name)}</button><div class="card-title">${esc(c.name)}</div><button class="play-card" ${play?command('action',play.args):inspect(code,c.name)} ${off(play&&(blocked||play.disabled))}>${play?`Chơi · ${play.cost}${play.fast?' · Fast':''}`:'Góp khi kiểm tra'}</button></article>`;
 }).join('')||'<p class="empty">Không có bài trên tay.</p>'}</div></div></section>`;
 const logs=s.log.filter(l=>l.type!=='debug').slice(-50).reverse();
 const journal=`<details class="immersive-journal"><summary>Nhật ký điều tra <span>${s.lastEncounter?'Encounter: '+esc(cards[s.lastEncounter].name):'Diễn biến ván chơi'}</span></summary><div class="journal-body">${s.lastEncounter?`<button ${inspect(s.lastEncounter,cards[s.lastEncounter].name)}>Xem ${esc(cards[s.lastEncounter].name)}</button>`:''}${logs.map(l=>`<div class="journal-entry ${l.type}"><span class="timestamp">VÒNG ${l.round}</span>${esc(l.message)}</div>`).join('')}</div></details>`;
 const seat=`<aside class="table-seat seat-1" aria-label="Người chơi 1">${investigator}<div class="seat-zones"><a href="#threat-area">Threat Area</a><a href="#play-area">Play Area</a></div></aside>`;
 const workspace=`<section class="panorama-table">${overviewView(engine,ui)}<div class="table-seats">${seat}</div>${ui.locationOpen?mapDetails(engine,ui):''}</section>`;
 return `<main class="immersive-main">${goal}${s.outcome?'<div class="outcome-banner">Ván chơi đã kết thúc. <button data-show-outcome>Xem kết quả</button></div>':''}${workspace}${toolbar}${adminControls}${campaignControls}${hand}${investigatorAreas(engine,blocked)}<span id="save-status" class="save-note">● Đã lưu</span>${journal}</main>`;
}
