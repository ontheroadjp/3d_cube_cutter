import { PRESETS } from './presetData.js';

export class PresetManager {
    constructor(selectionManager, cube, cutter) {
        this.selectionManager = selectionManager;
        this.cube = cube;
        this.cutter = cutter;
        this.presets = PRESETS;
    }

    applyPreset(name) {
        const preset = this.presets.find(p => p.name === name);
        if (!preset) return;

        // リセット
        this.selectionManager.reset();
        this.cutter.resetInversion();
        this.cutter.reset();

        // 点の追加
        preset.points.forEach(ptDef => {
            const edgeName = ptDef.edge;
            const ratio = ptDef.ratio;
            
            // 辺名から辺インデックスと端点を探す
            // Cube.vertexLabels = ['A','B','C','D','E','F','G','H']
            // Edge indices in Cube.js:
            // 0:AB, 1:BC, 2:CD, 3:DA
            // 4:EF, 5:FG, 6:GH, 7:HE
            // 8:AE, 9:BF, 10:CG, 11:DH
            
            const vMap = {
                'A':0, 'B':1, 'C':2, 'D':3, 'E':4, 'F':5, 'G':6, 'H':7
            };
            
            const v1 = vMap[edgeName[0]];
            const v2 = vMap[edgeName[1]];
            
            // Cube.edges 配列から該当する辺を探す
            // Cube.edges は Line3 オブジェクトだが、元の頂点インデックスとの対応関係は
            // Cube.js 内の idx 配列で定義されている。
            // しかし Cube クラスはそれを外部公開していない（this.edges は Line3 の配列）。
            // 頂点座標から推定するか、Cubeクラスに helper メソッドを追加するのが良いが、
            // ここでは頂点座標を使って計算する。
            
            const p1 = this.cube.vertices[v1];
            const p2 = this.cube.vertices[v2];
            
            if (!p1 || !p2) {
                console.warn(`Edge ${edgeName} not found.`);
                return;
            }
            
            // 比率で点を計算 (p1からp2へ)
            const point = p1.clone().lerp(p2, ratio);
            
            this.selectionManager.addPoint(point);
        });

        // 3点以上あれば切断実行（main.jsのロジックと同じ）
        if (this.selectionManager.selected.length >= 3) {
            this.cutter.cut(this.cube, this.selectionManager.selected);
            // UIの状態（チェックボックス）は main.js が管理しているが、
            // Preset適用時に強制的に表示させるか、現在の状態に従うか。
            // Cutterは toggleSurface 等で制御されるので、main.js のイベントリスナーが
            // 適切に呼ばれるか、あるいはここで Cutter のメソッドを呼ぶ必要があるが、
            // Cutter.cut 内部では toggle 処理はしていない。
            // main.js では cut 後に toggle を呼んでいる。
            // PresetManager は main.js から呼ばれる想定なので、
            // main.js 側で「Preset適用後の処理」として toggle を呼んでもらうのが綺麗。
        }
    }
    
    getPresetNames() {
        return this.presets.map(p => p.name);
    }
}
