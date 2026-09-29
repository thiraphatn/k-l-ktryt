const $=s=>document.querySelector(s);
const KEY={hist:'jigsawjoy.history.v1',player:'jigsawjoy.player.v1',players:'jigsawjoy.players.v1'};
function load(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- สถานะ ---------- */
let history=load(KEY.hist,[]), players=load(KEY.players,[]), player=load(KEY.player,'');
const pkey=n=>n.trim().toLowerCase();
const sizeText=s=>`${s}×${s}`;
const sizeFull=s=>`${s}×${s} (${s*s} ช่อง)`;
function fmt(s){const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60,p=v=>String(v).padStart(2,'0');return h?`${h}:${p(m)}:${p(x)}`:`${p(m)}:${p(x)}`}
function fmtDate(t){try{return new Date(t).toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'})}catch(e){return new Date(t).toLocaleString()}}

/* ---------- สลับหน้า ---------- */
const screens=['menu','login','game','stats','help'];
function show(name){
  if(name!=='game')stopTimer();
  screens.forEach(s=>{$('#scr-'+s).hidden=(s!==name)});
  window.scrollTo(0,0);
  if(name==='menu')renderMenu();
  if(name==='login')renderLogin();
  if(name==='game')enterGame();
  if(name==='stats')renderStats();
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-go]');if(!b)return;
  if(!$('#scr-game').hidden&&tiles.length&&!finished&&moves>0&&!confirm('กำลังเล่นอยู่ ออกจากเกมนี้หรือไม่? (ผลจะไม่ถูกบันทึก)'))return;
  show(b.dataset.go);
});

/* ---------- หน้าหลัก / ลงชื่อ ---------- */
function renderMenu(){
  $('#whoami').innerHTML=player?`ผู้เล่นปัจจุบัน: <b>${esc(player)}</b> <button id="switchBtn">เปลี่ยนชื่อ</button>`:'ยังไม่ได้ลงชื่อ';
  const sw=$('#switchBtn');if(sw)sw.onclick=()=>{player='';save(KEY.player,'');show('login')};
}
function renderLogin(){
  $('#nameInput').value=player||'';$('#loginErr').textContent='';
  $('#recent').innerHTML=players.slice(0,6).map(n=>`<button data-name="${esc(n)}">${esc(n)}</button>`).join('');
  setTimeout(()=>$('#nameInput').focus(),50);
}
$('#recent').addEventListener('click',e=>{const b=e.target.closest('[data-name]');if(b){$('#nameInput').value=b.dataset.name;doLogin()}});
function doLogin(){
  let n=$('#nameInput').value.trim().replace(/\s+/g,' ');
  if(!n){$('#loginErr').textContent='กรุณาใส่ชื่อก่อนเข้าเล่น';return}
  const ex=players.find(p=>pkey(p)===pkey(n));if(ex)n=ex;
  player=n;players=[n,...players.filter(p=>pkey(p)!==pkey(n))].slice(0,20);
  save(KEY.player,player);save(KEY.players,players);show('game');
}
$('#loginBtn').addEventListener('click',doLogin);
$('#nameInput').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin()});

/* ---------- เกม ---------- */
const board=$('#board'),input=$('#imageInput'),pieces=$('#pieces'),timeEl=$('#time'),movesEl=$('#moves'),msg=$('#message');
let imageURL='',tiles=[],selected=null,moves=0,seconds=0,timer=null,side=4,dragIndex=null,finished=false;
const fallback='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><defs><linearGradient id="g"><stop stop-color="#a78bfa"/><stop offset="1" stop-color="#f9a8d4"/></linearGradient></defs><rect width="800" height="800" fill="url(#g)"/><text x="400" y="380" text-anchor="middle" font-size="100">🧩</text><text x="400" y="470" text-anchor="middle" font-family="sans-serif" font-size="34" fill="white">เลือกรูปเพื่อเริ่ม</text></svg>`);
imageURL=fallback;
[3,4,5,6,7,8].forEach(s=>{const o=document.createElement('option');o.value=s*s;o.textContent=sizeFull(s);if(s===4)o.selected=true;pieces.appendChild(o)});

