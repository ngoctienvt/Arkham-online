const timingRules={
 'when:enemy-attacks':[
  {kind:'reaction',eligible:engine=>(engine.s.hand.includes('01023')||engine.childCanPlay('01023'))&&
   !engine.s.voices&&engine.s.resources>=engine.playCost('01023'),
   title:'Dodge: hủy đòn tấn công này?',
   choices:(engine,event)=>[
    ...(engine.s.hand.includes('01023')?[{label:'Chơi Dodge',ops:[{type:'dodgeAttack',...event}]}]:[]),
    ...(engine.childCanPlay('01023')?[{label:'Boon of the Child · Dodge',ops:[{type:'dodgeAttack',...event,child:true}]}]:[])
   ],
   pass:event=>[{type:'performAttack',...event}]},
  {kind:'reaction',eligible:engine=>engine.s.phase==='enemy',
   title:'Survival Knife: đánh trước khi kẻ địch tấn công?',
   choices:(engine,event)=>engine.s.assets.filter(asset=>asset.code==='53002'&&!asset.exhausted)
    .map(asset=>({label:'Dùng Survival Knife · '+asset.id,
     ops:[{type:'knifeInterrupt',...event,asset:asset.id}]})),
   pass:event=>[{type:'performAttack',...event}]}
 ],
 'after:asset-enters-play':[
  {kind:'forced',eligible:(engine,event)=>Boolean(engine.card(event.code).bondedWith),
   ops:event=>[{type:'releaseBonded',code:event.code}]}
 ],
 'after:enemy-defeated':[
  {kind:'forced',eligible:(_,event)=>event.code==='01180',ops:()=>[{type:'injury',h:1}]},
  {kind:'reaction',eligible:engine=>engine.investigator().code==='01001'&&!engine.s.rolandUsed&&
   engine.here().clues>0&&engine.canSpendClues(0),
   title:'Roland Banks: tìm 1 manh mối sau khi hạ kẻ địch? (1 lần/vòng)',
   label:'Dùng khả năng Roland',ops:()=>[{type:'roland'}],resume:{type:'rolandReaction'}},
  {kind:'reaction',eligible:engine=>(engine.s.hand.includes('01022')||engine.childCanPlay('01022'))&&
   !engine.s.voices&&engine.s.resources>=engine.playCost('01022')&&engine.here().clues>0&&engine.canSpendClues(0),
   title:'Evidence!: tìm 1 manh mối sau khi hạ kẻ địch?',
   choices:engine=>[
    ...(engine.s.hand.includes('01022')?[{label:'Chơi Evidence!',ops:[{type:'evidence'}]}]:[]),
    ...(engine.childCanPlay('01022')?[{label:'Boon of the Child · Evidence!',ops:[{type:'evidence',child:true}]}]:[])
   ],repeat:true}
 ]
};

export const timingMethods={
 openTiming(point,event){
  const rules=Object.hasOwn(timingRules,point)?timingRules[point]:null;
  if(!rules)throw Error('Điểm timing không hợp lệ.');
  const forced=rules.filter(rule=>rule.kind==='forced'&&rule.eligible(this,event))
   .flatMap(rule=>rule.ops(event));
  const reactions=rules.filter(rule=>rule.kind==='reaction');
  if(forced.length){
   if(reactions.length){
    const resume=reactions.find(rule=>rule.resume)?.resume;
    forced.push(resume?{...resume}:{type:'timingReactions',point,event});
   }
   this.push(...forced);
   return true;
  }
  return reactions.length>0&&this.timingReactions(point,event);
 },
 timingReactions(point,event){
  const rules=Object.hasOwn(timingRules,point)?timingRules[point]:[];
  const available=rules.filter(rule=>rule.kind==='reaction'&&rule.eligible(this,event)).map(rule=>({
   rule,options:rule.choices?.(this,event)??[{label:rule.label,ops:rule.ops(event)}]
  })).filter(({options})=>options.length);
  if(!available.length)return false;
  const {rule}=available[0];
  const title=available.length===1?rule.title:point==='when:enemy-attacks'?
   'Chọn phản ứng trước khi đòn tấn công xử lý.':'Chọn phản ứng sau khi hạ kẻ địch.';
  const choices=available.flatMap(({rule,options})=>options.map(option=>{
   if(point!=='after:enemy-defeated'||(available.length===1&&!rule.repeat))return option;
   return {...option,ops:[...option.ops,{type:'rolandReaction'}]};
  }));
  this.choice(title,[...choices,{label:'Bỏ qua',ops:rule.pass?.(event)??[]}]);
  return true;
 }
};
