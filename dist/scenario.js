import {campaignCardFace} from './campaign-card-vi.js';
import {LOCATIONS} from './rules-data.js';
export const scenarioMethods={
 advanceAct(force=false) {
  const s=this.s;
  if(this.chapter()===3){
   if(force&&s.act===2){this.move('ritual');return;}
   if(force&&s.act===3){this.finish('R1');return;}
   this.advanceForest(force);return;
  }
  if(force&&this.chapter()===2){this.finish('R1');return;}
  if(force&&s.act===3){
   const priest=s.enemies.find(e=>e.code==='01116');
   if(!priest)throw Error('Ghoul Priest chưa xuất hiện.');
   this.hitEnemy({id:priest.id,amount:this.enemyHealth(priest)});return;
  }
  if(s.act===1){
   if(!force&&s.clues<2)throw Error('Cần 2 manh mối.');if(!force)s.clues-=2;s.act=2;
   for(const e of s.enemies)if(e.location==='study')s.encDiscard.push(e.code);
   s.enemies=s.enemies.filter(e=>e.location!=='study');
   for(const id of ['hallway','attic','cellar','parlor'])s.locations[id]={...LOCATIONS[id],clues:0,revealed:false,fog:false};
   if(s.locations.study.fog)s.encDiscard.push('01168');
   delete s.locations.study;s.location='hallway';this.revealLocation('hallway');
   this.log('Act 2 · The Barrier. Bạn rơi xuống Hallway; Study biến mất. Thu thập 3 manh mối, quay lại Hallway vào cuối vòng.');
  }else if(s.act===2){
   if(!force&&(s.clues<3||s.location!=='hallway'))throw Error('Cần 3 manh mối và ở Hallway.');
   if(!force)s.clues-=3;
   s.act=3;this.revealLocation('parlor');s.litaAvailable=true;
   this.spawn('01116','hallway');this.log('Act 3 · Ghoul Priest xuất hiện! Lita đợi ở Parlor. Hạ Ghoul Priest hoặc rút lui từ Parlor.');
  }
 },
 spawn(code,location=this.s.location) {
  if(!this.s.locations[location]){this.s.encDiscard.push(code);this.log(this.card(code).name+': vị trí Spawn chưa vào chơi; bỏ lá bài.');return;}
  const enemy={id:'e'+(++this.s.serial),code,location,damage:0,exhausted:false,engaged:false,doom:0};
  this.s.enemies.push(enemy);
  this.log(this.card(code).name+' xuất hiện tại '+this.s.locations[location].name);
  if(location===this.s.location)this.engageEnemy(enemy);
  if(code==='01169')this.enemyDoom(enemy,1);
  return enemy;
 },
 attack(id,retaliate=false,enemyPhase=false) {
  const e=this.s.enemies.find(x=>x.id===id);if(!e||e.exhausted||(!e.engaged&&!(retaliate&&e.location===this.s.location)))return;
  const c=this.card(e.code);if(this.s.onTheLam&&!c.traits?.includes('Elite'))return;
  const attack={id,enemyPhase,...(retaliate?{retaliate}: {})};
  if(!this.openTiming('when:enemy-attacks',attack))this.performAttack(attack);
 },
 performAttack({id,enemyPhase}) {
  const e=this.s.enemies.find(enemy=>enemy.id===id);
  if(!e)return;
  const c=this.card(e.code);
  this.log(c.name+' tấn công: '+(c.enemy_damage??0)+' damage / '+(c.enemy_horror??0)+' horror.');
  if(e.code==='01137')e.damage=Math.max(0,e.damage-1);
  const extra=e.code==='01177'&&!this.discardRandom()?1:0;
  this.push({type:'injury',d:(c.enemy_damage??0)+extra,h:(c.enemy_horror??0)+extra},
   ...(enemyPhase?[{type:'exhaustEnemy',id}]:[]));
 },
 dodgeAttack({id,enemyPhase,child}) {
  const index=this.s.hand.indexOf('01023'),cost=this.playCost('01023');
  if((!child&&index<0)||this.s.voices||this.s.resources<cost)throw Error('Không thể dùng Dodge.');
  if(child){
   this.takeChildEvent('01023');
   this.s.deck.unshift('01023');
  }else{
   this.s.hand.splice(index,1);
   this.s.discard.push('01023');
  }
  this.s.resources-=cost;
  this.log('Dodge: hủy đòn tấn công.','debug');
  if(enemyPhase)this.push({type:'exhaustEnemy',id});
 },
 knifeInterrupt({id,asset,enemyPhase,retaliate}) {
  const knife=this.s.assets.find(item=>item.id===asset&&item.code==='53002'&&!item.exhausted);
  const enemy=this.s.enemies.find(item=>item.id===id);
  if(this.s.phase!=='enemy'||!knife||!enemy)throw Error('Không thể dùng Survival Knife.');
  knife.exhausted=true;
  this.push({type:'test',skill:'combat',testKind:'fight',difficulty:this.enemyDifficulty(enemy,'fight'),
   target:id,bonus:2,damage:2,toolCode:'53002',label:'Survival Knife · '+this.card(enemy.code).name},
   {type:'attack',id,enemyPhase,retaliate});
 },
 nextSteps(from,to) {
  if(from===to)return [];
  let frontier=[[from,null]];
  const visited=new Set([from]);
  while(frontier.length){
   const destinations=new Set(frontier.filter(([id])=>id===to).map(([,step])=>step));
   if(destinations.size)return [...destinations];
   const next=[];
   for(const [id,step] of frontier)for(const link of this.s.locations[id].links){
    if(this.s.locations[link]&&!visited.has(link))next.push([link,step??link]);
   }
   for(const [id] of next)visited.add(id);
   frontier=next;
  }
  return [];
 },
 enemyMove(id,to) {
  const enemy=this.s.enemies.find(e=>e.id===id);
  if(!enemy||enemy.engaged)return;
  const steps=this.nextSteps(enemy.location,to);
  if(steps.length>1)this.choice(this.card(enemy.code).name+': chọn đường ngắn nhất.',steps.map(location=>({
   label:this.s.locations[location].name,ops:[{type:'enemyStep',id,location}]
  })));
  else if(steps.length)this.enemyStep(id,steps[0]);
 },
 enemyStep(id,location) {
  const enemy=this.s.enemies.find(e=>e.id===id);
  if(!enemy)return;
  enemy.location=location;
  this.log(this.card(enemy.code).name+' di chuyển đến '+this.s.locations[location].name);
  if(location===this.s.location&&!enemy.exhausted)this.engageEnemy(enemy);
 },
 enemyPhase() {
  const s=this.s;s.phase='enemy';this.log('Pha kẻ địch.');
  const hunters=s.enemies.filter(e=>!e.exhausted&&!e.engaged&&this.card(e.code).text?.includes('Hunter'));
  this.push(...hunters.map(e=>({type:'enemyMove',id:e.id,to:s.location})),{type:'window'},{type:'enemyAttacks'});
 },
 enemyEnd() {
  const ghouls=this.chapter()===1&&this.s.agenda===3?
   this.s.enemies.filter(e=>!e.engaged&&this.card(e.code).traits?.includes('Ghoul')):[];
  this.push(...ghouls.map(e=>({type:'enemyMove',id:e.id,to:'parlor'})),...this.upkeepSteps());
 },
 upkeepSteps() {
  return [{type:'upkeep'},{type:'window'},{type:'readyCards'},{type:'drawPlayer',upkeep:true},
   {type:'resource'},{type:'handLimit'},{type:'endRound'}];
 },
 upkeep() {
  this.s.phase='upkeep';this.log('Upkeep: làm mới bài, rút 1 bài và nhận 1 resource.');
 },
 readyCards() {
  for(const asset of this.s.assets)asset.exhausted=false;
  for(const e of this.s.enemies){e.exhausted=false;if(e.location===this.s.location)this.engageEnemy(e);}
 },
 handLimit() {
  if(this.s.hand.length<=8)return;
  this.choice('Giới hạn tay bài: bỏ xuống còn 8 lá.',this.s.hand.map((code,index)=>({label:this.card(code).name,ops:[{type:'discardHand',index}]})));
 },
 endRound() {
  const s=this.s;
  if(s.voices){for(let i=0;i<s.voices;i++)s.encDiscard.push('01165');s.voices=0;}
  this.campaignRoundEnd();
  if(this.chapter()===1&&s.agenda===3){const n=s.enemies.filter(e=>['hallway','parlor'].includes(e.location)&&this.card(e.code).traits?.includes('Ghoul')).length;s.doom+=n;this.log('Agenda 3: +'+n+' doom từ Ghoul tại Hallway/Parlor.');}
  if(this.chapter()===1&&s.act===2&&s.location==='hallway'&&s.clues>=3)this.choice('Cuối vòng: tiêu 3 manh mối để phá rào chắn?',[
   {label:'Tiến Act 3',ops:[{type:'advanceAct'},{type:'window'},{type:'mythos'}]},
   {label:'Chưa tiến Act',ops:[{type:'window'},{type:'mythos'}]}
  ]);else this.push({type:'window'},{type:'mythos'});
 },
 mythos(firstRound=false) {
  if(!firstRound)this.s.round++;
  delete this.s.childUsed;
  this.s.skidsUsed=false;this.s.leoUsed=false;this.s.debtPaidThisRound=0;this.s.onTheLam=false;this.s.rolandUsed=false;this.s.fearUsed=false;this.s.phase='mythos';
  this.log('Vòng '+this.s.round+' · Mythos.');
  this.push({type:'doom',mythos:true},{type:'encounter'},{type:'window'},{type:'begin'});
 },
 checkAgenda(force=false) {
  const s=this.s;
  const thresholds={1:[3,7,10],2:[6,8],3:[4,5,5]};
  const threshold=thresholds[this.chapter()][s.agenda-1];
  if(!threshold||(!force&&this.doomTotal()<threshold))return;
  const old=s.agenda;s.doom=0;s.agenda++;for(const enemy of s.enemies)enemy.doom=0;this.log('Agenda '+old+' hết thời gian!');
  if(this.chapter()>1){this.advanceCampaignAgenda(old);return;}
  if(old===1)this.choice('Khoảng thời gian bị mất',[
   ...(s.hand.length?[{label:'Bỏ ngẫu nhiên 1 lá trên tay',ops:[{type:'agenda1Discard'}]}]:[]),
   {label:'Nhận 2 horror',ops:[{type:'injury',d:0,h:2}]}
  ],campaignCardFace(this.card('01105'),true).flavor);
  else if(old===2)this.push({type:'agenda2'});
  else{if(s.act<3&&!s.admin)this.finish('R3');else{s.physicalTrauma++;this.eliminate('escaped');}}
 },
 agendaTwo() {
  this.s.encounter.push(...this.s.encDiscard.splice(0));this.shuffle(this.s.encounter);
  while(this.s.encounter.length){
   const code=this.s.encounter.pop();if(this.card(code).type_code==='enemy'&&this.card(code).traits?.includes('Ghoul')){
    this.previewEncounter(code);return;
   }this.s.encDiscard.push(code);
  }
  this.log('Không tìm thấy Ghoul trong encounter deck.');
 },
 drawEncounter() {
  if(!this.s.encounter.length)this.s.encounter=this.shuffle(this.s.encDiscard.splice(0));
  if(!this.s.encounter.length)return;
  this.previewEncounter(this.s.encounter.pop());
 },
 previewEncounter(code) {
  this.s.lastEncounter=code;this.s.pending={kind:'encounter',code};
  this.log('Rút Encounter: '+this.card(code).name,'debug');
 },
 resolveEncounter(code) {
  const c=this.card(code),s=this.s;s.lastEncounter=code;this.log('Encounter: '+c.name,'encounter');
  if(c.type_code==='enemy'&&this.chapter()>1){this.spawnCampaignEnemy(code);return;}
  if(c.type_code==='enemy'){this.spawn(code,code==='01118'?'attic':code==='01119'?'cellar':s.location);return;}
  const tests={'01162':['agility',3,'hands'],'01163':['willpower',3,'remains'],'01167':['willpower',4,'chill']};
  if(tests[code]){const [skill,difficulty,testKind]=tests[code];this.push({type:'test',skill,difficulty,testKind,label:c.name});}
  else if(code==='01164')s.fear++;
  else if(code==='01165')s.voices++;
  else if(code==='01166')this.push({type:'doom'},{type:'discardEncounter',code});
  else if(code==='01168'){if(this.here().fog)s.encDiscard.push(code);else this.here().fog=true;}
  else if(!this.resolveCampaignEncounter(code))throw Error('Encounter chưa có xử lý: '+code);
 },
 finish(resolution) {
  const s=this.s;
  let xp=s.victory.reduce((sum,code)=>sum+(this.card(code).victory??0),0);
  for(const room of Object.values(s.locations))if(room.revealed&&room.clues===0)xp+=this.card(room.code).victory??0;
  if(s.cover)s.mentalTrauma++;
  if(this.chapter()===1){
   if(resolution==='R1')s.mentalTrauma++;
   if(resolution==='R3')xp=0;else xp+=resolution==='R2'?3:2;
  }
  for(const op of s.queue){
   if(op.type==='testEnd')s.discard.push(...op.committed);
   if(op.type==='restoreWindow')s.discard.push(...(op.pending.committed??[]));
   if(op.type==='discardEvent'||(op.type==='cache'&&op.bottom)){
    if(op.bottom)s.deck.unshift(op.code);else s.discard.push(op.code);
   }
  }
  s.outcome=this.chapter()>1?this.campaignOutcome(resolution,xp):{resolution,xp,mentalTrauma:s.mentalTrauma,physicalTrauma:s.physicalTrauma,
   priestAlive:!s.victory.includes('01116'),lita:!['R2','R3'].includes(resolution),killed:resolution==='R3',houseBurned:resolution==='R1'};
  if(s.admin){
   s.physicalTrauma=s.outcome.physicalTrauma=Math.min(s.physicalTrauma,this.investigator().health-1);
   s.mentalTrauma=s.outcome.mentalTrauma=Math.min(s.mentalTrauma,this.investigator().sanity-1);
  }
  if(resolution==='defeated'&&this.hasOptionalRule('BoonOfPersephone'))s.outcome.xp+=3;
  if(resolution==='defeated'&&this.hasOptionalRule('UltimatumOfFinality')){
   if(s.hp>=this.healthLimit()){
    s.outcome.killed=true;
    this.log('Ultimatum of Finality: điều tra viên thiệt mạng do damage.','debug');
   }
   if(s.horror>=this.sanityLimit()){
    s.outcome.drivenInsane=true;
    this.log('Ultimatum of Finality: điều tra viên mất trí do horror.','debug');
   }
  }
  if(s.hospitalDebts!=null&&s.hospitalDebts<6)s.outcome.xp=Math.max(0,s.outcome.xp-2);
  if(this.hasOptionalRule('UltimatumOfInduction'))s.outcome.xp=0;
  this.campaignRecord(s.outcome);
  s.phase='finished';delete s.phaseStep;s.pending=null;s.queue=[];this.log('Kết thúc: '+resolution+' · '+s.outcome.xp+' XP.','outcome');
 }
};
