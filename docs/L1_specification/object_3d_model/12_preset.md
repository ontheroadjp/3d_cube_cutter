# L1_specification/object_3d_model/12_preset.md

# 12 Preset Specification (Built-in / User Preset)

本ドキュメントは、切断パターンをワンクリックで再現する **Preset（プリセット）** 機能の仕様を定義する。

プリセットには2種類が存在する。

- Built-in Preset（標準プリセット）
  - アプリに同梱された典型パターン
  - 編集不可
- User Preset（ユーザープリセット）
  - ユーザーが任意の切断状態を保存したもの
  - 編集/削除可能

本仕様の目的は、Built-in / User を **同一UI一覧で統合**しつつ、
適用時はそれぞれの責務に応じて **復元範囲を分岐**できるようにすることである。

---

## 追記：3層構造におけるPresetの位置づけ

Preset は object_3d_model の3層構造のうち、単一層に閉じるのではなく **複数層にまたがる機能**である。
ただし「何を正として保存するか」を層ごとに明確化することで、構造主導アーキテクチャと矛盾しない形で運用できる。

### SSOT Layer（唯一の正として保存されるもの）
Preset が SSOT として保持するものは **切断の再現に必要な入力**である。

- CutInput に相当する情報
  - `snapPoints: SnapPointID[]`
  - `inverted: boolean`（切断反転などがある場合）
- （任意）対象Solidの参照
  - `targetSolidId` など
  ※ 切断前/切断後の区別や、立体プリセットを扱う場合に必要

Built-in Preset は SSOT を最小単位として持ち、**SnapPointID配列のみ**で切断を再現する。

### Presentation Metadata Layer（表示・学習体験の正として保存されるもの）
Preset が Presentation Metadata として保持するものは **表示上の状態**である。

- 表示設定（DisplayState）
  - ラベル表示ON/OFF
  - マーカー表示ON/OFF
  - 断面表示ON/OFF
  - 辺の色分けON/OFF など
- ラベル設定（Labeling / LabelSlot.text）
  - 頂点ラベルのカスタム（A,B,C…など）

User Preset は SSOT に加えてこれらの Presentation Metadata を保存し、復元できる。

### Derived Layer（派生情報：キャッシュとして保持可能）
Preset が Derived として保持し得るのは **再計算可能な切断結果のキャッシュ**である。

- CutResult のキャッシュ
  - outline（断面輪郭）
  - intersections（IntersectionPoint）
  - cutSegments（CutSegment）
  - mesh（resultMesh / removedMesh）等

Derived は「高速化のためのキャッシュ」として保存してよいが、
常に SSOT（snapPoints）から再生成できる必要がある。
復元時に SSOT と矛盾が生じた場合は **SSOTを正として再計算**する。

### Built-in / User の整理（最終結論）
- Built-in Preset：
  - SSOT（snapPoints）だけを保持する軽量プリセット
- User Preset：
  - SSOT（snapPoints） + Presentation（表示/ラベル）を保持する状態プリセット
  - Derived（結果キャッシュ）は任意で保持できるが正にはしない

---

## 1. 目的

- 典型的な切断パターンをプリセットとして登録し、ワンクリックで再現できるようにする
- SnapPointID を軸にして、構造主導アーキテクチャに沿った安定した再現性を確保する
- 標準プリセットとユーザープリセットを同列に扱い、一覧・選択・適用を統一する

---

## 2. 前提（構造主導）

- プリセットは **座標を保持しない**
- プリセットは **SnapPointID（構造ID）を保持する**
- SnapPointID からの座標解決は Resolver（例：GeometryResolver）で行う

これにより、サイズ変更・向き変更などがあってもプリセットの再利用性を保つ。

---

## 3. 種別

### 3.1 Built-in Preset
- 同梱された固定プリセット
- 編集不可
- 適用時は **SnapPointIDのみ**を切断入力へ反映する

### 3.2 User Preset
- ユーザーが保存した状態プリセット
- 編集/削除可能
- 適用時は **状態全体**を復元する（切断入力だけに限定しない）

---

## 4. Built-in Preset データ契約

Built-in Preset は「典型的な切断パターン」を提供する軽量プリセットである。

### 4.1 Built-in Preset 型（概念）

    type PresetCategory = "triangle" | "quad" | "poly"

    type BuiltinPreset = {
      name: string
      category: PresetCategory
      description?: string
      snapIds?: SnapPointID[]   // SnapPointID配列（切断点）
    }

### 4.2 定義場所（実装前提）
- Built-in の一覧は `presetData.ts` 等の定数リストを正とする
- 適用は `PresetManager.applyPreset(name)` 等の入口を正とする

### 4.3 適用ルール
- `snapIds` を SnapPointID として正規化し、cut の入力へ渡す
- SnapPointID は座標に変換せず、Selection / CutInput 側へ渡す
- Cutter / GeometryResolver が必要に応じて座標を解決する

### 4.4 エラーハンドリング
- 無効な SnapPointID が含まれる場合は警告を出す
- SnapPointID の解決に失敗する場合は、その点を無効として扱うか適用を中断する

---

## 5. 標準プリセットとユーザープリセットの統一（一覧）

### 5.1 共通インターフェース

一覧表示と選択を統一するため、Built-in / User を同列に扱う共通型を定義する。

    interface PresetListItem {
      id: string
      name: string
      category?: string
      type: "builtin" | "user"
      snapPoints: string[]          // SnapPointID
      state?: UserPresetState       // user の場合のみ
    }

