const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const paths={keyboard:'M3 5h18v14H3z M6 9h.01 M10 9h.01 M14 9h.01 M18 9h.01 M6 12h.01 M10 12h.01 M14 12h.01 M18 12h.01 M7 16h10',sparkles:'m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3z M20 3v4 M18 5h4',chart:'M4 3v17h17 M8 15l4-5 4 2 5-7',sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5 19 19 M5 19l1.5-1.5 M17.5 6.5 19 5',help:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4 M12 17h.01',leaf:'M20 3C5 2 1 12 7 17c5 6 14 0 13-14z M5 21 16 10',clock:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M12 6v6l4 2',text:'M4 5h16 M12 5v15 M8 20h8',chevron:'m7 10 5 5 5-5',cursor:'m5 3 14 9-7 1-3 7L5 3z',restart:'M3 10a9 9 0 1 1 1 7 M3 4v6h6',lock:'M6 10h12v11H6z M8 10V7a4 4 0 0 1 8 0v3',arrow:'M4 12h15 M14 7l5 5-5 5',wave:'M2 12c3-11 5 11 8 0s5 11 8 0 4 0 4 0',target:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10 M12 12h.01',check:'m5 12 4 4L20 5'};
function icon(name){return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.sparkles}"/></svg>`;}
function icons(){$$('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));}icons();
const STORAGE='typewell-v1';let sessions=[],theme='light';try{const old=JSON.parse(localStorage.getItem(STORAGE)||'{}');sessions=Array.isArray(old.sessions)?old.sessions.filter(s=>s&&Number.isFinite(s.wpm)&&s.keys&&s.pairs).slice(-100):[];theme=old.theme||'light';}catch(e){}
document.body.classList.toggle('dark',theme==='dark');
function save(){try{localStorage.setItem(STORAGE,JSON.stringify({sessions,theme}));}catch(e){toast('Browser storage is full. This result will last for this visit.');}}

/* ---------- state ---------- */
let mode='time',duration=30,wordCount=25,punctuation=false,numbers=false,kind='normal',focus=[],view='practice';
let text='',typed=[],status='ready',started=0,timerId=null,tabHeld=false,scrollOffset=0;
let log=[];                       // during a test we ONLY append here: {t,c} for a character, {t,b:1} for a backspace
let charEls=[],paintedLen=0;      // cached DOM nodes for cheap repainting
let model=TypeEngine.analyze(sessions);

function toast(s){$('#toast').textContent=s;$('#toast').classList.add('show');clearTimeout(toast.timeout);toast.timeout=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
function updateDays(){const dates=new Set(sessions.map(s=>new Date(s.date).toLocaleDateString()));if(dates.size){$('#practice-days').textContent=`${dates.size} day${dates.size===1?'':'s'} of showing up`;$('#practice-days-sub').textContent=`${sessions.length} little step${sessions.length===1?'':'s'} forward`;}}
function options(){const values=mode==='time'?[15,30,60,120]:[10,25,50,100];$('#duration-options').innerHTML=values.map(n=>`<button data-duration="${n}" class="${n===(mode==='time'?duration:wordCount)?'selected':''}">${n}</button>`).join('');$$('[data-duration]').forEach(b=>b.onclick=()=>{if(mode==='time')duration=+b.dataset.duration;else wordCount=+b.dataset.duration;reset();options();});}
function buildKeyboard(){const rows=['qwertyuiop','asdfghjkl','zxcvbnm'];$('#keyboard').innerHTML=rows.map(row=>`<div class="key-row">${[...row].map(k=>{const stat=model.keys[k],weak=model.keyPatterns.some(p=>p.token===k);return `<span class="key ${stat?.n>=3?(weak?'weak':'good'):''}" data-key="${k}" title="${stat?`${k}: ${stat.n} attempts, ${stat.errors} mistakes`:`${k}: no practice data yet`}">${k}</span>`;}).join('')}</div>`).join('')+'<div class="key-row"><span class="key space-key" data-key=" ">space</span></div>';$('#keyboard-caption').textContent=sessions.length?'Built from your completed tests':'Your patterns will light up here';}

/* ---------- rendering ---------- */
function renderWords(){let pos=0;$('#words').innerHTML=text.split(' ').map((word,wi,all)=>`<span class="word">${[...word+(wi<all.length-1?' ':'')].map(ch=>{const index=pos++,state=index<typed.length?(typed[index]===ch?'correct':'incorrect'):'';return `<span class="char ${state} ${index===typed.length?'current':''}" data-index="${index}">${ch===' '? '&nbsp;':ch.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</span>`;}).join('')}</span>`).join('');$('#words').style.transform='translateY(0)';scrollOffset=0;charEls=$$('.char');paintedLen=typed.length;}
function paintChar(i){const el=charEls[i];if(el)el.className='char '+(i<typed.length?(typed[i]===text[i]?'correct':'incorrect'):'')+(i===typed.length?' current':'');}
function repaint(){const from=Math.max(0,Math.min(paintedLen,typed.length)-1),to=Math.max(paintedLen,typed.length)+1;for(let i=from;i<=to;i++)paintChar(i);const deleted=typed.length<paintedLen;paintedLen=typed.length;const cursor=charEls[typed.length];if(cursor&&(deleted||cursor.parentNode.firstChild===cursor)){const line=cursor.offsetTop;if(line-scrollOffset>58||line<scrollOffset){scrollOffset=line;$('#words').style.transform=`translateY(-${scrollOffset}px)`;}}}

function reset(){clearInterval(timerId);typed=[];log=[];status='ready';started=0;$('#typing-card').classList.remove('running');$('#results').hidden=true;['.test-meta','.live-stats','.typing-area','.test-bottom'].forEach(s=>$(s).hidden=false);$('#focus-prompt').hidden=true;$('#typing-input').value='';text=TypeEngine.generate({count:mode==='time'?260:wordCount,focus,kind,punctuation,numbers});renderWords();$('#timer').textContent=mode==='time'?duration:wordCount;$('#timer-unit').textContent=mode==='time'?'seconds':'words';$('#wpm').textContent='—';$('#accuracy').textContent='—';$('#test-state').textContent='ready when you are';$('#start-hint').innerHTML=icon('cursor')+' Click here or start typing to begin';$('#test-label').innerHTML='<span class="tiny-dot"></span> '+(kind==='adaptive'?'YOUR PERSONAL MIX':kind==='precision'?'PRECISION PRACTICE':kind==='rhythm'?'FIND YOUR RHYTHM':'THE EVERYDAY MIX');}

/* ---------- during the test: record only ---------- */
function enterChar(ch){
  if(status==='done'||ch.length!==1||typed.length>=text.length)return;
  const now=performance.now();
  if(status==='running'&&mode==='time'&&now-started>=duration*1000){finish();return;}
  if(status==='ready'){status='running';started=now;$('#typing-card').classList.add('running');$('#test-state').textContent='a little better, one key at a time';$('#start-hint').innerHTML=icon('wave')+' Find a comfortable rhythm. Accuracy comes first.';timerId=setInterval(tick,100);}
  log.push({t:now,c:ch});                       // timestamp right after the character is typed; nothing else is calculated
  typed.push(ch);
  repaint();
  const key=$(`[data-key="${/^[a-z ]$/i.test(ch)?ch.toLowerCase():'none'}"]`);if(key){key.classList.add('pressed');setTimeout(()=>key.classList.remove('pressed'),110);}
  if(typed.length===text.length){
    if(mode==='words')finish();
    else{text+=' '+TypeEngine.generate({count:150,focus,kind,punctuation,numbers});renderWords();repaint();}
  }
}
function deleteChar(){if(status==='running'&&typed.length){log.push({t:performance.now(),b:1});typed.pop();repaint();}}

/* live display, refreshed 10x/second by the timer rather than on every keystroke */
function tick(){
  if(status!=='running')return;
  const now=performance.now(),sec=Math.max(.001,(now-started)/1000);
  if(mode==='time'&&sec>=duration){finish();return;}
  let pos=0,attempts=0,ok=0;for(const e of log){if(e.b){pos--;continue;}attempts++;if(e.c===text[pos])ok++;pos++;}
  let correctChars=0;for(let i=0;i<typed.length;i++)if(typed[i]===text[i])correctChars++;
  $('#timer').textContent=mode==='time'?Math.max(0,Math.ceil(duration-sec)):Math.max(0,wordCount-text.slice(0,typed.length).split(' ').length+1);
  $('#wpm').textContent=sec>=1?Math.round(correctChars/5/(sec/60)):'—';
  $('#accuracy').textContent=attempts?Math.round(ok/attempts*100)+'%':'—';
}

/* ---------- after the test: replay the log ---------- */
function analyzeLog(log,text,start,fixedSeconds){
  const keys={},pairs={},words=[],samples=[],buf=[];
  let attempts=0,correctAttempts=0,correctChars=0,prev=0,nextSec=1;
  let wordBegin=0,wordStart=start,wordErr=0;
  for(const ev of log){
    const rel=(ev.t-start)/1000;
    while(rel>=nextSec){samples.push({t:nextSec,wpm:Math.round(correctChars/5/(nextSec/60))});nextSec++;}   // speed at each full second
    if(ev.b){
      const gone=buf.pop();if(gone===text[buf.length])correctChars--;
      prev=ev.t;
      if(buf.length<wordBegin&&words.length){const p=words.pop();wordBegin=p.i;wordStart=p.start;wordErr=p.e;}
      continue;
    }
    const pos=buf.length,expected=text[pos],err=ev.c!==expected,delay=prev?ev.t-prev:0;
    attempts++;if(!err){correctAttempts++;correctChars++;}else wordErr++;
    TypeEngine.observation(keys,expected.toLowerCase(),err,delay);
    if(pos&&expected!==' '&&text[pos-1]!==' ')TypeEngine.observation(pairs,(text[pos-1]+expected).toLowerCase(),err,delay);
    buf.push(ev.c);prev=ev.t;
    if(expected===' '||buf.length===text.length){
      const end=expected===' '?buf.length-1:buf.length;
      words.push({w:text.slice(wordBegin,end),ms:ev.t-wordStart,e:wordErr,i:wordBegin,start:wordStart,c:buf.length-wordBegin});
      wordBegin=buf.length;wordStart=ev.t;wordErr=0;
    }
  }
  const lastT=log.length?log[log.length-1].t:start;
  const sec=fixedSeconds||Math.max(.001,(lastT-start)/1000);
  const wpm=Math.round(correctChars/5/(sec/60));
  if(!samples.length||samples[samples.length-1].t<sec)samples.push({t:Math.round(sec),wpm});
  return {keys,pairs,samples,attempts,correctAttempts,sec,wpm,
          accuracy:attempts?Math.round(correctAttempts/attempts*100):100,
          words:words.map(({w,ms,e,c})=>({w,ms:Math.round(ms),e,c}))};
}

function smoothPath(pts){
  if(pts.length<3)return 'M'+pts.map(p=>p.join(',')).join(' L');
  let d=`M${pts[0][0]},${pts[0][1]}`;
  for(let i=0;i<pts.length-1;i++){
    const p0=pts[i-1]||pts[i],p1=pts[i],p2=pts[i+1],p3=pts[i+2]||p2;
    const lo=Math.min(p1[1],p2[1]),hi=Math.max(p1[1],p2[1]);                 // clamp so the curve never overshoots its neighbours
    const c1y=Math.min(hi,Math.max(lo,p1[1]+(p2[1]-p0[1])/6)),c2y=Math.min(hi,Math.max(lo,p2[1]-(p3[1]-p1[1])/6));
    d+=` C${(p1[0]+(p2[0]-p0[0])/6).toFixed(1)},${c1y.toFixed(1)} ${(p2[0]-(p3[0]-p1[0])/6).toFixed(1)},${c2y.toFixed(1)} ${p2[0]},${p2[1].toFixed(1)}`;
  }
  return d;
}
function chart(data,height=75){if(!data.length)return '';const max=Math.max(30,...data.map(d=>d.wpm))*1.1,w=600,pad=6;const y=v=>height-v/max*(height-10);const pts=data.length===1?[[pad,y(data[0].wpm)],[w-pad,y(data[0].wpm)]]:data.map((d,i)=>[pad+i/(data.length-1)*(w-pad*2),y(d.wpm)]);const line=smoothPath(pts);return `<svg class="${height>100?'history-chart':'result-chart'}" viewBox="0 0 ${w} ${height}" preserveAspectRatio="none" role="img" aria-label="Typing speed over time"><path d="M0 ${height*.3}H600 M0 ${height*.65}H600" stroke="var(--line)" stroke-dasharray="3 5"/><path d="${line} L${pts[pts.length-1][0]},${height} L${pts[0][0]},${height}Z" fill="var(--sage)" stroke="none"/><path d="${line}" stroke="var(--green)" stroke-width="2" fill="none" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;}
function wordHistoryHTML(words){
  const rows=words.filter(x=>x.ms>0).map(x=>({w:x.w,e:x.e,wpm:Math.round((x.c||x.w.length+1)*12000/x.ms)}));
  if(!rows.length)return '<p class="note">No completed words in this test.</p>';
  const avg=Math.round(rows.reduce((a,r)=>a+r.wpm,0)/rows.length),top=Math.max(...rows.map(r=>r.wpm),1);
  return `<p class="note" style="margin:0 0 8px">${rows.length} words · average ${avg} wpm · per-word speed includes the pause before the first letter and any corrections</p><div style="max-height:240px;overflow:auto">${rows.map((r,i)=>`<div class="pattern-row"><span style="color:var(--muted);font-size:10px;min-width:22px">${i+1}</span><span class="pattern-token" style="min-width:80px;text-align:left">${r.w.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</span><span style="flex:1;height:5px;border-radius:3px;background:var(--sage)"><span style="display:block;height:100%;width:${Math.round(r.wpm/top*100)}%;border-radius:3px;background:${r.e?'var(--amber)':'var(--green)'}"></span></span><span style="min-width:62px;text-align:right">${r.wpm} wpm</span><span style="min-width:60px;text-align:right;font-size:10px;color:${r.e?'var(--amber)':'var(--muted)'}">${r.e?r.e+' miss'+(r.e===1?'':'es'):'clean'}</span></div>`).join('')}</div>`;
}

function finish(){
  if(status!=='running')return;
  clearInterval(timerId);status='done';
  const r=analyzeLog(log,text,started,mode==='time'?duration:0);
  const {keys,pairs,samples,attempts,correctAttempts,wpm,accuracy,words}=r;
  const speeds=samples.map(x=>x.wpm),avg=speeds.reduce((a,b)=>a+b,0)/speeds.length;
  const deviation=Math.sqrt(speeds.reduce((a,b)=>a+(b-avg)**2,0)/speeds.length);
  const consistency=Math.max(0,Math.round((1-deviation/Math.max(1,avg))*100));
  const session={date:new Date().toISOString(),wpm,accuracy,consistency,seconds:Math.round(r.sec*10)/10,attempts,errors:attempts-correctAttempts,mode,kind,keys,pairs,samples,words};
  sessions.push(session);sessions=sessions.slice(-100);save();model=TypeEngine.analyze(sessions);
  $('#typing-input').blur();$('#typing-card').classList.remove('running');
  ['.test-meta','.live-stats','.typing-area','.test-bottom'].forEach(s=>$(s).hidden=true);
  $('#results').hidden=false;
  $('#results').innerHTML=`<div class="results-top"><div><span class="eyebrow">ONE LITTLE STEP FORWARD</span><h2>${accuracy>=97?'That’s a lovely rhythm.':'Progress starts with showing up.'}</h2></div><span class="coach-icon">${icon('check')}</span></div><div class="result-metrics"><div><strong>${wpm}</strong><small>words / minute</small></div><div><strong>${accuracy}%</strong><small>accuracy</small></div><div><strong>${consistency}%</strong><small>consistency</small></div><div><strong>${session.errors}</strong><small>mistakes</small></div></div>${chart(samples)}<div class="chart-label"><span>speed throughout your test</span><span>${session.seconds}s · ${attempts} keystrokes</span></div><div id="word-history" hidden style="padding:4px 0 14px">${wordHistoryHTML(words)}</div><div class="result-actions"><button class="primary" id="result-drill">Practice my patterns ${icon('sparkles')}</button><button class="secondary" id="toggle-words" aria-expanded="false">Word history</button><button class="secondary" id="next-test">Another test ${icon('arrow')}</button></div>`;
  $('#result-drill').onclick=()=>startDrill('adaptive');
  $('#toggle-words').onclick=e=>{const box=$('#word-history'),open=box.hidden;box.hidden=!open;e.currentTarget.setAttribute('aria-expanded',open);e.currentTarget.textContent=open?'Hide word history':'Word history';};
  $('#next-test').onclick=()=>{kind='normal';focus=[];reset();$('#typing-input').focus();};
  buildKeyboard();renderCoach();updateDays();
}

/* ---------- coach / insights ---------- */
function patternHTML(items){return items.slice(0,3).map(p=>`<div class="pattern-row"><span class="pattern-token">${p.token}</span><span>${p.errorRate>.03?'Accuracy opportunity':p.wslow>.2?'Slows down your words':'A small hesitation'}<small>${p.n} attempts${p.timed?' · '+Math.round(p.delay)+' ms average':''}${p.wn?' · words with it: '+Math.round(p.wordWpm)+' wpm':''}</small></span><span>${p.errors} miss${p.errors===1?'':'es'}</span></div>`).join('');}
function renderCoach(){const patterns=[...model.pairPatterns,...model.keyPatterns].sort((a,b)=>b.score-a.score).slice(0,3);const total=sessions.reduce((a,s)=>a+s.attempts,0);let content;if(!sessions.length){content=`<span class="status-pill">${icon('leaf')} GETTING TO KNOW YOU</span><h3>Your next breakthrough<br>starts here.</h3><p>Take a test and I'll find the little things that slow you down. Then we'll turn them into your next step forward.</p><div class="coach-note">${icon('target')}<div><strong>A baseline, not a finish line.</strong><small>Start with 30 seconds. Type naturally.<br>There's nothing to get right yet.</small></div></div><button class="primary" id="coach-action">Let's find your rhythm ${icon('arrow')}</button>`;}else if(patterns.length){content=`<span class="status-pill">${icon('sparkles')} ${total<200?'EARLY INSIGHTS':'YOUR PATTERNS'}</span><h3>Let's give “${patterns[0].token}”<br>a little attention.</h3><p>${total<200?'A few early signals from your typing. More practice will help me tell patterns from one-off slips.':'These patterns stand out across your tests. Your personal mix gives them a little more room to improve.'}</p><div class="coach-list">${patternHTML(patterns.slice(0,2))}</div><button class="primary" id="coach-action">Build my practice ${icon('arrow')}</button>`;}else{content=`<span class="status-pill">${icon('check')} LOOKING GOOD</span><h3>A steady start.<br>Keep it growing.</h3><p>No repeated trouble spots yet. Try a longer test to give your coach more to learn from.</p><div class="coach-note">${icon('wave')}<div><strong>${total} keystrokes and counting.</strong><small>A little consistency goes a long way. Try a rhythm drill next.</small></div></div><button class="primary" id="coach-action">Keep finding my rhythm ${icon('arrow')}</button>`;}$('#coach-content').innerHTML=content;$('#coach-action').onclick=()=>{if(!sessions.length){reset();$('#typing-input').focus();}else startDrill(patterns.length?'adaptive':'rhythm');};}
function startDrill(type){kind=type;const ranked=[...model.pairPatterns,...model.keyPatterns].sort((a,b)=>b.score-a.score);focus=type==='adaptive'?ranked.slice(0,4).map(p=>p.token):type==='precision'?['th','ie','ei','ss','ll']:[];if(type==='adaptive'&&!focus.length){focus=['th','er','in'];toast('A starter mix for now. Your next mix will use your typing patterns.');}setView('practice');reset();$('#typing-input').focus();$('#typing-card').scrollIntoView({behavior:'smooth',block:'center'});}
function empty(title,description){return `<div class="panel empty-state"><span class="coach-icon">${icon('leaf')}</span><h2>${title}</h2><p>${description}</p><button class="primary" data-start>Take your first test ${icon('arrow')}</button></div>`;}
function renderInsights(){const el=$('#insights-view');if(!sessions.length){el.innerHTML=empty('Every pattern starts with a keystroke.','Complete a typing test to discover your missed keys, troublesome letter pairs, and moments of hesitation. Your insights will be built from your own practice.');return;}const tries=sessions.reduce((a,s)=>a+s.attempts,0),error=sessions.reduce((a,s)=>a+s.errors,0);const slow=[...Object.entries(model.pairs)].filter(([,v])=>v.timed>=3).sort((a,b)=>b[1].ms/b[1].timed-a[1].ms/a[1].timed).slice(0,5);el.innerHTML=`<div class="summary-grid"><div class="summary-card"><span>Keystrokes learned from</span><strong>${tries.toLocaleString()}</strong><small>Across ${sessions.length} completed tests</small></div><div class="summary-card"><span>Overall accuracy</span><strong>${Math.round((tries-error)/tries*100)}%</strong><small>Includes corrected mistakes</small></div><div class="summary-card"><span>Patterns to practice</span><strong>${model.keyPatterns.length+model.pairPatterns.length}</strong><small>At least 3 observations per pattern</small></div></div><div class="insight-grid"><div class="panel"><h2>Keys that need a little love</h2><p>Repeated misses and hesitations, ranked by impact and evidence.</p>${model.keyPatterns.length?patternHTML(model.keyPatterns.slice(0,3)):'<p>No recurring key errors yet. Keep your rhythm going.</p>'}</div><div class="panel"><h2>Those tricky transitions</h2><p>A pair of letters can tell us more than a single key.</p>${model.pairPatterns.length?patternHTML(model.pairPatterns.slice(0,3)):'<p>No recurring pair patterns yet. Longer tests provide more evidence.</p>'}</div><div class="panel"><h2>Where your rhythm slows</h2><p>Average time between letters. Pauses over 2.5 seconds are excluded.</p>${slow.length?slow.map(([token,s])=>`<div class="pattern-row"><span class="pattern-token">${token}</span><span>${s.timed} timed transitions</span><span>${Math.round(s.ms/s.timed)} ms</span></div>`).join(''):'<p>More repeated letter pairs will help us measure your rhythm.</p>'}</div><div class="panel"><h2>Your slowest words</h2><p>Per-word speed, from the moment the previous word ended. Needs 2+ appearances.</p>${(model.slowWords||[]).length?model.slowWords.map(s=>`<div class="pattern-row"><span class="pattern-token" style="min-width:70px">${s.w}</span><span>${s.n} times</span><span>${Math.round(s.wpm)} wpm</span></div>`).join(''):'<p>Words need to repeat a couple of times before they show up here.</p>'}</div><div class="panel"><span class="coach-icon">${icon('sparkles')}</span><h2 style="margin-top:18px">Turn insight into instinct.</h2><p>Your personal mix weights practice toward your highest-impact patterns, with everyday words mixed in to keep it natural.</p><button class="primary" data-personal>Build my personal mix ${icon('arrow')}</button><div class="note">${tries<200?'Early signals: keep practicing to improve confidence.':'Your model learns from up to 100 recent tests.'}</div></div></div>`;}
function renderProgress(){const el=$('#progress-view');if(!sessions.length){el.innerHTML=empty('Your story starts here.','Your completed tests will appear here, so you can see your speed, accuracy, and consistency develop over time.');return;}const recent=sessions.slice(-10),best=Math.max(...sessions.map(s=>s.wpm)),avg=Math.round(recent.reduce((a,s)=>a+s.wpm,0)/recent.length),minutes=Math.round(sessions.reduce((a,s)=>a+s.seconds,0)/60*10)/10;el.innerHTML=`<div class="summary-grid"><div class="summary-card"><span>Personal best</span><strong>${best}</strong><small>words per minute</small></div><div class="summary-card"><span>Your recent rhythm</span><strong>${avg}</strong><small>Average WPM · last ${recent.length} tests</small></div><div class="summary-card"><span>Time well spent</span><strong>${minutes}</strong><small>minutes of focused practice</small></div></div><div class="panel"><h2>A little better over time.</h2><p>Your typing speed across your last ${Math.min(sessions.length,30)} tests.</p>${chart(sessions.slice(-30),180)}<div class="chart-label"><span>earlier tests</span><span>most recent</span></div></div><div class="panel" style="margin-top:24px"><div class="section-actions"><h2>Your practice journal</h2><button class="danger" id="clear-data">Clear practice data</button></div><div id="clear-confirm" hidden class="confirm-row"><span>Delete all test results and learned patterns?</span><button class="secondary danger" id="confirm-delete">Delete all data</button><button class="secondary" id="cancel-delete">Keep my data</button></div><table><thead><tr><th>WHEN</th><th>PRACTICE</th><th>WPM</th><th>ACCURACY</th><th>TIME</th></tr></thead><tbody>${sessions.slice().reverse().slice(0,20).map(s=>`<tr><td>${new Date(s.date).toLocaleDateString(undefined,{month:'short',day:'numeric'})} · ${new Date(s.date).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}</td><td>${{normal:'Everyday mix',adaptive:'Personal mix',rhythm:'Rhythm',precision:'Precision'}[s.kind]||'Everyday mix'}</td><td>${s.wpm}</td><td>${s.accuracy}%</td><td>${s.seconds}s</td></tr>`).join('')}</tbody></table><p class="note">Stored on this device · showing the latest ${Math.min(sessions.length,20)} of ${sessions.length} tests</p></div>`;$('#clear-data').onclick=()=>$('#clear-confirm').hidden=false;$('#cancel-delete').onclick=()=>$('#clear-confirm').hidden=true;$('#confirm-delete').onclick=()=>{sessions=[];model=TypeEngine.analyze(sessions);save();renderProgress();renderCoach();buildKeyboard();$('#practice-days').textContent='A fresh start';$('#practice-days-sub').textContent='a good day to get a little better';toast('Practice data cleared. A fresh start awaits.');};}
function setView(v){if(v!=='practice'&&status==='running'){toast('Finish or restart your test before switching views.');return;}view=v;$$('.nav').forEach(b=>b.classList.toggle('active',b.dataset.view===v));$$('.view').forEach(el=>el.hidden=el.id!==v+'-view');$('#page-title').innerHTML=({practice:'Find your flow',insights:'Get to know your typing',progress:'Little steps add up'}[v])+ '<span>.</span>';$('#page-description').textContent={practice:'Less chasing a score. More becoming a better typist.',insights:'Your habits, your hesitations, your next opportunity.',progress:'Every test is a little investment in yourself.'}[v];if(v==='insights')renderInsights();if(v==='progress')renderProgress();$$('[data-start]').forEach(b=>b.onclick=()=>{setView('practice');reset();$('#typing-input').focus();});$$('[data-personal]').forEach(b=>b.onclick=()=>startDrill('adaptive'));}

/* ---------- events ---------- */
$$('.nav').forEach(b=>b.onclick=()=>setView(b.dataset.view));$('.brand').onclick=e=>{e.preventDefault();setView('practice');};$$('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;$$('[data-mode]').forEach(x=>x.classList.toggle('selected',x===b));options();reset();});$$('[data-drill]').forEach(b=>b.onclick=()=>startDrill(b.dataset.drill));['punctuation','numbers'].forEach(id=>$('#'+id).onclick=()=>{if(id==='punctuation')punctuation=!punctuation;else numbers=!numbers;$('#'+id).setAttribute('aria-pressed',id==='punctuation'?punctuation:numbers);reset();});$('#restart').onclick=()=>{reset();$('#typing-input').focus();};
$('#typing-input').addEventListener('keydown',e=>{if(e.isComposing)return;if(e.key==='Escape'){e.preventDefault();e.target.blur();return;}if(e.ctrlKey||e.metaKey||e.altKey)return;if(e.key==='Backspace'){e.preventDefault();deleteChar();}else if(e.key.length===1){e.preventDefault();enterChar(e.key);}});$('#typing-input').addEventListener('beforeinput',e=>{if(e.inputType==='deleteContentBackward'){e.preventDefault();deleteChar();}});$('#typing-input').addEventListener('input',e=>{if(e.isComposing)return;for(const ch of e.target.value)enterChar(ch);e.target.value='';});$('#typing-input').addEventListener('paste',e=>{e.preventDefault();toast('Let your fingers do the learning. Pasting is disabled during tests.');});$('#typing-input').addEventListener('blur',()=>{if(status==='running')$('#focus-prompt').hidden=false;});$('#typing-input').addEventListener('focus',()=>$('#focus-prompt').hidden=true);$('#typing-area').onclick=()=>$('#typing-input').focus();
document.addEventListener('keydown',e=>{if($('#help-dialog').open)return;if(e.key==='Tab'){tabHeld=true;return;}if(e.key==='Enter'&&tabHeld&&view==='practice'){e.preventDefault();reset();$('#typing-input').focus();return;}if(view==='practice'&&status!=='done'&&e.target!==$('#typing-input')&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&e.key.length===1){e.preventDefault();$('#typing-input').focus();enterChar(e.key);}});document.addEventListener('keyup',e=>{if(e.key==='Tab')tabHeld=false;});window.addEventListener('blur',()=>tabHeld=false);
$('#theme').onclick=()=>{theme=theme==='dark'?'light':'dark';document.body.classList.toggle('dark',theme==='dark');save();};function help(){$('#help-dialog').showModal();}$('#help').onclick=help;$('#about-engine').onclick=help;$$('.dialog-close').forEach(b=>b.onclick=()=>$('#help-dialog').close());$('#help-dialog').onclick=e=>{if(e.target===$('#help-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}};
options();reset();buildKeyboard();renderCoach();updateDays();