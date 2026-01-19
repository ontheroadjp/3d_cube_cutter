# React UI 移行プラン

Status: Active
Summary: 学習機能の拡張に備え、UI層をReactへ段階移行する。

## 1. 目的
- 学習機能の拡張に備え、UI層をReactへ段階移行する
- Three.js描画とUIを分離し、保守性を高める

---

## 2. 方針
- Engine（構造主体ロジック）は維持し、UIのみ移行
- 段階移行で常に動作可能な状態を保つ
- 先に小さなUIからReact化し、徐々に置き換える

---

## 3. 進捗
### 完了
- ステップ1: Reactの土台
- ステップ2: 解説パネルの移行
- ステップ3: 設定パネルの移行
- ステップ4: プリセットUIの移行
- ステップ6: UIManager の縮小

### 進行中
- ステップ5: モード/学習機能の移行（学習パネルの骨組みを追加）

### 未着手
- なし

---

## 4. ステップ
### ステップ0: 現状把握
- UIの機能分割と依存関係を洗い出し
- `UIManager` の責務を整理
- Engine / UI 契約を定義（`docs/architecture/engine_ui_contract.md`）

### ステップ1: Reactの土台
- `index.html` に React root を追加
- 既存UIは残し、React UIと共存させる
- 初期は importmap で CDN 参照（後でビルド導入を検討）

### ステップ2: 解説パネルの移行
- 解説表示を React コンポーネント化
- `UIManager.setExplanation` を React 側に接続

### ステップ3: 設定パネルの移行
- 表示設定/頂点ラベル/切断表示のUIを移行
- 既存イベントを React から Engine API 呼び出しに切替

### ステップ4: プリセットUIの移行
- プリセット選択とユーザープリセット管理を移行

### ステップ5: モード/学習機能の移行
- 学習パネル、問題生成、履歴表示を React で実装

### ステップ6: UIManager の縮小
- React移行完了後に `UIManager` を最小化/廃止

---

## 5. 完了条件
- 既存UIが全てReact化され、UIManagerが不要
- 学習機能の拡張がReact側で完結

---

## 6. テスト方針
- UI: Reactコンポーネント単位のテスト
- Engine: 既存ユニットテストを維持
