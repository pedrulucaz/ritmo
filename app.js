"use strict";

(() => {
  const KEY = "ritmo.app.v1";
  const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  const GOALS = {muscle:"Ganhar massa muscular",fat:"Reduzir gordura",fitness:"Condicionamento",wellness:"Saúde e movimento"};
  const LEVELS = {beginner:"Iniciante",intermediate:"Intermediário",advanced:"Avançado"};
  const MODES = {both:"Musculação e corrida",strength:"Só musculação",run:"Só corrida"};
  const RUN_DISTANCES = [[0,"Estou começando (caminhada e trote)"],[2,"Até 2 km"],[3,"3 km"],[5,"5 km"],[8,"8 km"],[10,"10 km"],[15,"15 km ou mais"]];
  const PLACES = {gym:"Academia",home:"Em casa"};
  const SPLITS = {
    2:["fullA","fullB"],
    3:["fullA","fullB","fullC"],
    4:["upperA","lowerA","upperB","lowerB"],
    5:["push","pull","legs","upperA","lowerB"],
    6:["push","pull","legs","pushB","pullB","legsB"]
  };
  const SPLIT_NAMES = {
    fullA:"Corpo inteiro A",fullB:"Corpo inteiro B",fullC:"Corpo inteiro C",
    upperA:"Superior A",upperB:"Superior B",lowerA:"Inferior A",lowerB:"Inferior B",
    push:"Empurrar",pull:"Puxar",legs:"Pernas",pushB:"Empurrar B",pullB:"Puxar B",legsB:"Pernas B"
  };
  const SCHEDULES = {
    2:[0,3],3:[0,2,4],4:[0,1,3,4],5:[0,1,2,3,5],6:[0,1,2,3,4,5]
  };
  const EXERCISES = {
    gym:{
      push:["Supino reto com halteres","Supino inclinado","Desenvolvimento de ombros","Elevação lateral","Tríceps na polia","Flexão de braços"],
      pull:["Puxada frontal","Remada baixa","Remada unilateral","Crucifixo inverso","Rosca direta","Rosca martelo"],
      legs:["Agachamento livre ou guiado","Leg press","Cadeira extensora","Mesa flexora","Elevação pélvica","Panturrilha em pé"],
      core:["Prancha","Abdominal controlado"],
      upper:["Supino reto com halteres","Puxada frontal","Desenvolvimento de ombros","Remada baixa","Elevação lateral","Rosca direta"],
      lower:["Agachamento livre ou guiado","Leg press","Stiff com halteres","Cadeira flexora","Elevação pélvica","Panturrilha em pé"]
    },
    home:{
      push:["Flexão de braços","Flexão inclinada","Desenvolvimento com mochila","Elevação lateral com garrafas","Tríceps no banco","Flexão fechada"],
      pull:["Remada com mochila","Remada unilateral com mochila","Remada com elástico","Crucifixo inverso com garrafas","Rosca com mochila","Rosca com elástico"],
      legs:["Agachamento livre","Afundo alternado","Agachamento sumô","Ponte de glúteos","Stiff com mochila","Panturrilha em pé"],
      core:["Prancha","Abdominal controlado"],
      upper:["Flexão de braços","Remada com mochila","Desenvolvimento com mochila","Remada unilateral com mochila","Elevação lateral com garrafas","Rosca com mochila"],
      lower:["Agachamento livre","Afundo alternado","Stiff com mochila","Ponte de glúteos","Agachamento sumô","Panturrilha em pé"]
    }
  };
  const app = document.getElementById("app");
  const nav = document.getElementById("tabs");
  const switcher = document.getElementById("profile-switch");
  const profileButton = document.getElementById("profile-open");
  const toastEl = document.getElementById("toast");
  let state = load();
  let view = "home";
  let detail = null;
  let adding = false;
  let mediaRender=0;
  let imageUrls=[];

  function esc(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  }
  function uid() {
    return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
  }
  function clamp(value,min,max,fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max,Math.max(min,Math.round(number))) : fallback;
  }
  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || "null");
      if(parsed && Array.isArray(parsed.profiles)) return {
        profiles:parsed.profiles.slice(0,20).map(cleanProfile),
        activeId:String(parsed.activeId||"")
      };
    } catch(error) { console.warn("Não foi possível recuperar os dados locais.",error); }
    return {profiles:[],activeId:""};
  }
  function safeRunDays(days) {
    return [...new Set(Array.isArray(days)?days.map(Number).filter(v=>Number.isInteger(v)&&v>=0&&v<=6):[])].sort((a,b)=>a-b).slice(0,5);
  }
  function legacyRunDays(raw) {
    const wanted=clamp(raw.runs,0,3,0);
    const occupied=new Set(SCHEDULES[clamp(raw.days,2,6,3)]);
    const suggested=[1,3,5,6,2,4,0];
    const result=[];
    for(const day of suggested) {
      if(result.length>=wanted)break;
      if(!occupied.has(day))result.push(day);
    }
    for(const day of suggested) {
      if(result.length>=wanted)break;
      if(!result.includes(day))result.push(day);
    }
    return result.sort((a,b)=>a-b);
  }
  function cleanProfile(raw) {
    if(!raw || typeof raw!=="object") throw new Error("Perfil inválido");
    const runDays=Array.isArray(raw.runDays)?safeRunDays(raw.runDays):legacyRunDays(raw);
    const mode=MODES[raw.mode]?raw.mode:(runDays.length?"both":"strength");
    return {
      id:String(raw.id||uid()).slice(0,120),
      name:String(raw.name||"Pessoa").slice(0,60),
      mode,
      goal:GOALS[raw.goal]?raw.goal:"fitness",
      level:LEVELS[raw.level]?raw.level:"beginner",
      place:PLACES[raw.place]?raw.place:"gym",
      days:clamp(raw.days,2,6,3),
      minutes:clamp(raw.minutes,30,90,45),
      runLevel:LEVELS[raw.runLevel]?raw.runLevel:(LEVELS[raw.level]?raw.level:"beginner"),
      runBaseKm:[0,2,3,5,8,10,15].includes(Number(raw.runBaseKm))?Number(raw.runBaseKm):0,
      runDays,
      runs:mode==="strength"?0:runDays.length,
      limitations:String(raw.limitations||"").slice(0,400),
      exerciseSwaps:cleanExerciseSwaps(raw.exerciseSwaps),
      body:cleanBody(raw.body),
      progress:cleanProgress(raw.progress),
      createdAt:String(raw.createdAt||new Date().toISOString()).slice(0,40),
      logs:Array.isArray(raw.logs)?raw.logs.slice(-1000).filter(log=>log&&typeof log==="object").map(cleanLog):[]
    };
  }
  // Trocas são vinculadas à divisão e ao ambiente do treino, nunca a outro perfil.
  function decimal(value,min,max){
    if(value===null||value===undefined||String(value).trim()==="")return null;
    const num=Number(value);
    return Number.isFinite(num)&&num>=min&&num<=max?Math.round(num*10)/10:null;
  }
  function cleanBody(raw) {
    const b=raw&&typeof raw==="object"?raw:{};
    return {
      weightKg:decimal(b.weightKg,25,350),
      targetWeightKg:decimal(b.targetWeightKg,25,350),
      heightCm:decimal(b.heightCm,100,250),
      age:decimal(b.age,1,110),
      parameter:["female","male"].includes(b.parameter)?b.parameter:"",
      activity:["sedentary","light","moderate","active"].includes(b.activity)?b.activity:"",
      nutritionGoal:["maintain","lose","gain"].includes(b.nutritionGoal)?b.nutritionGoal:"maintain"
    };
  }
  function cleanProgress(raw) {
    if(!Array.isArray(raw))return [];
    return raw.slice(-30).filter(x=>x&&typeof x==="object").map(x=>({
      id:String(x.id||uid()).replace(/[^a-zA-Z0-9-]/g,"").slice(0,80)||uid(),
      date:/^\d{4}-\d{2}-\d{2}$/.test(String(x.date))?String(x.date):new Date().toISOString().slice(0,10),
      weightKg:decimal(x.weightKg,25,350),
      notes:String(x.notes||"").slice(0,400),
      hasPhoto:Boolean(x.hasPhoto)
    }));
  }
  function caloriesFor(profile) {
    const b=profile.body||{};
    const {weightKg:w,heightCm:h,age,parameter,activity,nutritionGoal}=b;
    if(!w||!h||!age||!parameter||!activity)return null;
    if(age<18)return {restricted:true,message:"Para menores de 18 anos, o cálculo automático não é indicado."};
    const bmr=10*w+6.25*h-5*age+(parameter==="male"?5:-161);
    const factors={sedentary:1.2,light:1.375,moderate:1.55,active:1.725};
    const maintenance=Math.round(bmr*factors[activity]/10)*10;
    const bmi=w/((h/100)**2);
    let goal=nutritionGoal==="lose"?maintenance-250:nutritionGoal==="gain"?maintenance+250:maintenance;
    if(nutritionGoal==="lose"&&bmi<18.5)goal=null;
    if(goal!==null&&goal<1200)goal=null;
    return {maintenance,goal,bmi:Math.round(bmi*10)/10,restricted:false};
  }
  function localDate(){
    const d=new Date();
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  }
  function weightChart(profile) {
    const points=[...profile.progress].filter(p=>p.weightKg!==null).sort((a,b)=>a.date.localeCompare(b.date)).slice(-12);
    if(points.length<2)return '<p class="muted small">Registre o peso em pelo menos duas datas para ver seu gráfico.</p>';
    const values=points.map(p=>p.weightKg),min=Math.min(...values)-1,max=Math.max(...values)+1,range=max-min;
    const coords=values.map((n,i)=>[20+(i/(values.length-1))*510,130-(n-min)/range*105]);
    return '<svg class="weight-chart" viewBox="0 0 550 158" role="img" aria-label="Evolução de peso de '+esc(values[0])+' a '+esc(values[values.length-1])+' quilogramas">'+
      '<line x1="15" y1="135" x2="535" y2="135" stroke="#dfe7df"/>'+
      '<polyline points="'+coords.map(p=>p.map(v=>v.toFixed(1)).join(",")).join(" ")+'" fill="none" stroke="#267a54" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'+
      coords.map(p=>'<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="4" fill="#267a54"/>').join("")+
      '<text x="18" y="151" font-size="12" fill="#667670">'+esc(points[0].date.slice(5))+'</text>'+
      '<text x="533" y="151" text-anchor="end" font-size="12" fill="#667670">'+esc(points[points.length-1].date.slice(5))+'</text></svg>';
  }
  function hydrateImages(profile) {
    const request=++mediaRender;
    for(const url of imageUrls)URL.revokeObjectURL(url);
    imageUrls=[];
    const head=document.getElementById("header-avatar");
    const smallFallback=document.getElementById("header-avatar-fallback");
    if(head)head.hidden=true;
    if(smallFallback)smallFallback.hidden=false;
    if(typeof RitmoMedia==="undefined"||!profile)return;
    (async()=>{
      const avatar=await RitmoMedia.get(profile.id,"avatar");
      if(request!==mediaRender)return;
      if(avatar) {
        const url=URL.createObjectURL(avatar);imageUrls.push(url);
        for(const id of ["header-avatar","profile-avatar"]){const el=document.getElementById(id);if(el){el.src=url;el.hidden=false;}}
        for(const id of ["header-avatar-fallback","profile-avatar-fallback"]){const el=document.getElementById(id);if(el)el.hidden=true;}
      }
      if(view!=="profile")return;
      for(const entry of profile.progress) {
        if(!entry.hasPhoto)continue;
        const photo=await RitmoMedia.get(profile.id,"progress:"+entry.id);
        if(request!==mediaRender)return;
        if(!photo)continue;
        const image=document.getElementById("progress-image-"+entry.id);
        if(image){
          const url=URL.createObjectURL(photo);imageUrls.push(url);
          image.src=url;image.hidden=false;
          const placeholder=document.getElementById("progress-placeholder-"+entry.id);
          if(placeholder)placeholder.hidden=true;
        }
      }
    })().catch(error=>console.warn("Não foi possível carregar as fotos locais.",error));
  }
  function cleanExerciseSwaps(raw) {
    const valid = {};
    if(!raw || typeof raw !== "object" || Array.isArray(raw)) return valid;
    const pattern=/^(gym|home):(fullA|fullB|fullC|upperA|upperB|lowerA|lowerB|push|pull|legs|pushB|pullB|legsB)$/;
    for(const key of Object.keys(raw).slice(0,40)) {
      if(!pattern.test(key)) continue;
      const group=raw[key];
      if(!group || typeof group!=="object" || Array.isArray(group)) continue;
      const entries={};
      for(const slot of Object.keys(group).slice(0,30)) {
        if(!/^[0-9]:[^<>]{1,90}$/.test(slot)) continue;
        const choice=typeof group[slot]==="string"?group[slot].trim():"";
        if(choice.length>=2 && choice.length<=90) entries[slot]=choice;
      }
      if(Object.keys(entries).length) valid[key]=entries;
    }
    return valid;
  }
  function applyExerciseSwaps(profile,part,items) {
    const choices=profile.exerciseSwaps?.[profile.place+":"+part]||{};
    return items.map((item,index)=>{
      const choice=choices[index+":"+item.name];
      const swapped=typeof choice==="string" && choice!==item.name;
      return {...item,originalName:item.name,name:swapped?choice:item.name,swapped};
    });
  }
  // Alternativas simples por padrão de movimento; não são substituições clínicas.
  const SWAP_OPTIONS=[
    {match:["crucifixo inverso","elevação posterior","face pull"],label:"Ombro posterior",gym:["Crucifixo inverso no peck deck","Face pull na polia","Elevação posterior com halteres"],home:["Elevação posterior com garrafas","Face pull com elástico","Crucifixo inverso com elástico"]},
    {match:["panturrilha"],label:"Panturrilha",gym:["Panturrilha sentada","Panturrilha no leg press","Panturrilha unilateral"],home:["Panturrilha unilateral em pé","Panturrilha sentado com mochila","Panturrilha em degrau"]},
    {match:["prancha","abdominal"],label:"Abdômen e core",gym:["Prancha lateral","Abdominal na polia","Abdominal reverso"],home:["Prancha lateral","Abdominal reverso","Dead bug"]},
    {match:["rosca"],label:"Bíceps",gym:["Rosca alternada","Rosca martelo","Rosca Scott","Rosca na polia"],home:["Rosca com garrafas","Rosca alternada com mochila","Rosca com elástico"]},
    {match:["tríceps","flexão fechada"],label:"Tríceps",gym:["Tríceps francês","Tríceps corda na polia","Tríceps testa"],home:["Tríceps com elástico","Tríceps francês com mochila","Flexão fechada"]},
    {match:["puxada","remada"],label:"Costas",gym:["Puxada neutra","Remada curvada com halteres","Remada máquina","Remada unilateral"],home:["Remada unilateral com mochila","Remada com elástico","Remada curvada com mochila"]},
    {match:["elevação lateral","desenvolvimento"],label:"Ombros",gym:["Desenvolvimento com halteres","Elevação lateral na polia","Elevação frontal com halteres"],home:["Desenvolvimento com mochila","Elevação lateral com garrafas","Elevação frontal com garrafas"]},
    {match:["supino","flexão de braços","flexão inclinada"],label:"Peito",gym:["Supino máquina","Supino com halteres","Crucifixo na máquina","Flexão de braços"],home:["Flexão inclinada","Flexão de braços","Flexão com mãos elevadas"]},
    {match:["stiff","flexora"],label:"Posterior de coxa",gym:["Stiff com halteres","Mesa flexora","Cadeira flexora","Levantamento terra romeno"],home:["Stiff com mochila","Ponte de glúteos unilateral","Flexão de joelhos com toalha"]},
    {match:["elevação pélvica","ponte de glúteos"],label:"Glúteos",gym:["Elevação pélvica na máquina","Glúteo na polia","Ponte de glúteos com carga"],home:["Ponte de glúteos unilateral","Elevação pélvica com mochila","Coice de glúteos"]},
    {match:["agachamento","leg press","extensora","afundo"],label:"Pernas e quadríceps",gym:["Agachamento goblet","Hack machine","Cadeira extensora","Afundo com halteres"],home:["Agachamento sumô","Afundo alternado","Agachamento com mochila","Step-up em degrau"]}
  ];
  function suggestedSwaps(profile,item,session,index) {
    const name=item.originalName.toLocaleLowerCase("pt-BR");
    const group=SWAP_OPTIONS.find(g=>g.match.some(term=>name.includes(term)));
    const choices=group?group[profile.place]:[];
    const used=new Set(session.items.filter((_,i)=>i!==index).map(ex=>ex.name.toLocaleLowerCase("pt-BR")));
    return {label:group?.label||"Exercícios",options:[...new Set(choices)].filter(choice=>choice.toLocaleLowerCase("pt-BR")!==item.name.toLocaleLowerCase("pt-BR")&&!used.has(choice.toLocaleLowerCase("pt-BR")))};
  }
  function renderSwapPanel(profile,session,item,index) {
    const rec=suggestedSwaps(profile,item,session,index);
    const promptId="swap-pick-"+index;
    const customId="swap-custom-"+index;
    return '<div class="swap-panel" id="swap-panel-'+index+'" hidden>'+
      '<div class="field"><label for="'+promptId+'">Substituir por · '+esc(rec.label)+'</label><select id="'+promptId+'" data-swap-select>'+
      '<option value="">Escolha uma alternativa</option>'+
      rec.options.map(name=>'<option value="'+esc(name)+'">'+esc(name)+'</option>').join("")+
      '<option value="__custom__">Outro exercício (digitar nome)</option></select></div>'+
      '<div class="field" data-custom-wrapper hidden><label for="'+customId+'">Nome do exercício</label><input id="'+customId+'" data-custom-input type="text" maxlength="90" placeholder="Digite o exercício desejado"></div>'+
      '<p class="small muted swap-hint">A escolha ficará salva neste treino e neste perfil. Verifique se o exercício é adequado ao seu objetivo.</p>'+
      '<div class="button-row"><button type="button" class="button button-sm" data-action="save-swap" data-index="'+index+'">Salvar substituição</button><button type="button" class="button button-outline button-sm" data-action="swap-close">Cancelar</button></div></div>';
  }
  // Re-renderizar o nome sem apagar cargas, repetições e anotações ainda não salvas.
  function redrawSessionKeepingDraft() {
    const form=document.getElementById("log-form");
    const snapshot=form?Array.from(form.querySelectorAll("input[name],textarea[name]")).map(input=>[input.name,input.value]):[];
    render();
    const fresh=document.getElementById("log-form");
    if(!fresh)return;
    for(const [name,value] of snapshot) {
      const input=Array.from(fresh.querySelectorAll("input[name],textarea[name]")).find(el=>el.name===name);
      if(input)input.value=value;
    }
  }
  function setExerciseSwap(index,choice) {
    const profile=current();
    const session=profile && makePlan(profile).find(s=>s.id===detail);
    if(!session||session.type!=="strength"||!Number.isInteger(index)||index<0||index>=session.items.length)throw new Error("Exercício não encontrado.");
    const item=session.items[index];
    const name=String(choice||"").trim().replace(/\s+/g," ");
    if(name.length<2||name.length>90)throw new Error("Informe um exercício válido (2 a 90 caracteres).");
    if(session.items.some((other,i)=>i!==index&&other.name.toLocaleLowerCase("pt-BR")===name.toLocaleLowerCase("pt-BR")))throw new Error("Este exercício já existe nesse mesmo treino.");
    const key=session.planKey;
    const slot=index+":"+item.originalName;
    profile.exerciseSwaps ||= {};
    profile.exerciseSwaps[key] ||= {};
    if(name===item.originalName)delete profile.exerciseSwaps[key][slot];
    else profile.exerciseSwaps[key][slot]=name;
    if(!Object.keys(profile.exerciseSwaps[key]).length)delete profile.exerciseSwaps[key];
    save();
    redrawSessionKeepingDraft();
  }
  function cleanLog(log) {
    return {
      id:String(log.id||uid()).slice(0,100),
      sessionId:String(log.sessionId||"").slice(0,100),
      title:String(log.title||"Treino").slice(0,100),
      type:log.type==="run"?"run":"strength",
      date:String(log.date||new Date().toISOString()).slice(0,40),
      duration:clamp(log.duration,0,480,0),
      distance:Number.isFinite(Number(log.distance))?Math.max(0,Math.min(100,Number(log.distance))):0,
      notes:String(log.notes||"").slice(0,500),
      items:Array.isArray(log.items)?log.items.slice(0,20).map(item=>({
        name:String(item.name||"").slice(0,100),
        reps:String(item.reps||"").slice(0,50),
        load:String(item.load||"").slice(0,50)
      })):[]
    };
  }
  function save() {
    try { localStorage.setItem(KEY,JSON.stringify(state)); }
    catch(error) { console.error(error); alert("Não foi possível salvar neste navegador. Confira o espaço livre e o modo privado."); }
  }
  function current() {
    return state.profiles.find(profile=>profile.id===state.activeId) || state.profiles[0] || null;
  }
  function notify(message) {
    toastEl.textContent=message;
    toastEl.hidden=false;
    setTimeout(()=>{toastEl.hidden=true},3500);
  }
  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())?"Data indisponível":new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:"numeric"}).format(date);
  }
  function firstMonday(date) {
    const monday = new Date(date.getFullYear(),date.getMonth(),date.getDate());
    monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
    monday.setHours(0,0,0,0);
    return monday;
  }
  function inCurrentWeek(log) {
    const d = new Date(log.date);
    return !Number.isNaN(d.getTime()) && d>=firstMonday(new Date()) && d<new Date(firstMonday(new Date()).getTime()+7*86400000);
  }
  function exerciseRows(profile,part) {
    const lib = EXERCISES[profile.place];
    const body = part==="fullA" ? [lib.legs[0],lib.push[0],lib.pull[0],lib.legs[4],lib.core[0],lib.push[3]] :
      part==="fullB" ? [lib.legs[1],lib.pull[1],lib.push[2],lib.legs[2],lib.core[1],lib.pull[4]] :
      part==="fullC" ? [lib.legs[2],lib.push[1],lib.pull[2],lib.legs[3],lib.core[0],lib.push[4]] :
      part.startsWith("upper") ? (part==="upperB" ? [...lib.upper].reverse():lib.upper) :
      part.startsWith("lower") ? (part==="lowerB" ? [...lib.lower].reverse():lib.lower) :
      part.startsWith("push") ? (part==="pushB" ? [...lib.push].reverse():lib.push) :
      part.startsWith("pull") ? (part==="pullB" ? [...lib.pull].reverse():lib.pull) : lib.legs;
    const count = Math.min(body.length,Math.max(3,Math.round(profile.minutes/12)));
    const reps = profile.goal==="muscle"?"8–12":profile.goal==="fat"?"10–15":profile.goal==="fitness"?"12–15":"10–12";
    const sets = profile.level==="beginner"?2:profile.level==="advanced"&&profile.minutes>=60?4:3;
    return body.slice(0,count).map((name,index)=>({name,sets:index===count-1&&profile.level==="beginner"?2:sets,reps:name==="Prancha"?"20–45 s":reps}));
  }
  function kmText(km) {return Number(km).toFixed(1).replace(".",",")+" km";}
  function roundHalf(value) {return Math.max(1,Math.round(value*2)/2);}
  function runningSession(profile,day,index,count) {
    // O esforço declarado pelo usuário é a referência: esta semana não progride automaticamente.
    const novice=profile.runBaseKm===0;
    const baseline=novice?2:profile.runBaseKm;
    const easy=novice?2:roundHalf(Math.max(1.5,baseline*0.75));
    const quality=novice?2:roundHalf(Math.max(1.5,baseline*0.65));
    const long=novice?2.5:roundHalf(Math.max(2,baseline*1.1));
    let kind="easy";
    if(count>=2&&index===count-1)kind="long";
    else if(count>=3&&index===1)kind=profile.runLevel==="beginner"?"walkrun":"interval";
    else if(count>=4&&index===count-2)kind="recovery";
    else if(count>=5&&index===2)kind="steady";
    const titles={easy:"Corrida leve",long:"Longão",interval:"Intervalado controlado",walkrun:"Caminhada e trote",recovery:"Corrida regenerativa",steady:"Corrida contínua"};
    const target=kind==="long"?long:kind==="interval"||kind==="walkrun"?quality:kind==="recovery"?roundHalf(easy*0.8):easy;
    const runningPace=profile.runLevel==="advanced"?6:profile.runLevel==="intermediate"?8:11;
    const minutes=Math.min(160,Math.max(20,Math.round(target*runningPace+10)));
    const instructions=novice||profile.runLevel==="beginner"?
      ["Aqueça caminhando de 5 a 10 minutos.",
       kind==="long"?"Complete a distância com alternância de caminhada e trote, sem perseguir velocidade.":"Alterne cerca de 2 minutos caminhando e 1 minuto trotando, ajustando conforme seu conforto.",
       "Finalize caminhando leve por 5 minutos. Reduza a distância se necessário."]:
      kind==="interval"?
      ["Aqueça com 8 a 10 minutos de corrida bem leve.",
       "Alterne 1 minuto de ritmo um pouco mais rápido com 2 minutos leves, repetindo 4 a 6 vezes, sem fazer sprint.",
       "Desacelere e caminhe ou trote de 5 a 10 minutos."]:
      kind==="long"?
      ["Comece com 5 a 10 minutos de ritmo fácil.",
       "Faça a parte principal em ritmo confortável, no qual ainda consiga conversar. Não é treino de velocidade.",
       "Termine desacelerando por 5 minutos. Diminua a distância se não estiver confortável."]:
      ["Comece com 5 a 10 minutos de ritmo muito leve.",
       kind==="recovery"?"Mantenha o restante do percurso fácil e relaxado.":"Mantenha ritmo de conversa, sem buscar recordes ou velocidade.",
       "Finalize desacelerando de 5 a 10 minutos."];
    return {
      id:"run-"+day, day, title:titles[kind], type:"run",
      minutes, targetKm:target, kind, items:[], instructions,
      description:novice?"Distância-alvo inclui caminhada e trote. Faça pausas quando precisar.":
        kind==="long"?"Sessão mais longa da semana em ritmo fácil.":"Adapte o ritmo às sensações e à recuperação."
    };
  }
  function makePlan(profile) {
    const sessions=[];
    if(profile.mode!=="run"){
      const strengthDays=SCHEDULES[profile.days];
      SPLITS[profile.days].forEach((part,index)=>sessions.push({
        id:"strength-"+index,day:strengthDays[index],title:SPLIT_NAMES[part],
        type:"strength",minutes:profile.minutes,planKey:profile.place+":"+part,
        items:applyExerciseSwaps(profile,part,exerciseRows(profile,part))
      }));
    }
    if(profile.mode!=="strength"){
      const runDays=safeRunDays(profile.runDays);
      runDays.forEach((day,index)=>sessions.push(runningSession(profile,day,index,runDays.length)));
    }
    return sessions.sort((a,b)=>a.day-b.day||(a.type==="strength"?-1:1));
  }
  function getStats(profile) {
    const week=profile.logs.filter(inCurrentWeek);
    const distance=profile.logs.reduce((total,log)=>total+(log.type==="run"?log.distance:0),0);
    return {week:week.length,total:profile.logs.length,distance};
  }
  function render() {
    const profile = current();
    const showTabs=Boolean(profile)&&!adding;
    nav.hidden=!showTabs;
    switcher.hidden=state.profiles.length<2;
    if(profileButton)profileButton.hidden=!profile||adding;
    if(profileButton&&profile) {
      profileButton.setAttribute("aria-label","Abrir perfil de "+profile.name);
      profileButton.title="Abrir perfil de "+profile.name;
    }
    const avatarInitial=document.getElementById("header-avatar-fallback");
    if(avatarInitial&&profile)avatarInitial.textContent=profile.name.trim().slice(0,1).toUpperCase()||"R";
    if(state.profiles.length>1){
      switcher.innerHTML=state.profiles.map(p=>'<option value="'+esc(p.id)+'"'+(p.id===profile.id?' selected':'')+'>'+esc(p.name)+'</option>').join("");
    }
    nav.querySelectorAll("button[data-tab]").forEach(button=>button.classList.toggle("active",button.dataset.tab===view && !detail));
    if(!profile || adding){app.innerHTML=renderOnboarding();hydrateImages(null);return;}
    if(detail){
      const session=makePlan(profile).find(s=>s.id===detail);
      if(session){app.innerHTML=renderSession(profile,session);hydrateImages(profile);return;}
      detail=null;
    }
    if(view==="profile")app.innerHTML=renderProfile(profile);
    else if(view==="plan")app.innerHTML=renderPlan(profile);
    else if(view==="history")app.innerHTML=renderHistory(profile);
    else if(view==="settings")app.innerHTML=renderSettings(profile);
    else app.innerHTML=renderHome(profile);
    hydrateImages(profile);
  }
  function field(label,name,kind,options,selected) {
    if(kind==="select") return '<div class="field"><label for="'+name+'">'+label+'</label><select name="'+name+'" id="'+name+'" required>'+options.map(o=>'<option value="'+esc(o[0])+'"'+(String(o[0])===String(selected)?' selected':'')+'>'+esc(o[1])+'</option>').join("")+'</select></div>';
    return '<div class="field"><label for="'+name+'">'+label+'</label><input id="'+name+'" name="'+name+'" type="'+kind+'" required maxlength="60" value="'+esc(selected||"")+'" placeholder="Como podemos chamar você?"></div>';
  }
  function profileFields(profile) {
    const p=profile||{name:"",mode:"both",goal:"muscle",level:"beginner",place:"gym",days:3,minutes:45,runLevel:"beginner",runBaseKm:0,runDays:[1,5],limitations:""};
    const strengthActive=p.mode!=="run";
    const runActive=p.mode!=="strength";
    const runDays=safeRunDays(p.runDays);
    return '<div class="form-grid">'+
      '<div class="full">'+field("Seu nome","name","text",null,p.name)+'</div>'+
      '<div class="full">'+field("Como você pretende usar o Ritmo?","mode","select",Object.entries(MODES),p.mode)+'</div>'+
      '<fieldset class="form-section full" data-mode-section="strength"'+(strengthActive?'':' hidden disabled')+'>'+
      '<legend>Seu treino de musculação</legend><div class="form-grid">'+
      field("Seu objetivo","goal","select",Object.entries(GOALS),p.goal)+
      field("Nível na musculação","level","select",Object.entries(LEVELS),p.level)+
      field("Onde você vai treinar?","place","select",Object.entries(PLACES),p.place)+
      field("Dias de musculação por semana","days","select",[[2,"2 dias"],[3,"3 dias"],[4,"4 dias"],[5,"5 dias"],[6,"6 dias"]],p.days)+
      '<div class="full">'+field("Tempo por treino","minutes","select",[[30,"30 minutos"],[45,"45 minutos"],[60,"60 minutos"],[75,"75 minutos"],[90,"90 minutos"]],p.minutes)+'</div></div></fieldset>'+
      '<fieldset class="form-section full" data-mode-section="run"'+(runActive?'':' hidden disabled')+'>'+
      '<legend>Sua corrida</legend><div class="form-grid">'+
      field("Nível na corrida","runLevel","select",Object.entries(LEVELS),p.runLevel)+
      field("Qual distância você percorre confortavelmente?","runBaseKm","select",RUN_DISTANCES,p.runBaseKm)+
      '<div class="field full"><span>Dias da semana para correr</span><div class="run-days">'+
      DAYS.map((day,index)=>'<label class="day-check"><input type="checkbox" name="runDays" value="'+index+'"'+(runDays.includes(index)?' checked':'')+'><span>'+day+'</span></label>').join("")+
      '</div><p class="small muted">Escolha de 1 a 5 dias. Pode coincidir com dias de musculação, se você optar pelas duas atividades.</p></div>'+
      '</div></fieldset>'+
      '<div class="field full"><label for="limitations">Observações (opcional)</label><input id="limitations" name="limitations" maxlength="400" value="'+esc(p.limitations)+'" placeholder="Ex.: prefiro treinos mais leves"></div>'+
      '</div>';
  }
  function syncModeFields(form) {
    const mode=form.querySelector('[name="mode"]')?.value;
    for(const fieldset of form.querySelectorAll("[data-mode-section]")) {
      const visible=mode==="both"||(mode==="run"?fieldset.dataset.modeSection==="run":fieldset.dataset.modeSection==="strength");
      fieldset.hidden=!visible;
      fieldset.disabled=!visible;
    }
  }
  function renderOnboarding() {
    return '<section class="onboard">'+
      '<div class="eyebrow">Seu começo</div><h1>Seu plano começa com você.</h1><p>Responda algumas perguntas e monte uma rotina inicial de musculação e corrida ajustada à sua disponibilidade.</p>'+
      '<div class="card"><h2>Vamos montar seu Ritmo</h2><p>Os dados permanecem neste navegador. Não é necessário cadastro nesta versão de testes.</p>'+
      '<form id="onboard-form">'+profileFields(null)+
      '<div class="notice" style="margin-top:20px">O plano é uma sugestão geral. Se você possui lesões, limitações importantes ou recomendações médicas, procure um profissional antes de começar.</div>'+
      '<div class="button-row"><button class="button" type="submit">Criar meu plano →</button>'+
      (state.profiles.length?'<button class="button button-outline" data-action="cancel-add" type="button">Cancelar</button>':'')+'</div></form></div></section>';
  }
  function renderHome(profile) {
    const sessions=makePlan(profile);
    const day=(new Date().getDay()+6)%7;
    const todays=sessions.filter(s=>s.day===day);
    const stat=getStats(profile);
    return '<div class="hero"><div class="eyebrow">Seu espaço de treino</div>'+
      '<h1>Oi, '+esc(profile.name)+'!<br>Encontre seu ritmo.</h1>'+
      '<p>'+(profile.mode==="run"?"Modalidade: só corrida.":"Seu objetivo: "+esc(GOALS[profile.goal])+".")+' Pequenas conquistas criam grandes mudanças — no seu tempo.</p>'+
      '<div class="button-row"><button class="button button-light" data-nav="plan" type="button">Ver meu plano →</button></div></div>'+
      '<section class="grid">'+statCard("Treinos nesta semana",stat.week,"sessões registradas")+
      statCard("Treinos no histórico",stat.total,"sessões concluídas")+
      statCard("Corrida acumulada",stat.distance.toFixed(1).replace(".",",")+" km","distância registrada")+'</section>'+
      '<div class="section-title"><div><div class="eyebrow">Hoje · '+DAYS[day]+'</div><h2>'+ (todays.length?"O que vamos treinar?":"Hoje é dia de recuperar") +'</h2></div><span class="pill">'+todays.length+' atividade(s)</span></div>'+
      (todays.length?'<div class="grid two">'+todays.map(s=>sessionCard(s)).join("")+'</div>':
        '<div class="card"><h3>Descanso também é progresso.</h3><p class="muted">Aproveite para dormir bem, se alimentar e recuperar a energia.</p><button class="button button-outline" data-nav="plan" type="button">Ver outros dias</button></div>')+
      '<div class="section-title"><h2>Seu ponto de partida</h2></div>'+
      '<div class="grid two"><div class="card"><h3>Plano feito para seu perfil</h3><p class="muted">'+
      (profile.mode!=="run"?profile.days+' dias de musculação':'Sem musculação')+
      (profile.mode==="strength"?'.':', '+safeRunDays(profile.runDays).length+' dia(s) de corrida por semana.')+
      '</p></div>'+
      '<div class="card"><h3>Acompanhe a evolução</h3><p class="muted">Registre repetições, cargas e corridas; veja suas sessões ao longo das semanas.</p><button class="button button-outline button-sm" data-nav="history" type="button">Ver histórico</button></div></div>';
  }
  function statCard(number,label,description) {
    return '<div class="card"><div class="stat-label">'+number+'</div><div class="stat-number">'+label+'</div><div class="small muted">'+description+'</div></div>';
  }
  function sessionCard(session) {
    return '<article class="card day-card"><div class="day-head"><h3>'+esc(session.title)+'</h3><span class="pill '+(session.type==="run"?"yellow":"")+'">'+(session.type==="run"?"Corrida":"Força")+'</span></div>'+
      '<p class="muted small">'+(session.type==="run"?kmText(session.targetKm)+' · cerca de '+session.minutes+' min':session.minutes+' min previstos · '+session.items.length+' exercícios')+'</p>'+
      '<button class="button button-outline button-sm" type="button" data-session="'+esc(session.id)+'">Abrir treino →</button></article>';
  }
  function renderPlan(profile) {
    const sessions=makePlan(profile);
    return '<div class="section-title"><div><div class="eyebrow">Organização semanal</div><h1>Seu plano de treino</h1><p class="muted">Sessões sugeridas para '+esc(profile.name)+' — '+esc(MODES[profile.mode])+'.</p></div></div>'+
      '<div class="notice">Comece com cargas e intensidades confortáveis, respeitando a técnica e a recuperação. Você pode ajustar o perfil em Ajustes.</div>'+
      '<div class="grid" style="margin-top:17px">'+DAYS.map((day,index)=>{
        const each=sessions.filter(s=>s.day===index);
        return '<article class="card day-card"><div class="day-head"><h3>'+day+'</h3><span class="pill '+(each.length?"":"gray")+'">'+(each.length?each.length+' sessão(ões)':'Descanso')+'</span></div>'+
          (each.length?each.map(s=>'<div class="session '+(s.type==="run"?"run":"")+'"><h3>'+esc(s.title)+'</h3><p class="small muted">'+(s.type==="run"?kmText(s.targetKm)+' · aproximadamente ':'')+s.minutes+' min</p><button class="button button-outline button-sm" data-session="'+esc(s.id)+'" type="button">Detalhes / registrar</button></div>').join(""):
          '<p class="muted small">Recuperação, mobilidade leve ou caminhada opcional.</p>')+'</article>';
      }).join("")+'</div>';
  }
  function renderSession(profile,session) {
    const strength=session.type==="strength";
    const rows=strength?session.items.map((item,index)=>'<div class="exercise-row"><div class="exercise-title"><div class="exercise-name">'+esc(item.name)+'</div><div class="exercise-meta">'+item.sets+' séries · '+esc(item.reps)+' repetições alvo</div>'+
      '<div class="swap-actions"><button type="button" class="swap-link" data-action="swap-open" data-index="'+index+'" aria-expanded="false" aria-controls="swap-panel-'+index+'">↔ Trocar exercício</button>'+
      (item.swapped?'<span class="pill">Personalizado</span><button type="button" class="swap-link secondary" data-action="reset-swap" data-index="'+index+'">Restaurar original</button>':'')+'</div>'+
      (item.swapped?'<div class="small muted">Original: '+esc(item.originalName)+'</div>':'')+
      renderSwapPanel(profile,session,item,index)+'</div>'+
      '<div class="field"><label for="load-'+index+'">Carga (kg)</label><input id="load-'+index+'" type="number" min="0" max="600" step="0.5" name="load-'+index+'" placeholder="Opcional"></div>'+
      '<div class="field"><label for="reps-'+index+'">Reps feitas</label><input id="reps-'+index+'" maxlength="50" name="reps-'+index+'" placeholder="Ex.: 12/11/10"></div></div>').join("") :
      '<div class="run-target"><span class="run-number">'+kmText(session.targetKm)+'</span><span>Meta indicativa da sessão, não obrigatória</span></div>'+
      '<p class="muted">'+esc(session.description)+'</p>'+
      '<h3>Como executar</h3><ol class="run-steps">'+session.instructions.map(step=>'<li>'+esc(step)+'</li>').join("")+'</ol>'+
      '<div class="notice warning small">A distância é uma sugestão baseada na capacidade informada, não em avaliação individual. Reduza ou interrompa se houver dor, tontura ou mal-estar.</div>'+
      '<div class="form-grid" style="margin-top:18px"><div class="field"><label for="distance">Distância realizada (km)</label><input id="distance" name="distance" type="number" step="0.01" min="0" max="100" placeholder="Ex.: 3.5"></div></div>';
    return '<div class="detail"><div class="eyebrow">'+DAYS[session.day]+' · '+(strength?"Musculação":"Corrida")+'</div>'+
      '<h1>'+esc(session.title)+'</h1>'+
      '<p class="muted">'+session.minutes+' min estimados. Registre o que realmente fez; não é necessário atingir todas as metas.</p>'+
      '<div class="card"><form id="log-form" data-id="'+esc(session.id)+'">'+rows+
      '<hr class="line"><div class="form-grid"><div class="field"><label for="duration">Duração realizada (min)</label><input id="duration" name="duration" type="number" min="0" max="480" value="'+session.minutes+'" required></div>'+
      '<div class="field"><label for="log-notes">Observações (opcional)</label><input id="log-notes" name="notes" maxlength="500" placeholder="Como se sentiu?"></div></div>'+
      '<div class="button-row"><button class="button" type="submit">Salvar sessão concluída</button><button type="button" class="button button-outline" data-action="back-plan">Voltar ao plano</button></div></form></div></div>';
  }
  function renderHistory(profile) {
    const logs=[...profile.logs].sort((a,b)=>new Date(b.date)-new Date(a.date));
    const stat=getStats(profile);
    const monday=firstMonday(new Date());
    const weeks=Array.from({length:4},(_,i)=>{
      const start=new Date(monday);start.setDate(start.getDate()-(3-i)*7);
      const end=new Date(start);end.setDate(end.getDate()+7);
      const total=logs.filter(log=>{const time=new Date(log.date);return time>=start&&time<end}).length;
      return {label:(start.getDate())+'/'+(start.getMonth()+1),total};
    });
    const max=Math.max(1,...weeks.map(w=>w.total));
    return '<div class="eyebrow">Consistência é o caminho</div><h1>Sua evolução</h1>'+
      '<section class="grid"><div class="card"><div class="stat-label">Sessões totais</div><div class="stat-number">'+stat.total+'</div></div>'+
      '<div class="card"><div class="stat-label">Sessões nesta semana</div><div class="stat-number">'+stat.week+'</div></div>'+
      '<div class="card"><div class="stat-label">Corrida acumulada</div><div class="stat-number">'+stat.distance.toFixed(1).replace(".",",")+' km</div></div></section>'+
      '<div class="grid two" style="margin-top:17px"><div class="card"><h2>Últimas 4 semanas</h2><p class="small muted">Sessões registradas por semana, começando na segunda.</p>'+
      '<div class="bars" role="img" aria-label="'+esc(weeks.map(w=>w.label+': '+w.total+' sessões').join(', '))+'">'+
      weeks.map(w=>'<div class="bar-item"><b>'+w.total+'</b><div class="bar" style="--h:'+Math.round(w.total/max*115)+'px"></div><span>'+w.label+'</span></div>').join("")+
      '</div></div><div class="card"><h2>Atividades recentes</h2>'+
      (logs.length?'<div class="history">'+logs.slice(0,8).map(log=>'<div class="history-item"><div><strong>'+esc(log.title)+'</strong><div class="small muted">'+formatDate(log.date)+' · '+(log.type==="run"?"Corrida":"Força")+'</div></div><span class="small muted">'+(log.type==="run"?log.distance.toFixed(2).replace(".",",")+" km · ":"")+log.duration+' min</span></div>').join("")+'</div>':
      '<div class="empty"><div class="empty-icon">🌱</div><b>O primeiro treino te espera!</b><p class="muted">Registre uma sessão para começar a acompanhar sua evolução.</p></div>')+'</div></div>';
  }
  function optionalSelect(label,name,options,selected) {
    return '<div class="field"><label for="'+name+'">'+esc(label)+'</label><select name="'+name+'" id="'+name+'">'+options.map(o=>'<option value="'+esc(o[0])+'"'+(String(o[0])===String(selected)?' selected':'')+'>'+esc(o[1])+'</option>').join("")+'</select></div>';
  }
  function renderProfile(profile) {
    const b=profile.body||cleanBody({});
    const calories=caloriesFor(profile);
    const progress=[...profile.progress].sort((a,b)=>b.date.localeCompare(a.date));
    const weight=b.weightKg?b.weightKg.toLocaleString("pt-BR")+" kg":"—";
    const target=b.targetWeightKg?b.targetWeightKg.toLocaleString("pt-BR")+" kg":"—";
    const bmi=calories&&!calories.restricted?calories.bmi.toFixed(1).replace(".",","):"—";
    const estimate=calories&&!calories.restricted?
      '<div class="calorie-total">'+calories.maintenance.toLocaleString("pt-BR")+' kcal/dia</div><p class="small muted">Estimativa para manutenção, com base na equação Mifflin-St Jeor e no nível de atividade informado.</p>'+
      (calories.goal===null?'<div class="notice warning">Não recomendamos calcular automaticamente uma meta de restrição para os dados informados. Procure orientação profissional.</div>':
      '<div class="calorie-goal">'+(b.nutritionGoal==="lose"?"Redução gradual":b.nutritionGoal==="gain"?"Aumento gradual":"Manutenção")+': <strong>'+calories.goal.toLocaleString("pt-BR")+' kcal/dia</strong></div>'):
      '<p class="muted">'+(calories?.message||"Preencha peso, altura, idade, parâmetro da fórmula e atividade para obter uma estimativa.")+'</p>';
    return '<div class="eyebrow">Sua jornada</div><h1>Perfil de '+esc(profile.name)+'</h1>'+
      '<section class="card"><div class="profile-heading"><div class="profile-avatar-wrap"><span id="profile-avatar-fallback">'+esc(profile.name.slice(0,1).toUpperCase())+'</span><img id="profile-avatar" alt="Foto de '+esc(profile.name)+'" hidden></div>'+
      '<div><h2>'+esc(profile.name)+'</h2><p class="muted small">Suas fotos ficam neste dispositivo.</p>'+
      '<div class="button-row"><label class="button button-outline button-sm" for="avatar-file">Alterar foto</label><input id="avatar-file" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif">'+
      '<button type="button" class="button button-outline button-sm" data-action="remove-avatar">Remover foto</button></div></div></div></section>'+
      '<section class="grid profile-stats">'+
      statCard("Peso atual",weight,"Atualizado no perfil")+
      statCard("Meta de peso",target,"Referência pessoal")+
      statCard("IMC estimado",bmi,"Indicador geral, não diagnóstico")+'</section>'+
      '<div class="grid two profile-layout"><section class="card"><h2>Dados e metas</h2><p class="small muted">Preencha apenas o que desejar. Os dados não são enviados para um servidor.</p>'+
      '<form id="body-form"><div class="form-grid">'+
      '<div class="field"><label for="weightKg">Peso atual (kg)</label><input type="number" id="weightKg" name="weightKg" min="25" max="350" step="0.1" placeholder="Ex.: 78,5" value="'+esc(b.weightKg??"")+'"></div>'+
      '<div class="field"><label for="targetWeightKg">Meta de peso (kg)</label><input type="number" id="targetWeightKg" name="targetWeightKg" min="25" max="350" step="0.1" placeholder="Ex.: 74" value="'+esc(b.targetWeightKg??"")+'"></div>'+
      '<div class="field"><label for="heightCm">Altura (cm)</label><input type="number" id="heightCm" name="heightCm" min="100" max="250" step="0.1" placeholder="Ex.: 175" value="'+esc(b.heightCm??"")+'"></div>'+
      '<div class="field"><label for="age">Idade (anos)</label><input type="number" id="age" name="age" min="1" max="110" step="1" placeholder="Ex.: 25" value="'+esc(b.age??"")+'"></div>'+
      optionalSelect("Parâmetro fisiológico da fórmula","parameter",[["","Selecionar"],["male","Masculino"],["female","Feminino"]],b.parameter)+
      optionalSelect("Atividade física total","activity",[["","Selecionar"],["sedentary","Baixa"],["light","Leve"],["moderate","Moderada"],["active","Alta"]],b.activity)+
      '<div class="full">'+field("Objetivo alimentar","nutritionGoal","select",[["maintain","Manter peso"],["lose","Reduzir peso gradualmente"],["gain","Ganhar peso gradualmente"]],b.nutritionGoal)+'</div>'+
      '</div><div class="button-row"><button class="button" type="submit">Salvar dados e calcular</button></div></form></section>'+
      '<section class="stack"><div class="card"><h2>Estimativa de energia</h2>'+estimate+
      '<p class="small muted">Valores aproximados, não uma dieta. Considere idade, condições de saúde e orientação de nutricionista; não usar na gestação ou amamentação como prescrição.</p></div>'+
      '<div class="card"><h2>Histórico de peso</h2>'+weightChart(profile)+'</div></section></div>'+
      '<section class="card profile-diary"><h2>Diário de evolução</h2><p class="muted small">Registre peso, fotos e anotações. Até 30 registros neste dispositivo.</p>'+
      '<form id="progress-form"><div class="form-grid">'+
      '<div class="field"><label for="progress-date">Data</label><input required type="date" name="date" id="progress-date" value="'+localDate()+'"></div>'+
      '<div class="field"><label for="progress-weight">Peso nesta data (kg, opcional)</label><input type="number" id="progress-weight" name="weightKg" min="25" max="350" step="0.1" placeholder="Ex.: 77,5"></div>'+
      '<div class="field full"><label for="progress-notes">Anotações (opcional)</label><textarea id="progress-notes" name="notes" rows="2" maxlength="400" placeholder="Como foi a evolução nesta semana?"></textarea></div>'+
      '<div class="field full"><label for="progress-photo">Foto de evolução (opcional)</label><input type="file" id="progress-photo" accept="image/jpeg,image/png,image/webp,image/heic,image/heif"></div></div>'+
      '<div class="button-row"><button class="button" type="submit">Adicionar registro</button></div></form>'+
      '<hr class="line"><h3>Seus registros</h3>'+
      (progress.length?'<div class="diary-grid">'+progress.map(item=>'<article class="diary-entry">'+
      (item.hasPhoto?'<div class="diary-media"><span id="progress-placeholder-'+esc(item.id)+'">Foto local</span><img id="progress-image-'+esc(item.id)+'" loading="lazy" alt="Evolução registrada em '+esc(item.date)+'" hidden></div>':'')+
      '<div class="diary-content"><b>'+esc(item.date.split("-").reverse().join("/"))+'</b>'+
      (item.weightKg!==null?'<div class="muted small">'+esc(item.weightKg.toLocaleString("pt-BR"))+' kg</div>':'')+
      (item.notes?'<p class="small">'+esc(item.notes)+'</p>':'')+
      '<button type="button" class="swap-link secondary" data-action="delete-progress" data-id="'+esc(item.id)+'">Excluir registro</button></div></article>').join("")+'</div>':
      '<p class="muted small">Nenhum registro ainda. Seu primeiro acompanhamento começa aqui.</p>')+'</section>'+
      '<section class="card profile-privacy"><h2>Seus perfis e privacidade</h2><p class="muted small">As fotos são armazenadas no navegador e incluídas no backup JSON exportado a partir de agora. Outros usuários do mesmo navegador podem ver esses dados. Evite cadastrar informações sensíveis em dispositivos compartilhados.</p>'+
      '<button class="button button-outline" type="button" data-action="new-profile">+ Criar outro perfil</button></section>';
  }

  function renderSettings(profile) {
    return '<div class="eyebrow">Suas preferências</div><h1>Seu Ritmo, suas escolhas</h1>'+
      '<div class="grid two"><div class="card"><h2>Atualizar plano</h2><p class="muted small">Ao salvar, seu plano será recalculado; o histórico anterior será preservado.</p>'+
      '<form id="settings-form">'+profileFields(profile)+'<div class="button-row"><button class="button" type="submit">Atualizar meu plano</button></div></form></div>'+
      '<div class="stack"><div class="card"><h2>Seus dados</h2><p class="muted">O backup JSON inclui fotos locais nesta versão. Os perfis não sincronizam automaticamente entre dispositivos.</p>'+
      '<div class="button-row"><button class="button button-outline" data-action="export" type="button">Exportar backup</button>'+
      '<label class="button button-outline" for="import-file">Importar backup</label><input id="import-file" type="file" accept=".json,application/json" class="sr-only"></div></div>'+
      '<div class="card"><h2>Privacidade</h2><div class="notice warning">Perfis nesta versão são locais, sem senha ou conta online. Outras pessoas no mesmo navegador podem acessá-los. Não use para informações sensíveis.</div>'+
      '<div class="button-row"><button type="button" class="button button-danger" data-action="delete-profile">Excluir perfil atual</button></div></div></div></div>';
  }
  function valuesFromForm(form,previous) {
    const data=new FormData(form);
    const name=String(data.get("name")||"").trim();
    if(!name)throw new Error("Informe seu nome.");
    const old=previous||{goal:"muscle",level:"beginner",place:"gym",days:3,minutes:45,runLevel:"beginner",runBaseKm:0,runDays:[1,5],limitations:""};
    const mode=String(data.get("mode")||"");
    if(!MODES[mode])throw new Error("Selecione como vai utilizar o aplicativo.");
    const wantsRunning=mode!=="strength";
    const checked=safeRunDays(typeof data.getAll==="function"?data.getAll("runDays"):[]);
    if(wantsRunning&&checked.length===0)throw new Error("Escolha pelo menos um dia para corrida.");
    if(wantsRunning&&typeof data.getAll==="function"&&data.getAll("runDays").length>5)throw new Error("Selecione no máximo 5 dias de corrida.");
    return {
      name:name.slice(0,60),mode,
      goal:mode==="run"?old.goal:String(data.get("goal")),
      level:mode==="run"?old.level:String(data.get("level")),
      place:mode==="run"?old.place:String(data.get("place")),
      days:mode==="run"?old.days:Number(data.get("days")),
      minutes:mode==="run"?old.minutes:Number(data.get("minutes")),
      runLevel:mode==="strength"?old.runLevel:String(data.get("runLevel")),
      runBaseKm:mode==="strength"?old.runBaseKm:Number(data.get("runBaseKm")),
      runDays:mode==="strength"?safeRunDays(old.runDays):checked,
      runs:mode==="strength"?0:checked.length,
      limitations:String(data.get("limitations")||"").trim().slice(0,400)
    };
  }

  document.addEventListener("click", async event=>{
    const button=event.target.closest("button");
    if(!button)return;
    const targetView=button.dataset.tab || button.dataset.nav;
    if(targetView && ["home","plan","history","settings"].includes(targetView)){
      view=targetView;detail=null;adding=false;render();scrollTo(0,0);return;
    }
    if(button.dataset.session){
      detail=button.dataset.session;render();scrollTo(0,0);return;
    }
    const action=button.dataset.action;
    if(action==="swap-open") {
      const row=button.closest(".exercise-row");
      const panel=row?.querySelector(".swap-panel");
      if(!panel)return;
      const opening=panel.hidden;
      document.querySelectorAll(".swap-panel").forEach(other=>other.hidden=true);
      document.querySelectorAll('[data-action="swap-open"]').forEach(trigger=>trigger.setAttribute("aria-expanded","false"));
      panel.hidden=!opening;
      button.setAttribute("aria-expanded",String(opening));
      return;
    }
    if(action==="swap-close") {
      const row=button.closest(".exercise-row");
      const panel=row?.querySelector(".swap-panel");
      if(panel)panel.hidden=true;
      row?.querySelector('[data-action="swap-open"]')?.setAttribute("aria-expanded","false");
      return;
    }
    if(action==="save-swap"||action==="reset-swap") {
      try {
        const index=Number(button.dataset.index);
        if(action==="reset-swap") {
          const profile=current();
          const session=makePlan(profile).find(s=>s.id===detail);
          setExerciseSwap(index,session.items[index].originalName);
          notify("Exercício original restaurado.");
        } else {
          const row=button.closest(".exercise-row");
          const select=row?.querySelector("[data-swap-select]");
          const choice=select?.value==="__custom__"?row?.querySelector("[data-custom-input]")?.value:select?.value;
          setExerciseSwap(index,choice);
          notify("Substituição salva para os próximos treinos!");
        }
      } catch(error) { alert(error.message||"Não foi possível trocar o exercício."); }
      return;
    }
    if(action==="new-profile"){adding=true;detail=null;render();scrollTo(0,0);return;}
    if(action==="remove-avatar"){
      const p=current();
      if(p&&typeof RitmoMedia!=="undefined"&&confirm("Remover a foto de perfil deste dispositivo?")) {
        try {await RitmoMedia.remove(p.id,"avatar");render();notify("Foto removida.");}
        catch(error){alert(error.message);}
      }
      return;
    }
    if(action==="delete-progress"){
      const p=current(),entry=p?.progress.find(item=>item.id===button.dataset.id);
      if(entry&&confirm("Excluir este registro e a foto associada?")) {
        try {
          if(typeof RitmoMedia!=="undefined")await RitmoMedia.remove(p.id,"progress:"+entry.id);
          p.progress=p.progress.filter(item=>item.id!==entry.id);
          save();render();notify("Registro excluído.");
        }catch(error){alert(error.message);}
      }
      return;
    }
    if(action==="back-plan"){detail=null;view="plan";render();scrollTo(0,0);}
    else if(action==="cancel-add"){adding=false;render();}
    else if(action==="export"){await exportBackup();}
    else if(action==="delete-profile"){
      const p=current();
      if(p&&confirm("Excluir o perfil de "+p.name+" e todo seu histórico neste navegador? Esta ação não pode ser desfeita.")){
        if(typeof RitmoMedia!=="undefined"){try{await RitmoMedia.removeProfile(p.id);}catch(error){alert("Perfil excluído, mas algumas fotos locais podem permanecer: "+error.message);}}
        state.profiles=state.profiles.filter(item=>item.id!==p.id);
        state.activeId=state.profiles[0]?.id||"";
        view="home";detail=null;save();render();notify("Perfil excluído.");
      }
    }
  });
  document.addEventListener("submit",async event=>{
    const form=event.target;
    if(!["onboard-form","settings-form","log-form","body-form","progress-form"].includes(form.id))return;
    event.preventDefault();
    try{
      if(form.id==="onboard-form"){
        if(state.profiles.length>=20)throw new Error("Limite de 20 perfis locais.");
        const profile=cleanProfile({id:uid(),...valuesFromForm(form),createdAt:new Date().toISOString(),logs:[]});
        state.profiles.push(profile);state.activeId=profile.id;adding=false;view="home";save();render();scrollTo(0,0);notify("Seu plano foi criado!");
      }else if(form.id==="settings-form"){
        const p=current();
        Object.assign(p,cleanProfile({...p,...valuesFromForm(form,p)}));save();render();notify("Plano atualizado, histórico preservado.");
      }else if(form.id==="body-form"){
        const p=current(),data=new FormData(form);
        const updated=cleanBody({
          weightKg:data.get("weightKg"),targetWeightKg:data.get("targetWeightKg"),heightCm:data.get("heightCm"),
          age:data.get("age"),parameter:data.get("parameter"),activity:data.get("activity"),nutritionGoal:data.get("nutritionGoal")
        });
        if(data.get("age")&&Number(data.get("age"))<18) {
          // Registre apenas como informação; nunca mostre estimativa calórica infantil.
        }
        p.body=updated;save();render();notify("Dados salvos. Estimativa atualizada.");
      }else if(form.id==="progress-form"){
        const p=current(),data=new FormData(form);
        const photo=form.querySelector("#progress-photo")?.files?.[0];
        const weightKg=decimal(data.get("weightKg"),25,350);
        const notes=String(data.get("notes")||"").trim().slice(0,400);
        const date=String(data.get("date")||"");
        if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error("Selecione uma data válida.");
        if(!notes&&!photo&&weightKg===null)throw new Error("Informe peso, uma anotação ou adicione uma foto.");
        if(data.get("weightKg")&&weightKg===null)throw new Error("Informe um peso válido.");
        if(p.progress.length>=30)throw new Error("Limite de 30 registros. Exclua um anterior para continuar.");
        if(photo&&typeof RitmoMedia==="undefined")throw new Error("Este dispositivo não permite salvar fotos.");
        const entry={id:uid(),date,weightKg,notes,hasPhoto:Boolean(photo)};
        if(photo)await RitmoMedia.save(p.id,"progress:"+entry.id,photo,false);
        p.progress.push(entry);
        if(weightKg!==null)p.body.weightKg=weightKg;
        save();render();notify("Registro adicionado ao seu diário!");
      }else{
        const p=current();
        const session=makePlan(p).find(s=>s.id===form.dataset.id);
        if(!session)throw new Error("Não foi possível encontrar esta sessão.");
        const data=new FormData(form);
        const items=session.type==="strength"?session.items.map((item,index)=>({
          name:item.name,reps:String(data.get("reps-"+index)||"").slice(0,50),
          load:String(data.get("load-"+index)||"").slice(0,50)
        })):[];
        const duration=clamp(data.get("duration"),0,480,session.minutes);
        const distance=session.type==="run"?Math.max(0,Math.min(100,Number(data.get("distance"))||0)):0;
        p.logs.push(cleanLog({id:uid(),sessionId:session.id,title:session.title,type:session.type,date:new Date().toISOString(),duration,distance,notes:String(data.get("notes")||""),items}));
        save();detail=null;view="history";render();scrollTo(0,0);notify("Sessão salva! Boa evolução.");
      }
    }catch(error){alert(error.message||"Não foi possível concluir a ação.");}
  });
  if(profileButton)profileButton.addEventListener("click",()=>{adding=false;detail=null;view="profile";render();scrollTo(0,0);});
  switcher.addEventListener("change",event=>{if(state.profiles.some(p=>p.id===event.target.value)){state.activeId=event.target.value;detail=null;view="home";save();render()}});
  document.addEventListener("change",async event=>{
    if(event.target.matches('[name="mode"]')) {
      syncModeFields(event.target.form);
      return;
    }
    if(event.target.matches("[data-swap-select]")) {
      const panel=event.target.closest(".swap-panel");
      const custom=panel?.querySelector("[data-custom-wrapper]");
      if(custom) {
        custom.hidden=event.target.value!=="__custom__";
        if(!custom.hidden)custom.querySelector("input")?.focus();
      }
      return;
    }
    if(event.target.id==="avatar-file"){
      const file=event.target.files?.[0];if(!file)return;
      try{
        if(typeof RitmoMedia==="undefined")throw new Error("Álbum local indisponível.");
        const p=current();if(!p)throw new Error("Perfil não encontrado.");
        await RitmoMedia.save(p.id,"avatar",file,true);
        render();notify("Foto de perfil atualizada!");
      }catch(error){alert(error.message||"Não foi possível salvar a foto.");}
      return;
    }
    if(event.target.id!=="import-file")return;
    const file=event.target.files?.[0];if(!file)return;
    if(file.size>25*1024*1024){alert("O arquivo excede 25 MB.");return;}
    try{
      const parsed=JSON.parse(await file.text());
      if(!parsed||!Array.isArray(parsed.profiles)||parsed.profiles.length>20||!parsed.profiles.length)throw new Error("Backup inválido.");
      const profiles=parsed.profiles.map(cleanProfile);
      if(confirm("Substituir todos os perfis locais pelo conteúdo deste backup, incluindo fotos? Faça uma exportação antes de continuar.")){
        if(typeof RitmoMedia!=="undefined")await RitmoMedia.replaceAll(Array.isArray(parsed.media)?parsed.media:[]);
        state={profiles,activeId:profiles.some(p=>p.id===parsed.activeId)?parsed.activeId:profiles[0].id};
        detail=null;view="home";save();render();notify("Backup importado com sucesso.");
      }
    }catch(error){alert("Falha ao importar o backup: "+error.message)}
    event.target.value="";
  });
  async function exportBackup() {
    try {
      const media=typeof RitmoMedia!=="undefined"?await RitmoMedia.exportAll(state.profiles.map(p=>p.id)):[];
      const backup={version:2,exportedAt:new Date().toISOString(),...state,media};
      const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const link=document.createElement("a");
      link.href=url;link.download="ritmo-backup-"+new Date().toISOString().slice(0,10)+".json";
      link.click();
      setTimeout(()=>URL.revokeObjectURL(url),2000);
      notify("Backup criado com dados e fotos locais.");
    }catch(error){alert("Falha ao exportar o backup: "+error.message);}
  }
  if("serviceWorker" in navigator && location.protocol==="https:") {
    window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.warn));
  }
  render();
})();
