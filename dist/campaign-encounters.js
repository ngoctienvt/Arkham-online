import {CULTIST_SPAWNS,MADNESS} from './campaign-data.js';

const ENCOUNTER_TESTS = {
 '01136':['intellect',4,'falseLead'],'01158':['willpower',5,'wrath'],
 '01173':['agility',4,'wings'],'01176':['willpower',4,'yellow']
};
export const campaignEncounterMethods = {
 isCultist(e) {return this.card(e.code).traits?.includes('Cultist');},
 isMonster(e) {return this.card(e.code).traits?.includes('Monster');},
 nearestEnemies(predicate) {
  let frontier=[this.s.location],seen=new Set(frontier);
  while(frontier.length){
   const enemies=this.s.enemies.filter(e=>frontier.includes(e.location)&&predicate(e));
   if(enemies.length)return enemies;
   const next=[];
   for(const id of frontier)for(const link of this.s.locations[id]?.links??[]){
    if(!this.s.locations[link]||seen.has(link))continue;
    seen.add(link);next.push(link);
   }
   frontier=next;
  }
  // NearestEnemyToFallback permits any matching enemy if none can be reached.
  return this.s.enemies.filter(predicate);
 },
 doomNearest(amount,cultistOnly) {
  const enemies=this.nearestEnemies(e=>!cultistOnly||this.isCultist(e));
  if(enemies.length===1)this.enemyDoom(enemies[0],amount);
  else if(enemies.length)this.choice('Chọn kẻ địch gần nhất để đặt '+amount+' doom.',enemies.map(enemy=>({
   label:this.card(enemy.code).name+' · '+this.s.locations[enemy.location].name,
   ops:[{type:'enemyDoom',id:enemy.id,amount}]
  })));
 },
 chantingSearch() {
  this.searchEncounterEnemy('Cultist','Mysterious Chanting: chọn Cultist để rút.');
 },
 searchEncounterEnemy(trait,title) {
  const s=this.s, options=[], seen=new Set();
  for(const zone of ['encounter','encDiscard'])for(const [index,code] of s[zone].entries()){
   const card=this.card(code);
   if(card.type_code!=='enemy'||!card.traits?.includes(trait)||seen.has(code))continue;
   seen.add(code);
   options.push({label:card.name,ops:[{type:'drawSearchedEncounter',zone,index}]});
  }
  if(options.length===1)this.push(...options[0].ops);
  else if(options.length)this.choice(title,options);
  else this.shuffle(s.encounter);
 },
 enemyDoom(enemy,amount) {
  if(!enemy)return;
  enemy.doom=(enemy.doom??0)+amount;
  this.log(this.card(enemy.code).name+' nhận '+amount+' doom.');
 },
 discardUntil(predicate) {
  const s=this.s;
  while(s.encounter.length){
   const code=s.encounter.pop();
   if(predicate(this.card(code)))return code;
   s.encDiscard.push(code);
  }
 },
 mixEncounter() {
  this.s.encounter.push(...this.s.encDiscard.splice(0));
  this.shuffle(this.s.encounter);
 },
 spawnCampaignEnemy(code) {
  const s=this.s;
  if(code==='01169'||code==='01170'){
   const empty=Object.keys(s.locations).filter(id=>id!==s.location&&!s.enemies.some(e=>e.location===id));
   if(!empty.length){s.encDiscard.push(code);return;}
   this.choice(this.card(code).name+': chọn địa điểm trống để xuất hiện.',empty.map(location=>({
    label:s.locations[location].name,ops:[{type:'spawn',code,location}]
   })));
   return;
  }
  const location=CULTIST_SPAWNS[code]??(code==='01116'&&s.locations.house?'house':s.location);
  this.spawn(code,location);
 },
 resolveCampaignEncounter(code) {
  const s=this.s,c=this.card(code);
  if(code==='01136'&&!s.clues){s.encDiscard.push(code);this.push({type:'encounter'});return true;}
  if(ENCOUNTER_TESTS[code]){
   const [skill,difficulty,testKind]=ENCOUNTER_TESTS[code];
   this.push({type:'test',skill,difficulty,testKind,label:c.name,encounterCode:code});
   return true;
  }
  if(code==='01135'){
   s.encDiscard.push(code);
   this.choice('Hunting Shadow: chọn hậu quả.',[
    ...(this.canSpendClues(1)?[{label:'Tiêu 1 manh mối',ops:[{type:'clues',amount:-1}]}]:[]),
    {label:'Nhận 2 damage',ops:[{type:'injury',d:2}]}
   ]);
  }else if(code==='01171'){
   const op=s.enemies.some(e=>this.isCultist(e))?{type:'doomNearest',amount:2,cultistOnly:true}:{type:'chantingSearch'};
   this.push(op,{type:'discardEncounter',code});
  }else if(code==='01174'){
   const eligible=Object.entries(s.locations).filter(([,l])=>!l.locked);
   if(!eligible.length){s.encDiscard.push(code);return true;}
   const most=Math.max(...eligible.map(([,l])=>l.revealed?l.clues:0));
   const targets=eligible.filter(([,l])=>(l.revealed?l.clues:0)===most);
   if(targets.length===1)targets[0][1].locked=true;
   else this.choice('Locked Door: chọn địa điểm có nhiều manh mối nhất.',targets.map(([id,l])=>({
    label:l.name,ops:[{type:'lock',location:id}]
   })));
  }else if(code==='01178'){
   this.push({type:'discardEncounter',code});
   this.choice('Offer of Power: chọn hậu quả.',[
    {label:'Rút 2 lá, đặt 2 doom và kiểm tra agenda',ops:[{type:'drawPlayer',count:2},{type:'addDoom',amount:2}]},
    {label:'Nhận 2 horror',ops:[{type:'injury',h:2}]}
   ]);
  }else if(code==='01182'){
   s.dreams=(s.dreams??0)+1;
   this.push({type:'injury'});
  }else return false;
  return true;
 },
 discardRandom() {
  if(!this.s.hand.length)return false;
  const index=Math.floor(this.random()*this.s.hand.length);
  this.s.discard.push(...this.s.hand.splice(index,1));
  return true;
 },
 addMadness() {
  const code=MADNESS[Math.floor(this.random()*MADNESS.length)];
  this.s.campaign.deck.push(code);
  this.revealWeakness(code);
 },
 wrath(remaining) {
  if(remaining<=0)return;
  this.choice('Umôrdhoth’s Wrath · '+remaining+' hậu quả còn lại',[
   ...this.s.hand.map((code,index)=>({label:'Bỏ '+this.card(code).name,ops:[{type:'discardCard',index},{type:'wrath',remaining:remaining-1}]})),
   {label:'Nhận 1 damage và 1 horror',ops:[{type:'injury',d:1,h:1},{type:'wrath',remaining:remaining-1}]}
  ]);
 },
 campaignTestOutcome(r) {
  const s=this.s;
  if(r.encounterCode)s.encDiscard.push(r.encounterCode);
  switch(r.testKind){
   case 'falseLead': if(!r.success)this.returnClues(-r.margin);break;
   case 'wrath': if(!r.success)this.push({type:'wrath',remaining:-r.margin});break;
   case 'woodsEntry': if(!r.success)this.push({type:'injury',d:1,h:1});break;
   case 'woodsExit': if(r.success)this.push({type:'move',to:r.destination});break;
   case 'graveyard':
    if(!r.success)this.choice('Graveyard: chọn hậu quả.',[
     {label:'Nhận 2 horror',ops:[{type:'injury',h:2}]},
     {label:'Lùi về Rivertown',ops:[{type:'move',to:'rivertown'}]}
    ]);break;
   case 'wings':
    if(!r.success){
     const central=Object.keys(s.locations).find(id=>this.card(s.locations[id].code).traits?.includes('Central'));
     this.push({type:'injury',d:1,h:1},...(central?[{type:'wingsMove',to:central}]:[]));
    }break;
   case 'yellow':
    if(!r.success)this.push({type:'injury',h:2},{type:'searchMadness'});
    break;
   case 'ritual':
    if(r.success&&++s.ritualClues>=2)this.finish('R1');
    break;
   case 'madness': if(!r.success)this.addMadness();break;
   case 'unlock':
    if(r.success){this.here().locked=false;s.encDiscard.push('01174');}
    break;
   case 'dreams':
    if(r.success){s.dreams--;s.encDiscard.push('01182');}
    break;
  }
 },
 returnClues(amount) {
  const n=Math.min(this.s.clues,amount);
  this.s.clues-=n;this.here().clues+=n;
 }
};
