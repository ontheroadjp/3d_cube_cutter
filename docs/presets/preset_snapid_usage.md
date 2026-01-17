# SnapPointID プリセット適用例

## 1. 概要

本ドキュメントでは、Cutter モジュールの新しい構造主体アーキテクチャに基づき、
SnapPointID を利用したプリセット適用の手順と実装例を示します。
SnapPointID は頂点、辺、面などの構造情報を含む一意な識別子です。
プリセットは、この SnapPointID 配列として定義され、SelectionManager や Cutter
に渡されます。

---

## 2. プリセットデータ定義例

    // js/presets/presetData.ts
    export interface Preset {
        name: string;
        description: string;
        snapPoints: string[]; // SnapPointID 配列
    }

    export const PRESETS: Preset[] = [
        {
            name: "三角切断_頂点選択",
            description: "立方体の3頂点を結ぶ典型的な三角切断パターン",
            snapPoints: ["V:0", "V:1", "V:2"]
        },
        {
            name: "辺中点切断",
            description: "辺の中点を使った切断パターン",
            snapPoints: ["E:01@1/2", "E:12@1/2", "E:23@1/2"]
        },
        {
            name: "混合切断",
            description: "頂点と辺中点の混合切断パターン",
            snapPoints: ["V:4", "E:56@1/2", "V:7"]
        }
    ];

---

## 3. PresetManager による適用例

    // js/presets/PresetManager.ts
    import { PRESETS, Preset } from './presetData';
    import { SelectionManager } from '../SelectionManager';
    import { Cube } from '../Cube';

    export class PresetManager {
        private selectionManager: SelectionManager;

        constructor(selectionManager: SelectionManager) {
            this.selectionManager = selectionManager;
        }

        applyPreset(cube: Cube, presetName: string) {
            const preset = PRESETS.find(p => p.name === presetName);
            if (!preset) {
                console.warn(`プリセット '${presetName}' が見つかりません`);
                return;
            }

            // SnapPointID を座標に変換
            const snapPoints = preset.snapPoints.map(id => cube.getSnapPointPosition(id));

            // SelectionManager に渡す
            this.selectionManager.clearSelection();
            snapPoints.forEach(p => {
                this.selectionManager.addPoint(p);
            });

            console.log(`プリセット '${presetName}' を適用しました:`, preset.snapPoints);
        }
    }

---

## 4. 使用手順（教育ツール）

1. **プリセット選択**
   - UI 上でプリセットを選択（例: 「三角切断_頂点選択」）
2. **SelectionManager に適用**
   - PresetManager.applyPreset() を呼び出し
   - SnapPointID → THREE.Vector3 変換を自動で行う
3. **Cutter で切断**
   - Cutter.cutCube(cube, snapPointIDs) を呼ぶ
   - SnapPointID 配列を引数に渡す
4. **教育表示**
   - マーカー色分け（緑: 頂点, 青: 辺, 黄: 交点）
   - 解説テキストの表示（選択点の意味・切断面の形状）

---

## 5. 重要ポイント

- SnapPointID を基準にすることで、**座標依存から構造依存に移行**
- 座標誤差による不正確な切断を回避可能
- プリセットは構造情報を直接参照できるため、教育解説や展開図表示と連動可能
- 将来的に「頻出切断パターン」「重要な辺ハイライト」などの教育機能を容易に統合可能

---

## 6. 例: 頂点・辺ハイライト

    // CutterMarkers.ts などでの使用例
    snapPoints.forEach(id => {
        const pos = cube.getSnapPointPosition(id);
        let color = 0xffff00; // デフォルト: 黄

        if (id.startsWith("V:")) color = 0x00ff00; // 頂点: 緑
        else if (id.startsWith("E:")) color = 0x0000ff; // 辺: 青

        createVertexMarker(pos, color);
    });

---

## 7. まとめ

- プリセットは SnapPointID 配列で定義する
- SelectionManager に SnapPointID → 座標変換を通して渡す
- Cutter は SnapPointID 配列を受けて切断処理を行う
- マーカー・解説・展開図など教育機能との連動が容易になる

---
