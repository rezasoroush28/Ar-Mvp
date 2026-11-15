import fs from 'node:fs/promises';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import assert from 'node:assert/strict';
import asset from '../src/asset.json' with {type:'json'};
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const bytes=await fs.readFile(`public/${asset.model}`);
assert.equal(bytes.toString('utf8',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
const doc=await io.readBinary(bytes),r=doc.getRoot(),metrics=JSON.parse(await fs.readFile('docs/asset-metrics.json','utf8'));
assert.equal(r.listSkins().length,1);assert.equal(r.listSkins()[0].listJoints().length,67);
assert.equal(r.listAnimations()[0].listChannels().length,201);
assert.equal(metrics.before.triangles,metrics.after.triangles);
assert.ok(Math.abs(metrics.before.animations[0].duration-metrics.after.animations[0].duration)<.00001);
assert.ok(r.listNodes().some(n=>/MY.?SCREEN/i.test(n.getName())&&n.getMesh()),'Replaceable screen missing');
for(const n of r.listNodes())if(n.getSkin())for(const p of n.getMesh().listPrimitives()){
 assert.ok(p.getAttribute('JOINTS_0'));assert.ok(p.getAttribute('WEIGHTS_0'));
}
assert.ok(bytes.length<5_000_000);
console.log(`Verified GLB v2, ${bytes.length} bytes, 67 joints, 201 channels, screen, weights, duration, and preserved triangles.`);
