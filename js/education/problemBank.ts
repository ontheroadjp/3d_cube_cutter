import type { LearningProblem } from '../types.js';

const DEFAULT_PROBLEMS: LearningProblem[] = [
  {
    id: 'basic-3-vertex',
    title: '3頂点切断の基本',
    prompt: '頂点A・C・Fを通る平面で切ったときの切断面の形を考えよう。',
    tags: ['頂点', '三角形'],
    difficulty: 'easy',
    learningSteps: [
      {
        instruction: '基本方針はこうだよね。面の上で線を引いて考えるのがコツだよ。',
        reason: '空間で考えると難しいから、まず1つの面で考えるんだ。',
        action: { type: 'message' }
      },
      {
        instruction: 'この問題は「頂点Aを通る」って書いてあるね。頂点Aに印をつけよう。',
        reason: '問題文にある条件は最初に書き込むよ。',
        action: { type: 'mark', snapId: 'V:0' }
      },
      {
        instruction: '次は頂点Cも通るね。頂点Cに印をつけよう。',
        reason: '切断面はAとCの両方を通るよ。',
        action: { type: 'mark', snapId: 'V:2' }
      },
      {
        instruction: '最後に頂点Fも通るね。頂点Fに印をつけよう。',
        reason: '3点が決まると切断面が決まるよ。',
        action: { type: 'mark', snapId: 'V:5' }
      }
    ],
    snapIds: ['V:0', 'V:2', 'V:5']
  },
  {
    id: 'edge-midpoints',
    title: '中点切断',
    prompt: '3つの辺の中点を通る平面で切断したときの切断面の形を予想しよう。',
    tags: ['中点', '六角形'],
    difficulty: 'medium',
    learningSteps: [
      {
        instruction: '基本方針はこうだよね。面の上で線を引いて考えるのがコツだよ。',
        reason: '空間で考えると難しいから、まず1つの面で考えるんだ。',
        action: { type: 'message' }
      },
      {
        instruction: 'まずは辺ABの中点に印をつけよう。',
        reason: '問題文にある「中点」は最初に書き込むよ。',
        action: { type: 'mark', snapId: 'E:01@1/2' }
      },
      {
        instruction: '次は辺GHの中点に印をつけよう。',
        reason: '別の面にも同じ条件があるよ。',
        action: { type: 'mark', snapId: 'E:67@1/2' }
      },
      {
        instruction: '最後に辺DHの中点に印をつけよう。',
        reason: '3つの中点がそろったら切断面が決まるよ。',
        action: { type: 'mark', snapId: 'E:37@1/2' }
      }
    ],
    snapIds: ['E:01@1/2', 'E:67@1/2', 'E:37@1/2']
  },
  {
    id: 'ratio-edge',
    title: '辺の比率切断',
    prompt: '辺ABを3:7に分ける点を通る切断面の形を考えよう。',
    tags: ['比', '四角形'],
    difficulty: 'medium',
    learningSteps: [
      {
        instruction: '基本方針はこうだよね。面の上で線を引いて考えるのがコツだよ。',
        reason: '空間で考えると難しいから、まず1つの面で考えるんだ。',
        action: { type: 'message' }
      },
      {
        instruction: 'まずは辺ABを3:7に分ける点に印をつけよう。',
        reason: '比が出てきたら、その位置に印をつけるよ。',
        action: { type: 'mark', snapId: 'E:01@3/10' }
      },
      {
        instruction: '次は辺BCを3:7に分ける点に印をつけよう。',
        reason: '同じ比が別の辺にも出ているね。',
        action: { type: 'mark', snapId: 'E:12@3/10' }
      },
      {
        instruction: '最後に辺BFを3:7に分ける点に印をつけよう。',
        reason: '3つの点がそろったら切断面が決まるよ。',
        action: { type: 'mark', snapId: 'E:15@3/10' }
      }
    ],
    snapIds: ['E:01@3/10', 'E:12@3/10', 'E:15@3/10']
  },
  {
    id: 'trapezoid-edge',
    title: '台形切断',
    prompt: '底面の対角線BDと辺EH上の点を通る切断面の形を考えよう。',
    tags: ['台形', '四角形'],
    difficulty: 'medium',
    learningSteps: [
      {
        instruction: '基本方針はこうだよね。面の上で線を引いて考えるのがコツだよ。',
        reason: '空間で考えると難しいから、まず1つの面で考えるんだ。',
        action: { type: 'message' }
      },
      {
        instruction: 'まずは頂点Bに印をつけよう。',
        reason: '対角線BDを通るので、Bが決まるよ。',
        action: { type: 'mark', snapId: 'V:1' }
      },
      {
        instruction: '次に頂点Dに印をつけよう。',
        reason: '対角線BDのもう一方の点だよ。',
        action: { type: 'mark', snapId: 'V:3' }
      },
      {
        instruction: '最後に辺EH上の点に印をつけよう。',
        reason: '問題文にある点は必ず書き込むよ。',
        action: { type: 'mark', snapId: 'E:47@3/10' }
      }
    ],
    snapIds: ['V:1', 'V:3', 'E:47@3/10']
  },
  {
    id: 'vertical-rectangle',
    title: '垂直な長方形',
    prompt: 'y軸に垂直な平面で水平に切るときの切断面を確認しよう。',
    tags: ['長方形', '垂直'],
    difficulty: 'easy',
    learningSteps: [
      {
        instruction: '基本方針はこうだよね。面の上で線を引いて考えるのがコツだよ。',
        reason: '空間で考えると難しいから、まず1つの面で考えるんだ。',
        action: { type: 'message' }
      },
      {
        instruction: 'まずは辺AEを7:3に分ける点に印をつけよう。',
        reason: '比が書かれている場所に印をつけるよ。',
        action: { type: 'mark', snapId: 'E:04@7/10' }
      },
      {
        instruction: '次は辺BFを7:3に分ける点に印をつけよう。',
        reason: '同じ高さの点になるよ。',
        action: { type: 'mark', snapId: 'E:15@7/10' }
      },
      {
        instruction: '最後に辺CGを7:3に分ける点に印をつけよう。',
        reason: '3つの点で切断面が決まるよ。',
        action: { type: 'mark', snapId: 'E:26@7/10' }
      }
    ],
    snapIds: ['E:04@7/10', 'E:15@7/10', 'E:26@7/10']
  },
  {
    id: 'diagonal-rectangle',
    title: '対角線を含む切断',
    prompt: '対角線AGを含む平面で切るときの切断面の形を考えよう。',
    tags: ['対角線', '四角形'],
    difficulty: 'medium',
    givenSnapIds: ['V:0', 'V:6'],
    highlightSegments: [{ startId: 'V:0', endId: 'V:6', kind: 'diagonal' }],
    learningSteps: [
      {
        instruction: '基本方針はこうだよね。面の上で線を引いて考えるのがコツだよ。',
        reason: '空間で考えると難しいから、まず1つの面で考えるんだ。',
        action: { type: 'message' }
      },
      {
        instruction: 'この問題は「頂点Aを通る」と書いてあるね。頂点Aに印をつけよう。',
        reason: '問題文に書いてある条件は、最初に必ず書き込むよ。',
        action: { type: 'mark', snapId: 'V:0' }
      },
      {
        instruction: '「頂点Gも通る」と分かるね。頂点Gにも印をつけよう。',
        reason: '切断面はAとGの両方を通るからだよ。',
        action: { type: 'mark', snapId: 'V:6' }
      },
      {
        instruction: '対角線AGを引こう。',
        reason: '対角線は面の上の線で、切断面に必ず含まれるよ。',
        action: { type: 'hintSegment', startId: 'V:0', endId: 'V:6', kind: 'diagonal' }
      },
      {
        instruction: '今は点が2つだけ。これだけだと切断面は決まらないよ。',
        reason: '面を決めるには、同じ面の上にもう1点が必要なんだ。',
        action: { type: 'message' }
      },
      {
        instruction: '次に、切断面が通る別の点を探そう。今回は頂点Eに印をつけるよ。',
        reason: 'AとGを通る面に、もう1点を足して面を確定させるためだよ。',
        action: { type: 'mark', snapId: 'V:4' }
      }
    ],
    snapIds: ['V:0', 'V:6', 'V:4']
  },
  {
    id: 'square-plane',
    title: '正方形切断',
    prompt: '右側面に平行な平面で切るときの切断面を確認しよう。',
    tags: ['正方形', '平行'],
    difficulty: 'easy',
    highlightPlane: 'right',
    learningSteps: [
      {
        instruction: '基本方針はこうだよね。面の上で線を引いて考えるのがコツだよ。',
        reason: '空間で考えると難しいから、まず1つの面で考えるんだ。',
        action: { type: 'message' }
      },
      {
        instruction: 'まずは辺ADの1/4の点に印をつけよう。',
        reason: '平行な切断面は、同じ位置の点を通るよ。',
        action: { type: 'mark', snapId: 'E:03@1/4' }
      },
      {
        instruction: '次は辺BCの1/4の点に印をつけよう。',
        reason: '同じ高さの点がそろうよ。',
        action: { type: 'mark', snapId: 'E:12@1/4' }
      },
      {
        instruction: '最後に辺FGの1/4の点に印をつけよう。',
        reason: '3つの点で切断面が決まるよ。',
        action: { type: 'mark', snapId: 'E:56@1/4' }
      }
    ],
    snapIds: ['E:03@1/4', 'E:12@1/4', 'E:56@1/4']
  },
  {
    id: 'pentagon-cut',
    title: '五角形切断',
    prompt: '5つの辺を通る切断面の形を予想しよう。',
    tags: ['五角形', '多角形'],
    difficulty: 'hard',
    learningSteps: [
      {
        instruction: '基本方針はこうだよね。面の上で線を引いて考えるのがコツだよ。',
        reason: '空間で考えると難しいから、まず1つの面で考えるんだ。',
        action: { type: 'message' }
      },
      {
        instruction: 'まずは辺AEを3:7に分ける点に印をつけよう。',
        reason: '比が書かれている場所は必ず書き込むよ。',
        action: { type: 'mark', snapId: 'E:04@3/10' }
      },
      {
        instruction: '次は辺ABの中点に印をつけよう。',
        reason: '中点も切断面を決める大事な点だよ。',
        action: { type: 'mark', snapId: 'E:01@1/2' }
      },
      {
        instruction: '最後に辺BCの中点に印をつけよう。',
        reason: 'これで切断面を決める点がそろうよ。',
        action: { type: 'mark', snapId: 'E:12@1/2' }
      }
    ],
    snapIds: ['E:04@3/10', 'E:01@1/2', 'E:12@1/2']
  },
  {
    id: 'diamond-cut',
    title: 'ひし形切断',
    prompt: '辺AE・CGの中点と頂点Bを通る切断面の形を考えよう。',
    tags: ['ひし形', '中点'],
    difficulty: 'medium',
    learningSteps: [
      {
        instruction: '基本方針はこうだよね。面の上で線を引いて考えるのがコツだよ。',
        reason: '空間で考えると難しいから、まず1つの面で考えるんだ。',
        action: { type: 'message' }
      },
      {
        instruction: 'まずは辺AEの中点に印をつけよう。',
        reason: '問題文にある中点は必ず書き込むよ。',
        action: { type: 'mark', snapId: 'E:04@1/2' }
      },
      {
        instruction: '次は辺CGの中点に印をつけよう。',
        reason: '別の面の中点も切断面を決めるよ。',
        action: { type: 'mark', snapId: 'E:26@1/2' }
      },
      {
        instruction: '最後に頂点Bに印をつけよう。',
        reason: '3つの点がそろったら切断面が決まるよ。',
        action: { type: 'mark', snapId: 'V:1' }
      }
    ],
    snapIds: ['E:04@1/2', 'E:26@1/2', 'V:1']
  },
  {
    id: 'hexagon-cut',
    title: '正六角形切断',
    prompt: '立方体の中心を通り、6つの中点を結ぶ切断面を考えよう。',
    tags: ['六角形', '中点'],
    difficulty: 'hard',
    learningSteps: [
      {
        instruction: '基本方針はこうだよね。面の上で線を引いて考えるのがコツだよ。',
        reason: '空間で考えると難しいから、まず1つの面で考えるんだ。',
        action: { type: 'message' }
      },
      {
        instruction: 'まずは辺ABの中点に印をつけよう。',
        reason: '中点がたくさん出てくる問題だよ。',
        action: { type: 'mark', snapId: 'E:01@1/2' }
      },
      {
        instruction: '次は辺GHの中点に印をつけよう。',
        reason: '反対側の面にも同じ条件があるよ。',
        action: { type: 'mark', snapId: 'E:67@1/2' }
      },
      {
        instruction: '最後に辺DHの中点に印をつけよう。',
        reason: 'これで切断面を決める点がそろうよ。',
        action: { type: 'mark', snapId: 'E:37@1/2' }
      }
    ],
    snapIds: ['E:01@1/2', 'E:67@1/2', 'E:37@1/2']
  }
];

export const getDefaultProblems = (): LearningProblem[] =>
  DEFAULT_PROBLEMS.map((problem) => ({
    ...problem,
    tags: problem.tags ? [...problem.tags] : undefined,
    snapIds: problem.snapIds ? [...problem.snapIds] : undefined
  }));
