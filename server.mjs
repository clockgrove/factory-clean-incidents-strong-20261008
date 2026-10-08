import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
const priorities = ['critical','high','medium','low'];
export async function createApp() {
 const records=JSON.parse(await readFile(root+'.runtime/incidents.json','utf8'));
 const options={service:[...new Set(records.map(x=>x.service))].sort(),status:['open','in_progress','resolved'],severity:priorities};
 function query(p) {
  const q=(p.get('q')||'').toLowerCase();
  const filters={};
  for(const key of Object.keys(options)){filters[key]=p.getAll(key);if(filters[key].some(v=>!options[key].includes(v)))throw Error('Invalid '+key);}
  const from=p.get('from')||'',to=p.get('to')||'';
  for(const v of [from,to])if(v&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(v).toISOString().slice(0,10)!==v))throw Error('Invalid UTC date');
  if(from&&to&&from>to)throw Error('Start date must be on or before end date');
  const sort=p.get('sort')||'openedAt',direction=p.get('direction')||'desc';
  if(!['openedAt','severity'].includes(sort)||!['asc','desc'].includes(direction))throw Error('Invalid sort');
  const size=Number(p.get('size')||25),page=Number(p.get('page')||1);
  if(![25,50].includes(size)||!Number.isSafeInteger(page)||page<1)throw Error('Invalid pagination');
  const rows=records.filter(r=>(!q||[r.id,r.title,r.description].some(v=>v.toLowerCase().includes(q)))&&Object.keys(filters).every(k=>!filters[k].length||filters[k].includes(r[k]))&&(!from||r.openedAt.slice(0,10)>=from)&&(!to||r.openedAt.slice(0,10)<=to));
  rows.sort((a,b)=>{const diff=sort==='severity'?priorities.indexOf(b.severity)-priorities.indexOf(a.severity):a.openedAt.localeCompare(b.openedAt);return diff*(direction==='asc'?1:-1)||a.id.localeCompare(b.id);});
  const days={};
  for(const r of rows){const d=r.openedAt.slice(0,10);days[d]=(days[d]||0)+1;}
  const daily=Object.entries(days).sort(([a],[b])=>a.localeCompare(b)).map(([date,count])=>({date,count}));
  return {rows,size,page,summary:{total:rows.length,unresolved:rows.filter(r=>r.status!=='resolved').length,highSeverity:rows.filter(r=>priorities.indexOf(r.severity)<2).length,daily}};
 }
 return createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost');
   if(req.method!=='GET'){res.writeHead(405).end();return;}
   if(url.pathname==='/api/options')return json(res,options);
   if(url.pathname==='/api/incidents'||url.pathname==='/api/export'){
    let result;try{result=query(url.searchParams);}catch(e){return json(res,{error:e.message},400);}
    if(url.pathname==='/api/export'){
     const fields=Object.keys(records[0]);const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
     const csv=[fields.map(quote).join(','),...result.rows.map(r=>fields.map(k=>quote(k==='tags'?JSON.stringify(r[k]):r[k])).join(','))].join('\r\n')+'\r\n';
     res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="incidents.csv"'}).end(csv);return;
    }
    return json(res,{items:result.rows.slice((result.page-1)*result.size,result.page*result.size),summary:result.summary,page:result.page,size:result.size});
   }
   if(url.pathname.startsWith('/api/incidents/')){const row=records.find(r=>r.id===decodeURIComponent(url.pathname.split('/').pop()));return json(res,row||{error:'Incident not found'},row?200:404);}
   const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};const file=files[url.pathname];
   if(!file){res.writeHead(404).end('Not found');return;}
   res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html','Cache-Control':'no-store'}).end(await readFile(root+'public/'+file));
  }catch{json(res,{error:'Unable to process request'},500);}
 });
}
function json(res,body,status=200){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(body));}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{const app=await createApp();app.listen( Number(process.env.PORT||3000),'127.0.0.1',()=>console.log('Incident explorer: http://127.0.0.1:'+app.address().port));for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>app.close());}catch(e){console.error('Cannot start. Run npm run seed first.',e.message);process.exitCode=1;}
}
