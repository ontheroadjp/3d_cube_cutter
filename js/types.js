/**
 * @typedef {string} SnapPointID
 */

/**
 * @typedef {{ numerator: number, denominator: number }} Ratio
 */

/**
 * @typedef {{ id: SnapPointID, type: 'snap' | 'intersection', edgeId?: string, ratio?: Ratio, faceIds?: string[], position?: unknown }} IntersectionPoint
 */

/**
 * @typedef {{ startId: SnapPointID, endId: SnapPointID, faceIds?: string[] }} CutSegmentMeta
 */

/**
 * @typedef {{
 *   outline: SnapPointID[],
 *   intersections: Array<{
 *     id: SnapPointID,
 *     type: 'snap' | 'intersection',
 *     edgeId?: string,
 *     ratio?: Ratio,
 *     faceIds?: string[]
 *   }>,
 *   cutSegments: CutSegmentMeta[]
 * }} CutResultMeta
 */

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   description?: string,
 *   category?: string,
 *   cube: { size: { lx: number, ly: number, lz: number }, labelMap?: Record<string, string> },
 *   cut: { snapPoints: SnapPointID[], inverted: boolean, result?: CutResultMeta },
 *   display: {
 *     showVertexLabels: boolean,
 *     showFaceLabels: boolean,
 *     edgeLabelMode: 'visible' | 'popup' | 'hidden',
 *     showCutSurface: boolean,
 *     showPyramid: boolean,
 *     cubeTransparent: boolean
 *   },
 *   createdAt: string,
 *   updatedAt: string
 * }} UserPresetState
 */

export {};
