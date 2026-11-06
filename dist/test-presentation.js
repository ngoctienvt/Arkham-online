import {SKILLS} from './rules-data.js';
import {command,esc,img,inspect,skillIcon} from './ui-utils.js';

const tokenIcons={skull:'☠',cultist:'✦',tablet:'▥',auto_fail:'✹',elder_sign:'✧',elder_thing:'◉'};
const tokenNames={skull:'Đầu lâu',cultist:'Giáo phái',tablet:'Bia đá',auto_fail:'Tự động thất bại',elder_sign:'Elder Sign',elder_thing:'Elder Thing'};

export function fastButtons(engine,pending) {
 return engine.fastOptions(pending).map(option=>
  `<button ${option.boost?command('boost'):command('fast',option.args)}>${esc(option.label)}</button>`
 ).join('');
}
export function skillTestView(engine,pending) {
 const resolved=pending.kind==='result';
 const test=resolved?pending.result:pending;
 const {skill,testKind,committed,difficulty}=test;
 const source=engine.testSource(test);
 const card=engine.card(source);
 const contribution=committed.reduce((sum,code)=>sum+engine.icons(code,skill),0);
 const bonus=(resolved?test.bonus??0:engine.testBonus(test))+(test.boost??0);
 const value=resolved?test.base-contribution-bonus:engine.skill(skill,testKind);
 const score=value+contribution+bonus;
 const artButton=(code,label,attributes)=>`<button class="test-card-art" ${attributes}>${img(code,engine.card(code).name)}<span>${esc(label)}</span></button>`;
 const committedCards=committed.map(code=>artButton(code,'Đã góp · +'+engine.icons(code,skill),inspect(code,engine.card(code).name))).join('');
 const available=resolved||test.commitClosed?'':engine.s.hand.map((code,index)=>{
  const amount=engine.icons(code,skill);
  if(!amount)return '';
  const disabled=['01089','01090','01091','01092','01093'].includes(code)&&committed.includes(code);
  return artButton(code,'Góp · +'+amount,command('commit',{index})+(disabled?' disabled':''));
 }).join('');
 const autoFail=test.token==='auto_fail';
 const tokens=resolved?(test.tokens??[test.token]).map(token=>
  `<span class="test-chaos-token" title="${esc(tokenNames[token]??token)}">${tokenIcons[token]??esc(token)}</span>`).join(''):'';
 const modifier=test.modifier>=0?'+'+test.modifier:String(test.modifier);
 const outcome=resolved?`<div class="test-outcome ${test.success?'success':'failure'}" role="status">
  <div class="test-chaos">${tokens}</div><strong>${test.success?'Thành công':'Thất bại'}</strong>
  <p>${autoFail?'Token tự động thất bại.':`${score} ${modifier} từ token = ${test.total} · cần ${difficulty}`}</p></div>`:'';
 return `<div class="skill-workbench"><span class="eyebrow">${resolved?'KẾT QUẢ':'CHUẨN BỊ'} · ${esc(SKILLS[skill])}</span>
  <h2>${esc(test.label)}</h2><div class="test-stage">
   <div class="test-subjects">${artButton(source,card.name,inspect(source,card.name))}
    ${test.toolCode?artButton(test.toolCode,engine.card(test.toolCode).name,inspect(test.toolCode,engine.card(test.toolCode).name)):''}</div>
   <div class="test-readout"><div class="test-score"><div>${skillIcon(skill)} <b>${score}</b><small>Điểm trước token</small></div>
    <div><b>${difficulty}</b><small>Độ khó</small></div></div>
    <p class="test-breakdown">Kỹ năng ${value} · Bài góp +${contribution} · Thưởng +${bonus}</p>${outcome}</div></div>
  ${committedCards?`<div class="test-card-row">${committedCards}</div>`:''}
  ${resolved?'':`<p class="test-hint">${test.commitClosed?'Đã qua bước góp bài.':available?'Chọn lá để góp vào lần kiểm tra.':'Không có lá phù hợp để góp.'}</p><div class="test-card-row">${available}</div>`}
  ${resolved?'':`<div class="actions">${fastButtons(engine,pending)}</div>`}
  ${!resolved&&engine.s.sandbox?`<div class="actions">${[...new Set(engine.s.bag)].map(token=>`<button ${command('reveal',{token})}>Ép ${esc(token)}</button>`).join('')}</div>`:''}
  <div class="actions"><button class="primary" ${command(resolved?'continue':'reveal')}>${resolved?'Áp dụng kết quả':'Rút token hỗn mang'} →</button></div></div>`;
}

export function testFeedback(before,after,engine) {
 const effects=[];
 if(after.clues>before.clues)effects.push({kind:'clue',icon:'◇',label:`+${after.clues-before.clues} manh mối`,room:before.location});
 if(after.cover<before.cover&&before.location===after.location)
  effects.push({kind:'clue',icon:'◇',label:`Cover Up · −${before.cover-after.cover} manh mối`,room:before.location});
 for(const enemy of before.enemies) {
  const current=after.enemies.find(e=>e.id===enemy.id);
  const test=before.pending?.result;
  const evaded=(!enemy.exhausted&&current?.exhausted&&enemy.engaged&&!current.engaged)||
   (!current&&test?.testKind==='evade'&&test.success&&test.target===enemy.id);
  if(evaded) {
   effects.push({kind:'evade',icon:'➶',label:'Né thành công',room:enemy.location,enemy:true});
   continue;
  }
  const damage=current?current.damage-enemy.damage:engine.enemyHealth(enemy)-enemy.damage;
  const defeatedByTest=!current&&test?.testKind==='fight'&&test.success&&test.target===enemy.id;
  if(damage>0&&(current||defeatedByTest))
   effects.push({kind:'fight',icon:'⚔',label:`−${damage} máu${current?'':' · Hạ gục'}`,room:enemy.location,enemy:true});
 }
 return effects;
}

export function animateTestFeedback(app,effects) {
 for(const [index,effect] of effects.entries()) {
  const marker=[...app.querySelectorAll('.world-label')].find(label=>label.dataset.mapRoom===effect.room);
  const room=marker?.closest('.world-location');
  const actor=room?.querySelector(effect.enemy?'.world-figure.enemy':'.world-figure.investigator');
  const rect=(actor??marker)?.getBoundingClientRect();
  const visible=rect&&rect.top>=60&&rect.bottom<window.innerHeight-80;
  const flash=document.createElement('div');
  flash.className='test-feedback feedback-'+effect.kind;
  flash.style.left=visible?`${Math.max(90,Math.min(window.innerWidth-90,rect.left+rect.width/2))}px`:'50%';
  flash.style.top=visible?`${rect.top-index*34}px`:`calc(50% + ${index*34}px)`;
  flash.setAttribute('role','status');
  flash.textContent=effect.icon+' '+effect.label;
  app.append(flash);
  if(visible&&actor) {
   actor.classList.add('actor-fx-'+effect.kind);
   actor.addEventListener('animationend',()=>actor.classList.remove('actor-fx-'+effect.kind),{once:true});
  }
  if(visible&&effect.kind==='evade') {
   const investigator=room.querySelector('.world-figure.investigator');
   investigator?.classList.add('actor-fx-dodge');
   investigator?.addEventListener('animationend',()=>investigator.classList.remove('actor-fx-dodge'),{once:true});
  }
  setTimeout(()=>flash.remove(),1750);
 }
}
