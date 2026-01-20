# TypeScript 移行プラン（完了）

Status: Legacy
Summary: TypeScript 移行の記録（完了）。現行の正ではない。

移行は完了済み。本ドキュメントは記録用。

## 1. 移行結果（現行）
- `main.ts` をエントリとし、`dist/main.js` をブラウザで読み込む
- 主要モジュールは `.ts` に移行済み（`js/` 配下）
- `tsconfig.json` は `noEmit` の型検査用、`tsconfig.build.json` で `dist/` を生成
- `npm run build` で `dist/` を生成、`npm test` はビルド後に Vitest を実行
- テストは `dist/` 出力を参照して実行

## 2. 当時の計画（参考）
### 2.1 目的
構造主体アーキテクチャへの移行完了後、破壊的変更を避けつつ段階的に TypeScript へ移行する。

### 2.2 優先順位
1. 低依存・型効果が高い層
   - `js/geometry/*`
   - `js/structure/*`
   - `js/education/*`
2. 依存が広いが安定した層
   - `js/Cutter.ts`
   - `js/SelectionManager.ts`
   - `js/net/NetManager.ts`
3. UI/ストレージ/統合層
   - `js/UIManager.ts`
   - `js/storage/*`
   - `main.ts`

### 2.3 方針
- 先に型定義の土台を追加し、JSのまま型を共有できる状態にする
- 依存が少ない層から順に置換
- 動作維持を最優先で進行
