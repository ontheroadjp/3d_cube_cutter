export function getDefaultIndexMap(): Record<string, { x: number; y: number; z: number }> {
  return {
    '0': { x: -1, y: -1, z: 1 },
    '1': { x: 1, y: -1, z: 1 },
    '2': { x: 1, y: -1, z: -1 },
    '3': { x: -1, y: -1, z: -1 },
    '4': { x: -1, y: 1, z: 1 },
    '5': { x: 1, y: 1, z: 1 },
    '6': { x: 1, y: 1, z: -1 },
    '7': { x: -1, y: 1, z: -1 },
  };
}
