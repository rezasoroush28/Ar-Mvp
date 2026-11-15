import {test,expect} from '@playwright/test';
test('base stays on the 80 mm marker through perspective tilts, distance, roll and viewport rotation',async({page})=>{
 test.setTimeout(90000);
 // Known pinhole camera, zero lens distortion, matching the generated camera frames.
 const calibration=Buffer.alloc(176);calibration.writeInt32BE(640,0);calibration.writeInt32BE(480,4);
 [600,0,320,0,0,600,240,0,0,0,1,0,0,0,0,0,600,600,320,240,1].forEach((v,i)=>calibration.writeDoubleBE(v,8+i*8));
 await page.route('**/camera_para.dat',r=>r.fulfill({body:calibration,contentType:'application/octet-stream'}));
 await page.goto('./?debug=1');
 await page.evaluate(async()=>{
  const image=new Image();image.src=new URL('marker.svg',location.href).href;await image.decode();
  const texture=document.createElement('canvas');texture.width=texture.height=720;
  const tc=texture.getContext('2d')!;tc.drawImage(image,0,0,720,720);const pixels=tc.getImageData(0,0,720,720).data;
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const ctx=canvas.getContext('2d')!;
  const cached=document.createElement('canvas');cached.width=640;cached.height=480;const cc=cached.getContext('2d')!;
  const fixture={pitch:25,yaw:0,roll:0,distance:.34,x:0,y:0,expected:[] as number[][],normal:[] as number[]};
  Object.assign(window,{planeFixture:fixture});let previous='';
  const draw=()=>{
   const key=JSON.stringify([fixture.pitch,fixture.yaw,fixture.roll,fixture.distance,fixture.x,fixture.y]);
   if(key!==previous){
    previous=key;const rad=Math.PI/180,sp=Math.sin(fixture.pitch*rad),cp=Math.cos(fixture.pitch*rad),sy=Math.sin(fixture.yaw*rad),cy=Math.cos(fixture.yaw*rad),sr=Math.sin(fixture.roll*rad),cr=Math.cos(fixture.roll*rad);
    const bx=[cr*cy,sr*cy,-sy],by=[cr*sy*sp-sr*cp,sr*sy*sp+cr*cp,cy*sp],n=[cr*sy*cp+sr*sp,sr*sy*cp-cr*sp,cy*cp];
    fixture.normal=[-n[0],n[1],n[2]];
    fixture.expected=[[-.04,-.04],[.04,-.04],[.04,.04],[-.04,.04]].map(([x,y])=>{const p=bx.map((v,i)=>v*x+by[i]*y+[fixture.x,fixture.y,fixture.distance][i]);return [600*p[0]/p[2]+320,600*p[1]/p[2]+240];});
    const output=cc.createImageData(640,480);output.data.fill(255);
    const planeDistance=n[0]*fixture.x+n[1]*fixture.y+n[2]*fixture.distance;
    for(let py=0;py<480;py++)for(let px=0;px<640;px++){
     const rx=(px+.5-320)/600,ry=(py+.5-240)/600,t=planeDistance/(n[0]*rx+n[1]*ry+n[2]);
     const dx=t*rx-fixture.x,dy=t*ry-fixture.y,dz=t-fixture.distance;
     const u=(bx[0]*dx+bx[1]*dy+bx[2]*dz)/.12+.5,v=(by[0]*dx+by[1]*dy+by[2]*dz)/.12+.5;
     if(u<0||u>=1||v<0||v>=1)continue;
     const value=pixels[(Math.floor(v*720)*720+Math.floor(u*720))*4],at=(py*640+px)*4;
     output.data[at]=output.data[at+1]=output.data[at+2]=value;
    }
    cc.putImageData(output,0,0);
   }
   ctx.drawImage(cached,0,0);requestAnimationFrame(draw);
  };draw();navigator.mediaDevices.getUserMedia=async()=>canvas.captureStream(30);
 });
 await page.locator('#start').click();
 await expect(page.locator('html')).toHaveAttribute('data-tracked','true',{timeout:20000});
 const poses=[{pitch:0,yaw:0,roll:0,distance:.34,x:0,y:0},{pitch:35,yaw:20,roll:15,distance:.34,x:.02,y:-.01},{pitch:55,yaw:-25,roll:-20,distance:.32,x:-.02,y:.015},{pitch:20,yaw:40,roll:35,distance:.40,x:.035,y:-.02}];
 for(const pose of poses){
  await page.evaluate(p=>Object.assign((window as any).planeFixture,p),pose);
  await expect.poll(()=>page.evaluate(()=>{
   const s=window.joyTracking,f=(window as any).planeFixture;
   if(!s?.bounds)return 999;
   return Math.max(...s.projected.map(p=>Math.min(...f.expected.map((q:number[])=>Math.hypot(p[0]-q[0],p[1]-q[1])))));
  }),{timeout:15000,message:`Projected marker-plane corners at ${JSON.stringify(pose)}`}).toBeLessThan(4);
  const snapshot=await page.evaluate(()=>window.joyTracking!);
  expect(Math.abs(snapshot.bounds!.min[1])).toBeLessThan(.000001);
  expect(Math.max(snapshot.bounds!.max[0]-snapshot.bounds!.min[0],snapshot.bounds!.max[2]-snapshot.bounds!.min[2])).toBeCloseTo(.08,5);
  expect(snapshot.bounds!.max[2]-snapshot.bounds!.min[2]).toBeLessThanOrEqual(.080001);
  expect(snapshot.bounds!.max[0]+snapshot.bounds!.min[0]).toBeCloseTo(0,6);
  expect(snapshot.bounds!.max[2]+snapshot.bounds!.min[2]).toBeCloseTo(0,6);
  const normalDot=await page.evaluate(()=>window.joyTracking!.normal.reduce((sum,v,i)=>sum+v*(window as any).planeFixture.normal[i],0));
  expect(normalDot).toBeGreaterThan(.97);
 }
 await page.setViewportSize({width:915,height:412});
 const rectangles=await page.locator('#stage').evaluate(stage=>Array.from(stage.querySelectorAll('video,canvas')).map(e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};}));
 expect(rectangles).toHaveLength(2);expect(rectangles[0]).toEqual(rectangles[1]);
 await page.screenshot({path:'test-results/marker-plane-perspective.png'});
});
