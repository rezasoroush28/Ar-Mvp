import {test,expect,Page} from '@playwright/test';
async function ready(page:Page){await expect(page.locator('html')).toHaveAttribute('data-ready','true',{timeout:45000});}
test('mobile landing stays lightweight; fallback animates, orbits, zooms, pauses, and returns',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('./');
 await expect(page.getByRole('heading',{level:1})).toBeVisible();
 expect(await page.evaluate(()=>performance.getEntriesByType('resource').some(e=>/\.glb|tracker-/.test(e.name)))).toBe(false);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'View 3D',exact:true}).first().click();await ready(page);
 const time=await page.locator('html').getAttribute('data-time');await page.waitForTimeout(350);expect(await page.locator('html').getAttribute('data-time')).not.toBe(time);
 await page.getByRole('button',{name:'Pause',exact:true}).click();
 const paused=await page.locator('html').getAttribute('data-time');await page.waitForTimeout(250);expect(await page.locator('html').getAttribute('data-time')).toBe(paused);
 const before=await page.locator('canvas').screenshot();
 await page.mouse.move(200,400);await page.mouse.down();await page.mouse.move(325,440,{steps:8});await page.mouse.up();await page.mouse.wheel(0,-140);await page.waitForTimeout(300);
 expect((await page.locator('canvas').screenshot()).equals(before)).toBe(false);
 await page.getByRole('button',{name:'Sound off'}).click();await expect(page.getByRole('button',{name:'Sound on'})).toHaveAttribute('aria-pressed','true');
 await page.screenshot({path:'test-results/joy-3d-mobile.png'});
 await page.getByRole('button',{name:'← Back',exact:true}).click();await expect(page.locator('#landing')).toBeVisible();
 expect(errors).toEqual([]);
});
test('permission denied offers recovery and a camera-free fallback',async({page})=>{
 await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied for test','NotAllowedError');};});
 await page.goto('./');await page.getByRole('button',{name:'Start AR'}).click();
 await expect(page.locator('#error')).toBeVisible();await expect(page.locator('#error-message')).toContainText('allow Camera');
 await page.getByRole('button',{name:'Try again'}).click();await expect(page.locator('#error')).toBeVisible();
 await page.locator('#fallback').click();await ready(page);await expect(page.locator('#error')).toBeHidden();
});
test('failed model fetch retries, with no permanent rejected cache',async({page})=>{
 await page.route('**/*.glb',r=>r.abort());await page.goto('./');await page.getByRole('button',{name:'View 3D',exact:true}).first().click();
 await expect(page.locator('#error')).toBeVisible();await page.unroute('**/*.glb');await page.getByRole('button',{name:'Try again'}).click();await ready(page);
});
test('real detector follows barcode fixture, hides on loss, reacquires, stops capture',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('./');
 await page.evaluate(async()=>{
  const image=new Image();image.src=new URL('marker.svg',location.href).href;await image.decode();
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const ctx=canvas.getContext('2d')!;
  const fixture={x:320,y:240,rotation:0,visible:true,stream:canvas.captureStream(30)};
  Object.assign(window,{fixture});
  const draw=()=>{ctx.fillStyle='#fff';ctx.fillRect(0,0,640,480);if(fixture.visible){ctx.save();ctx.translate(fixture.x,fixture.y);ctx.rotate(fixture.rotation);ctx.scale(1,.72);ctx.drawImage(image,-100,-100,200,200);ctx.restore();}requestAnimationFrame(draw);};draw();
  navigator.mediaDevices.getUserMedia=async()=>fixture.stream;
 });
 await page.getByRole('button',{name:'Start AR'}).click();await ready(page);
 await expect(page.locator('html')).toHaveAttribute('data-tracked','true',{timeout:20000});
 await page.waitForTimeout(300);const frame=await page.locator('canvas').screenshot();
 const firstPose=await page.evaluate(()=>(window as any).joyMetrics.anchorX);
 await page.evaluate(()=>{const f=(window as any).fixture;f.x=350;f.y=225;f.rotation=.25;});await page.waitForTimeout(500);
 await expect.poll(async()=>Math.abs(await page.evaluate(()=>(window as any).joyMetrics.anchorX)-firstPose),{timeout:15000}).toBeGreaterThan(.005);
 expect((await page.locator('canvas').screenshot()).equals(frame)).toBe(false);
 await page.evaluate(()=>{(window as any).fixture.visible=false;});await expect(page.locator('html')).toHaveAttribute('data-tracked','false');
 const time=await page.locator('html').getAttribute('data-time');await page.waitForTimeout(300);expect(await page.locator('html').getAttribute('data-time')).toBe(time);
 await page.evaluate(()=>{(window as any).fixture.visible=true;});await expect(page.locator('html')).toHaveAttribute('data-tracked','true');
 await page.screenshot({path:'test-results/joy-ar-fixture.png'});
 expect(await page.evaluate(()=>(window as any).joyMetrics.triangles)).toBeGreaterThan(100000);
 expect(await page.evaluate(()=>(window as any).joyMetrics.anchorZ)).toBeLessThan(-.05);
 await page.getByRole('button',{name:'← Back',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).fixture.stream.getTracks().every((t:MediaStreamTrack)=>t.readyState==='ended'))).toBe(true);
 expect(errors).toEqual([]);
});
