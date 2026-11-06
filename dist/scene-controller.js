import {sceneRoom,FLOOR,enemyPosition} from './scene-data.js';
import {sceneMenu} from './scene-view.js';
export class SceneController{
 constructor({getEngine,toast}){this.getEngine=getEngine;this.toast=toast;this.position=null;this.room=null;this.showHints=true;this.previous=null;this.motionTimer=null;}
 onRender(){
  const engine=this.getEngine(),s=engine.s,stage=document.querySelector('#room-scene');if(!stage)return;
  if(stage.dataset.room!==s.location)return;
  if(this.room!==s.location){this.position=[...sceneRoom(engine,s.location).spawn];this.room=s.location;stage.classList.add('room-arrival');}
  this.place();stage.classList.toggle('hide-hints',!this.showHints);
  stage.querySelector('[data-scene-hints]')?.setAttribute('aria-pressed',String(this.showHints));
  const previous=this.previous;
  if(previous){
   if(s.hp>previous.hp||s.horror>previous.horror)this.feedback(s.hp>previous.hp?'Bị thương':'Horror dâng lên','hurt');
   const hit=s.enemies.find(e=>e.damage>(previous.enemies[e.id]??0));
   if(hit){stage.querySelector(`[data-enemy="${hit.id}"]`)?.classList.add('hit');this.feedback('Đòn đánh trúng đích','attack');}
   const killed=Object.keys(previous.enemies).some(id=>!s.enemies.some(e=>e.id===id));
   if(killed&&previous.location===s.location)this.feedback('Kẻ địch đã gục','attack');
  }
  this.previous={hp:s.hp,horror:s.horror,location:s.location,enemies:Object.fromEntries(s.enemies.map(e=>[e.id,e.damage]))};
 }
 place(){
  const actor=document.querySelector('[data-roland]');if(!actor||!this.position)return;
  actor.style.left=this.position[0]+'%';actor.style.top=this.position[1]+'%';actor.style.zIndex=String(Math.round(this.position[1]));
  actor.style.width=(9+5*(this.position[1]-FLOOR.top)/(FLOOR.bottom-FLOOR.top))+'%';
 }
 walk(x,y){
  const engine=this.getEngine();if(engine.s.pending||engine.s.outcome)return;
  y=Math.max(FLOOR.top,Math.min(FLOOR.bottom,y));const t=(y-FLOOR.top)/(FLOOR.bottom-FLOOR.top);
  x=Math.max(25-13*t,Math.min(75+13*t,x));
  const actor=document.querySelector('[data-roland]');if(!actor)return;
  const facing=x>=this.position[0]?'right':'left';actor.dataset.facing=facing;
  this.position=[x,y];actor.classList.add('walking');this.place();
  clearTimeout(this.motionTimer);this.motionTimer=setTimeout(()=>actor.classList.remove('walking'),750);
  engine.log(`Di chuyển trong phòng ${this.room}: ${Math.round(x)},${Math.round(y)} (không tốn action)`,'debug');
 }
 closeMenu(){const menu=document.querySelector('#scene-menu');if(menu)menu.hidden=true;}
 openMenu(selection,x,y){
  const menu=document.querySelector('#scene-menu'),stage=document.querySelector('#room-scene');if(!menu||!stage)return;
  menu.innerHTML=sceneMenu(this.getEngine(),selection);menu.hidden=false;
  const width=stage.getBoundingClientRect().width;
  menu.style.left=Math.max(2,Math.min(x,100-100*Math.min(310,width-20)/width-2))+'%';menu.style.top=Math.max(12,Math.min(y,45))+'%';
  menu.querySelector('button:not(.scene-menu-close):not(:disabled)')?.focus({preventScroll:true});
 }
 click(event){
  const target=event.target.closest('button');
  if(target?.hasAttribute('data-close-scene')){this.closeMenu();return true;}
  if(target?.hasAttribute('data-scene-hints')){this.showHints=!this.showHints;document.querySelector('#room-scene')?.classList.toggle('hide-hints',!this.showHints);target.setAttribute('aria-pressed',String(this.showHints));return true;}
  if(target?.hasAttribute('data-hotspot')){
   const engine=this.getEngine(),h=sceneRoom(engine,engine.s.location).hotspots.find(h=>h.id===target.dataset.hotspot);if(!h)return true;
   this.walk(...h.stand);this.openMenu({hotspot:h},h.x,h.y);return true;
  }
  if(target?.hasAttribute('data-enemy')){
   const engine=this.getEngine();if(engine.s.pending||engine.s.outcome)return true;
   const enemies=engine.s.enemies.filter(e=>e.location===engine.s.location),enemy=enemies.find(e=>e.id===target.dataset.enemy);if(!enemy)return true;
   const [x,y]=enemyPosition(enemies.indexOf(enemy));this.openMenu({enemy},x-15,y-25);return true;
  }
  if(target?.hasAttribute('data-npc')){
   if(this.getEngine().s.pending)return true;this.walk(52,83);this.openMenu({npc:target.dataset.npc},47,46);return true;
  }
  if(target?.hasAttribute('data-roland')){this.toast(this.getEngine().investigator().name+' · Chọn đồ vật hoặc kẻ địch trong phòng để hành động.');return true;}
  if(event.target.id==='scene-floor'){
   const rect=document.querySelector('#room-scene').getBoundingClientRect();this.closeMenu();this.walk(100*(event.clientX-rect.left)/rect.width,100*(event.clientY-rect.top)/rect.height);return true;
  }
  if(target?.dataset.command)this.closeMenu();return false;
 }
 pointer(event){
  const stage=event.target.closest('#room-scene');if(!stage||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const rect=stage.getBoundingClientRect();stage.style.setProperty('--look-x',((event.clientX-rect.left)/rect.width-.5)*-7+'px');stage.style.setProperty('--look-y',((event.clientY-rect.top)/rect.height-.5)*-4+'px');
 }
 feedback(text,type){const el=document.querySelector('#scene-feedback'),stage=document.querySelector('#room-scene');if(!el)return;el.textContent=text;el.className='scene-feedback show '+type;stage?.classList.add(type==='hurt'?'scene-shake':'scene-flash');setTimeout(()=>{el.classList.remove('show');stage?.classList.remove('scene-shake','scene-flash');},1100);}
}
