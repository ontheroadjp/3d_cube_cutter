# 解説生成仕様

Status: Draft
Summary: SnapPointID 等の構造情報から、UI 表示用の解説文とハイライト指示を生成する入出力契約を定義する。

## 1. 目的
- 解説/強調が教育方針と矛盾しないよう、技術側の契約を固定する
- UI/Engine の境界を越えて “説明” を安全に運搬できる形にする

## 2. 入力（正）
- 切断点の指定（例: `SnapPointID[]`、順序は UI に依存しない）
- 構造モデル参照（必要に応じて Face/Edge/Vertex の関係）

前提:
- SnapPointID のパース/正規化は `docs/technical/specification/snap_point_id_spec.md` を正とする

## 3. 出力（正）
- 解説テキスト（複数段落/ステップを許可）
- ハイライト指示（対象IDと意図の列）

例（概念）:
```
ExplanationPayload = {
  text: string,
  highlights: Array<{ target: string, kind: 'edge'|'face'|'vertex'|'snapPoint', intent: 'primary'|'secondary' }>
}
```

## 4. 不変条件
- 入力が同一（正規化後）なら、出力の意味が変わらないこと
- ハイライトは「構造ID」に紐づき、座標値に直接依存しないこと

## 5. References
- 教育方針（理由/出し方）: docs/education/cut_patterns.md
- 教育テンプレ: docs/education/explanation_templates.md
- 境界条件: docs/technical/architecture/edu_engine_boundary.md
