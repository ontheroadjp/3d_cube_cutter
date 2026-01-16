import * as THREE from 'three';

export function createLabel(text, scale=0.5){
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'black';
  ctx.font = '64px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text,64,64);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale, scale, scale);
  return sprite;
}

export function createMarker(position, scene, color = 0xff0000, isOutline = false) {
  const material = new THREE.MeshBasicMaterial({ color: color, wireframe: isOutline });
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), material);
  m.position.copy(position);
  scene.add(m);
  return m;
}
