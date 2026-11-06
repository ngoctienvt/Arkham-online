import {INVESTIGATORS} from './rules-data.js';
import {MADNESS} from './campaign-data.js';
import {alternatePrintings} from './card-printings.js';

function canonicalPrinting(code){
 return typeof code==='string'&&Object.hasOwn(alternatePrintings,code)?alternatePrintings[code].canonical:code;
}

function checkDeckCopyLimit(card,count){
 const limit=card.deck_limit??2;
 if(count>limit)throw Error(limit===2?'Tối đa hai bản cùng tên: '+card.name:'Giới hạn '+limit+' bản: '+card.name);
}

export function startingDeckPool(investigator){
 if(typeof investigator!=='string'||!Object.hasOwn(INVESTIGATORS,investigator))throw Error('Điều tra viên chưa được hỗ trợ.');
 const extra=investigator==='01001'?['05316']:['01050'];
 return [...INVESTIGATORS[investigator].deck,'01022','01023','01086','05313',...extra];
}

export function validateStartingDeck(cards,investigator,deck){
 const pool=new Set(startingDeckPool(investigator));
 if(!Array.isArray(deck)||deck.length!==30)throw Error('Deck cần đúng 30 lá thường.');
 const names=new Map();
 for(const code of deck){
  if(!pool.has(code)||!Object.hasOwn(cards,code)){
   throw Error('Lá chưa được hỗ trợ trong deck này: '+String(code));
  }
  const card=cards[code],{name}=card;
  const count=(names.get(name)??0)+1;
  checkDeckCopyLimit(card,count);
  names.set(name,count);
 }
 return [...deck];
}

export function quoteDeckUpgrade(cards,investigator,campaign,add,remove){
 const card=Object.hasOwn(cards,add)?cards[add]:null;
 if(!campaign||!card||!Number.isInteger(card.xp)||card.xp<=0)throw Error('Nâng cấp không hợp lệ.');
 const deck=campaign.deck;
 const copies=deck.filter(code=>cards[code]?.name===card.name).length;
 if(card.permanent){
  if(remove!=null||campaign.xp<card.xp)throw Error('Không thể mua Permanent: kiểm tra XP và lá thay.');
  checkDeckCopyLimit(card,copies+1);
  return {cost:card.xp,index:null};
 }
 const index=deck.indexOf(remove);
 const old=index>=0?cards[remove]:null;
 const def=INVESTIGATORS[investigator];
 if(!old||old.permanent||[def.signature,def.weakness,'01097','01117',...MADNESS].includes(remove)){
  throw Error('Không thể thay lá này.');
 }
 const sameName=card.name===old.name;
 const cost=sameName?card.xp-(old.xp??0):card.xp;
 if(cost<=0||campaign.xp<cost)throw Error('Không đủ XP hoặc level nâng cấp không hợp lệ.');
 checkDeckCopyLimit(card,copies+1-Number(sameName));
 return {cost,index};
}

export function readDeckFile(data){
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Tệp deck không hợp lệ.');
 const investigator=canonicalPrinting(data.investigator_code);
 if(typeof investigator!=='string'||!Object.hasOwn(INVESTIGATORS,investigator))throw Error('Điều tra viên chưa được hỗ trợ.');
 if(typeof data.name!=='string'||!data.name.trim()||data.name.length>100||
    !data.slots||typeof data.slots!=='object'||Array.isArray(data.slots)){
  throw Error('Tệp deck thiếu tên hoặc danh sách lá.');
 }
 const entries=Object.entries(data.slots);
 if(entries.length>100||entries.some(([code,n])=>!/^[0-9]{5}[a-z]?$/.test(code)||!Number.isInteger(n)||n<0||n>30)){
  throw Error('Mã hoặc số lượng lá không hợp lệ.');
 }
 const def=INVESTIGATORS[investigator];
 const required=new Set([def.signature,def.weakness,'01097','01000']);
 const deck=entries.map(([code,count])=>[canonicalPrinting(code),count])
  .filter(([code])=>!required.has(code)).flatMap(([code,n])=>Array(n).fill(code));
 if(deck.length>100)throw Error('Tệp deck có quá nhiều lá.');
 return {name:data.name.trim(),investigator,deck};
}

export function writeDeckFile(draft){
 const slots={};
 for(const code of draft.deck)slots[code]=(slots[code]??0)+1;
 return {name:draft.name,investigator_code:draft.investigator,slots};
}
