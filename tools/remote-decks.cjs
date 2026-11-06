const {readDeckFile,writeDeckFile}=require('../dist/deck-library.js');

const arkhamDb='https://arkhamdb.com';
const arkhamBuild='https://api.arkham.build/v1/public';
const numeric=/^[1-9]\d{0,11}$/;
const shareId=/^[a-zA-Z0-9_-]{6,64}$/;

function resolveDeckSource(input){
 if(typeof input!=='string'||input.length>256)throw Error('URL hoặc ID deck không hợp lệ.');
 const value=input.trim();
 const shorthand=/^(?:(arkhamdb|arkham\.build):)?([\w-]+)$/.exec(value);
 if(shorthand){
  const [,provider,id]=shorthand;
  if(provider==='arkham.build'&&!numeric.test(id)&&shareId.test(id)){
   return {url:arkhamBuild+'/share_history/'+id,wrapped:true};
  }
  if(numeric.test(id))return {url:arkhamDb+'/api/public/decklist/'+id+'.json',wrapped:false};
 }
 let url;
 try{url=new URL(value);}catch{throw Error('URL hoặc ID deck không hợp lệ.');}
 if(url.protocol!=='https:'||url.port||url.username||url.password)throw Error('URL deck cần dùng HTTPS.');
 const match=/^\/(deck|decklist)\/view\/([\w-]+)(?:\/[a-zA-Z0-9_-]+)?\/?$/.exec(url.pathname);
 if(match){
  const [,type,id]=match;
  if(['arkhamdb.com','www.arkhamdb.com','arkham.build','www.arkham.build'].includes(url.hostname)&&numeric.test(id)){
   return {url:arkhamDb+'/api/public/'+type+'/'+id+'.json',wrapped:false};
  }
  if(url.hostname==='arkham.build'&&type==='deck'&&shareId.test(id)){
   return {url:arkhamBuild+'/share_history/'+id,wrapped:true};
  }
 }
 throw Error('Chỉ hỗ trợ link deck công khai từ ArkhamDB hoặc arkham.build.');
}

async function fetchRemoteDeck(input,fetcher=fetch){
 const {url,wrapped}=resolveDeckSource(input);
 let response;
 try{
  response=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(7000),headers:{Accept:'application/json'}});
 }catch{throw Error('Không kết nối được dịch vụ deck.');}
 if(!response.ok)throw Error('Không đọc được deck công khai (HTTP '+response.status+').');
 let payload='',size=0;
 const decoder=new TextDecoder();
 for await(const chunk of response.body??[]){
  size+=chunk.byteLength;
  if(size>512_000)throw Error('Dữ liệu deck vượt quá giới hạn.');
  payload+=decoder.decode(chunk,{stream:true});
 }
 let data;
 try{data=JSON.parse(payload+decoder.decode());}catch{throw Error('Dịch vụ trả về JSON không hợp lệ.');}
 return writeDeckFile(readDeckFile(wrapped?data?.data:data));
}

module.exports={resolveDeckSource,fetchRemoteDeck};
