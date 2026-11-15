// Local visual QA only: do not publish the untouched source archive.
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const source=await fs.readFile('source/Joy-Coding.html');
const server=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(source);});
await new Promise(resolve=>server.listen(4174,'127.0.0.1',resolve));
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:412,height:915}});
 await page.goto('http://127.0.0.1:4174/');
 await page.waitForFunction(()=>document.documentElement.dataset.ready==='true',null,{timeout:60000});
 await page.locator('#play').click();
 await page.screenshot({path:'test-results/joy-original-reference.png'});
 console.log('Untouched source reference rendered.');
}finally{await browser.close();server.close();}
