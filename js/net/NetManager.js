// 展開図 (Development / Net) を管理するクラス
// 立方体の展開図（十字型）を表示し、そこに切断線を描画する

export class NetManager {
    constructor() {
        // コンテナの作成（初回のみ）
        this.container = document.createElement('div');
        this.container.id = 'net-view';
        this.container.style.position = 'absolute';
        this.container.style.top = '10px';
        this.container.style.right = '10px';
        this.container.style.width = '300px';
        this.container.style.height = '400px';
        this.container.style.background = 'rgba(255, 255, 255, 0.9)';
        this.container.style.border = '1px solid #ccc';
        this.container.style.borderRadius = '8px';
        this.container.style.display = 'none'; // 初期は非表示
        this.container.style.zIndex = '20';
        this.container.style.padding = '10px';
        
        // 閉じるボタン
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '閉じる';
        closeBtn.onclick = () => this.hide();
        this.container.appendChild(closeBtn);
        
        // キャンバス
        this.canvas = document.createElement('canvas');
        this.canvas.width = 280;
        this.canvas.height = 350;
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        
        document.body.appendChild(this.container);
        
        // 展開図のレイアウト定義 (単位: グリッド座標 1x1)
        // 十字型展開図
        //   T
        // L F R B
        //   D
        // F:Front, B:Back, L:Left, R:Right, T:Top, D:Down(Bottom)
        // インデックス対応 (Cube.jsと合わせる必要あり)
        // Cube vertices: 
        // 0:A(-,-,-), 1:B(+,-,-), 2:C(+,+,-), 3:D(-,+,-)  (Back Face? z negative) -> No, standard THREE BoxGeometry definition differs.
        // Let's verify Cube.js vertices logic.
        // vertices[0]: -x,-y,-z (Left,Bottom,Back) -> A
        // vertices[1]: +x,-y,-z (Right,Bottom,Back) -> B
        // vertices[2]: +x,+y,-z (Right,Top,Back) -> C
        // vertices[3]: -x,+y,-z (Left,Top,Back) -> D
        // vertices[4]: -x,-y,+z (Left,Bottom,Front) -> E
        // vertices[5]: +x,-y,+z (Right,Bottom,Front) -> F
        // vertices[6]: +x,+y,+z (Right,Top,Front) -> G
        // vertices[7]: -x,+y,+z (Left,Top,Front) -> H
        
        // Faces definition by vertex indices (CCW from outside)
        // Front (z+): E,F,G,H (4,5,6,7)
        // Back (z-): B,A,D,C (1,0,3,2)
        // Top (y+): D,C,G,H (3,2,6,7)
        // Bottom (y-): A,B,F,E (0,1,5,4)
        // Right (x+): B,C,G,F (1,2,6,5)
        // Left (x-): E,H,D,A (4,7,3,0)
        
        // Layout on Canvas (Grid 4x3)
        // Col: 0 1 2 3
        // Row0: . T . .
        // Row1: L F R B
        // Row2: . D . .
        
        this.layout = {
            scale: 50, // 1マスのピクセルサイズ
            offsetX: 20,
            offsetY: 20,
            faces: [
                { name: 'Front', indices: [4,5,6,7], grid: {x:1, y:1} },
                { name: 'Back',  indices: [1,0,3,2], grid: {x:3, y:1} }, // Rightの隣
                { name: 'Top',   indices: [7,6,2,3], grid: {x:1, y:0}, connectTo: 'Front' }, // Frontの上 (H,G,C,D) -> Frontは(E,F,G,H)なので、Frontの上辺HGとTopの下辺HGが接続
                // Top indices: D,C,G,H -> Front(E,F,G,H)の上はH-G. Topの下はH-G (7-6). 
                // Topの並びは標準化が必要。
                // 展開図の「上」方向をY-とするキャンバス座標系に注意。
                
                { name: 'Bottom', indices: [0,1,5,4], grid: {x:1, y:2} },
                { name: 'Left',   indices: [0,3,7,4], grid: {x:0, y:1} }, // Left(E,H,D,A) -> Front(E,F,G,H)の左はE-H. Leftの右はE-H.
                { name: 'Right',  indices: [1,2,6,5], grid: {x:2, y:1} }, // Right(B,C,G,F) -> Front(E,F,G,H)の右はF-G. Rightの左はF-G.
            ]
        };
    }

