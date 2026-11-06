import {prepareBondedCards} from './investigator-state.js';

export const bondedCardMethods={
 prepareBonded(deck){
  prepareBondedCards(this.s,deck,code=>this.card(code));
 },
 releaseBonded(parent){
  for(const code of Object.keys(this.card(parent).bondedWith??{})){
   const count=this.s.bonded?.[code]??0;
   if(!count)continue;
   this.s.bonded[code]=0;
   this.s.hand.push(code);
   if(count>1){
    this.s.deck.push(...Array(count-1).fill(code));
    this.shuffle(this.s.deck);
   }
   this.log('Bonded: đưa '+count+' lá '+this.card(code).name+' vào tay và deck.','debug');
  }
 },
 reclaimBonded(parent){
  for(const code of Object.keys(this.card(parent).bondedWith??{})){
   for(const zone of ['hand','deck','discard']){
    const before=this.s[zone];
    this.s[zone]=before.filter(card=>card!==code);
    this.addBonded(code,before.length-this.s[zone].length);
   }
  }
 },
 addBonded(code,count){
  if(count>0){
   const bonded=this.s.bonded??={};
   bonded[code]=(bonded[code]??0)+count;
  }
 },
 discardPlayerCard(code){
  const parent=this.card(code).bondedParent;
  if(parent&&!this.asset(parent))this.addBonded(code,1);
  else this.s.discard.push(code);
 },
 melodyTargets(){
  const targets=[{state:this.s,name:this.investigator().name}];
  for(const asset of this.s.assets.filter(asset=>this.card(asset.code).slot==='Ally')){
   targets.push({state:asset,id:asset.id,name:this.card(asset.code).name});
  }
  return targets;
 },
 canPlayMelody(){
  return this.s.deck.length>0||this.s.discard.length>0||
   this.melodyTargets().some(({state})=>state.hp>0||state.horror>0);
 },
 soothingMelody(remaining){
  if(!remaining)return;
  const options=[];
  const targets=this.melodyTargets();
  for(const {state,id,name} of targets)for(const stat of ['hp','horror']){
   if(state[stat]>0)options.push({
    label:name+' · hồi 1 '+(stat==='hp'?'damage':'horror'),
    ops:[{type:'healMelody',stat,id,remaining}]
   });
  }
  if(options.length)this.choice('Soothing Melody: chọn điểm cần hồi.',options);
 },
 healMelody({id,stat,remaining}){
  const target=id?this.s.assets.find(asset=>asset.id===id):this.s;
  if(target?.[stat]>0)target[stat]--;
  this.soothingMelody(remaining-1);
 },
 bloodRiteDiscard(discarded){
  if(discarded>=2||!this.s.hand.length){this.bloodRiteReward(discarded);return;}
  const options=this.s.hand.map((code,index)=>({
   label:'Bỏ '+this.card(code).name,ops:[{type:'bloodRitePay',index,discarded}]
  }));
  options.push({label:'Dừng bỏ bài',ops:[{type:'bloodRiteReward',remaining:discarded}]});
  this.choice('Blood-Rite: bỏ tối đa hai lá.',options);
 },
 bloodRitePay({index,discarded}){
  const [code]=this.s.hand.splice(index,1);
  this.discardPlayerCard(code);
  this.bloodRiteDiscard(discarded+1);
 },
 bloodRiteReward(remaining){
  if(!remaining)return;
  const next={type:'bloodRiteReward',remaining:remaining-1};
  const options=[{label:'Nhận 1 resource',ops:[{type:'resource'},next]}];
  if(this.s.resources>0)for(const enemy of this.s.enemies.filter(e=>e.location===this.s.location)){
   options.push({
    label:'Chi 1 resource · gây 1 damage lên '+this.card(enemy.code).name,
    ops:[{type:'bloodRiteDamage',id:enemy.id},next]
   });
  }
  this.choice('Blood-Rite: chọn hiệu ứng cho lá đã bỏ.',options);
 },
 bloodRiteDamage(id){
  if(this.s.resources<1||!this.s.enemies.some(e=>e.id===id&&e.location===this.s.location))throw Error('Mục tiêu Blood-Rite không hợp lệ.');
  this.s.resources--;
  this.hitEnemy({id,amount:1});
 }
};
