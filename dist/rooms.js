const createForm=document.querySelector('#room-create');
const joinForm=document.querySelector('#room-join');
const refresh=document.querySelector('#room-refresh');
const status=document.querySelector('#room-status');
const inviteLabel=document.querySelector('#room-invite-label');
const inviteInput=document.querySelector('#room-invite');
const deckForm=document.querySelector('#room-deck');
const invitation=new URLSearchParams(location.hash.slice(1));
const roomSessionKey='arkham-room-session';
let session,currentRoom,pendingDeckRequest;

async function requestRoom(action,data){
 const response=await fetch('/api/rooms/'+action,{
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)
 });
 const result=await response.json();
 if(!response.ok)throw Error(result.error);
 return result;
}
function showRoom(result){
 currentRoom=result;
 status.textContent=`Ghế của bạn: ${result.seat}. Đã nhận ${result.seats.length}/${result.capacity} ghế.`;
 status.textContent+=' Đã chọn deck: '+result.readySeats.length+'/'+result.capacity+'.';
 document.querySelector('#room-selected-deck').textContent=result.deck?.name??'Chưa chọn deck.';
 deckForm.hidden=false;
 createForm.hidden=true;
 joinForm.hidden=true;
 refresh.hidden=false;
 inviteLabel.hidden=!session.invite;
 if(session.invite){
  const hash=new URLSearchParams({id:session.id,invite:session.invite});
  inviteInput.value=location.origin+location.pathname+'#'+hash;
 }
}
function keepSeat(result){
 session={id:result.id,token:result.token,invite:result.invite};
 sessionStorage.setItem(roomSessionKey,JSON.stringify(session));
 history.replaceState(null,'',location.pathname);
 showRoom(result);
}
async function run(control,operation){
 control.disabled=true;
 try{await operation();}catch(error){status.textContent=error.message;}
 finally{control.disabled=false;}
}
createForm.addEventListener('submit',event=>{
 event.preventDefault();
 void run(event.submitter,async()=>{
  const capacity=Number(new FormData(createForm).get('capacity'));
  keepSeat(await requestRoom('create',{capacity}));
 });
});
joinForm.addEventListener('submit',event=>{
 event.preventDefault();
 void run(event.submitter,async()=>{
  keepSeat(await requestRoom('join',{id:invitation.get('id'),invite:invitation.get('invite')}));
 });
});
deckForm.addEventListener('submit',event=>{
 event.preventDefault();
 void run(event.submitter,async()=>{
  const values=new FormData(deckForm);
  const investigator=values.get('investigator'),file=values.get('deck-file');
  let deck;
  if(file?.name){
   if(file.size>3500)throw Error('Tệp deck vượt quá 3.500 byte.');
   deck=JSON.parse(await file.text());
  }else{
   const starter=INVESTIGATORS[investigator].deck;
   const name=deckForm.elements.investigator.selectedOptions[0].textContent;
   deck=writeDeckFile({name,investigator,deck:[...starter,...starter]});
  }
  const {seat,revision}=currentRoom;
  const payload={id:session.id,token:session.token,actor:seat,revision,deck};
  const key=JSON.stringify(payload);
  if(pendingDeckRequest?.key!==key)pendingDeckRequest={key,requestId:crypto.randomUUID()};
  showRoom(await requestRoom('deck',{...payload,requestId:pendingDeckRequest.requestId}));
  pendingDeckRequest=null;
 });
});
async function refreshRoom(){
 showRoom(await requestRoom('resume',{id:session.id,token:session.token}));
}
refresh.addEventListener('click',()=>void run(refresh,refreshRoom));
if(invitation.has('id')&&invitation.has('invite')){
 createForm.hidden=true;
 joinForm.hidden=false;
}else{
 try{session=JSON.parse(sessionStorage.getItem(roomSessionKey));}catch{}
 if(session)void run(refresh,refreshRoom);
}
import {INVESTIGATORS} from './rules-data.js';
import {writeDeckFile} from './deck-library.js';

