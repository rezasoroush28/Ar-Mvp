import fs from 'node:fs';
const s=fs.readFileSync('source/Joy-Coding.html','utf8');
const m=s.match(/<script[^>]*id=["']asset["'][^>]*>([\s\S]*?)<\/script>/);
if(!m) throw Error('Embedded GLB not found');
const b=Buffer.from(m[1].trim(),'base64');
if(b.toString('utf8',0,4)!=='glTF'||b.readUInt32LE(4)!==2||b.readUInt32LE(8)!==b.length)throw Error('Invalid GLB');
fs.writeFileSync('source/joy-original.glb',b);
const g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));
console.log(JSON.stringify({bytes:b.length,asset:g.asset,nodes:g.nodes.length,meshes:g.meshes.length,skins:g.skins?.map(s=>({joints:s.joints.length})),animations:g.animations?.map(a=>({name:a.name,channels:a.channels.length,maxTime:Math.max(...a.samplers.map(s=>g.accessors[s.input].max?.[0]??0))})),images:g.images?.map(i=>({name:i.name,mimeType:i.mimeType})),screens:g.nodes.filter(n=>/screen/i.test(n.name))},null,2));
