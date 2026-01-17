# typescript_migration_plan.md

# TypeScript 移行準備プラン

## 1. 目的
構造主体アーキテクチャへの移行完了後、破壊的変更を避けつつ段階的に TypeScript へ移行する。

---

## 2. 優先順位
1. 低依存・型効果が高い層
   - `js/geometry/*`
   - `js/structure/*`
   - `js/education/*`
2. 依存が広いが安定した層
   - `js/Cutter.js`
   - `js/SelectionManager.js`
   - `js/net/NetManager.js`
3. UI/ストレージ/統合層
   - `js/UIManager.js`
   - `js/storage/*`
   - `main.js`

---

## 3. 移行方針
- 先に **型定義の土台** を追加し、JSのまま型を共有できる状態にする
- TypeScript化は **依存が少ない層から順に置換**
- すべてを一度に変えず、**動作維持を優先**

---

## 4. 型定義の土台
`js/types.js` に JSDoc ベースの型をまとめ、段階移行中も参照可能にする。

対象:
- `SnapPointID`
- `Ratio`
- `IntersectionPoint`
- `CutSegment`
- `CutResultMeta`
- `UserPresetState`

---

## 5. tsconfig とビルド
- まずは `checkJs` + JSDoc の併用で型検査を開始
- `allowJs: true` を前提に、ファイル単位で `.ts` に移行
- バンドル方式は現行の `type="module"` を維持
  - `tsconfig.json` は `noEmit` で導入し、既存のビルドを壊さない

---

## 6. まとめ
- 優先度の高い層から順に TS 置換
- 型定義は JSDoc で先行整備
- 動作維持を最優先で進行
