export const remoteDeckAvailable=location.protocol==='http:'||location.protocol==='https:';

export async function loadRemoteDeck(source){
 const query=new URLSearchParams({source});
 let response;
 try{response=await fetch('/api/deck-import?'+query,{signal:AbortSignal.timeout(9000)});}
 catch{throw Error('Không kết nối được máy chủ game.');}
 let data;
 try{data=await response.json();}
 catch{throw Error('Cần chạy launcher để nhập deck từ mạng.');}
 if(!response.ok)throw Error(data.error??'Không nhập được deck.');
 return data;
}
