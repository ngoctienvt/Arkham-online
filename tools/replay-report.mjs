import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import {Engine} from '../dist/engine.js';
import {debugContentVersion,readLegacyDebugSnapshot} from '../dist/debug-report.js';
import {validFingerprints,checkReplayStep} from '../dist/game-history.js';
import {validDebugCommand} from '../dist/command-schema.js';

function matchLegacyWindowLabels(replayed,expected) {
 if(!replayed||!expected||typeof replayed!=='object'||typeof expected!=='object')return;
 if((replayed.kind==='window'||replayed.type==='window')&&!Object.hasOwn(expected,'point')){
  delete replayed.point;
 }
 for(const key of Object.keys(replayed)){
  if(Object.hasOwn(expected,key))matchLegacyWindowLabels(replayed[key],expected[key]);
 }
}

async function replay(path) {
 if (!path) throw new Error('Usage: node tools/replay-report.mjs REPORT.json');
 if ((await stat(path)).size > 16 * 1024 * 1024) throw new Error('Report exceeds 16 MiB.');
 const report = JSON.parse(await readFile(path, 'utf8'));
 const cards = JSON.parse(await readFile(new URL('../dist/cards.json', import.meta.url), 'utf8'));
 if(report?.version===1){
  console.log(JSON.stringify(readLegacyDebugSnapshot(cards,report),null,2));
  return;
 }
 if(report?.app==='The Gathering solo'&&report.version===2&&report.mode==='basic'){
  throw Error('This short report has no replay data. Export a full report to replay.');
 }
 const {checkpoint,commands,state} = report;
 if (report.app !== 'The Gathering solo' || report.version !== 2 ||
     checkpoint?.version !== 1 || !Number.isInteger(checkpoint.rngState) ||
     checkpoint.rngState < 0 || checkpoint.rngState > 0xffffffff ||
     (report.content!==undefined&&report.content!==debugContentVersion) ||
     (report.rngVersion!==undefined&&report.rngVersion!==1) ||
     !Array.isArray(commands) || !state || !checkpoint.locations?.[checkpoint.location]) {
  throw new Error('Expected a version 2 report exported by The Gathering.');
 }
 const game = new Engine(cards, checkpoint);
 game.validate();
 const fingerprints=report.fingerprints;
 if(fingerprints!==undefined){
  if(!validFingerprints(fingerprints,commands.length))throw Error('Invalid replay fingerprints.');
  checkReplayStep(fingerprints,game.s,0);
 }
 for (const [index, command] of commands.entries()) {
  if (!validDebugCommand(command?.type,command?.args)) {
   throw new Error(`Invalid command at step ${index + 1}.`);
  }
  try {
   game.command(command.type, command.args, command.actor);
  } catch (error) {
   throw new Error(`Step ${index + 1} (${command.type}): ${error.message}`);
  }
  if(fingerprints)checkReplayStep(fingerprints,game.s,index+1);
 }
 // Exported snapshots omit undefined object fields.
 const replayed = JSON.parse(JSON.stringify(game.s));
 matchLegacyWindowLabels(replayed,state);
 const differing = Object.keys({...replayed,...state}).filter(key => {
  try {
   assert.deepEqual(replayed[key],state[key]);
   return false;
  } catch {
   return true;
  }
 });
 if (differing.length) throw new Error(`Replay differs at: ${differing.join(', ')}.`);
 console.log(`Replayed ${commands.length} commands and matched the exported state.`);
}

try {
 await replay(process.argv[2]);
} catch (error) {
 console.error(error.message);
 process.exitCode = 1;
}
