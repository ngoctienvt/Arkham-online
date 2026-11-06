export const skillMethods={
 baseSkill(name) {return this.investigator()['skill_'+name];},
 skill(name,kind='') {
  let n=this.baseSkill(name);
  if(name==='combat')n+=this.s.assets.filter(a=>['01018','01028','01117'].includes(a.code)).length;
  n-=(this.s.madness??[]).filter(c=>c==='01098').length;
  if(name==='willpower')n+=(this.asset('01027')?1:0)-(this.s.dreams??0);
  if(name==='intellect'&&kind==='investigate')n+=this.s.assets.filter(a=>a.code==='01030').length;
  return n;
 },
 testSource(op) {
  const enemy=this.s.enemies.find(e=>e.id===op.target);
  const sources={fear:'01164',hands:'01162',remains:'01163',chill:'01167',parley:'01117',
   unlock:'01174',dreams:'01182',madness:'01144'};
  return op.sourceCode??op.encounterCode??enemy?.code??sources[op.testKind]??this.here().code;
 },
 test(op) {this.s.pending={kind:'test',...op,sourceCode:this.testSource(op),committed:[],boost:0,duringTurn:op.duringTurn??this.s.phase==='investigation'};},
 icons(code,skill) {const c=this.card(code);return(c['skill_'+skill]??0)+(c.skill_wild??0);},
 commit(index) {
  const p=this.s.pending;if(p?.kind!=='test')throw Error('Chưa có kiểm tra.');
  if(p.commitClosed)throw Error('Đã qua bước góp bài.');
  if(!Number.isInteger(index)||index<0||index>=this.s.hand.length)throw Error('Lá bài không hợp lệ.');
  const code=this.s.hand[index];if(!this.icons(code,p.skill))throw Error('Lá bài không có biểu tượng phù hợp.');
  if(['01089','01090','01091','01092','01093'].includes(code)&&p.committed.includes(code))throw Error('Chỉ được góp 1 bản của lá này mỗi kiểm tra.');
  this.s.hand.splice(index,1);p.committed.push(code);this.log('Góp bài: '+this.card(code).name);
 },
 boost() {
  const p=this.s.pending;if(p?.kind!=='test'||!this.canBoost(p.skill)||this.s.resources<1)throw Error('Không thể dùng Physical Training.');
  if(p.committed.length)p.commitClosed=true;
  this.s.resources--;p.boost++;this.log('Trả 1 resource để cộng 1 kỹ năng.');
 },
 elderSign() {return this.investigator().code==='01003'?2:this.here().clues;},
 reveal(forcedToken) {
  const p=this.s.pending;if(p?.kind!=='test')throw Error('Chưa có kiểm tra.');
  const bag=[...this.s.bag];
  if(forcedToken!==undefined&&(!this.s.sandbox||!bag.includes(forcedToken)))throw Error('Chỉ ép được token trong túi khi dùng Sandbox.');
  const index=forcedToken===undefined?Math.floor(this.random()*bag.length):bag.indexOf(forcedToken);
  const [token]=bag.splice(index,1);
  this.resolveRevealedTokens({test:p,bag,tokens:[token],side:[],modifier:0,index:0});
 },
 resolveAthena(context,cancel) {
  this.s.athenaOffered=true;
  if(cancel){
   const {bag,tokens,index}=context;
   bag.push(tokens[index]);
   tokens[index]=bag.splice(Math.floor(this.random()*bag.length),1)[0];
   this.log('Boon of Athena: hủy Auto-fail và rút lại.','debug');
  }else this.log('Boon of Athena: giữ Auto-fail.','debug');
  this.resolveRevealedTokens(context);
 },
 resolveRevealedTokens({test:p,bag,tokens,side,modifier,index}) {
  const multiplier=p.testKind==='evade'&&this.s.enemies.find(e=>e.id===p.target)?.code==='01172'?2:1;
  for(;index<tokens.length;index++){
   const face=tokens[index];
   if(face==='auto_fail'&&this.hasOptionalRule('BoonOfAthena')&&!this.s.athenaOffered){
    const context={test:p,bag,tokens,side,modifier,index};
    this.choice('Boon of Athena: hủy Auto-fail đầu tiên?',[
     {label:'Trả Auto-fail vào túi và rút lại',ops:[{type:'resolveAthena',context,cancel:true}]},
     {label:'Giữ Auto-fail',ops:[{type:'resolveAthena',context,cancel:false}]}
    ]);
    return;
   }
   const value=face==='elder_sign'?this.elderSign():face==='auto_fail'?0:this.campaignToken(face,side);
   modifier+=value<0&&face!=='elder_sign'?value*multiplier:value;
   if(bag.length&&this.drawsExtraToken(face)){
    tokens.push(bag.splice(Math.floor(this.random()*bag.length),1)[0]);
   }
  }
  this.log('Token hỗn mang: '+tokens.join(', '),'debug');
  this.s.pending=null;
  this.push(...side,{type:'scoreTest',test:p,tokens,modifier},{type:'testEnd',committed:[...p.committed]});
 },
 testBonus(test) {
  return test.toolCode==='01006'?(this.here().clues>0?3:1):test.bonus??0;
 },
 scoreTest(p,tokens,modifier) {
  const token=tokens.includes('auto_fail')?'auto_fail':tokens[0];
  if(token==='auto_fail')modifier=0;
  const enemy=this.s.enemies.find(e=>e.id===p.target);
  if(enemy&&['fight','evade'].includes(p.testKind))p.difficulty=this.enemyDifficulty(enemy,p.testKind);
  const bonus=this.testBonus(p);
  const base=this.skill(p.skill,p.testKind)+bonus+p.boost+p.committed.reduce((n,c)=>n+this.icons(c,p.skill),0);
  const total=token==='auto_fail'?0:Math.max(0,base+modifier);
  const success=token!=='auto_fail'&&total>=p.difficulty;
  const consequences=[];
  if(!success){
   const chapter=this.chapter(),hard=this.hardDifficulty();
   for(const face of tokens){
    if(chapter===1&&face==='cultist')consequences.push({type:'injury',h:hard?2:1});
    if(chapter===2&&face==='tablet')consequences.push({type:'returnClues',amount:hard?this.s.clues:1});
    if(hard&&chapter!==2&&face==='skull')consequences.push({type:'searchEncounterEnemy',trait:chapter===1?'Ghoul':'Monster'});
   }
  }
  const result={...p,retaliationQueued:true,bonus,token,tokens,modifier,base,total,success,margin:total-p.difficulty};
  this.s.lastTest=result;this.s.pending={kind:'result',result};
  this.log(`${p.label}: ${base} ${modifier>=0?'+':''}${modifier} = ${total} / ${p.difficulty} · ${token} · ${success?'THÀNH CÔNG':'THẤT BẠI'}`,'test');
  const retaliates=!success&&p.testKind==='fight'&&enemy&&this.card(enemy.code).text?.includes('Retaliate');
  this.push({type:'testOutcome',result,consequences},
   ...(retaliates?[{type:'attack',id:enemy.id,retaliate:true}]:[]));
 },
 testOutcome(r,consequences=[]) {
  if(consequences.length){
   this.orderTestEffects([
    {label:'Áp dụng hiệu ứng token',ops:consequences},
    {label:'Áp dụng kết quả kiểm tra',ops:[{type:'testOutcome',result:r}]}
   ]);
   return;
  }
  const enemy=this.s.enemies.find(e=>e.id===r.target);
  const draws=r.success?r.committed.filter(c=>['01089','01090','01091','01092'].includes(c)).length:0;
  const after=Array.from({length:draws},()=>({type:'drawPlayer'}));
  if(r.success&&r.tokens?.includes('elder_sign')&&this.investigator().code==='01003')this.s.resources+=2;
  if(r.testKind==='investigate'&&r.success){
   if(this.here().fog){this.here().fog=false;this.s.encDiscard.push('01168');}
   this.withSkillDraws('Tìm manh mối',[{type:'discover',count:1+r.committed.filter(c=>c==='01039').length}],after);
  }else if(r.testKind==='fight'&&enemy){
   if(r.success){
    const baseDamage=r.toolCode==='01020'?1+Number(enemy.engaged&&this.s.enemies.filter(e=>e.engaged).length===1):r.damage;
    const hit={type:'hitEnemy',id:enemy.id,amount:baseDamage+r.committed.filter(c=>c==='01025').length};
    if(this.asset('01117')&&this.isMonster(enemy)){
     this.choice('Lita Chantler: gây thêm 1 damage lên Monster?',[
      {label:'Gây thêm 1 damage',ops:[{type:'fightResult',hit:{...hit,amount:hit.amount+1},after}]},
      {label:'Bỏ qua',ops:[{type:'fightResult',hit,after}]}
     ]);
    }else this.withSkillDraws('Gây damage',[hit],after);
   }else if(!r.retaliationQueued&&!enemy.exhausted&&this.card(enemy.code).text?.includes('Retaliate')){
    this.push({type:'attack',id:enemy.id,retaliate:true});
   }
  }else if(r.testKind==='evade'&&r.success&&enemy)this.withSkillDraws('Né kẻ địch',[{type:'evadeEnemy',id:enemy.id}],after);
  else if(r.testKind==='parley'&&r.success)this.withSkillDraws('Thu phục Lita',[{type:'recruitLita'}],after);
  else if(r.testKind==='fear'&&r.success){this.s.fear=Math.max(0,this.s.fear-1);this.s.encDiscard.push('01164');this.push(...after);}
  else if(r.testKind==='hands'){this.s.encDiscard.push('01162');this.push({type:'injury',d:r.success?0:-r.margin,h:0},...after);}
  else if(r.testKind==='remains'){this.s.encDiscard.push('01163');this.push({type:'injury',d:0,h:r.success?0:-r.margin},...after);}
  else if(r.testKind==='chill'){
   this.s.encDiscard.push('01167');
   const targets=this.s.assets.filter(a=>!this.card(a.code).permanent);
   if(!r.success&&targets.length)this.choice('Crypt Chill: chọn asset phải bỏ.',targets.map(a=>({label:this.card(a.code).name,ops:[{type:'discardAsset',id:a.id},...after]})));
   else this.push(...(!r.success?[{type:'injury',d:2,h:0}]:[]),...after);
  }else this.withSkillDraws('Áp dụng kết quả kiểm tra',[{type:'campaignTestOutcome',result:r}],after);
 },
 withSkillDraws(label,ops,draws) {
  if(!draws.length){this.push(...ops);return;}
  this.orderTestEffects([{label,ops},...draws.map(op=>({label:'Rút 1 lá từ bài đã góp',ops:[op]}))]);
 },
 orderTestEffects(groups) {
  if(groups.length===1){this.push(...groups[0].ops);return;}
  const choices=groups.map(({label,ops},index)=>({label,ops:[...ops,
   {type:'orderTestEffects',groups:groups.filter((_,i)=>i!==index)}
  ]}));
  this.choice('Chọn hiệu ứng của kiểm tra để xử lý trước.',choices);
 }
};
