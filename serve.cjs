// Local game server: loopback only, with an explicit resource allowlist.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'dist');
const isRootAsset=name=>/^[\w-]+\.(html|js|css|json)$/.test(name)
 && fs.lstatSync(path.join(root,name),{throwIfNoEntry:false})?.isFile();
const images=new Set(fs.readdirSync(path.join(root,'assets')).map(n=>'assets/'+n));
const sceneImages=new Set(fs.readdirSync(path.join(root,'scene-art')).filter(n=>n.endsWith('.png')).map(n=>'scene-art/'+n));
const port=8786;
const {roomStore,roomRoutes}=require('./tools/local-rooms.cjs');
const rooms=roomRoutes(roomStore(path.join(__dirname,'outputs','local-rooms.json')),'http://127.0.0.1:'+port);
const {fetchRemoteDeck}=require('./tools/remote-decks.cjs');
const server=http.createServer((req,res)=>{
 const pathname=(req.url||'/').split('?')[0];
 if(pathname.startsWith('/api/rooms/')){void rooms(req,res,pathname);return;}
 if(pathname==='/api/deck-import'){
  if(req.method!=='GET'||req.headers['sec-fetch-site']==='cross-site'){res.writeHead(405);res.end();return;}
  const input=new URL(req.url,'http://127.0.0.1').searchParams.get('source');
  const send=(status,data)=>{
   res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
   res.end(JSON.stringify(data));
  };
  void fetchRemoteDeck(input).then(deck=>send(200,deck),error=>send(400,{error:error.message}));
  return;
 }
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 const name=pathname==='/'?'index.html':pathname.slice(1);
 if(!isRootAsset(name)&&!images.has(name)&&!sceneImages.has(name)&&name!=='play-offline.html'){res.writeHead(404);res.end('Not found');return;}
 const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png'}[path.extname(name)];
 res.setHeader('Content-Type',type);res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-cache');
 if(req.method==='HEAD'){res.end();return;}
 const stream=fs.createReadStream(name==='play-offline.html'?path.join(__dirname,'the-gathering-offline.html'):path.join(root,name));stream.on('error',()=>{if(!res.headersSent)res.writeHead(500);res.end();});stream.pipe(res);
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'Game already running at http://127.0.0.1:'+port:error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({event:'arkham-preview',pid:process.pid,port,workspace:__dirname,url:'http://127.0.0.1:'+port})));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
