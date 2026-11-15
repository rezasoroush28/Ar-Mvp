import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const url=process.argv[2]||'http://127.0.0.1:4173/Ar-Mvp/';
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:412,height:915},deviceScaleFactor:1.5,isMobile:true,hasTouch:true});
const page=await context.newPage(),cdp=await context.newCDPSession(page);
const results=[];
try {
 await cdp.send('Network.enable');
 for(const warm of [false,true]){
  await cdp.send('Network.setCacheDisabled',{cacheDisabled:!warm});
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:10_000_000/8,uploadThroughput:2_000_000/8});
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.goto(url);await page.locator('#view').click();
  await page.waitForFunction(()=>document.documentElement.dataset.ready==='true',null,{timeout:60000});
  await page.waitForTimeout(3500);
  results.push(await page.evaluate((warm)=>({warm,userAgent:navigator.userAgent,metrics:window.joyMetrics,resources:performance.getEntriesByType('resource').map(r=>({name:r.name.split('/').at(-1),transferSize:r.transferSize,encodedBodySize:r.encodedBodySize,duration:r.duration})),gpu:(()=>{const gl=document.querySelector('canvas')?.getContext('webgl2');const ext=gl?.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable';})()}),warm));
  if(!warm)await page.screenshot({path:'test-results/benchmark-3d-mobile.png'});
 }
 await fs.mkdir('docs',{recursive:true});
 await fs.writeFile('docs/load-benchmark.json',JSON.stringify({url,conditions:{viewport:'412×915',dpr:1.5,network:'10 Mbps down / 2 Mbps up, 80 ms latency',cpu:'4× CPU slowdown',rendering:'Windows desktop Chromium / ANGLE SwiftShader software GPU',actualPhone:false},results},null,2));
 console.log(JSON.stringify(results.map(r=>({warm:r.warm,metrics:r.metrics,transferBytes:r.resources.reduce((n,r)=>n+r.transferSize,0)})),null,2));
}finally{await browser.close();}
