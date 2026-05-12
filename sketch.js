let video;
let faceMesh;
let faces = [];

let strawberryMask;
let bananaMask;
let currentMask = "strawberry";

// 新增：耳環圖片管理
let earringImages = {};
let earringTypes = ["earring1", "earring2", "earring3"]; // 請確保資料夾內有這些檔案
let currentEarring = "earring1";
let earringButtons = [];

// 新增：亮晶晶粒子相關變數
let sparkles = []; // 儲存所有活躍的粒子
let lastLeftPoint = { x: 0, y: 0 }; // 追蹤上一影格的左臉關鍵點
let lastRightPoint = { x: 0, y: 0 }; // 追蹤上一影格的右臉關鍵點
let lastFaceAngle = 0; // 追蹤上一影格的臉部角度

let btnStrawberry;
let btnBanana;

function preload() {
  // 載入水果臉譜圖片
  strawberryMask = loadImage("assets/strawberry.png");
  bananaMask = loadImage("assets/banana.png");

  // 載入耳環資料夾內的各個圖片
  for (let type of earringTypes) {
    // 增加錯誤回呼函數，避免單一圖片缺失導致整個程式掛掉
    earringImages[type] = loadImage(`assets/earrings/${type}.png`, 
      img => console.log(`${type} 載入成功`),
      err => {
        console.error(`無法載入耳環圖片: assets/earrings/${type}.png。請檢查資料夾名稱是否為 earrings (複數) 且包含該檔案。`);
      }
    );
  }

  // 載入 FaceMesh 模型
  faceMesh = ml5.faceMesh({
    maxFaces: 1,
    flipped: true
  });
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  video = createCapture(VIDEO, { flipped: true });
  video.size(width, height);
  video.hide();

  faceMesh.detectStart(video, gotFaces);

  createButtons();
}

function draw() {
  background(0);

  // 顯示鏡頭畫面 (直接顯示即可，因為 createCapture 已設定 flipped: true)
  image(video, 0, 0, width, height);

  // 加一層暗色，讓臉譜更明顯
  fill(0, 80);
  noStroke();
  rect(0, 0, width, height);

  if (faces.length > 0) {
    drawFruitMask(faces[0]);
    drawEarrings(faces[0]);
  } else {
    drawWaitingText();
  }

  drawTitle();
  updateAndDrawSparkles(); // 在所有元素繪製完畢後，繪製亮晶晶粒子，確保它們在最上層
}

function gotFaces(results) {
  faces = results;
}

function drawFruitMask(face) {
  let keypoints = face.keypoints;

  // 取得關鍵點：10(額頭頂), 152(下巴底), 234(右臉邊緣), 454(左臉邊緣)
  let topFace = keypoints[10];    // 額頭
  let chin = keypoints[152];      // 下巴
  let leftFace = keypoints[234];  // 臉頰左側
  let rightFace = keypoints[454]; // 臉頰右側

  if (!leftFace || !rightFace || !topFace || !chin) return;

  // 1. 計算臉部的中心點
  let faceCenterX = (leftFace.x + rightFace.x) / 2;
  let faceCenterY = (topFace.y + chin.y) / 2;

  // 2. 計算精確的寬度與高度 (加上 1.5 倍縮放以覆蓋全臉)
  let faceW = dist(leftFace.x, leftFace.y, rightFace.x, rightFace.y) * 1.5;
  let faceH = dist(topFace.x, topFace.y, chin.x, chin.y) * 1.5;

  // 3. 根據左右臉關鍵點計算旋轉角度
  let angle = atan2(rightFace.y - leftFace.y, rightFace.x - leftFace.x);

  let maskImg;
  let yOffset = 0; // 用於微調垂直位置

  if (currentMask === "strawberry") {
    maskImg = strawberryMask;
    yOffset = -faceH * 0.05; // 草莓稍微往上移，讓葉子位置更好看
    faceW *= 1.1;
    faceH *= 1.1;
  } else if (currentMask === "banana") {
    maskImg = bananaMask;
    yOffset = -faceH * 0.1;  // 香蕉圖片較長，稍微上移對準五官
    faceW *= 1.1;
    faceH *= 1.3;
  }

  push();
  imageMode(CENTER);
  translate(faceCenterX, faceCenterY);
  rotate(angle);

  // 讓臉譜稍微上下浮動，有短劇變臉感
  let bounce = sin(frameCount * 0.05) * 4;

  // 繪製臉譜，加入 yOffset 與 bounce 效果
  image(maskImg, 0, yOffset + bounce, faceW, faceH);
  pop();
}

