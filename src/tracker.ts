import jsartoolkit from '@ar-js-org/artoolkit5-js';
import { Matrix4, Quaternion, Vector3, Camera, Group } from 'three';
export const MARKER_WIDTH_METERS = .08;
export const MARKER_ID = 5;
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
  private disposed = false;
  firstSeen = 0;
  constructor(readonly video: HTMLVideoElement,readonly camera: Camera,readonly anchor: Group) {}
  async init() {
    // Match the processing canvas to the source aspect, including portrait phones.
    const w = this.video.videoWidth, h = this.video.videoHeight;
    const width = Math.round(640*Math.min(1,w/h)), height = Math.round(width*h/w);
    const c = await jsartoolkit.ARController.initWithDimensions(width,height,import.meta.env.BASE_URL+'camera_para.dat',{});
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
    c.addEventListener('getMarker',(event: {data:{type:number;marker:{idMatrix:number};matrix:ArrayLike<number>}})=>{
      if(event.data.type!==jsartoolkit.ARToolkit.BARCODE_MARKER||event.data.marker.idMatrix!==MARKER_ID)return;
      const matrix=axes.clone().multiply(new Matrix4().fromArray(event.data.matrix)).multiply(markerAxes);
      matrix.elements[12]/=1000;matrix.elements[13]/=1000;matrix.elements[14]/=1000;
      if(!Number.isFinite(matrix.determinant())||Math.abs(matrix.determinant())<.5)return;
      matrix.decompose(this.targetPosition,this.targetQuaternion,this.targetScale);
      this.lastSeen=performance.now();
      this.firstSeen ||= this.lastSeen;
    });
  }
  update(now: number,delta: number) {
    if(this.controller && now-this.lastDetection>=1000/30 && this.video.readyState>=2){
      this.lastDetection=now;this.controller.process(this.video);
    }
    const visible=now-this.lastSeen<140;
    if(visible){
      const alpha=this.hasPose?1-Math.exp(-delta/0.035):1;
      this.anchor.position.lerp(this.targetPosition,alpha);this.anchor.quaternion.slerp(this.targetQuaternion,alpha);
      this.hasPose=true;
    }else{this.hasPose=false;}
    this.anchor.visible=visible;
    return {visible,detected:now-this.lastSeen<70};
  }
  dispose(){this.disposed=true;this.controller?.dispose();this.controller=undefined;}
}
