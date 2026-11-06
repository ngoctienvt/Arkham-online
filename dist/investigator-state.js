import {INVESTIGATORS} from './rules-data.js';

// Fields owned by a single investigator. Board locations, enemies, phase and
// the effect queue stay in the shared snapshot.
const investigatorFields=[
 'investigator','location','actions','hp','horror','resources','clues',
 'deck','hand','discard','assets','bonded','customDeck','fear','fearUsed','voices',
 'cover','coverActive','coverInPlay','rolandUsed','leoUsed','skidsUsed','hermesUsed',
 'onTheLam','hospitalDebts','debtPaidThisRound','mentalTrauma','physicalTrauma','athenaOffered',
 'ritualClues','dreams','madness','lateOpening','destinyCard','osirisUsed','osirisProtected'
];

export function investigatorDeck(seat){
 const {deck,signature,weakness}=INVESTIGATORS[seat.investigator??'01001'];
 return [...(seat.customDeck??[...deck,...deck]),signature,weakness,'01097'];
}

export function prepareBondedCards(seat,deck,card){
 delete seat.bonded;
 for(const parent of new Set(deck)){
  for(const [code,count] of Object.entries(card(parent).bondedWith??{})){
   (seat.bonded??={})[code]=count;
  }
 }
}

export function fillOpeningHand(seat,size,isWeakness,shuffle,returned=[]){
 const skipped=[];
 while(seat.hand.length<size&&seat.deck.length){
  const code=seat.deck.pop();
  if(isWeakness(code))skipped.push(code);
  else seat.hand.push(code);
 }
 seat.deck.push(...returned,...skipped);
 shuffle(seat.deck);
}

export function mulliganOpeningHand(seat,indices,size,isWeakness,shuffle){
 if(!Array.isArray(indices))throw Error('Bài đổi không hợp lệ.');
 const unique=[...new Set(indices)];
 if(unique.some(index=>!Number.isInteger(index)||index<0||index>=seat.hand.length)){
  throw Error('Bài đổi không hợp lệ.');
 }
 const returned=unique.sort((a,b)=>b-a).map(index=>seat.hand.splice(index,1)[0]);
 fillOpeningHand(seat,size,isWeakness,shuffle,returned);
}

export function separateInvestigatorState(state){
 const board={...state};
 const investigator={};
 for(const field of investigatorFields){
  if(!Object.hasOwn(board,field))continue;
  investigator[field]=board[field];
  delete board[field];
 }
 // Replay fingerprints from earlier versions depend on key order.
 const order=Object.keys(state).filter(key=>state[key]!==undefined);
 return {board,investigators:{'seat-1':investigator},order};
}

export function restoreInvestigatorState(snapshot){
 const {board,investigators,order}=snapshot??{};
 const investigator=investigators?.['seat-1'];
 if(!board||typeof board!=='object'||Array.isArray(board)||
    !investigator||typeof investigator!=='object'||Array.isArray(investigator)||
    Object.keys(investigators).length!==1||
    Object.keys(investigator).some(field=>!investigatorFields.includes(field))||
    investigatorFields.some(field=>Object.hasOwn(board,field))){
  throw Error('Cấu trúc ghế trong bản lưu không hợp lệ.');
 }
 const fields={...board,...investigator};
 if(!Array.isArray(order)||order.length!==Object.keys(fields).length||
    new Set(order).size!==order.length||order.some(key=>!Object.hasOwn(fields,key))){
  throw Error('Thứ tự trường trong bản lưu không hợp lệ.');
 }
 return Object.fromEntries(order.map(key=>[key,fields[key]]));
}