/**
 * 繪製耳環效果
 * @param {object} face - FaceMesh 偵測到的臉部物件
 */
function drawEarrings(face) {
  // 安全檢查：如果目前選擇的耳環圖片尚未載入成功，則不執行繪製
  if (!earringImages[currentEarring] || earringImages[currentEarring].width <= 1 || !earringImages[currentEarring].canvas) return;

  let keypoints = face.keypoints;

  // 使用使用者要求的側臉關鍵點
  let leftPoint = keypoints[234];  // 臉部左側 (畫面上左側)
  let rightPoint = keypoints[454]; // 臉部右側 (畫面上右側)

  if (!leftPoint || !rightPoint) return;

  // 1. 計算臉部的傾斜角度 (Face Tilt)
  let faceAngle = atan2(rightPoint.y - leftPoint.y, rightPoint.x - leftPoint.x);

  // 2. 計算臉部寬度作為縮放基準
  let faceW = dist(leftPoint.x, leftPoint.y, rightPoint.x, rightPoint.y);
  let earringSize = faceW * 0.12; 

  // 3. 偵測快速動態：比對上一影格的座標與角度
  let moveDist = dist(leftPoint.x, leftPoint.y, lastLeftPoint.x, lastLeftPoint.y);
  let rotSpeed = abs(faceAngle - lastFaceAngle);

  // 設定觸發門檻 (移動超過 7 像素或旋轉變化超過 0.05 弧度)
  // 增加 lastLeftPoint.x > 0 判斷是為了避免程式啟動第一格的跳躍觸發
  if (lastLeftPoint.x > 0 && (moveDist > 7 || rotSpeed > 0.05)) {
    triggerSparkles(leftPoint.x, leftPoint.y, earringSize);
    triggerSparkles(rightPoint.x, rightPoint.y, earringSize);
  }

  // 4. 更新追蹤變數，供下一影格比對使用
  lastLeftPoint = { x: leftPoint.x, y: leftPoint.y };
  lastRightPoint = { x: rightPoint.x, y: rightPoint.y };
  lastFaceAngle = faceAngle;

  // 5. 實作重力感應擺動 (Gravity Swing)
  let gravityInertia = -faceAngle; 
  let naturalOscillation = sin(frameCount * 0.1) * 0.15; // 基礎的輕微晃動
  let totalSwing = gravityInertia + naturalOscillation;

  // 使用目前選擇的耳環圖片
  let img = earringImages[currentEarring];

  // 繪製左右耳環
  drawSingleEarring(leftPoint.x, leftPoint.y, earringSize, img, totalSwing);
  drawSingleEarring(rightPoint.x, rightPoint.y, earringSize, img, totalSwing);
}

/**
 * 輔助函式：繪製單個吊墜耳環
 */
function drawSingleEarring(x, y, size, img, swing) {
  push();
  translate(x, y);
  
  // 稍微向外偏移一點，避免耳環直接重疊在臉頰上，更有「懸掛」在耳朵邊緣的感覺
  let xOffset = (x < width/2) ? -size*0.2 : size*0.2;
  translate(xOffset, size * 0.3);
  
  // 應用計算後的總擺動角度
  rotate(swing);

  // 畫耳環吊線 (金色質感)
  stroke(255, 215, 0); // Gold color
  strokeWeight(size * 0.08);
  line(0, 0, 0, size * 0.5);

  // 畫掛勾小圓點
  fill(255, 215, 0);
  noStroke();
  circle(0, 0, size * 0.15);

  imageMode(CENTER);
  image(img, 0, size * 0.8, size, size);
  pop();
}

/**
 * 產生亮晶晶的粒子特效
 * @param {number} x - 產生點的 X 座標 (耳環掛點)
 * @param {number} y - 產生點的 Y 座標 (耳環掛點)
 * @param {number} baseSize - 基準大小，用於決定粒子大小，通常是耳環的大小
 */
