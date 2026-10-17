(function(){
"use strict";
var state=window.QP_STATE||{site:{},topics:[]};if(!state.site)state.site={};if(!Array.isArray(state.topics))state.topics=[];
var STYLES={
  bamboo:{name:"竹籤朱紅",desc:"直立竹籤，籤詩直排",layout:"sticks",poem:"v",c:["#FBFAF6","#B8342C","#F3E7CC"]},
  peach:{name:"粉櫻桃花",desc:"圓角卡片，柔和粉色",layout:"cards",poem:"h",c:["#FFF7F6","#D4607E","#FDE6EC"]},
  gold:{name:"廟宇紅籤",desc:"紅色籤紙，雙框直排",layout:"redp",poem:"v",c:["#FFF9F5","#B8342C","#F2C9BC"]},
  ink:{name:"籤詩櫃",desc:"木頭抽屜，一格一籤",layout:"drawer",poem:"v",c:["#FAF6EE","#7A5530","#DCC29A"]},
  jade:{name:"黃紙古籤",desc:"黃色籤紙，籤詩直接看得到",layout:"yellow",poem:"v",c:["#FBF8EF","#C0392B","#F3E3AE"]}
};
var DEF_LINE="https://line.me/R/ti/p/@346junhx";
var LEVELS=["大吉","上吉","中吉","小吉","平平","中下","下下"];
var CN="零一二三四五六七八九";

function $(s,r){return (r||document).querySelector(s)}
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function rich(s){return esc(s).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")}
function plain(s){return String(s||"").replace(/\*\*/g,"")}
function lvSplit(l){l=String(l||"").trim();var m=/^(.*?)\s*[・·•‧．.｜|／/、:：\-—\s]+\s*(.+)$/.exec(l);if(m&&m[1]&&m[1].length<=4)return [m[1],m[2]];if(l.length>4)return [l.slice(0,2),l.slice(2)];return [l,""]}
function lvMain(l){return lvSplit(l)[0]}
function lvSub(l){return lvSplit(l)[1]}
function tier(l){l=lvMain(l);if(/大吉|上吉|上上/.test(l))return "hi";if(/中吉|小吉|吉/.test(l))return "mid";if(/平/.test(l))return "flat";return "low"}
function lvTag(l){return l?'<span class="lv '+tier(l)+'">'+esc(lvMain(l))+'</span>':""}
function isVerse(p){var s=String(p||"");if(/[「」『』。！？；]/.test(s))return false;var L=poemLines(s);if(L.length<3||L.length>8)return false;var n=L.map(function(x){return x.length});return Math.max.apply(null,n)<=9&&Math.min.apply(null,n)>=4&&Math.max.apply(null,n)-Math.min.apply(null,n)<=2}
function poemMode(st,s){return isVerse(s.poem)?st.poem:"h"}
function readHtml(arr){
  var out=[],a=(arr||[]).slice();
  while(a.length&&/^[\s\-—⸻_=*~]+$/.test(a[a.length-1]))a.pop();
  a.forEach(function(p){
    var t=String(p).trim();if(!t)return;
    if(/^[\s\-—⸻_=*~]+$/.test(t)){out.push('<hr class="rd-hr">');return}
    if(t.length<=16&&/[：:]$/.test(t)){out.push('<p class="rd-sub">'+rich(t.replace(/[：:]$/,""))+'</p>');return}
    out.push('<p>'+rich(t)+'</p>');
  });
  return out.join("");
}
function cnNum(n){
  if(n<10)return CN[n];if(n===10)return "十";if(n<20)return "十"+CN[n%10];
  if(n<100)return CN[Math.floor(n/10)]+"十"+(n%10?CN[n%10]:"");
  var h=Math.floor(n/100),r=n%100;return CN[h]+"百"+(r===0?"":r<10?"零"+CN[r]:(r<20?"一":"")+cnNum(r));
}
function cn2num(s){
  s=String(s).trim().replace(/[０-９]/g,function(c){return String.fromCharCode(c.charCodeAt(0)-65248)}).replace(/〇/g,"零");
  if(/^\d+$/.test(s))return +s;
  var d={"零":0,"一":1,"二":2,"兩":2,"三":3,"四":4,"五":5,"六":6,"七":7,"八":8,"九":9},total=0,num=0;
  for(var i=0;i<s.length;i++){var ch=s[i];
    if(ch in d)num=d[ch];else if(ch==="十"){total+=(num||1)*10;num=0}else if(ch==="百"){total+=(num||1)*100;num=0}else return NaN}
  return total+num;
}
function uid(p){return (p||"x")+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function poemLines(p){return String(p||"").split(/[，,、\n]/).map(function(x){return x.trim()}).filter(Boolean)}
function sorted(t){return t.slips.slice().sort(function(a,b){return a.no-b.no})}
function site(){return state.site||(state.site={})}

/* ---------- 前台 ---------- */
var root=document.getElementById("root");
var isOwner=false,artifactCap=null,adminOpen=false,adminMin=false,dirty=false;
var curTopic=null,curNo=null,accOpen=null,lastFocus=null,lockTopic=null;

function visible(){return state.topics.filter(function(t){return !t.hidden||isOwner})}
function topicById(id){for(var i=0;i<state.topics.length;i++)if(state.topics[i].id===id)return state.topics[i];return null}

function readHash(){
  var h=decodeURIComponent(location.hash||"").replace(/^#/,"").replace(/\s+/g,""),o={};
  try{var q=new URLSearchParams(location.search);if(q.get("t"))o.t=q.get("t");if(q.get("s"))o.s=q.get("s")}catch(e){}
  h.split("&").forEach(function(kv){var p=kv.split("=");if(p[0])o[p[0]]=decodeURIComponent(p[1]||"")});
  var m=/^s(\d+)$/.exec(h);if(m)o.s=m[1];
  return o;
}
function writeHash(){
  var h=curTopic?"#t="+encodeURIComponent(curTopic)+(curNo?"&s="+curNo:""):"";
  try{history.replaceState(null,"",location.pathname+location.search+h)}catch(e){}
}

function render(){
  var S=site(),topics=visible();
  var only=(S.onlyTopic&&topicById(S.onlyTopic))?S.onlyTopic:(lockTopic&&topicById(lockTopic)?lockTopic:null);
  if(only){topics=topics.filter(function(x){return x.id===only});curTopic=only}
  var t=topicById(curTopic);
  if(!t||(t.hidden&&!isOwner))t=topics[0]||null;
  curTopic=t?t.id:null;
  var st=t?(STYLES[t.style]||STYLES.bamboo):STYLES.bamboo;
  root.className="app theme-"+(t&&STYLES[t.style]?t.style:"bamboo");
  var h='<div class="wrap"><header class="hd"><div class="seal" aria-hidden="true">'+esc(S.seal||"緣")+'</div><div><h1>'+esc(S.title||"籤譜")+'</h1>'+(S.sub?'<p>'+esc(S.sub)+'</p>':"")+'</div></header>';
  if(topics.length>1){
    h+='<nav class="sw" aria-label="選擇題目"><div class="sw-label">選擇你的題目</div>';
    if(topics.length<=4){
      h+='<div class="sw-btns">'+topics.map(function(x){return '<button class="tq" data-topic="'+esc(x.id)+'" aria-pressed="'+(x.id===curTopic)+'">'+esc(x.title||"（未命名題目）")+(x.hidden?'<small>隱藏中</small>':"")+'</button>'}).join("")+'</div>';
    }else{
      h+='<select id="topicSel" aria-label="選擇題目">'+topics.map(function(x){return '<option value="'+esc(x.id)+'"'+(x.id===curTopic?" selected":"")+'>'+esc(x.title||"（未命名題目）")+(x.hidden?"（隱藏中）":"")+'</option>'}).join("")+'</select>';
    }
    h+='</nav>';
  }
  if(!t){
    h+='<p class="empty">目前還沒有開放的題目</p>';
  }else{
    var list=sorted(t);
    h+='<section class="hero"><h2>'+esc(t.title||"")+'</h2>'+(t.sub?'<p>'+esc(t.sub)+'</p>':"")+'</section>';
    h+='<section class="look"><form id="lookForm" autocomplete="off"><span class="pre">第</span><input id="lookInput" inputmode="numeric" maxlength="4" placeholder="'+(list.length?"1–"+list[list.length-1].no:"")+'" aria-label="籤號"><span class="pre">籤</span><button class="btn solid" type="submit">看解析</button></form><p class="err" id="lookErr" role="alert"></p></section>';
    h+='<div class="lh"><h3>全部籤詩</h3><span>共 '+list.length+' 支</span></div>';
    if(!list.length)h+='<p class="empty">這個題目還沒有籤</p>';
    else h+=listHtml(t,st,list);
  }
  h+='<div class="cta">'+(S.lineUrl?'<a class="btn ghost" href="'+esc(S.lineUrl)+'" target="_blank" rel="noopener">'+esc(S.lineText||"LINE 預約諮詢")+'</a>':"")+(S.siteUrl?'<a class="btn ghost" href="'+esc(S.siteUrl)+'" target="_blank" rel="noopener">'+esc(S.siteText||"官網")+'</a>':"")+'</div>';
  h+='<p class="foot">'+esc(S.footer||"")+'</p></div>';
  h+='<div class="ov" id="ov" hidden></div>';
  if(isOwner&&(!adminOpen||adminMin))h+='<button class="fab'+(dirty?" dirty":"")+'" id="fab">'+(adminMin?"回到後台":"編輯後台")+'</button>';
  root.innerHTML=h;
  document.body.style.background=getComputedStyle(root).getPropertyValue("--bg")||"";
  if(curNo&&t){var s=findSlip(t,curNo);if(s){if(st.layout==="acc"){}else showModal(t,s,true)}else curNo=null}
}
function listHtml(t,st,list){
  var L=st.layout;
  if(L==="sticks")return '<div class="l-sticks">'+list.map(function(s){return '<button class="stick" data-no="'+s.no+'" aria-label="第'+s.no+'籤 '+esc(s.level)+'"><span class="n">第'+cnNum(s.no)+'籤</span>'+lvTag(s.level)+'</button>'}).join("")+'</div>';
  if(L==="cards")return '<div class="l-cards">'+list.map(function(s){return '<button class="card" data-no="'+s.no+'"><span class="top"><span class="n">'+(s.no<10?"0":"")+s.no+'</span>'+lvTag(s.level)+'</span>'+(lvSub(s.level)?'<span class="csub">'+esc(lvSub(s.level))+'</span>':"")+'<span class="p">'+esc(poemLines(s.poem)[0]||"")+'</span></button>'}).join("")+'</div>';
  if(L==="redp")return '<div class="l-redp">'+list.map(function(s){return '<button class="redp" data-no="'+s.no+'" aria-label="第'+s.no+'籤 '+esc(s.level)+'"><span class="lvs">'+esc(lvMain(s.level))+'</span><span class="n">第'+cnNum(s.no)+'籤</span>'+(lvSub(s.level)?'<span class="sub">'+esc(lvSub(s.level))+'</span>':"")+'</button>'}).join("")+'</div>';
  if(L==="drawer")return '<div class="l-drawer"><div class="g">'+list.map(function(s){return '<button class="drw" data-no="'+s.no+'" aria-label="第'+s.no+'籤 '+esc(s.level)+'"><span class="pl"><b>第'+cnNum(s.no)+'籤</b><small>'+esc(lvMain(s.level))+'</small></span><span class="kn" aria-hidden="true"></span></button>'}).join("")+'</div></div>';
  return '<div class="l-yellow">'+list.map(function(s){return '<button class="ylw" data-no="'+s.no+'" aria-label="第'+s.no+'籤 '+esc(s.level)+'"><span class="top"><span class="n">第'+cnNum(s.no)+'籤</span><span class="seal2">'+esc(lvMain(s.level))+'</span></span>'+(lvSub(s.level)?'<span class="ysub">'+esc(lvSub(s.level))+'</span>':"")+(isVerse(s.poem)?'<span class="vp">'+poemLines(s.poem).map(esc).join("<br>")+'</span>':'<span class="hp">'+esc(s.poem)+'</span>')+'</button>'}).join("")+'</div>';
}
function slipBody(t,st,s){
  var S=site();
  var pm=poemMode(st,s),vs=isVerse(s.poem);
  return '<div class="slip-c '+pm+'"><p class="poem '+pm+(vs?"":" prose")+'">'+(vs?poemLines(s.poem).map(function(x){return '<span>'+esc(x)+'</span>'}).join(""):esc(s.poem))+'</p><div class="read"><h4>'+esc(S.readTitle||"解析")+'</h4>'+readHtml(s.read)+
  ((t.ctaText||t.ctaBtn)?'<div class="r-cta">'+(t.ctaText?'<p>'+esc(t.ctaText)+'</p>':"")+(t.ctaBtn?'<a class="btn solid" href="'+esc(t.ctaUrl||S.lineUrl||DEF_LINE)+'" target="_blank" rel="noopener">'+esc(t.ctaBtn)+'</a>':"")+'</div>':"")+'</div></div>';
}
function findSlip(t,no){for(var i=0;i<t.slips.length;i++)if(t.slips[i].no===no)return t.slips[i];return null}
function openSlip(no){
  var t=topicById(curTopic);if(!t)return;var s=findSlip(t,no);if(!s)return;
  var st=STYLES[t.style]||STYLES.bamboo;
  if(st.layout==="acc"){
    accOpen=accOpen===no?null:no;curNo=accOpen;writeHash();render();
    if(accOpen){var el=document.getElementById("acc-"+no);if(el)el.scrollIntoView({block:"start",behavior:"smooth"})}
    return;
  }
  curNo=no;writeHash();showModal(t,s,false);
}
function showModal(t,s,silent){
  var st=STYLES[t.style]||STYLES.bamboo,list=sorted(t),i=list.indexOf(s),ov=$("#ov");
  if(!ov)return;
  if(ov.hidden&&!silent)lastFocus=document.activeElement;
  ov.innerHTML='<div class="panel" role="dialog" aria-modal="true" aria-labelledby="pTitle"><div class="p-top"><div class="t"><h2 id="pTitle">第'+cnNum(s.no)+'籤</h2>'+lvTag(s.level)+(lvSub(s.level)?'<span class="p-sub">'+esc(lvSub(s.level))+'</span>':"")+'</div><button class="p-close" data-close>關閉</button></div><div class="p-q">'+esc(t.title||"")+'</div><div class="p-body">'+slipBody(t,st,s)+'</div><div class="p-nav"><button data-nav="-1"'+(i<=0?" disabled":"")+'>上一籤</button><button data-nav="1"'+(i>=list.length-1?" disabled":"")+'>下一籤</button></div><p class="foot" style="margin:0;padding:0 22px 14px;border:0;background:var(--soft2)">'+esc(site().footer||"")+'</p></div>';
  ov.hidden=false;ov.scrollTop=0;document.body.style.overflow="hidden";
  var c=ov.querySelector("[data-close]");if(c&&!silent)c.focus();
}
function closeModal(){
  var ov=$("#ov");if(!ov||ov.hidden)return;ov.hidden=true;document.body.style.overflow="";curNo=null;writeHash();
  if(lastFocus&&lastFocus.focus)lastFocus.focus();
}
function step(d){
  var t=topicById(curTopic);if(!t)return;var list=sorted(t),i=list.findIndex(function(x){return x.no===curNo})+d;
  if(list[i]){curNo=list[i].no;writeHash();showModal(t,list[i],false)}
}
function switchTopic(id){curTopic=id;curNo=null;accOpen=null;writeHash();render();var h=$(".hero");if(h)h.scrollIntoView({block:"start",behavior:"smooth"})}

root.addEventListener("click",function(e){
  var b;
  if((b=e.target.closest("[data-topic]")))return switchTopic(b.getAttribute("data-topic"));
  if((b=e.target.closest("[data-no]")))return openSlip(+b.getAttribute("data-no"));
  if(e.target.closest("[data-close]"))return closeModal();
  if((b=e.target.closest("[data-nav]")))return step(+b.getAttribute("data-nav"));
  if(e.target.id==="ov")return closeModal();
  if(e.target.closest("#fab"))return openAdmin();
});
root.addEventListener("change",function(e){if(e.target.id==="topicSel")switchTopic(e.target.value)});
root.addEventListener("submit",function(e){
  if(e.target.id!=="lookForm")return;e.preventDefault();
  var t=topicById(curTopic);if(!t)return;
  var v=$("#lookInput").value.trim().replace(/^第|籤$/g,""),n=cn2num(v),s=findSlip(t,n);
  if(!s){var l=sorted(t);$("#lookErr").textContent=l.length?"請輸入 "+l[0].no+" 到 "+l[l.length-1].no+" 的籤號":"這個題目還沒有籤";return}
  $("#lookErr").textContent="";$("#lookInput").blur();openSlip(n);
});
document.addEventListener("keydown",function(e){
  var ov=$("#ov");if(adminOpen&&!adminMin)return;if(!ov||ov.hidden)return;
  if(e.key==="Escape")closeModal();if(e.key==="ArrowLeft")step(-1);if(e.key==="ArrowRight")step(1);
});

/* ---------- 後台 ---------- */
var adm=null,aTab="topic",aTopic=null,openSlips={},bulkOpen=false;
function markDirty(){dirty=true;status("有修改還沒儲存","")}
function status(msg,cls){var el=adm&&$(".a-status",adm);if(el){el.textContent=msg||"";el.className="a-status"+(cls?" "+cls:"")}}
var frontTimer=null;
function refreshFront(){clearTimeout(frontTimer);frontTimer=setTimeout(function(){if(aTopic&&topicById(aTopic)&&curTopic!==aTopic){curTopic=aTopic;curNo=null;accOpen=null}render()},250)}

function openAdmin(){
  if(!isOwner)return;
  adminOpen=true;adminMin=false;
  if(!adm){adm=document.createElement("div");adm.className="adm";adm.setAttribute("role","dialog");adm.setAttribute("aria-label","籤譜後台");document.body.appendChild(adm);bindAdmin()}
  adm.hidden=false;document.body.style.overflow="hidden";
  if(!aTopic||!topicById(aTopic))aTopic=curTopic||(state.topics[0]&&state.topics[0].id);
  renderAdmin();render();
}
function minimizeAdmin(){adminMin=true;adm.hidden=true;document.body.style.overflow="";if(aTopic)curTopic=aTopic;curNo=null;render();window.scrollTo(0,0)}
function closeAdmin(){adminOpen=false;adminMin=false;if(adm)adm.hidden=true;document.body.style.overflow="";render()}

function renderAdmin(){
  var h='<div class="a-bar"><b>籤譜後台</b><button class="ab" data-a="min">看前台</button><button class="ab pri" data-a="save">儲存</button><button class="ab" data-a="close">關閉</button>'+(window.QP_LOGOUT?'<button class="ab" data-a="logout">登出</button>':"")+'<div class="a-status"></div></div>';
  h+='<div class="a-tabs" role="tablist">'+[["topic","題目與籤"],["site","網站設定"],["backup","備份"]].map(function(x){return '<button class="a-tab" role="tab" data-tab="'+x[0]+'" aria-selected="'+(aTab===x[0])+'">'+x[1]+'</button>'}).join("")+'</div><div class="a-main">';
  if(aTab==="topic")h+=topicTab();else if(aTab==="site")h+=siteTab();else h+=backupTab();
  h+='</div>';
  var y=adm.scrollTop;adm.innerHTML=h;adm.scrollTop=y;
  if(dirty)status("有修改還沒儲存","");
}
function topicTab(){
  var t=topicById(aTopic);
  var h='<div class="a-card"><div class="a-row"><select id="aTopic" aria-label="選擇要編輯的題目">'+state.topics.map(function(x,i){return '<option value="'+esc(x.id)+'"'+(x.id===aTopic?" selected":"")+'>'+(i+1)+'. '+esc(x.title||"（未命名題目）")+(x.hidden?"（隱藏）":"")+'</option>'}).join("")+'</select><button class="ab" data-a="addTopic">＋ 新增題目</button></div>';
  if(!t)return h+'<p>還沒有題目，按「新增題目」開始。</p></div>';
  h+='<label>題目（客人在按鈕或選單上看到的文字）<textarea data-f="title" rows="2">'+esc(t.title)+'</textarea></label>';
  h+='<label>題目下方的說明（可空白）<input data-f="sub" value="'+esc(t.sub)+'"></label>';
  h+='<div class="a-lbl">版面風格</div><div class="a-styles">'+Object.keys(STYLES).map(function(k){var s=STYLES[k];return '<button class="a-style" data-style="'+k+'" aria-pressed="'+(t.style===k)+'"><span class="sw3">'+s.c.map(function(c){return '<i style="background:'+c+'"></i>'}).join("")+'</span><b>'+s.name+'</b><small>'+s.desc+'</small></button>'}).join("")+'</div>';
  h+='<label class="chk"><input type="checkbox" data-f="hidden"'+(t.hidden?" checked":"")+'> 先隱藏，客人看不到</label>';
  h+='<label>解析下方的導流文字<input data-f="ctaText" value="'+esc(t.ctaText)+'"></label>';
  h+='<div class="a-grid2"><label>按鈕文字<input data-f="ctaBtn" value="'+esc(t.ctaBtn)+'"></label><label>按鈕連結（預設是官方 LINE）<input data-f="ctaUrl" value="'+esc(t.ctaUrl)+'" placeholder="https://"></label></div>';
  h+='<label>題目代碼（用在連結，英文或數字）<input data-f="id" value="'+esc(t.id)+'"></label>';
  h+=linkHint(t);
  h+='<div class="a-row"><button class="ab" data-a="up">往前排</button><button class="ab" data-a="down">往後排</button><button class="ab" data-a="dupTopic">複製這個題目</button><button class="ab danger" data-a="delTopic">刪除這個題目</button></div></div>';
  var list=sorted(t),seen={},dup={};list.forEach(function(s){if(seen[s.no])dup[s.no]=1;seen[s.no]=1});
  h+='<div class="a-card"><div class="a-head"><b>籤（'+list.length+' 支）</b><div class="a-row" style="margin:0"><button class="ab" data-a="addSlip">＋ 新增一籤</button><button class="ab" data-a="bulk">批次貼上</button></div></div>';
  if(bulkOpen)h+='<div class="a-sub"><b>批次貼上</b><p style="margin:6px 0;font-size:13px;color:#666">直接貼你平常寫的格式：「第一籤｜上吉」、下一行籤詩、再來是解析。籤和籤之間用 --- 或 ⸻ 分開都可以。</p><label>內容<textarea id="bulkText" rows="10"></textarea></label><label class="chk"><input type="radio" name="bm" value="merge" checked> 加進去（同籤號會被覆蓋）</label><label class="chk"><input type="radio" name="bm" value="replace"> 整個題目的籤全部換掉</label><div class="a-row"><button class="ab pri" data-a="bulkGo">匯入</button><button class="ab" data-a="bulkX">取消</button></div></div>';
  if(Object.keys(dup).length)h+='<p class="a-warn">籤號重複：'+Object.keys(dup).join("、")+'，儲存前要改掉</p>';
  h+=list.map(function(s){return slipEditor(s,dup[s.no])}).join("");
  return h+'</div>';
}
function slipSummary(s,d){return '<b>第'+cnNum(s.no||0)+'籤</b>｜'+esc(s.level)+(d?' <span class="a-warn">籤號重複</span>':"")+'<span class="sp">｜'+esc(poemLines(s.poem)[0]||"（還沒寫籤詩）")+'</span>'}
function slipEditor(s,d){
  return '<details class="a-slip" data-sid="'+esc(s.id)+'"'+(openSlips[s.id]?" open":"")+'><summary>'+slipSummary(s,d)+'</summary><div><div class="a-grid2"><label>籤號<input type="number" min="1" data-s="no" value="'+s.no+'"></label><label>籤等<select data-s="level">'+LEVELS.concat(LEVELS.indexOf(s.level)<0&&s.level?[s.level]:[]).map(function(l){return '<option'+(l===s.level?" selected":"")+'>'+esc(l)+'</option>'}).join("")+'</select></label></div>'+
  '<label>籤詩（四句，用逗號分開）<textarea data-s="poem" rows="2">'+esc(s.poem)+'</textarea></label>'+
  '<label>解析（一行一段；要標重點就用 **兩個星號** 包起來）<textarea data-s="read" rows="9">'+esc((s.read||[]).join("\n"))+'</textarea></label>'+
  '<div class="a-row"><button class="ab" data-a="preview">在前台看這一籤</button><button class="ab danger" data-a="delSlip">刪除這一籤</button></div></div></details>';
}
function topicUrl(id){return location.origin+"/?t="+encodeURIComponent(id)}
function linkHint(t){var u=topicUrl(t.id);return '<div class="a-hint" id="aLink"><b>這個題目的專屬網址</b>（客人打開只會看到這一題）<br><code>'+esc(u)+'</code><div class="a-row" style="margin:8px 0 0"><button class="ab" data-a="copyLink" data-url="'+esc(u)+'">複製網址</button><a class="ab" href="'+esc(u)+'" target="_blank" rel="noopener" style="text-decoration:none">打開看看</a></div>'+(t.hidden?'<p class="a-warn" style="margin:6px 0 0">這個題目目前是隱藏的，客人打開會看不到，記得取消隱藏再儲存。</p>':"")+'</div>'}
function siteTab(){
  var S=site();
  function f(k,label,ph){return '<label>'+label+'<input data-site="'+k+'" value="'+esc(S[k])+'"'+(ph?' placeholder="'+ph+'"':"")+'></label>'}
  var opts='<option value="">顯示全部題目，讓客人自己選</option>'+state.topics.map(function(x){return '<option value="'+esc(x.id)+'"'+(S.onlyTopic===x.id?" selected":"")+'>只顯示：'+esc(x.title||x.id)+'</option>'}).join("");
  return '<div class="a-card"><label>首頁網址（沒有帶題目代碼）要顯示<select data-site="onlyTopic">'+opts+'</select></label>'+f("title","網站標題")+f("sub","標題下方小字")+f("seal","印章字（一個字）")+f("readTitle","解析區塊的標題","例如：羽絜老師解析")+f("lineText","LINE 按鈕文字")+f("lineUrl","LINE 連結","https://")+f("siteText","官網按鈕文字")+f("siteUrl","官網連結","https://")+f("footer","頁尾文字")+'</div>';
}
function backupTab(){
  return '<div class="a-card"><b>匯出</b><p style="font-size:13px;color:#666;margin:6px 0">整份資料都在這裡，可以複製起來另外存一份備份。</p><textarea id="bkOut" rows="8" readonly style="width:100%;border:1px solid #D5D5CF;border-radius:8px;padding:8px;font-size:12px;font-family:monospace">'+esc(JSON.stringify(state,null,1))+'</textarea><div class="a-row"><button class="ab" data-a="copyOut">全選複製</button></div></div>'+
  '<div class="a-card"><b>匯入</b><p style="font-size:13px;color:#666;margin:6px 0">貼上之前匯出的資料，會整份取代目前內容（按儲存之前都還可以關掉不存）。</p><textarea id="bkIn" rows="6" style="width:100%;border:1px solid #D5D5CF;border-radius:8px;padding:8px;font-size:12px;font-family:monospace"></textarea><div class="a-row"><button class="ab" data-a="importIn">套用</button></div></div>';
}

function parseBulk(txt){
  var out=[],cur=null;
  txt.split(/\r?\n/).forEach(function(raw){
    var l=raw.replace(/^\s*#+\s*/,"").trim();
    if(!l||/^[-—⸻_=*\s]{3,}$/.test(l))return;
    var m=/^第\s*([0-9０-９一二三四五六七八九十百零〇兩]+)\s*籤\s*[｜|│:：\-\s]*\s*(.*)$/.exec(plain(l));
    if(m){cur={id:uid("s"),no:cn2num(m[1]),level:m[2].trim()||"平平",poem:"",read:[]};out.push(cur);return}
    if(!cur)return;
    l=l.replace(/^🔮\s*/,"").replace(/^\**\s*解析\s*[:：]?\s*\**\s*/,"").trim();
    if(!l)return;
    if(!cur.poem){cur.poem=plain(l);return}
    cur.read.push(l);
  });
  return out.filter(function(s){return s.no>0});
}
function validate(){
  var errs=[];
  state.topics.forEach(function(t,i){
    var name=t.title?"「"+plain(t.title).slice(0,12)+"」":"第"+(i+1)+"個題目";
    if(!t.title)errs.push(name+"還沒寫題目");
    if(!/^[A-Za-z0-9_-]+$/.test(t.id||""))errs.push(name+"的題目代碼只能用英文、數字");
    var seen={};t.slips.forEach(function(s){if(!(s.no>0))errs.push(name+"有一籤沒有籤號");else if(seen[s.no])errs.push(name+"第"+s.no+"籤重複");seen[s.no]=1});
  });
  var ids={};state.topics.forEach(function(t){if(ids[t.id])errs.push("題目代碼「"+t.id+"」重複");ids[t.id]=1});
  return errs;
}
function head(){
  return '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>'+esc(site().title||"籤譜")+'</title>\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&family=Noto+Serif+TC:wght@500;700;900&display=swap">\n';
}
function buildPage(){
  var SC="scr"+"ipt",css=document.getElementById("css").textContent,app=document.getElementById("app").textContent;
  var json=JSON.stringify(state).replace(/</g,"\\u003c");
  return "<!doctype html>\n<html lang=\"zh-Hant\">\n<head>\n"+head()+"<style id=\"css\">"+css+"</style>\n</head>\n<body>\n<div id=\"root\"></div>\n<"+SC+" type=\"application/json\" id=\"state\">"+json+"</"+SC+">\n<"+SC+" id=\"app\">"+app+"</"+SC+">\n</body>\n</html>\n";
}
var saving=false;
function save(){
  if(saving)return;
  var errs=validate();if(errs.length){status("還不能儲存："+errs.slice(0,3).join("；"),"err");return}
  if(!window.QP_SAVE){status("沒有連上資料庫，無法儲存","err");return}
  saving=true;status("儲存中…","");
  Promise.resolve().then(function(){return window.QP_SAVE(state)}).then(function(){saving=false;dirty=false;status("已儲存，客人重新整理就會看到","ok");render()}).catch(function(e){
    saving=false;status("儲存沒有成功："+((e&&e.message)||"請再按一次"),"err");
  });
}

function armed(b,msg){
  if(b.getAttribute("data-armed")){b.removeAttribute("data-armed");return true}
  var old=b.textContent;b.setAttribute("data-armed","1");b.textContent=msg||"再按一次確認";b.style.background="#B8342C";b.style.color="#fff";b.style.borderColor="#B8342C";
  setTimeout(function(){if(b.isConnected&&b.getAttribute("data-armed")){b.removeAttribute("data-armed");b.textContent=old;b.style.background="";b.style.color="";b.style.borderColor=""}},4000);
  return false;
}
function bindAdmin(){
  adm.addEventListener("click",function(e){
    var b=e.target.closest("[data-tab]");if(b){aTab=b.getAttribute("data-tab");bulkOpen=false;renderAdmin();return}
    b=e.target.closest("[data-style]");
    if(b){var t=topicById(aTopic);if(!t)return;t.style=b.getAttribute("data-style");adm.querySelectorAll("[data-style]").forEach(function(x){x.setAttribute("aria-pressed",x===b)});markDirty();refreshFront();return}
    b=e.target.closest("[data-a]");if(!b)return;
    var a=b.getAttribute("data-a"),t=topicById(aTopic),det=b.closest("[data-sid]"),s=null;
    if(det&&t)t.slips.forEach(function(x){if(x.id===det.getAttribute("data-sid"))s=x});
    if(a==="min")return minimizeAdmin();
    if(a==="logout"){if(dirty&&!armed(b,"還沒儲存，再按一次登出"))return;dirty=false;return window.QP_LOGOUT()}
    if(a==="copyLink"){var u=b.getAttribute("data-url");var done=function(){status("已複製網址","ok")};try{navigator.clipboard.writeText(u).then(done,function(){prompt("長按複製這個網址",u)})}catch(x){prompt("長按複製這個網址",u)}return}
    if(a==="close"){if(dirty&&!armed(b,"還沒儲存，再按一次關閉"))return;return closeAdmin()}
    if(a==="save")return save();
    if(a==="addTopic"){var n={id:"q"+(state.topics.length+1)+Math.random().toString(36).slice(2,5),title:"",sub:"",style:"peach",hidden:true,ctaText:"",ctaBtn:"LINE 找羽絜老師",ctaUrl:DEF_LINE,slips:[]};state.topics.push(n);aTopic=n.id;markDirty();renderAdmin();refreshFront();return}
    if(!t)return;
    if(a==="up"||a==="down"){var i=state.topics.indexOf(t),j=a==="up"?i-1:i+1;if(j<0||j>=state.topics.length)return;state.topics.splice(i,1);state.topics.splice(j,0,t);markDirty();renderAdmin();refreshFront();return}
    if(a==="dupTopic"){var c=JSON.parse(JSON.stringify(t));c.id=t.id+"2";c.title=t.title+"（複製）";c.hidden=true;c.slips.forEach(function(x){x.id=uid("s")});state.topics.splice(state.topics.indexOf(t)+1,0,c);aTopic=c.id;markDirty();renderAdmin();refreshFront();return}
    if(a==="delTopic"){if(!armed(b,"再按一次確認刪除"))return;state.topics.splice(state.topics.indexOf(t),1);aTopic=state.topics[0]&&state.topics[0].id;markDirty();renderAdmin();refreshFront();return}
    if(a==="addSlip"){var mx=t.slips.reduce(function(m,x){return Math.max(m,x.no||0)},0),ns={id:uid("s"),no:mx+1,level:"平平",poem:"",read:[]};t.slips.push(ns);openSlips[ns.id]=1;markDirty();renderAdmin();refreshFront();var el=adm.querySelector('[data-sid="'+ns.id+'"]');if(el)el.scrollIntoView({block:"center"});return}
    if(a==="delSlip"&&s){if(!armed(b,"再按一次確認刪除"))return;t.slips.splice(t.slips.indexOf(s),1);markDirty();renderAdmin();refreshFront();return}
    if(a==="preview"&&s){minimizeAdmin();setTimeout(function(){openSlip(s.no)},50);return}
    if(a==="bulk"){bulkOpen=true;renderAdmin();var bt=$("#bulkText");if(bt)bt.focus();return}
    if(a==="bulkX"){bulkOpen=false;renderAdmin();return}
    if(a==="bulkGo"){
      var items=parseBulk($("#bulkText").value),mode=(adm.querySelector('input[name="bm"]:checked')||{}).value;
      if(!items.length){status("沒有讀到籤。每一籤要用「第幾籤｜籤等」開頭","err");return}
      if(mode==="replace")t.slips=items;else items.forEach(function(x){var old=findSlip(t,x.no);if(old)t.slips.splice(t.slips.indexOf(old),1,x);else t.slips.push(x)});
      bulkOpen=false;markDirty();renderAdmin();refreshFront();status("匯入了 "+items.length+" 支籤，還沒儲存","ok");return}
    if(a==="copyOut"){var o=$("#bkOut");o.focus();o.select();try{document.execCommand("copy");status("已複製","ok")}catch(x){status("請長按文字框手動複製","")}return}
    if(a==="importIn"){try{var d=JSON.parse($("#bkIn").value);if(!d||!Array.isArray(d.topics))throw 0;d.topics.forEach(function(x){x.slips=x.slips||[];x.slips.forEach(function(y){y.id=y.id||uid("s");y.read=y.read||[]})});state=d;aTopic=state.topics[0]&&state.topics[0].id;curTopic=aTopic;markDirty();renderAdmin();refreshFront();status("已套用，還沒儲存","ok")}catch(x){status("資料格式不對，沒有套用","err")}return}
  });
  adm.addEventListener("change",function(e){if(e.target.getAttribute&&e.target.getAttribute("data-site")==="onlyTopic"){site().onlyTopic=e.target.value;markDirty();refreshFront();return}if(e.target.id==="aTopic"){aTopic=e.target.value;bulkOpen=false;renderAdmin();refreshFront()}});
  adm.addEventListener("toggle",function(e){var d=e.target;if(d.matches&&d.matches("[data-sid]")){if(d.open)openSlips[d.getAttribute("data-sid")]=1;else delete openSlips[d.getAttribute("data-sid")]}},true);
  adm.addEventListener("input",function(e){
    var el=e.target,t=topicById(aTopic),k;
    if((k=el.getAttribute("data-site"))){site()[k]=el.value;markDirty();refreshFront();return}
    if(!t)return;
    if((k=el.getAttribute("data-f"))){
      if(k==="hidden")t.hidden=el.checked;
      else if(k==="id"){var v=el.value.trim();t.id=v;aTopic=v;curTopic=v;var lk=$("#aLink");if(lk)lk.outerHTML=linkHint(t)}
      else t[k]=el.value;
      if(k==="title"||k==="hidden"||k==="id"){var sel=$("#aTopic");if(sel&&sel.options[sel.selectedIndex]){sel.options[sel.selectedIndex].textContent=(state.topics.indexOf(t)+1)+". "+(t.title||"（未命名題目）")+(t.hidden?"（隱藏）":"");if(k==="id")sel.options[sel.selectedIndex].value=t.id}}
      markDirty();refreshFront();return}
    if((k=el.getAttribute("data-s"))){
      var det=el.closest("[data-sid]"),s=null;t.slips.forEach(function(x){if(x.id===det.getAttribute("data-sid"))s=x});if(!s)return;
      if(k==="no")s.no=parseInt(el.value,10)||0;
      else if(k==="read")s.read=el.value.split(/\n/).map(function(x){return x.trim()}).filter(Boolean);
      else s[k]=el.value;
      var sm=det.querySelector("summary");if(sm)sm.innerHTML=slipSummary(s,false);
      markDirty();refreshFront();
    }
  });
}

/* ---------- 啟動 ---------- */
var hs=readHash();
if(hs.t&&topicById(hs.t)){curTopic=hs.t;lockTopic=hs.t}else if(state.topics[0])curTopic=state.topics[0].id;
window.addEventListener("hashchange",function(){var o=readHash();if(o.t&&topicById(o.t)){lockTopic=o.t;curTopic=o.t;curNo=o.s?parseInt(o.s,10)||null:null;render()}});
if(hs.s){var t0=topicById(curTopic);var n0=parseInt(hs.s,10);if(t0&&findSlip(t0,n0)){if((STYLES[t0.style]||{}).layout==="acc")accOpen=n0;else curNo=n0}}
render();
if(accOpen){var ae=document.getElementById("acc-"+accOpen);if(ae)ae.scrollIntoView({block:"start"})}

if(window.QP_MODE==="admin"){isOwner=true;openAdmin()}

window.addEventListener("beforeunload",function(e){if(dirty&&!saving){e.preventDefault();e.returnValue=""}});

/* 防複製（後台與輸入框除外） */
function allowed(e){var t=e.target;return t&&t.closest&&t.closest("input,textarea,select,.adm")}
["copy","cut","contextmenu","selectstart","dragstart"].forEach(function(ev){document.addEventListener(ev,function(e){if(!allowed(e))e.preventDefault()})});
document.addEventListener("keydown",function(e){var k=(e.key||"").toLowerCase();if(allowed(e))return;if((e.ctrlKey||e.metaKey)&&["c","x","a","s","p","u"].indexOf(k)>=0)e.preventDefault()});
})();
