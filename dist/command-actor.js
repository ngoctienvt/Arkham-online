const soloSeat='seat-1';
const leadCommands=new Set(['selectDifficulty','selectStoryLanguage','toggleOptionalRule','selectInvestigator','continueStory',
 'nextChapter','chooseLita','upgrade']);
const decisionCommands=new Set(['mulligan','resolveEncounter','choose','fast','closeWindow','commit','boost','reveal','continue']);

export function commandActor(state,type){
 if(leadCommands.has(type))return state.leadActor??soloSeat;
 if(decisionCommands.has(type))return state.pending?.actor??state.turnActor??soloSeat;
 return state.turnActor??soloSeat;
}

export function authorizeCommandActor(state,type,actor){
 const expected=commandActor(state,type);
 if(actor!==expected&&(actor!==undefined||expected!==soloSeat)){
  throw Error('Lệnh này thuộc ghế '+expected+'.');
 }
}
