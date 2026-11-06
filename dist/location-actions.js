import {chapterActionOptions} from './campaign-view.js';
import {sceneMenu} from './scene-view.js';
import {command,esc,handPlayOption,inspect} from './ui-utils.js';

export function locationActionButton(label,args,disabled=false) {
 return `<button ${command('action',args)} ${disabled?'disabled':''}>${esc(label)}</button>`;
}

export function locationActionGroups(engine,blocked) {
 const s=engine.s,room=engine.here(),chapter=engine.chapter();
 const button=(label,args,disabled=false)=>locationActionButton(label,args,blocked||disabled);
 const basic=[
  button('Điều tra',{kind:'investigate'},!s.actions||room.locked),
  ...room.links.filter(to=>s.locations[to]&&!(to==='parlor'&&s.act<3)).map(to=>
   button('Sang '+s.locations[to].name,{kind:'move',to},s.actions<engine.actionCost('move'))),
  button('Nhận 1 resource',{kind:'resource'},!s.actions),
  button('Rút 1 lá bài',{kind:'draw'},!s.actions),
  button('Kết thúc lượt',{kind:'end'})
 ];
 const local=[],player=[],encounter=[],hand=[];
 const child=engine.childOption({duringTurn:true,ordinary:true});
 if(child)player.push(button(child.label,child.args));
 if(chapter===1&&s.location==='study'&&s.act===1)
  local.push(button('Lật thảm · 2 manh mối',{kind:'advance'},!engine.canSpendClues(2)));
 if(chapter===1&&s.location==='parlor'&&s.act>=3){
  local.push(button('Rút lui',{kind:'resign'},!s.actions));
  if(s.litaAvailable)local.push(button('Thuyết phục Lita',{kind:'parley'},!s.actions));
 }
 // An action's source determines its group; timing and costs stay in the engine.
 for(const {label,args,disabled} of chapterActionOptions(engine)){
  const group=['unlock','dreams','clearMadness','sacrifice'].includes(args.kind)?encounter:
   ['skidsAction','badge'].includes(args.kind)?player:local;
  group.push(button(label,args,disabled));
 }
 if(s.hospitalDebts!=null)
  encounter.push(button('Hospital Debts · Trả 1 resource',{kind:'hospitalDebts'},!engine.canPayHospitalDebts()));
 for(const asset of s.assets){
  if(asset.code==='01087')player.push(button(`Dùng Flashlight · ${asset.uses} pin`,
   {kind:'investigate',tool:asset.id},!s.actions||room.locked||!asset.uses));
  if(asset.code==='01019')for(const [stat,label] of [['hp','damage'],['horror','horror']])
   player.push(button('First Aid · Hồi 1 '+label,{kind:'heal',asset:asset.id,stat},!s.actions||!asset.uses||!s[stat]));
 }
 for(const index of s.hand.keys()){
  const play=handPlayOption(engine,index);
  if(!play||s.hand[index]==='01010')continue; // On the Lam is offered by the turn-start window.
  hand.push(button(`Chơi ${play.label} · ${play.cost} resource${play.fast?' · Fast':''}`,play.args,play.disabled));
 }
 for(const enemy of s.enemies.filter(e=>e.location===s.location)){
  const {name,code}=engine.card(enemy.code);
  encounter.push(`<div class="map-action-target"><button class="map-target-name" ${inspect(code,name)}>${esc(name)}</button>${sceneMenu(engine,{enemy,embedded:true})}</div>`);
 }
 const group=(title,items)=>items.length?`<section class="map-action-group"><h4>${title}</h4><div class="map-detail-actions">${items.join('')}</div></section>`:'';
 return group('Cơ bản',basic)+group('Địa điểm và kịch bản',local)+group('Bài của bạn',player)+
  group('Encounter và Threat Area',encounter)+group('Chơi bài trên tay',hand);
}
