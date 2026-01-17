# preset_unification_policy.md

# プリセット統合方針

## 1. 目的
標準プリセットとユーザープリセットを同列に扱い、
UI一覧や適用処理を統一する。

---

## 2. 種別

- **Built-in Preset**
  - 同梱された固定プリセット
  - 編集不可

- **User Preset**
  - ユーザー保存の状態プリセット
  - 編集/削除可能

---

## 3. 共通インターフェース

```
interface PresetListItem {
  id: string;
  name: string;
  category?: string;
  type: 'builtin' | 'user';
  snapPoints: string[]; // SnapPointID
  state?: UserPresetState; // user の場合のみ
}
```

---

## 4. 並び順

1. Built-in（カテゴリ順）
2. User（更新日時順）

---

## 5. UI表示ルール

- built-in: バッジで「標準」表示
- user: 編集/削除ボタンを表示
- 無料版: user セクション非表示

---

## 6. 適用フロー

- Built-in: SnapPointID のみ適用
- User: UserPresetState を全体復元

---

## 7. まとめ
- 一覧は共通、適用は種別で分岐
- 無料/有料の切り替えにも対応