function stopTimer(){if(timer){clearInterval(timer);timer=null}}
function startTimer(){stopTimer();timer=setInterval(()=>{seconds++;timeEl.textContent=fmt(seconds)},1000)}
function resetStats(){stopTimer();seconds=0;moves=0;selected=null;dragIndex=null;finished=false;timeEl.textContent='00:00';movesEl.textContent='0';msg.textContent='';msg.className='message'}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}if(a.every((v,i)=>v===i)){[a[0],a[1]]=[a[1],a[0]]}}
function enterGame(){$('#playerBadge').textContent='👤 '+player;startGame()}
function startGame(){
  resetStats();const n=Number(pieces.value);side=Math.round(Math.sqrt(n));
  $('#sizeLabel').textContent=sizeText(side);
  tiles=Array.from({length:n},(_,i)=>i);shuffle(tiles);render();startTimer();
}
function render(){
  board.innerHTML='';board.style.gridTemplateColumns=`repeat(${side},1fr)`;
  tiles.forEach((orig,pos)=>{
    const d=document.createElement('div');d.className='tile';d.dataset.pos=pos;
    const x=orig%side,y=Math.floor(orig/side);
    d.style.backgroundImage=`url(${JSON.stringify(imageURL)})`;
    d.style.backgroundSize=`${side*100}% ${side*100}%`;
    d.style.backgroundPosition=`${x*100/(side-1)}% ${y*100/(side-1)}%`;
    d.addEventListener('click',()=>tap(pos,d));d.draggable=true;
    d.addEventListener('dragstart',e=>{dragIndex=pos;d.classList.add('dragging');e.dataTransfer.setData('text/plain',String(pos))});
    d.addEventListener('dragend',()=>{dragIndex=null;d.classList.remove('dragging')});
    d.addEventListener('dragover',e=>e.preventDefault());
    d.addEventListener('drop',e=>{e.preventDefault();const from=Number(e.dataTransfer.getData('text/plain'));if(!isNaN(from))swap(from,pos)});
    board.appendChild(d);
  });
}
function tap(pos,d){if(finished)return;if(selected===pos){selected=null;d.classList.remove('selected');return}if(selected===null){selected=pos;d.classList.add('selected');return}swap(selected,pos)}
function swap(a,b){if(finished)return;if(a===b){selected=null;render();return}[tiles[a],tiles[b]]=[tiles[b],tiles[a]];moves++;movesEl.textContent=moves;selected=null;render();checkWin()}
function checkWin(){
  if(!tiles.every((v,i)=>v===i))return;
  finished=true;stopTimer();
  history.push({id:Date.now(),player,pk:pkey(player),size:side,seconds,moves,at:Date.now()});
  save(KEY.hist,history);
  msg.className='message win';
  msg.innerHTML=`🎉 ต่อสำเร็จ! ${sizeText(side)} • เวลา ${fmt(seconds)} • ${moves} ครั้ง<br><small style="font-weight:400">บันทึกประวัติแล้ว</small><br><button id="againBtn">🔁 เล่นอีกครั้ง</button><button id="toStats">📊 ดูสถิติ</button>`;
  $('#againBtn').onclick=startGame;$('#toStats').onclick=()=>show('stats');
}
// ย่อ/ครอปรูปเป็นสี่เหลี่ยมจัตุรัสตรงกลาง เพื่อไม่ให้ภาพบิดเบี้ยว
function toSquare(url,cb){
  const im=new Image();
  im.onload=()=>{try{const s=Math.min(im.width,im.height),c=document.createElement('canvas');c.width=c.height=Math.min(s,1000);
    c.getContext('2d').drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,c.width,c.height);cb(c.toDataURL('image/jpeg',.9))}catch(e){cb(url)}};
  im.onerror=()=>cb(url);im.src=url;
}
input.addEventListener('change',e=>{const f=e.target.files&&e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>toSquare(r.result,u=>{imageURL=u;startGame()});r.readAsDataURL(f);input.value=''});
$('#start').addEventListener('click',startGame);
pieces.addEventListener('change',startGame);
$('#shuffle').addEventListener('click',()=>{if(!tiles.length||finished)return;shuffle(tiles);selected=null;render()});
$('#backMenu').addEventListener('click',()=>{if(tiles.length&&!finished&&moves>0&&!confirm('กำลังเล่นอยู่ ออกจากเกมนี้หรือไม่? (ผลจะไม่ถูกบันทึก)'))return;show('menu')});

