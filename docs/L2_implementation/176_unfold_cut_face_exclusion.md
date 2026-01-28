# 176 unfold cut face exclusion

- 実装(技術)について
  - NetPlan 生成時に cutFace を除外できるよう `excludeFaceIds` を追加し、adjacency をフィルタして hinges/faceOrder を構築した。
  - Net 展開時の選択で cutFace を除外し、底面選択の対象から外した。
  - applyNetPlan 実行前に全 face mesh の姿勢を初期化し、除外面が展開途中の姿勢を保持しないようにした。

- 仕様(L1ドキュメント)について
  - SSOT の Face は保持しつつ、NetPlan は展開対象のみを扱う運用とし、構造主導を維持した。

- 数学的観点から
  - 断面の回転を排除しても、hinge を持つ面の相対回転計算は従来通り dihedral angle を用いるため、面同士の幾何整合は保たれる。

- ユーザー体験(ユーザー価値)について
  - 展開時に断面が動かず、学習時の混乱（断面が展開図に混入する）を避けられる。
