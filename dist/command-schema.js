const reserved=new Set(['__proto__','constructor','prototype','toString','valueOf','hasOwnProperty']);
const identifier=value=>typeof value==='string'&&/^[a-zA-Z0-9_+-]{1,48}$/.test(value)&&!reserved.has(value);
const cardCode=value=>typeof value==='string'&&/^[0-9]{5}[a-z]?$/.test(value);
const index=value=>Number.isSafeInteger(value)&&value>=0;
const validators={
 add:cardCode,asset:identifier,code:cardCode,
 deck:value=>Array.isArray(value)&&value.length===30&&value.every(cardCode),
 difficulty:value=>['Easy','Standard','Hard','Expert'].includes(value),
 discardKnife:value=>typeof value==='boolean',
 index,indices:value=>Array.isArray(value)&&value.length<=6&&value.every(index),
 kind:identifier,language:value=>['vi','en'].includes(value),
 recruit:value=>typeof value==='boolean',remove:value=>value===null||cardCode(value),
 rule:identifier,skill:value=>['willpower','intellect','combat','agility'].includes(value),
 stat:value=>['hp','horror'].includes(value),target:identifier,to:identifier,token:identifier,
 tool:identifier,track:value=>['act','agenda'].includes(value),weapon:identifier,
 from:identifier,phase:value=>['enemy','upkeep','mythos'].includes(value),
 tokens:value=>Array.isArray(value)&&value.length>=1&&value.length<=40&&value.every(identifier),
 point:value=>['before-enemy-attacks','after-enemy-attacks','after-encounter'].includes(value)
};
const actions={
 skidsAction:[],hospitalDebts:[],child:[],end:[],advance:[],resource:[],draw:[],parley:[],resign:[],
 move:['to'],investigate:['tool?'],fight:['target','weapon?','discardKnife?'],evade:['target'],
 engage:['target'],play:['index'],heal:['asset','stat'],cop:['asset','target'],
 cultist:[],interrogate:['target'],disrupt:['skill'],sacrifice:[],unlock:['skill'],
 dreams:[],clearMadness:['code'],location:['stat?'],badge:[],supply:['index','asset?']
};
const portableCommandShapes={
 adminAdvance:['track'],adminToggle:[],boost:[],choose:['index'],chooseLita:['recruit'],
 closeWindow:[],commit:['index'],continue:[],continueStory:[],mulligan:['indices?'],
 nextChapter:[],resolveEncounter:[],reveal:[],selectDifficulty:['difficulty'],
 selectInvestigator:['code','deck?'],selectStoryLanguage:['language'],toggleOptionalRule:['rule'],
 upgrade:['add','remove?']
};

function matches(args,fields){
 const keys=new Set(fields.map(field=>field.replace(/\?$/,'')));
 return fields.every(field=>field.endsWith('?')||Object.hasOwn(args,field))&&
  Object.entries(args).every(([key,value])=>keys.has(key)&&validators[key](value));
}

export function validPortableCommand(type,args){
 if(!args||typeof args!=='object'||Array.isArray(args))return false;
 if(type==='action'||type==='fast'){
  if(!Object.hasOwn(actions,args.kind)||
     (type==='fast'&&!['play','hospitalDebts','badge','cop','child'].includes(args.kind)))return false;
  if(args.kind==='fight'&&args.discardKnife!==undefined&&!args.weapon)return false;
  return matches(args,['kind',...actions[args.kind]]);
 }
 return Object.hasOwn(portableCommandShapes,type)&&matches(args,portableCommandShapes[type]);
}

const sandboxEditShapes={
 move:['from','to','index'],bag:['tokens'],phase:['phase'],window:['point']
};

export function validDebugCommand(type,args){
 if(validPortableCommand(type,args))return true;
 if(!args||typeof args!=='object'||Array.isArray(args))return false;
 if(type==='noop')return matches(args,[]);
 if(type==='reveal')return matches(args,['token']);
 return type==='sandboxEdit'&&Object.hasOwn(sandboxEditShapes,args.kind)&&
  matches(args,['kind',...sandboxEditShapes[args.kind]]);
}