/* ---------- ประวัติและสถิติ ---------- */
let statSize='all',statScope='me';
function renderStats(){
  if(!player)statScope='all';
  $('#scopeSeg').querySelectorAll('button').forEach(b=>{b.classList.toggle('on',b.dataset.scope===statScope);if(b.dataset.scope==='me')b.disabled=!player});
  $('#clearBtn').hidden=!player;
  let rows=history.filter(r=>statScope==='all'||r.pk===pkey(player));
  const tabs=[['all','ทั้งหมด'],...[3,4,5,6,7,8].map(s=>[String(s),sizeText(s)])];
  $('#sizeTabs').innerHTML=tabs.map(([k,l])=>{const c=k==='all'?rows.length:rows.filter(r=>r.size===+k).length;return `<button data-size="${k}" class="${statSize===k?'on':''}">${l}${c?` (${c})`:''}</button>`}).join('');
  const body=$('#statsBody');
  if(!rows.length){body.innerHTML='<div class="empty">ยังไม่มีประวัติการเล่น — ลองเล่นให้จบสักรอบดูนะ 🧩</div>';return}
  const stat=list=>({n:list.length,best:Math.min(...list.map(r=>r.seconds)),avg:Math.round(list.reduce((a,r)=>a+r.seconds,0)/list.length),mv:Math.min(...list.map(r=>r.moves))});
  let html='';
  if(statSize==='all'){
    html+='<div class="h3">สรุปตามขนาดช่อง</div><div class="tbl-wrap"><table><tr><th>ขนาด</th><th>จำนวนช่อง</th><th>เล่นแล้ว (ครั้ง)</th><th>เวลาดีที่สุด</th><th>เวลาเฉลี่ย</th><th>สลับน้อยสุด</th></tr>';
    [3,4,5,6,7,8].forEach(s=>{const l=rows.filter(r=>r.size===s);if(!l.length)return;const t=stat(l);html+=`<tr><td>${sizeText(s)}</td><td>${s*s}</td><td>${t.n}</td><td>${fmt(t.best)}</td><td>${fmt(t.avg)}</td><td>${t.mv}</td></tr>`});
    html+='</table></div>';
  }else{
    rows=rows.filter(r=>r.size===+statSize);
    if(!rows.length){body.innerHTML='<div class="empty">ยังไม่มีประวัติของขนาด '+sizeText(+statSize)+'</div>';return}
    const t=stat(rows);
    html+=`<div class="cards"><div class="mini"><small>ขนาด</small><b>${sizeFull(+statSize)}</b></div><div class="mini"><small>เล่นแล้ว</small><b>${t.n} ครั้ง</b></div><div class="mini"><small>🏆 เวลาดีที่สุด</small><b>${fmt(t.best)}</b></div><div class="mini"><small>เวลาเฉลี่ย</small><b>${fmt(t.avg)}</b></div><div class="mini"><small>สลับน้อยสุด</small><b>${t.mv}</b></div></div>`;
  }
  const bestBySize={};rows.forEach(r=>{if(!(r.size in bestBySize)||r.seconds<bestBySize[r.size])bestBySize[r.size]=r.seconds});
  html+=`<div class="h3">ประวัติการเล่น</div><div class="tbl-wrap"><table><tr><th>วันที่</th><th>ผู้เล่น</th><th>ขนาด</th><th>จำนวนช่อง</th><th>เวลา</th><th>สลับ (ครั้ง)</th></tr>`;
  rows.slice().sort((a,b)=>b.at-a.at).forEach(r=>{html+=`<tr class="${r.seconds===bestBySize[r.size]?'best':''}"><td>${fmtDate(r.at)}</td><td>${esc(r.player)}</td><td>${sizeText(r.size)}</td><td>${r.size*r.size}</td><td>${r.seconds===bestBySize[r.size]?'🏆 ':''}${fmt(r.seconds)}</td><td>${r.moves}</td></tr>`});
  html+='</table></div>';
  body.innerHTML=html;
}
$('#sizeTabs').addEventListener('click',e=>{const b=e.target.closest('[data-size]');if(b){statSize=b.dataset.size;renderStats()}});
$('#scopeSeg').addEventListener('click',e=>{const b=e.target.closest('[data-scope]');if(b&&!b.disabled){statScope=b.dataset.scope;renderStats()}});
$('#clearBtn').addEventListener('click',()=>{if(!player||!confirm(`ล้างประวัติการเล่นทั้งหมดของ “${player}” ใช่หรือไม่?`))return;history=history.filter(r=>r.pk!==pkey(player));save(KEY.hist,history);renderStats()});

/* ---------- PWA ---------- */
let deferred=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;$('#installBtn').hidden=false});
$('#installBtn').addEventListener('click',async()=>{if(deferred){await deferred.prompt();deferred=null}});
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));

show('menu');
