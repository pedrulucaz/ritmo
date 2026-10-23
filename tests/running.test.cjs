"use strict";
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const code=fs.readFileSync("app.js","utf8");

function boot(profiles=[],activeId="") {
  const store = new Map([["ritmo.app.v1",JSON.stringify({profiles,activeId})]]);
  const listeners = {};
  const app = {innerHTML:""};
  const tabs = {hidden:true,querySelectorAll(){return [];}};
  const switcher={hidden:true,innerHTML:"",addEventListener(type,callback){listeners["switch:"+type]=callback;}};
  const button={hidden:false,addEventListener(){}};
  const toast={hidden:true,textContent:""};
  const elements={app,tabs,"profile-switch":switcher,"new-profile":button,toast};
  const document={
    getElementById(id){return elements[id]||null;},
    addEventListener(type,cb){listeners[type]=cb;},
    querySelectorAll(){return [];}
  };
  const alerts=[];
  const environment={
    document,localStorage:{getItem(key){return store.get(key)||null;},setItem(key,value){store.set(key,value);}},
    FormData:class FakeFormData {
      constructor(form){this.values=form.values||{};}
      get(key){const item=this.values[key];return Array.isArray(item)?item[0]??null:item??null;}
      getAll(key){const item=this.values[key];return item===undefined?[]:Array.isArray(item)?item:[item];}
    },
    navigator:{},alert(message){alerts.push(String(message));},confirm(){return true;},scrollTo(){},
    setTimeout(){},console,Intl,Date,Math,Number
  };
  vm.runInNewContext(code,environment,{filename:"app.js"});
  function saved(){return JSON.parse(store.get("ritmo.app.v1"));}
  function click(dataset){
    const target={dataset,closest(type){return type==="button"?this:null;}};
    listeners.click({target:{closest(type){return type==="button"?target:null;}}});
  }
  function submit(id,values,extra={}){
    let form={id,values,dataset:extra};
    listeners.submit({target:form,preventDefault(){}});
  }
  return {app,click,submit,saved,alerts,listeners};
}

const legacyLog={id:"past",sessionId:"strength-0",title:"Antigo treino",type:"strength",date:"2026-09-01T10:00:00Z",duration:40,items:[{name:"Supino reto com halteres",load:"12",reps:"10"}]};
const oldProfile={id:"p1",name:"Antigo",goal:"muscle",level:"intermediate",place:"gym",days:3,minutes:45,runs:2,createdAt:"2026-09-01T09:00:00Z",logs:[legacyLog],exerciseSwaps:{"gym:fullA":{"1:Supino reto com halteres":"Supino máquina"}}};
const legacy=boot([oldProfile],"p1");
legacy.click({nav:"plan"});
assert.equal((legacy.app.innerHTML.match(/class="session run"/g)||[]).length,2,"preserva corridas antigas");
assert.equal((legacy.app.innerHTML.match(/class="session "/g)||[]).length,3,"preserva musculação antiga");
assert.match(legacy.app.innerHTML,/Longão/);
const formBase={name:"Ana",mode:"run",runLevel:"beginner",runBaseKm:"0",runDays:["1","5"],limitations:""};
const runner=boot();
runner.submit("onboard-form",formBase);
assert.equal(runner.alerts.length,0,"questionário só corrida não pode falhar");
assert.equal(runner.saved().profiles[0].mode,"run");
assert.deepEqual(Array.from(runner.saved().profiles[0].runDays),[1,5]);
runner.click({nav:"plan"});
assert.match(runner.app.innerHTML,/Longão/);
assert.match(runner.app.innerHTML,/2,5 km/);
assert.doesNotMatch(runner.app.innerHTML,/Corpo inteiro/);
runner.click({session:"run-5"});
assert.match(runner.app.innerHTML,/Como executar/);
assert.match(runner.app.innerHTML,/Distância realizada/);
assert.match(runner.app.innerHTML,/caminhada e trote/);
runner.submit("log-form",{duration:"28",distance:"2.4",notes:"bom"},{id:"run-5"});
assert.equal(runner.saved().profiles[0].logs[0].distance,2.4);
assert.equal(runner.saved().profiles[0].logs[0].type,"run");

const intermediate=boot();
intermediate.submit("onboard-form",{...formBase,name:"Beto",runLevel:"intermediate",runBaseKm:"5",runDays:["0","2","6"]});
intermediate.click({nav:"plan"});
assert.match(intermediate.app.innerHTML,/Intervalado controlado/);
assert.match(intermediate.app.innerHTML,/Longão/);
intermediate.click({session:"run-6"});
assert.match(intermediate.app.innerHTML,/5,5 km/);
assert.match(intermediate.app.innerHTML,/ritmo confortável/);

const strength=boot();
strength.submit("onboard-form",{
  name:"Clara",mode:"strength",goal:"muscle",level:"intermediate",
  place:"home",days:"4",minutes:"45",limitations:""
});
strength.click({nav:"plan"});
assert.match(strength.app.innerHTML,/Superior A/);
assert.doesNotMatch(strength.app.innerHTML,/class="session run"/);
assert.equal(strength.saved().profiles[0].runs,0);

const both=boot();
both.submit("onboard-form",{
  name:"Duda",mode:"both",goal:"fitness",level:"intermediate",place:"gym",days:"3",minutes:"60",
  runLevel:"beginner",runBaseKm:"2",runDays:["0","3"],limitations:""
});
both.click({nav:"plan"});
assert.match(both.app.innerHTML,/Corpo inteiro A/);
assert.match(both.app.innerHTML,/Longão/);
assert.equal(both.saved().profiles[0].runs,2);
const beforeSettings=both.saved().profiles[0];
const change={
  name:"Duda",mode:"run",runLevel:"intermediate",runBaseKm:"5",
  runDays:["2","4","6"],limitations:""
};
both.submit("settings-form",change);
assert.equal(both.saved().profiles[0].mode,"run");
both.click({nav:"plan"});
assert.doesNotMatch(both.app.innerHTML,/Corpo inteiro A/);
assert.match(both.app.innerHTML,/Intervalado controlado/);
both.submit("settings-form",{
  name:"Duda",mode:"strength",goal:"muscle",level:"intermediate",place:"gym",days:"3",minutes:"60",limitations:""
});
assert.equal(both.saved().profiles[0].runs,0);
assert.deepEqual(Array.from(both.saved().profiles[0].runDays),[2,4,6]);
both.click({nav:"plan"});
assert.doesNotMatch(both.app.innerHTML,/class="session run"/);
assert.match(both.app.innerHTML,/Corpo inteiro A/);
assert.equal(beforeSettings.logs.length,0);

const invalid=boot();
invalid.submit("onboard-form",{...formBase,runDays:[]});
assert.match(invalid.alerts[0],/pelo menos um dia/);
assert.equal(invalid.saved().profiles.length,0);
const tooMany=boot();
tooMany.submit("onboard-form",{...formBase,runDays:["0","1","2","3","4","5"]});
assert.match(tooMany.alerts[0],/no máximo 5 dias/);

console.log("OK: modos isolados, dias escolhidos, níveis de corrida, longão, intervalado, migração e persistência.");
