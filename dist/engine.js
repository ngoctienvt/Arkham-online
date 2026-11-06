import {INVESTIGATORS,LOCATIONS} from './rules-data.js';
import {campaignRoundMethods} from './campaign-rounds.js';
import {campaignMethods} from './campaign.js';
import {campaignEncounterMethods} from './campaign-encounters.js';
import {campaignActionMethods} from './campaign-actions.js';
import {MADNESS,notzBags} from './campaign-data.js';
import {scenarioMethods} from './scenario.js';
import {actionMethods} from './actions.js';
import {skillMethods} from './skill-tests.js';
import {effectMethods} from './effects.js';
import {validateStartingDeck} from './deck-library.js';
import {applySandboxEdit} from './sandbox.js';
import {bondedCardMethods} from './bonded-cards.js';
import {commandActor,authorizeCommandActor} from './command-actor.js';
import {timingMethods} from './timing-rules.js';
import {investigatorDeck,mulliganOpeningHand} from './investigator-state.js';
import {optionalRules,optionalRulesVersion,validOptionalRules} from './optional-rules.js';

export class Engine {
 constructor(cards,state=null,random=null,seed=null) {this.cards=cards;this.random=random??(()=>this.nextRandom());this.s=state??this.setup('01001',seed);
  this.s.rngState??=this.randomSeed();
  if(state)for(const room of Object.values(state.locations))if(!room.revealed)room.clues=0;}
 randomSeed() {return Math.floor(Math.random()*0x100000000);}
 nextRandom() {
  const next=(Math.imul(this.s.rngState,1664525)+1013904223)>>>0;
  this.s.rngState=next;
  return next/0x100000000;
 }
 investigator() {return this.card(this.s.investigator??'01001');}
 investigatorDeck() {return investigatorDeck(this.s);}
 setupCampaign() {this.s.pending={kind:'investigator'};}
 difficulty() {return this.s.difficulty??'Standard';}
 storyLanguage() {return this.s.storyLanguage??'vi';}
 selectStoryLanguage(language) {
  if(this.s.pending?.kind!=='investigator'||!['vi','en'].includes(language))throw Error('Ngôn ngữ dẫn truyện không hợp lệ.');
  if(language==='vi')delete this.s.storyLanguage;
  else this.s.storyLanguage=language;
 }
 hardDifficulty() {return ['Hard','Expert'].includes(this.difficulty());}
 hasOptionalRule(id) {return this.s.optionalRules?.active.includes(id)??false;}
 startingBag(difficulty=this.difficulty()) {
  const bag=notzBags[difficulty].filter(token=>token!=='elder_sign'||!this.hasOptionalRule('UltimatumOfBrokenPromises'));
  if(this.hasOptionalRule('UltimatumOfFailure'))bag.push('auto_fail');
  return bag;
 }
 startingHandSize() {return 5+Number(this.hasOptionalRule('BoonOfThoth'))-Number(this.hasOptionalRule('UltimatumOfForbiddenKnowledge'));}
 startingResources() {return 5+2*Number(this.hasOptionalRule('BoonOfHades'))-2*Number(this.hasOptionalRule('UltimatumOfHardship'));}
 toggleOptionalRule(rule) {
  if(this.s.pending?.kind!=='investigator'||!Object.hasOwn(optionalRules,rule)){
   throw Error('Không thể đổi luật tùy chọn ở bước này.');
  }
  const active=new Set(this.s.optionalRules?.active);
  if(active.has(rule))active.delete(rule);else active.add(rule);
  if(active.size)this.s.optionalRules={version:optionalRulesVersion,active:[...active].sort()};
  else delete this.s.optionalRules;
  this.s.bag=this.startingBag();
 }
 selectDifficulty(difficulty) {
  if(this.s.pending?.kind!=='investigator'||!Object.hasOwn(notzBags,difficulty)){
   throw Error('Độ khó không hợp lệ ở bước này.');
  }
  this.s.difficulty=difficulty;
  this.s.bag=this.startingBag(difficulty);
 }
 selectInvestigator(code,deck) {
  if(this.s.pending?.kind!=='investigator'||!Object.hasOwn(INVESTIGATORS,code))throw Error('Điều tra viên không hợp lệ.');
  const customDeck=deck===undefined?undefined:validateStartingDeck(this.cards,code,deck);
  this.setup(code,null,customDeck);
  this.s.pending={kind:'story',page:0};
  this.log('Chọn điều tra viên: '+this.investigator().name,'debug');
 }
 continueStory() {
  const p=this.s.pending;
  if(p?.kind!=='story')throw Error('Không có phần dẫn truyện đang chờ.');
  if(this.chapter()===1&&p.page===0)p.page++;
  else if(this.hasOptionalRule('BoonOfDestiny')){
   if(!this.s.deck.length){this.destinyOpening();return;}
   const codes=[...new Set(this.s.deck)].sort();
   this.choice('Boon of Destiny: chọn một lá trước khi rút tay bài đầu màn.',[
    {label:'Bỏ qua',ops:[{type:'destinyOpening'}]},
    ...codes.map(code=>({label:this.card(code).name,ops:[{type:'destinyOpening',code}]}))
   ]);
  }else this.s.pending={kind:'mulligan',selected:[]};
 }
 shuffle(a) {for(let i=a.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
 setup(investigator='01001',seed=null,customDeck) {
  const sandboxMode=this.s?.sandbox===true;
  const difficulty=this.s?.difficulty;
  const rules=this.s?.optionalRules;
  const storyLanguage=this.s?.storyLanguage;
  const s={version:1,investigator,round:1,phase:'setup',rngState:seed??this.s?.rngState??this.randomSeed(),actions:3,act:1,agenda:1,doom:0,location:'study',
   hp:0,horror:0,resources:5,clues:0,deck:[],hand:[],discard:[],assets:[],enemies:[],encounter:[],encDiscard:[],
   locations:{study:{...LOCATIONS.study,revealed:true,fog:false}},queue:[],pending:null,log:[],serial:0,
   fear:0,fearUsed:false,voices:0,cover:0,coverActive:false,rolandUsed:false,litaAvailable:false,
   victory:[],outcome:null,bag:[],lastEncounter:null,lastTest:null,mentalTrauma:0,physicalTrauma:0};
  this.s=s;
  if(rules!==undefined)s.optionalRules=rules;
  if(storyLanguage!==undefined)s.storyLanguage=storyLanguage;
  s.resources=this.startingResources();
  if(difficulty!==undefined)s.difficulty=difficulty;
  s.bag=this.startingBag();
  if(customDeck!==undefined)s.customDeck=customDeck;
  if(sandboxMode)s.sandbox=true;
  const deck=this.investigatorDeck();
  this.prepareBonded(deck);
  s.deck=this.shuffle(deck);
  if(!this.hasOptionalRule('BoonOfDestiny'))this.drawOpening();
  for(const c of Object.values(this.cards))if(['rats','ghouls','striking_fear','ancient_evils','chilling_cold'].includes(c.encounter_code)||['01118','01119'].includes(c.code))
   for(let i=0;i<c.quantity;i++)s.encounter.push(c.code);
  this.shuffle(s.encounter);
  s.pending={kind:'mulligan',selected:[]};
  this.log('Bạn bị nhốt trong Study. Tìm 2 manh mối để mở đường thoát.');return s;
 }
 weakness(c) {return ['01007','01011','01097',...MADNESS].includes(c);}
 log(message,type='info') {this.s.log.push({round:this.s.round,phase:this.s.phase,step:this.s.phaseStep,message,type});if(this.s.log.length>700)this.s.log.shift();}
 card(code) {if(!this.cards[code])throw Error('Không có dữ liệu lá bài: '+code);return this.cards[code];}
 asset(code) {return this.s.assets.find(a=>a.code===code);}
 engaged() {return this.s.enemies.filter(e=>e.engaged&&!e.exhausted);}
 here() {return this.s.locations[this.s.location];}
 push(...ops) {this.s.queue.unshift(...ops);}
 choice(title,options,story) {this.s.pending={kind:'choice',title,options,story};}
 run() {
  let guard=0;
  while(this.s.queue.length&&!this.s.pending&&!this.s.outcome){
   if(++guard>500)throw Error('Vòng xử lý vượt giới hạn.');
   const op=this.s.queue.shift();this.effect(op);
  }
 }
 commandActor(type) {return commandActor(this.s,type);}
 command(type,arg={},actor) {
  authorizeCommandActor(this.s,type,actor);
  const before=structuredClone(this.s);
  try{return this.applyCommand(type,arg);}catch(error){this.s=before;throw error;}
 }
 applyCommand(type,arg={}) {
  if(type==='nextChapter'){this.nextChapter();this.validate();return this.s;}
  if(type==='chooseLita'){this.chooseLita(arg.recruit);return this.s;}
  if(type==='upgrade'){this.upgrade(arg.add,arg.remove);return this.s;}
  if(this.s.outcome&&type!=='noop')throw Error('Ván chơi đã kết thúc.');
  this.log('Thao tác: '+type+(Object.keys(arg).length?' '+JSON.stringify(arg):''),'debug');
  if(type==='sandboxEdit')applySandboxEdit(this,arg);
  else if(type==='adminToggle')this.s.admin=!this.s.admin;
  else if(type==='adminAdvance'){
   if(!this.s.admin||this.s.pending||this.s.phase!=='investigation'||this.s.boss)throw Error('Chỉ dùng Admin trong lượt điều tra khi không có lựa chọn đang chờ.');
   this.log('Admin: ép tiến '+arg.track,'debug');
   if(arg.track==='act')this.advanceAct(true);
   else if(arg.track==='agenda')this.checkAgenda(true);
   else throw Error('Mục tiêu tiến không hợp lệ.');
  }else if(type==='resolveEncounter'){
   const p=this.s.pending;
   if(p?.kind!=='encounter')throw Error('Chưa rút lá Encounter.');
   this.s.pending=null;this.resolveEncounter(p.code);
  }else if(type==='toggleOptionalRule')this.toggleOptionalRule(arg.rule);
  else if(type==='selectStoryLanguage')this.selectStoryLanguage(arg.language);
  else if(type==='selectDifficulty')this.selectDifficulty(arg.difficulty);
  else if(type==='selectInvestigator')this.selectInvestigator(arg.code,arg.deck);
  else if(type==='continueStory')this.continueStory();
  else if(type==='mulligan')this.mulligan(arg.indices??[]);
  else if(type==='choose'){
   if(this.s.pending?.kind!=='choice')throw Error('Không có lựa chọn đang chờ.');
   const option=Number.isInteger(arg.index)&&this.s.pending.options[arg.index];
   if(!option)throw Error('Lựa chọn không hợp lệ.');
   this.s.pending=null;this.log('Chọn: '+option.label);this.push(...option.ops);
  }else if(type==='fast')this.playFast(arg);
  else if(type==='closeWindow'){
   if(this.s.pending?.kind!=='window')throw Error('Chưa có cửa sổ đang chờ.');
   this.s.pending=null;
  }else if(type==='commit')this.commit(arg.index);
  else if(type==='boost')this.boost();
  else if(type==='reveal')this.reveal(arg.token);
  else if(type==='continue'){
   if(this.s.pending?.kind!=='result')throw Error('Chưa có kết quả kiểm tra.');this.s.pending=null;
  }else if(type==='action'){
   if(this.s.pending)throw Error('Hãy hoàn tất lựa chọn đang chờ.');
   if(this.s.phase!=='investigation')throw Error('Chưa đến lượt điều tra.');
   this.action(arg);
  }else if(type!=='noop')throw Error('Thao tác không hợp lệ.');
  this.run();this.validate();return this.s;
 }
 offerTurnStart() {
  const s=this.s;
  if((s.hand.includes('01010')||s.discard[this.childEvent()]==='01010')&&
     !s.voices&&s.resources>=this.playCost('01010')){
   this.push({type:'window',duringTurn:true,turnStart:true});
  }
 }
 mulligan(indices) {
  if(this.s.pending?.kind!=='mulligan')throw Error('Đã qua bước đổi bài.');
  if(this.s.destinyCard&&Array.isArray(indices)&&indices.includes(0))throw Error('Không thể đổi lá đã chọn bằng Boon of Destiny.');
  const handSize=this.s.optionalRules?this.s.hand.length:5;
  mulliganOpeningHand(this.s,indices,handSize,code=>this.weakness(code),deck=>this.shuffle(deck));
  this.s.pending=null;this.s.phase='investigation';this.s.phaseStep='investigator-turn';
  for(let n=0;n<(this.s.lateOpening??0);n++)this.discardRandom();
  if(this.s.lateOpening)this.log('Quá nửa đêm: bỏ 2 lá ngẫu nhiên sau khi đổi bài.');
  this.s.lateOpening=0;
  const destinyCard=this.s.destinyCard;
  delete this.s.destinyCard;
  if(destinyCard&&this.s.hand[0]===destinyCard&&this.weakness(destinyCard)){
   this.s.hand.shift();
   this.revealWeakness(destinyCard);
  }
  if(this.hasOptionalRule('UltimatumOfDread'))this.push({type:'mythos',firstRound:true});
  else this.offerTurnStart();
  this.log('Bắt đầu vòng 1. '+this.investigator().name+' có 3 action, '+this.s.resources+' resource và '+this.s.hand.length+' lá bài.');
 }
 drawPlayer(count=1) {
  const drawn=[];
  let reshuffled=false;
  while(drawn.length<count){
   if(!this.s.deck.length){
    if(!this.s.discard.length){this.log('Không còn bài để rút.');break;}
    this.s.deck=this.shuffle(this.s.discard.splice(0));reshuffled=true;
    this.log('Hết chồng bài: xào lại discard pile và nhận 1 horror sau khi rút.');
   }
   drawn.push(this.s.deck.pop());
  }
  const after=[];
  for(const code of drawn){
   this.log('Rút: '+this.card(code).name);
   if(this.weakness(code))after.push({type:'revealWeakness',code});else this.s.hand.push(code);
  }
  if(reshuffled)after.push({type:'injury',h:1});
  this.push(...after);
 }
 revealWeakness(code) {
  if(code==='01007'){this.s.cover=3;this.s.coverActive=true;this.s.coverInPlay=true;this.log('Cover Up vào Threat Area với 3 manh mối.');}
  else if(code==='01011'){this.s.hospitalDebts=0;this.log('Hospital Debts vào Threat Area.');}
  else if(code==='01097'){this.s.resources=0;this.s.discard.push(code);this.log('Paranoia: mất toàn bộ resource.');}
  else (this.s.madness??=[]).push(code);
 }
 validate() {
  this.chapterInfo();
  if(!['vi','en'].includes(this.storyLanguage()))throw Error('Ngôn ngữ dẫn truyện không hợp lệ.');
  if(!validOptionalRules(this.s.optionalRules))throw Error('Luật tùy chọn trong bản lưu không hợp lệ.');
  if(!Object.hasOwn(notzBags,this.difficulty()))throw Error('Độ khó trong bản lưu không hợp lệ.');
  for(const field of ['hp','horror','resources','clues','actions','doom'])if(!Number.isFinite(this.s[field])||this.s[field]<0)throw Error('Trạng thái không hợp lệ: '+field);
  if(!this.s.locations[this.s.location])throw Error('Vị trí không tồn tại.');
 }
}
Object.assign(Engine.prototype,scenarioMethods,actionMethods,skillMethods,effectMethods,campaignMethods,campaignEncounterMethods,campaignActionMethods,campaignRoundMethods,bondedCardMethods,timingMethods);
