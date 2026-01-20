# ドキュメント管理ポリシー（tech / edu 分離版・最新版）

Status: Active
Summary: 本リポジトリにおけるドキュメントの役割分担、配置構造、更新ルールを定義する。技術ドキュメントと教育ドキュメントは物理的に分離して管理する。

---

## 1. 目的

- ドキュメントが増えても、全体像・現在地・判断根拠を短い経路で把握できるようにする
- 技術的な前提（設計・仕様）と、教育的な前提（教育思想・学習配慮）を混在させずに管理する
- 計画・補助メモ・仕様・履歴の責務を分離し、ドキュメントが「進捗ログ」化するのを防ぐ
- 参照関係が破綻しない（どこに何を書くべきか迷わない）構造を提供する

---

## 2. 基本方針

- ドキュメントは「役割（レイヤ）」と「視点（技術/教育）」を分離して管理する
- 技術ドキュメントと教育ドキュメントはディレクトリを分けて物理的に管理する
- 進捗・履歴・差分は Issue / PR / Git を正とし、ドキュメントに作業ログを書かない
- L2（実装開始時）は plan と work memo を必ず作成する（work memo は空でもよい）
- 横断情報（入口・現在地・運用ルール）は docs 直下に置き、tech/edu のいずれにも属させない

---

## 3. ディレクトリ構造（正）

docs は次のトップ構造を正とする。

- docs/（横断）
  - 入口（README）・現在地（CURRENT）・運用（workflow/policy）・一覧（任意）
- docs/technical/（技術）
  - 技術思想、仕様、移行計画、技術パターン、テスト等
- docs/education/（教育）
  - 教育思想、学習ゴール、UI/コンテンツ方針、説明テンプレート等
- docs/legacy/（履歴）
  - 過去版、廃止ドキュメント、参考資料

---

## 4. 横断ドキュメント（docs 直下）

docs 直下は、tech/edu のいずれにも属さない横断ドキュメントの置き場とする。

必須（推奨）:
- docs/README.md
  - ドキュメント地図（入口の入口）。tech/edu の入口への導線を置く
- docs/CURRENT.md
  - 現在地（今どこか / 次は何か）
- docs/workflow.md
  - 作業フロー（手順）。詳細規約は各ポリシーを参照させる
- docs/documentation_policy.md
  - 本ポリシー
- docs/issue_pr_policy.md
  - Issue / PR の運用ポリシー

任意:
- docs/DOCS_INDEX.md
  - 機械生成の一覧（棚卸し用途）。入口としては docs/README.md を正とする

---

## 5. 視点（tech / edu）の分離ルール

### 5.1 docs/technical（技術）

**対象**
設計、データ構造、API、移行計画、テスト、実装上の制約など。

**目的**
実装を成立させるための正しさを定義する。

**原則**
- 「なぜ教育的に必要か」は education に置き、ここでは技術的な要件・制約・契約を扱う
- 教育的意図が設計判断に影響する場合は、education の該当ドキュメントへリンクする（内容は移さない）

---

### 5.2 docs/education（教育）

**対象**
教育目的、学習者モデル、認知負荷配慮、UI/コンテンツ方針、説明テンプレートなど。

**目的**
学習体験を成立させるための正しさを定義する。

**原則**
- 実装詳細（型・API・内部構造・具体コード）は technical に置く
- 技術的制約が教育設計に影響する場合は、technical の該当ドキュメントへリンクする（内容は移さない）

---

### 5.3 相互参照の原則（混在を避けて接続する）

- 内容を混ぜず、参照リンクで接続する
- 参照リンクは「判断の理由」が分かる方向で貼る
  - 技術の判断が教育的理由に基づくなら education を参照
  - 教育の方針が技術的制約に依存するなら technical を参照

---

## 6. レイヤ構成（役割の分離）

レイヤは「どの種類の情報か（役割）」を表す。
このレイヤは tech / edu のどちらにも適用される。

