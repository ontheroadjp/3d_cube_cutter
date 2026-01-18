import * as THREE from 'three';

export function createLabel(text: string, scale=0.5, color = 'black'): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to acquire 2d context for label rendering.');
  }
  ctx.fillStyle = color;
  ctx.font = '64px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text,64,64);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale, scale, scale);
  return sprite;
}

export function createMarker(
  position: THREE.Vector3,
  scene: THREE.Scene,
  color = 0xff0000,
  isOutline = false,
  parent?: THREE.Object3D
): THREE.Mesh {
  const material = new THREE.MeshBasicMaterial({ color: color, wireframe: isOutline });
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), material);
  m.position.copy(position);
  if (parent) {
    parent.add(m);
  } else {
    scene.add(m);
  }
  return m;
}
