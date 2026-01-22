# #126 CutterクラスのSSOT完全対応とAdapter排除

## 実装(技術)について
- Cutter クラスが SolidSSOT (Recordベース) を直接受け取れるように拡張。
- main.ts での proxyCube 生成（Adapter）を完全に削除。これによりデータ構造の二重管理が解消された。
- explanationGenerator.ts も Record 形式の構造データに対応させた。

## 仕様(L1ドキュメント)について
- SSOT Layer の定義に忠実な実装となり、Topology 情報を直接参照するようになった。

## 数学的観点から
- SSOT 化により座標計算の入力が GeometryResolver の精密な値に統一された。これにより、一部のエッジケース（Hexagonカット）において、既存の epsilon ベースのクリッピングロジックの限界が顕在化した。

## ユーザー体験(ユーザー価値)について
- Adapter 処理のオーバーヘッドが削減され、コードの保守性が向上した。
