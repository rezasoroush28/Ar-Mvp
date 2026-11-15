import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, resample, weld, meshopt, getBounds, cloneDocument, flatten, join } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
await MeshoptEncoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const original=await io.read('source/joy-original.glb');
async function metrics(doc,bytes){
 const r=doc.getRoot();
 const textures=await Promise.all(r.listTextures().map(async t=>{const m=await sharp(t.getImage()).metadata();return {name:t.getName(),width:m.width,height:m.height,bytes:t.getImage().byteLength,mime:t.getMimeType()};}));
 let triangles=0,drawCalls=0;
 for(const n of r.listNodes())if(n.getMesh())for(const p of n.getMesh().listPrimitives()){drawCalls++;triangles+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;}
 return {bytes,triangles,drawCalls,nodes:r.listNodes().length,skins:r.listSkins().map(s=>({joints:s.listJoints().length})),textures,textureMemoryRGBA:textures.reduce((n,t)=>n+t.width*t.height*4*4/3,0),animations:r.listAnimations().map(a=>({name:a.getName(),channels:a.listChannels().length,keys:a.listSamplers().reduce((n,s)=>n+s.getInput().getCount(),0),duration:Math.max(...a.listSamplers().map(s=>s.getInput().getMax([])[0]))})),bounds:getBounds(r.listScenes()[0])};
}
const before=await metrics(original,(await fs.stat('source/joy-original.glb')).size);
const doc=cloneDocument(original);
await doc.transform(dedup(),prune({keepLeaves:true}),resample(),weld(),flatten(),join({filter:node=>!node.getSkin()&&!/MY.?SCREEN/i.test(node.getName())}));
// Encode directly with the pinned Sharp/libvips version, preserving alpha and
// explicitly converting to sRGB. Keep helper dependencies on the same native
// version: mixing Sharp versions in one Windows process caused color errors.
for(const texture of doc.getRoot().listTextures()){
 const encoded=await sharp(texture.getImage()).toColourspace('srgb').resize({width:1024,height:1024,fit:'inside',withoutEnlargement:true}).webp({quality:88}).toBuffer();
 texture.setImage(new Uint8Array(encoded)).setMimeType('image/webp');
}
await doc.transform(meshopt({encoder:MeshoptEncoder,level:'medium'}));
const bytes=await io.writeBinary(doc);
const hash=crypto.createHash('sha256').update(bytes).digest('hex').slice(0,12);
await fs.mkdir('public/assets',{recursive:true});
for(const f of await fs.readdir('public/assets'))if(/^joy-.*\.glb$/.test(f))await fs.unlink(`public/assets/${f}`);
const name=`joy-${hash}.glb`;
await fs.writeFile(`public/assets/${name}`,bytes);
await fs.writeFile('src/asset.json',JSON.stringify({model:`assets/${name}`}));
const after=await metrics(await io.readBinary(bytes),bytes.length);
await fs.writeFile('docs/asset-metrics.json',JSON.stringify({before,after},null,2));
console.log(JSON.stringify({before,after},null,2));
