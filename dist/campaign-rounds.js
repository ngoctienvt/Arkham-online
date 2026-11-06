export const campaignRoundMethods = {
 engageEnemy(enemy) {
  if(enemy.engaged)return;
  enemy.engaged=true;
  if(enemy.code==='01181')this.push({type:'injury',h:1});
 },
 campaignArrival() {
  const s=this.s,code=this.here().code;
  if(code==='01133')this.push({type:'test',skill:'willpower',difficulty:3,testKind:'graveyard',label:'Graveyard'});
  if(code==='01150')this.push({type:'test',skill:'willpower',difficulty:4,testKind:'woodsEntry',label:'Unhallowed Ground'});
  if(this.chapter()===3&&s.location==='ritual'&&s.act===2&&!s.boss){
   s.act=3;
   this.mixEncounter();
   this.push({type:'spawnDrawn',location:'ritual'});
   this.log('Act 3 · Đã đến Ritual Site. Dùng manh mối để phá nghi lễ.');
  }
 },
 advanceForest(force=false) {
  const s=this.s;
  if(s.act!==1||(!force&&!this.canSpendClues(3)))throw Error('Cần 3 manh mối để mở Ritual Site.');
  if(!force)s.clues-=3;
  s.act=2;
  this.addRitualSite();
  for(const code of s.campaign.history.at(-1).gotAway??[])this.spawn(code,'main');
  this.log('Act 2 · Ritual Site xuất hiện. Những giáo phái trốn thoát tập hợp trên Main Path.');
 },
 advanceCampaignAgenda(old) {
  const s=this.s;
  if(this.chapter()===2){
   if(old===1)this.spawn('01121b');
   else this.finish('R2');
   return;
  }
  if(old===1){
   this.mixEncounter();
   this.push({type:'spawnDrawn',trait:'Monster',location:'main',doom:1});
  }else if(old===2){
   this.push({type:'test',skill:'willpower',difficulty:6,testKind:'madness',label:'The Ritual Begins'});
  }else{
   this.addRitualSite();
   for(const e of s.enemies.filter(e=>e.location==='ritual'))s.encDiscard.push(e.code);
   s.enemies=s.enemies.filter(e=>e.location!=='ritual');
   s.boss=true;s.act=4;
   this.spawn('01157','ritual');
   this.log('Umôrdhoth đã xuất hiện. Đánh bại nó hoặc giao Lita nếu cô đang đồng hành.');
  }
 },
 campaignRoundEnd() {
  const s=this.s;
  for(const e of s.enemies)if(e.code==='01179')e.damage=Math.max(0,e.damage-2);
  if(s.locations.ritual?.revealed)s.locations.ritual.clues=Math.max(2,s.locations.ritual.clues);
 },
 campaignToken(token,side) {
  const s=this.s,hard=this.hardDifficulty();
  if(this.chapter()===1){
   const ghouls=s.enemies.filter(e=>e.location===s.location&&this.card(e.code).traits?.includes('Ghoul')).length;
   if(token==='skull')return hard?-2:-ghouls;
   if(token==='cultist')return hard?0:-1;
   if(token==='tablet'){
    if(ghouls)side.push({type:'injury',d:1,h:Number(hard)});
    return hard?-4:-2;
   }
  }
  if(token==='skull'){
   if(this.chapter()===2)return hard?-this.doomTotal():-Math.max(0,...s.enemies.filter(e=>this.isCultist(e)).map(e=>e.doom??0));
   return hard?-3:-s.enemies.filter(e=>this.isMonster(e)).length;
  }
  if(token==='cultist'){
   if(this.chapter()===2&&hard){
    for(const e of s.enemies.filter(e=>this.isCultist(e)))side.push({type:'enemyDoom',id:e.id,amount:1});
   }else side.push({type:'doomNearest',amount:hard?2:1,cultistOnly:this.chapter()===2});
   return hard&&this.chapter()===3?-4:-2;
  }
  if(token==='tablet'){
   if(this.chapter()===3&&s.enemies.some(e=>e.location===s.location&&this.isMonster(e))){
    side.push(hard?{type:'injury',d:1,h:1}:{type:'injury',d:1});
   }
   return hard?(this.chapter()===2?-4:-5):-3;
  }
  return token==='elder_thing'?(hard?-7:-5):Number(token);
 },
 drawsExtraToken(token) {
  if(token==='elder_thing')return this.s.enemies.some(e=>this.card(e.code).traits?.includes('Ancient One'));
  if(token!=='cultist'||!this.hardDifficulty())return false;
  return this.chapter()===1||(this.chapter()===2&&!this.s.enemies.some(e=>this.isCultist(e)));
 }
};
