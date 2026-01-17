# 実装仕様・開発者向けドキュメント

Status: Legacy

このドキュメントは、`立体切断シミュレーター`の内部実装に関する技術的な詳細と、新たな機能追加や修正を行う開発者向けのガイドラインを記載します。

## 1. プロジェクト構成

主要なファイルとその役割は以下の通りです。

-   `main.js`: アプリケーション全体のエントリーポイント。各種マネージャの初期化、イベントリスナーの設定、3Dシーンのレンダリングループなど、全体の統括を行います。
-   `index.html`: アプリケーションの骨格となるHTML。UI要素のコンテナが定義されています。
-   `js/Cube.js`: 直方体（頂点、辺、面）の3Dオブジェクト生成と、関連するラベルや当たり判定用メッシュの管理を行います。
-   `js/SelectionManager.js`: ユーザーによる切断点の選択状態を管理します。選択点の追加、リセット、マーカーやラベルの生成などを担当します。
-   `js/Cutter.js`: `three-bvh-csg`ライブラリを使用し、3Dモデルの切断（CSG演算）を実行します。切断面や切り取られた部分のメッシュを生成します。
-   `js/UIManager.js`: UI要素の参照(DOM)、イベントリスナーの登録、および表示/非表示の切り替えなどのUI操作全般をカプセル化します。
-   `js/presets/presetData.js`: プリセットの全データ（名前、カテゴリ、切断点を算出するロジック）を定義する静的なデータファイルです。
-   `js/presets/PresetManager.js`: `presetData.js`のデータを読み込み、指定されたプリセットを適用する役割を持ちます。
-   `js/net/NetManager.js`: 展開図の表示と、その上への切断線の描画を管理します。

## 2. 主要なUIの挙動

現在のUIは、`#mode-selector`によって切り替えられる3つのモード（`free`, `preset`, `settings`）を軸に、表示されるUIが動的に変化します。

-   **イベントフローの中心:** `main.js`の`ui.onModeChange`イベントリスナーが、モードの変更を検知してUIの表示を切り替える起点となります。
-   **表示制御:**
    -   `onModeChange`は、まず全てのオプションUI（プリセット用、設定用）を非表示にします。
    -   選択されたモードに応じて、`UIManager`の`showPresetControls`, `showSettingsControls`, `showSettingsPanels`といったメソッドを呼び出し、対応するUIコンテナを表示します。
-   **CSSクラスによる制御:** UI要素の表示/非表示は、`UIManager`内でBootstrapの`d-none`クラスの付け外しによって制御されます。`style`属性を直接操作するよりもCSSの競合に強く、安定した表示切替を実現しています。

## 3. 3Dインタラクションの実装

### 3.1. 吸着（スナップ）処理

-   **担当ファイル:** `main.js`の`mousemove`イベントリスナー
-   **仕組み:**
    1.  `THREE.Raycaster`を使用し、マウスカーソル位置から3D空間へのレイ（光線）を飛ばします。
    2.  当たり判定の対象は、`Cube.js`で生成された**目に見えない当たり判定専用のメッシュ**（`vertexMeshes`, `edgeMeshes`）です。これにより、見た目のモデルと判定ロジックを分離しています。
    3.  レイが辺のメッシュに当たった場合、交差した点の座標 (`intersection.point`) と辺の方向ベクトルから、辺の始点からの距離 (`projectedLength`) を計算します。
    4.  `snappedLength = Math.round(projectedLength)` という処理により、その距離を最も近い整数値に丸め、**1cm単位のスナップ**を実現しています。
    5.  最終的な吸着点 (`snappedPoint`) は、この`snappedLength`を用いて算出されます。

### 3.2. 選択点マーカーの色分け

