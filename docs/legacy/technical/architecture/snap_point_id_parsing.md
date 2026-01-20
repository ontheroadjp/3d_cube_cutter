# snap_point_id_parsing.md

Status: Superseded
Summary: 置き換え先は docs/technical/specification/snap_point_id_spec.md
Replaced-by: docs/technical/specification/snap_point_id_spec.md


# SnapPointID パース / 正規化仕様

## 1. 目的
SnapPointID を安全に扱うため、文字列 → 構造化データへの変換規則と正規化規則を定義する。

---

## 2. 文字列表現 (Grammar)

### 2.1 Vertex
- 形式: `V:<index>`
- 例: `V:0`

### 2.2 Edge
- 形式: `E:<index1><index2>@<numerator>/<denominator>`
- 例: `E:01@1/2`

### 2.3 Face Center (拡張)
- 形式: `F:<index1><index2><index3><index4>@center`
- 例: `F:0123@center`

---

## 3. パース結果 (構造化)

```
interface ParsedSnapPointId {
  type: 'vertex' | 'edge' | 'face';
  vertexIndex?: string;
  edgeIndex?: string; // 例: '01'
  ratio?: { numerator: number; denominator: number };
  faceIndex?: string; // 例: '0123'
}
```

---

## 4. 正規化ルール

### 4.1 Edge インデックス
- 頂点インデックスを昇順に並べる
- `E:10@1/2` → `E:01@1/2`

### 4.2 比率の補正
- Edge を正規化で入れ替える場合、比率は `1 - r` に変換する
- 例: `E:10@1/4` → `E:01@3/4`

### 4.2 分数の正規化
- 分子・分母の最大公約数で既約化
- 分母は常に正
- 例: `2/4` → `1/2`

### 4.3 端点の扱い
- `E:01@0/1` および `E:01@1/1` は有効
- **推奨**: 表示や解説生成では Vertex 表記に寄せる
  - `E:01@0/1` → `V:0`
  - `E:01@1/1` → `V:1`
- 変換を行うかは呼び出し側のポリシーに委ねる

---

## 5. バリデーション
- 未知の型接頭辞はエラー
- Edge は 2 文字の頂点ラベルのみ許可
- Face は 4 文字ラベル + `@center` のみ許可
- 分母ゼロは禁止

---

## 6. 変換 API の責務

推奨 API:
- `parseSnapPointId(id: string): ParsedSnapPointId`
- `normalizeSnapPointId(parsed: ParsedSnapPointId): ParsedSnapPointId`
- `stringifySnapPointId(parsed: ParsedSnapPointId): string`
- `canonicalizeSnapPointId(id: string): string` (端点を Vertex 表記に寄せる場合)

---

## 7. 例

```
parse('V:0') -> { type: 'vertex', vertexIndex: '0' }
parse('E:10@2/4') -> { type: 'edge', edgeIndex: '10', ratio: {2,4} }
normalize -> edgeIndex '01', ratio {1,2} かつ比率補正あり
stringify -> 'E:01@1/2'
```

---

## 8. まとめ
- SnapPointID は一貫した正規化で比較可能にする
- 端点の Vertex 変換は用途に応じて選択
- 正規化は GeometryResolver と SelectionManager の双方で再利用可能