    show() {
        this.container.style.display = 'block';
    }

    hide() {
        this.container.style.display = 'none';
    }

    toggle() {
        if (this.container.style.display === 'none') this.show();
        else this.hide();
    }

    // 切断線を描画
    // cutLines: Array of Line3 (切断線分) - これらはWorld座標系
    // cube: Cube instance (to get vertices and transform to local/face coords)
    update(cutLines, cube) {
        if (this.container.style.display === 'none') return;
        
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const L = this.layout;
        const s = L.scale;
        
        // グリッド描画
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        L.faces.forEach(face => {
            const x = L.offsetX + face.grid.x * s;
            const y = L.offsetY + face.grid.y * s;
            ctx.strokeRect(x, y, s, s);
            // 面の名前
            ctx.fillStyle = '#999';
            ctx.font = '10px Arial';
            ctx.fillText(face.name, x+2, y+10);
        });

        if(!cutLines || cutLines.length === 0) return;

        // 切断線の描画
        // 各線分について、どの面の上にあるか判定し、その面の2D座標に変換して描画
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.beginPath();

        // 面の法線と中心点（判定用）
        // Cubeのサイズは可変なので、現在の頂点座標を使う
        const vertices = cube.vertices;
        
        // 簡易的な面判定: 線分の中点が、面の中心から法線方向に垂直な距離がほぼ0かどうか
        // あるいは、線分の両端点がその面を構成する4頂点の平面上にあるか。
        
        // 線分ごとのループ
        // outline は LineLoop なので、点列を受け取ったほうが楽だが、Line3[] で来る想定で。
        // cutter.outline.geometry から点列を取得したほうが良いかも。
        // ここでは引数 cutLines を Line3[] と仮定。
        
        cutLines.forEach(line => {
            const p1 = line.start;
            const p2 = line.end;
            const mid = p1.clone().add(p2).multiplyScalar(0.5);
            
            // どの面に属するか？
            // 全面をチェック
            L.faces.forEach(face => {
                // 面の4頂点
                const v0 = vertices[face.indices[0]];
                const v1 = vertices[face.indices[1]];
                const v2 = vertices[face.indices[2]];
                
                // 平面を作る
                const plane = new THREE.Plane();
                plane.setFromCoplanarPoints(v0, v1, v2);
                
                // 距離チェック
                if (Math.abs(plane.distanceToPoint(mid)) < 0.01) {
                    // この面にある。
                    // 3D座標(p1, p2)を2D面座標(u, v) [0~1] に変換
                    // そのために、面の「左上」「右上」「左下」などを定義する必要がある。
                    // 展開図の向きに合わせてローカル座標系を定義。
                    
                    // Front (E,F,G,H) -> Grid(1,1)
                    // 左上:H, 右上:G, 左下:E, 右下:F ? 
                    // 座標系: x右, y下 (Canvas)
                    // 3D Front: x右, y上
                    // よって 3D(x, y) -> 2D(x, -y)
                    
                    // 各面ごとに「Canvas上の左上に対応する3D頂点」と「X軸ベクトル」「Y軸ベクトル」を定義すれば変換可能。
                    // Front: 左上H(-x,+y,+z), 右上G(+x,+y,+z), 左下E(-x,-y,+z)
                    // Canvas X軸: H->G (x増加)
                    // Canvas Y軸: H->E (y減少)
                    
                    const drawLine = (start3d, end3d) => {
                        const uv1 = this.map3Dto2D(start3d, face, vertices);
                        const uv2 = this.map3Dto2D(end3d, face, vertices);
                        
                        const ox = L.offsetX + face.grid.x * s;
                        const oy = L.offsetY + face.grid.y * s;
                        
                        ctx.moveTo(ox + uv1.x * s, oy + uv1.y * s);
                        ctx.lineTo(ox + uv2.x * s, oy + uv2.y * s);
                    };
                    drawLine(p1, p2);
                }
            });
        });
        
        ctx.stroke();
    }
    
