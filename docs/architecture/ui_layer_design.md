# ui_layer_design.md

Status: Draft

# UI層（React想定）設計方針

## 1. 目的
- Three.js の描画ロジックと UI 層を分離し、学習機能の拡張に耐える構造にする
- React で UI 状態を管理し、表示更新の一貫性を高める

---

## 2. 役割分担
- **Core/Engine（既存JS）**
  - 立体モデル、SnapPointID、切断処理、展開図、教育メタ生成
- **UI（React）**
  - モード切替、設定、プリセット操作、学習UI、解説表示
  - Engineの入力と出力の橋渡し

---

## 3. UI層の構成
- `AppShell`: 全体レイアウト、モード切替、画面構成
- `PresetPanel`: プリセット選択/フィルタ
- `SettingsPanel`: 表示設定、頂点ラベル、保存設定
- `LearningPanel`: 解説、ヒント、問題表示、履歴
- `NetViewPanel`: 展開図の表示・操作

---

## 4. Engineとの接続
UIは以下の **公開API** にのみ依存する。

```
engine.selectSnapPoints(ids: SnapPointID[]): void
engine.executeCut(): CutResultMeta
engine.applyPreset(id: string): void
engine.getState(): EngineState
engine.setDisplayState(display: DisplayState): void
```

---

## 5. 状態管理
- 初期は `useState/useReducer` で十分
- 学習履歴や問題生成が増える段階で `zustand` 等を導入検討

---

## 6. テスト方針
- UIはコンポーネント単位でスナップショット/振る舞いテスト
- Engineのロジックは既存のユニットテストを維持

---

## 7. まとめ
- UIはReactで分離し、Engineは既存の構造主体ロジックを保持
- 学習機能拡張に合わせてUIを段階的に強化
