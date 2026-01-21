# Glossary（用語・表記の正）

Status: Active
Summary: コンテキスト間の認識ズレを防ぐため、用語・表記・正の参照先を一箇所に集約する。

## 目的
- AI/人間のどちらでも、同じ用語を同じ意味で扱えるようにする
- 例やテンプレから誤った表記が伝播するのを防ぐ

## 用語
### SnapPointID
- 正: `docs/technical/specification/snap_point_id_spec.md`
- 表記（正）:
  - Vertex: `V:<index>`（例: `V:0`）
  - Edge: `E:<index1><index2>@<numerator>/<denominator>`（例: `E:01@1/2`）
  - Face center: `F:<index1><index2><index3><index4>@center`（例: `F:0123@center`）
- 注意:
  - education 側の文書は「学習者向けの表示（ラベル）」を扱ってよいが、SnapPointID 自体の表記は上記を正とする

### boundary / contract
- boundary（境界）: 責務・依存方向・同期方針の「前提」（L0: architecture）
- contract（契約）: API・入出力の「仕様」（L3: specification）
- 正:
  - boundary: `docs/technical/architecture/engine_ui_boundary.md`
  - contract: `docs/technical/specification/ui/engine_ui_contract.md`

### canonical（正）
- 同一トピックで参照上の「正」として扱うドキュメントは原則 1 本
- 置き換えた場合は `Status: Superseded` + `Replaced-by:` を付与し `docs/legacy/` に退避
- 正: `docs/documentation_policy.md`（9.1 一本化）

## 更新ルール
- 表記の変更や新しい概念の導入時は、この Glossary を最初に更新する
