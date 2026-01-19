# docs/technical/specification/presets/preset_snapid_notes.md

Status: Active
Summary: SnapPointID を使ったプリセット切断パターンを PresetManager / presetData.js で扱う際の注意点とベストプラクティスを整理します。

# PresetManager / presetData.js 実装上の注意点 (SnapPointID版)

## 1. 目的
SnapPointID を使ったプリセット切断パターンを `PresetManager` / `presetData.js` で扱う際の注意点とベストプラクティスを整理します。
これにより、構造主導アーキテクチャに沿った安定したプリセット管理が可能になります。

---

## 2. SnapPointID → 座標変換
- SnapPointID の解決は `GeometryResolver` を利用する
- プリセットは **座標依存ではなく構造依存** で定義する

---

## 3. presetData.js での定義方法
- `snapIds` に SnapPointID の配列を定義する
- PresetManager が `GeometryResolver` で座標を解決するフローを前提とする

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
applyPreset(presetName) {
    const preset = PRESETS.find(p => p.name === presetName);
    if (!preset || !preset.snapIds) return;

    preset.snapIds.forEach(snapId => {
        const parsed = normalizeSnapPointId(parseSnapPointId(snapId));
        if (!parsed) return;
        const pos = geometryResolver.resolveSnapPointRef(parsed);
        if (!pos) return;
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
    - `GeometryResolver` が `null` を返す場合の処理を PresetManager で確実に行う
5. **解説との連動**
    - SnapPointID に対応する説明テンプレートを用意すると、自動解説表示が可能
    - 例えば `V:0` → 「立方体の左上前の頂点」など

---

## 5. 教育的観点
- SnapPointID の導入により、プリセットは **構造的に意味のある単位** で管理される
- 面積計算や辺比率の解説を簡単に紐付けられる
- 学習者にとって「座標」ではなく「立体の構造」として理解させることが可能
