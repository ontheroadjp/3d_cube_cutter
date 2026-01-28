# 166 net unfold step playback ui

- 実装(技術)について
  - NetPlan の faceOrder から rootFace を除外し、hinge を持つ面のみをステップ対象にした。
  - stepIndex を NetDerived.animation に保持し、AnimationPlayer で 1面ずつ開閉する。
  - ネット表示のオフセットは維持しつつ、サイドバー横にステップ操作 UI を固定配置した。

- 仕様(L1ドキュメント)について
  - NetPlan/AnimationSpec を前提に「面を1枚ずつ開く」操作に合わせたステップ制御を実装。
  - UI Spec の「ステップ送り/連続再生切替」に準拠するため、モード切替を導入。

- 数学的観点から
  - 角度計算は既存の Resolver/hinge 依存の回転を継続し、SSOT を変更しない。
  - stepIndex は進行度の離散化のみで、面法線や回転軸の算出は従来通り。

- ユーザー体験(ユーザー価値)について
  - 学習時に「1面ずつ開く/戻す」が可能になり、展開の因果が追いやすい。
  - 連続再生とステップ再生の切替で理解フェーズに合わせた操作ができる。
