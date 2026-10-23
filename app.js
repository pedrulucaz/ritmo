"use strict";

(() => {
  const KEY = "ritmo.app.v1";
  const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  const GOALS = {muscle:"Ganhar massa muscular",fat:"Reduzir gordura",fitness:"Condicionamento",wellness:"Saúde e movimento"};
  const LEVELS = {beginner:"Iniciante",intermediate:"Intermediário",advanced:"Avançado"};
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
  const newProfileButton = document.getElementById("new-profile");
  const toastEl = document.getElementById("toast");
  let state = load();
  let view = "home";
  let detail = null;
  let adding = false;

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
  function cleanProfile(raw) {
    if(!raw || typeof raw!=="object") throw new Error("Perfil inválido");
    return {
      id:String(raw.id||uid()).slice(0,120),
      name:String(raw.name||"Pessoa").slice(0,60),
      goal:GOALS[raw.goal]?raw.goal:"fitness",
      level:LEVELS[raw.level]?raw.level:"beginner",
      place:PLACES[raw.place]?raw.place:"gym",
      days:clamp(raw.days,2,6,3),
      minutes:clamp(raw.minutes,30,90,45),
      runs:clamp(raw.runs,0,3,1),
      limitations:String(raw.limitations||"").slice(0,400),
      exerciseSwaps:cleanExerciseSwaps(raw.exerciseSwaps),
      createdAt:String(raw.createdAt||new Date().toISOString()).slice(0,40),
      logs:Array.isArray(raw.logs)?raw.logs.slice(-1000).filter(log=>log&&typeof log==="object").map(cleanLog):[]
    };
  }
  // Trocas são vinculadas à divisão e ao ambiente do treino, nunca a outro perfil.
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
  function makePlan(profile) {
    const strengthDays = SCHEDULES[profile.days];
    const sessions = SPLITS[profile.days].map((part,index)=>({
      id:"strength-"+index,
      day:strengthDays[index],
      title:SPLIT_NAMES[part],
      type:"strength",
      minutes:profile.minutes,
      planKey:profile.place+":"+part,
      items:applyExerciseSwaps(profile,part,exerciseRows(profile,part))
    }));
    const favored=[1,3,5,6,2,4,0];
    const selected=[];
    for(let i=0;i<profile.runs;i++){
      const day = favored.find(d=>!selected.includes(d)&&!strengthDays.includes(d));
      const fallback = favored.find(d=>!selected.includes(d));
      selected.push(day===undefined?fallback:fallback===undefined?6:day);
    }
    selected.forEach((day,index)=>{
      const prescription = profile.level==="beginner"?
        "Alternar 2 min de caminhada com 1 min de trote, sem forçar o ritmo.":
        profile.level==="intermediate"?"Corrida confortável em ritmo de conversa.": "Corrida leve e contínua; ajuste a intensidade à recuperação.";
      sessions.push({
        id:"run-"+index,day,title:"Corrida "+(index+1),type:"run",
        minutes:profile.level==="beginner"?20:profile.level==="intermediate"?30:40,
        description:prescription,items:[]
      });
    });
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
    newProfileButton.hidden=adding;
    if(state.profiles.length>1){
      switcher.innerHTML=state.profiles.map(p=>'<option value="'+esc(p.id)+'"'+(p.id===profile.id?' selected':'')+'>'+esc(p.name)+'</option>').join("");
    }
    nav.querySelectorAll("button[data-tab]").forEach(button=>button.classList.toggle("active",button.dataset.tab===view && !detail));
    if(!profile || adding){app.innerHTML=renderOnboarding();return;}
    if(detail){
      const session=makePlan(profile).find(s=>s.id===detail);
      if(session){app.innerHTML=renderSession(profile,session);return;}
      detail=null;
    }
    if(view==="plan")app.innerHTML=renderPlan(profile);
    else if(view==="history")app.innerHTML=renderHistory(profile);
    else if(view==="settings")app.innerHTML=renderSettings(profile);
    else app.innerHTML=renderHome(profile);
  }
  function field(label,name,kind,options,selected) {
    if(kind==="select") return '<div class="field"><label for="'+name+'">'+label+'</label><select name="'+name+'" id="'+name+'" required>'+options.map(o=>'<option value="'+esc(o[0])+'"'+(String(o[0])===String(selected)?' selected':'')+'>'+esc(o[1])+'</option>').join("")+'</select></div>';
    return '<div class="field"><label for="'+name+'">'+label+'</label><input id="'+name+'" name="'+name+'" type="'+kind+'" required maxlength="60" value="'+esc(selected||"")+'" placeholder="Como podemos chamar você?"></div>';
  }
  function profileFields(profile) {
    const p=profile||{name:"",goal:"muscle",level:"beginner",place:"gym",days:3,minutes:45,runs:1,limitations:""};
    return '<div class="form-grid">'+
      field("Como podemos chamar você?","name","text",null,p.name)+
      field("Seu objetivo","goal","select",Object.entries(GOALS),p.goal)+
      field("Experiência de treino","level","select",Object.entries(LEVELS),p.level)+
      field("Onde você vai treinar?","place","select",Object.entries(PLACES),p.place)+
      field("Dias de musculação por semana","days","select",[[2,"2 dias"],[3,"3 dias"],[4,"4 dias"],[5,"5 dias"],[6,"6 dias"]],p.days)+
      field("Tempo por treino","minutes","select",[[30,"30 minutos"],[45,"45 minutos"],[60,"60 minutos"],[75,"75 minutos"],[90,"90 minutos"]],p.minutes)+
      field("Corridas por semana","runs","select",[[0,"Ainda não vou correr"],[1,"1 corrida"],[2,"2 corridas"],[3,"3 corridas"]],p.runs)+
      '<div class="field"><label for="limitations">Alguma observação? (opcional)</label><input id="limitations" name="limitations" maxlength="400" value="'+esc(p.limitations)+'" placeholder="Ex.: evito agachamento profundo"></div>'+
      '</div>';
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
      '<p>Seu objetivo: '+esc(GOALS[profile.goal])+'. Pequenas conquistas criam grandes mudanças — no seu tempo.</p>'+
      '<div class="button-row"><button class="button button-light" data-nav="plan" type="button">Ver meu plano →</button></div></div>'+
      '<section class="grid">'+statCard("Treinos nesta semana",stat.week,"sessões registradas")+
      statCard("Treinos no histórico",stat.total,"sessões concluídas")+
      statCard("Corrida acumulada",stat.distance.toFixed(1).replace(".",",")+" km","distância registrada")+'</section>'+
      '<div class="section-title"><div><div class="eyebrow">Hoje · '+DAYS[day]+'</div><h2>'+ (todays.length?"O que vamos treinar?":"Hoje é dia de recuperar") +'</h2></div><span class="pill">'+todays.length+' atividade(s)</span></div>'+
      (todays.length?'<div class="grid two">'+todays.map(s=>sessionCard(s)).join("")+'</div>':
        '<div class="card"><h3>Descanso também é progresso.</h3><p class="muted">Aproveite para dormir bem, se alimentar e recuperar a energia.</p><button class="button button-outline" data-nav="plan" type="button">Ver outros dias</button></div>')+
      '<div class="section-title"><h2>Seu ponto de partida</h2></div>'+
      '<div class="grid two"><div class="card"><h3>Plano feito para seu perfil</h3><p class="muted">'+profile.days+' dias de musculação e '+profile.runs+' corrida(s) por semana, com sessões de cerca de '+profile.minutes+' minutos.</p></div>'+
      '<div class="card"><h3>Acompanhe a evolução</h3><p class="muted">Registre repetições, cargas e corridas; veja suas sessões ao longo das semanas.</p><button class="button button-outline button-sm" data-nav="history" type="button">Ver histórico</button></div></div>';
  }
  function statCard(number,label,description) {
    return '<div class="card"><div class="stat-label">'+number+'</div><div class="stat-number">'+label+'</div><div class="small muted">'+description+'</div></div>';
  }
  function sessionCard(session) {
    return '<article class="card day-card"><div class="day-head"><h3>'+esc(session.title)+'</h3><span class="pill '+(session.type==="run"?"yellow":"")+'">'+(session.type==="run"?"Corrida":"Força")+'</span></div>'+
      '<p class="muted small">'+session.minutes+' min previstos · '+(session.type==="run"?"Cardio":session.items.length+" exercícios")+'</p>'+
      '<button class="button button-outline button-sm" type="button" data-session="'+esc(session.id)+'">Abrir treino →</button></article>';
  }
  function renderPlan(profile) {
    const sessions=makePlan(profile);
    return '<div class="section-title"><div><div class="eyebrow">Organização semanal</div><h1>Seu plano de treino</h1><p class="muted">Sessões sugeridas para '+esc(profile.name)+' — '+esc(LEVELS[profile.level])+', '+esc(PLACES[profile.place])+'.</p></div></div>'+
      '<div class="notice">Comece com cargas e intensidades confortáveis, respeitando a técnica e a recuperação. Você pode ajustar o perfil em Ajustes.</div>'+
      '<div class="grid" style="margin-top:17px">'+DAYS.map((day,index)=>{
        const each=sessions.filter(s=>s.day===index);
        return '<article class="card day-card"><div class="day-head"><h3>'+day+'</h3><span class="pill '+(each.length?"":"gray")+'">'+(each.length?each.length+' sessão(ões)':'Descanso')+'</span></div>'+
          (each.length?each.map(s=>'<div class="session '+(s.type==="run"?"run":"")+'"><h3>'+esc(s.title)+'</h3><p class="small muted">'+s.minutes+' min</p><button class="button button-outline button-sm" data-session="'+esc(s.id)+'" type="button">Detalhes / registrar</button></div>').join(""):
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
      '<p>'+esc(session.description)+'</p><div class="form-grid">'+
      '<div class="field"><label for="distance">Distância (km)</label><input id="distance" name="distance" type="number" step="0.01" min="0" max="100" placeholder="Ex.: 3.5"></div></div>';
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
  function renderSettings(profile) {
    return '<div class="eyebrow">Suas preferências</div><h1>Seu Ritmo, suas escolhas</h1>'+
      '<div class="grid two"><div class="card"><h2>Atualizar plano</h2><p class="muted small">Ao salvar, seu plano será recalculado; o histórico anterior será preservado.</p>'+
      '<form id="settings-form">'+profileFields(profile)+'<div class="button-row"><button class="button" type="submit">Atualizar meu plano</button></div></form></div>'+
      '<div class="stack"><div class="card"><h2>Seus dados</h2><p class="muted">Faça backup neste dispositivo. Os perfis não sincronizam automaticamente.</p>'+
      '<div class="button-row"><button class="button button-outline" data-action="export" type="button">Exportar backup</button>'+
      '<label class="button button-outline" for="import-file">Importar backup</label><input id="import-file" type="file" accept=".json,application/json" class="sr-only"></div></div>'+
      '<div class="card"><h2>Privacidade</h2><div class="notice warning">Perfis nesta versão são locais, sem senha ou conta online. Outras pessoas no mesmo navegador podem acessá-los. Não use para informações sensíveis.</div>'+
      '<div class="button-row"><button type="button" class="button button-danger" data-action="delete-profile">Excluir perfil atual</button></div></div></div></div>';
  }
  function valuesFromForm(form) {
    const data=new FormData(form);
    const name=String(data.get("name")||"").trim();
    if(!name)throw new Error("Informe seu nome.");
    return {
      name:name.slice(0,60),
      goal:String(data.get("goal")),
      level:String(data.get("level")),
      place:String(data.get("place")),
      days:Number(data.get("days")),
      minutes:Number(data.get("minutes")),
      runs:Number(data.get("runs")),
      limitations:String(data.get("limitations")||"").trim()
    };
  }

  document.addEventListener("click", event=>{
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
    if(action==="back-plan"){detail=null;view="plan";render();scrollTo(0,0);}
    else if(action==="cancel-add"){adding=false;render();}
    else if(action==="export"){exportBackup();}
    else if(action==="delete-profile"){
      const p=current();
      if(p&&confirm("Excluir o perfil de "+p.name+" e todo seu histórico neste navegador? Esta ação não pode ser desfeita.")){
        state.profiles=state.profiles.filter(item=>item.id!==p.id);
        state.activeId=state.profiles[0]?.id||"";
        view="home";detail=null;save();render();notify("Perfil excluído.");
      }
    }
  });
  document.addEventListener("submit",event=>{
    const form=event.target;
    if(!["onboard-form","settings-form","log-form"].includes(form.id))return;
    event.preventDefault();
    try{
      if(form.id==="onboard-form"){
        if(state.profiles.length>=20)throw new Error("Limite de 20 perfis locais.");
        const profile=cleanProfile({id:uid(),...valuesFromForm(form),createdAt:new Date().toISOString(),logs:[]});
        state.profiles.push(profile);state.activeId=profile.id;adding=false;view="home";save();render();scrollTo(0,0);notify("Seu plano foi criado!");
      }else if(form.id==="settings-form"){
        const p=current();
        Object.assign(p,valuesFromForm(form));save();render();notify("Plano atualizado, histórico preservado.");
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
  newProfileButton.addEventListener("click",()=>{adding=true;detail=null;render();scrollTo(0,0)});
  switcher.addEventListener("change",event=>{if(state.profiles.some(p=>p.id===event.target.value)){state.activeId=event.target.value;detail=null;view="home";save();render()}});
  document.addEventListener("change",async event=>{
    if(event.target.matches("[data-swap-select]")) {
      const panel=event.target.closest(".swap-panel");
      const custom=panel?.querySelector("[data-custom-wrapper]");
      if(custom) {
        custom.hidden=event.target.value!=="__custom__";
        if(!custom.hidden)custom.querySelector("input")?.focus();
      }
      return;
    }
    if(event.target.id!=="import-file")return;
    const file=event.target.files?.[0];if(!file)return;
    if(file.size>2*1024*1024){alert("O arquivo excede 2 MB.");return;}
    try{
      const parsed=JSON.parse(await file.text());
      if(!parsed||!Array.isArray(parsed.profiles)||parsed.profiles.length>20||!parsed.profiles.length)throw new Error("Backup inválido.");
      const profiles=parsed.profiles.map(cleanProfile);
      if(confirm("Substituir todos os perfis locais pelo conteúdo deste backup? Faça uma exportação antes de continuar.")){
        state={profiles,activeId:profiles.some(p=>p.id===parsed.activeId)?parsed.activeId:profiles[0].id};
        detail=null;view="home";save();render();notify("Backup importado com sucesso.");
      }
    }catch(error){alert("Falha ao importar o backup: "+error.message)}
    event.target.value="";
  });
  function exportBackup() {
    const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),...state},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url;link.download="ritmo-backup-"+new Date().toISOString().slice(0,10)+".json";
    link.click();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
  }
  if("serviceWorker" in navigator && location.protocol==="https:") {
    window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.warn));
  }
  render();
})();
