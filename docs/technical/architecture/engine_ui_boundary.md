# Engine / UI 境界設計

Status: Active
Summary: UI と Engine の責務境界・依存方向・同期方針を定義する。

## 1. 目的
- UI と Engine を分離し、実装依存の拡散を防ぐ
- UI の状態管理と描画ロジックの責務を明確にする

---

## 2. 役割分担（正）

### Engine
- 立体モデル、切断、展開図、教育用メタ情報を扱う
- UI が必要とする操作は API として公開する

### UI（React）
- パネル/設定/プリセット/学習UIを管理する
- Engine の公開 API を通じて操作する

### Legacy UI（UIManager）
- React が未ロードの際のフォールバック表示
- 既存のツールチップや警告表示を担当

---

## 3. 依存方向
- UI → Engine の一方向を正とする
- UI は Engine の内部モジュールに直接依存しない
- Engine は UI の内部状態に依存しない

---

## 4. 状態同期の原則
- UI は表示状態を Engine と同期する
- Engine は必要な通知のみを UI に送る
- 相互に直接の状態共有は行わない

---

## 5. 仕様への参照
- API 契約: docs/technical/specification/ui/engine_ui_contract.md
- UI 仕様: docs/technical/specification/ui/ui_spec.md
