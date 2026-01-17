# docs/presets/preset_snapid_notes.md

Status: Active

# PresetManager / presetData.js 実装上の注意点 (SnapPointID版)

## 1. 目的
SnapPointID を使ったプリセット切断パターンを `PresetManager` / `presetData.js` で扱う際の注意点とベストプラクティスを整理します。
これにより、構造主導アーキテクチャに沿った安定したプリセット管理が可能になります。

---

## 2. SnapPointID → 座標変換
- Cube 内で SnapPointID を **自動的に座標に変換するメソッド** を必ず用意する
- 例: `Cube.getSnapPointPosition(snapId: string): THREE.Vector3`

```js
// Cube.js 内
getSnapPointPosition(snapId) {
    if (snapId.startsWith("V:")) {
        const label = snapId.slice(2);
        return this.getVertexPosition(label);
    } else if (snapId.startsWith("E:")) {
        const [edgeLabel, ratioText] = snapId.slice(2).split("@");
        const [v1, v2] = edgeLabel.split("");
        const [numerator, denominator] = ratioText.split("/").map(Number);
        const r = numerator / denominator;
        const p1 = this.getVertexPosition(v1);
        const p2 = this.getVertexPosition(v2);
        return new THREE.Vector3().lerpVectors(p1, p2, r);
    } else if (snapId.startsWith("F:")) {
        const [faceLabel] = snapId.slice(2).split("@");
        const verts = faceLabel.split("");
        let center = new THREE.Vector3();
        verts.forEach(v => center.add(this.getVertexPosition(v)));
        center.divideScalar(4);
        return center;
    }
    return null;
}
```

- この変換があれば、プリセットは **座標依存ではなく構造依存** で定義可能

---

## 3. presetData.js での定義方法
- `getPoints` は **THREE.Vector3 の配列を返すのではなく、SnapPointID の配列を返す**
- SelectionManager が Cube から座標を取得するフローを前提とする

```js
export const PRESETS = [
    {
        name: "TriangleCut_SnapID",
        snapIds: ["V:0", "V:1", "V:2"]
    },
    {
        name: "TriangleWithEdgePoints",
        snapIds: ["V:0", "E:12@1/2", "E:34@1/2"]
    }
];
```

- PresetManager では以下のように処理

```js
applyPreset(cube, presetName) {
    const preset = PRESETS.find(p => p.name === presetName);
    if (!preset) return;

    preset.snapIds.forEach(snapId => {
        const pos = cube.getSnapPointPosition(snapId);
        selectionManager.addPoint({ point: pos, snapId });
    });
}
```

---

## 4. 実装上の注意点
1. **構造情報の保持**
    - SnapPointID を保持しておくことで、どの辺や頂点に対応するか明確になる
    - Cutter 側で交点判定や面積計算に活用可能
2. **座標の自動算出**
    - SnapPointID を渡せば Cube が自動で座標を返す仕組みにする
    - 座標ハードコーディングを避け、立方体サイズや回転に依存しない
3. **プリセットの再利用性**
    - SnapPointID ベースで定義すれば、サイズ変更や向き変更してもそのまま利用可能
4. **エラーハンドリング**
    - 無効な SnapPointID が渡された場合は警告を出す
    - `cube.getSnapPointPosition` で `null` を返す場合の処理を PresetManager で確実に行う
5. **解説との連動**
    - SnapPointID に対応する説明テンプレートを用意すると、自動解説表示が可能
    - 例えば `V:0` → 「立方体の左上前の頂点」など

---

## 5. 教育的観点
- SnapPointID の導入により、プリセットは **構造的に意味のある単位** で管理される
- 面積計算や辺比率の解説を簡単に紐付けられる
- 学習者にとって「座標」ではなく「立体の構造」として理解させることが可能
