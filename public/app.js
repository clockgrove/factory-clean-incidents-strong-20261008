const $=id=>document.getElementById(id);
const label=v=>v==='in_progress'?'In progress':v.charAt(0).toUpperCase()+v.slice(1);
const initial=()=>({q:'',service:[],status:[],severity:[],from:'',to:'',sort:'openedAt',direction:'desc',size:25,page:1});
let state=initial(),sequence=0,lastTotal=0,views=[],detailId='',detailSequence=0;
const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
function params(){const p=new URLSearchParams();for(const [k,v] of Object.entries(state)){if(Array.isArray(v))v.forEach(x=>p.append(k,x));else if(v!=='')p.set(k,v);}return p;}
async function request(url){const r=await fetch(url);if(!r.ok){let message='Request failed ('+r.status+')';try{message=(await r.json()).error||message;}catch{}throw Error(message);}return r.json();}
function notice(message,retry){$('notice').replaceChildren(node('span',message));if(retry){const b=node('button','Retry');b.onclick=retry;$('notice').append(b);}}
function sync(){
 $('search').value=state.q;for(const key of ['from','to','size'])$(key).value=state[key];$('sort').value=state.sort+':'+state.direction;
 document.querySelectorAll('#filters input').forEach(e=>e.checked=state[e.name].includes(e.value));
 $('active').replaceChildren();
 for(const key of ['q','service','status','severity','from','to'])for(const v of Array.isArray(state[key])?state[key]:state[key]?[state[key]]:[]){const b=node('button',(key==='q'?'Search: ':key==='from'?'From: ':key==='to'?'Through: ':'')+label(v)+' ×');b.setAttribute('aria-label','Remove '+key+' '+v);b.onclick=()=>{if(Array.isArray(state[key]))state[key]=state[key].filter(x=>x!==v);else state[key]='';change();};$('active').append(b);}
}
function change(){state.page=1;$('views').value='';$('delete').disabled=true;sync();load();}
async function load(){
 const id=++sequence;notice('Loading incidents…');$('content').setAttribute('aria-busy','true');$('export').disabled=true;$('prev').disabled=true;$('next').disabled=true;
 try{const data=await request('/api/incidents?'+params());if(id!==sequence)return;
  $('notice').replaceChildren();lastTotal=data.summary.total;
  $('total').textContent=lastTotal.toLocaleString();$('unresolved').textContent=data.summary.unresolved.toLocaleString();$('high').textContent=data.summary.highSeverity.toLocaleString();$('match-count').textContent='('+lastTotal.toLocaleString()+')';
  $('chart').replaceChildren();$('daily').replaceChildren();const daily=data.summary.daily,max=Math.max(1,...daily.map(x=>x.count));
  // Include zero-count days between the first and last matching day.
  const byDate=new Map(daily.map(x=>[x.date,x.count]));const dates=[];
  if(daily.length)for(let d=new Date(daily[0].date);d.toISOString().slice(0,10)<=daily.at(-1).date;d.setUTCDate(d.getUTCDate()+1))dates.push(d.toISOString().slice(0,10));
  for(const date of dates){const count=byDate.get(date)||0;const bar=node('i');bar.style.height=(count/max*100)+'%';bar.title=date+': '+count;$('chart').append(bar);const tr=node('tr');tr.append(node('td',date),node('td',count));$('daily').append(tr);}
  $('chart').setAttribute('aria-label',lastTotal+' incidents opened across '+dates.length+' UTC days. Daily counts are available below.');$('chart-range').replaceChildren(node('span',dates[0]||'No matching dates'),node('span',dates.at(-1)||''));
  $('rows').replaceChildren();for(const r of data.items){const tr=node('tr'),td=node('td'),b=node('button',undefined,'incident-link');b.append(node('small',r.id),node('span',r.title));b.onclick=()=>openDetail(r.id);td.append(b);tr.append(td,node('td',r.service));const sev=node('td');sev.append(node('span',label(r.severity),'badge '+r.severity));tr.append(sev,node('td',label(r.status),'status'),node('td',r.openedAt.slice(0,10)+' '+r.openedAt.slice(11,16)));[...tr.children].forEach((cell,i)=>cell.dataset.label=['Incident','Service','Severity','Status','Opened (UTC)'][i]);$('rows').append(tr);}
  $('empty').hidden=lastTotal!==0;$('page-info').textContent=lastTotal?`${(state.page-1)*state.size+1}–${Math.min(state.page*state.size,lastTotal)} of ${lastTotal.toLocaleString()} · Page ${state.page} of ${Math.ceil(lastTotal/state.size)}`:'0 incidents';
  $('prev').disabled=state.page===1;$('next').disabled=state.page*state.size>=lastTotal;$('export').disabled=false;
 }catch(e){if(id!==sequence)return;notice('Unable to load incidents. '+e.message,load);$('content').hidden=true;}
 finally{if(id===sequence){$('content').setAttribute('aria-busy','false');if(!$('notice').querySelector('button'))$('content').hidden=false;}}
}
async function openDetail(id){detailId=id;const current=++detailSequence;$('detail-body').textContent='Loading incident…';if(!$('detail').open)$('detail').showModal();
 try{const r=await request('/api/incidents/'+encodeURIComponent(id));if(current!==detailSequence)return;const body=$('detail-body');body.replaceChildren(node('p',r.id,'eyebrow'),node('h3',r.title),node('p',r.description));const dl=node('dl');for(const [key,title] of [['service','Service'],['severity','Severity'],['status','Status'],['openedAt','Opened (UTC)'],['resolvedAt','Resolved (UTC)'],['team','Team'],['region','Region'],['tags','Tags']])dl.append(node('dt',title),node('dd',key==='tags'?r[key].join(', '):r[key]??'Unresolved'));body.append(dl);
 }catch(e){if(current!==detailSequence)return;$('detail-body').replaceChildren(node('p','Unable to load details. '+e.message));const b=node('button','Retry details');b.onclick=()=>openDetail(detailId);$('detail-body').append(b);}}
