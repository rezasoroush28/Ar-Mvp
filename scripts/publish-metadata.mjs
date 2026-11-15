import fs from 'node:fs/promises';
import asset from '../src/asset.json' with {type:'json'};
await fs.mkdir('public/licenses',{recursive:true});
for(const [name,from] of Object.entries({'three-MIT.txt':'three/LICENSE','artoolkit-LGPL.txt':'@ar-js-org/artoolkit5-js/LICENSE','meshoptimizer-MIT.txt':'meshoptimizer/LICENSE.md','gltf-transform-MIT.txt':'@gltf-transform/core/LICENSE.md'})){
 await fs.copyFile(`node_modules/${from}`,`public/licenses/${name}`);
}
await fs.copyFile('node_modules/@ar-js-org/artoolkit5-js/dist/ARToolkit.js','public/licenses/ARToolkit-0.3.2.js');
const tracker='https://github.com/AR-js-org/artoolkit5-js/tree/ad058766e9c9880cfadd1381f74ec1c5eaa46679';
await fs.writeFile('public/licenses/index.html',`<!doctype html><html lang="en"><meta charset="utf-8"><title>Software licenses</title><style>body{font:16px/1.7 system-ui;max-width:800px;margin:50px auto;padding:0 24px}</style><a href="../credits.html">← Credits</a><h1>Software licenses &amp; source</h1><ul><li><a href="three-MIT.txt">Three.js MIT license</a></li><li><a href="artoolkit-LGPL.txt">ARToolKit LGPL-3.0 and additional permission</a></li><li><a href="meshoptimizer-MIT.txt">Meshoptimizer MIT license</a></li><li><a href="gltf-transform-MIT.txt">glTF Transform MIT license</a></li></ul><p>Unmodified <a href="ARToolkit-0.3.2.js" download>ARToolkit 0.3.2 library</a> · <a href="${tracker}">Corresponding source, native bindings, and build instructions at the npm release commit</a> · <a href="https://github.com/AR-js-org/artoolkit5-js/archive/ad058766e9c9880cfadd1381f74ec1c5eaa46679.tar.gz">Source archive</a>.</p><p>The embedded WASM is shipped in the separate tracker JavaScript chunk. No external runtime service is used. To replace or modify the library, change its dependency in package.json and rebuild the application with the instructions in the repository.</p></html>`);
await fs.writeFile('public/assets/asset-manifest.json',JSON.stringify({model:asset.model.replace('assets/',''),license:'https://creativecommons.org/licenses/by/4.0/',credits:'../credits.html',metrics:'../asset-metrics.json'},null,2));
await fs.copyFile('docs/asset-metrics.json','public/asset-metrics.json');
console.log('Published licenses, asset manifest, and metrics.');
