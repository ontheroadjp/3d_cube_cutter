import type { Preset } from '../types.js';

export const PRESETS: Preset[] = [
    {
        name: "正三角形 (角切り)",
        category: "triangle",
        description: "頂点Bに集まる3つの辺の同じ比率の点を結ぶ",
        snapIds: ["E:0-1@3/10", "E:1-2@3/10", "E:1-5@3/10"],
    },
    {
        name: "台形",
        category: "quad",
        description: "底面の対角線BDと、辺EH上の点を結ぶ",
        snapIds: ["V:1", "V:3", "E:4-7@3/10"],
    },
    {
        name: "長方形（垂直）",
        category: "quad",
        description: "y軸に垂直な平面で水平に切る",
        snapIds: ["E:0-4@7/10", "E:1-5@7/10", "E:2-6@7/10"],
    },
    {
        name: "長方形",
        category: "quad",
        description: "対角線AGを含む平面で切る",
        snapIds: ["V:0", "V:6", "V:4"],
    },
    {
        name: "正方形",
        category: "quad",
        description: "y-z平面に平行な平面で切る",
        snapIds: ["E:0-3@1/4", "E:1-2@1/4", "E:5-6@1/4"],
    },
    {
        name: "五角形",
        category: "poly",
        description: "5つの辺を通る切断",
        snapIds: ["E:0-4@3/10", "E:0-1@1/2", "E:1-2@1/2"],
    },
    {
        name: "ひし形",
        category: "quad",
        description: "辺AE,CGの中点と頂点Bを通る",
        snapIds: ["E:0-4@1/2", "E:2-6@1/2", "V:1"],
    },
    {
        name: "正三角形",
        category: "triangle",
        description: "頂点A, C, F を結ぶ正三角形",
        snapIds: ["V:0", "V:2", "V:5"],
    },
    {
        name: "正六角形",
        category: "poly",
        description: "立方体の中心を通り、6つの中点を結ぶ",
        snapIds: ["E:0-1@1/2", "E:6-7@1/2", "E:3-7@1/2"],
    }
];
