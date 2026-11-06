import {BAG} from './rules-data.js';

export const notzBags = {
 Easy:['+1','+1','0','0','0','-1','-1','-1','-2','-2','skull','skull','cultist','tablet','auto_fail','elder_sign'],
 Standard:BAG,
 Hard:['0','0','0','-1','-1','-2','-2','-3','-3','-4','-5','skull','skull','cultist','tablet','auto_fail','elder_sign'],
 Expert:['0','-1','-1','-2','-2','-3','-3','-4','-4','-5','-6','-8','skull','skull','cultist','tablet','auto_fail','elder_sign']
};

export const SCENARIOS = {
 '01104': {id:'01104', chapter:1, label:'I', name:'The Gathering', acts:['01108','01109','01110'], agendas:['01105','01106','01107']},
 '01120': {id:'01120', chapter:2, label:'II', name:'The Midnight Masks', acts:['01123'], agendas:['01121a','01122'], art:'arkham-city'},
 '01142': {id:'01142', chapter:3, label:'III', name:'The Devourer Below', acts:['01146','01147','01148','01145'], agendas:['01143','01144','01145','01145'], art:'arkham-woods'}
};
export const CAMPAIGNS = {
 '01': {
  id:'01', name:'Night of the Zealot', start:'01104',
  transitions:{'01104':'01120','01120':'01142'}
 }
};
// Saved v1 games use a chapter number. Keep the adapter at the save boundary.
const notzByChapter = new Map(Object.values(SCENARIOS).map(scenario=>[scenario.chapter,scenario.id]));
export function campaignScenario(state) {
 const campaignId=state.campaignId??'01';
 const campaign=Object.hasOwn(CAMPAIGNS,campaignId)?CAMPAIGNS[campaignId]:null;
 const legacyId=campaignId==='01'?notzByChapter.get(state.chapter??1):undefined;
 const scenarioId=state.scenarioId??legacyId??(state.chapter===undefined?campaign?.start:undefined);
 if(!campaign||!Object.hasOwn(SCENARIOS,scenarioId)||
    (scenarioId!==campaign.start&&!Object.values(campaign.transitions).includes(scenarioId))||
    (state.chapter!=null&&SCENARIOS[scenarioId].chapter!==state.chapter)){
  throw Error('Kịch bản trong bản lưu không hợp lệ.');
 }
 return {campaign,scenario:SCENARIOS[scenarioId]};
}
export const CULTISTS = ['01137','01138','01139','01140','01141','01121b'];
export const MADNESS = ['01098','01099','01100'];
export const CITY = {
 northside:['01134',[18,27]], downtown:['01130',[55,26]], graveyard:['01133',[85,25]],
 university:['01129',[17,55]], rivertown:['01125',[54,49]], easttown:['01132',[87,51]],
 hospital:['01128',[20,85]], southside:['01126',[53,82]], house:['01124',[89,76]]
};
export const FOREST = {
 main:['01149',[49,55]], wood1:['01150',[19,43]], wood2:['01151',[33,28]],
 wood3:['01152',[21,72]], wood4:['01153',[83,65]], ritual:['01156',[88,18]]
};
export const CITY_LINKS = {
 northside:['downtown','university'], downtown:['northside','easttown'],
 university:['northside','hospital','southside','rivertown'], hospital:['university','southside'],
 southside:['hospital','university','rivertown'], rivertown:['southside','university','easttown','graveyard','house'],
 easttown:['downtown','rivertown'], graveyard:['rivertown'], house:['rivertown']
};
export const CULTIST_SPAWNS = {'01137':'downtown','01138':'graveyard','01139':'university','01140':'northside','01141':'hospital'};
export const WOODS_LINKS = {
 '01150':['01152','01153'],'01151':['01152','01154'],'01152':['01150','01151'],
 '01153':['01150','01155'],'01154':['01151','01155'],'01155':['01153','01154']
};
