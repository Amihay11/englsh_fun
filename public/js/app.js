// == SFX ==
// ══ SFX ══
const SFX={ctx:null,init(){if(!this.ctx)try{this.ctx=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}},
play(type){this.init();if(!this.ctx)return;const c=this.ctx,t=c.currentTime;
if(type==='correct'){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(523,t);o.frequency.setValueAtTime(659,t+.08);o.frequency.setValueAtTime(784,t+.16);g.gain.setValueAtTime(.18,t);g.gain.exponentialRampToValueAtTime(.01,t+.35);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+.35);}
else if(type==='wrong'){const o=c.createOscillator(),g=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(200,t);o.frequency.setValueAtTime(150,t+.15);g.gain.setValueAtTime(.12,t);g.gain.exponentialRampToValueAtTime(.01,t+.3);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+.3);}
else if(type==='complete'){[523,659,784,1047].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.15,t+i*.12);g.gain.exponentialRampToValueAtTime(.01,t+i*.12+.35);o.connect(g);g.connect(c.destination);o.start(t+i*.12);o.stop(t+i*.12+.4);});}
else if(type==='click'){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=880;g.gain.setValueAtTime(.08,t);g.gain.exponentialRampToValueAtTime(.01,t+.08);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+.1);}
}};


// == STATE ==
const REVIEW_MS=2*24*3600000;
const IS_NATIVE=!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());
let profiles=[],activeId=null,LS={},allProfileData={};
const sProf=()=>localStorage.setItem('efun7_p',JSON.stringify(profiles));
const sActive=()=>localStorage.setItem('efun7_a',activeId);
let _slsTimer=null;
const sLS=()=>{
  if(!activeId)return;
  localStorage.setItem('efun7_d_'+activeId,JSON.stringify(LS));
  if(!IS_NATIVE){clearTimeout(_slsTimer);_slsTimer=setTimeout(()=>fetch('/api/data/'+activeId,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(LS)}).catch(()=>{}),500);}
};
async function loadAll(){
  activeId=localStorage.getItem('efun7_a');
  if(IS_NATIVE){try{profiles=JSON.parse(localStorage.getItem('efun7_p')||'[]');}catch(e){profiles=[];}return;}
  try{profiles=await fetch('/api/profiles').then(r=>r.json());}
  catch(e){try{profiles=JSON.parse(localStorage.getItem('efun7_p')||'[]');}catch(e2){profiles=[];}}
}
async function loadLS(){
  if(!activeId)return;
  try{const data=await fetch('/api/data/'+activeId).then(r=>r.json());LS=data&&typeof data==='object'?data:{};}
  catch(e){try{LS=JSON.parse(localStorage.getItem('efun7_d_'+activeId)||'{}');}catch(e2){LS={};}}
  LS.lc=LS.lc||{};LS.pc=LS.pc||{};LS.sc=LS.sc||{};LS.xp=LS.xp||0;LS.streak=LS.streak||0;LS.writes=LS.writes||0;
  LS.learnedWords=LS.learnedWords||{};LS.lastDay=LS.lastDay||null;LS.completedAt=LS.completedAt||{};
  LS.achievements=LS.achievements||[];LS.memWins=LS.memWins||0;LS.storiesDone=LS.storiesDone||0;
  LS.dailyDate=LS.dailyDate||null;LS.dailyDone=LS.dailyDone||false;
  LS.srs=LS.srs||{};LS.tipsShown=LS.tipsShown||[];LS.themesDone=LS.themesDone||0;LS.fcDone=LS.fcDone||0;LS.sessionMistakes=[];
  LS.settings=LS.settings||{ttsSpeed:0.72,exercises:{intro:1,listen:1,write_letter:1,mcq_pic:1,dictation:1,write_word:1,mcq_letter:1,sentence:1},devMode:false,darkMode:false};
  if(LS.settings.darkMode)document.body.classList.add('dark');
}

const getDone=i=>LS.lc[i]||0;const getPDone=id=>LS.pc[id]||0;const getSDone=id=>LS.sc[id]||0;
const learnedCount=()=>LETTERS.filter((_,i)=>getDone(i)>=4).length;
const isUnlocked=i=>LS.settings.devMode||i===0||getDone(i-1)>=4||getDone(i)>0;
const isPUnlocked=pi=>LS.settings.devMode||learnedCount()>=10&&(pi===0||getPDone(PHRASES[pi-1].id)>0);
const isSUnlocked=si=>LS.settings.devMode||learnedCount()>=STORIES[si].reqLetters&&(si===0||getSDone(STORIES[si-1].id)>0);
const needsReview=i=>{const t=LS.completedAt[i];return getDone(i)>=4&&t&&(Date.now()-t>REVIEW_MS);};
const totalLearnedWords=()=>Object.keys(LS.learnedWords).length;
function updateStreak(){const today=new Date().toDateString();if(LS.lastDay!==today){const y=new Date(Date.now()-86400000).toDateString();LS.streak=(LS.lastDay===y)?LS.streak+1:1;LS.lastDay=today;sLS();}}
function markLetterWords(idx){const lt=LETTERS[idx];[{w:lt.word,phon:lt.wPhon,he:lt.wHe,em:lt.wEm},...lt.more.map(m=>({w:m.w,phon:m.phon,he:m.he,em:m.em}))].forEach(({w,phon,he,em})=>{if(!LS.learnedWords[w.toLowerCase()])LS.learnedWords[w.toLowerCase()]={w,phon,he,em,letterL:lt.L,ts:Date.now()};});}
function markPhraseWords(phIdx){PHRASES[phIdx].items.forEach(item=>{const k=item.en.toLowerCase().replace(/[!?.]/g,'').trim();if(!LS.learnedWords[k])LS.learnedWords[k]={w:item.en,phon:item.phon,he:item.he,em:item.em,ts:Date.now()};});}
// ══ WRITING FILTER ══
function getLearnedLetterSet(){return new Set(LETTERS.filter((_,i)=>getDone(i)>0).map(l=>l.L.toUpperCase()));}
function isWordWritable(word){const ll=getLearnedLetterSet();return[...word.toUpperCase()].every(ch=>/[A-Z]/.test(ch)?ll.has(ch):true);}
function getWritableWords(lt){const all=[{w:lt.word,phon:lt.wPhon,he:lt.wHe,em:lt.wEm},...lt.more];const w=all.filter(x=>isWordWritable(x.w));return w.length?w:all.slice(0,1);}

// ══ ACHIEVEMENTS ══
function checkAchievements(){
  let newOnes=[];
  ACHIEVEMENTS.forEach(a=>{if(!LS.achievements.includes(a.id)&&a.check()){LS.achievements.push(a.id);newOnes.push(a);}});
  if(newOnes.length){sLS();newOnes.forEach((a,i)=>setTimeout(()=>showAchPopup(a),i*1200));}
}
function showAchPopup(a){const d=document.createElement('div');d.className='ach-popup';d.innerHTML=`<div class="ach-popup-em">${a.em}</div><div>🏅 ${a.title}!</div>`;document.body.appendChild(d);SFX.play('complete');setTimeout(()=>d.remove(),3000);}

// ══ VFX ══
const CC=['#5838fa','#a855f7','#ffd600','#ff4b4b','#58cc02','#00bcd4','#ff9800'];
function launchConfetti(){for(let i=0;i<50;i++)setTimeout(()=>{const e=document.createElement('div');e.className='confetti-particle';e.style.cssText=`left:${Math.random()*100}vw;top:-10px;background:${CC[Math.floor(Math.random()*CC.length)]};width:${6+Math.random()*10}px;height:${6+Math.random()*10}px;border-radius:${Math.random()>.5?'50%':'2px'};animation-duration:${1.5+Math.random()*2}s;`;document.body.appendChild(e);setTimeout(()=>e.remove(),3500);},i*30);}
function showXPFloat(n){const o=document.getElementById('xpFloat');if(o)o.remove();const e=document.createElement('div');e.id='xpFloat';e.textContent='+'+n+' XP';e.style.cssText='left:50%;top:50%;transform:translateX(-50%);';document.body.appendChild(e);setTimeout(()=>e.remove(),1000);}
function showCorrectBurst(){const o=document.createElement('div');o.className='correct-overlay';o.innerHTML='<div class="correct-burst">✅</div>';document.body.appendChild(o);setTimeout(()=>o.remove(),600);}

// ══ UTILS ══
async function speak(txt){
  const rate=(LS.settings&&LS.settings.ttsSpeed)||0.72;
  if(IS_NATIVE){
    try{
      const TTS=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.TextToSpeech;
      if(TTS){await TTS.speak({text:txt,lang:'en-US',rate,pitch:1.0,volume:1.0});return;}
    }catch(e){}
  }
  if(!window.speechSynthesis)return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(txt);u.lang='en-US';u.rate=rate;
  const trySpeak=()=>{const vs=speechSynthesis.getVoices();if(vs.length){const v=vs.find(x=>x.lang.startsWith('en'));if(v)u.voice=v;}speechSynthesis.speak(u);};
  if(speechSynthesis.getVoices().length>0)trySpeak();
  else{speechSynthesis.addEventListener('voiceschanged',trySpeak,{once:true});setTimeout(trySpeak,800);}
}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('on');setTimeout(()=>t.classList.remove('on'),2300);}
const shuf=a=>a.slice().sort(()=>Math.random()-0.5);
function sw(id){document.querySelectorAll('.sc').forEach(s=>s.classList.remove('on'));document.getElementById(id).classList.add('on');}
function setNav(id){document.querySelectorAll('.bn').forEach(b=>b.classList.remove('on'));const e=document.getElementById(id);if(e)e.classList.add('on');}
const mk=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!==undefined)e.innerHTML=html;return e;};

// ══ PROFILES ══

