export class MapController{
 constructor({getEngine,repaint}){this.getEngine=getEngine;this.repaint=repaint;this.selectedRoom=null;this.locationOpen=false;this.handPage=0;this.handOpen=false;this.moves=[];this.lastLocation=null;this.enemyLocations={};}
 sync(){
  const engine=this.getEngine(),s=engine.s;
  if(this.engineRef!==engine||this.lastChapter!==engine.chapter()){
   this.engineRef=engine;this.lastChapter=engine.chapter();this.selectedRoom=s.location;
   this.enemyLocations={};this.lastLocation=null;this.locationOpen=false;this.handPage=0;this.handOpen=false;
  }
  this.handPage=Math.min(this.handPage,Math.max(0,Math.ceil(s.hand.length/5)-1));
  if(!s.locations[this.selectedRoom]||this.lastLocation!==s.location)this.selectedRoom=s.location;
  this.moves=s.enemies.filter(e=>this.enemyLocations[e.id]&&this.enemyLocations[e.id]!==e.location).map(e=>({id:e.id,from:this.enemyLocations[e.id],to:e.location,name:engine.card(e.code).name}));
  this.enemyLocations=Object.fromEntries(s.enemies.map(e=>[e.id,e.location]));this.lastLocation=s.location;
 }
 click(event){
  const button=event.target.closest('button');if(!button||button.disabled)return false;
  const engine=this.getEngine(),s=engine.s;
  if(button.hasAttribute('data-toggle-hand')){
   this.handOpen=!this.handOpen;
   this.repaint();
   button.ownerDocument.querySelector('[data-toggle-hand]')?.focus({preventScroll:true});
   return true;
  }
  if(button.hasAttribute('data-hand-page')){
   this.handPage=Math.max(0,this.handPage+Number(button.dataset.handPage));this.repaint();return true;
  }
  if(button.hasAttribute('data-close-location')){this.locationOpen=false;this.repaint();return true;}
  if(button.hasAttribute('data-map-room')){
   const id=button.dataset.mapRoom;if(!s.locations[id])return true;
   this.selectedRoom=id;this.locationOpen=true;
   engine.log('Mở thao tác tại '+id+' trên toàn cảnh','debug');this.repaint();return true;
  }
  return false;
 }
}
