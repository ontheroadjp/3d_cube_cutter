# engine_ui_contract.md

Status: Draft

# Engine / UI 契約（API設計）

## 1. 目的
UI（React）と Engine（Three.js/構造主体ロジック）を分離し、
UIが直接内部実装に依存しないための契約を定義する。

---

## 2. Engine が提供する公開API

```
engine.getState(): EngineState
engine.setDisplayState(display: DisplayState): void
engine.selectSnapPoints(ids: SnapPointID[]): void
engine.executeCut(): CutResultMeta
engine.applyPreset(id: string): void
engine.reset(): void
engine.setVertexLabelMap(labelMap: Record<string, string>): void
engine.setCutInverted(inverted: boolean): void
```

---

## 3. UI が保持する状態
- モード（free/preset/settings/learning）
- プリセット選択状態
- 表示設定（透過/ラベル/展開図）
- 解説/学習パネルの表示状態

---

## 4. イベントと通知
Engine から UI への通知はイベント経由に限定する。

```
onCutExecuted(result: CutResultMeta): void
onSelectionChanged(count: number): void
onPresetApplied(id: string): void
```

---

## 5. 既存実装からの移行指針
- `UIManager` は段階的に React に移譲
- `main.js` は Engine API を束ねる役割に縮小
- UI から直接 `Cutter/Selection/Cube` を触らない

---

## 6. まとめ
- UI は Engine の公開APIだけに依存
- 連携はイベント経由で明示化