-   **担当ファイル:** `main.js` (`mousemove`), `main.js` (`click`), `SelectionManager.js` (`addPoint`)
-   **仕組み:**
    1.  **情報生成 (`main.js:mousemove`):**
        -   辺の上で中点（`snappedLength`と`edgeLength / 2`がほぼ等しい）が検出されると、`isMidpoint`フラグが`true`に設定されます。
        -   この`isMidpoint`フラグを含む、吸着点の全ての情報が`snappedPointInfo`オブジェクトに格納されます。
    2.  **情報伝達 (`main.js:click`):**
        -   クリック時、`mousemove`で最後に設定された`snappedPointInfo`オブジェクトが、そのまま`selection.addPoint`メソッドに渡されます。
    3.  **マーカー生成 (`SelectionManager.js:addPoint`):**
        -   `addPoint`メソッドは、受け取った`selectionInfo`オブジェクトから`isMidpoint`フラグを取り出します。
        -   `const markerColor = isMidpoint ? 0x00ff00 : 0xff0000;` のように、フラグの値に応じてマーカーの色を緑か赤に決定し、`createMarker`関数を呼び出します。

## 4. プリセット機能の実装方法

### 4.1. 新しいプリセットの追加手順

1.  **`js/presets/presetData.js`を開きます。**
2.  `PRESETS`配列の末尾に、新しいプリセット定義オブジェクトを追加します。
3.  オブジェクトには、最低でも以下のプロパティを定義します。
    -   `name` (string): UIのボタンに表示される名前。
    -   `category` (string): `"triangle"`, `"quad"`, `"poly"` のいずれか。UIのカテゴリ絞り込みに使われます。
    -   `description` (string): プリセットの説明（現在UIには表示されていませんが、将来のため）。
    -   `getPoints` (function): 選択点を計算して返す関数。
4.  **`getPoints`関数の実装:**
    -   この関数は引数として`cube`オブジェクトを受け取ります。
    -   戻り値として、`{ point: THREE.Vector3, object: THREE.Object3D }`という形式のオブジェクトを要素とする**配列**を返す必要があります。
    -   `point`は切断点の3D座標、`object`はその点が属する辺または頂点の当たり判定用オブジェクトです。
    -   `cube`オブジェクトが提供するヘルパーメソッドを利用すると便利です。
        -   `cube.getVertexPosition('A')`: 頂点Aの座標を取得。
        -   `cube.getVertexObjectByName('A')`: 頂点Aの当たり判定オブジェクトを取得。
        -   `cube.getEdgeLine('AB')`: 辺ABの`THREE.Line3`オブジェクトを取得。
        -   `cube.getEdgeObjectByName('AB')`: 辺ABの当たり判定オブジェクトを取得。

**【実装例】**
```javascript
{
    name: "新しいプリセット",
    category: "triangle",
    description: "頂点A, G, と辺BCの中点を結ぶ",
    getPoints: (cube) => {
        const vertexA = cube.getVertexPosition('A');
        const vertexG = cube.getVertexPosition('G');
        const edgeBC = cube.getEdgeLine('BC');
        
        // 中点を計算
        const midPointBC = new THREE.Vector3().lerpVectors(edgeBC.start, edgeBC.end, 0.5);

        return [
            { point: vertexA, object: cube.getVertexObjectByName('A') },
            { point: vertexG, object: cube.getVertexObjectByName('G') },
            { point: midPointBC, object: cube.getEdgeObjectByName('BC') }
        ];
    }
}
```

## 5. その他留意点

-   **リセット処理:** `main.js`には2種類のリセット関連処理があります。
    -   `resetScene()`: 3Dシーンの状態（選択点、切断状態など）のみをリセットします。
    -   `ui.resetToFreeSelectMode()`: UIの状態のみを初期の「自由選択モード」に戻します。
    -   「リセット」ボタン押下時には、これら両方が呼び出され、完全な初期状態に戻ります。
-   **CSG (Constructive Solid Geometry):** 立体の切断処理は`Cutter.js`内で`three-bvh-csg`ライブラリを用いて行われます。`SUBTRACTION`（引き算）で切り取られた後の立体を、`INTERSECTION`（積集合）で切り取られた側の立体をそれぞれ生成しています。