function triggerSparkles(x, y, baseSize) {
  let numSparkles = floor(random(3, 6)); // 每次產生 3 到 5 個粒子
  for (let i = 0; i < numSparkles; i++) {
    // 粒子大小隨機，約為耳環大小的 10% 到 30%
    let sparkleSize = random(baseSize * 0.1, baseSize * 0.3);
    // 粒子位置隨機分佈在耳環掛點附近，並稍微偏下
    let sparkleX = x + random(-baseSize * 0.3, baseSize * 0.3);
    let sparkleY = y + random(baseSize * 0.5, baseSize * 1.2); 
    
    // 粒子生命週期 (影格數)
    let sparkleLifespan = floor(random(20, 40)); 
    // 每影格減少的透明度
    let sparkleFadeRate = 255 / sparkleLifespan; 
    // 粒子隨機水平速度，讓它稍微向外擴散
    let sparkleVx = random(-1, 1); 
    // 粒子隨機垂直速度，讓它稍微向上或向下飄動
    let sparkleVy = random(-2, -0.5); 

    sparkles.push({
      x: sparkleX,
      y: sparkleY,
      size: sparkleSize,
      alpha: 255, // 初始完全不透明
      lifespan: sparkleLifespan,
      fadeRate: sparkleFadeRate,
      vx: sparkleVx,
      vy: sparkleVy,
      // 粒子顏色為亮黃色到白色，增加閃爍感
      color: color(255, 255, random(150, 255)) 
    });
  }
}

/**
 * 更新並繪製所有亮晶晶的粒子
 */
function updateAndDrawSparkles() {
  // 從後往前遍歷，以便安全地移除粒子
  for (let i = sparkles.length - 1; i >= 0; i--) {
    let s = sparkles[i];

    s.x += s.vx; // 更新位置
    s.y += s.vy;
    s.alpha -= s.fadeRate; // 逐漸變淡
    s.lifespan--; // 減少生命週期

    // 繪製粒子
    push();
    noStroke();
    fill(red(s.color), green(s.color), blue(s.color), s.alpha);
    circle(s.x, s.y, s.size);
    pop();

    // 移除生命週期結束或完全透明的粒子
    if (s.lifespan <= 0 || s.alpha <= 0) {
      sparkles.splice(i, 1);
    }
  }
}

function createButtons() {
  btnStrawberry = createButton("🍓 草莓臉");
  btnStrawberry.position(20, height - 80);
  btnStrawberry.mousePressed(() => {
    currentMask = "strawberry";
  });

  btnBanana = createButton("🍌 香蕉臉");
  btnBanana.position(130, height - 80);
  btnBanana.mousePressed(() => {
    currentMask = "banana";
  });

  // 動態產生耳環切換按鈕
  for (let i = 0; i < earringTypes.length; i++) {
    let type = earringTypes[i];
    let btn = createButton(`💎 ${type.toUpperCase()}`);
    btn.position(20 + (i * 90), height - 130); // 放在臉譜按鈕上方
    btn.mousePressed(() => {
      currentEarring = type;
    });
    styleButton(btn);
    earringButtons.push(btn);
  }

  styleButton(btnStrawberry);
  styleButton(btnBanana);
}

function styleButton(btn) {
  btn.style("font-size", "18px");
  btn.style("padding", "10px 16px");
  btn.style("border-radius", "999px");
  btn.style("border", "none");
  btn.style("background", "rgba(255,255,255,0.85)");
  btn.style("color", "#111");
  btn.style("font-weight", "bold");
  btn.style("cursor", "pointer");
}

function drawWaitingText() {
  push();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(22);
  text("請把臉移到鏡頭中間", width / 2, height / 2);
  pop();
}

function drawTitle() {
  push();
  fill(255);
  textAlign(CENTER, TOP); // 確保文字置中對齊頂部

  // 新增：顯示學號和姓名
  textSize(18); // 可以調整字體大小
  text("414730530陳宥縈", width / 2, 10); // 顯示在最上方，距離頂部 10 像素

  textSize(24);
  textStyle(BOLD);
  text("AI水果短劇變臉特效", width / 2, 40); // 調整主標題的 Y 座標，使其在學號姓名下方
  textSize(14);
  textStyle(NORMAL);
  fill(255, 200);
  text("點下方按鈕切換水果臉譜", width / 2, 74); // 調整副標題的 Y 座標
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  if (video) {
    video.size(width, height);
  }

  // 強化版修正：確保按鈕物件與 position 方法都存在才執行
  if (btnStrawberry && typeof btnStrawberry.position === 'function') btnStrawberry.position(20, height - 80);
  if (btnBanana && typeof btnBanana.position === 'function') btnBanana.position(130, height - 80);

  // 重新調整耳環按鈕位置
  earringButtons.forEach((btn, i) => {
    if (btn && typeof btn.position === 'function') {
      btn.position(20 + (i * 90), height - 130);
    }
  });
}