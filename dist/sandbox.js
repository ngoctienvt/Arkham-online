import {notzBags} from './campaign-data.js';
import {command,esc} from './ui-utils.js';

const playerZones=['deck','hand','discard'];
const encounterZones=['encounter','encDiscard'];
const zoneLabels={
 deck:'Deck điều tra viên',hand:'Tay bài',discard:'Bài bỏ điều tra viên',
 encounter:'Deck Encounter',encDiscard:'Bài bỏ Encounter'
};
const sandboxTokens=new Set([...Object.values(notzBags).flat(),'elder_thing']);
const sandboxPhases={enemy:'enemyPhase',upkeep:'upkeep',mythos:'mythos'};
const sandboxWindows={
 'before-enemy-attacks':{phase:'enemy',step:'hunter',next:'enemyAttacks',label:'Trước đợt tấn công Enemy'},
 'after-enemy-attacks':{phase:'enemy',step:'attacks',next:'enemyEnd',label:'Sau đợt tấn công Enemy'},
 'after-encounter':{phase:'mythos',step:'encounter',next:'begin',label:'Sau khi xử lý Encounter'}
};

export function canEditSandbox(state){
 return state.sandbox===true&&state.phase==='investigation'&&!state.pending&&!state.outcome&&!state.queue.length;
}

export function applySandboxEdit(engine,args){
 const state=engine.s;
 if(!canEditSandbox(state))throw Error('Chỉ chỉnh Sandbox giữa các hành động trong lượt điều tra.');
 if(args.kind==='move'){
  const {from,to,index}=args;
  const group=[playerZones,encounterZones].find(zones=>zones.includes(from));
  if(!group?.includes(to)||from===to||!Number.isInteger(index)||index<0||index>=state[from].length){
   throw Error('Vị trí lá hoặc vùng đích không hợp lệ.');
  }
  const [code]=state[from].splice(index,1);
  state[to].push(code);
  engine.log('Sandbox: '+code+' · '+zoneLabels[from]+' → '+zoneLabels[to],'debug');
 }else if(args.kind==='bag'){
  const tokens=args.tokens;
  if(!Array.isArray(tokens)||tokens.length<1||tokens.length>40||!tokens.every(token=>sandboxTokens.has(token))){
   throw Error('Túi cần 1–40 token hợp lệ.');
  }
  state.bag=[...tokens];
  engine.log('Sandbox: thay túi token · '+tokens.join(', '),'debug');
 }else if(args.kind==='phase'&&Object.hasOwn(sandboxPhases,args.phase)){
  engine.log('Sandbox: tiếp tục từ pha '+args.phase,'debug');
  if(args.phase==='upkeep')engine.push(...engine.upkeepSteps());
  else engine.push({type:sandboxPhases[args.phase]});
 }else if(args.kind==='window'&&Object.hasOwn(sandboxWindows,args.point)){
  const {phase,step,next}=sandboxWindows[args.point];
  state.phase=phase;
  state.phaseStep=step;
  engine.log('Sandbox: tiếp tục từ cửa sổ '+args.point,'debug');
  engine.push({type:'window',point:args.point},{type:next});
 }else throw Error('Lệnh chỉnh Sandbox không hợp lệ.');
}

export function sandboxDialog(engine){
 const state=engine.s;
 const body=canEditSandbox(state)?`
  ${[playerZones,encounterZones].map(zones=>`
   <form data-sandbox-form="move" class="actions">
    <label>Lá cần chuyển <select name="source" required>
     <option value="">Chọn lá</option>
     ${zones.map(zone=>`<optgroup label="${zoneLabels[zone]}">${state[zone].map((code,index)=>
      `<option value="${zone}:${index}">${esc(engine.card(code).name)} · ${index+1}</option>`).join('')}</optgroup>`).join('')}
    </select></label>
    <label>Đích <select name="to">${zones.map(zone=>`<option value="${zone}">${zoneLabels[zone]}</option>`).join('')}</select></label>
    <button>Chuyển lá</button>
   </form>`).join('')}
   <form data-sandbox-form="bag" class="actions">
    <label>Túi token <input name="tokens" maxlength="640" value="${esc(state.bag.join(', '))}" required></label>
    <button>Thay túi</button>
   </form>
   <p>Token hợp lệ: ${[...sandboxTokens].join(', ')}</p>
   <div class="actions">${Object.keys(sandboxPhases).map(phase=>
    `<button ${command('sandboxEdit',{kind:'phase',phase})}>Chạy pha ${phase}</button>`).join('')}</div>
   <p>Bắt đầu tại một cửa sổ Fast để kiểm tra phần xử lý sau đó.</p>
   <div class="actions">${Object.entries(sandboxWindows).map(([point,{label}])=>
    `<button ${command('sandboxEdit',{kind:'window',point})}>${label}</button>`).join('')}</div>`
  :'<p>Hoàn tất lựa chọn đang chờ và trở về lượt điều tra để chỉnh trạng thái.</p>';
 return `<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-label="Chỉnh Sandbox">
  <h2>Chỉnh Sandbox</h2><p>Lá chuyển vào deck được đặt lên trên cùng.</p>${body}
  <div class="actions"><button data-export-fixture>Xuất fixture</button><button data-import-fixture>Mở fixture</button>
   <input hidden type="file" data-fixture-file accept=".json,application/json">
   <button data-open-report>Báo lỗi</button><button data-close-inspect>Đóng</button></div>
 </section></div>`;
}
