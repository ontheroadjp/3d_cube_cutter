# AnimationSpec Samples

このディレクトリは AnimationSpec のサンプル/テンプレートをまとめる場所です。

## Files
- `net_unfold.example.json`
  - 立方体の展開（Net）を再現するサンプル
- `text_audio.template.json`
  - text overlay / audio を含む最小テンプレート

## Usage
1) 必要な JSON をコピーして `id` / `version` / `timeline` を編集
2) `js/animation/AnimationSpec.ts` の `parseAnimationSpec` で検証
3) Net 展開の場合は `buildNetUnfoldSpec` で NetPlan から生成する運用を推奨
