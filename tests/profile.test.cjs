"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const appScript=fs.readFileSync("app.js","utf8");
const oldLog={id:"old",sessionId:"strength-1",title:"Puxar",date:"2026-10-01T10:00:00Z",duration:55,distance:0,type:"strength",items:[{name:"Remada baixa",reps:"12",load:"20"}]};
const original={id:"p1",name:"Ana & Bia",goal:"muscle",level:"intermediate",place:"gym",days:5,minutes:75,runs:1,logs:[oldLog],exerciseSwaps:{"gym:pull":{"1:Remada baixa":"Remada máquina"}}};
function create(initial=[original]) {
  const callbacks={},store=new Map([["ritmo.app.v1",JSON.stringify({profiles:initial,activeId:initial[0]?.id||""})]]);
  const images=new Map(),alerts=[],app={innerHTML:""},nav={hidden:true,querySelectorAll:()=>[]};
  const name={textContent:""},avatarBtn={hidden:false,addEventListener(type,cb){callbacks["profile:"+type]=cb;}};
  const switcher={hidden:true,addEventListener(){}},toast={textContent:"",hidden:true},avatarInitial={textContent:""};
  const ids={app,tabs:nav,"profile-open":avatarBtn,"profile-trigger-name":name,"header-avatar-fallback":avatarInitial,"profile-switch":switcher,toast};
  const document={
    getElementById(id){return ids[id]||null;},
    querySelectorAll(){return[];},
    addEventListener(type,callback){callbacks[type]=callback;},
  };
  const media={
    async get(){return null;},async save(id,key,file){images.set(id+":"+key,file);},
    async remove(id,key){images.delete(id+":"+key);},
    async removeProfile(id){for(const k of images.keys())if(k.startsWith(id+":"))images.delete(k);},
    async exportAll(){return [];},async replaceAll(){}
  };
  const fakeFormData=class{
    constructor(form){this.v=form.values||{};}
    get(k){return Array.isArray(this.v[k])?this.v[k][0]??null:this.v[k]??null;}
    getAll(k){return Array.isArray(this.v[k])?this.v[k]:this.v[k]===undefined?[]:[this.v[k]];}
  };
  const context={
    document,navigator:{},RitmoMedia:media,
    FormData:fakeFormData,
    localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
    alert:x=>alerts.push(String(x)),confirm:()=>true,scrollTo(){},
    setTimeout:()=>{},console,Intl,Math,Date,Number,URL:{revokeObjectURL(){}}
  };
  vm.runInNewContext(appScript,context,{filename:"app.js"});
  const click=async(dataset)=>{
    const node={dataset,closest(type){return type==="button"?this:null;}};
    await callbacks.click({target:{closest(type){return type==="button"?node:null;}}});
  };
  const submit=async(id,values,photo)=>{
    const form={id,values,querySelector(selector){if(selector==="#progress-photo")return{files:photo?[photo]:[]};return null;}};
    await callbacks.submit({target:form,preventDefault(){}});
  };
  return {app,name,avatarBtn,alerts,store,images,media,click,submit,callbacks,
    saved(){return JSON.parse(store.get("ritmo.app.v1"));},
    open(){callbacks["profile:click"]();}};
}
(async()=>{
  const t=create();
  assert.equal(t.name.textContent,"Ana & Bia");
  t.open();
  assert.match(t.app.innerHTML,/Perfil de Ana &amp; Bia/);
  assert.match(t.app.innerHTML,/id="avatar-file"/);
  assert.match(t.app.innerHTML,/id="body-form"/);
  assert.match(t.app.innerHTML,/id="progress-form"/);
  assert.match(t.app.innerHTML,/Criar outro perfil/);
  assert.match(t.app.innerHTML,/Meta de peso/);
  await t.submit("body-form",{
    weightKg:"78",targetWeightKg:"74",heightCm:"175",age:"25",parameter:"male",activity:"moderate",nutritionGoal:"lose"
  });
  assert.equal(t.saved().profiles[0].body.weightKg,78);
  assert.match(t.app.innerHTML,/2.720 kcal\/dia/);
  assert.match(t.app.innerHTML,/2.470 kcal\/dia/);
  assert.equal(t.saved().profiles[0].logs[0].id,"old");
  assert.equal(t.saved().profiles[0].exerciseSwaps["gym:pull"]["1:Remada baixa"],"Remada máquina");
  await t.submit("progress-form",{date:"2026-10-21",weightKg:"76.5",notes:"Primeira atualização"});
  assert.equal(t.saved().profiles[0].body.weightKg,76.5);
  assert.equal(t.saved().profiles[0].progress.length,1);
  await t.submit("progress-form",{date:"2026-10-22",weightKg:"76",notes:"Segunda"});
  assert.match(t.app.innerHTML,/weight-chart/);
  assert.match(t.app.innerHTML,/Primeira atualização/);
  await t.click({action:"delete-progress",id:t.saved().profiles[0].progress[0].id});
  assert.equal(t.saved().profiles[0].progress.length,1);
  const fakePhoto={type:"image/jpeg",size:1024};
  await t.submit("progress-form",{date:"2026-10-23",weightKg:"",notes:"Foto de hoje"},fakePhoto);
  assert.equal(t.saved().profiles[0].progress[1].hasPhoto,true);
  assert.equal(t.images.size,1);
  await t.click({action:"delete-progress",id:t.saved().profiles[0].progress[1].id});
  assert.equal(t.images.size,0);
  const younger=create([{...original,id:"young",name:"Jovem",body:{weightKg:68,heightCm:170,age:16,parameter:"female",activity:"moderate",nutritionGoal:"lose"}}]);
  younger.open();
  assert.match(younger.app.innerHTML,/menores de 18 anos/);
  assert.doesNotMatch(younger.app.innerHTML,/calorie-total/);
  const privacy=create([{...original,id:"new",name:"Outro",body:{weightKg:57,heightCm:178,age:30,parameter:"male",activity:"sedentary",nutritionGoal:"lose"}}]);
  privacy.open();
  assert.match(privacy.app.innerHTML,/Não recomendamos calcular automaticamente/);
  assert.deepEqual(t.alerts,[]);
  console.log("OK: nome, cálculo adulto, menor de idade, privacidade, fotos, progresso, gráfico e dados antigos.");
})().catch(e=>{console.error(e);process.exitCode=1;});