$('close-detail').onclick=()=>$('detail').close();$('detail').addEventListener('close',()=>detailSequence++);
$('search').addEventListener('input',()=>{state.q=$('search').value;change();});
for(const key of ['from','to'])$(key).onchange=()=>{state[key]=$(key).value;change();};
$('sort').onchange=()=>{[state.sort,state.direction]=$('sort').value.split(':');change();};$('size').onchange=()=>{state.size=Number($('size').value);change();};
$('clear').onclick=()=>{state=initial();change();};$('prev').onclick=()=>{state.page--;load();};$('next').onclick=()=>{state.page++;load();};
$('export').onclick=async()=>{const b=$('export');b.disabled=true;try{const r=await fetch('/api/export?'+params());if(!r.ok)throw Error('Export request failed');const url=URL.createObjectURL(await r.blob());const a=node('a');a.href=url;a.download='incidents.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){notice('Unable to export. '+e.message,()=>b.click());}finally{b.disabled=false;}};
function showViews(){const selected=$('views').value;$('views').replaceChildren(new Option('Choose a saved view',''));views.forEach(v=>$('views').append(new Option(v.name,v.id)));$('views').value=selected;$('delete').disabled=!$('views').value;}
function persist(){try{localStorage.setItem('signal-views',JSON.stringify(views));showViews();return true;}catch{$('view-message').textContent='Browser storage unavailable. View could not be saved.';return false;}}
try{const data=JSON.parse(localStorage.getItem('signal-views')||'[]');if(Array.isArray(data))views=data.filter(v=>typeof v.name==='string'&&typeof v.id==='string'&&v.state&&['service','status','severity'].every(k=>Array.isArray(v.state[k])));}catch{$('view-message').textContent='Saved views could not be read.';}showViews();
$('save').onclick=()=>{$('view-name').value='';$('save-dialog').showModal();$('view-name').focus();};$('cancel-save').onclick=()=>$('save-dialog').close();
$('save-form').onsubmit=e=>{e.preventDefault();const name=$('view-name').value.trim();if(!name){$('view-name').setCustomValidity('Enter a view name');$('view-name').reportValidity();return;}const v={id:crypto.randomUUID(),name,state:{...structuredClone(state),page:1}};views.push(v);if(persist()){$('views').value=v.id;$('delete').disabled=false;$('view-message').textContent='View saved.';$('save-dialog').close();}else views.pop();};$('view-name').oninput=()=>$('view-name').setCustomValidity('');
$('views').onchange=()=>{const v=views.find(v=>v.id===$('views').value);$('delete').disabled=!v;if(v){state={...initial(),...structuredClone(v.state),page:1};sync();load();$('view-message').textContent='View loaded.';}};
$('delete').onclick=()=>{const before=views;views=views.filter(v=>v.id!==$('views').value);if(persist()){$('views').value='';$('delete').disabled=true;$('view-message').textContent='View deleted.';}else views=before;};
async function boot(){try{const options=await request('/api/options');$('filters').replaceChildren();for(const [key,values] of Object.entries(options)){const fs=node('fieldset');fs.append(node('legend',label(key)));for(const value of values){const l=node('label'),input=node('input');input.type='checkbox';input.name=key;input.value=value;input.onchange=()=>{state[key]=[...document.querySelectorAll(`input[name="${key}"]:checked`)].map(x=>x.value);change();};l.append(input,document.createTextNode(label(value)));fs.append(l);}$('filters').append(fs);}sync();load();}catch(e){notice('Unable to initialize filters. '+e.message,boot);$('content').hidden=true;}}
boot();
