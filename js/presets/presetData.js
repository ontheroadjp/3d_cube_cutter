export const PRESETS = [
    {
        name: "正三角形 (角切り)",
        description: "頂点Aに集まる3つの辺の中点を結ぶ",
        points: [
            { type: 'edge', name: 'AD', ratio: 0.5 },
            { type: 'edge', name: 'AE', ratio: 0.5 },
            { type: 'edge', name: 'AB', ratio: 0.5 }
        ]
    },
    {
        name: "台形",
        description: "台形の切り口",
        points: [
            { type: 'edge', name: 'AB', ratio: 0.4 },
            { type: 'edge', name: 'AE', ratio: 0.4 },
            { type: 'vertex', name: 'C' }
        ]
    },
    {
        name: "長方形（垂直）",
        description: "直方体を水平に（y軸に垂直に）切る",
        points: [
            { type: 'edge', name: 'AE', ratio: 0.5 },
            { type: 'edge', name: 'BF', ratio: 0.5 },
            { type: 'edge', name: 'CG', ratio: 0.5 },
            { type: 'edge', name: 'DH', ratio: 0.5 }
        ]
    },
    {
        name: "長方形",
        description: "4つの頂点を通る対角線的な長方形",
        points: [
            { type: 'vertex', name: 'A' },
            { type: 'vertex', name: 'C' },
            { type: 'vertex', name: 'G' },
            { type: 'vertex', name: 'E' }
        ]
    },
    {
        name: "長方形（その他）",
        description: "直方体を斜めに切る長方形",
        points: [
            { type: 'edge', name: 'AE', ratio: 0.5 },
            { type: 'edge', name: 'BF', ratio: 0.5 },
            { type: 'edge', name: 'FG', ratio: 0.5 },
            { type: 'edge', name: 'EH', ratio: 0.5 }
        ]
    },
    {
        name: "五角形",
        description: "5つの辺を通る切断",
        points: [
            { type: 'edge', name: 'AE', ratio: 0.3 },
            { type: 'edge', name: 'AB', ratio: 0.6 },
            { type: 'edge', name: 'BC', ratio: 0.4 },
            { type: 'edge', name: 'CG', ratio: 0.7 },
            { type: 'edge', name: 'DH', ratio: 0.9 }
        ]
    },
    {
        name: "正六角形",
        description: "立方体の中心を通り、6つの中点を結ぶ",
        points: [
            { type: 'edge', name: 'AE', ratio: 0.5 },
            { type: 'edge', name: 'EF', ratio: 0.5 },
            { type: 'edge', name: 'FG', ratio: 0.5 },
            { type: 'edge', name: 'GC', ratio: 0.5 },
            { type: 'edge', name: 'CD', ratio: 0.5 },
            { type: 'edge', name: 'DA', ratio: 0.5 }
        ]
    }
];
