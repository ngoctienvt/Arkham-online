export const campaignActionMethods = {
 elusiveDestinations() {
  const s=this.s,taboo=this.hasOptionalRule('TabooList25');
  return Object.entries(s.locations).filter(([id,room])=>id!==s.location&&
   (taboo?this.here().links.includes(id):room.revealed)&&
   !(id==='parlor'&&s.act<3)&&!s.enemies.some(enemy=>enemy.location===id));
 },
 canPlayElusive() {return this.elusiveDestinations().length>0||this.s.enemies.some(enemy=>enemy.engaged);},
 elusive() {
  const options=this.elusiveDestinations().map(([id,room])=>({
   label:'Di chuyển đến '+room.name,ops:[{type:'elusiveMove',id}]
  }));
  if(options.length)this.choice('Elusive: chọn địa điểm không có kẻ địch.',options);
  else for(const enemy of this.s.enemies.filter(item=>item.engaged)){
   enemy.engaged=false;
   if(!enemy.exhausted&&enemy.location===this.s.location)this.engageEnemy(enemy);
  }
 },
 elusiveMove(id) {
  if(!this.elusiveDestinations().some(([destination])=>destination===id))throw Error('Địa điểm Elusive không hợp lệ.');
  for(const enemy of this.s.enemies)enemy.engaged=false;
  this.move(id);
 },
 canSpendClues(n) {
  return this.s.clues>=n&&!this.s.enemies.some(e=>e.code==='01121b'&&e.engaged);
 },
 playCost(code) {
  const card=this.card(code);
  return Math.max(0,card.cost-(this.s.location==='easttown'&&card.traits?.includes('Ally')?2:0));
 },
 campaignAction(a) {
  const s=this.s,chapter=this.chapter(),here=this.here();
  switch(a.kind){
   case 'cultist':
    if(chapter!==2||!s.cultistDeck.length||!this.canSpendClues(2))throw Error('Cần 2 manh mối và chồng Cultist còn bài.');
    this.spend('cultist');s.clues-=2;s.queue.push({type:'drawCultist'});return true;
   case 'interrogate': {
    const enemy=s.enemies.find(e=>e.id===a.target&&e.location===s.location);
    const cost={'01138':['hand',4],'01139':['clues',2],'01140':['resources',5]}[enemy?.code];
    if(!cost)throw Error('Không có khả năng Parley này.');
    const [field,count]=cost;
    if(field==='clues'?!this.canSpendClues(count):field==='hand'?s.hand.length<count:s[field]<count)
     throw Error('Không đủ chi phí Parley.');
    this.spend('parley');
    if(field==='hand')this.push({type:'parleyDiscard',id:enemy.id,remaining:count});
    else {s[field]-=count;this.recordCultist(enemy);}
    return true;
   }
   case 'disrupt':
    if(chapter!==3||s.act!==3||s.boss||!this.canSpendClues(1)||!['willpower','agility'].includes(a.skill))
     throw Error('Cần Act 3 và 1 manh mối để phá nghi lễ.');
    this.spend('disrupt');s.clues--;
    s.queue.push({type:'test',testKind:'ritual',skill:a.skill,difficulty:3,label:'Phá nghi lễ'});return true;
   case 'sacrifice':
    if(chapter!==3||!s.boss||!this.asset('01117')||!s.enemies.some(e=>e.code==='01157'&&e.location===s.location))
     throw Error('Cần Lita và Umôrdhoth cùng vị trí.');
    this.spend('sacrifice');s.queue.push({type:'finish',resolution:'R3'});return true;
   case 'unlock':
    if(!here.locked||!['combat','agility'].includes(a.skill))throw Error('Không có Locked Door.');
    this.spend('unlock');s.queue.push({type:'test',testKind:'unlock',skill:a.skill,difficulty:4,label:'Locked Door'});return true;
   case 'dreams':
    if(!s.dreams)throw Error('Không có Dreams of R’lyeh.');
    this.spend('dreams');s.queue.push({type:'test',testKind:'dreams',skill:'willpower',difficulty:3,label:'Dreams of R’lyeh'});return true;
   case 'clearMadness': {
    const index=s.madness?.indexOf(a.code)??-1;
    if(index<0||s.actions<2)throw Error('Cần 2 action để bỏ điểm yếu.');
    this.spend('clearMadness');s.actions--;
    s.queue.push({type:'clearMadness',code:a.code});return true;
   }
   case 'location':
    this.useLocation(a.stat);return true;
   case 'badge': {
    const asset=this.asset('01027');
    if(!asset)throw Error('Không có Police Badge.');
    this.discardAsset(asset.id);s.actions+=2;return true;
   }
   case 'supply': {
    const code='01026',targets=this.firearms();
    const cost=this.playCost('01026');
    const playable=a.child?this.childCanPlay(code):Number.isInteger(a.index)&&s.hand[a.index]===code;
    if(!playable||!targets.length||s.voices||s.resources<cost||!s.actions)
     throw Error('Cần Extra Ammunition, súng, 1 action và '+cost+' resource.');
    if(a.asset===undefined&&targets.length>1){
     this.choice('Extra Ammunition: chọn súng nhận thêm 3 đạn.',targets.map(target=>({
      label:this.card(target.code).name+' · '+target.uses+' đạn',
      ops:[{type:'action',args:{...a,asset:target.id}}]
     })));
     return true;
    }
    const target=a.asset===undefined?targets[0]:targets.find(x=>x.id===a.asset);
    if(!target)throw Error('Súng không hợp lệ.');
    this.spend('play');
    if(a.child)this.takeChildEvent(code);else s.hand.splice(a.index,1);
    s.resources-=cost;
    s.queue.push({type:'ammo',id:target.id},{type:'discardEvent',code,...(a.child?{bottom:true}:{})});return true;
   }
  }
  return false;
 },
 firearms() {return this.s.assets.filter(a=>this.card(a.code).traits?.includes('Firearm'));},
 useLocation(stat) {
  const s=this.s,code=this.here().code,used=s.usedLocations??={};
  const perTurn=['01124','01155'].includes(code);
  if(used[code]&&(perTurn?used[code]===s.round:code!=='01129'))throw Error('Đã dùng khả năng vị trí.');
  let ops=[];
  switch(code){
   case '01124':ops=[{type:'drawPlayer'},{type:'resource'}];break;
   case '01126':ops=[{type:'drawPlayer',count:3}];break;
   case '01127':ops=[{type:'searchDeck',trait:'Ally'}];break;
   case '01129':ops=[{type:'searchDeck',trait:'Tome|Spell',top:6}];break;
   case '01128':if(!s.hp)throw Error('Không có damage để hồi.');ops=[{type:'heal',stat:'hp',amount:3}];break;
   case '01131':if(!s.horror)throw Error('Không có horror để hồi.');ops=[{type:'heal',stat:'horror',amount:3}];break;
   case '01130':ops=Array.from({length:3},()=>({type:'resource'}));break;
   case '01134':
    if(s.resources<5)throw Error('Cần 5 resource.');
    s.resources-=5;ops=[{type:'clues',amount:2}];break;
   case '01155':
    if(!['hp','horror'].includes(stat)||!s[stat])throw Error('Không có tổn thương để hồi.');
    ops=[{type:'heal',stat}];break;
   default:throw Error('Vị trí không có hành động riêng.');
  }
  this.spend('location');used[code]=s.round;s.queue.push(...ops);
 },
 searchDeck(trait,top=this.s.deck.length) {
  const s=this.s;
  const options=s.deck.map((code,index)=>({code,index})).slice(Math.max(0,s.deck.length-top))
    .filter(({code})=>trait.split('|').some(t=>this.card(code).traits?.includes(t)));
  if(!options.length){this.shuffle(s.deck);this.log('Không tìm thấy lá phù hợp.');return;}
  this.choice('Chọn lá bài để thêm vào tay.',[
   ...options.map(({code,index})=>({label:this.card(code).name,ops:[{type:'takeDeck',index}]}))
  ]);
 },
 parleyDiscard(id,remaining) {
  const enemy=this.s.enemies.find(e=>e.id===id);
  if(!enemy)return;
  if(!remaining){this.recordCultist(enemy);return;}
  this.choice('Herman Collins · Bỏ thêm '+remaining+' lá',this.s.hand.map((code,index)=>({
   label:this.card(code).name,ops:[{type:'discardCard',index},{type:'parleyDiscard',id,remaining:remaining-1}]
  })));
 },
 campaignEffect(op) {
  const s=this.s;
  switch(op.type){
   case 'spawn':this.spawn(op.code,op.location);break;
   case 'doomNearest':this.doomNearest(op.amount,op.cultistOnly);break;
   case 'chantingSearch':this.chantingSearch();break;
   case 'drawSearchedEncounter': {
    const [code]=s[op.zone].splice(op.index,1);
    this.shuffle(s.encounter);this.previewEncounter(code);break;
   }
   case 'resolveEncounter':this.resolveEncounter(op.code);break;
   case 'drawCultist':this.spawnCampaignEnemy(s.cultistDeck.pop());break;
   case 'clues':s.clues+=op.amount;break;
   case 'lock':s.locations[op.location].locked=true;break;
   case 'enemyDoom':this.enemyDoom(s.enemies.find(e=>e.id===op.id),op.amount??1);break;
   case 'addDoom':s.doom+=op.amount;this.checkAgenda();break;
   case 'discardCard':s.discard.push(...s.hand.splice(op.index,1));break;
   case 'parleyDiscard':this.parleyDiscard(op.id,op.remaining);break;
   case 'wrath':this.wrath(op.remaining);break;
   case 'wingsMove':
    for(const e of s.enemies)if(!this.card(e.code).traits?.includes('Nightgaunt'))e.engaged=false;
    this.move(op.to);break;
   case 'searchMadness': {
    const index=s.deck.findIndex(c=>MADNESS.includes(c));
    if(index>=0)this.revealWeakness(s.deck.splice(index,1)[0]);
    this.shuffle(s.deck);break;
   }
   case 'clearMadness':s.madness.splice(s.madness.indexOf(op.code),1);s.discard.push(op.code);break;
   case 'ammo': {const target=s.assets.find(a=>a.id===op.id);if(target){target.uses+=3;this.log('Extra Ammunition: '+this.card(target.code).name+' nhận 3 đạn.');}break;}
   case 'searchDeck':this.searchDeck(op.trait,op.top);break;
   case 'takeDeck':s.hand.push(...s.deck.splice(op.index,1));this.shuffle(s.deck);break;
   case 'spawnDrawn': {
    const code=this.discardUntil(c=>c.type_code==='enemy'&&(!op.trait||c.traits?.includes(op.trait)));
    if(code){const enemy=this.spawn(code,op.location);if(op.doom)this.enemyDoom(enemy,op.doom);}
    break;
   }
   default:return false;
  }
  return true;
 }
};
