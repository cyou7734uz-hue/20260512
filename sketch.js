let capture;
let faceMesh;
let faces = [];
let options = { maxFaces: 1, refineLandmarks: false, flipHorizontal: false };

function gotFaces(results) {
  // 儲存辨識結果
  faces = results;
}

function setup() {
  // 建立一個全螢幕的畫布
  createCanvas(windowWidth, windowHeight);
  
  // 擷取攝影機影像
  capture = createCapture(VIDEO, { flipped: false });
  capture.size(640, 480);
  // 隱藏預設產生的 HTML 影片元件，只在畫布上繪製
  capture.hide();

  // 初始化 FaceMesh 模型
  faceMesh = ml5.faceMesh(options);
  // 開始持續辨識
  faceMesh.detectStart(capture, gotFaces);
}

function draw() {
  // 設定背景顏色為 e7c6ff
  background('#e7c6ff');

  // 計算影像的顯示寬高（整個畫布的 50%）
  let videoW = width * 0.5;
  let videoH = height * 0.5;

  // 計算置中座標
  let x = (width - videoW) / 2;
  let y = (height - videoH) / 2;

  // 處理左右顛倒（鏡像）並繪製影像
  push();
  // 將座標原點移至影像顯示區域的右側邊界，以便進行翻轉
  translate(x + videoW, y);
  // 水平縮放 -1 達成鏡像效果
  scale(-1, 1);
  // 繪製影像 (此時座標已平移，所以從 0, 0 開始繪製即可)
  image(capture, 0, 0, videoW, videoH);

  // 繪製耳環效果
  if (faces.length > 0) {
    let face = faces[0];
    
    // MediaPipe FaceMesh 索引值：132 (右耳垂附近), 361 (左耳垂附近)
    let earlobePoints = [face.keypoints[132], face.keypoints[361]];
    
    // 計算縮放比例
    let sX = videoW / capture.width;
    let sY = videoH / capture.height;

    fill(255, 255, 0); // 黃色
    noStroke();

    earlobePoints.forEach(p => {
      if (p) {
        // 在耳垂位置往下畫三個圓圈
        for (let i = 0; i < 3; i++) {
          circle(p.x * sX, (p.y * sY) + (i * 15), 10);
        }
      }
    });
  }
  pop();
}

// 當視窗大小改變時，重新調整畫布大小以維持全螢幕
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
