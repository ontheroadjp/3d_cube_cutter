# SnapPointID 仕様

Status: Active
Summary: SnapPointID の構造、命名規則、パース/正規化ルールを統合して定義する。

## 1. 目的
SnapPointID は立体上のすべてのスナップ点を一意に識別する。
本仕様は命名規則・パース・正規化を一つにまとめ、ID主導の処理を保証する。

---

## 2. SnapPoint の種類
- Vertex
- Edge
- Face center（拡張枠）

---

## 3. SnapPointID 命名規則

### 3.1 Vertex
- 形式: `V:<index>`
- 例: `V:0`

### 3.2 Edge
- 形式: `E:<index1><index2>@<numerator>/<denominator>`
- 例: `E:01@1/2`
- Edge の頂点順は昇順で正規化する

### 3.3 Face center（拡張）
- 形式: `F:<index1><index2><index3><index4>@center`
- 例: `F:0123@center`

---

## 4. パース結果（構造化）

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

## 5. 正規化ルール

### 5.1 Edge インデックス
- 頂点インデックスは昇順に並べる
- `E:10@1/2` → `E:01@1/2`

### 5.2 比率の補正
- Edge を正規化で入れ替える場合、比率は `1 - r` に変換する
- 例: `E:10@1/4` → `E:01@3/4`

### 5.3 分数の正規化
- 分子・分母を既約化
- 分母は常に正

### 5.4 端点の扱い
- `E:01@0/1` と `E:01@1/1` は有効
- 表示では Vertex 表記へ寄せることを推奨

---

## 6. バリデーション
- 未知の型接頭辞はエラー
- Edge は 2 文字頂点のみ許可
- Face は 4 文字 + `@center` のみ許可
- 分母ゼロは禁止

---

## 7. 推奨 API
- `parseSnapPointId(id: string)`
- `normalizeSnapPointId(parsed: ParsedSnapPointId)`
- `stringifySnapPointId(parsed: ParsedSnapPointId)`
- `canonicalizeSnapPointId(id: string)`

---

## 8. まとめ
- SnapPointID が構造主体設計の中心
- 命名・パース・正規化を統一する
- 座標は派生情報としてのみ扱う