- Built-in は `state` を持たない
- User は `state` を持つ（状態復元が可能）

---

### 5.2 並び順（推奨）
1) Built-in（カテゴリ順）
2) User（更新日時順）

---

### 5.3 UI表示ルール（推奨）
- built-in：バッジで「標準」表示
- user：編集/削除ボタンを表示
- 無料版：user セクション非表示（課金条件がある場合）

---

## 6. User Preset（状態保存）仕様

User Preset は「切断点だけでなく学習状態全体」を保存・復元する。

### 6.1 保存対象（例）
- 立体サイズ（lx, ly, lz）
- SnapPointID 配列（切断点）
- 切断反転フラグ
- 頂点ラベル設定（labelMap）
- 表示設定（透明/面ラベル/辺ラベルモード等）
- プリセット名、説明、カテゴリ

---

### 6.2 データ構造

    interface UserPresetState {
      id: string          // UUID
      name: string
      description?: string
      category?: string

      cube: {
        size: { lx: number; ly: number; lz: number }
        labelMap?: Record<string, string>  // VertexID -> 表示ラベル
      }

      cut: {
        snapPoints: string[]   // SnapPointID
        inverted: boolean

        // 任意（キャッシュ扱い）
        result?: {
          outline: string[]    // SnapPointID
          intersections: Array<{
            id: string
            type: "snap" | "intersection"
            edgeId?: string
            ratio?: { numerator: number; denominator: number }
            faceIds?: string[]
          }>
          cutSegments: Array<{
            startId: string
            endId: string
            faceIds?: string[]
          }>
        }
      }

      display: {
        showVertexLabels: boolean
        showFaceLabels: boolean
        edgeLabelMode: "visible" | "popup" | "hidden"
        showCutSurface: boolean
        showPyramid: boolean
        cubeTransparent: boolean
      }

      createdAt: string
      updatedAt: string
    }

注記：
- `cut.result` は Derived（再計算可能）なので、保存しても良いが「キャッシュ」として扱う
- 状態復元の正は `cut.snapPoints` と display/cube 等の SSOT/Presentation を優先する

---

### 6.3 保存と復元の流れ（推奨）

#### 保存
1) 現在状態を `UserPresetState` に変換
2) 永続化（StorageAdapter: IndexedDB / SQLite など）

#### 復元（適用）
1) `cube.size` を反映
2) `cube.labelMap` を反映
3) `cut.snapPoints` を SelectionManager へ渡す
4) `cut.inverted` を反映
5) `display` を UI に反映
6) 必要なら Cutter/Resolver により CutResult を再計算する

---

---

### 6.4 StorageAdapter（User Preset 永続化アダプタ）

User Preset の保存先は、将来の変更（IndexedDB / SQLite(WASM) / それ以外）に備えて差し替え可能とする。
そのため、永続化処理は StorageAdapter に抽象化する。

#### 6.4.1 目的
- 無料版/有料版で保存機能を切り替えられるようにする
- 保存先の実装詳細を UI / Presetロジックから分離する

#### 6.4.2 インターフェース

    interface StorageAdapter<T> {
      isEnabled(): boolean;
      list(): Promise<T[]>;
      get(id: string): Promise<T | null>;
      save(item: T): Promise<void>;
      remove(id: string): Promise<void>;
    }

#### 6.4.3 無料版：NoopStorage
- `isEnabled()` は false
- list/get/save/remove は空実装（保存不可）
- UI は `isEnabled()` を基準に保存UIを表示しない

#### 6.4.4 有料版：PaidStorage
初期実装は IndexedDB とし、将来的に SQLite(WASM) に差し替え可能とする。
API互換は維持する。

##### 初期実装（IndexedDB）
- store 名: `user_presets`
- primary key: `id`
- index: `name`, `updatedAt`

##### 将来実装（SQLite(WASM)）
- OPFS を保存先に利用する
- StorageAdapter の API 互換を維持する

#### 6.4.5 利用ルール
- UI は `isEnabled()` の結果で保存機能を出し分ける
- 無料版：保存ボタンを出さない
- 有料版：保存/一覧/削除 UI を表示する

---

## 7. 適用フロー（Built-in / User）

### 7.1 Built-in の適用
- SnapPointID のみを適用する
- 展開や切断結果は必要に応じて再計算する

### 7.2 User の適用
- UserPresetState を全体復元する
- CutResult キャッシュを使うかは任意
  - 推奨：基本は再計算（整合性優先）
  - 高速化したい場合のみキャッシュを使う

---

## 8. 互換性と拡張性

### 8.1 互換性（注意）
- SnapPointID の仕様が変わると Built-in / User の両方に影響する
- 旧形式が存在する場合は「snapPointsのみを持つ簡易形式」として読み込み可能にしてよい

### 8.2 将来拡張（例）
- 展開図の状態（NetPlan選択 / 展開進捗）を保存
- カメラ位置の保存
- 学習モード（問題状態、ヒント表示）を保存

---

## 9. まとめ

- プリセットは「典型切断の再現」と「ユーザー状態の保存」を統一的に扱う機能である
- Built-in は SnapPointID を適用する軽量プリセット
- User は 状態全体（サイズ・ラベル・表示・切断入力など）を復元する
- 一覧は共通型で統一し、適用時のみ種別で分岐する
- CutResult 等の派生情報はキャッシュとして保存してよいが、正は SSOT に置く
