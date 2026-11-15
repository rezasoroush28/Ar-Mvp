import jsartoolkit from '@ar-js-org/artoolkit5-js';
import { Matrix4, Quaternion, Vector3, Camera, Group } from 'three';
import { MARKER_WIDTH_METERS, MARKER_ID } from './marker-config';
export { MARKER_WIDTH_METERS, MARKER_ID } from './marker-config';
// The same coordinate conversion as AR.js ArMarkerControls: Y points off paper.
const axes = new Matrix4().makeRotationY(Math.PI).multiply(new Matrix4().makeRotationZ(Math.PI));
const markerAxes = new Matrix4().makeRotationX(Math.PI/2);
export class Tracker {
  private controller?: InstanceType<typeof jsartoolkit.ARController>;
  private lastSeen = -Infinity;
  private hasPose = false;
  private lastDetection = -Infinity;
  private targetPosition = new Vector3();
  private targetQuaternion = new Quaternion();
  private targetScale = new Vector3();
  private targetMatrix = new Matrix4();
  private point = new Vector3();
  private markerCorners: number[][] = [];
  private processingWidth = 640;
  private processingHeight = 480;
  private disposed = false;
  firstSeen = 0;
  constructor(readonly video: HTMLVideoElement,readonly camera: Camera,readonly anchor: Group) {}
  async init() {
    // Match the processing canvas to the source aspect, including portrait phones.
    const w = this.video.videoWidth, h = this.video.videoHeight;
    const width = Math.round(640*Math.min(1,w/h)), height = Math.round(width*h/w);
    this.processingWidth=width;this.processingHeight=height;
    const c = await jsartoolkit.ARController.initWithDimensions(width,height,import.meta.env.BASE_URL+'camera_para.dat',{orientation:'landscape'});
    if(this.disposed){c.dispose();return;}
    this.controller=c;
    // Emscripten decorates these constants at runtime; package types omit them.
    const constants=c.artoolkit as typeof c.artoolkit & {AR_MATRIX_CODE_DETECTION:number;AR_MATRIX_CODE_3x3:number};
    c.setPatternDetectionMode(constants.AR_MATRIX_CODE_DETECTION);
    c.setMatrixCodeType(constants.AR_MATRIX_CODE_3x3);
    c.setPattRatio(.5);c.setProjectionNearPlane(.005);c.setProjectionFarPlane(10);
    // This release's native binding takes an integer marker width. Use millimeters
    // for pose estimation, then convert ONLY translation back to Three.js meters.
    c.trackBarcodeMarkerId(MARKER_ID,MARKER_WIDTH_METERS*1000);
    this.camera.projectionMatrix.fromArray(c.getCameraMatrix());
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
    this.camera.updateMatrixWorld(true);
    c.addEventListener('getMarker',(event: {data:{type:number;marker:{idMatrix:number;vertex:number[][]};matrix:ArrayLike<number>}})=>{
      if(event.data.type!==jsartoolkit.ARToolkit.BARCODE_MARKER||event.data.marker.idMatrix!==MARKER_ID)return;
      const matrix=axes.clone().multiply(new Matrix4().fromArray(event.data.matrix)).multiply(markerAxes);
      matrix.elements[12]/=1000;matrix.elements[13]/=1000;matrix.elements[14]/=1000;
      if(!Number.isFinite(matrix.determinant())||Math.abs(matrix.determinant())<.5)return;
      matrix.decompose(this.targetPosition,this.targetQuaternion,this.targetScale);
      // Smooth subpixel noise only. Camera-space interpolation during real motion
      // makes a physical anchor trail behind its rectangle on the live video.
      this.anchor.updateMatrix();
      const previous=this.projectCorners(this.anchor.matrix),next=this.projectCorners(matrix);
      const movement=Math.max(...next.map((p,i)=>Math.hypot(p[0]-previous[i][0],p[1]-previous[i][1])));
      const alpha=this.hasPose&&movement<1.5?.5:1;
      this.anchor.position.lerp(this.targetPosition,alpha);this.anchor.quaternion.slerp(this.targetQuaternion,alpha);
      this.anchor.updateMatrixWorld(true);this.hasPose=true;
      this.targetMatrix.copy(matrix);
      this.markerCorners=event.data.marker.vertex.map(p=>[p[0],p[1]]);
      this.lastSeen=performance.now();
      this.firstSeen ||= this.lastSeen;
    });
  }
  update(now: number,delta: number) {
    if(this.controller && now-this.lastDetection>=1000/30 && this.video.readyState>=2){
      this.lastDetection=now;this.controller.process(this.video);
    }
    const visible=now-this.lastSeen<140;
    if(!visible)this.hasPose=false;
    this.anchor.visible=visible;
    return {visible,detected:now-this.lastSeen<70};
  }
  private projectCorners(matrix: Matrix4) {
    const half=MARKER_WIDTH_METERS/2;
    return [[-half,-half],[half,-half],[half,half],[-half,half]].map(([x,z])=>{
      this.point.set(x,0,z).applyMatrix4(matrix).applyMatrix4(this.camera.projectionMatrix);
      return [(this.point.x+1)*this.processingWidth/2,(1-this.point.y)*this.processingHeight/2];
    });
  }
  snapshot() {
    this.anchor.updateMatrix();
    return {detected:this.markerCorners.map(p=>[...p]),projected:this.projectCorners(this.anchor.matrix),targetProjected:this.projectCorners(this.targetMatrix),normal:new Vector3(0,1,0).applyQuaternion(this.anchor.quaternion).toArray(),processingWidth:this.processingWidth,processingHeight:this.processingHeight};
  }
  dispose(){this.disposed=true;this.controller?.dispose();this.controller=undefined;}
}
