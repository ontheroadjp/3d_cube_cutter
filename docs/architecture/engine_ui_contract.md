# engine_ui_contract.md

Status: Active
Summary: 現行UIとEngineの責務境界およびグローバルAPI契約を定義する。

# Engine / UI 契約（現行API）

## 1. 目的
UI（React）と Engine（Three.js/構造主体ロジック）を分離し、
UIが直接内部実装に依存しないための契約を定義する。

---

## 2. Engine が提供する公開API
公開APIは `globalThis.__engine` として公開される。

```
getDisplayState(): DisplayState
setDisplayState(display: DisplayState): void
getPresets(): Preset[]
applyPreset(name: string): void
setMode(mode: 'free' | 'preset' | 'learning' | 'settings'): void
setSettingsCategory(category: 'display' | 'cuboid'): void
flipCut(): void
toggleNet(): void
resetScene(): void
applyLearningProblem(problem: LearningProblem | string[]): void
previewLearningProblem(problem: LearningProblem | string[]): void
startLearningSolution(problem: LearningProblem | string[]): { totalSteps: number } | void
advanceLearningStep(): Promise<LearningStepResult | void> | void
listUserPresets(): UserPresetState[]
isUserPresetStorageEnabled(): boolean
saveUserPreset(form: UserPresetForm): Promise<void> | void
cancelUserPresetEdit(): void
applyUserPreset(id: string): void
editUserPreset(id: string): void
deleteUserPreset(id: string): void
configureVertexLabels(labels: string[]): void
configureCube(lx: number, ly: number, lz: number): void
getCubeSize(): CubeSize
getVertexLabelMap(): Record<string, string> | null
setPanelOpen(open: boolean): void
```

補足:
- `setPanelOpen` はサイドバー開閉によるレイアウト/縮尺調整に使用する。
- `toggleNet` は展開図モードの開閉（3D展開アニメーション + 2D俯瞰表示）を担う。

### 2.1 DisplayState の拡張
表示設定は `DisplayState` で管理し、UIとEngineで同期する。

```
DisplayState = {
  showVertexLabels: boolean,
  showFaceLabels: boolean,
  edgeLabelMode: 'visible' | 'popup' | 'hidden',
  showCutSurface: boolean,
  showPyramid: boolean,
  cubeTransparent: boolean,
  showCutPoints: boolean,
  colorizeCutLines: boolean
}
```

---

## 3. UI が保持する状態
- モード（free/preset/learning/settings）
- パネル開閉状態とアクティブパネル
- プリセットカテゴリと選択状態
- 設定タブ（表示/立体図形）
- 学習モードの状態（将来拡張）

---

## 4. Engine → UI の通知（グローバル関数）
Engine は以下のグローバル関数を呼び出す。

```
__setReactMode(mode: string): void
__setDisplayState(display: DisplayState | null): void
__setExplanation(text: string): void
__refreshUserPresets(): void
```

補足:
- `__setReactMode` はリセット/モード変更時にUIのパネル状態を更新する。
- `__setDisplayState` は表示設定の同期に使用する。
- `__setExplanation` は解説パネルを更新する。
- `__refreshUserPresets` は保存済みプリセットリストの再取得を促す。

---

## 5. 型の参照元
- `DisplayState`, `Preset`, `UserPresetState`, `UserPresetForm`, `LearningProblem` は `js/types.ts` を参照。

---

## 6. 既存実装からの移行指針
- `UIManager` は段階的に React に移譲
- `main.ts` は Engine API を束ねる役割に縮小
- UI から直接 `Cutter/Selection/Cube` を触らない

---

## 7. まとめ
- UI は `globalThis.__engine` の公開APIにのみ依存する
- UIの更新は `__setReactMode` / `__setDisplayState` / `__setExplanation` で同期する
