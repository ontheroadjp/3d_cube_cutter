# ドキュメント管理ポリシー（tech / edu 分離版・最新版）

Status: Active
Summary: 本リポジトリにおけるドキュメントの役割分担、配置構造、更新ルールを定義する。技術ドキュメントと教育ドキュメントは物理的に分離して管理する。

## 1. ディレクトリ構造

1. docs/
    - プロジェクト全体に関わるドキュメント
2. docs/technical/
    - 技術系ドキュメント（技術思想、仕様、実装計画、技術パターン、テスト等）
3. docs/education/
    - 教育系ドキュメント（教育思想、学習ゴール、UI/コンテンツ方針、説明テンプレート等)
4. docs/legacy/
    - 過去の履歴（過去版、廃止ドキュメント、参考資料, など）

## 2. ドキュメントレイヤー構成（役割の分離）

ドキュメントレイヤーは「どの種類の情報か（役割）」を表す。
このレイヤは技術系、教育系、どちらのドキュメントにも適用される。

- L0: Foundations（前提・思想）
- L1: Specification（仕様）
- L2: Plan & Work Memo（実装計画と補助メモ）
- L3: Reference / History（参考・履歴）
- L1: Current Context（現在地）


### 5.3 相互参照の原則（混在を避けて接続する）

- 内容を混ぜず、参照リンクで接続する
- 参照リンクは「判断の理由」が分かる方向で貼る
  - 技術の判断が教育的理由に基づくなら education を参照
  - 教育の方針が技術的制約に依存するなら technical を参照

---


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

### L2: Plan & Note（計画と補助メモ）

対象（技術側）:
- docs/technical/implementation/<topic>/
  - <topic>_plan.md（必須）
  - <topic>_note.md（必須・空でも良い）
  - <topic>_inventory.md（任意）

対象（教育側）:
- 原則、教育施策の段階導入や大規模改定がある場合のみ L2 相当を持つ
- docs/education/implementation/<topic>/（任意）

Plan（必須）:
- フェーズ分解
- 目的と完了条件
- 依存関係、順序

Work Memo（必須だが任意記述）:
- 作業中の気づき、注意点、判断の断片
- 書く必要がなければ空でよい
- 進捗・作業内容の記録は目的としない

補足:
- 新規作業は必ず `<topic>/<topic>_plan.md` と `<topic>/<topic>_note.md` を正とする
- 例外: `docs/technical/implementation/object_model_migration/object_model_migration_worklog.md` は当面維持する

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
- Superseded / Legacy は docs/legacy または technical/implementation/_history に退避して明示する

### 9.1 一本化（Canonical）のルール

同一トピックについて、参照上の「正（canonical）」は原則 1 つに絞る。

- 原則:
  - 現行の正は `Status: Active`（または作業中なら `Status: Draft`）の 1 本のみとする
  - 似た内容のドキュメントを増やす場合は、先に「どれを正にするか」を決める
- 置き換え:
  - 正でなくなったドキュメントは `Status: Superseded` とし、必ず `Replaced-by:` を付与する
  - 置き換え後は、参照リンク（README/他doc）を正のドキュメントへ張り替える
- 退避先:
  - Superseded / Legacy は `docs/legacy/` 配下へ移動し、現行と混同されないようにする
  - `docs/legacy/` 側の README で「現行の正ではない」ことを明示する

### 9.2 Draft の運用ルール

Draft は「作業中で未固定」を表す。
AI 駆動での認識ズレを避けるため、Draft の扱いを次で固定する。

- Draft に書いてよいこと:
  - 未確定の設計案、検討事項、今後の TODO（ただし作業ログは Issue/PR に残す）
- Draft に書かないこと:
  - 「実装が必ず満たすべき契約（L3）」の断定
  - 現行判断の正として参照させたい結論（確定したら Active に上げる）
- Draft を参照する場合:
  - 参照元に「Draft 参照である」ことを明記する
  - 参照は “暫定” として扱い、Active 化したタイミングで参照先を更新する

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
