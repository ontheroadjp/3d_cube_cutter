# PlaneBuilder モジュール仕様書

Status: Superseded
Summary: 置き換え先は docs/technical/specification/geometry/geometry_spec.md


SnapPoint から切断平面を生成する仕様を定義する。

## ファイル名
docs/technical/specification/geometry/geometry_spec.md

## 目的
- 3 つ以上の SnapPoint から切断平面を安定的に生成する。
- 浮動小数点誤差の影響を低減。
- SnapPointID を活用して、構造主体アーキテクチャに対応する平面情報を保持。

---

## 主な関数 / メソッド

    setFromPoints(points: SnapPoint[]): THREE.Plane | null
    - 入力: SnapPoint 配列（3 点以上）
    - 出力: THREE.Plane（同一直線上の場合は null）
    - 備考: 点が同一直線上かの判定を内部で行う

    validatePlane(plane: THREE.Plane): boolean
    - 入力: Plane
    - 出力: true / false（法線長 Sq をチェック）
    - 備考: 微小な法線ベクトルを除外し安定化

---

## 依存関係
- THREE.js
- SnapPoint インターフェース

---

## SnapPoint 型例

    interface SnapPoint {
        id: string;        // SnapPointID
        position?: THREE.Vector3; // 派生座標（必要時のみ算出）
        type: 'vertex' | 'edge' | 'face';
        edgeRatio?: { numerator: number; denominator: number };
        faceId?: string;
    }

---

## 作業上の注意
- 常に 3 点が同一直線上でないことを保証する。
- Plane.normal は正規化済みで返す。
- SnapPointID を保持して交点計算に連動可能とする。
- 座標は派生情報としてのみ扱う。
