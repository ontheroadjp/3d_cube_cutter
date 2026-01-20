# docs/technical/specification/presets/preset_snapid_notes.md

Status: Active
Summary: SnapPointID を使ったプリセット（presetData.ts / PresetManager.ts）のデータ契約と、適用フローの注意点を定義する。

# PresetManager / presetData.js 実装上の注意点 (SnapPointID版)

## 1. 目的
SnapPointID を使ったプリセット切断パターンを `js/presets/presetData.ts` / `js/presets/PresetManager.ts` で扱う際の契約と注意点を整理する。
これにより、構造主導アーキテクチャに沿った安定したプリセット適用が可能になる。

---

## 2. データ契約（Preset）
型の正は `js/types.ts` を参照する。

```
Preset = {
  name: string;
  category: 'triangle' | 'quad' | 'poly';
  description?: string;
  snapIds?: SnapPointID[];
}
```

プリセット一覧は `js/presets/presetData.ts` の `PRESETS` を正とする。

## 2. SnapPointID → 座標変換
- SnapPointID の解決は `GeometryResolver` を利用する
- プリセットは **座標依存ではなく構造依存** で定義する

---

## 3. presetData.js での定義方法
- `snapIds` に SnapPointID の配列を定義する
- 正規化は `parseSnapPointId` / `normalizeSnapPointId` の組を通す
- 適用は `PresetManager.applyPreset(name)` を正とする

実装参照:
- `js/presets/presetData.ts`
- `js/presets/PresetManager.ts`

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
5. **関連機能との連動**
    - SnapPointID を保持しているため、切断後の `outline` や学習コンテンツ（LearningProblem）と同じ ID 軸で接続できる

---

## References
- SnapPointID 仕様: docs/technical/specification/snap_point_id_spec.md
- 典型パターン一覧（参照）: docs/technical/patterns/frequent_patterns.md
