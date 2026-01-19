import * as THREE from 'three';
import type { FaceName } from '../structure/structureModel.js';

export function getCanonicalFaceBasis(name: FaceName) {
  switch (name) {
    case 'Front':
      return {
        normal: new THREE.Vector3(0, 0, 1),
        basisU: new THREE.Vector3(1, 0, 0),
        basisV: new THREE.Vector3(0, 1, 0)
      };
    case 'Back':
      return {
        normal: new THREE.Vector3(0, 0, -1),
        basisU: new THREE.Vector3(-1, 0, 0),
        basisV: new THREE.Vector3(0, 1, 0)
      };
    case 'Top':
      return {
        normal: new THREE.Vector3(0, 1, 0),
        basisU: new THREE.Vector3(1, 0, 0),
        basisV: new THREE.Vector3(0, 0, -1)
      };
    case 'Bottom':
      return {
        normal: new THREE.Vector3(0, -1, 0),
        basisU: new THREE.Vector3(1, 0, 0),
        basisV: new THREE.Vector3(0, 0, 1)
      };
    case 'Right':
      return {
        normal: new THREE.Vector3(1, 0, 0),
        basisU: new THREE.Vector3(0, 0, -1),
        basisV: new THREE.Vector3(0, 1, 0)
      };
    case 'Left':
      return {
        normal: new THREE.Vector3(-1, 0, 0),
        basisU: new THREE.Vector3(0, 0, 1),
        basisV: new THREE.Vector3(0, 1, 0)
      };
  }
}
