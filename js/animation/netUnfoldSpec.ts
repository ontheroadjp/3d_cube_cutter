import type { NetPlan } from '../model/objectModel.js';
import type { AnimationSpec, AnimationStep } from './AnimationSpec.js';

export type NetUnfoldSpecOptions = {
  id?: string;
  version?: number;
  startAtSec: number;
  faceDurationSec: number;
  staggerSec: number;
  cameraDurationSec: number;
  cameraPosition: { x: number; y: number; z: number };
  cameraTarget: { x: number; y: number; z: number };
};

export function buildNetUnfoldSpec(plan: NetPlan, options: NetUnfoldSpecOptions): AnimationSpec {
  const timeline: AnimationStep[] = [
    {
      id: 'net-visible',
      at: 0,
      duration: 0,
      action: 'setVisibility',
      targets: { type: 'netGroup' },
      params: { visible: true },
    },
    {
      id: 'net-camera',
      at: 0,
      duration: options.cameraDurationSec,
      ease: 'easeOutCubic',
      action: 'moveCamera',
      targets: { type: 'camera' },
      params: {
        position: options.cameraPosition,
        lookAt: options.cameraTarget,
      },
    },
  ];

  const hingesByChild = new Map<string, string>();
  plan.hinges.forEach((hinge) => {
    hingesByChild.set(hinge.childFaceId, hinge.hingeEdgeId);
  });

  let index = 0;
  plan.faceOrder.forEach((faceId) => {
    if (faceId === plan.rootFaceId) return;
    const hingeEdgeId = hingesByChild.get(faceId);
    if (!hingeEdgeId) return;
    timeline.push({
      id: `face-${faceId}`,
      at: options.startAtSec + index * options.staggerSec,
      duration: options.faceDurationSec,
      ease: 'easeOutCubic',
      action: 'rotateFace',
      targets: { type: 'netFaces', ids: [faceId] },
      params: {
        faceId,
        hingeEdgeId,
        angleRad: Math.PI / 2,
      },
    });
    index += 1;
  });

  return {
    id: options.id ?? 'net-unfold',
    version: options.version ?? 1,
    timeline,
  };
}
