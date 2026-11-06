export const actionMethods={
 canBoost(skill) {return (['willpower','combat'].includes(skill)&&this.asset('01017'))||(['combat','agility'].includes(skill)&&this.asset('01049'));},
 isFastCard(code) {return ['01010','01030','01043','01050'].includes(code);},
 childEvent() {
  if(!this.hasOptionalRule('BoonOfTheChild')||this.s.childUsed)return -1;
  return this.s.discard.findLastIndex(code=>this.card(code).type_code==='event');
 },
 childCanPlay(code) {
  const s=this.s;
  return s.discard[this.childEvent()]===code&&!s.voices&&s.resources>=this.playCost(code);
 },
 takeChildEvent(code) {
  if(!this.childCanPlay(code))throw Error('Không thể dùng Boon of the Child.');
  this.s.discard.splice(this.childEvent(),1);
  this.s.childUsed=true;
  this.log('Boon of the Child: chơi '+this.card(code).name+' từ chồng bài bỏ.','debug');
 },
 childOption({duringTurn=false,turnStart=false,ordinary=false}={}) {
  const s=this.s,index=this.childEvent(),code=s.discard[index];
  if(!code||!this.childCanPlay(code)||['01022','01023'].includes(code))return;
  if(code==='01026'&&!this.firearms().length)return;
  if(code==='01050'&&!this.canPlayElusive()||code==='05314'&&!this.canPlayMelody())return;
  if(code==='01010'?!turnStart:this.isFastCard(code)?!duringTurn:!ordinary||s.actions<1)return;
  return {label:'Boon of the Child · '+this.card(code).name,args:{kind:'child'}};
 },
 fastOptions({duringTurn=false,skill,turnStart=false}={}) {
  const s=this.s, options=[];
  for(const [index,code] of s.hand.entries()){
   if(s.voices||s.resources<this.playCost(code))continue;
   if(code==='01050'&&!this.canPlayElusive())continue;
   if(code==='01010'?turnStart:duringTurn&&this.isFastCard(code))
    options.push({label:'Chơi '+this.card(code).name,args:{kind:'play',index}});
  }
  if(this.canPayHospitalDebts())options.push({label:'Trả 1 resource cho Hospital Debts',args:{kind:'hospitalDebts'}});
  if(duringTurn&&this.asset('01027'))options.push({label:'Bỏ Police Badge · +2 action',args:{kind:'badge'}});
  for(const asset of s.assets){
   if(!['01018','01028'].includes(asset.code)||(asset.code==='01028'&&asset.exhausted))continue;
   for(const enemy of s.enemies.filter(e=>e.location===s.location))
    options.push({label:this.card(asset.code).name+' → '+this.card(enemy.code).name,args:{kind:'cop',asset:asset.id,target:enemy.id}});
  }
  if(s.resources&&this.canBoost(skill))
   options.push({label:'Chi 1 resource → +1 kỹ năng',boost:true});
  const child=this.childOption({duringTurn,turnStart});
  if(child)options.push(child);
  return options;
 },
 playFast(args) {
  const p=this.s.pending;
  if(!['window','test'].includes(p?.kind))throw Error('Không có cửa sổ dùng khả năng nhanh.');
  const duringTurn=p.duringTurn??false;
  const option=this.fastOptions({duringTurn,skill:p.skill,turnStart:p.turnStart}).find(o=>o.args&&
   o.args.kind===args.kind&&o.args.index===args.index&&o.args.asset===args.asset&&o.args.target===args.target);
  if(!option)throw Error('Không thể dùng lá này trong cửa sổ hiện tại.');
  const queue=this.s.queue;
  this.s.queue=[];this.s.pending=null;
  this.action(option.args,p.turnStart);
  if(p.kind==='test'){
   if(p.committed.length)p.commitClosed=true;
   this.s.queue.push({type:'restoreWindow',pending:p});
  }
  else this.s.queue.push({type:'window',duringTurn,turnStart:p.turnStart,point:p.point});
  this.s.queue.push(...queue);
 },
 attacks(ids,enemyPhase=false) {
  if(!ids.length)return;
  const makeOps=id=>[{type:'attack',id,enemyPhase},{type:'attacks',ids:ids.filter(x=>x!==id),enemyPhase}];
  if(ids.length===1){this.push(...makeOps(ids[0]));return;}
  this.choice('Chọn kẻ địch tấn công trước.',ids.map(id=>({
   label:this.card(this.s.enemies.find(e=>e.id===id).code).name,ops:makeOps(id)
  })));
 },
 investigationSkill() {return ({'01152':'willpower','01153':'agility','01154':'combat'})[this.here().code]??'intellect';},
 hermesAvailable() {return this.hasOptionalRule('BoonOfHermes')&&!this.s.hermesUsed;},
 actionCost(kind) {
  const extra=this.s.fear&&!this.s.fearUsed&&['move','fight','evade'].includes(kind)?this.s.fear:0;
  return 1+extra-Number(kind==='move'&&this.hermesAvailable());
 },
 spend(kind,fast=false,provokes=true) {
  const cost=fast?0:this.actionCost(kind);if(this.s.actions<cost)throw Error(`Cần ${cost} action.`);
  this.s.actions-=cost;
  if(!fast&&kind==='move'&&this.hermesAvailable())this.s.hermesUsed=true;
  if(!fast&&this.s.fear&&!this.s.fearUsed&&['move','fight','evade'].includes(kind))this.s.fearUsed=true;
  if(provokes&&!fast&&!['fight','evade','parley','resign'].includes(kind))this.push({type:'attacks',ids:this.engaged().map(e=>e.id)});
 },
 canPayHospitalDebts() {const s=this.s;return s.hospitalDebts!=null&&s.hospitalDebts<6&&(s.debtPaidThisRound??0)<2&&s.resources>0;},
 action(a,turnStart=false) {
  const s=this.s;
  if(a.kind==='skidsAction'){
   if(this.investigator().code!=='01003'||s.skidsUsed||s.resources<2)throw Error('Không thể dùng khả năng của Skids.');
   s.resources-=2;s.actions++;s.skidsUsed=true;this.log('Skids: chi 2 resource để lấy thêm 1 action.');return;
  }
  if(a.kind==='hospitalDebts'){
   if(!this.canPayHospitalDebts())throw Error('Không thể trả Hospital Debts.');
   s.resources--;s.hospitalDebts++;s.debtPaidThisRound=(s.debtPaidThisRound??0)+1;return;
  }
  if(a.kind==='end'){
   s.phaseStep='turn-end';
   this.push(...Array.from({length:s.fear},()=>({type:'test',skill:'willpower',difficulty:3,testKind:'fear',label:'Frozen in Fear',duringTurn:false})),
    {type:'readyBoss'},{type:'enemyPhase'});return;
  }
  if(a.kind==='advance'){
   if(s.act!==1||!this.canSpendClues(this.chapter()===3?3:2)||this.chapter()===2)throw Error('Act 1 cần 2 manh mối.');
   this.push({type:'advanceAct'});return;
  }
  if(a.kind==='resource'||a.kind==='draw'){
   this.spend(a.kind);s.queue.push({type:a.kind==='draw'?'drawPlayer':'resource'});return;
  }
  if(a.kind==='move'){
   if(!this.here().links.includes(a.to)||!s.locations[a.to]||(a.to==='parlor'&&s.act<3))throw Error('Không thể đi đến vị trí đó.');
   this.spend('move');
   s.queue.push(this.here().code==='01151'?{type:'test',skill:'intellect',difficulty:3,testKind:'woodsExit',destination:a.to,label:'Twisting Paths'}:{type:'move',to:a.to});return;
  }
  if(a.kind==='investigate'){
   if(this.here().locked)throw Error('Locked Door chặn điều tra.');
   let reduction=0;
   if(a.tool){const tool=s.assets.find(x=>x.id===a.tool&&x.code==='01087');if(!tool||tool.uses<1)throw Error('Flashlight đã hết pin.');reduction=2;}
   this.spend('investigate');if(a.tool)s.assets.find(x=>x.id===a.tool).uses--;
   s.queue.push({type:'test',skill:this.investigationSkill(),difficulty:Math.max(0,this.here().shroud+(this.here().fog?2:0)-reduction),testKind:'investigate',toolCode:a.tool?'01087':null,label:'Điều tra '+this.here().name});return;
  }
  if(a.kind==='fight'||a.kind==='evade'){
   const e=s.enemies.find(x=>x.id===a.target&&x.location===s.location);if(!e)throw Error('Không có kẻ địch tại đây.');
   if(a.kind==='evade'&&!e.engaged)throw Error('Chỉ có thể né kẻ địch đang giao chiến với bạn.');
   let bonus=0,damage=1,weapon=null;
   if(a.weapon){
    if(a.kind!=='fight')throw Error('Chỉ dùng vũ khí khi đánh.');
    weapon=s.assets.find(x=>x.id===a.weapon);if(!weapon||!['01006','01016','01020','01086','53002'].includes(weapon.code))throw Error('Vũ khí không hợp lệ.');
    if(['01006','01016'].includes(weapon.code)&&weapon.uses<1)throw Error('Vũ khí hết đạn.');
    bonus=weapon.code==='01006'&&this.here().clues>0?3:1;
    if(weapon.code==='01086'){
     bonus=a.discardKnife===true?2:1;
     damage=bonus;
    }else if(weapon.code==='53002'){bonus=2;damage=1;}
    else damage=weapon.code==='01020'?(s.enemies.filter(x=>x.engaged).length===1&&e.engaged?2:1):2;
   }
   this.spend(a.kind);
   if(weapon?.code==='01086'&&a.discardKnife===true)this.discardAsset(weapon.id);
   if(['01006','01016'].includes(weapon?.code))weapon.uses--;
   this.push({type:'test',skill:a.kind==='fight'?'combat':'agility',difficulty:this.enemyDifficulty(e,a.kind),testKind:a.kind,target:e.id,bonus,damage,toolCode:weapon?.code,label:(a.kind==='fight'?'Đánh ':'Né ')+this.card(e.code).name});return;
  }
  if(a.kind==='engage'){
   const e=s.enemies.find(x=>x.id===a.target&&x.location===s.location&&!x.engaged&&x.code!=='01157');if(!e)throw Error('Không thể giao chiến.');
   this.spend('engage');s.queue.push({type:'engage',id:e.id});return;
  }
  if(a.kind==='parley'){
   if(s.location!=='parlor'||!s.litaAvailable)throw Error('Lita không ở đây.');
   this.spend('parley');this.push({type:'test',skill:'intellect',difficulty:4,testKind:'parley',label:'Thuyết phục Lita Chantler'});return;
  }
  if(a.kind==='resign'){
   if(this.chapter()===1?(s.location!=='parlor'||s.act<3):this.chapter()===3&&s.location!=='main')throw Error('Chỉ có thể rút lui từ Parlor.');
   this.spend('resign');this.push({type:'elimination',resolution:this.chapter()===2?'R1':'resigned'});return;
  }
  if(a.kind==='play'||a.kind==='child'){
   const child=a.kind==='child';
   if(child&&!this.childOption({duringTurn:s.phase==='investigation',turnStart,ordinary:true}))throw Error('Không thể dùng Boon of the Child.');
   if(child&&s.discard[this.childEvent()]==='01026'){this.campaignAction({kind:'supply',child,asset:a.asset});return;}
   const zone=child?s.discard:s.hand,index=child?this.childEvent():a.index;
   if(!Number.isInteger(index)||index<0||index>=zone.length)throw Error('Bài không hợp lệ.');
   const code=zone[index],c=this.card(code);
   if(c.permanent)throw Error('Permanent vào chơi khi chuẩn bị màn.');
   if(this.isScreamedAlly(code))throw Error('Ultimatum of the Scream: Ally này đã bị loại khỏi chiến dịch.');
   if(code==='01023')throw Error('Dodge chỉ chơi khi kẻ địch tấn công.');
   if(code==='01022')throw Error('Evidence! chỉ chơi sau khi hạ kẻ địch.');
   if(code==='01050'&&!this.canPlayElusive())throw Error('Không có địa điểm hoặc kẻ địch hợp lệ cho Elusive.');
   if(code==='05314'&&!this.canPlayMelody())throw Error('Không có mục tiêu hồi phục hoặc lá để rút.');
   if(s.voices)throw Error('Dissonant Voices: không thể chơi asset hoặc event trong vòng này.');
   if(!['asset','event'].includes(c.type_code))throw Error('Lá skill chỉ được góp trong kiểm tra.');
   if(code==='01026')throw Error('Chọn súng để nạp đạn.');
   const cost=this.playCost(code);
   if(s.resources<cost)throw Error('Không đủ resource.');
   if(code==='01010'&&!turnStart)throw Error('Chỉ chơi On the Lam ngay khi lượt bắt đầu.');
   const fast=this.isFastCard(code);this.spend('play',fast,code!=='05317');
   if(child)this.takeChildEvent(code);else zone.splice(index,1);
   s.resources-=cost;
   const discard={type:'discardEvent',code,...(child?{bottom:true}:{})};
   if(code==='01010'){s.onTheLam=true;if(child)s.deck.unshift(code);else s.discard.push(code);this.log('On the Lam: kẻ địch thường không thể tấn công bạn trong vòng này.');}
   else if(code==='01043')s.queue.push({type:'drawPlayer',count:3},discard);
   else if(code==='01050')s.queue.push({type:'elusive'},discard);
   else if(code==='05314')s.queue.push({type:'soothingMelody',remaining:2},{type:'drawPlayer'},discard);
   else if(code==='05317')s.queue.push({type:'drawPlayer',count:2},{type:'bloodRiteDiscard',discarded:0},discard);
   else s.queue.push({type:c.type_code==='asset'?'equip':'cache',code,...(child?{bottom:true}:{})});return;
  }
  if(a.kind==='heal'){
   const asset=s.assets.find(x=>x.id===a.asset&&x.code==='01019'&&x.uses>0);
   if(!asset||!['hp','horror'].includes(a.stat)||s[a.stat]===0)throw Error('Không thể hồi phục.');
   this.spend('heal');asset.uses--;
   if(!asset.uses)this.discardAsset(asset.id);
   s.queue.push({type:'heal',stat:a.stat});return;
  }
  if(a.kind==='cop'){
   const asset=s.assets.find(x=>x.id===a.asset&&['01018','01028'].includes(x.code));
   const e=s.enemies.find(x=>x.id===a.target&&x.location===s.location);
   if(!asset||!e)throw Error('Mục tiêu không hợp lệ.');
   if(asset.code==='01028'){
    if(asset.exhausted)throw Error('Beat Cop đã kiệt sức.');
    asset.exhausted=true;asset.hp++;
    if(asset.hp>=this.card(asset.code).health)this.discardAsset(asset.id,true);
    this.push({type:'hitEnemy',id:e.id,amount:1});
   }else this.push({type:'discardAsset',id:asset.id},{type:'hitEnemy',id:e.id,amount:1});
   return;
  }
  if(this.campaignAction(a))return;
  throw Error('Hành động không được hỗ trợ.');
 }
};
