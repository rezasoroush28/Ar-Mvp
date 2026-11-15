import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadWorld, JoyWorld } from './world';
import type { Tracker } from './tracker';
export class Viewer {
  private renderer = new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42,1,.005,10);
  private anchor = new THREE.Group();
  private orbit: OrbitControls;
  private world?: JoyWorld;
  private tracker?: Tracker;
  private video?: HTMLVideoElement;
  private stream?: MediaStream;
  private mode: 'ar'|'3d' = '3d';
  private revision=0;
  private paused=false;
  private last=0;
  private lastTracked=false;
  private frames=0;
  private fpsStart=0;
  private metrics: Record<string,number>={};
  constructor(private stage: HTMLElement,private status: (s:string)=>void){
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
    stage.append(this.renderer.domElement);this.scene.add(this.anchor);
    this.orbit=new OrbitControls(this.camera,this.renderer.domElement);this.orbit.enableDamping=true;
    this.orbit.minDistance=.08;this.orbit.maxDistance=.65;this.orbit.maxPolarAngle=Math.PI*.515;this.orbit.enablePan=false;
    addEventListener('resize',()=>this.resize());
    this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.stop();this.status('Graphics were interrupted. Go back and reopen the scene.');});
  }
  async start(mode: 'ar'|'3d',startedAt=performance.now()){
    this.stop();const revision=this.revision;this.mode=mode;this.paused=false;
    this.metrics={started:startedAt};this.anchor.position.set(0,0,0);this.anchor.quaternion.identity();this.anchor.visible=mode==='3d';
    this.camera.position.set(0,0,0);this.camera.quaternion.identity();this.orbit.enabled=mode==='3d';
    this.scene.background=mode==='3d'?new THREE.Color('#11151d'):null;
    const model=loadWorld().then(world=>{
      if(revision!==this.revision)return;
      this.world=world;world.mute();this.anchor.add(world.root);this.metrics.modelReady=performance.now()-this.metrics.started;
    });
    const camera=mode==='ar'?this.startCamera(revision):Promise.resolve();
    // Attach rejection handlers immediately to both concurrent operations.
    await Promise.all([model,camera]);
    if(revision!==this.revision)return;
    if(mode==='3d'){this.resetView();this.status('');}
    else this.status('Point at the printed marker');
    this.resize();this.last=performance.now();this.fpsStart=this.last;this.frames=0;
    this.renderer.setAnimationLoop(now=>this.frame(now));
  }
  private async startCamera(revision:number){
    if(!isSecureContext)throw new Error('Camera access requires HTTPS or localhost.');
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('This browser does not support camera access.');
    // Camera permission starts while the tracker chunk and model fetch in parallel.
    const tracking=import('./tracker');
    const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:640},height:{ideal:480},frameRate:{ideal:30,max:30}}});
    if(revision!==this.revision){stream.getTracks().forEach(t=>t.stop());return;}
    this.stream=stream;
    const video=document.createElement('video');video.muted=true;video.autoplay=true;video.playsInline=true;video.setAttribute('aria-hidden','true');video.srcObject=stream;
    this.video=video;this.stage.prepend(video);
    await video.play();
    if(revision!==this.revision)return;
    this.metrics.cameraReady=performance.now()-this.metrics.started;
    this.status(this.world?'Point at the printed marker':'Camera ready · Loading Joy…');
    const {Tracker}=await tracking;
    if(revision!==this.revision)return;
    this.tracker=new Tracker(video,this.camera,this.anchor);
    await this.tracker.init();
    if(revision!==this.revision)return;
    this.metrics.trackerReady=performance.now()-this.metrics.started;
    this.resize();
    // Track immediately, even while the GLB is still downloading.
    this.last=performance.now();this.renderer.setAnimationLoop(now=>this.frame(now));
  }
  private frame(now:number){
    const delta=Math.min(.065,Math.max(0,(now-this.last)/1000));this.last=now;
    let animate=this.mode==='3d';
    if(this.mode==='ar'&&this.tracker){
      const tracking=this.tracker.update(performance.now(),delta);animate=tracking.detected;
      if(tracking.visible!==this.lastTracked){
        this.lastTracked=tracking.visible;
        this.status(tracking.visible?(this.world?'Joy found her spot.':'Marker found · Loading Joy…'):'Point at the printed marker');
      }
      if(!animate)this.world?.silence();
      document.documentElement.dataset.tracked=String(tracking.visible);
    }
    if(animate&&!this.paused&&!document.hidden)this.world?.update(delta);
    if(this.mode==='3d')this.orbit.update();
    this.renderer.render(this.scene,this.camera);
    if(this.world&&this.anchor.visible&&this.renderer.info.render.triangles>1000&&!this.metrics.firstFrame){
      const renderedAt=performance.now();this.metrics.firstFrame=renderedAt-this.metrics.started;
      if(this.tracker?.firstSeen)this.metrics.markerToFrame=renderedAt-this.tracker.firstSeen;
    }
    this.frames++;
    if(now-this.fpsStart>1000){this.metrics.fps=this.frames*1000/(now-this.fpsStart);this.frames=0;this.fpsStart=now;}
    Object.assign(this.metrics,{drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,anchorX:this.anchor.position.x,anchorY:this.anchor.position.y,anchorZ:this.anchor.position.z});
    (window as Window & {joyMetrics?:Record<string,number>}).joyMetrics={...this.metrics};
  }
  resetView(){
    const factor=Math.max(1,Math.min(2.5,.8/(innerWidth/innerHeight)));
    this.camera.position.set(.22*factor,.135,.10*factor);this.orbit.target.set(.005,.065,0);this.orbit.update();
  }
  private resize(){
    const w=this.stage.clientWidth,h=this.stage.clientHeight;
    if(!w||!h)return;
    if(this.mode==='3d'){
      this.renderer.setSize(w,h);this.renderer.domElement.style.left='0';this.renderer.domElement.style.top='0';
      this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
    }else if(this.video?.videoWidth){
      // Identical cover crop for video and WebGL; never stretch their aspect ratios.
      const vw=this.video.videoWidth,vh=this.video.videoHeight,scale=Math.max(w/vw,h/vh);
      const rw=Math.round(vw*scale),rh=Math.round(vh*scale),left=`${(w-rw)/2}px`,top=`${(h-rh)/2}px`;
      this.renderer.setSize(rw,rh);this.renderer.domElement.style.left=left;this.renderer.domElement.style.top=top;
      Object.assign(this.video.style,{width:`${rw}px`,height:`${rh}px`,left,top});
    }
  }
  toggleSound(){return this.world?.toggleSound()??Promise.resolve(false);}
  togglePause(){this.paused=!this.paused;if(this.paused)this.world?.silence();return this.paused;}
  stop(){
    this.revision++;this.renderer.setAnimationLoop(null);this.tracker?.dispose();this.tracker=undefined;
    this.stream?.getTracks().forEach(t=>t.stop());this.stream=undefined;
    if(this.video){this.video.pause();this.video.srcObject=null;this.video.remove();this.video=undefined;}
    this.world?.mute();this.anchor.visible=false;this.lastTracked=false;
    delete document.documentElement.dataset.tracked;
  }
}
