export type UserPresetForm = {
  name: string;
  category: string;
  description: string;
};

export type SnapPointID = string;

export type Ratio = {
  numerator: number;
  denominator: number;
};

export type CubeSize = {
  lx: number;
  ly: number;
  lz: number;
};

export type DisplayState = {
  showVertexLabels: boolean;
  showFaceLabels: boolean;
  edgeLabelMode: 'visible' | 'popup' | 'hidden';
  showCutSurface: boolean;
  showPyramid: boolean;
  cubeTransparent: boolean;
  showCutPoints: boolean;
  colorizeCutLines: boolean;
  showNormalHelper: boolean;
  faceColorTheme?: 'blue' | 'red' | 'green' | 'colorful';
};

export type IntersectionPoint = {
  id: SnapPointID;
  type: 'snap' | 'intersection';
  edgeId?: string;
  ratio?: Ratio;
  faceIds?: string[];
};

export type CutSegmentMeta = {
  startId: SnapPointID;
  endId: SnapPointID;
  faceIds?: string[];
};

export type CutResultMeta = {
  outline: SnapPointID[];
  intersections: Array<{
    id: SnapPointID;
    type: 'snap' | 'intersection';
    edgeId?: string;
    ratio?: Ratio;
    faceIds?: string[];
  }>;
  cutSegments: CutSegmentMeta[];
};

export type CutResult = {
  outline: { points: IntersectionPoint[] };
  intersections: IntersectionPoint[];
  cutSegments: Array<{
    startId: SnapPointID;
    endId: SnapPointID;
    faceIds?: string[];
  }>;
};

export type CutFacePolygon = {
  faceId: string;
  type: 'cut' | 'original';
  vertexIds?: SnapPointID[];
  sourceFaceId?: string;
};

export type UserPresetState = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  cube: { size: CubeSize | null; labelMap?: Record<string, string> };
  cut: { snapPoints: SnapPointID[]; inverted: boolean; result?: CutResultMeta };
  display: DisplayState | null;
  createdAt: string;
  updatedAt: string;
};

export type Preset = {
  name: string;
  category: 'triangle' | 'quad' | 'poly';
  description?: string;
  snapIds?: SnapPointID[];
};

export type LearningProblem = {
  id: string;
  title: string;
  prompt: string;
  tags?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  givenSnapIds?: SnapPointID[];
  snapIds?: SnapPointID[];
  highlightSegments?: Array<{ startId: SnapPointID; endId: SnapPointID; kind?: 'edge' | 'diagonal' }>;
  explanationSteps?: string[];
  learningSteps?: Array<{
    instruction: string;
    reason?: string;
    action?: {
      type: 'mark' | 'hintSegment' | 'drawSegment' | 'cut' | 'message';
      snapId?: SnapPointID;
      startId?: SnapPointID;
      endId?: SnapPointID;
      kind?: 'edge' | 'diagonal';
      index?: number;
    };
  }>;
  segmentInstructions?: string[];
  segmentReasons?: string[];
  notes?: string;
  highlightPlane?: 'front' | 'back' | 'top' | 'bottom' | 'right' | 'left';
};
