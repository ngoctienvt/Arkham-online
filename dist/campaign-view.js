import {esc,command} from './ui-utils.js';

const LOCATION_ACTIONS = {
 '01124':'Rút 1 lá và nhận 1 resource','01126':'Rút 3 lá','01127':'Tìm Ally trong bộ bài',
 '01128':'Hồi 3 damage','01129':'Tìm Tome hoặc Spell trong 6 lá đầu',
 '01130':'Nhận 3 resource','01131':'Hồi 3 horror','01134':'Đổi 5 resource lấy 2 manh mối'
};
export function chapterMission(engine) {
 const s=engine.s;
 if(engine.chapter()===2)return 'Chi 2 manh mối để lần ra một giáo phái. Bắt càng nhiều kẻ cầm đầu càng tốt trước nửa đêm.';
 if(engine.chapter()===3){
  if(s.boss)return 'Umôrdhoth đã xuất hiện. Đánh bại nó hoặc giao Lita nếu cô đang đồng hành.';
  return ['Tìm 3 manh mối để mở Ritual Site.','Đi vào Ritual Site.','Chi manh mối để phá nghi lễ. Cần 2 kiểm tra thành công.'][s.act-1];
 }
 return s.act===1?'Tìm 2 manh mối. Tương tác tấm thảm để thoát Study.':
   s.act===2?'Tìm 3 manh mối. Trở về Hallway vào cuối vòng để phá rào chắn.':
   'Hạ Ghoul Priest. Lita có thể giúp bạn; cửa trước Parlor là lối rút lui.';
}
export function chapterActionOptions(engine) {
 const s=engine.s,chapter=engine.chapter(),code=engine.here().code;
 const button=(label,args,off=false,cost=1)=>({label,args,disabled:off||s.actions<cost});
 const items=[];
 if(engine.investigator().code==='01003')items.push(button('Skids · 2 resource → 1 action',{kind:'skidsAction'},s.skidsUsed||s.resources<2,0));
 if(chapter===2){
  items.push(button('Lần ra giáo phái · 2 manh mối',{kind:'cultist'},!engine.canSpendClues(2)||!s.cultistDeck.length));
  items.push(button('Rút lui',{kind:'resign'}));
 }
 if(chapter===3){
  if(s.act===1)items.push(button('Mở Ritual Site · 3 manh mối',{kind:'advance'},!engine.canSpendClues(3),0));
  if(s.location==='main')items.push(button('Rút lui',{kind:'resign'}));
  if(s.act===3)for(const [skill,label] of [['willpower','Ý chí'],['agility','Nhanh nhẹn']]){
   items.push(button('Phá nghi lễ · '+label+' · '+s.ritualClues+'/2',{kind:'disrupt',skill},s.boss||!engine.canSpendClues(1)));
  }
  if(s.boss&&engine.asset('01117')&&s.enemies.some(e=>e.code==='01157'&&e.location===s.location)){
   items.push(button('Giao Lita cho Umôrdhoth',{kind:'sacrifice'}));
  }
 }
 if(LOCATION_ACTIONS[code]){
   const used=s.usedLocations?.[code];
  const unavailable=code==='01124'?used===s.round:code!=='01129'&&Boolean(used);
  const noCost=code==='01134'&&s.resources<5;
  items.push(button(LOCATION_ACTIONS[code],{kind:'location'},unavailable||noCost||(code==='01128'&&!s.hp)||(code==='01131'&&!s.horror)));
 }
 if(code==='01155')for(const [stat,label] of [['hp','Hồi 1 damage'],['horror','Hồi 1 horror']]){
  items.push(button(label,{kind:'location',stat},!s[stat]||s.usedLocations?.[code]===s.round));
 }
 if(engine.here().locked)for(const [skill,label] of [['combat','Phá cửa'],['agility','Cạy khóa']]){
  items.push(button(label,{kind:'unlock',skill}));
 }
 if(s.dreams)items.push(button('Vượt qua Dreams of R’lyeh',{kind:'dreams'}));
 for(const code of new Set(s.madness??[])){
  items.push(button('Bỏ '+engine.card(code).name+' · 2 action',{kind:'clearMadness',code},false,2));
 }
 if(engine.asset('01027'))items.push(button('Bỏ Police Badge · +2 action',{kind:'badge'},false,0));
 return items;
}
export function chapterControls(engine,blocked) {
 const items=chapterActionOptions(engine).map(({label,args,disabled})=>
  `<button ${command('action',args)} ${blocked||disabled?'disabled':''}>${esc(label)}</button>`);
 return items.length?'<div class="campaign-actions">'+items.join('')+'</div>':'';
}
export function campaignOutcomeExtra(engine) {
 const s=engine.s,o=s.outcome,campaign=s.campaign;
 const names=codes=>codes?.map(c=>esc(engine.card(c).name)).join(', ')||'Không có';
 let result='';
 if(engine.chapter()===2)result='<p>Đã bắt: '+names(o.caught)+'<br>Trốn thoát: '+names(o.gotAway)+
   '<br>'+ (o.pastMidnight?'Đã quá nửa đêm.':'Rút khỏi Arkham trước nửa đêm.')+'</p>';
 if(engine.chapter()===1)result+='<p>Nhật ký Chiến dịch · Ngôi nhà '+(o.houseBurned?'đã cháy rụi.':'vẫn còn đứng vững.')+'</p>';
 if(engine.canChooseLita())result+=`<div class="actions"><button ${command('chooseLita',{recruit:true})} aria-pressed="${o.lita}" ${o.lita?'disabled':''}>Thêm Lita vào bộ bài</button><button ${command('chooseLita',{recruit:false})} aria-pressed="${!o.lita}" ${!o.lita?'disabled':''}>Đi tiếp không mang lá Lita</button></div>`;
 if(o.weakness)result+='<p>Điểm yếu mới: '+esc(engine.card(o.weakness).name)+'</p>';
 if(s.screamedAllies?.length)result+='<p>Ultimatum of the Scream · Ally bị loại: '+names(s.screamedAllies)+'</p>';
 if(o.drivenInsane)result+='<p>Điều tra viên mất trí do horror.</p>';
 if(o.killed&&o.resolution==='defeated'&&engine.hasOptionalRule('UltimatumOfFinality')&&s.hp>=engine.healthLimit()){
  result+='<p>Điều tra viên thiệt mạng do damage.</p>';
 }
 if(!engine.canContinueCampaign())return result;
 const deck=[...new Set(campaign?.deck??[])];
 for(const code of engine.permanentUpgrades()){
  const card=engine.card(code);
  let quote;
  try{quote=engine.upgradeQuote(code);}catch{continue;}
  result+=`<button ${command('upgrade',{add:code})}>Mua ${esc(card.name)} · ${quote.cost} XP</button>`;
 }
 if(campaign&&campaign.xp&&deck.length){
  const groups=[];
  for(const add of engine.availableUpgrades()){
   const options=[];
   for(const remove of deck){
    let quote;
    try{quote=engine.upgradeQuote(add,remove);}catch{continue;}
    options.push(`<option value="${esc(add+':'+remove)}">Thay ${esc(engine.card(remove).name)} · ${quote.cost} XP</option>`);
   }
   if(options.length)groups.push(`<optgroup label="${esc(engine.card(add).name)}">${options.join('')}</optgroup>`);
  }
  if(groups.length)result+=`<div class="upgrade-box"><strong>XP chưa dùng · ${campaign.xp}</strong>
   <label>Nâng cấp và lá thay <select id="upgrade-choice">${groups.join('')}</select></label>
   <button data-buy-upgrade>Nâng cấp</button></div>`;
 }
 return result+'<button class="primary campaign-next" '+command('nextChapter')+'>Tiếp tục · '+
   esc(engine.nextScenarioInfo().name)+' →</button>';
}
