import {campaignCardFace} from './campaign-card-vi.js';
export const roundSteps={
 enemyPhase:'hunter',enemyAttacks:'attacks',enemyEnd:'enemy-end',
 upkeep:'upkeep-start',readyCards:'ready',drawPlayer:'draw-resource',
 handLimit:'hand-limit',endRound:'round-end',mythos:'mythos-start',
 encounter:'encounter',begin:'investigator-turn'
};
export const windowPoints={
 hunter:'before-enemy-attacks',attacks:'after-enemy-attacks',
 'upkeep-start':'before-upkeep-ready','round-end':'after-upkeep',
 encounter:'after-encounter','investigator-turn':'turn-start'
};
export const effectMethods={
 effect(op) {
  const s=this.s;
  if(Object.hasOwn(roundSteps,op.type)&&(op.type!=='drawPlayer'||op.upkeep))s.phaseStep=roundSteps[op.type];
  if(op.type==='doom'&&op.mythos)s.phaseStep='doom';
  switch(op.type){
   case 'test':this.test(op);break;
   case 'action':this.action(op.args);break;
   case 'scoreTest':this.scoreTest(op.test,op.tokens,op.modifier);break;
   case 'resolveAthena':this.resolveAthena(op.context,op.cancel);break;
   case 'destinyOpening':this.destinyOpening(op.code);break;
   case 'testOutcome':this.testOutcome(op.result,op.consequences);break;
   case 'campaignTestOutcome':this.campaignTestOutcome(op.result);break;
   case 'orderTestEffects':this.orderTestEffects(op.groups);break;
   case 'fightResult':this.withSkillDraws('Gây damage',[op.hit],op.after);break;
   case 'returnClues':this.returnClues(op.amount);break;
   case 'searchEncounterEnemy':this.searchEncounterEnemy(op.trait,'Chọn '+op.trait+' để rút.');break;
   case 'evadeEnemy':{
    const enemy=s.enemies.find(e=>e.id===op.id);
    if(enemy){
     enemy.exhausted=true;enemy.engaged=false;
     this.log('Đã né và làm kiệt sức '+this.card(enemy.code).name);
     if(enemy.code==='01141')this.recordCultist(enemy);
    }
    break;
   }
   case 'recruitLita':s.litaAvailable=false;this.equip('01117');break;
   case 'window':
    if(this.fastOptions(op).length){
     const point=op.point??windowPoints[s.phaseStep]??'player-window';
     s.pending={kind:'window',duringTurn:op.duringTurn,turnStart:op.turnStart,point};
    }
    break;
   case 'restoreWindow':s.pending=op.pending;break;
   case 'readyBoss':{
    const boss=s.enemies.find(e=>e.code==='01157');
    if(boss){boss.exhausted=false;boss.engaged=boss.location===s.location;}
    break;
   }
   case 'testEnd':for(const code of op.committed)this.discardPlayerCard(code);break;
   case 'injury':this.injury(op);break;
   case 'directInjury': {
    if(s.admin){this.log('Admin: chặn damage/horror trực tiếp.','debug');break;}
    const damage=this.osirisDamage(op.d);
    s.hp+=damage;s.horror+=op.h;
    this.push({type:'injury',taken:{hp:damage,horror:op.h}});break;
   }
   case 'assign':this.assign(op);break;
   case 'discardAsset':this.discardAsset(op.id);break;
   case 'equip':this.equip(op.code);break;
   case 'drawPlayer':this.drawPlayer(op.count);break;
   case 'revealWeakness':this.revealWeakness(op.code);break;
   case 'discardEvent':if(op.bottom)s.deck.unshift(op.code);else this.discardPlayerCard(op.code);break;
   case 'soothingMelody':this.soothingMelody(op.remaining);break;
   case 'healMelody':this.healMelody(op);break;
   case 'bloodRiteDiscard':this.bloodRiteDiscard(op.discarded);break;
   case 'bloodRitePay':this.bloodRitePay(op);break;
   case 'bloodRiteReward':this.bloodRiteReward(op.remaining);break;
   case 'bloodRiteDamage':this.bloodRiteDamage(op.id);break;
   case 'discardEncounter':s.encDiscard.push(op.code);break;
   case 'resource':s.resources++;this.log('Nhận 1 resource.');break;
   case 'cache':s.resources+=3;if(op.bottom)s.deck.unshift(op.code);else s.discard.push(op.code);this.log('Emergency Cache: +3 resource.');break;
   case 'heal':s[op.stat]=Math.max(0,s[op.stat]-(op.amount??1));this.log('First Aid: hồi 1 '+(op.stat==='hp'?'damage':'horror'));break;
   case 'engage':{const e=s.enemies.find(e=>e.id===op.id);if(e)this.engageEnemy(e);break;}
   case 'move':this.move(op.to);break;
   case 'elusive':this.elusive();break;
   case 'elusiveMove':this.elusiveMove(op.id);break;
   case 'discover':this.discover(op.count);break;
   case 'clearCover':s.cover=Math.max(0,s.cover-op.count);this.log('Cover Up: còn '+s.cover+' manh mối.');break;
   case 'takeClues':{const n=Math.min(op.count,this.here().clues);this.here().clues-=n;s.clues+=n;this.log('Tìm được '+n+' manh mối.');break;}
   case 'hitEnemy':this.hitEnemy(op);break;
   case 'attack':this.attack(op.id,op.retaliate,op.enemyPhase);break;
   case 'performAttack':this.performAttack(op);break;
   case 'dodgeAttack':this.dodgeAttack(op);break;
   case 'knifeInterrupt':this.knifeInterrupt(op);break;
   case 'attacks':this.attacks(op.ids,op.enemyPhase);break;
   case 'exhaustEnemy':{
    const enemy=s.enemies.find(e=>e.id===op.id);
    if(enemy){enemy.exhausted=true;if(enemy.code==='01157')enemy.engaged=false;}
    break;
   }
   case 'rolandReaction':this.rolandReaction();break;
   case 'timingReactions':this.timingReactions(op.point,op.event);break;
   case 'releaseBonded':this.releaseBonded(op.code);break;
   case 'defeatTrauma':s[op.stat]++;this.eliminate('defeated');break;
   case 'osirisTrauma':this.osirisTrauma(op.stat);break;
   case 'roland':s.rolandUsed=true;this.push({type:'discover',count:1});break;
   case 'evidence':{
    const index=s.hand.indexOf('01022'),cost=this.playCost('01022');
    if((!op.child&&index<0)||s.voices||s.resources<cost||!this.here().clues||!this.canSpendClues(0)){
     throw Error('Không thể dùng Evidence!.');
    }
    if(op.child){
     this.takeChildEvent('01022');
     s.deck.unshift('01022');
    }else{
     s.hand.splice(index,1);
     s.discard.push('01022');
    }
    s.resources-=cost;
    this.log('Evidence!: tìm 1 manh mối.','debug');
    this.push({type:'discover',count:1});break;
   }
   case 'advanceAct':this.advanceAct();break;
   case 'enemyAttacks':this.push({type:'attacks',ids:this.engaged().map(e=>e.id),enemyPhase:true},{type:'window'},{type:'enemyEnd'});break;
   case 'enemyMove':this.enemyMove(op.id,op.to);break;
   case 'enemyStep':this.enemyStep(op.id,op.location);break;
   case 'enemyPhase':this.enemyPhase();break;
   case 'enemyEnd':this.enemyEnd();break;
   case 'upkeep':this.upkeep();break;
   case 'readyCards':this.readyCards();break;
   case 'handLimit':this.handLimit();break;
   case 'discardHand':{const [code]=s.hand.splice(op.index,1);s.discard.push(code);this.push({type:'handLimit'});break;}
   case 'endRound':this.endRound();break;
   case 'mythos':this.mythos(op.firstRound);break;
   case 'doom':s.doom++;this.checkAgenda();break;
   case 'elimination':this.eliminate(op.resolution);break;
   case 'agenda2':this.agendaTwo();break;
   case 'agenda1Discard':if(s.hand.length){const i=Math.floor(this.random()*s.hand.length);const [code]=s.hand.splice(i,1);s.discard.push(code);this.log('Bỏ ngẫu nhiên: '+this.card(code).name);}break;
   case 'encounter':this.drawEncounter();break;
   case 'begin':
    for(const e of s.enemies)if(e.code==='01170')this.enemyDoom(e,1);
    s.phase='investigation';s.leoUsed=Boolean(this.asset('01048'));s.actions=3+Number(s.leoUsed);
    delete s.hermesUsed;
    delete s.osirisProtected;
    this.log('Lượt điều tra mới: '+s.actions+' action.');this.offerTurnStart();break;
   case 'finish':this.finish(op.resolution);break;
   case 'noop':break;
   default:if(!this.campaignEffect(op))throw Error('Hiệu ứng không được hỗ trợ: '+op.type);
  }
 },
 injury({d=0,h=0,taken={hp:0,horror:0},lastTarget={}}) {
  if(this.s.admin&&(d||h)){this.log('Admin: chặn '+d+' damage / '+h+' horror.','debug');return;}
  d=this.osirisDamage(d);
  if(!d&&!h){
   for(const a of [...this.s.assets]){
    const c=this.card(a.code);
    if(a.hp>=(c.health??Infinity)||a.horror>=(c.sanity??Infinity))this.discardAsset(a.id,true);
   }
   if(this.s.hp>=this.healthLimit()||this.s.horror>=this.sanityLimit())this.defeated();
   else {
    const madness=this.s.madness??[];
    const damage=taken.horror?madness.filter(c=>c==='01099').length:0;
    const horror=taken.hp?madness.filter(c=>c==='01100').length:0;
    if(damage||horror)this.push({type:'directInjury',d:damage,h:horror});
   }
   return;
  }
  const s=this.s,stat=d?'hp':'horror',amount=d||h;
  const targets=s.assets.filter(a=>{const c=this.card(a.code);return(c[d?'health':'sanity']??0)>a[stat];});
  if(targets.length){
   const agony=this.hasOptionalRule('UltimatumOfAgony');
   const option=(id,label)=>({
    label,ops:[{type:'assign',stat,id},{
     type:'injury',d:d?d-1:0,h:d?h:h-1,
     taken:id===null?{...taken,[stat]:taken[stat]+1}:taken,
     ...(agony?{lastTarget:{...lastTarget,[stat]:id}}:{})
    }]
   });
   const kind=d?'damage':'horror';
   const opts=[option(null,`${this.investigator().name} nhận 1 ${kind}`)];
   for(const a of targets){
    const limit=this.card(a.code)[d?'health':'sanity'];
    opts.push(option(a.id,`${this.card(a.code).name} nhận 1 ${kind} (${a[stat]}/${limit})`));
   }
   const locked=agony?opts.find(choice=>choice.ops[0].id===lastTarget[stat]):undefined;
   if(locked)this.push(...locked.ops);
   else this.choice(`Gán ${amount} ${kind}${d&&h?' và '+h+' horror':''}`,opts);
  }else {s[stat]+=amount;this.log(`${this.investigator().name} nhận ${amount} ${d?'damage':'horror'}.`);this.push({type:'injury',d:0,h:d?h:0,taken:{...taken,[stat]:taken[stat]+amount}});}
 },
 assign({stat,id}) {
  if(id){const a=this.s.assets.find(a=>a.id===id);if(!a)throw Error('Asset không tồn tại.');a[stat]++;this.log(this.card(a.code).name+' nhận 1 '+(stat==='hp'?'damage':'horror'));
  }else{this.s[stat]++;}
 },
 defeated() {
  const s=this.s;
  if(s.admin){
   s.hp=Math.min(s.hp,this.healthLimit()-1);s.horror=Math.max(0,Math.min(s.horror,this.sanityLimit()-1));
   this.log('Admin: ngăn điều tra viên gục ngã.','debug');return;
  }
  const damage=s.hp>=this.healthLimit(),horror=s.horror>=this.sanityLimit();
  const osiris=this.hasOptionalRule('BoonOfOsiris')&&!s.osirisUsed;
  const type=osiris?'osirisTrauma':'defeatTrauma';
  if(damage&&horror){
   this.choice(osiris?'Boon of Osiris: chọn một loại trauma.':'Điều tra viên gục vì cả damage và horror. Chọn một loại trauma.',[
    {label:'1 physical trauma',ops:[{type,stat:'physicalTrauma'}]},
    {label:'1 mental trauma',ops:[{type,stat:'mentalTrauma'}]}
   ]);
   return;
  }
  this.effect({type,stat:damage?'physicalTrauma':'mentalTrauma'});
 },
 osirisDamage(damage) {
  if(!this.s.osirisProtected||!damage)return damage;
  this.log('Boon of Osiris: chặn '+damage+' damage.','debug');
  return 0;
 },
 osirisTrauma(stat) {
  const s=this.s;
  s.osirisUsed=true;
  s[stat]++;
  this.log('Boon of Osiris: nhận 1 '+(stat==='physicalTrauma'?'physical':'mental')+' trauma.','debug');
  if(s.physicalTrauma>=this.investigator().health||s.mentalTrauma>=this.investigator().sanity){
   this.eliminate('defeated');
   return;
  }
  s.hp=0;s.horror=0;s.osirisProtected=true;
  this.log('Boon of Osiris: hồi toàn bộ damage và horror.','debug');
 },
 eliminate(resolution) {
  if(this.s.clues)this.returnClues(this.s.clues);
  this.finish(resolution);
 },
 discardAsset(id,defeated=false) {
  const i=this.s.assets.findIndex(a=>a.id===id);
  if(i<0||this.card(this.s.assets[i].code).permanent)return;
  const [asset]=this.s.assets.splice(i,1);
  const card=this.card(asset.code);
  if(defeated&&this.hasOptionalRule('UltimatumOfTheScream')&&card.is_unique&&
     card.traits?.split('.').some(trait=>trait.trim()==='Ally')&&asset.code!=='01117'&&!this.weakness(asset.code)){
   const banned=this.s.screamedAllies??=[];
   if(!banned.includes(asset.code))banned.push(asset.code);
   this.log('Ultimatum of the Scream: loại '+card.name+' khỏi chiến dịch.','debug');
  }else if(asset.code!=='01117'||this.chapter()>1)this.s.discard.push(asset.code);
  this.reclaimBonded(asset.code);
  this.log('Bỏ asset: '+card.name);
 },
 equip(code) {
  const c=this.card(code),slot=c.slot;
  const conflicts=this.s.assets.filter(a=>this.card(a.code).slot===slot&&slot);
  const capacity=slot==='Hand'?2:slot==='Ally'?1+this.s.assets.filter(a=>a.code==='02158').length:1;
  if(slot&&conflicts.length>=capacity){this.choice('Cần chỗ cho '+c.name+'. Chọn asset phải bỏ.',conflicts.map(a=>({label:this.card(a.code).name,ops:[{type:'discardAsset',id:a.id},{type:'equip',code}]})));return;}
  if(code==='01048'&&this.s.phase==='investigation'&&!this.s.leoUsed){this.s.actions++;this.s.leoUsed=true;}
  this.s.assets.push({code,id:'a'+(++this.s.serial),hp:0,horror:0,uses:['01006','01016'].includes(code)?4:['01019','01087'].includes(code)?3:0});this.log('Vào chơi: '+c.name);
  this.openTiming('after:asset-enters-play',{code});
 },
 discover(count) {
  if(!this.canSpendClues(0))return;
  const n=Math.min(count,this.here().clues);if(!n)return;
  if(this.s.cover)this.choice('Cover Up: dùng lần tìm manh mối này để xóa manh mối trên điểm yếu?',[
   {label:`Xóa ${Math.min(n,this.s.cover)} trên Cover Up (vị trí giữ nguyên manh mối)`,ops:[{type:'clearCover',count:n}]},
   {label:`Lấy ${n} manh mối tại vị trí`,ops:[{type:'takeClues',count:n}]}
  ]);else this.push({type:'takeClues',count:n});
 },
 move(to) {
  for(const e of this.s.enemies)if(e.code==='01157')e.engaged=false;
  this.s.location=to;this.revealLocation(to);
  for(const e of this.s.enemies)if(e.engaged)e.location=to;
  for(const e of this.s.enemies)if(e.location===to&&!e.exhausted)this.engageEnemy(e);
  this.log('Di chuyển đến '+this.here().name);
  this.campaignArrival();
  if(to==='attic')this.push({type:'injury',d:0,h:1});if(to==='cellar')this.push({type:'injury',d:1,h:0});
 },
 hitEnemy({id,amount}) {
  const e=this.s.enemies.find(x=>x.id===id);if(!e)return;e.damage+=amount;this.log(this.card(e.code).name+' nhận '+amount+' damage.');
  if(e.damage<this.enemyHealth(e))return;
  this.s.enemies=this.s.enemies.filter(x=>x.id!==id);const c=this.card(e.code);this.log('Hạ gục '+c.name);
  if(e.code==='01157'){if(c.victory)this.s.victory.push(e.code);this.finish('R2');return;}
  if(this.chapter()===2&&c.is_unique&&this.isCultist(e)){this.recordCultist(e);if(this.s.outcome)return;}
  else if(c.victory)this.s.victory.push(e.code);else this.s.encDiscard.push(e.code);
  if(e.code==='01116'&&this.chapter()===1&&this.s.act===3){this.choice('Ghoul Priest đã gục. Bạn quyết định số phận ngôi nhà.',[
   {label:'Đốt ngôi nhà · Kết thúc 1',ops:[{type:'finish',resolution:'R1'}]},
   {label:'Giữ ngôi nhà · Kết thúc 2',ops:[{type:'finish',resolution:'R2'}]}
  ],campaignCardFace(this.card('01110'),true).flavor);return;}
  this.openTiming('after:enemy-defeated',{code:e.code});
 },
 rolandReaction() {
  this.timingReactions('after:enemy-defeated',{});
 }
};
