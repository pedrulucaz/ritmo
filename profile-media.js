"use strict";
// As imagens são armazenadas somente neste navegador; nunca no repositório público.
var RitmoMedia=(()=>{
  const NAME="ritmo-local-images",STORE="pictures";
  let connection;
  function db(){
    if(typeof indexedDB==="undefined")return Promise.reject(new Error("O armazenamento de fotos não está disponível neste navegador."));
    if(connection)return connection;
    connection=new Promise((resolve,reject)=>{
      const request=indexedDB.open(NAME,1);
      request.onupgradeneeded=()=>{const database=request.result;if(!database.objectStoreNames.contains(STORE))database.createObjectStore(STORE,{keyPath:"key"});};
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error("Não foi possível abrir o álbum."));
    });
    return connection;
  }
  async function transact(mode,operation){
    const database=await db();
    return new Promise((resolve,reject)=>{
      const tx=database.transaction(STORE,mode),store=tx.objectStore(STORE);
      let result;
      tx.oncomplete=()=>resolve(result);
      tx.onerror=()=>reject(tx.error||new Error("Falha no armazenamento das fotos."));
      tx.onabort=()=>reject(tx.error||new Error("Operação de fotos cancelada."));
      operation(store,value=>{result=value;});
    });
  }
  const key=(profile,entry)=>String(profile)+":"+String(entry);
  function get(profile,entry){
    return transact("readonly",(s,done)=>{const r=s.get(key(profile,entry));r.onsuccess=()=>done(r.result?.blob||null);});
  }
  function put(profile,entry,blob){
    return transact("readwrite",(s)=>{s.put({key:key(profile,entry),blob});});
  }
  function remove(profile,entry){return transact("readwrite",s=>s.delete(key(profile,entry)));}
  function removeProfile(profile){
    return transact("readwrite",s=>{
      const r=s.openCursor();
      r.onsuccess=()=>{const cursor=r.result;if(!cursor)return;if(cursor.key.startsWith(String(profile)+":"))cursor.delete();cursor.continue();};
    });
  }
  function all(){return transact("readonly",(s,done)=>{const r=s.getAll();r.onsuccess=()=>done(r.result||[]);});}
  function blobToBase64(blob){
    return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
  }
  function base64ToBlob(input){
    if(typeof input!=="string"||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(input))throw new Error("Imagem inválida no backup.");
    const encoded=input.split(",")[1];
    const decoded=atob(encoded);
    if(decoded.length>1024*1024)throw new Error("Uma imagem do backup é muito grande.");
    const bytes=new Uint8Array(decoded.length);
    for(let i=0;i<decoded.length;i++)bytes[i]=decoded.charCodeAt(i);
    return new Blob([bytes],{type:"image/jpeg"});
  }
  async function exportAll(allowedIds){
    const images=await all(),valid=new Set(allowedIds);
    const selected=images.filter(entry=>valid.has(entry.key.split(":")[0]));
    if(selected.length>500)throw new Error("Álbum excede o limite para backup.");
    return Promise.all(selected.map(async item=>({key:item.key,data:await blobToBase64(item.blob)})));
  }
  async function replaceAll(entries){
    if(!Array.isArray(entries)||entries.length>500)throw new Error("Imagens inválidas no backup.");
    const prepared=entries.map(item=>{
      if(!item||typeof item.key!=="string"||!/^[-\w.]+:(avatar|progress:[-\w.]+)$/.test(item.key))throw new Error("Identificador de foto inválido.");
      return {key:item.key,blob:base64ToBlob(item.data)};
    });
    return transact("readwrite",s=>{s.clear();for(const image of prepared)s.put(image);});
  }
  function compress(file,avatar){
    if(!file||!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type))return Promise.reject(new Error("Use uma foto JPEG, PNG ou WebP compatível."));
    if(file.size>12*1024*1024)return Promise.reject(new Error("A foto não pode ultrapassar 12 MB."));
    return new Promise((resolve,reject)=>{
      const img=new Image(),url=URL.createObjectURL(file);
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Não foi possível abrir essa imagem. Tente JPG ou PNG."));};
      img.onload=()=>{
        URL.revokeObjectURL(url);
        try{
          const max=avatar?400:1100,ratio=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
          const canvas=document.createElement("canvas");
          canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));
          canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
          const ctx=canvas.getContext("2d");
          if(!ctx)throw new Error("Este navegador não permite tratar a foto.");
          ctx.drawImage(img,0,0,canvas.width,canvas.height);
          canvas.toBlob(blob=>{
            if(!blob)reject(new Error("Não foi possível preparar a foto."));
            else if(blob.size>1024*1024)reject(new Error("A foto continuou grande demais após otimização."));
            else resolve(blob);
          },"image/jpeg",avatar?0.77:0.70);
        }catch(error){reject(error);}
      };
      img.src=url;
    });
  }
  async function save(profile,entry,file,avatar=false){const blob=await compress(file,avatar);await put(profile,entry,blob);}
  return {get,remove,removeProfile,exportAll,replaceAll,save};
})();
