/* On-device statistical learning; no network or language-model service. */
(function(root){
const COMMON='the be of and a to in he have it that for they with as not on she at by this we you do but from or which one would all will there say who make when can more if no man out other so what time up go about than into could state only new year some take come these know see use get like then first any work now may such give over think most even find day also after way many must look before great back through long where much should well people down own just because good each those feel seem how high too place little world very still nation hand old life tell write become here show house both between need mean call develop under last right move thing general school never same another begin while number part turn real leave might want point form off child few small since against ask late home interest large person end open public follow during present without again hold around possible head consider word program problem however lead system set order eye plan run keep face fact group play stand increase early course change help line'.split(' ');
const EXTRA='rhythm steady calm practice focus flow quiet light gentle clear green morning meadow river simple smile soft garden warm window water wonder welcome onward build better trust breath balance kind repeat learn learning letter typing type pattern careful precise precision receive believe friend field piece peace their there three through thought these those think thing together weather whether world would could should question quick quality quiet keyboard knowledge key string strong strength stretch start street stream structure little still million collect collection correct correction coordinate coffee success necessary assess access escape example exercise extra explore explanation bright bring branch between become behind across create creative pressure progress process problem people paper power proper public space speed spring special smooth small smart smile motion minute memory matter moment modern mountain natural nature number notice night right wrong write wrist track train training trade treat travel work word worth warm where which while whole without well really read reach reason ready repeat repair reduce improve improvement independent important interesting engineer engineering design science balance machine'.split(' ');
const WORDS=[...new Set([...COMMON,...EXTRA])];

const MAX_WORD_MS=6000;   // per-word times above this are treated as pauses and ignored
const MIN_WORD_LEN=2;     // shorter words are too noisy to judge

/* Combine per-key and per-pair counters from many sessions. */
function merge(sessions){
  const keys={},pairs={};
  for(const s of sessions){
    for(const [name,target] of [['keys',keys],['pairs',pairs]])
      for(const [k,v] of Object.entries(s[name]||{})){
        const t=target[k]||(target[k]={n:0,errors:0,ms:0,timed:0});
        for(const f of ['n','errors','ms','timed'])t[f]+=v[f]||0;
      }
  }
  return {keys,pairs};
}

/* Per-word speed model.
   Each session may carry `words: [{w, ms, e}]` (word text, time in ms, mistakes).
   For every word we compare its real time with the time it "should" have taken at
   the user's own average speed (length+1 chars, the +1 being the space). Every letter
   and letter pair inside the word is then credited with that word's actual and expected
   time, so a string is flagged when words containing it are slower than the user's norm,
   even if there were no typos. */
function wordModel(sessions){
  const ws=sessions.flatMap(s=>Array.isArray(s.words)?s.words:[])
    .map(x=>({w:String(x.w||'').toLowerCase().replace(/[^a-z]/g,''),ms:+x.ms,e:+x.e||0}))
    .filter(x=>x.w.length>=MIN_WORD_LEN&&x.ms>0&&x.ms<MAX_WORD_MS);

  const totalMs=ws.reduce((a,x)=>a+x.ms,0);
  const totalCh=ws.reduce((a,x)=>a+x.w.length+1,0);
  const msPerChar=totalCh?totalMs/totalCh:0;
  const baseWpm=msPerChar?12000/msPerChar:0;   // 1 word = 5 chars, 60000 ms / 5

  const tokens={},words={};
  for(const x of ws){
    const expected=(x.w.length+1)*msPerChar;
    const wd=words[x.w]||(words[x.w]={n:0,ms:0,e:0});
    wd.n++;wd.ms+=x.ms;wd.e+=x.e;

    const seen=new Set();   // count each string once per word occurrence
    for(let i=0;i<x.w.length;i++){
      seen.add(x.w[i]);
      if(i<x.w.length-1)seen.add(x.w.slice(i,i+2));
    }
    for(const t of seen){
      const v=tokens[t]||(tokens[t]={wn:0,wms:0,wexp:0});
      v.wn++;v.wms+=x.ms;v.wexp+=expected;
    }
  }

  const slowWords=Object.entries(words)
    .filter(([,v])=>v.n>=2)
    .map(([w,v])=>({w,n:v.n,errors:v.e,wpm:(w.length+1)*12000*v.n/v.ms}))
    .sort((a,b)=>a.wpm-b.wpm)
    .slice(0,5);

  return {tokens,baseWpm,slowWords,wordCount:ws.length};
}

/* Rank keys or letter pairs by how much they hurt the user.
   Score blends: error rate, keystroke hesitation, and (new) how slow whole words
   containing the string are relative to the user's average word speed. */
function rank(stats,tokens={},baseWpm=0,min=3){
  const all=Object.entries(stats);
  const base=all.reduce((a,[,v])=>a+v.ms,0)/Math.max(1,all.reduce((a,[,v])=>a+v.timed,0));

  return all
    .filter(([k,v])=>v.n>=min&&/^[a-z]{1,2}$/.test(k))
    .map(([token,v])=>{
      const delay=v.timed?v.ms/v.timed:0;
      const err=v.errors/v.n;
      const slow=base?Math.max(0,delay/base-1):0;

      const w=tokens[token];
      const hasW=!!w&&w.wn>=3;
      const wslow=hasW?Math.max(0,w.wms/w.wexp-1):0;               // 0.25 = words with this are 25% slower than usual
      const wordWpm=hasW&&w.wms?baseWpm*w.wexp/w.wms:0;            // typical wpm on words containing it

      const score=(err*2+Math.min(slow,2)*.22)*Math.min(1,v.n/10)
                 +(hasW?Math.min(wslow,1.5)*.3*Math.min(1,w.wn/8):0);

      return {
        token,...v,delay,errorRate:err,
        wn:hasW?w.wn:0,wslow,wordWpm,score,
        slow:slow>.45&&v.timed>=3
      };
    })
    .filter(v=>v.errors>0||v.slow||v.wslow>.2)
    .sort((a,b)=>b.score-a.score);
}

function analyze(sessions){
  const data=merge(sessions);
  const wm=wordModel(sessions);
  return {
    ...data,
    slowWords:wm.slowWords,
    baseWordWpm:wm.baseWpm,
    keyPatterns:rank(data.keys,wm.tokens,wm.baseWpm),
    pairPatterns:rank(data.pairs,wm.tokens,wm.baseWpm)
  };
}

function generate({count=180,focus=[],kind='normal',punctuation=false,numbers=false,random=Math.random}={}){
  let pool=kind==='rhythm'?COMMON.filter(w=>w.length<=6):WORDS;
  let targeted=pool.filter(w=>focus.some(f=>w.includes(f)));
  if(!targeted.length&&focus.length)
    targeted=focus.filter(f=>/^[a-z]{1,2}$/.test(f)).flatMap(f=>[f,f+f]);
  if(kind==='precision'&&!focus.length)
    targeted=EXTRA.filter(w=>/th|ie|ei|ss|ll|str/.test(w));

  const pick=a=>a[Math.floor(random()*a.length)];
  const output=[];
  for(let i=0;i<count;i++){
    let word=pick(targeted.length&&random()<.72?targeted:pool);
    if(word===output[output.length-1])word=pick(pool);
    if(numbers&&i%11===8)word=String(Math.floor(random()*900)+100);
    if(punctuation){
      if(i===0||/[.!?]$/.test(output[i-1]||''))word=word[0].toUpperCase()+word.slice(1);
      if(i%9===8)word+='.';else if(i%7===5)word+=',';
    }
    output.push(word);
  }
  return output.join(' ');
}

function observation(map,k,error,delay){
  if(!k||!/^\S{1,2}$/.test(k))return;
  const v=map[k]||(map[k]={n:0,errors:0,ms:0,timed:0});
  v.n++;
  if(error)v.errors++;
  if(delay>0&&delay<2500){v.ms+=delay;v.timed++;}
}

const api={COMMON,WORDS,analyze,rank,wordModel,generate,observation};
if(typeof module!=='undefined')module.exports=api;else root.TypeEngine=api;
})(typeof window!=='undefined'?window:globalThis);