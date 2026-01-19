import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Cutter } from '../../dist/js/Cutter.js';

describe('Cutter cut point markers', () => {
  it('creates markers for intersection refs only', () => {
    const scene = new THREE.Scene();
    const cutter = new Cutter(scene);

    cutter.updateCutPointMarkers([
      { id: 'V:0', type: 'snap', position: new THREE.Vector3(0, 0, 0) },
      { id: 'E:01@1/2', type: 'intersection', position: new THREE.Vector3(0.5, 0, 0) },
      { id: 'V:1', type: 'intersection', position: new THREE.Vector3(1, 0, 0) }
    ]);

    expect(cutter.vertexMarkers.length).toBe(2);
  });

  it('resolves marker positions via resolver when position is missing', () => {
    const scene = new THREE.Scene();
    const cutter = new Cutter(scene);
    cutter.lastResolver = {
      resolveSnapPoint: (id) => {
        if (id === 'E:01@1/2') return new THREE.Vector3(0.5, 0, 0);
        if (id === 'V:1') return new THREE.Vector3(1, 0, 0);
        return null;
      }
    };

    cutter.updateCutPointMarkers([
      { id: 'E:01@1/2', type: 'intersection' },
      { id: 'V:1', type: 'intersection' }
    ]);

    expect(cutter.vertexMarkers.length).toBe(2);
  });
});