// == PROFILES ==
function renderProfiles(){const g=document.getElementById('profGrid');g.innerHTML='';profiles.forEach(p=>{const st=allProfileData[p.id]||{};st.lc=st.lc||{};st.learnedWords=st.learnedWords||{};const lc=LETTERS.filter((_,i)=>st.lc[i]>0).length;const c=mk('div','prof-card');c.innerHTML=`<div class="prof-av">${p.avatar}</div><div class="prof-name">${p.name}</div><div class="prof-stats">⭐ ${st.xp||0} XP · 📖 ${lc} אותיות</div><div class="prof-del" onclick="delProf(event,'${p.id}')">🗑</div>`;c.onclick=e=>{if(e.target.classList.contains('prof-del'))return;selProf(p.id);};g.appendChild(c);});if(profiles.length<4){const a=mk('div','prof-card add','<div class="prof-av">➕</div><div class="prof-name">חדש</div>');a.onclick=openModal;g.appendChild(a);}}
async function selProf(id){activeId=id;sActive();await loadLS();showHome();}
function switchProfile(){sw('scProf');renderProfiles();}
let selAv='😊';
function openModal(){selAv='😊';const g=document.getElementById('avGrid');g.innerHTML='';AVATARS.forEach(av=>{const d=mk('div','av-opt'+(av===selAv?' sel':''),av);d.onclick=()=>{document.querySelectorAll('.av-opt').forEach(x=>x.classList.remove('sel'));d.classList.add('sel');selAv=av;};g.appendChild(d);});document.getElementById('nameInput').value='';document.getElementById('modalBg').classList.remove('hidden');}
function closeModal(){document.getElementById('modalBg').classList.add('hidden');}
async function createProfile(){const n=document.getElementById('nameInput').value.trim();if(!n){toast('נא להכניס שם!');return;}if(IS_NATIVE){const id='u'+Date.now();const prof={id,name:n,avatar:selAv};profiles.push(prof);allProfileData[prof.id]={};sProf();}else{try{const prof=await fetch('/api/profiles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:n,avatar:selAv})}).then(r=>r.json());profiles.push(prof);allProfileData[prof.id]={};sProf();}catch(err){toast('שגיאה');}}closeModal();renderProfiles();}
async function delProf(e,id){e.stopPropagation();if(!confirm('למחוק?'))return;if(!IS_NATIVE){try{await fetch('/api/profiles/'+id,{method:'DELETE'});}catch(err){}}profiles=profiles.filter(p=>p.id!==id);delete allProfileData[id];localStorage.removeItem('efun7_d_'+id);sProf();renderProfiles();}

function renderDailyBanner(){
  const b=document.getElementById('dailyBanner');const today=new Date().toDateString();
  if(LS.dailyDate!==today){LS.dailyDone=false;LS.dailyDate=today;sLS();}
  if(learnedCount()<2){b.innerHTML='';return;}
  if(LS.dailyDone){b.innerHTML=`<div class="daily-banner done"><div class="daily-banner-em">✅</div><div class="daily-banner-body"><div class="daily-banner-title">אתגר יומי — הושלם!</div><div class="daily-banner-sub">חזור מחר לאתגר חדש</div></div><div class="daily-banner-xp">+25</div></div>`;return;}
  b.innerHTML=`<div class="daily-banner" onclick="startDaily()"><div class="daily-banner-em">⚡</div><div class="daily-banner-body"><div class="daily-banner-title">אתגר יומי!</div><div class="daily-banner-sub">ענה נכון וקבל בונוס</div></div><div class="daily-banner-xp">+25 XP</div></div>`;
}
function startDaily(){
  const learned=LETTERS.filter((_,i)=>getDone(i)>0);const lt=learned[Math.floor(Math.random()*learned.length)];
  const dist=shuf(learned.filter(x=>x.L!==lt.L)).slice(0,3);
  isPhrase=false;curIdx=LETTERS.indexOf(lt);curStep=0;hearts=3;mistakes=0;stepDone=false;writeAttempts=0;isDailyChallenge=true;
  document.getElementById('lTitle').textContent='⚡ אתגר יומי';
  sw('scLesson');
  // Just one MCQ question
  const steps=[{type:'mcq_pic',lt,dist}];dailySteps=steps;renderStep();
}
let isDailyChallenge=false,dailySteps=[];

// ══ GROUP REVIEW ══
function startGroupReview(from,to){
  const letters=LETTERS.slice(from,to).map((_,j)=>from+j);
  let qs=[],qi=0,score=0;
  letters.forEach(idx=>{
    const lt=LETTERS[idx];
    const dist=shuf(LETTERS.filter((_,j)=>j!==idx&&getDone(j)>0)).slice(0,3);
    if(dist.length>=3){qs.push({lt,dist,type:'pic'});qs.push({lt,dist,type:'letter'});}
  });
  qs=shuf(qs).slice(0,8);
  isPhrase=false;isDailyChallenge=false;curIdx=from;hearts=3;mistakes=0;stepDone=false;
  document.getElementById('lTitle').textContent='📝 חזרה';
  sw('scLesson');
  const reviewSteps=qs.map(q=>q.type==='pic'?{type:'mcq_pic',lt:q.lt,dist:q.dist}:{type:'mcq_letter',lt:q.lt,dist:q.dist});
  dailySteps=reviewSteps;isDailyChallenge=true;
  const ri=Math.floor(from/5);
  const _origAdv=advance;
  window._reviewOnDone=()=>{LS.rc=LS.rc||{};LS.rc[ri]=(LS.rc[ri]||0)+1;sLS();showHome();toast('📝 חזרה הושלמה! +30 XP');LS.xp+=30;sLS();};
  renderStep();
}
function startTopicLesson(topic){
  sw('scLesson');document.getElementById('lTitle').textContent=topic.emoji+' '+topic.title;
  hearts=3;mistakes=0;stepDone=false;isDailyChallenge=false;isPhrase=false;LS.tc=LS.tc||{};
  const done=LS.tc[topic.id]||0;
  const words=topic.words;
  let step=done;
  function renderTopicStep(){
    document.getElementById('lStep').textContent=(step+1)+'/'+words.length;
    document.getElementById('lProgFill').style.width=(step/words.length*100)+'%';
    document.getElementById('lHearts').textContent='❤️'.repeat(hearts)+'🖤'.repeat(3-hearts);
    if(step>=words.length){LS.tc[topic.id]=words.length;sLS();launchConfetti();sw('scComp');document.getElementById('cTrophy').textContent='🌍';document.getElementById('cTitle').textContent='!כל הכבוד';document.getElementById('cBig').textContent=topic.emoji;document.getElementById('cSmall').textContent=topic.title;document.getElementById('cWordBox').textContent=words.length+' מילים!';document.getElementById('cStars').textContent='⭐⭐⭐';document.getElementById('cXP').textContent='+'+words.length*5+' XP';LS.xp+=words.length*5;sLS();return;}
    const w=words[step];const b=document.getElementById('lesBody');b.innerHTML='';
    // Show word card + MCQ hebrew→english
    const others=shuf(words.filter(x=>x!==w)).slice(0,3);
    if(others.length<3){step++;LS.tc[topic.id]=step;sLS();renderTopicStep();return;}
    b.appendChild(mk('div','card center anim-slideUp',`<div style="font-size:52px">${w.em}</div><div style="font-size:20px;font-weight:900;letter-spacing:1px">${w.en}</div><div style="font-size:13px;color:#a855f7">📢 ${w.phon}</div><div style="font-size:13px;color:#555">= ${w.he}</div>`));
    speak(w.en);
    const g=mk('div','mcq-opts anim-slideUp');
    const opts=shuf([{w:w.he,ok:true},...others.map(x=>({w:x.he,ok:false}))]);
    b.appendChild(mk('div','mcq-prompt','מה הפירוש?'));
    opts.forEach(o=>{const bt=mk('button','mcq-opt');bt.textContent=o.w;bt.onclick=()=>{if(stepDone)return;stepDone=true;g.querySelectorAll('button').forEach(x=>x.disabled=true);if(o.ok){bt.classList.add('ok');SFX.play('correct');LS.xp+=5;LS.learnedWords[w.en.toLowerCase()]={w:w.en,phon:w.phon,he:w.he,em:w.em,ts:Date.now()};step++;LS.tc[topic.id]=step;sLS();setTimeout(()=>{stepDone=false;renderTopicStep();},700);}else{bt.classList.add('no');g.querySelectorAll('button').forEach(x=>{if(x.textContent===w.he)x.classList.add('ok');});SFX.play('wrong');if(hearts>0){hearts--;document.getElementById('lHearts').textContent='❤️'.repeat(hearts)+'🖤'.repeat(3-hearts);}setTimeout(()=>{stepDone=false;},600);}};g.appendChild(bt);});
    b.appendChild(g);
  }
  renderTopicStep();
  document.getElementById('lProgFill').style.width='0%';
}

// ══ HOME ══
function showHome(){
  sw('scHome');setNav('bnHome');
  const p=profiles.find(x=>x.id===activeId)||{avatar:'😊',name:'?'};
  document.getElementById('hAv').textContent=p.avatar;document.getElementById('hName').textContent=p.name;
  const lvl=Math.floor(LS.xp/200)+1;document.getElementById('hXpFill').style.width=Math.min(100,(LS.xp%200)/2)+'%';
  document.getElementById('hXpTxt').textContent=LS.xp+'/'+lvl*200+' XP';document.getElementById('hLvl').textContent='רמה '+lvl;
  document.getElementById('hStreak').textContent=LS.streak+'🔥';document.getElementById('hLearned').textContent=learnedCount();
  document.getElementById('hWords').textContent=totalLearnedWords();document.getElementById('hStars').textContent=Object.values(LS.lc).reduce((a,s)=>a+s,0);
  renderDailyBanner();buildPath();
}
function buildPath(){
  const w=document.getElementById('pathWrap');w.innerHTML='';let lastGrp=0,activeNode=null;
  const subL=['📖','🎯','🎮','⚡','🌟'];
  LS.rc=LS.rc||{};LS.tc=LS.tc||{};
  LETTERS.forEach((lt,i)=>{
    if(lt.grp!==lastGrp){lastGrp=lt.grp;const g=mk('div','grp-hdr');g.innerHTML=`<div class="grp-dot" style="background:${lt.gColor}"></div><div class="grp-title">${lt.gName}</div><div class="grp-line"></div>`;w.appendChild(g);const n=mk('div','path-nodes');n.id='grp'+lt.grp;w.appendChild(n);}
    const prog=getDone(i),unlocked=isUnlocked(i),full=prog>=4,review=full&&needsReview(i);
    const state=review?'n-review':full?'n-done':(unlocked&&prog>0)?'n-active':unlocked?'n-active':'n-locked';
    const nd=mk('div','node '+state);nd.id='node'+i;
    const dots=prog>0&&prog<5?`<div style="display:flex;gap:2px;margin-top:3px">${[0,1,2,3,4].map(s=>`<div style="width:11px;height:4px;border-radius:2px;background:${s<prog?'#5838fa':'#ddd'}"></div>`).join('')}</div>`:'';
    const sub=prog>0&&prog<5?`<div style="font-size:9px;color:#a855f7;margin-top:1px">${subL[Math.min(4,prog)]} שלב ${prog+1}/5</div>`:'';
    nd.innerHTML=`<div class="node-circle"><div class="node-big">${lt.L}</div><div class="node-lbl">${lt.l}</div></div>${full?'<div class="node-stars">⭐⭐⭐⭐⭐</div>':''}${dots}<div class="node-name">${lt.wEm} ${lt.word}</div><div class="node-phon">${lt.wPhon}</div>${sub}${review?'<div class="node-review">🔄</div>':''}${!unlocked?'<div class="node-lock">🔒</div>':''}`;
    if(unlocked){nd.onclick=()=>startLesson(i);if(!full&&!activeNode)activeNode=nd;}
    else nd.onclick=()=>toast('🔒 סיים: '+LETTERS[i-1].L);
    document.getElementById('grp'+lt.grp).appendChild(nd);
    // Review node every 5 letters
    if((i+1)%5===0){const ri=Math.floor(i/5);const rdone=LS.rc[ri]>0;const runlocked=LETTERS.slice(i-4,i+1).every((_,j)=>getDone(i-4+j)>=4);const rn=mk('div','node '+(rdone?'n-done':runlocked?'n-active':'n-locked'));rn.innerHTML=`<div class="node-circle" style="background:linear-gradient(135deg,#ffd600,#ff8f00)"><div class="node-big" style="font-size:20px">📝</div></div>${rdone?'<div class="node-stars">⭐</div>':''}<div class="node-name" style="color:#ff8f00;font-weight:800">חזרה ${ri+1}</div>${!runlocked?'<div class="node-lock">🔒</div>':''}`;if(runlocked){rn.onclick=()=>startGroupReview(i-4,i+1);if(!rdone&&!activeNode)activeNode=rn;}else rn.onclick=()=>toast('🔒 סיים 5 אותיות קודם');document.getElementById('grp'+lt.grp).appendChild(rn);}
  });
  // Phrases
  const ph=mk('div','grp-hdr');ph.innerHTML=`<div class="grp-dot" style="background:#e65100"></div><div class="grp-title">💬 ביטויים</div><div class="grp-line"></div>`;w.appendChild(ph);
  if(learnedCount()<10&&!LS.settings.devMode){w.appendChild(mk('div','',`<div style="text-align:center;padding:10px 16px;font-size:13px;color:#aaa;background:white;border-radius:16px;margin:4px 16px;border:1.5px dashed #e8e0ff;">🔒 למד ${10-learnedCount()} אותיות נוספות</div>`));}
  else{const pn=mk('div','path-nodes');PHRASES.forEach((p,pi)=>{const d=getPDone(p.id),u=isPUnlocked(pi),st=d?'n-done':u?'n-active':'n-locked';const n=mk('div','node '+st);n.innerHTML=`<div class="node-circle" style="background:linear-gradient(135deg,#e65100,#bf360c)"><div class="node-big">${p.emoji}</div></div>${d?'<div class="node-stars">'+'⭐'.repeat(Math.min(d,3))+'</div>':''}<div class="node-name">${p.title}</div>${!u?'<div class="node-lock">🔒</div>':''}`;if(u){n.onclick=()=>startPhraseLesson(pi);if(!d&&!activeNode)activeNode=n;}else n.onclick=()=>toast('🔒');pn.appendChild(n);});w.appendChild(pn);}
  // Stories
  const sh=mk('div','grp-hdr');sh.innerHTML=`<div class="grp-dot" style="background:#00897b"></div><div class="grp-title">📖 סיפורים</div><div class="grp-line"></div>`;w.appendChild(sh);
  const sn=mk('div','path-nodes');
  STORIES.forEach((s,si)=>{const d=getSDone(s.id),u=isSUnlocked(si),st=d?'n-done':u?'n-active':'n-locked';const n=mk('div','node '+st);n.innerHTML=`<div class="node-circle" style="background:linear-gradient(135deg,#00897b,#004d40)"><div class="node-big">${s.emoji}</div></div>${d?'<div class="node-stars">⭐</div>':''}<div class="node-name">${s.titleHe}</div>${!u?'<div class="node-lock">🔒</div>':''}`;if(u){n.onclick=()=>startStory(si);if(!d&&!activeNode)activeNode=n;}else n.onclick=()=>toast('🔒 למד '+s.reqLetters+' אותיות');sn.appendChild(n);});
  w.appendChild(sn);
  // Topics
  const th=mk('div','grp-hdr');th.innerHTML=`<div class="grp-dot" style="background:#f57f17"></div><div class="grp-title">🌍 נושאים</div><div class="grp-line"></div>`;w.appendChild(th);
  if(learnedCount()<5&&!LS.settings.devMode){w.appendChild(mk('div','',`<div style="text-align:center;padding:10px 16px;font-size:13px;color:#aaa;background:white;border-radius:16px;margin:4px 16px;border:1.5px dashed #ffe082;">🔒 למד ${5-learnedCount()} אותיות נוספות</div>`));}
  else{const tn=mk('div','path-nodes');THEMES.forEach(topic=>{const d=LS.tc[topic.id]||0,u=learnedCount()>=5||LS.settings.devMode,st=d>=topic.words.length?'n-done':u?'n-active':'n-locked';const n=mk('div','node '+st);n.innerHTML=`<div class="node-circle" style="background:linear-gradient(135deg,${topic.color},${topic.color}aa)"><div class="node-big" style="font-size:26px">${topic.emoji}</div></div>${d>=topic.words.length?'<div class="node-stars">⭐</div>':d>0?`<div style="font-size:9px;color:#f57f17;margin-top:2px">${d}/${topic.words.length} מילים</div>':''}<div class="node-name">${topic.title}</div>${!u?'<div class="node-lock">🔒</div>':''}`;if(u){n.onclick=()=>startTopicLesson(topic);if(d<topic.words.length&&!activeNode)activeNode=n;}else n.onclick=()=>toast('🔒');tn.appendChild(n);});w.appendChild(tn);}
  if(activeNode)setTimeout(()=>activeNode.scrollIntoView({behavior:'smooth',block:'center'}),300);
}

// ══ LESSON ENGINE ══
let curIdx=0,curStep=0,hearts=3,mistakes=0,stepDone=false,writeAttempts=0,isPhrase=false,curPhraseIdx=0;

function getSteps(idx){
  const lt=LETTERS[idx],ex=LS.settings.exercises;
  const others=LETTERS.filter((_,i)=>i!==idx&&getDone(i)>=4);
  const pool=others.length>=3?others:LETTERS.filter((_,i)=>i!==idx).slice(0,4);
  const dist=shuf(pool).slice(0,3);
  const allW=[{w:lt.word,phon:lt.wPhon,he:lt.wHe,em:lt.wEm},...lt.more];
  const sub=Math.min(4,LS.lc[idx]||0);
  if(sub===0)return[{type:'intro',lt},{type:'listen',lt},{type:'write_letter',lt}];
  if(sub===1)return[{type:'mcq_pic',lt,dist},{type:'true_false',lt,allW},{type:'write_word',lt}];
  if(sub===2)return[{type:'scramble',lt},{type:'dictation',lt},{type:'catch_word',lt,dist,allW}];
  if(sub===3)return[{type:'speed_round',lt,dist,allW},{type:'mcq_letter',lt,dist},{type:'sentence',lt}];
  return[{type:'dictation',lt},{type:'mcq_pic',lt,dist},{type:'sentence',lt},{type:'write_word',lt}];
}
function startLesson(idx){isPhrase=false;isDailyChallenge=false;curIdx=idx;curStep=0;hearts=3;mistakes=0;stepDone=false;writeAttempts=0;LS.sessionMistakes=[];const lt=LETTERS[idx];const sub=Math.min(3,LS.lc[idx]||0);const subN=['📖 לומדים','🎯 מתרגלים','🎮 משחקים','⚡ אתגר'];document.getElementById('lTitle').textContent=lt.L+' — '+subN[sub]+' ('+(sub+1)+'/4)';sw('scLesson');SFX.init();renderStep();}
function exitLesson(){if(confirm('לצאת?'))showHome();}
function loseHeart(){if(hearts>0){hearts--;SFX.play('wrong');}document.getElementById('lHearts').textContent='❤️'.repeat(hearts)+'🖤'.repeat(3-hearts);if(hearts===0)setTimeout(()=>{sw('scGameOver');
  // Show mistakes
  const rl=document.getElementById('reviewList');rl.innerHTML='';
  const uniq=[...new Set(LS.sessionMistakes||[])];
  uniq.slice(0,5).forEach(w=>{const wdata=LS.learnedWords[w.toLowerCase()]||{em:'📝',he:'?'};rl.innerHTML+=`<div class="review-item"><div class="review-item-em">${wdata.em||'📝'}</div><div><div class="review-item-word">${w}</div><div class="review-item-he">${wdata.he||''}</div></div></div>`;});
  if(!uniq.length)rl.innerHTML='<div style="color:rgba(255,255,255,.5);text-align:center;padding:8px">אין טעויות ספציפיות</div>';
  document.getElementById('goRetry').onclick=()=>{LS.sessionMistakes=[];isDailyChallenge?showHome():isPhrase?startPhraseLesson(curPhraseIdx):startLesson(curIdx);};
  document.getElementById('goReview').onclick=()=>{LS.sessionMistakes=[];startReviewSession(uniq);};
  },600);}
function advance(){
  if(isDailyChallenge){if(window._reviewOnDone){const fn=window._reviewOnDone;window._reviewOnDone=null;fn();return;}LS.dailyDone=true;sLS();showHome();toast('⚡ אתגר יומי הושלם! +25 XP');LS.xp+=25;sLS();checkAchievements();return;}
  const steps=isPhrase?getPhraseSteps(curPhraseIdx):getSteps(curIdx);
  curStep++;stepDone=false;writeAttempts=0;
  if(curStep>=steps.length)finishLesson();else renderStep();
}
function renderStep(){
  const steps=isDailyChallenge?dailySteps:(isPhrase?getPhraseSteps(curPhraseIdx):getSteps(curIdx));
  const step=steps[curStep],total=steps.length;stepDone=false;
  document.getElementById('lStep').textContent='שלב '+(curStep+1)+'/'+total;
  document.getElementById('lProgFill').style.width=(curStep/total*100)+'%';
  document.getElementById('lHearts').textContent='❤️'.repeat(hearts)+'🖤'.repeat(3-hearts);
  const body=document.getElementById('lesBody');body.innerHTML='';
  ({intro:rIntro,listen:rListen,write_letter:rWriteLetter,mcq_pic:rMcqPic,dictation:rDictation,write_word:rWriteWord,mcq_letter:rMcqLetter,sentence:rSentence,scramble:rScramble,true_false:rTrueFalse,catch_word:rCatchWord,speed_round:rSpeedRound,phrases_intro:rPhrIntro,phrases_listen:rPhrListen,phrases_write:rPhrWrite,phrases_sentence:rPhrSent,story_read:rStoryRead,story_quiz:rStoryQuiz}[step.type])(step,body);
}
const addFb=b=>{b.appendChild(mk('div','fb-wrap','<div class="fb empty" id="fb"></div>'));};
const setFb=(m,c)=>{const f=document.getElementById('fb');if(f){f.textContent=m;f.className='fb '+c;}};
function addActBtn(b,l,en,fn){const bt=mk('button','act-btn '+(en?'go':'off'),l);bt.id='actBtn';if(en)bt.onclick=fn;b.appendChild(bt);}
function enableAct(l,fn){const b=document.getElementById('actBtn');if(b){b.textContent=l;b.className='act-btn go';b.onclick=fn;}}
function onCorrect(x){showCorrectBurst();SFX.play('correct');showXPFloat(x);LS.xp+=x;sLS();toast('✅ +'+x+' XP');if(curWordContext)srsRecord(curWordContext,true);}
function onWrong(){mistakes++;SFX.play('wrong');if(curWordContext){srsRecord(curWordContext,false);LS.sessionMistakes.push(curWordContext);}loseHeart();}
let curWordContext='';

// ── Intro ──
function rIntro({lt},b){curWordContext=lt.word;const c=mk('div','card center intro-card anim-slideUp');c.innerHTML=`<div class="note-box" style="font-weight:700;color:#5838fa">📌 האות <b>${lt.L}</b> / <b>${lt.l}</b></div><div class="letter-hero"><div class="lh-col"><div class="lh-upper" id="iU">${lt.L}</div><div class="lh-tag">גדולה</div></div><div class="lh-col"><div class="lh-lower">${lt.l}</div><div class="lh-tag">קטנה</div></div></div><div class="sound-box"><div class="sound-big">🔊 "${lt.sound}"</div><div class="sound-desc">${lt.soundFull}</div></div>`;b.appendChild(c);document.getElementById('iU').onclick=()=>speak(lt.L);const w=mk('div','word-card anim-slideUp');w.innerHTML=`<div class="wc-em">${lt.wEm}</div><div class="wc-body"><div class="wc-en">${lt.word}</div><div class="wc-phon">📢 ${lt.wPhon}</div><div class="wc-he">= ${lt.wHe}</div></div><div class="wc-spk">🔊</div>`;w.onclick=()=>speak(lt.word);b.appendChild(w);addFb(b);addActBtn(b,'המשך ←',true,advance);speak(lt.word);}
// ── Listen ──
function rListen({lt},b){b.appendChild(mk('div','mcq-prompt anim-slideUp','לחץ לשמוע 🔊'));[{w:lt.word,phon:lt.wPhon,he:lt.wHe,em:lt.wEm},...lt.more].forEach((it,i)=>{const d=mk('div','listen-item anim-slideUp');d.style.animationDelay=i*.07+'s';d.innerHTML=`<div class="li-em">${it.em}</div><div class="li-body"><div class="li-en">${it.w}</div><div class="li-phon">${it.phon}</div><div class="li-he">${it.he}</div></div><div class="li-spk">🔊</div>`;d.onclick=()=>{speak(it.w);SFX.play('click');};b.appendChild(d);});addFb(b);addActBtn(b,'המשך ←',true,advance);}
// ── Write Letter ──
function rWriteLetter({lt},b){stepDone=false;writeAttempts=0;const c=mk('div','card center anim-slideUp');c.innerHTML=`<div class="mcq-prompt">✍️ כתוב: <b>${lt.L}</b></div><div class="write-target-big" id="wT">${lt.L}</div><div class="write-hint">הקלד: <b>${lt.L}</b></div><div class="write-input-row"><input class="write-input" id="wI" maxlength="1" placeholder="${lt.L}" autocomplete="off"/><button class="write-check-btn" id="wC">✓</button></div><div class="write-attempts" id="wA"></div>`;b.appendChild(c);document.getElementById('wT').onclick=()=>speak(lt.L);const inp=document.getElementById('wI');inp.addEventListener('input',()=>{if(inp.value.toUpperCase()===lt.L.toUpperCase()&&!stepDone){inp.classList.add('ok-inp');setFb('✅ נכון!','ok');LS.writes++;onCorrect(5);enableAct('המשך ←',advance);stepDone=true;}});document.getElementById('wC').onclick=()=>{if(!inp.value)return;if(stepDone)return;writeAttempts++;inp.classList.add('no-inp');document.getElementById('wA').textContent='❌ '+writeAttempts;setTimeout(()=>{inp.classList.remove('no-inp');inp.value='';inp.focus();},500);if(writeAttempts>=3){setFb('💡 '+lt.L,'no');enableAct('המשך ←',advance);onWrong();}};setTimeout(()=>inp.focus(),200);addFb(b);addActBtn(b,'הקלד',false,null);}
// ── MCQ Pic ──
function rMcqPic({lt,dist},b){curWordContext=lt.word;b.appendChild(mk('div','mcq-prompt anim-slideUp','מה מתחיל ב-<b>'+lt.L+'</b>?'));const opts=shuf([{w:lt.word,phon:lt.wPhon,he:lt.wHe,em:lt.wEm,ok:true},...dist.map(d=>({w:d.word,phon:d.wPhon,he:d.wHe,em:d.wEm,ok:false}))]);const g=mk('div','mcq-opts anim-slideUp');opts.forEach(o=>{const bt=mk('button','mcq-opt');bt.innerHTML=`<span style="font-size:28px">${o.em}</span><span class="opt-en">${o.w}</span><span class="opt-phon">${o.phon}</span>`;bt.onclick=()=>{if(stepDone)return;stepDone=true;g.querySelectorAll('button').forEach(x=>x.disabled=true);if(o.ok){bt.classList.add('ok');setFb('✅ '+lt.word+' = '+lt.L,'ok');enableAct('המשך ←',advance);onCorrect(10);speak(lt.word);}else{bt.classList.add('no');g.querySelectorAll('button').forEach(x=>{if(x.querySelector('.opt-en').textContent===lt.word)x.classList.add('ok');});setFb('❌ '+lt.word+' = '+lt.L,'no');enableAct('המשך ←',advance);onWrong();}};g.appendChild(bt);});b.appendChild(g);addFb(b);addActBtn(b,'בחר',false,null);}
// ── Dictation ──
function rDictation({lt},b){stepDone=false;writeAttempts=0;const pool=getWritableWords(lt);const t=pool[Math.floor(Math.random()*pool.length)];const c=mk('div','card center anim-slideUp');c.innerHTML=`<div class="mcq-prompt">🎧 שמע וכתוב</div><div style="font-size:64px;cursor:pointer" id="dS">🔊</div><div style="font-size:12px;color:#888">מתחיל ב-<b>${lt.L}</b></div><div class="write-input-row"><input class="write-input" id="dI" placeholder="?" autocomplete="off" style="font-size:18px;letter-spacing:3px;"/><button class="write-check-btn" id="dC">✓</button></div><div class="write-attempts" id="wA"></div>`;b.appendChild(c);document.getElementById('dS').onclick=()=>{speak(t.w);SFX.play('click');};const inp=document.getElementById('dI');document.getElementById('dC').onclick=()=>{if(!inp.value)return;if(inp.value.toLowerCase()===t.w.toLowerCase()){inp.classList.add('ok-inp');setFb('✅ '+t.w+' = '+t.he,'ok');LS.writes++;onCorrect(15);enableAct('המשך ←',advance);stepDone=true;}else{writeAttempts++;document.getElementById('wA').textContent='❌ '+writeAttempts;inp.classList.add('no-inp');setTimeout(()=>{inp.classList.remove('no-inp');inp.value='';inp.focus();},500);if(writeAttempts>=3){setFb('💡 '+t.w,'no');enableAct('המשך ←',advance);onWrong();}}};setTimeout(()=>{speak(t.w);inp.focus();},300);addFb(b);addActBtn(b,'כתוב',false,null);}
// ── Write Word ──
function rWriteWord({lt},b){stepDone=false;writeAttempts=0;const c=mk('div','card center anim-slideUp');c.innerHTML=`<div class="mcq-prompt">✍️ כתוב באנגלית:</div><div style="font-size:48px;filter:blur(7px);cursor:pointer;transition:filter .3s" id="wHintEm" onclick="this.style.filter='none'" title="לחץ לרמז">${lt.wEm}</div><div style="font-size:10px;color:#bbb;margin-bottom:4px">👆 לחץ לרמז</div><div style="font-size:13px;color:#a855f7">📢 ${lt.wPhon}</div><div id="wS" class="write-letter-row"></div><div class="write-input-row"><input class="write-input" id="wW" placeholder="${lt.word}" autocomplete="off" style="font-size:18px;letter-spacing:4px;"/><button class="write-check-btn" id="wWC">✓</button></div><div class="write-attempts" id="wA"></div>`;b.appendChild(c);rSlots(lt.word,'');const inp=document.getElementById('wW');inp.oninput=()=>{rSlots(lt.word,inp.value);if(inp.value.toLowerCase()===lt.word.toLowerCase()&&!stepDone){inp.classList.add('ok-inp');setFb('✅ '+lt.word,'ok');LS.writes++;onCorrect(10);enableAct('המשך ←',advance);stepDone=true;}};document.getElementById('wWC').onclick=()=>{if(!inp.value)return;if(stepDone)return;writeAttempts++;document.getElementById('wA').textContent='❌ '+writeAttempts+' — '+lt.word;inp.classList.add('no-inp');setTimeout(()=>{inp.classList.remove('no-inp');inp.value='';rSlots(lt.word,'');inp.focus();},700);if(writeAttempts>=3){setFb('💡 '+lt.word,'no');enableAct('המשך ←',advance);onWrong();}};setTimeout(()=>inp.focus(),200);addFb(b);addActBtn(b,'כתוב',false,null);}
function rSlots(w,t){const c=document.getElementById('wS');if(!c)return;c.innerHTML='';w.split('').forEach((ch,i)=>{const s=mk('div','write-letter-slot');const v=t[i]||'';if(v){if(v.toLowerCase()===ch.toLowerCase()){s.classList.add('done');s.textContent=ch;}else{s.classList.add('wrong');s.textContent=v;}}else if(i===t.length){s.classList.add('cur');s.textContent='_';}else s.textContent='_';c.appendChild(s);});}
// ── MCQ Letter ──
function rMcqLetter({lt,dist},b){const c=mk('div','card center anim-slideUp');c.innerHTML=`<div class="mcq-prompt">מה האות של:</div><div class="mcq-disp"><div class="mcq-disp-em">${lt.wEm}</div><div class="mcq-disp-word">${lt.word}</div><div class="mcq-disp-phon">${lt.wPhon}</div></div>`;b.appendChild(c);const opts=shuf([{L:lt.L,sound:lt.sound,ok:true},...dist.map(d=>({L:d.L,sound:d.sound,ok:false}))]);const g=mk('div','mcq-opts anim-slideUp');opts.forEach(o=>{const bt=mk('button','mcq-opt');bt.innerHTML=`<span class="opt-letter">${o.L}</span><span class="opt-phon">"${o.sound}"</span>`;bt.onclick=()=>{if(stepDone)return;stepDone=true;g.querySelectorAll('button').forEach(x=>x.disabled=true);if(o.ok){bt.classList.add('ok');setFb('✅ '+lt.L,'ok');enableAct('המשך ←',advance);onCorrect(10);speak(lt.word);}else{bt.classList.add('no');g.querySelectorAll('button').forEach(x=>{if(x.querySelector('.opt-letter').textContent===lt.L)x.classList.add('ok');});setFb('❌ '+lt.L,'no');enableAct('המשך ←',advance);onWrong();}};g.appendChild(bt);});b.appendChild(g);addFb(b);addActBtn(b,'בחר',false,null);}
// ── Sentence ──
function rSentence({lt},b){stepDone=false;const s=lt.sentence;const c=mk('div','sent-card anim-slideUp');c.appendChild(mk('div','sent-label','💬 השלם:'));const parts=s.tmpl.split('___'),sd=mk('div','sent-full');sd.appendChild(document.createTextNode(parts[0]));const bl=mk('span','sent-blank','___');bl.id='sB';sd.appendChild(bl);if(parts[1])sd.appendChild(document.createTextNode(parts[1]));c.appendChild(sd);c.appendChild(mk('div','sent-phon','📢 '+s.phon));c.appendChild(mk('div','sent-he','🇮🇱 '+s.he));const ch=mk('div','sent-choices');shuf(s.choices).forEach(w=>{const bt=mk('button','sent-choice',w);bt.onclick=()=>{if(stepDone)return;if(w===s.answer){stepDone=true;bt.classList.add('ok');document.getElementById('sB').textContent=w;setFb('✅ '+s.phon,'ok');enableAct('המשך ←',advance);speak(s.answer);onCorrect(10);maybeShowLangTip(s.tmpl.replace('___',s.answer),b);}else{bt.classList.add('no');setTimeout(()=>bt.classList.remove('no'),500);setFb('❌ נסה שוב','no');onWrong();}};ch.appendChild(bt);});c.appendChild(ch);b.appendChild(c);addFb(b);addActBtn(b,'בחר',false,null);}

// ══ SCRAMBLE GAME ══
function rScramble({lt},b){
  stepDone=false;curWordContext=lt.word;
  const word=lt.word.toUpperCase();const letters=shuf(word.split(''));
  const card=mk('div','card center anim-slideUp');
  card.innerHTML=`<div class="mcq-prompt">🎯 סדר את האותיות למילה!</div><div class="scram-target">${lt.wEm}</div><div style="font-size:13px;color:#a855f7">📢 ${lt.wPhon} = ${lt.wHe}</div><div class="scram-slots" id="scSlots"></div><div class="scram-chips" id="scChips"></div>`;
  b.appendChild(card);
  const slotsEl=document.getElementById('scSlots');const chipsEl=document.getElementById('scChips');
  let placed=[];
  function render(){
    slotsEl.innerHTML='';chipsEl.innerHTML='';
    word.split('').forEach((_,i)=>{const s=mk('div','scram-slot'+(placed[i]?' filled':''));s.textContent=placed[i]||'';if(placed[i])s.onclick=()=>{placed[i]='';render();};slotsEl.appendChild(s);});
    letters.forEach((ch,i)=>{const used=placed.includes(ch)&&placed.filter(x=>x===ch).length>letters.slice(0,i+1).filter(x=>x===ch).length;
      // Count how many times this letter is used vs available
      const usedCount=placed.filter(x=>x===ch).length;const availCount=letters.slice(0,i+1).filter(x=>x===ch).length;
      const isUsed=placed.filter(x=>x===ch).length>letters.filter((x,j)=>x===ch&&j<=i).length-1;
      // Simpler: track by index
    });
    // Simpler approach: track used indices
    const usedIdxs=[];placed.forEach(p=>{if(p){const fi=letters.findIndex((x,i)=>x===p&&!usedIdxs.includes(i));if(fi>=0)usedIdxs.push(fi);}});
    letters.forEach((ch,i)=>{const s=mk('div','scram-chip'+(usedIdxs.includes(i)?' used':''));s.textContent=ch;s.onclick=()=>{if(usedIdxs.includes(i))return;const slot=placed.indexOf('');const emptyIdx=placed.length<word.length?placed.length:placed.indexOf(undefined);
      // Find first empty slot
      let si=-1;for(let j=0;j<word.length;j++){if(!placed[j]){si=j;break;}}
      if(si===-1)return;placed[si]=ch;SFX.play('click');render();checkScramble();};chipsEl.appendChild(s);});
  }
  placed=new Array(word.length).fill('');
  render();
  function checkScramble(){
    if(placed.join('')===word){stepDone=true;setFb('✅ מעולה! '+lt.word+' = '+lt.wHe,'ok');onCorrect(15);speak(lt.word);enableAct('המשך ←',advance);}
  }
  addFb(b);addActBtn(b,'סדר את האותיות',false,null);
}

// ══ TRUE/FALSE GAME ══
function rTrueFalse({lt,allW},b){
  stepDone=false;curWordContext=lt.word;
  const target=allW[Math.floor(Math.random()*allW.length)];
  const isTrue=Math.random()>0.4;
  const fakeOpts=shuf(allW.filter(x=>x.w!==target.w));const fakeHe=isTrue?target.he:(fakeOpts.length?fakeOpts[0].he:'???');
  const card=mk('div','tf-card anim-slideUp');
  card.innerHTML=`<div style="font-size:36px;margin-bottom:8px">${target.em}</div><div class="tf-word">${target.w}</div><div class="tf-claim">= ${fakeHe} ?</div><div class="tf-btns"><button class="tf-btn yes" id="tfY">✓</button><button class="tf-btn no-btn" id="tfN">✗</button></div>`;
  b.appendChild(card);
  const handle=(userSaidTrue)=>{
    if(stepDone)return;stepDone=true;
    const correct=(userSaidTrue===isTrue);
    document.getElementById(userSaidTrue?'tfY':'tfN').classList.add(correct?'correct':'wrong');
    if(correct){setFb('✅ נכון! '+target.w+' = '+target.he,'ok');onCorrect(10);speak(target.w);}
    else{setFb('❌ לא! '+target.w+' = '+target.he,'no');onWrong();}
    enableAct('המשך ←',advance);
  };
  document.getElementById('tfY').onclick=()=>handle(true);
  document.getElementById('tfN').onclick=()=>handle(false);
  addFb(b);addActBtn(b,'בחר',false,null);
}

// ══ CATCH WORD GAME ══
function rCatchWord({lt,dist,allW},b){
  stepDone=false;curWordContext=lt.word;
  const target=allW[Math.floor(Math.random()*allW.length)];
  const wrongWords=[];dist.forEach(d=>{wrongWords.push({w:d.word});d.more.forEach(m=>wrongWords.push({w:m.w}));});
  const wrong=shuf(wrongWords).slice(0,4);
  
  b.appendChild(mk('div','mcq-prompt anim-slideUp','🎪 תפוס: <b>'+target.he+'</b> '+target.em));
  const arena=mk('div','catch-arena');
  arena.innerHTML=`<div class="catch-prompt-bar">${target.em} ${target.he}</div>`;
  b.appendChild(arena);
  
  let caught=false,waveNum=0,maxWaves=3,failTimer=null;
  
  function spawnWave(){
    if(caught||waveNum>=maxWaves)return;
    waveNum++;
    // Each wave has the correct word + 2-3 wrong words
    const waveWords=shuf([{w:target.w,ok:true},...shuf(wrong).slice(0,3).map(x=>({w:x.w,ok:false}))]);
    
    waveWords.forEach((item,i)=>{
      setTimeout(()=>{
        if(caught)return;
        const el=document.createElement('div');
        el.className='catch-word';
        el.textContent=item.w;
        el.style.left=(10+i*20+Math.random()*10)+'%';
        el.style.top='-50px';
        // Use CSS transition for smooth falling
        arena.appendChild(el);
        
        // Animate with JS intervals (more reliable than rAF for this)
        let posY=-50;
        const fallSpeed=0.4+Math.random()*0.3; // Slower!
        const fallInterval=setInterval(()=>{
          if(caught){clearInterval(fallInterval);el.remove();return;}
          posY+=fallSpeed;
          el.style.top=posY+'px';
          if(posY>240){
            clearInterval(fallInterval);
            el.style.opacity='0';
            setTimeout(()=>el.remove(),200);
          }
        },16);
        
        el.onclick=()=>{
          if(caught)return;
          clearInterval(fallInterval);
          if(item.ok){
            caught=true;stepDone=true;
            if(failTimer)clearTimeout(failTimer);
            el.classList.add('right');
            el.style.top=posY+'px'; // Freeze position
            SFX.play('correct');
            setFb('✅ '+target.w+' = '+target.he,'ok');
            onCorrect(15);speak(target.w);
            enableAct('המשך ←',advance);
            // Remove other words
            arena.querySelectorAll('.catch-word').forEach(x=>{if(x!==el)x.remove();});
          } else {
            el.classList.add('wrong-w');
            SFX.play('wrong');
            setTimeout(()=>el.remove(),400);
          }
        };
      }, i*600); // Stagger spawns within wave
    });
    
    // Schedule next wave
    if(waveNum<maxWaves){
      setTimeout(()=>spawnWave(), waveWords.length*600+1500);
    }
  }
  
  // Start first wave
  setTimeout(spawnWave,400);
  
  // Failsafe: if player misses all waves, auto-reveal answer
  failTimer=setTimeout(()=>{
    if(!caught){
      caught=true;stepDone=true;
      arena.querySelectorAll('.catch-word').forEach(x=>x.remove());
      const reveal=mk('div','catch-word right',target.w);
      reveal.style.left='50%';reveal.style.top='40%';
      reveal.style.transform='translateX(-50%)';reveal.style.fontSize='22px';
      arena.appendChild(reveal);
      setFb('💡 התשובה: '+target.w+' = '+target.he,'no');
      onWrong();
      enableAct('המשך ←',advance);
    }
  }, 18000); // 18 second failsafe
  
  addFb(b);addActBtn(b,'תפוס!',false,null);
}

// ══ SPEED ROUND ══
function rSpeedRound({lt,dist,allW},b){
  curWordContext=lt.word;
  const questions=[];
  // Generate 4 quick MCQ questions from this letter's words
  allW.forEach(w=>{
    const wrongPool=[...dist.flatMap(d=>[{w:d.word,he:d.wHe},...d.more.map(m=>({w:m.w,he:m.he}))])];
    const wrongs=shuf(wrongPool).slice(0,2);
    questions.push({w:w.w,he:w.he,em:w.em,opts:shuf([w.he,...wrongs.map(x=>x.he)])});
  });
  const qs=shuf(questions).slice(0,4);
  let qi=0,score=0,timeLeft=20;
  
  b.appendChild(mk('div','mcq-prompt anim-slideUp','⚡ סיבוב מהיר! ענה לפני שהזמן נגמר'));
  const timerEl=mk('div','speed-timer','20');b.appendChild(timerEl);
  const barEl=mk('div','speed-bar');barEl.innerHTML='<div class="speed-bar-fill" id="spBar" style="width:100%"></div>';b.appendChild(barEl);
  const scoreEl=mk('div','speed-score','0/'+qs.length+' נכון');b.appendChild(scoreEl);
  const qArea=mk('div','');qArea.id='spArea';b.appendChild(qArea);
  
  const timer=setInterval(()=>{timeLeft--;timerEl.textContent=timeLeft;document.getElementById('spBar').style.width=(timeLeft/20*100)+'%';
    if(timeLeft<=5)timerEl.classList.add('warn');
    if(timeLeft<=0){clearInterval(timer);finishSpeed();}
  },1000);
  
  function renderQ(){
    if(qi>=qs.length){clearInterval(timer);finishSpeed();return;}
    const q=qs[qi];qArea.innerHTML='';
    qArea.appendChild(mk('div','card center anim-slideUp',`<div style="font-size:32px">${q.em}</div><div style="font-size:20px;font-weight:900;direction:ltr;margin-top:4px">${q.w}</div>`));
    const g=mk('div','mcq-opts anim-slideUp');g.style.marginTop='10px';
    q.opts.forEach(opt=>{const bt=mk('button','mcq-opt');bt.textContent=opt;bt.onclick=()=>{const ok=opt===q.he;bt.classList.add(ok?'ok':'no');if(ok){score++;SFX.play('correct');}else SFX.play('wrong');
      srsRecord(q.w,ok);scoreEl.textContent=score+'/'+qs.length+' נכון';qi++;setTimeout(renderQ,400);};g.appendChild(bt);});
    qArea.appendChild(g);
  }
  function finishSpeed(){
    stepDone=true;
    const pct=score/qs.length;
    if(pct>=0.75)onCorrect(20);else if(pct>=0.5){LS.xp+=5;sLS();}else onWrong();
    setFb(pct>=0.75?'🏆 '+score+'/'+qs.length+' מעולה!':pct>=0.5?'👍 '+score+'/'+qs.length:'💪 '+score+'/'+qs.length+' — תתאמן!',pct>=0.5?'ok':'no');
    enableAct('המשך ←',advance);
  }
  renderQ();addFb(b);addActBtn(b,'ענה!',false,null);
}

// ══ PHRASE LESSONS ══
function getPhraseSteps(i){const p=PHRASES[i];return [{type:'phrases_intro',ph:p},{type:'phrases_listen',ph:p},{type:'phrases_write',ph:p},{type:'phrases_sentence',ph:p}];}
function startPhraseLesson(i){isPhrase=true;isDailyChallenge=false;curPhraseIdx=i;curStep=0;hearts=3;mistakes=0;stepDone=false;writeAttempts=0;document.getElementById('lTitle').textContent=PHRASES[i].emoji+' '+PHRASES[i].title;sw('scLesson');SFX.init();renderStep();}
function rPhrIntro({ph},b){const c=mk('div','card center intro-card anim-slideUp');c.innerHTML=`<div style="font-size:48px">${ph.emoji}</div><div class="note-box" style="font-weight:700;color:#e65100">💬 ${ph.title}</div>`;b.appendChild(c);ph.items.forEach((it,i)=>{const d=mk('div','listen-item anim-slideUp');d.style.animationDelay=i*.08+'s';d.innerHTML=`<div class="li-em">${it.em}</div><div class="li-body"><div class="li-en">${it.en}</div><div class="li-phon">${it.phon}</div><div class="li-he">${it.he}</div></div><div class="li-spk">🔊</div>`;d.onclick=()=>speak(it.en);b.appendChild(d);});addFb(b);addActBtn(b,'המשך ←',true,advance);}
function rPhrListen({ph},b){b.appendChild(mk('div','mcq-prompt anim-slideUp','מה מתאים?'));const cor=ph.items[Math.floor(Math.random()*ph.items.length)],wr=shuf(ph.items.filter(x=>x.en!==cor.en)).slice(0,3),opts=shuf([cor,...wr]);const d=mk('div','card center anim-slideUp');d.innerHTML=`<div style="font-size:36px">${cor.em}</div><div style="font-size:18px;font-weight:700;color:#444">${cor.he}</div>`;b.appendChild(d);const g=mk('div','mcq-opts anim-slideUp');opts.forEach(o=>{const bt=mk('button','mcq-opt');bt.innerHTML=`<span class="opt-en" style="font-size:11px">${o.en}</span><span class="opt-phon">${o.phon}</span>`;bt.onclick=()=>{if(stepDone)return;stepDone=true;g.querySelectorAll('button').forEach(x=>x.disabled=true);const ok=o.en===cor.en;bt.classList.add(ok?'ok':'no');if(!ok)g.querySelectorAll('button').forEach(x=>{if(x.querySelector('.opt-en').textContent===cor.en)x.classList.add('ok');});setFb(ok?'✅ '+cor.phon:'❌ '+cor.en,ok?'ok':'no');enableAct('המשך ←',advance);speak(cor.en);if(ok)onCorrect(10);else onWrong();};g.appendChild(bt);});b.appendChild(g);addFb(b);addActBtn(b,'בחר',false,null);}
function rPhrWrite({ph},b){stepDone=false;writeAttempts=0;const it=ph.items[0],fw=it.en.split(' ')[0].replace(/[!?,.]*/g,'');const c=mk('div','card center anim-slideUp');c.innerHTML=`<div class="mcq-prompt">✍️ כתוב:</div><div style="background:#fff8f5;border-radius:16px;padding:14px;width:100%;border:2px solid #ffe0d0"><div style="font-size:16px;font-weight:700;color:#e65100;direction:ltr">${it.en}</div><div style="font-size:13px;color:#888">${it.he}</div></div><div class="write-input-row"><input class="write-input" id="pI" placeholder="${fw}" autocomplete="off" style="font-size:18px;"/><button class="write-check-btn" id="pC">✓</button></div><div class="write-attempts" id="wA"></div>`;b.appendChild(c);const inp=document.getElementById('pI');inp.oninput=()=>{if(inp.value.toLowerCase()===fw.toLowerCase()&&!stepDone){inp.classList.add('ok-inp');setFb('✅','ok');LS.writes++;onCorrect(10);enableAct('המשך ←',advance);stepDone=true;}};document.getElementById('pC').onclick=()=>{if(!inp.value||stepDone)return;writeAttempts++;document.getElementById('wA').textContent='❌ '+writeAttempts;inp.classList.add('no-inp');setTimeout(()=>{inp.classList.remove('no-inp');inp.value='';inp.focus();},600);if(writeAttempts>=3){setFb('💡 '+fw,'no');enableAct('המשך ←',advance);onWrong();}};setTimeout(()=>inp.focus(),200);addFb(b);addActBtn(b,'כתוב',false,null);}
function rPhrSent({ph},b){stepDone=false;const s=ph.sentence;const c=mk('div','sent-card anim-slideUp');c.appendChild(mk('div','sent-label','💬 השלם:'));const parts=s.tmpl.split('___'),sd=mk('div','sent-full');sd.appendChild(document.createTextNode(parts[0]));const bl=mk('span','sent-blank','___');bl.id='sB';sd.appendChild(bl);if(parts[1])sd.appendChild(document.createTextNode(parts[1]));c.appendChild(sd);c.appendChild(mk('div','sent-phon','📢 '+s.phon));c.appendChild(mk('div','sent-he','🇮🇱 '+s.he));const ch=mk('div','sent-choices');shuf(s.choices).forEach(w=>{const bt=mk('button','sent-choice',w);bt.onclick=()=>{if(stepDone)return;const ok=w===s.answer;if(ok){stepDone=true;bt.classList.add('ok');document.getElementById('sB').textContent=w;setFb('✅','ok');enableAct('המשך ←',advance);speak(s.answer);onCorrect(10);}else{bt.classList.add('no');setTimeout(()=>bt.classList.remove('no'),500);setFb('❌','no');onWrong();}};ch.appendChild(bt);});c.appendChild(ch);b.appendChild(c);addFb(b);addActBtn(b,'בחר',false,null);}

// ══ STORIES ══
let curStoryIdx=0,curStoryStep=0;
function startStory(si){curStoryIdx=si;curStoryStep=0;isPhrase=false;isDailyChallenge=false;curStep=0;hearts=3;mistakes=0;stepDone=false;
  const s=STORIES[si];document.getElementById('lTitle').textContent='📖 '+s.titleHe;sw('scLesson');
  // Steps: read, then questions
  const steps=[{type:'story_read',story:s},...s.questions.map((q,qi)=>({type:'story_quiz',story:s,qIdx:qi}))];
  dailySteps=steps;// reuse dailySteps array
  isDailyChallenge=false;curStep=0;renderStoryStep(steps);}
function renderStoryStep(steps){
  const step=steps[curStep],total=steps.length;stepDone=false;
  document.getElementById('lStep').textContent=(curStep+1)+'/'+total;document.getElementById('lProgFill').style.width=(curStep/total*100)+'%';
  document.getElementById('lHearts').textContent='❤️'.repeat(hearts)+'🖤'.repeat(3-hearts);
  const body=document.getElementById('lesBody');body.innerHTML='';
  if(step.type==='story_read')rStoryRead(step,body,steps);
  else rStoryQuiz(step,body,steps);
}
function rStoryRead({story},b,steps){
  // Bilingual controls
  const ctrl=mk('div','bil-controls anim-slideUp');
  ctrl.innerHTML=`<button class="bil-btn" id="bilPlayBtn" onclick="toggleBilingual()">▶️ השמע EN+HE</button><button class="bil-btn stop" id="bilStopBtn" onclick="stopBil()" style="display:none">⏹ עצור</button>`;
  b.appendChild(ctrl);
  const c=mk('div','story-card anim-slideUp');c.innerHTML=`<div style="font-size:14px;font-weight:700;color:#00897b;margin-bottom:8px">📖 ${story.title}</div>`;
  const lineEls=[];
  story.lines.forEach(l=>{
    const d=mk('div','bil-line');
    d.innerHTML=`<div class="bil-line-en">${l.en}</div><div class="bil-line-phon">📢 ${l.phon}</div><div class="bil-line-he">${l.he}</div>`;
    d.onclick=()=>speak(l.en);
    c.appendChild(d);lineEls.push(d);
  });
  b.appendChild(c);
  // Store for bilingual playback
  window._bilLines=story.lines;window._bilEls=lineEls;
  addFb(b);addActBtn(b,'המשך לשאלות ←',true,()=>{stopBil();curStep++;if(curStep<steps.length)renderStoryStep(steps);});
}
function toggleBilingual(){
  if(bilPlaying){stopBil();return;}
  document.getElementById('bilPlayBtn').style.display='none';
  document.getElementById('bilStopBtn').style.display='';
  playBilingual(window._bilLines,window._bilEls);
}
// Override stopBil to toggle buttons
const _origStopBil=stopBil;
function stopBil(){bilPlaying=false;const TTS=IS_NATIVE&&window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.TextToSpeech;if(TTS)TTS.stop().catch(()=>{});else if(window.speechSynthesis)speechSynthesis.cancel();const pb=document.getElementById('bilPlayBtn'),sb=document.getElementById('bilStopBtn');if(pb)pb.style.display='';if(sb)sb.style.display='none';if(window._bilEls)window._bilEls.forEach(e=>e.classList.remove('active'));}
function rStoryQuiz({story,qIdx},b,steps){
  const q=story.questions[qIdx];stepDone=false;
  const c=mk('div','story-q anim-slideUp');c.innerHTML=`<div class="mcq-prompt">${q.qHe}</div><div style="font-size:13px;color:#00897b;text-align:center;margin-top:4px;direction:ltr">${q.q}</div>`;b.appendChild(c);
  const g=mk('div','mcq-opts anim-slideUp');g.style.marginTop='12px';
  shuf(q.choices.map((ch,ci)=>({en:ch,he:q.choicesHe?q.choicesHe[ci]:ch}))).forEach(opt=>{const bt=mk('button','mcq-opt');bt.innerHTML=`<span style="font-size:14px;font-weight:700;display:block">${opt.he}</span><span class="opt-en" style="font-size:11px;color:#888">${opt.en}</span>`;bt.onclick=()=>{if(stepDone)return;stepDone=true;g.querySelectorAll('button').forEach(x=>x.disabled=true);const ok=opt.en===q.answer;bt.classList.add(ok?'ok':'no');if(!ok)g.querySelectorAll('button').forEach(x=>{if(x.querySelector('.opt-en').textContent===q.answer)x.classList.add('ok');});setFb(ok?'✅ נכון!':'❌ '+(q.answerHe||q.answer),ok?'ok':'no');if(ok)onCorrect(15);else onWrong();enableAct('המשך ←',()=>{curStep++;if(curStep<steps.length)renderStoryStep(steps);else finishStory();});};g.appendChild(bt);});
  b.appendChild(g);addFb(b);addActBtn(b,'בחר',false,null);
}
function finishStory(){
  const s=STORIES[curStoryIdx];LS.sc[s.id]=1;LS.xp+=s.xp;LS.storiesDone=(LS.storiesDone||0)+1;updateStreak();sLS();SFX.play('complete');
  sw('scComp');document.getElementById('cTrophy').textContent='📖';document.getElementById('cTitle').textContent=s.titleHe+' — הושלם!';
  document.getElementById('cBig').textContent=s.emoji;document.getElementById('cSmall').textContent='';
  document.getElementById('cWordBox').innerHTML=`<div style="color:rgba(255,255,255,.7)">קראת סיפור שלם באנגלית! 🎉</div>`;
  document.getElementById('cStars').textContent='⭐';document.getElementById('cXP').textContent='+'+s.xp+' XP';
  const rmk=FUNNY_REMARKS[Math.floor(Math.random()*FUNNY_REMARKS.length)];document.getElementById('cRemark').innerHTML=rmk.e+' '+rmk.t;
  launchConfetti();checkAchievements();
}

// ══ FINISH ══
function finishLesson(){
  const xp=30+(mistakes===0?10:0);LS.xp+=xp;updateStreak();SFX.play('complete');
  if(isPhrase){const p=PHRASES[curPhraseIdx];const st=mistakes===0?3:mistakes<=2?2:1;if(st>getPDone(p.id))LS.pc[p.id]=st;markPhraseWords(curPhraseIdx);sLS();sw('scComp');document.getElementById('cTrophy').textContent='🏆';document.getElementById('cTitle').textContent=p.title+' הושלם!';document.getElementById('cBig').textContent=p.emoji;document.getElementById('cSmall').textContent='';document.getElementById('cWordBox').innerHTML=`<div style="color:rgba(255,255,255,.7)">${p.items.length} ביטויים!</div>`;document.getElementById('cStars').textContent='⭐⭐⭐';}
  else{const lt=LETTERS[curIdx];const prevSub=LS.lc[curIdx]||0;
    LS.lc[curIdx]=Math.min(4,prevSub+1);
    if(getDone(curIdx)>=4){LS.completedAt[curIdx]=Date.now();markLetterWords(curIdx);}
    sLS();sw('scComp');
    const full=getDone(curIdx)>=4;const subN=['📖 לומדים','🎯 מתרגלים','🎮 משחקים','⚡ אתגר'];
    document.getElementById('cTrophy').textContent=full?'🏆':'🎯';
    document.getElementById('cTitle').textContent=full?'למדת את '+lt.L+'!':subN[prevSub]+' — הושלם!';
    document.getElementById('cBig').textContent=lt.L;document.getElementById('cSmall').textContent=lt.l;
    const progHtml=`<div style="display:flex;gap:6px;justify-content:center;margin-top:8px">${[0,1,2,3].map(s=>`<div style="width:24px;height:6px;border-radius:3px;background:${s<getDone(curIdx)?'#ffd600':'rgba(255,255,255,.2)'}"></div>`).join('')}</div>`;
    document.getElementById('cWordBox').innerHTML=`<div class="comp-word-en">${lt.wEm} ${lt.word}</div><div class="comp-word-phon">${lt.wPhon}</div>${progHtml}<div style="font-size:13px;color:rgba(255,255,255,.6);margin-top:6px">${full?'🎉 כל 4 השלבים הושלמו!':'שלב '+getDone(curIdx)+'/4'}</div>`;
    document.getElementById('cStars').textContent=full?'⭐⭐⭐⭐':'';
  }
  document.getElementById('cXP').textContent='+'+xp+' XP';
  const rmk2=FUNNY_REMARKS[Math.floor(Math.random()*FUNNY_REMARKS.length)];document.getElementById('cRemark').innerHTML=rmk2.e+' '+rmk2.t;
  if((isPhrase&&mistakes===0)||getDone(curIdx)>=4)setTimeout(launchConfetti,400);checkAchievements();
}
function goNext(){if(isPhrase){const n=curPhraseIdx+1;if(n<PHRASES.length)startPhraseLesson(n);else showHome();}
else{if(getDone(curIdx)<4)startLesson(curIdx);else{const n=curIdx+1;if(n<LETTERS.length)startLesson(n);else showHome();}}}

// ══ PRACTICE ══
let pracTab=0,pracQ=[],pracIdx=0,pracRight=0,pracWrong=0;
function setPracTab(t){pracTab=t;for(let i=0;i<=10;i++){const el=document.getElementById('ptab'+i);if(el)el.classList.toggle('on',i===t);}
  if(t===4){showMemoryGame();return;}if(t===5){showFlashcards();return;}if(t===6){showThemes();return;}
  if(t===7){showPracScramble();return;}if(t===8){showPracTF();return;}if(t===9){showPracCatch();return;}if(t===10){showPracSpeed();return;}
  buildPrac();renderPracQ();}
function showPractice(){sw('scPrac');setNav('bnPrac');const started=LETTERS.filter((_,i)=>getDone(i)>0).length;document.getElementById('pracSub').textContent=learnedCount()+' אותיות · '+totalLearnedWords()+' מילים';if(started<2){document.getElementById('pracBody').innerHTML='<div style="text-align:center;padding:24px;font-size:48px">🔒</div><div style="text-align:center;font-weight:700;color:#5838fa">למד 2 אותיות קודם!</div>';return;}buildPrac();renderPracQ();}
function buildPrac(){const l=LETTERS.filter((_,i)=>getDone(i)>0);pracQ=[];pracIdx=0;pracRight=0;pracWrong=0;if(l.length<2)return;if(pracTab===0)for(let i=0;i<10;i++){const lt=l[Math.floor(Math.random()*l.length)];const pool=l.filter(x=>x.L!==lt.L);if(pool.length<1)continue;const d=shuf(pool).slice(0,3);pracQ.push({lt,type:i%2?'letter':'pic',dist:d});}else if(pracTab===1)for(let i=0;i<8;i++){const wl=l.filter(x=>isWordWritable(x.word));if(!wl.length)continue;const lt=wl[Math.floor(Math.random()*wl.length)];pracQ.push({lt,type:i%2?'write_w':'write_l'});}else if(pracTab===2)for(let i=0;i<8;i++){const wl=l.filter(x=>getWritableWords(x).length>0);if(!wl.length)continue;const lt=wl[Math.floor(Math.random()*wl.length)];pracQ.push({lt,type:'dict'});}else for(let i=0;i<8;i++){const p=l.filter(x=>x.sentence);if(!p.length)continue;const lt=p[Math.floor(Math.random()*p.length)];pracQ.push({lt,type:'sent'});}}
function renderPracQ(){const b=document.getElementById('pracBody');b.innerHTML='';if(pracIdx>=pracQ.length){b.innerHTML=`<div style="text-align:center;padding:24px;"><div style="font-size:56px">${pracRight/pracQ.length>=.8?'🏆':'💪'}</div><div style="font-size:18px;font-weight:700;color:#5838fa;margin-top:8px">${pracRight}/${pracQ.length} (${Math.round(pracRight/pracQ.length*100)}%)</div><button class="act-btn go" onclick="buildPrac();renderPracQ()" style="margin-top:12px">שוב 🔄</button></div>`;return;}stepDone=false;writeAttempts=0;const q=pracQ[pracIdx];b.appendChild(mk('div','prac-score anim-slideDown',`<div class="psc"><div class="psc-n g">${pracRight}</div><div class="psc-l">✓</div></div><div class="psc"><div class="psc-n gr">${pracIdx}/${pracQ.length}</div><div class="psc-l">#</div></div><div class="psc"><div class="psc-n r">${pracWrong}</div><div class="psc-l">✗</div></div>`));if(q.type==='pic')pPic(q,b);else if(q.type==='letter')pLetter(q,b);else if(q.type==='write_l')pWriteL(q,b);else if(q.type==='write_w')pWriteW(q,b);else if(q.type==='dict')pDict(q,b);else pSentP(q,b);}
function pAns(ok,b){if(ok){pracRight++;showCorrectBurst();SFX.play('correct');LS.xp+=5;sLS();}else{pracWrong++;SFX.play('wrong');}pracIdx++;const nb=mk('button','act-btn go anim-slideUp','הבאה ←');nb.onclick=renderPracQ;b.appendChild(nb);}
function pPic({lt,dist},b){if(!lt||!dist||!dist.length){pracIdx++;renderPracQ();return;}b.appendChild(mk('div','mcq-prompt anim-slideUp','מה ב-<b>'+lt.L+'</b>?'));const opts=shuf([{w:lt.word,em:lt.wEm,ok:true},...dist.map(d=>({w:d.word,em:d.wEm,ok:false}))]);const g=mk('div','mcq-opts anim-slideUp');opts.forEach(o=>{const bt=mk('button','mcq-opt');bt.innerHTML=`<span style="font-size:26px">${o.em}</span><span class="opt-en">${o.w}</span>`;bt.onclick=()=>{if(stepDone)return;stepDone=true;g.querySelectorAll('button').forEach(x=>x.disabled=true);bt.classList.add(o.ok?'ok':'no');speak(lt.word);pAns(o.ok,b);};g.appendChild(bt);});b.appendChild(g);}
function pLetter({lt,dist},b){if(!lt||!dist||!dist.length){pracIdx++;renderPracQ();return;}b.appendChild(mk('div','card center anim-slideUp',`<div style="font-size:48px">${lt.wEm}</div><div style="font-size:18px;font-weight:700">${lt.word}</div>`));const opts=shuf([{L:lt.L,ok:true},...dist.map(d=>({L:d.L,ok:false}))]);const g=mk('div','mcq-opts anim-slideUp');opts.forEach(o=>{const bt=mk('button','mcq-opt');bt.innerHTML=`<span class="opt-letter">${o.L}</span>`;bt.onclick=()=>{if(stepDone)return;stepDone=true;g.querySelectorAll('button').forEach(x=>x.disabled=true);bt.classList.add(o.ok?'ok':'no');pAns(o.ok,b);};g.appendChild(bt);});b.appendChild(g);}
function pWriteL({lt},b){stepDone=false;writeAttempts=0;const c=mk('div','card center anim-slideUp');c.innerHTML=`<div class="write-target-big" id="pT">${lt.L}</div><div class="write-input-row"><input class="write-input" id="pI" maxlength="1" placeholder="${lt.L}" autocomplete="off"/></div><div class="write-attempts" id="wA"></div>`;b.appendChild(c);document.getElementById('pT').onclick=()=>speak(lt.L);const inp=document.getElementById('pI');inp.oninput=()=>{if(inp.value.toUpperCase()===lt.L.toUpperCase()){inp.classList.add('ok-inp');LS.writes++;sLS();pAns(true,b);}else if(inp.value){writeAttempts++;if(writeAttempts>=3){inp.disabled=true;pAns(false,b);}else{inp.classList.add('no-inp');setTimeout(()=>{inp.classList.remove('no-inp');inp.value='';},500);}}};setTimeout(()=>inp.focus(),100);}
function pWriteW({lt},b){stepDone=false;writeAttempts=0;const c=mk('div','card center anim-slideUp');c.innerHTML=`<div style="font-size:13px;color:#a855f7;margin-bottom:6px">${lt.wPhon}</div><div style="font-size:32px;filter:blur(6px);cursor:pointer;transition:filter .3s;margin-bottom:4px" onclick="this.style.filter='none'">${lt.wEm}</div><div style="font-size:10px;color:#bbb;margin-bottom:8px">👆 לחץ לרמז</div><div class="write-input-row"><input class="write-input" id="pI" placeholder="${lt.word}" autocomplete="off" style="font-size:16px;letter-spacing:3px"/><button class="write-check-btn" id="pC">✓</button></div><div class="write-attempts" id="wA"></div>`;b.appendChild(c);const inp=document.getElementById('pI');document.getElementById('pC').onclick=()=>{if(!inp.value)return;if(inp.value.toLowerCase()===lt.word.toLowerCase()){inp.classList.add('ok-inp');LS.writes++;sLS();pAns(true,b);}else{writeAttempts++;document.getElementById('wA').textContent='❌ '+writeAttempts;inp.classList.add('no-inp');setTimeout(()=>{inp.classList.remove('no-inp');inp.value='';inp.focus();},600);if(writeAttempts>=3)pAns(false,b);}};setTimeout(()=>inp.focus(),100);}
function pDict({lt},b){if(!lt||!lt.more){pracIdx++;renderPracQ();return;}stepDone=false;writeAttempts=0;const all=getWritableWords(lt);const t=all[Math.floor(Math.random()*all.length)];const c=mk('div','card center anim-slideUp');c.innerHTML=`<div style="font-size:64px;cursor:pointer" id="pS">🔊</div><div style="font-size:12px;color:#888">שמע וכתוב</div><div class="write-input-row"><input class="write-input" id="pI" placeholder="?" autocomplete="off" style="font-size:16px;letter-spacing:3px"/><button class="write-check-btn" id="pC">✓</button></div><div class="write-attempts" id="wA"></div>`;b.appendChild(c);document.getElementById('pS').onclick=()=>{speak(t.w);SFX.play('click');};const inp=document.getElementById('pI');document.getElementById('pC').onclick=()=>{if(!inp.value)return;if(inp.value.toLowerCase()===t.w.toLowerCase()){inp.classList.add('ok-inp');LS.writes++;sLS();pAns(true,b);}else{writeAttempts++;document.getElementById('wA').textContent='❌ '+writeAttempts+' — '+t.w;inp.classList.add('no-inp');setTimeout(()=>{inp.classList.remove('no-inp');inp.value='';inp.focus();},600);if(writeAttempts>=3)pAns(false,b);}};setTimeout(()=>{speak(t.w);inp.focus();},200);}
function pSentP({lt},b){if(!lt||!lt.sentence){pracIdx++;renderPracQ();return;}stepDone=false;const s=lt.sentence;const c=mk('div','sent-card anim-slideUp');c.appendChild(mk('div','sent-label','💬 השלם:'));const parts=s.tmpl.split('___'),sd=mk('div','sent-full');sd.appendChild(document.createTextNode(parts[0]));const bl=mk('span','sent-blank','___');bl.id='sPB';sd.appendChild(bl);if(parts[1])sd.appendChild(document.createTextNode(parts[1]));c.appendChild(sd);const ch=mk('div','sent-choices');shuf(s.choices).forEach(w=>{const bt=mk('button','sent-choice',w);bt.onclick=()=>{if(stepDone)return;const ok=w===s.answer;stepDone=true;bt.classList.add(ok?'ok':'no');if(ok)document.getElementById('sPB').textContent=w;speak(s.answer);pAns(ok,b);};ch.appendChild(bt);});c.appendChild(ch);b.appendChild(c);}

// ══ MEMORY GAME ══
function showMemoryGame(){
  const b=document.getElementById('pracBody');b.innerHTML='';
  const learned=LETTERS.filter((_,i)=>getDone(i)>0);
  if(learned.length<4){b.innerHTML='<div style="text-align:center;padding:24px;font-weight:700;color:#5838fa">למד 4 אותיות קודם!</div>';return;}
  const pick=shuf(learned).slice(0,6);
  let cards=[];pick.forEach(lt=>{cards.push({id:lt.L+'_em',match:lt.L,type:'em',em:lt.wEm,txt:lt.word});cards.push({id:lt.L+'_lt',match:lt.L,type:'lt',em:'',txt:lt.L+lt.l});});
  cards=shuf(cards);
  let flipped=[],matched=0,moves=0;
  b.appendChild(mk('div','mem-stats','<span id="memMoves">0 מהלכים</span> · <span id="memPairs">0/'+pick.length+'</span>'));
  const grid=mk('div','mem-grid');
  cards.forEach((c,i)=>{
    const card=mk('div','mem-card');card.dataset.idx=i;card.dataset.match=c.match;
    card.innerHTML=`<div class="mem-card-inner"><div class="mem-face mem-front">?</div><div class="mem-face mem-back">${c.type==='em'?'<div class="mem-back-em">'+c.em+'</div><div class="mem-back-txt">'+c.txt+'</div>':'<div style="font-size:28px;font-weight:900;color:#5838fa">'+c.txt+'</div>'}</div></div>`;
    card.onclick=()=>{
      if(card.classList.contains('flipped')||card.classList.contains('matched')||flipped.length>=2)return;
      card.classList.add('flipped');SFX.play('click');flipped.push(card);
      if(flipped.length===2){moves++;document.getElementById('memMoves').textContent=moves+' מהלכים';
        if(flipped[0].dataset.match===flipped[1].dataset.match){
          flipped.forEach(f=>f.classList.add('matched'));matched++;document.getElementById('memPairs').textContent=matched+'/'+pick.length;SFX.play('correct');
          if(matched===pick.length){setTimeout(()=>{LS.memWins=(LS.memWins||0)+1;LS.xp+=20;sLS();checkAchievements();b.innerHTML=`<div style="text-align:center;padding:24px;"><div style="font-size:56px">🎉</div><div style="font-size:18px;font-weight:700;color:#5838fa;margin:8px 0">מעולה! ${moves} מהלכים</div><div style="font-size:14px;color:#888">+20 XP</div><button class="act-btn go" onclick="showMemoryGame()" style="margin-top:12px">שוב 🔄</button></div>`;},600);}
          flipped=[];
        }else{setTimeout(()=>{flipped.forEach(f=>f.classList.remove('flipped'));flipped=[];SFX.play('wrong');},800);}
      }
    };
    grid.appendChild(card);
  });
  b.appendChild(grid);
}

// ══ DICTIONARY ══
let dictSort='group';
function setDictSort(s){dictSort=s;document.querySelectorAll('.dict-sort-btn').forEach(b=>b.classList.toggle('on',b.dataset.sort===s));renderDict();}
function showDict(){sw('scDict');setNav('bnDict');document.getElementById('dictSearch').value='';document.getElementById('dictSub').textContent=totalLearnedWords()+' מילים';renderDict();}
function renderDict(){const b=document.getElementById('dictBody');b.innerHTML='';const q=(document.getElementById('dictSearch').value||'').toLowerCase();let learned=LETTERS.filter((_,i)=>getDone(i)>0);if(!learned.length){b.innerHTML='<div style="text-align:center;padding:30px;color:#bbb">עדיין לא למדת! 🚀</div>';return;}if(dictSort==='abc')learned=learned.slice().sort((a,b)=>a.L.localeCompare(b.L));const addSec=t=>{b.appendChild(mk('div','dict-sec-header',`<div class="dict-sec-title">${t}</div><div class="dict-sec-line"></div>`));};addSec('📖 אותיות ('+learnedCount()+')');let lg=0;learned.forEach(lt=>{const s=[lt.L,lt.l,lt.word,...lt.more.map(m=>m.w+' '+m.he)].join(' ').toLowerCase();if(q&&!s.includes(q))return;if(dictSort==='group'&&lt.grp!==lg){lg=lt.grp;if(!q)addSec(lt.gName);}const c=mk('div','dict-card');c.innerHTML=`<div class="dc-top"><div class="dc-letters"><div class="dc-big">${lt.L}</div><div class="dc-small">${lt.l}</div><div class="dc-snd">"${lt.sound}"</div></div><div class="dc-main"><div class="dc-em">${lt.wEm}</div><div class="dc-en">${lt.word}</div><div class="dc-phon">${lt.wPhon}</div><div class="dc-he">${lt.wHe}</div></div></div><div class="dc-extra">${lt.more.map(m=>`<div class="dc-chip">${m.em} ${m.w} <span style="color:#888;font-size:10px">${m.he}</span></div>`).join('')}</div>`;c.onclick=()=>speak(lt.word);b.appendChild(c);});if(!b.querySelector('.dict-card'))b.innerHTML='<div style="text-align:center;padding:20px;color:#bbb">לא נמצא</div>';}

// ══ PROGRESS ══
function showProgress(){sw('scProg');setNav('bnProg');const lc=learnedCount(),wc=totalLearnedWords(),ts=Object.values(LS.lc).reduce((a,s)=>a+s,0)+Object.values(LS.pc).reduce((a,s)=>a+s,0);const p=profiles.find(x=>x.id===activeId)||{name:'?',avatar:'😊'};const b=document.getElementById('progBody');b.innerHTML=`
<div class="prog-card" style="background:linear-gradient(135deg,#1a1a2e,#0f3460);color:white;border:none;"><div style="font-size:32px">${p.avatar}</div><div style="font-size:20px;font-weight:700;margin-top:6px">${p.name}</div><div style="font-size:12px;opacity:.7;margin-top:3px">רמה ${Math.floor(LS.xp/200)+1} · ${LS.xp} XP · 🔥 ${LS.streak} ימים</div></div>
<div class="prog-card"><div class="prog-card-t">📊 סטטיסטיקות</div><div class="g2"><div class="mstat"><div class="mstat-n">${lc}/26</div><div class="mstat-l">אותיות</div></div><div class="mstat"><div class="mstat-n">${wc}</div><div class="mstat-l">מילים</div></div><div class="mstat"><div class="mstat-n">${ts}</div><div class="mstat-l">⭐</div></div><div class="mstat"><div class="mstat-n">${LS.writes||0}</div><div class="mstat-l">✍️</div></div></div></div>
<div class="prog-card"><div class="prog-card-t">🏅 הישגים (${LS.achievements.length}/${ACHIEVEMENTS.length})</div><div class="ach-grid">${ACHIEVEMENTS.map(a=>`<div class="ach-badge ${LS.achievements.includes(a.id)?'earned':'locked'}"><div class="ach-em">${a.em}</div><div class="ach-title">${a.title}</div><div class="ach-desc">${a.desc}</div></div>`).join('')}</div></div>
<div class="prog-card"><div class="prog-card-t">📖 אותיות (${lc}/26)</div><div style="background:#f0eeff;border-radius:10px;height:10px;overflow:hidden;margin-bottom:14px;"><div style="background:linear-gradient(90deg,#5838fa,#a855f7);height:100%;border-radius:10px;width:${lc/26*100}%"></div></div>${LETTERS.filter((_,i)=>getDone(i)>0).map(lt=>{const i=LETTERS.indexOf(lt),s=getDone(i);return `<div class="les-row-p"><div class="lrp-l"><span class="lrp-letter">${lt.L}</span><div><div class="lrp-word">${lt.wEm} ${lt.word} = ${lt.wHe}</div><div class="lrp-phon">${lt.wPhon}</div></div></div><div>${'⭐'.repeat(s)+'☆'.repeat(3-s)}</div></div>`;}).join('')}${lc===0?'<div style="color:#bbb;text-align:center;padding:16px">עדיין לא 🚀</div>':''}</div>`;}

// ══ SETTINGS ══
function showSettings(){
  sw('scSettings');const b=document.getElementById('settingsBody');const ex=LS.settings.exercises;const sp=LS.settings.ttsSpeed;
  const exNames={intro:'📌 הכרת האות',listen:'🔊 האזנה למילים',write_letter:'✍️ כתיבת אות',mcq_pic:'🖼️ בחירת תמונה',dictation:'🎧 הכתבה (שמע)',write_word:'✍️ כתיבת מילה',mcq_letter:'🔤 בחירת אות',sentence:'💬 השלמת משפט'};
  b.innerHTML=`
<div class="set-card"><div class="set-card-t">🎨 מראה</div>
<div class="set-row"><div><div class="set-row-label">🌙 מצב כהה</div><div class="set-row-desc">עיצוב כהה לעיניים</div></div><div class="toggle ${LS.settings.darkMode?'on':''}" onclick="toggleDark(this)"></div></div>
</div>
<div class="set-card"><div class="set-card-t">🔊 מהירות דיבור</div>
<div class="set-row"><div><div class="set-row-label">מהירות TTS</div><div class="set-row-desc" id="spdLabel">${sp<=0.5?'איטי':sp<=0.8?'רגיל':'מהיר'} (${sp})</div></div></div>
<input type="range" class="set-slider" id="spdSlider" min="0.4" max="1.2" step="0.1" value="${sp}" oninput="changeTTS(this.value)"/>
</div>
<div class="set-card"><div class="set-card-t">📝 סוגי תרגילים בשיעור</div>
${Object.entries(exNames).map(([k,v])=>`<div class="set-row"><div class="set-row-label">${v}</div><div class="toggle ${ex[k]?'on':''}" onclick="toggleEx('${k}',this)"></div></div>`).join('')}
</div>
<div class="set-card"><div class="set-card-t">🔧 מתקדם</div>
<button class="set-btn dev ${LS.settings.devMode?'active':''}" id="devBtn" onclick="toggleDev()">🔓 מצב בדיקה — ${LS.settings.devMode?'פעיל':'כבוי'}</button>
<div style="font-size:11px;color:#aaa;margin-top:6px;text-align:center">פותח את כל השלבים ללא צורך בהתקדמות</div>
</div>`;
}
function changeTTS(v){v=parseFloat(v);LS.settings.ttsSpeed=v;sLS();document.getElementById('spdLabel').textContent=(v<=0.5?'איטי':v<=0.8?'רגיל':'מהיר')+' ('+v+')';speak('Hello');}
function toggleEx(k,el){LS.settings.exercises[k]=LS.settings.exercises[k]?0:1;el.classList.toggle('on');sLS();}
function toggleDev(){LS.settings.devMode=!LS.settings.devMode;sLS();document.getElementById('devBtn').textContent='🔓 מצב בדיקה — '+(LS.settings.devMode?'פעיל':'כבוי');document.getElementById('devBtn').classList.toggle('active',LS.settings.devMode);toast(LS.settings.devMode?'🔓 כל השלבים פתוחים!':'🔒 מצב רגיל');}
function toggleDark(el){LS.settings.darkMode=!LS.settings.darkMode;sLS();document.body.classList.toggle('dark',LS.settings.darkMode);el.classList.toggle('on',LS.settings.darkMode);toast(LS.settings.darkMode?'🌙 מצב כהה':'☀️ מצב בהיר');}

// ══ SMART MEMORY (SRS) ══
function srsRecord(word,correct){word=word.toLowerCase();if(!LS.srs[word])LS.srs[word]={c:0,w:0,last:0,next:0,ease:2.5};const s=LS.srs[word];s.last=Date.now();if(correct){s.c++;s.ease=Math.min(4,s.ease+0.1);s.next=Date.now()+Math.min(Math.pow(s.ease,s.c)*3600000,7*86400000);}else{s.w++;s.ease=Math.max(1.3,s.ease-0.2);s.next=Date.now()+600000;}sLS();}
function getWeakWords(n=5){const now=Date.now();return Object.entries(LS.srs).filter(([k,v])=>v.next<=now||v.w>v.c).sort((a,b)=>(a[1].c/(a[1].c+a[1].w+1))-(b[1].c/(b[1].c+b[1].w+1))).slice(0,n).map(([k])=>k);}
function getWordScore(word){const s=LS.srs[word.toLowerCase()];if(!s)return 0;return Math.round(s.c/(s.c+s.w+1)*100);}

// ══ LANGUAGE TIPS ══
function maybeShowLangTip(text,container){const shown=LS.tipsShown||[];for(const tip of LANG_TIPS){if(shown.includes(tip.id))continue;if(tip.trigger.some(t=>text.toLowerCase().includes(t.toLowerCase()))){shown.push(tip.id);LS.tipsShown=shown;sLS();const d=mk('div','lang-tip anim-slideUp');d.innerHTML=`<div class="lang-tip-title">${tip.title}</div><div class="lang-tip-body">${tip.tip}</div><div class="lang-tip-ex">💡 ${tip.ex}</div>`;container.appendChild(d);return;}}}

// ══ BILINGUAL TTS ══
let bilQ=[],bilPlaying=false,bilIdx=0;
function playBilingual(lines,lineEls){if(bilPlaying){stopBil();return;}bilQ=lines;bilIdx=0;bilPlaying=true;playBilNext(lineEls);}
async function playBilNext(els){
  if(!bilPlaying||bilIdx>=bilQ.length){stopBil();return;}
  const l=bilQ[bilIdx];els.forEach((e,i)=>{e.classList.toggle('active',i===bilIdx);});
  const rate=(LS.settings&&LS.settings.ttsSpeed)||0.72;
  const TTS=IS_NATIVE&&window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.TextToSpeech;
  if(TTS){
    try{
      await TTS.speak({text:l.en,lang:'en-US',rate});
      if(!bilPlaying)return;
      await new Promise(r=>setTimeout(r,300));
      await TTS.speak({text:l.he,lang:'he-IL',rate:0.85});
      if(!bilPlaying)return;
      bilIdx++;await new Promise(r=>setTimeout(r,400));
      playBilNext(els);return;
    }catch(e){}
  }
  if(!window.speechSynthesis)return;
  const en=new SpeechSynthesisUtterance(l.en);en.lang='en-US';en.rate=rate;
  en.onend=()=>{setTimeout(()=>{const he=new SpeechSynthesisUtterance(l.he);he.lang='he-IL';he.rate=0.85;he.onend=()=>{bilIdx++;setTimeout(()=>playBilNext(els),400);};speechSynthesis.speak(he);},300);};
  speechSynthesis.speak(en);
}

// ══ FLASHCARDS TAB ══
function showFlashcards(){
  const b=document.getElementById('pracBody');b.innerHTML='';
  const allW=Object.values(LS.learnedWords);
  if(allW.length<4){b.innerHTML='<div style="text-align:center;padding:24px;font-weight:700;color:#5838fa">למד עוד מילים! 📚</div>';return;}
  // Prioritize weak words
  const weak=getWeakWords(10);const pool=weak.length>=4?allW.filter(w=>weak.includes(w.w.toLowerCase())):shuf(allW).slice(0,8);
  let idx=0;
  function renderCard(){
    b.innerHTML='';
    if(idx>=pool.length){LS.fcDone=(LS.fcDone||0)+pool.length;sLS();checkAchievements();b.innerHTML=`<div style="text-align:center;padding:24px;"><div style="font-size:56px">🎴</div><div style="font-size:18px;font-weight:700;color:#5838fa;margin:8px 0">עברת ${pool.length} כרטיסיות!</div><button class="act-btn go" onclick="showFlashcards()" style="margin-top:12px">שוב 🔄</button></div>`;return;}
    const w=pool[idx];
    b.appendChild(mk('div','fc-counter',`${idx+1}/${pool.length}`));
    const card=mk('div','fc-card');card.innerHTML=`<div class="fc-inner"><div class="fc-face fc-front"><div style="font-size:36px;opacity:.3">❓</div><div class="fc-front-word">${w.w}</div><div class="fc-front-phon">📢 ${w.phon}</div><div style="font-size:11px;opacity:.4;margin-top:6px">לחץ לראות תרגום</div></div><div class="fc-face fc-back"><div style="font-size:48px">${w.em||'📝'}</div><div class="fc-back-he">${w.he}</div><div class="fc-back-sub">${w.phon}</div></div></div>`;
    card.onclick=()=>{card.classList.toggle('flipped');speak(w.w);};
    b.appendChild(card);b.appendChild(mk('div','fc-hint','👆 לחץ להפוך'));
    const nav=mk('div','fc-nav');
    const know=mk('button','fc-nav-btn know','ידעתי ✓');know.onclick=()=>{srsRecord(w.w,true);SFX.play('correct');idx++;renderCard();};
    const dunno=mk('button','fc-nav-btn dunno','לא ידעתי ✗');dunno.onclick=()=>{srsRecord(w.w,false);SFX.play('wrong');idx++;renderCard();};
    nav.appendChild(know);nav.appendChild(dunno);b.appendChild(nav);
  }
  renderCard();
}

// ══ THEMES TAB ══
function showThemes(){
  const b=document.getElementById('pracBody');b.innerHTML='';
  b.appendChild(mk('div','mcq-prompt anim-slideUp','🌍 בחר נושא ללמוד'));
  const grid=mk('div','theme-grid anim-slideUp');
  THEMES.forEach(th=>{
    const card=mk('div','theme-card');
    card.innerHTML=`<div class="theme-card-em">${th.emoji}</div><div class="theme-card-title">${th.title}</div><div class="theme-card-count">${th.words.length} מילים</div>`;
    card.style.borderColor=th.color;
    card.onclick=()=>startThemeLesson(th);
    grid.appendChild(card);
  });
  b.appendChild(grid);
}
function startThemeLesson(th){
  const b=document.getElementById('pracBody');b.innerHTML='';let step=0;
  function renderThStep(){
    b.innerHTML='';
    if(step===0){// Intro - show all words
      b.appendChild(mk('div','mcq-prompt anim-slideUp',`${th.emoji} ${th.title}`));
      th.words.forEach((w,i)=>{const d=mk('div','listen-item anim-slideUp');d.style.animationDelay=i*.06+'s';d.innerHTML=`<div class="li-em">${w.em}</div><div class="li-body"><div class="li-en">${w.w}</div><div class="li-phon">${w.phon}</div><div class="li-he">${w.he}</div></div><div class="li-spk">🔊</div>`;d.onclick=()=>{speak(w.w);SFX.play('click');};b.appendChild(d);});
      const nb=mk('button','act-btn go anim-slideUp','למבחן! ←');nb.onclick=()=>{step=1;renderThStep();};b.appendChild(nb);
    }else if(step<=th.words.length){// MCQ for each word
      const w=th.words[step-1];const wrong=shuf(th.words.filter(x=>x.w!==w.w)).slice(0,3);const opts=shuf([w,...wrong]);
      b.appendChild(mk('div','card center anim-slideUp',`<div style="font-size:20px;font-weight:700;margin-bottom:4px">${w.he}</div><div style="font-size:40px">${w.em}</div><div style="font-size:12px;color:#aaa;margin-top:4px">${step}/${th.words.length}</div>`));
      const g=mk('div','mcq-opts anim-slideUp');let done=false;
      opts.forEach(o=>{const bt=mk('button','mcq-opt');bt.innerHTML=`<span class="opt-en">${o.w}</span><span class="opt-phon">${o.phon}</span>`;bt.onclick=()=>{if(done)return;done=true;g.querySelectorAll('button').forEach(x=>x.disabled=true);const ok=o.w===w.w;bt.classList.add(ok?'ok':'no');if(!ok)g.querySelectorAll('button').forEach(x=>{if(x.querySelector('.opt-en').textContent===w.w)x.classList.add('ok');});srsRecord(w.w,ok);if(ok){SFX.play('correct');LS.xp+=5;sLS();}else SFX.play('wrong');
        // Add to learned words
        if(!LS.learnedWords[w.w.toLowerCase()])LS.learnedWords[w.w.toLowerCase()]={w:w.w,phon:w.phon,he:w.he,em:w.em,ts:Date.now()};sLS();
        const nb=mk('button','act-btn go anim-slideUp','הבאה ←');nb.onclick=()=>{step++;renderThStep();};b.appendChild(nb);};g.appendChild(bt);});
      b.appendChild(g);
    }else{// Done
      LS.themesDone=(LS.themesDone||0)+1;sLS();checkAchievements();
      b.innerHTML=`<div style="text-align:center;padding:24px;"><div style="font-size:56px">${th.emoji}</div><div style="font-size:18px;font-weight:700;color:#5838fa;margin:8px 0">סיימת: ${th.title}!</div><div style="font-size:14px;color:#888">+${th.words.length*5} XP</div><button class="act-btn go" onclick="showThemes()" style="margin-top:12px">נושאים נוספים 🌍</button></div>`;
    }
  }
  renderThStep();
}

// ══ REVIEW SESSION (after game over) ══
function startReviewSession(words){
  if(!words.length){showHome();return;}
  sw('scLesson');document.getElementById('lTitle').textContent='📝 חזרה על טעויות';
  curStep=0;hearts=3;mistakes=0;stepDone=false;isPhrase=false;isDailyChallenge=false;
  const allLearned=Object.values(LS.learnedWords);
  const reviewSteps=words.map(w=>{
    const wdata=allLearned.find(x=>x.w.toLowerCase()===w.toLowerCase())||{w,phon:'',he:'?',em:'📝'};
    const dist=shuf(allLearned.filter(x=>x.w.toLowerCase()!==w.toLowerCase())).slice(0,3);
    return {type:'review_mcq',target:wdata,dist};
  });
  let rIdx=0;
  function renderReview(){
    if(rIdx>=reviewSteps.length){showHome();toast('✅ חזרה הושלמה! לבבות חזרו');return;}
    const body=document.getElementById('lesBody');body.innerHTML='';stepDone=false;
    const rs=reviewSteps[rIdx];
    document.getElementById('lStep').textContent=(rIdx+1)+'/'+reviewSteps.length;
    document.getElementById('lProgFill').style.width=(rIdx/reviewSteps.length*100)+'%';
    body.appendChild(mk('div','card center anim-slideUp',`<div style="font-size:48px">${rs.target.em}</div><div style="font-size:14px;color:#888;margin-top:4px">${rs.target.he}</div><div style="font-size:12px;color:#a855f7">${rs.target.phon||''}</div>`));
    const opts=shuf([rs.target,...rs.dist]);
    const g=mk('div','mcq-opts anim-slideUp');
    opts.forEach(o=>{const bt=mk('button','mcq-opt');bt.innerHTML=`<span class="opt-en">${o.w}</span>`;bt.onclick=()=>{if(stepDone)return;stepDone=true;g.querySelectorAll('button').forEach(x=>x.disabled=true);const ok=o.w.toLowerCase()===rs.target.w.toLowerCase();bt.classList.add(ok?'ok':'no');if(!ok)g.querySelectorAll('button').forEach(x=>{if(x.querySelector('.opt-en').textContent===rs.target.w)x.classList.add('ok');});srsRecord(rs.target.w,ok);if(ok)SFX.play('correct');else SFX.play('wrong');
      const nb=mk('button','act-btn go anim-slideUp','הבאה ←');nb.onclick=()=>{rIdx++;renderReview();};body.appendChild(nb);};g.appendChild(bt);});
    body.appendChild(g);
  }
  renderReview();
}

// ══ BILINGUAL STORY UPGRADE ══
// Override rStoryRead to use bilingual TTS

// ══ PRACTICE GAMES ══
function _pracLearned(){const l=LETTERS.filter((_,i)=>getDone(i)>0);if(l.length<2){document.getElementById('pracBody').innerHTML='<div style="text-align:center;padding:24px;font-weight:700;color:#5838fa">למד 2 אותיות קודם!</div>';return null;}return l;}

function showPracScramble(){const l=_pracLearned();if(!l)return;const b=document.getElementById('pracBody');b.innerHTML='';
  let qi=0,total=6,score=0;
  function nextQ(){
    b.innerHTML='';if(qi>=total){b.innerHTML=`<div style="text-align:center;padding:24px;"><div style="font-size:56px">${score>=4?'🏆':'💪'}</div><div style="font-size:18px;font-weight:700;color:#5838fa;margin:8px 0">${score}/${total}</div><button class="act-btn go" onclick="showPracScramble()" style="margin-top:12px">שוב 🔄</button></div>`;return;}
    const lt=l[Math.floor(Math.random()*l.length)];const word=lt.word.toUpperCase();const letters=shuf(word.split(''));let placed=new Array(word.length).fill('');
    b.appendChild(mk('div','mcq-prompt anim-slideUp',`🎯 ${qi+1}/${total} — סדר: ${lt.wEm} ${lt.wPhon}`));
    const slotsEl=mk('div','scram-slots');slotsEl.id='pss';b.appendChild(slotsEl);
    const chipsEl=mk('div','scram-chips');chipsEl.id='psc';b.appendChild(chipsEl);
    function render(){
      slotsEl.innerHTML='';chipsEl.innerHTML='';
      word.split('').forEach((_,i)=>{const s=mk('div','scram-slot'+(placed[i]?' filled':''));s.textContent=placed[i]||'';if(placed[i])s.onclick=()=>{placed[i]='';render();};slotsEl.appendChild(s);});
      const usedIdxs=[];placed.forEach(p=>{if(p){const fi=letters.findIndex((x,j)=>x===p&&!usedIdxs.includes(j));if(fi>=0)usedIdxs.push(fi);}});
      letters.forEach((ch,i)=>{const s=mk('div','scram-chip'+(usedIdxs.includes(i)?' used':''));s.textContent=ch;s.onclick=()=>{if(usedIdxs.includes(i))return;let si=-1;for(let j=0;j<word.length;j++){if(!placed[j]){si=j;break;}}if(si===-1)return;placed[si]=ch;SFX.play('click');render();if(placed.join('')===word){score++;SFX.play('correct');speak(lt.word);qi++;setTimeout(nextQ,600);}};chipsEl.appendChild(s);});
    }
    render();qi++;
  }
  nextQ();
}
function showPracTF(){const l=_pracLearned();if(!l)return;const b=document.getElementById('pracBody');b.innerHTML='';
  let qi=0,total=8,score=0;
  function nextQ(){
    b.innerHTML='';if(qi>=total){b.innerHTML=`<div style="text-align:center;padding:24px;"><div style="font-size:56px">${score>=6?'🏆':'💪'}</div><div style="font-size:18px;font-weight:700;color:#5838fa;margin:8px 0">${score}/${total}</div><button class="act-btn go" onclick="showPracTF()" style="margin-top:12px">שוב 🔄</button></div>`;return;}
    const lt=l[Math.floor(Math.random()*l.length)];const allW=[{w:lt.word,he:lt.wHe,em:lt.wEm},...lt.more];const target=allW[Math.floor(Math.random()*allW.length)];
    const isTrue=Math.random()>0.4;const fakeOpts2=shuf(allW.filter(x=>x.w!==target.w));const fakeHe=isTrue?target.he:(fakeOpts2.length?fakeOpts2[0].he:l[Math.floor(Math.random()*l.length)].wHe);
    b.appendChild(mk('div','speed-score anim-slideUp',`${qi+1}/${total} · ✓ ${score}`));
    const card=mk('div','tf-card anim-slideUp');card.innerHTML=`<div style="font-size:36px">${target.em}</div><div class="tf-word">${target.w}</div><div class="tf-claim">= ${fakeHe} ?</div><div class="tf-btns"><button class="tf-btn yes" id="ptfY">✓</button><button class="tf-btn no-btn" id="ptfN">✗</button></div>`;
    b.appendChild(card);let done=false;
    const handle=(userSaidTrue)=>{if(done)return;done=true;const ok=(userSaidTrue===isTrue);document.getElementById(userSaidTrue?'ptfY':'ptfN').classList.add(ok?'correct':'wrong');if(ok){score++;SFX.play('correct');}else SFX.play('wrong');srsRecord(target.w,ok);qi++;setTimeout(nextQ,600);};
    document.getElementById('ptfY').onclick=()=>handle(true);document.getElementById('ptfN').onclick=()=>handle(false);
  }
  nextQ();
}
function showPracCatch(){const l=_pracLearned();if(!l)return;const b=document.getElementById('pracBody');b.innerHTML='';
  let round=0,totalRounds=5,score=0;
  function nextRound(){
    b.innerHTML='';if(round>=totalRounds){b.innerHTML=`<div style="text-align:center;padding:24px;"><div style="font-size:56px">${score>=4?'🏆':'💪'}</div><div style="font-size:18px;font-weight:700;color:#5838fa;margin:8px 0">${score}/${totalRounds} תפיסות!</div><button class="act-btn go" onclick="showPracCatch()" style="margin-top:12px">שוב 🔄</button></div>`;return;}
    const lt=l[Math.floor(Math.random()*l.length)];const target={w:lt.word,he:lt.wHe,em:lt.wEm};
    const wrongPool=l.filter(x=>x.L!==lt.L).map(d=>({w:d.word}));
    const wrongs=shuf(wrongPool).slice(0,3);
    b.appendChild(mk('div','speed-score',`סיבוב ${round+1}/${totalRounds} · ✓ ${score}`));
    const arena=mk('div','catch-arena');arena.innerHTML=`<div class="catch-prompt-bar">${target.em} ${target.he}</div>`;b.appendChild(arena);
    let caught=false,waveNum=0,failTimer=null;
    function spawnWave(){
      if(caught||waveNum>=2)return;waveNum++;
      const waveWords=shuf([{w:target.w,ok:true},...wrongs.slice(0,2).map(x=>({w:x.w,ok:false}))]);
      waveWords.forEach((item,i)=>{
        setTimeout(()=>{
          if(caught)return;
          const el=document.createElement('div');el.className='catch-word';el.textContent=item.w;
          el.style.left=(10+i*22+Math.random()*10)+'%';el.style.top='-50px';
          arena.appendChild(el);
          let posY=-50;const spd=0.35+Math.random()*0.25;
          const fi=setInterval(()=>{if(caught){clearInterval(fi);el.remove();return;}posY+=spd;el.style.top=posY+'px';if(posY>240){clearInterval(fi);el.remove();}},16);
          el.onclick=()=>{if(caught)return;clearInterval(fi);
            if(item.ok){caught=true;if(failTimer)clearTimeout(failTimer);score++;el.classList.add('right');SFX.play('correct');speak(target.w);arena.querySelectorAll('.catch-word').forEach(x=>{if(x!==el)x.remove();});round++;setTimeout(nextRound,800);}
            else{el.classList.add('wrong-w');SFX.play('wrong');setTimeout(()=>el.remove(),400);}};
        },i*500);
      });
      if(waveNum<2)setTimeout(()=>spawnWave(),waveWords.length*500+1500);
    }
    setTimeout(spawnWave,300);
    failTimer=setTimeout(()=>{if(!caught){caught=true;arena.querySelectorAll('.catch-word').forEach(x=>x.remove());round++;setTimeout(nextRound,500);}},15000);
  }
  nextRound();
}
function showPracSpeed(){const l=_pracLearned();if(!l)return;const b=document.getElementById('pracBody');b.innerHTML='';
  const qs=[];for(let i=0;i<8;i++){const lt=l[Math.floor(Math.random()*l.length)];const allW=[{w:lt.word,he:lt.wHe,em:lt.wEm},...lt.more];const w=allW[Math.floor(Math.random()*allW.length)];
    const wrongs=shuf(l.filter(x=>x.L!==lt.L)).slice(0,2);const opts=[w.he, ...wrongs.map(x=>x.wHe).filter(Boolean)];qs.push({w:w.w,he:w.he,em:w.em,opts:shuf(opts)});}
  let qi=0,score=0,timeLeft=30;
  const timerEl=mk('div','speed-timer','30');b.appendChild(timerEl);
  const barEl=mk('div','speed-bar');barEl.innerHTML='<div class="speed-bar-fill" id="pspBar" style="width:100%"></div>';b.appendChild(barEl);
  const scoreEl=mk('div','speed-score','0/'+qs.length);b.appendChild(scoreEl);
  const qArea=mk('div','');qArea.id='pspArea';b.appendChild(qArea);
  const timer=setInterval(()=>{timeLeft--;timerEl.textContent=timeLeft;const pspBar=document.getElementById('pspBar');if(pspBar)pspBar.style.width=(timeLeft/30*100)+'%';if(timeLeft<=5)timerEl.classList.add('warn');if(timeLeft<=0){clearInterval(timer);finishSp();}},1000);
  function renderQ(){if(qi>=qs.length){clearInterval(timer);finishSp();return;}const q=qs[qi];qArea.innerHTML='';
    qArea.appendChild(mk('div','card center anim-slideUp',`<div style="font-size:32px">${q.em}</div><div style="font-size:18px;font-weight:900;direction:ltr">${q.w}</div>`));
    const g=mk('div','mcq-opts anim-slideUp');g.style.marginTop='8px';
    q.opts.forEach(opt=>{const bt=mk('button','mcq-opt');bt.textContent=opt;bt.onclick=()=>{const ok=opt===q.he;bt.classList.add(ok?'ok':'no');if(ok){score++;SFX.play('correct');}else SFX.play('wrong');srsRecord(q.w,ok);scoreEl.textContent=score+'/'+qs.length;qi++;setTimeout(renderQ,350);};g.appendChild(bt);});qArea.appendChild(g);}
  function finishSp(){qArea.innerHTML=`<div style="text-align:center;padding:16px;"><div style="font-size:56px">${score>=6?'🏆':'💪'}</div><div style="font-size:18px;font-weight:700;color:#5838fa;margin:8px 0">${score}/${qs.length} ב-${30-timeLeft} שניות!</div><button class="act-btn go" onclick="showPracSpeed()" style="margin-top:12px">שוב ⚡</button></div>`;}
  renderQ();
}

// ══ INIT ══

// == INIT ==
async function init(){
  await loadAll();
  allProfileData={};
  await Promise.all(profiles.map(async p=>{
    try{allProfileData[p.id]=await fetch('/api/data/'+p.id).then(r=>r.json());}catch(e){allProfileData[p.id]={};}
  }));
  if(activeId&&profiles.find(p=>p.id===activeId)){await loadLS();showHome();}
  else{sw('scProf');renderProfiles();}
}
init();
