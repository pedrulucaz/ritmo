"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

const clicks={},listeners={};
const store=new Map();
const originalLog={id:"log-1",sessionId:"strength-1",title:"Puxar",type:"strength",date:"2026-10-01T13:00:00.000Z",duration:55,distance:0,notes:"Registro anterior",items:[{name:"Crucifixo inverso",reps:"12",load:"5"}]};
const defaults={
  id:"p1",name:"Primeiro",goal:"muscle",level:"intermediate",place:"gym",
  days:5,minutes:75,runs:1,limitations:"",createdAt:"2026-10-01T12:00:00.000Z",logs:[originalLog]
};
const another={...defaults,id:"p2",name:"Segundo",logs:[]};
store.set("ritmo.app.v1",JSON.stringify({profiles:[defaults,another],activeId:"p1"}));
const app={innerHTML:""};
const tabs={hidden:true,querySelectorAll(){return[]}};
const switcher={hidden:false,innerHTML:"",addEventListener(type,cb){listeners["profile:"+type]=cb;}};
const newProfile={hidden:false,addEventListener(){}};
const toast={textContent:"",hidden:true};
const nodes={"app":app,"tabs":tabs,"profile-switch":switcher,"new-profile":newProfile,"toast":toast};
const document={
  getElementById(id){return nodes[id]||null;},
  querySelectorAll(){return[];},
  addEventListener(type,cb){listeners[type]=cb;}
};
const alerts=[];
const context={
  document,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
  navigator:{},alert:(x)=>alerts.push(x),confirm:()=>true,scrollTo(){},
  setTimeout:()=>0,console,Intl,Date,Math,Number
};
vm.runInNewContext(fs.readFileSync("app.js","utf8"),context,{filename:"app.js"});
function click(dataset,extra={}){
  const button={dataset,closest(selector){
    if(selector==="button")return button;
    if(selector===".exercise-row")return extra.row||null;
    return null;
  },setAttribute(){}};
  listeners.click({target:{closest(selector){return selector==="button"?button:null;}}});
}
function swapTo(name,index=3) {
  const row={querySelector(selector) {
    if(selector==="[data-swap-select]")return {value:name};
    return null;
  }};
  click({action:"save-swap",index:String(index)},{row});
}
function snapshot(){return JSON.parse(store.get("ritmo.app.v1"))}
click({nav:"plan"});
click({session:"strength-1"});
assert.match(app.innerHTML,/class="exercise-name">Crucifixo inverso/);
assert.match(app.innerHTML,/data-action="swap-open"/);
assert.match(app.innerHTML,/Face pull na polia/);
swapTo("Face pull na polia");
assert.deepEqual(alerts,[]);
assert.equal(snapshot().profiles[0].exerciseSwaps["gym:pull"]["3:Crucifixo inverso"],"Face pull na polia");
assert.match(app.innerHTML,/class="exercise-name">Face pull na polia/);
assert.match(app.innerHTML,/Personalizado/);
assert.equal(snapshot().profiles[0].logs[0].items[0].name,"Crucifixo inverso","histórico deve permanecer igual");
click({nav:"home"});
click({session:"strength-1"});
assert.match(app.innerHTML,/class="exercise-name">Face pull na polia/,"troca deve permanecer nas próximas visitas");
listeners["profile:change"]({target:{value:"p2"}});
click({session:"strength-1"});
assert.match(app.innerHTML,/class="exercise-name">Crucifixo inverso/,"segundo perfil deve manter o original");
listeners["profile:change"]({target:{value:"p1"}});
click({session:"strength-1"});
click({action:"reset-swap",index:"3"});
assert.match(app.innerHTML,/class="exercise-name">Crucifixo inverso/);
assert.ok(!snapshot().profiles[0].exerciseSwaps["gym:pull"],"reset remove preferência");
assert.deepEqual(alerts,[]);
console.log("OK: troca persiste, separa perfis, preserva histórico e permite restaurar o original.");
