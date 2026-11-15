import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import asset from './asset.json';
export const SCENE_WIDTH_METERS = 0.16;
const events = [.37,.57,.76,.94,1.12,1.39,1.63,1.85,2.03,2.25,2.5,2.69,2.9,3.16,4.52,4.74,5,5.19,5.47,5.68,5.91,6.17,6.37,6.65,6.86,7.12,7.34,7.54];
let pending: Promise<JoyWorld> | undefined;
export function loadWorld() {
  return pending ??= new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(import.meta.env.BASE_URL + asset.model)
    .then(gltf => new JoyWorld(gltf.scene, gltf.animations)).catch(e => { pending = undefined; throw e; });
}
export class JoyWorld {
  readonly root = new THREE.Group();
  readonly mixer: THREE.AnimationMixer;
  readonly duration: number;
  scale = 1;
  readonly content = new THREE.Group();
  private readonly sourceFootprint: THREE.Box3;
  private readonly lamp: THREE.SpotLight;
  private time = 0;
  private pen?: CanvasRenderingContext2D;
  private screen?: THREE.CanvasTexture;
  private lastLine = -1;
  private audio?: AudioContext;
  private noise?: AudioBuffer;
  private voices = new Set<AudioBufferSourceNode>();
  sound = false;
  constructor(readonly model: THREE.Group, clips: THREE.AnimationClip[]) {
    const clip = clips.find(c => c.name === 'Coding Loop') ?? clips[0];
    if (!clip) throw new Error('The typing animation is missing.');
    this.duration = clip.duration;
    this.mixer = new THREE.AnimationMixer(model);
    this.mixer.clipAction(clip).play();
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model,true);
    // Measure the lowest static geometry: upper-body/skin bounds must not move
    // the base center or enlarge its footprint. The original scene has a plinth.
    const meshes: THREE.Mesh[]=[];
    const staticBounds=new THREE.Box3();
    model.traverse(o=>{if(o instanceof THREE.Mesh&&!(o instanceof THREE.SkinnedMesh)){meshes.push(o);staticBounds.union(new THREE.Box3().setFromObject(o,true));}});
    const bottom=staticBounds.isEmpty()?bounds.min.y:staticBounds.min.y;
    const epsilon=bounds.getSize(new THREE.Vector3()).y*.005;
    const footprint=new THREE.Box3(),point=new THREE.Vector3();
    for(const mesh of meshes){
      const positions=mesh.geometry.getAttribute('position');
      for(let i=0;i<positions.count;i++){
        point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);
        if(point.y<=bottom+epsilon)footprint.expandByPoint(point);
      }
    }
    this.sourceFootprint=footprint.isEmpty()?bounds.clone():footprint;
    // Build the screen, lights, and shadows in original model coordinates first.
    // Applying placement before measuring the monitor would scale its panel twice.
    const content = this.content;
    this.root.add(content); content.add(model);
    content.add(new THREE.HemisphereLight('#c1cbe4','#171a25',.34));
    const lamp = this.lamp = new THREE.SpotLight('#ffd49a', 7, 4, 1.02, .65, 2);
    lamp.position.set(0,1.205,.015); lamp.target.position.set(-.06,.30,.20);
    content.add(lamp,lamp.target);
    const rim = new THREE.DirectionalLight('#a6b8e1',.28);
    rim.position.set(-1,1.1,-1); content.add(rim);
    this.addContactShadows(content,bounds.min.y);
    let monitor: THREE.Mesh | undefined;
    model.traverse(o => { if (o instanceof THREE.Mesh && /MY.?SCREEN/i.test(o.name)) monitor = o; });
    if (!monitor) throw new Error('The CRT screen mesh is missing.');
    const box = new THREE.Box3().setFromObject(monitor), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 432;
    this.pen = canvas.getContext('2d')!;
    this.screen = new THREE.CanvasTexture(canvas); this.screen.colorSpace = THREE.SRGBColorSpace;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(size.x*.985,size.y*.985),new THREE.MeshBasicMaterial({map:this.screen,side:THREE.DoubleSide}));
    panel.position.set(c.x,c.y,box.min.z-.003); panel.rotation.y = Math.PI; content.add(panel);
    this.setFootprint(SCENE_WIDTH_METERS);
    this.paint();
  }
  setFootprint(width: number) {
    const size = this.sourceFootprint.getSize(new THREE.Vector3());
    const center = this.sourceFootprint.getCenter(new THREE.Vector3());
    // Uniformly fit the full base inside the marker, preserving artwork proportions.
    this.scale = width / Math.max(size.x,size.z);
    this.content.scale.setScalar(this.scale);
    this.content.position.set(-center.x*this.scale,-this.sourceFootprint.min.y*this.scale,-center.z*this.scale);
    this.lamp.intensity = 7*this.scale**2;
    this.lamp.distance = 4*this.scale;
    this.root.updateMatrixWorld(true);
  }
  getBaseBounds() {
    return {
      min: this.sourceFootprint.min.clone().multiplyScalar(this.scale).add(this.content.position).toArray(),
      max: this.sourceFootprint.max.clone().multiplyScalar(this.scale).add(this.content.position).toArray(),
    };
  }
  private addContactShadows(group: THREE.Group,y: number) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const pen = canvas.getContext('2d')!;
    const g = pen.createRadialGradient(64,64,7,64,64,64);
    g.addColorStop(0,'rgba(12,12,25,.65)');g.addColorStop(.6,'rgba(12,12,25,.3)');g.addColorStop(1,'rgba(12,12,25,0)');
    pen.fillStyle=g;pen.fillRect(0,0,128,128);
    const map = new THREE.CanvasTexture(canvas);
    for(const [x,z,w,h] of [[-.2,.43,1.72,1.1],[0,-.015,.6,.65]]) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false}));
      mesh.rotation.x = -Math.PI/2; mesh.position.set(x,y+.001,z); group.add(mesh);
    }
  }
  update(delta: number) {
    const previous = this.time;
    this.time = (this.time+delta)%this.duration;
    events.forEach((e,i) => { if(this.time>=previous ? e>previous&&e<=this.time : e>previous||e<=this.time) this.click(i); });
    this.mixer.update(delta); this.paint();
    document.documentElement.dataset.time = this.time.toFixed(3);
  }
  private paint() {
    const pen = this.pen;
    if(!pen || !this.screen) return;
    const line = events.filter(e=>e<=this.time).length, blink = Math.floor(this.time*2)%2;
    const state = line*2+blink; if(state===this.lastLine)return; this.lastLine=state;
    const lines = ['function buildScene() {','  const joy = new Character();','  joy.play("Coding Loop");','  keyboard.sync(joy.hands);','  scene.add(joy);','  return scene;','}'];
    pen.fillStyle='#10261d';pen.fillRect(0,0,768,432);pen.fillStyle='#193629';pen.fillRect(0,0,768,48);
    pen.font='20px monospace';pen.fillStyle='#b4e8a0';pen.fillText('JOY OS  /  CODE EDITOR',27,31);
    let y=92, remaining=line*5+16;
    for(const [i,row] of lines.entries()) {
      const visible=row.slice(0,Math.max(0,remaining));remaining-=row.length;if(!visible)break;
      pen.fillStyle=['#b9e89d','#92c783','#c9e8b2'][i%3];pen.fillText(visible,38,y);
      if(remaining<=0&&blink){pen.fillStyle='#fff';pen.fillRect(41+pen.measureText(visible).width,y-19,3,23);} y+=42;
    }
    pen.fillStyle='rgba(0,0,0,.10)';for(let row=0;row<432;row+=4)pen.fillRect(0,row,768,1);
    this.screen.needsUpdate=true;
  }
  async toggleSound() {
    if(this.sound){this.mute();return false;}
    if(!this.audio){
      this.audio=new AudioContext();this.noise=this.audio.createBuffer(1,this.audio.sampleRate*.075,this.audio.sampleRate);
      const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    }
    await this.audio.resume();this.sound=true;return true;
  }
  silence() { for(const voice of this.voices)try{voice.stop();}catch{/* already ended */}this.voices.clear(); }
  mute() { this.sound=false;this.silence(); }
  private click(i: number) {
    if(!this.sound||!this.audio||this.audio.state!=='running')return;
    const audio=this.audio,at=audio.currentTime,src=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();
    src.buffer=this.noise!;src.playbackRate.value=.82+(i%5)*.085;filter.type='bandpass';filter.frequency.value=i%7===0?920:1800+(i%4)*240;filter.Q.value=.75;
    gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.19,at+.002);gain.gain.exponentialRampToValueAtTime(.0001,at+.037);
    src.connect(filter).connect(gain).connect(audio.destination);this.voices.add(src);
    src.onended=()=>{this.voices.delete(src);src.disconnect();filter.disconnect();gain.disconnect();};src.start(at,0,.045);
  }
}
