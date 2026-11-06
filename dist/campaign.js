import {INVESTIGATORS} from './rules-data.js';
import {quoteDeckUpgrade} from './deck-library.js';
import {fillOpeningHand} from './investigator-state.js';
import {campaignScenario,SCENARIOS,CITY,CITY_LINKS,FOREST,CULTISTS,MADNESS,WOODS_LINKS} from './campaign-data.js';

export const campaignMethods = {
 chapter() {return this.chapterInfo().chapter;},
 chapterInfo() {return campaignScenario(this.s).scenario;},
 campaignInfo() {return campaignScenario(this.s).campaign;},
 nextScenarioInfo() {
  const {campaign,scenario}=campaignScenario(this.s);
  const id=campaign.transitions[scenario.id];
  return id?SCENARIOS[id]:null;
 },
 doomTotal() {return this.s.doom + this.s.enemies.reduce((sum,e)=>sum+(e.doom??0),0);},
 healthLimit() {return this.investigator().health;},
 sanityLimit() {return this.investigator().sanity-(this.s.dreams??0);},
 availableUpgrades() {return [...INVESTIGATORS[this.investigator().code].upgrades,...(Object.hasOwn(this.cards,'53002')?['53002']:[])];},
 permanentUpgrades() {return ['02158'].filter(code=>Object.hasOwn(this.cards,code));},
 enemyHealth(e) {return this.card(e.code).health+({'01121b':2,'01157':4}[e.code]??0);},
 enemyDifficulty(e,kind) {
  const c=this.card(e.code), s=this.s;
  return c[kind==='fight'?'enemy_fight':'enemy_evade']
    +(this.chapter()===3&&s.agenda===2?1:0)
    +(e.code==='01175'&&e.engaged&&this.sanityLimit()-s.horror<=4?1:0);
 },
 addLocation(id,code,links,point,revealed=false) {
  const c=this.card(code);
  this.s.locations[id]={code,name:c.name,shroud:c.shroud??0,clues:revealed?c.clues??0:0,
    links:[...links],point,revealed,fog:false,locked:false};
 },
 revealLocation(id) {
  const location=this.s.locations[id];
  if(location.revealed)return;
  location.revealed=true;
  location.clues=this.card(location.code).clues??0;
 },
 canContinueCampaign() {
  const s=this.s,o=s.outcome;
  return Boolean(o&&this.nextScenarioInfo()&&!o.killed&&!o.drivenInsane&&
   s.physicalTrauma<this.investigator().health&&s.mentalTrauma<this.investigator().sanity);
 },
 canChooseLita() {
  return this.chapter()===1&&this.canContinueCampaign()&&this.s.outcome.resolution!=='R2';
 },
 isScreamedAlly(code) {return this.s.screamedAllies?.includes(code)??false;},
 chooseLita(recruit) {
  if(!this.canChooseLita()||typeof recruit!=='boolean')throw Error('Không thể thay đổi lựa chọn Lita.');
  this.s.outcome.lita=recruit;
  this.s.campaign.history.at(-1).lita=recruit;
  this.log(recruit?'Chọn thêm Lita Chantler vào bộ bài.':'Chọn không thêm Lita Chantler vào bộ bài.','outcome');
 },
 campaignRecord(outcome) {
  const s=this.s;
  s.campaign ??= {xp:0,history:[],deck:this.investigatorDeck()};
  if(s.screamedAllies?.length)s.campaign.deck=s.campaign.deck.filter(code=>!this.isScreamedAlly(code));
  s.campaign.xp+=outcome.xp;
  s.campaign.history.push({chapter:this.chapter(),...outcome});
 },
 upgrade(add,remove) {
  const {cost,index}=this.upgradeQuote(add,remove);
  const campaign=this.s.campaign,card=this.card(add);
  if(index===null){
   campaign.deck.push(add);
   this.log('Thêm Permanent: '+card.name+' ('+cost+' XP).');
  }else{
   const old=this.card(remove);
   campaign.deck[index]=add;
   this.log('Nâng cấp: '+old.name+' → '+card.name+' ('+cost+' XP).');
  }
  campaign.xp-=cost;
 },
 upgradeQuote(add,remove) {
  if(!this.canContinueCampaign()||this.isScreamedAlly(add)||
     ![...this.availableUpgrades(),...this.permanentUpgrades()].includes(add)){
   throw Error('Nâng cấp không hợp lệ.');
  }
  return quoteDeckUpgrade(this.cards,this.investigator().code,this.s.campaign,add,remove);
 },
 nextChapter() {
  if(!this.canContinueCampaign())throw Error('Chiến dịch đã kết thúc.');
  const old=this.s, next=this.nextScenarioInfo(), chapter=next.chapter;
  const campaign=old.campaign??{xp:old.outcome.xp,history:[{chapter:1,...old.outcome}],deck:this.investigatorDeck()};
  if(next.id==='01120'&&old.outcome.lita&&!campaign.deck.includes('01117'))campaign.deck.push('01117');
  const previous=old.outcome;
  const s=this.setup(this.investigator().code,null,old.customDeck);
  if(old.screamedAllies)s.screamedAllies=old.screamedAllies;
  Object.assign(s,{chapter,campaign,admin:old.admin===true,locations:{},encounter:[],log:[],hp:old.physicalTrauma,horror:old.mentalTrauma,
    physicalTrauma:old.physicalTrauma,mentalTrauma:old.mentalTrauma,cultistDeck:[],
    ritualClues:0,dreams:0,madness:[],usedLocations:{},boss:false});
  if(old.campaignId!==undefined||old.scenarioId!==undefined){
   s.campaignId=old.campaignId??'01';
   s.scenarioId=next.id;
  }
  if(next.id==='01120'){
   const burned=previous.houseBurned;
   s.location=burned?'rivertown':'house';
   for(const [id,[code,point]] of Object.entries(CITY)){
    if(id==='house'&&burned)continue;
    const variant=['01126','01130'].includes(code)&&this.random()<0.5?String(+code+1).padStart(5,'0'):code;
    this.addLocation(id,variant,CITY_LINKS[id].filter(x=>!burned||x!=='house'),point,id===s.location);
   }
   s.cultistDeck=this.shuffle(CULTISTS.slice(0,5));
   this.fillEncounter(['chilling_cold','nightgaunts','pentagram','locked_doors'],['01135','01136']);
  }else if(next.id==='01142'){
   s.location='main';
   const woods=this.shuffle(['01150','01151','01152','01153','01154','01155']);
   for(const [id,[code,point]] of Object.entries(FOREST)){
    if(id==='ritual')continue;
    this.addLocation(id,id==='main'?code:woods.pop(),id==='main'?['wood1','wood2','wood3','wood4']:['main'],point,id==='main');
   }
   for(const [id,room] of Object.entries(s.locations)){
    if(id==='main')continue;
    for(const [other,target] of Object.entries(s.locations)){
     if(WOODS_LINKS[room.code]?.includes(target.code))room.links.push(other);
    }
   }
   const agents=['agents_of_hastur','agents_of_yog','agents_of_shub','agents_of_cthulhu'];
   this.fillEncounter(['ancient_evils','striking_fear','ghouls','pentagram',agents[Math.floor(this.random()*agents.length)]],['01158']);
   s.doom=Math.ceil((previous.gotAway?.length??0)/2);
   s.bag.push('elder_thing');
   s.lateOpening=previous.pastMidnight?2:0;
  }else throw Error('Kịch bản chưa có luật thiết lập.');
  if(previous.priestAlive)s.encounter.push('01116');
  this.shuffle(s.encounter);
  s.hand=[];
  this.prepareBonded(campaign.deck);
  const drawPile=[];
  for(const code of campaign.deck){
   if(this.card(code).permanent)this.equip(code);else drawPile.push(code);
  }
  s.deck=this.shuffle(drawPile);
  if(!this.hasOptionalRule('BoonOfDestiny'))this.drawOpening();
  s.pending={kind:'story',page:0};
  this.log('Dẫn truyện: '+this.chapterInfo().name,'debug');
  return s;
 },
 drawOpening() {
  fillOpeningHand(this.s,this.startingHandSize()+Number(Boolean(this.s.destinyCard)),code=>this.weakness(code),deck=>this.shuffle(deck));
 },
 destinyOpening(code) {
  if(code!==undefined){
   const index=this.s.deck.indexOf(code);
   if(index<0)throw Error('Lá Boon of Destiny không còn trong deck.');
   this.s.hand.push(...this.s.deck.splice(index,1));
   this.s.destinyCard=code;
   this.shuffle(this.s.deck);
   this.log('Boon of Destiny: thêm '+this.card(code).name+' vào tay bài đầu màn.','debug');
  }
  this.drawOpening();
  this.s.pending={kind:'mulligan',selected:[]};
 },
 fillEncounter(sets,extra) {
  for(const c of Object.values(this.cards)){
   if(!sets.includes(c.encounter_code)&&!extra.includes(c.code))continue;
   for(let i=0;i<c.quantity;i++)this.s.encounter.push(c.code);
  }
 },
 addRitualSite() {
  const s=this.s;
  if(s.locations.ritual)return;
  this.addLocation('ritual','01156',['main'],FOREST.ritual[1]);
  s.locations.main.links.push('ritual');
 },
 recordCultist(enemy) {
  const s=this.s;
  s.enemies=s.enemies.filter(e=>e.id!==enemy.id);
  if(!s.victory.includes(enemy.code))s.victory.push(enemy.code);
  this.log('Đã bắt: '+this.card(enemy.code).name);
  if(this.chapter()===2&&CULTISTS.every(c=>s.victory.includes(c)))this.finish('R1');
 },
 campaignOutcome(resolution,xp) {
  const s=this.s,chapter=this.chapter();
  const prior=s.campaign?.history.at(-1);
  const outcome={resolution,xp,priestAlive:Boolean(prior?.priestAlive&&!s.victory.includes('01116')),
    lita:s.campaign?.deck.includes('01117')??false,houseBurned:prior?.houseBurned??false};
  if(chapter===2){
   outcome.caught=CULTISTS.filter(c=>s.victory.includes(c));
   outcome.gotAway=CULTISTS.filter(c=>!outcome.caught.includes(c));
   outcome.pastMidnight=resolution==='R2';
  }else{
   if(resolution==='R1'){s.mentalTrauma+=2;outcome.xp+=5;}
   if(resolution==='R2'){s.mentalTrauma+=2;s.physicalTrauma+=2;outcome.xp+=10;}
   if(resolution==='R3'){
    s.mentalTrauma+=2;s.physicalTrauma+=2;
    const weakness=MADNESS[Math.floor(this.random()*MADNESS.length)];
    s.campaign.deck.push(weakness);outcome.weakness=weakness;
   }
   outcome.killed=!['R1','R2','R3'].includes(resolution);
   outcome.result=['R1','R2'].includes(resolution)?'win':resolution==='R3'?'survived':'loss';
  }
  return {...outcome,mentalTrauma:s.mentalTrauma,physicalTrauma:s.physicalTrauma};
 }
};
