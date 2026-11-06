const fs=require('node:fs');
const path=require('node:path');
const {createHash,randomBytes}=require('node:crypto');
const {readDeckFile,validateStartingDeck}=require('../dist/deck-library.js');
const cards=require('../dist/cards.json');

const secret=()=>randomBytes(24).toString('base64url');
const hash=value=>createHash('sha256').update(value).digest('hex');
const validSecret=value=>typeof value==='string'&&/^[\w-]{32}$/.test(value);
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};

function roomStore(file){
 const rooms=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
 function commit(id,room){
  const next={...rooms,[id]:room};
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const temporary=file+'.tmp';
  fs.writeFileSync(temporary,JSON.stringify(next),{mode:0o600});
  fs.renameSync(temporary,file);
  rooms[id]=room;
 }
 const seatId=index=>'seat-'+(index+1);
 const view=(id,room,index)=>({
  id,seat:seatId(index),capacity:room.capacity,revision:room.revision,
  seats:room.seats.map((_,index)=>seatId(index)),
  readySeats:room.seats.map((_,index)=>seatId(index)).filter(seat=>room.decks?.[seat]),
  deck:room.decks?.[seatId(index)]??null
 });
 function locate(id){
  if(!validSecret(id)||!Object.hasOwn(rooms,id))fail(404,'Không tìm thấy phòng.');
  return rooms[id];
 }
 function authenticate(room,token){
  const index=validSecret(token)?room.seats.indexOf(hash(token)):-1;
  if(index<0)fail(403,'Phiên ghế không hợp lệ.');
  return index;
 }
 return {
  create(capacity){
   if(![2,3,4].includes(capacity))fail(400,'Phòng cần 2–4 ghế.');
   if(Object.keys(rooms).length>=100)fail(409,'Kho phòng cục bộ đã đầy.');
   const id=secret(),invite=secret(),token=secret();
   const room={capacity,invite:hash(invite),seats:[hash(token)],revision:1};
   commit(id,room);
   return {...view(id,room,0),invite,token};
  },
  join(id,invite){
   const room=locate(id);
   if(!validSecret(invite)||hash(invite)!==room.invite)fail(403,'Lời mời không hợp lệ.');
   if(room.seats.length>=room.capacity)fail(409,'Phòng đã đủ ghế.');
   const token=secret();
   const next={...room,seats:[...room.seats,hash(token)],revision:room.revision+1};
   commit(id,next);
   return {...view(id,next,next.seats.length-1),token};
  },
  resume(id,token){
   const room=locate(id);
   return view(id,room,authenticate(room,token));
  },
  selectDeck({id,token,actor,revision,requestId,deck}){
   const room=locate(id);
   const index=authenticate(room,token),seat=seatId(index);
   if(actor!==seat)fail(403,'Không thể đổi deck của ghế khác.');
   if(typeof requestId!=='string'||!/^[a-z0-9-]{16,48}$/.test(requestId)){
    fail(400,'ID yêu cầu không hợp lệ.');
   }
   const fingerprint=hash(JSON.stringify({revision,deck}));
   const receipts=room.receipts?.[seat]??{};
   if(Object.hasOwn(receipts,requestId)){
    if(receipts[requestId]!==fingerprint)fail(409,'ID đã dùng cho yêu cầu khác.');
    return view(id,room,index);
   }
   if(revision!==room.revision)fail(409,'Phòng đã thay đổi. Hãy cập nhật ghế rồi thử lại.');
   if(Object.keys(receipts).length>=256)fail(409,'Đã đạt giới hạn thay đổi deck.');
   let draft;
   try{
    draft=readDeckFile(deck);
    validateStartingDeck(cards,draft.investigator,draft.deck);
   }catch(error){fail(400,error.message);}
   const next={
    ...room,revision:room.revision+1,
    decks:{...room.decks,[seat]:draft},
    receipts:{...room.receipts,[seat]:{...receipts,[requestId]:fingerprint}}
   };
   commit(id,next);
   return view(id,next,index);
  }
 };
}

async function readJson(req){
 if(req.headers['content-type']!=='application/json')fail(415,'Cần gửi JSON.');
 const parts=[];
 let size=0;
 for await(const part of req){
  size+=part.length;
  if(size>4096)fail(413,'Yêu cầu quá lớn.');
  parts.push(part);
 }
 let body;
 try{body=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{fail(400,'JSON không hợp lệ.');}
 if(!body||typeof body!=='object'||Array.isArray(body))fail(400,'JSON không hợp lệ.');
 return body;
}

function roomRoutes(store,origin){
 return async(req,res,route)=>{
  function send(status,body){
   res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
   res.end(JSON.stringify(body));
  }
  try{
   if(req.headers.origin&&req.headers.origin!==origin)fail(403,'Nguồn yêu cầu không hợp lệ.');
   if(req.method!=='POST')fail(405,'Cần dùng POST.');
   const body=await readJson(req);
   if(route==='/api/rooms/create')send(201,store.create(body.capacity));
   else if(route==='/api/rooms/join')send(200,store.join(body.id,body.invite));
   else if(route==='/api/rooms/resume')send(200,store.resume(body.id,body.token));
   else if(route==='/api/rooms/deck')send(200,store.selectDeck(body));
   else fail(404,'Không tìm thấy API.');
  }catch(error){
   send(error.status??500,{error:error.status?error.message:'Không lưu được trạng thái phòng.'});
  }
 };
}

module.exports={roomStore,roomRoutes};
