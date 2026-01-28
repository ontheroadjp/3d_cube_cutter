# 171 message area split

- 実装(技術)について
  - message area を上部 40% 高さで固定し、alert/explanation をその領域へ移動。
  - Canvas は message area 分だけ下げて描画し、3D 表示との重なりを回避。
  - message area の背景に黒板画像（kokuban_9slice.png）を 9-slice で適用し、枠や日付の歪みを回避。
  - ExplanationPanel を上部固定領域に合わせて配置。

- 仕様(L1ドキュメント)について
  - UI の表示領域分離を Layout で実現し、Canvas とメッセージの干渉を防止。

- 数学的観点から
  - 投影/カメラ計算は Canvas のサイズに合わせて再計算されるため、表示領域の分離による歪みを避けた。

- ユーザー体験(ユーザー価値)について
  - 上部固定のメッセージ領域により、説明や通知が常時視認しやすくなる。
  - 黒板背景でメッセージの集約先が直感的に伝わる。
