import {esc,command,art,inspect,actorHud,img} from './ui-utils.js';
import {SKILLS} from './rules-data.js';
import {sceneRoom,monsterArt,enemyPosition} from './scene-data.js';
export function sceneView(engine,roomId=engine.s.location){
 const s=engine.s,id=s.locations[roomId]?roomId:s.location,room=sceneRoom(engine,id),location=s.locations[id],remote=id!==s.location,known=location.revealed;
 const blocked=Boolean(s.pending||s.outcome||s.phase!=='investigation'||remote);
 const enemies=s.enemies.filter(e=>e.location===id);
 const identity=engine.investigator();
 const latest=s.log.filter(l=>l.type!=='debug').at(-1)?.message;
 const actor=(name,source,x,y,extra,attributes,code,state)=>`<button class="scene-actor ${extra}" style="left:${x}%;top:${y}%" ${attributes} data-hover-card="${code}" aria-label="${esc(name)}">${actorHud(engine,code,state)}<span class="actor-shadow"></span>${source?`<img src="${art(source)}" alt="${esc(name)}" draggable="false">`:img(code,name)}<span class="actor-label">${esc(name)}</span></button>`;
 const hotspot=h=>`<button class="scene-hotspot ${h.kind==='move'?'door-hotspot':''}" style="left:${h.x}%;top:${h.y}%" data-hotspot="${h.id}" aria-label="${esc(h.name)}" ${blocked?'disabled':''}><span class="hotspot-symbol">${h.kind==='move'?'↗':h.kind==='investigate'?'⌕':h.kind==='advance'?'◇':h.kind==='resign'?'↗':'◈'}</span><span class="hotspot-name">${esc(h.name)}</span></button>`;
 const district=engine.chapter()>1;
 const background=district?engine.chapterInfo().art:id==='hallway'&&s.act>=3?'hallway-open':id;
 return `<section id="room-scene" class="room-scene room-${id} agenda-${Math.min(s.agenda,3)} ${remote?'remote-room':''} ${known?'':'unknown-room'}" data-room="${id}" aria-label="Không gian ${room.title}">
  ${known?`<div class="scene-backdrop" style="background-image:url('${art(background)}')${district?';background-size:260% auto;background-position:'+location.point[0]+'% '+location.point[1]+'%':''}"></div>`:'<div class="unknown-room-message">♜<span>Chưa khám phá</span><small>Di chuyển đến đây để tiết lộ địa điểm.</small></div>'}<div class="scene-vignette"></div><div class="scene-light"></div><div class="scene-dust" aria-hidden="true"></div>${location.fog?'<div class="scene-fog" aria-hidden="true"></div>':''}
  <div class="room-heading"><span class="eyebrow">${remote?'ĐANG XEM · ROLAND Ở '+s.locations[s.location].name:'NGÔI NHÀ CỦA BẠN'}</span><h2>${room.title}</h2><p>${known?room.subtitle:'Thông tin chưa được tiết lộ.'}</p></div>
  <div class="scene-tools">${!remote?'<button data-scene-hints aria-pressed="true" title="Ẩn/hiện điểm tương tác">◈ Điểm tương tác</button>':''}<button ${inspect(location.code+(known?'':'b'),room.title)}>Luật vị trí</button></div>
  <div class="scene-room-stats">${known?`▣ Độ che phủ <strong>${location.shroud+(location.fog?2:0)}</strong><span>◇ Manh mối <strong>${location.clues}</strong></span>`:'Chưa khám phá'}</div>
  ${!remote?'<div id="scene-floor" class="scene-floor" aria-label="Đi lại trong phòng không tốn action"></div>':''}
  ${known&&!remote?room.hotspots.map(hotspot).join(''):''}
  ${id==='hallway'&&s.act<3?'<div class="barrier-glow" aria-hidden="true"></div>':''}
  ${!remote?actor(identity.name,identity.code==='01001'?'roland':null,room.spawn[0],room.spawn[1],'roland-actor','data-roland',identity.code):''}
  ${id==='parlor'&&s.litaAvailable?actor('Lita Chantler','lita',61,77,'lita-actor',remote?'data-inspect="01117"':'data-npc="lita"','01117'):''}
  ${!remote&&engine.asset('01117')?actor('Lita Chantler','lita',31,82,'lita-actor companion','data-npc="ally"','01117',engine.asset('01117')):''}
  ${enemies.map((e,index)=>{const [x,y]=enemyPosition(index),c=engine.card(e.code);return actor(c.name,monsterArt(e.code,c),x,y,`enemy-actor enemy-${e.code} ${e.exhausted?'exhausted':''}`,remote?`data-inspect="${e.code}"`:`data-enemy="${e.id}"`,e.code,e);}).join('')}
  <div id="scene-menu" class="scene-menu" hidden></div><div id="scene-feedback" class="scene-feedback" role="status"></div>
  <div class="scene-caption"><span>◈</span><p>${esc(remote?(known?room.narration:'Bạn đang quan sát sơ đồ; điều tra viên chưa bước vào phòng này.'):(latest||room.narration))}</p></div><div class="scene-walk-hint">${remote?'Chỉ xem · Không di chuyển điều tra viên · Chọn di chuyển trên sơ đồ hoặc trở lại vị trí hiện tại':'Bấm sàn để đi · Bấm đồ vật để tương tác · Không gian trong phòng không tính khoảng cách'}</div>
 </section>`;
}
export function sceneMenu(engine,{hotspot,enemy,npc,embedded=false}){
 const s=engine.s,blocked=Boolean(s.pending||s.outcome||s.phase!=='investigation'),buttons=[];
 const btn=(text,args,off=false)=>`<button ${command('action',args)} ${blocked||off?'disabled':''}>${esc(text)}</button>`;
 let title='',detail='';
 if(hotspot){
  const h=hotspot;title=h.name;detail=h.detail??'';
  if(h.kind==='investigate'){
   buttons.push(btn(`Điều tra · ${SKILLS[engine.investigationSkill()]} / ${engine.here().shroud+(engine.here().fog?2:0)} · 1 action`,{kind:'investigate'},s.actions<1||engine.here().locked));
   for(const a of s.assets.filter(a=>a.code==='01087'&&a.uses>0))buttons.push(btn(`Dùng Flashlight · còn ${a.uses} pin`,{kind:'investigate',tool:a.id},s.actions<1||engine.here().locked));
   if(!engine.here().clues)detail='Đã tìm hết manh mối trong phòng này.';
  }
  if(h.kind==='advance')buttons.push(btn('Lật thảm · Tiêu 2 manh mối · Tiến Act',{kind:'advance'},s.clues<2||s.act!==1));
  if(h.kind==='move'){
   const locked=h.to==='parlor'&&s.act<3;
   const cost=engine.actionCost('move');
   const payment=[engine.hermesAvailable()?'Hermes':null,cost?`${cost} action`:null].filter(Boolean).join(' + ');
   buttons.push(btn(locked?'Rào chắn đang khóa lối vào':`Sang ${s.locations[h.to].name} · ${payment}`,{kind:'move',to:h.to},locked||s.actions<cost));
  }
  if(h.kind==='barrier'){
   detail=s.act<3?'Cần 3 manh mối và ở Hallway vào cuối vòng để phá rào chắn.':'Rào chắn đã biến mất. Bạn có thể vào Parlor.';
   if(s.act===2&&s.clues>=3)buttons.push(btn('Kết thúc lượt để tiến đến cuối vòng',{kind:'end'}));
  }
  if(h.kind==='resign')buttons.push(btn('Rút lui khỏi màn · 1 action',{kind:'resign'},s.actions<1));
 }
 if(enemy){
  const e=enemy,c=engine.card(e.code);title=c.name;detail=`Chiến đấu ${engine.enemyDifficulty(e,'fight')} · Né ${engine.enemyDifficulty(e,'evade')} · Còn ${engine.enemyHealth(e)-e.damage} sức khỏe. Gây ${c.enemy_damage??0} damage / ${c.enemy_horror??0} horror.${c.text?.includes('Retaliate')?' Retaliate: đánh trượt bị đánh lại.':''}`;
  buttons.push(btn('Đánh tay không',{kind:'fight',target:e.id},s.actions<engine.actionCost('fight')));
  for(const a of s.assets.filter(a=>['01006','01016','01020'].includes(a.code)&&(a.code==='01020'||a.uses>0)))buttons.push(btn(`Đánh bằng ${engine.card(a.code).name}${a.code==='01020'?'':` (${a.uses} đạn)`}`,{kind:'fight',target:e.id,weapon:a.id},s.actions<engine.actionCost('fight')));
  for(const knife of s.assets.filter(asset=>asset.code==='01086')){
   const args={kind:'fight',target:e.id,weapon:knife.id};
   const blocked=s.actions<engine.actionCost('fight');
   buttons.push(btn('Đánh bằng Knife · +1 chiến đấu',args,blocked));
   buttons.push(btn('Bỏ Knife để đánh · +2 chiến đấu, +1 damage',{...args,discardKnife:true},blocked));
  }
  for(const knife of s.assets.filter(asset=>asset.code==='53002')){
   buttons.push(btn('Đánh bằng Survival Knife · +2 chiến đấu',
    {kind:'fight',target:e.id,weapon:knife.id},s.actions<engine.actionCost('fight')));
  }
  buttons.push(btn('Né kẻ địch',{kind:'evade',target:e.id},!e.engaged||s.actions<engine.actionCost('evade')));
  if(!e.engaged&&e.code!=='01157')buttons.push(btn('Chủ động giao chiến',{kind:'engage',target:e.id},s.actions<1));
  const parley={'01138':['Bỏ 4 lá',s.hand.length>=4],'01139':['Tiêu 2 manh mối',engine.canSpendClues(2)],'01140':['Tiêu 5 resource',s.resources>=5]}[e.code];
  if(parley)buttons.push(btn('Parley · '+parley[0],{kind:'interrogate',target:e.id},s.actions<1||!parley[1]));
  for(const a of s.assets.filter(a=>['01018','01028'].includes(a.code)))buttons.push(btn(
   a.code==='01028'?'Kiệt sức Beat Cop · gây 1 damage':'Bỏ Beat Cop · gây 1 damage',
   {kind:'cop',target:e.id,asset:a.id},a.exhausted));
 }
 if(npc){title='Lita Chantler';detail=npc==='lita'?'Người phụ nữ siết chặt ngọn đuốc. Thuyết phục cô ấy bằng Trí tuệ (4).':'Lita đồng hành: +1 Chiến đấu; thêm 1 damage khi đánh thành công Monster.';if(npc==='lita')buttons.push(btn('Thuyết phục · Trí tuệ (4) · 1 action',{kind:'parley'},s.actions<1));}
 if(embedded)return `<div class="map-combat-buttons">${buttons.join('')}</div>`;
 return `<button class="scene-menu-close quiet" data-close-scene aria-label="Đóng tương tác">✕</button><span class="eyebrow">TƯƠNG TÁC</span><h3>${esc(title)}</h3><p>${esc(detail)}</p><div>${buttons.join('')}</div>`;
}