    map3Dto2D(p, face, vertices) {
        // 面ごとの基準点（Canvasの左上になる点）と方向
        // indices順序に依存
        // Front[4,5,6,7] = E,F,G,H.
        // Canvas上は 左上H, 右上G, 左下E, 右下F という向きにしたい。
        // indicesはCCW: E->F->G->H.
        // 左上は H(index 7) = indices[3].
        // 右方向は H->G = indices[3]->indices[2].
        // 下方向は H->E = indices[3]->indices[0].
        
        // Face定義ごとに「左上インデックス」「右インデックス」「下インデックス」を手動マッピングする。
        // Front(E,F,G,H): TopLeft:H(7), Right:G(6), Down:E(4)
        // Back(B,A,D,C): 展開図でBackはRightの右。
        // ...これは複雑。
        
        // 簡易マッピング:
        // 全ての面で「ローカルUV」を計算する。
        // UVは [0,0]が左上, [1,1]が右下。
        
        // Front (z+): x(- to +), y(+ to -)  -> u=(x+w/2)/w, v=1-(y+h/2)/h
        // Back (z-): ...
        
        // 3D座標から比率(0~1)を取り出す
        // Cubeサイズが必要。verticesから計算。
        const min = new THREE.Vector3(Infinity,Infinity,Infinity);
        const max = new THREE.Vector3(-Infinity,-Infinity,-Infinity);
        vertices.forEach(v => {
            min.min(v); max.max(v);
        });
        const size = max.clone().sub(min); // w, h, d
        
        // 相対座標 (0~1)
        const rel = p.clone().sub(min).divide(size); 
        // rel.x, rel.y, rel.z は 0~1
        
        let u=0, v=0;
        
        switch(face.name) {
            case 'Front': // z=max. x:0->1(Left->Right), y:1->0(Top->Bottom)
                u = rel.x; v = 1 - rel.y; 
                break;
            case 'Back': // z=min. BackはRightの右にあるので、裏から見た図ではなく「展開して表」。
                // Right(x+)の右 -> Back(z-).
                // 展開図の並び: L-F-R-B.
                // Front(z+) -> Right(x+) -> Back(z-).
                // ぐるっと回る。
                // Front: x増加方向。Right: z減少方向。Back: x減少方向。
                u = 1 - rel.x; v = 1 - rel.y;
                break;
            case 'Left': // x=min. z:0->1(Back->Front)? No, L is left of Front.
                // Frontの左はLeft. Frontの左辺はE-H(x=min, z=max).
                // Leftの右辺はE-H.
                // Leftは奥(z-)から手前(z+)へ展開？
                // L-F-R-B の並びなら、円柱状に開いている。
                // Left: z:0->1(Back->Front) が u:0->1. y:1->0.
                u = rel.z; v = 1 - rel.y;
                break;
            case 'Right': // x=max. z:1->0(Front->Back).
                u = 1 - rel.z; v = 1 - rel.y;
                break;
            case 'Top': // y=max. Frontの上。
                // Frontの上辺はH-G(x:0->1, z=max).
                // Topの下辺はH-G.
                // Top: x:0->1, z:0->1(Back->Front) -> v:0->1 ??
                // Front(z=max)が下。Back(z=0)が上。
                u = rel.x; v = rel.z; // z=0(Back)がTop(v=0), z=1(Front)がBottom(v=1)
                break;
            case 'Bottom': // y=min. Frontの下。
                // Frontの下辺はE-F(x:0->1, z=max).
                // Bottomの上辺はE-F.
                // Bottom: x:0->1. z:1->0(Front->Back).
                // Front(z=max)が上(v=0).
                u = rel.x; v = 1 - rel.z;
                break;
        }
        return {x:u, y:v};
    }
}