- L0: Foundations（前提・思想）
- L1: Current Context（現在地）
- L2: Plan & Work Memo（計画と補助メモ）
- L3: Specification（仕様の正）
- L4: Reference / History（参考・履歴）

---

## 7. 各レイヤの役割と配置

### L0: Foundations（前提・思想）

- 技術側: docs/technical/architecture/
  - 設計思想、責務境界、構造概念、否定条件
- 教育側: docs/education/（例: philosophy/ など）
  - 教育思想、学習ゴール、学習配慮、禁止事項、教育的制約

ルール:
- L0 に進捗・計画・実装詳細を書かない
- L0 は後続ドキュメントの解釈基盤として扱う

---

### L1: Current Context（現在地）

対象:
- docs/CURRENT.md

ルール:
- 作業ログは書かない
- フェーズや主作業が変わったときのみ更新する
- tech/edu 双方の参照先（plan/spec）を列挙してよい

---

### L2: Plan & Work Memo（計画と補助メモ）

対象（技術側）:
- docs/technical/migration/<topic>/
  - <topic>_plan.md（必須）
  - <topic>_note.md（必須・空でも良い）
  - <topic>_inventory.md（任意）

対象（教育側）:
- 原則、教育施策の段階導入や大規模改定がある場合のみ L2 相当を持つ
  - docs/education/migration/<topic>/（任意）

Plan（必須）:
- フェーズ分解
- 目的と完了条件
- 依存関係、順序

Work Memo（必須だが任意記述）:
- 作業中の気づき、注意点、判断の断片
- 書く必要がなければ空でよい
- 進捗・作業内容の記録は目的としない

補足:
- `docs/technical/migration/` 直下の既存ファイルは旧形式として扱う
- 新規作業は必ず `<topic>/<topic>_plan.md` と `<topic>/<topic>_note.md` を正とする
- 例外: `docs/technical/migration/object_model_migration/object_model_migration_worklog.md` は当面維持する

---

### L3: Specification（仕様の正）

対象:
- docs/technical/specification/

ルール:
- 実装が必ず満たすべき契約・構造・不変条件を定義する
- 教育的意図は education へ参照で繋ぐ（仕様内に混在させない）
- usage（使用例）は spec の補助として specification 配下に置いてよい

---

### L4: Reference / History（参考・履歴）

対象:
- docs/technical/notes/（任意）
- docs/legacy/（過去版、廃止、記録）

ルール:
- 現行判断の正にはならない
- 現行の入口は docs/README.md を正とする

---

## 8. 既存ディレクトリの命名と統一

- 「仕様」を置くディレクトリ名は specification を正とする
  - 例: docs/technical/specification/...
- 旧名称 specs は移行後に廃止する（互換リンクは README で吸収）

---

## 9. 更新ルール（最低限）

- 追加ドキュメントは必ず Status / Summary を持つ
- ドキュメントの役割が変わる場合は、移動（配置変更）を優先し、内容を混在させない
- Superseded / Legacy は docs/legacy または technical/migration/_history に退避して明示する

---

## 10. 判断に迷った場合の優先指針

次の 2 問で配置を決める。

1) 視点はどちらか？
- 技術（実装を成立させるための正しさ） → docs/technical
- 教育（学習体験を成立させるための正しさ） → docs/education

2) 役割（レイヤ）はどれか？
- 前提・思想 → L0
- 現在地 → L1
- 計画・補助メモ → L2
- 仕様の正 → L3
- 参考・履歴 → L4

---

## 11. Architecture / Specification の判断基準

最短の判断式:
- 違反したらバグ → Specification
- 責務/境界/依存の前提 → Architecture

---

## 12. 本ポリシーの位置づけ

- 本ドキュメントはドキュメント管理に関する最上位ポリシーとする
- 個別ドキュメントの内容よりも本ポリシーを優先する
- 管理構造を変更する場合は本ポリシーを更新する
