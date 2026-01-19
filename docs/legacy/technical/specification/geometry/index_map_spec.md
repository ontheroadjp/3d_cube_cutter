# index_map_spec.md

Status: Superseded
Summary: 置き換え先は docs/technical/specification/geometry/geometry_spec.md


# IndexMap 実装仕様

## 1. 目的
内部ID (`V:0`〜`V:7`) を座標へ変換するための
インデックス配置規約と実装ルールを定義する。

---

## 2. 既定のインデックス配置

```
Top (y+):   4(-x,+y,+z)  5(+x,+y,+z)  6(+x,+y,-z)  7(-x,+y,-z)
Bottom (y-):0(-x,-y,+z)  1(+x,-y,+z)  2(+x,-y,-z)  3(-x,-y,-z)
```

- 直方体サイズは `lx, ly, lz`
- 原点は立方体中心

---

## 3. indexMap の型

```
interface IndexMap {
  [index: string]: { x: number; y: number; z: number };
}
```

- 値は方向符号のみを持ち、実座標は `size` と掛け合わせる
- 例: `0: { x: -1, y: -1, z: +1 }`

---

## 4. GeometryResolver への受け渡し

- `Cube` 作成時に `indexMap` を固定生成
- `GeometryResolver` は `indexMap + size` から座標を解決

---

## 4.1 受け渡しAPI案

- `Cube.getIndexMap(): IndexMap`
- `Cube.getSize(): { lx: number; ly: number; lz: number }`

---

## 5. 直方体サイズ変更時
- `indexMap` は不変
- `size` だけ更新して再計算する

---

## 6. 拡張
- 軸の向きを入れ替える場合は `axis` を変更
- 頂点ラベルの表示変更は `labelMap` で行い、indexMap には影響させない

---

## 7. まとめ
- indexMap は内部構造の根幹
- サイズ変更やラベル変更から独立させる
