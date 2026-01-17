# storage_adapter_spec.md

# StorageAdapter 仕様書

## 1. 目的
無料版/有料版で保存機能を切り替えられるよう、
保存処理を抽象化する。

---

## 2. 基本方針
- **無料版**: 保存不可 (`NoopStorage`)
- **有料版**: `PaidStorage` を差し替え
  - 初期実装: IndexedDB
  - 将来: SQLite(WASM) へ置換可能

---

## 3. インターフェース

```
interface StorageAdapter<T> {
  isEnabled(): boolean;
  list(): Promise<T[]>;
  get(id: string): Promise<T | null>;
  save(item: T): Promise<void>;
  remove(id: string): Promise<void>;
}
```

---

## 4. NoopStorage (無料版)
- `isEnabled()` は false
- list/get/save/remove は空実装

---

## 5. PaidStorage (有料版)

### 5.1 初期実装: IndexedDB
- オブジェクトストア名: `user_presets`
- 主キー: `id`
- インデックス: `name`, `updatedAt`

### 5.2 将来実装: SQLite(WASM)
- OPFS を保存先に利用
- IndexedDB 互換の API を維持

---

## 6. 利用ルール
- UI は `isEnabled()` を基準にボタンを表示/非表示
- 無料版は保存ボタンを出さない
- 有料版は「保存/一覧/削除」UI を表示

---

## 7. まとめ
- 保存方式を差し替え可能にする
- 無料版と有料版の機能差分を明確化
