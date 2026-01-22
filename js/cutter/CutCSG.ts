import * as THREE from 'three';
import { SUBTRACTION, INTERSECTION, Brush, Evaluator } from 'three-bvh-csg';
import type { SolidSSOT } from '../model/objectModel.js';

export type CutCSGResult = {
  resultMesh: THREE.Mesh;
  removedMesh: THREE.Mesh;
};

const isSolidSSOT = (solid: any): solid is SolidSSOT => {
  return !!(solid && solid.meta && solid.vertices && typeof solid.getStructure !== 'function');
};

export class CutCSG {
  evaluator: Evaluator;

  constructor() {
    this.evaluator = new Evaluator();
    this.evaluator.attributes = ['position', 'normal'];
    this.evaluator.useGroups = true;
  }

  applyCut({
    cube,
    plane,
    planePoint,
    cutNegative,
    isTransparent,
    scene
  }: {
    cube: any;
    plane: THREE.Plane;
    planePoint: THREE.Vector3;
    cutNegative: boolean;
    isTransparent: boolean;
    scene: THREE.Scene;
  }): CutCSGResult | null {
    const normal = plane.normal.clone();
    if (cutNegative) normal.negate();

    const sizeBase = (() => {
      if (isSolidSSOT(cube)) {
        const { lx, ly, lz } = cube.meta.size;
        return Math.max(lx, ly, lz);
      }
      if (typeof cube.size === 'number') return cube.size;
      return 10;
    })();

    const size = sizeBase * 5;
    const geom = new THREE.BoxGeometry(size, size, size);
    const cutBrush = new (Brush as any)(geom) as any;

    const centerOffset = normal.clone().multiplyScalar(size / 2);
    const brushPos = planePoint.clone().add(centerOffset);
    cutBrush.position.copy(brushPos);

    const defaultUp = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultUp, normal);
    cutBrush.setRotationFromQuaternion(quaternion);
    cutBrush.updateMatrixWorld();

    let cubeBrush: any;
    let cubeMat: THREE.Material;

    if (isSolidSSOT(cube)) {
      const { lx, ly, lz } = cube.meta.size;
      const geometry = new THREE.BoxGeometry(lx, ly, lz);
      cubeBrush = new (Brush as any)(geometry) as any;
      cubeBrush.updateMatrixWorld();

      cubeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      cubeMat.side = THREE.DoubleSide;
      cubeMat.transparent = isTransparent;
      cubeMat.opacity = isTransparent ? 0.4 : 1.0;
      cubeMat.depthWrite = !isTransparent;
    } else {
      cubeBrush = new (Brush as any)(cube.cubeMesh.geometry.clone()) as any;
      cubeBrush.position.copy(cube.cubeMesh.position);
      cubeBrush.rotation.copy(cube.cubeMesh.rotation);
      cubeBrush.scale.copy(cube.cubeMesh.scale);
      cubeBrush.updateMatrixWorld();

      cubeMat = cube.cubeMesh.material.clone();
      cubeMat.side = THREE.DoubleSide;
      cubeMat.transparent = isTransparent;
      cubeMat.opacity = isTransparent ? 0.4 : 1.0;
      cubeMat.depthWrite = !isTransparent;
    }

    const cutMat = new THREE.MeshBasicMaterial({
      color: 0xffcccc,
      side: THREE.DoubleSide,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      name: 'cutFace'
    });

    cubeBrush.material = cubeMat;
    cutBrush.material = cutMat;

    const resultMesh = this.evaluator.evaluate(cubeBrush, cutBrush, SUBTRACTION) as THREE.Mesh;
    resultMesh.material = [cubeMat, cutMat];
    scene.add(resultMesh);

    const removedMesh = this.evaluator.evaluate(cubeBrush, cutBrush, INTERSECTION) as THREE.Mesh;
    removedMesh.material = [cubeMat, cutMat];
    scene.add(removedMesh);

    return { resultMesh, removedMesh };
  }
}
