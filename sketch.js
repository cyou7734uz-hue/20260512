let video;
let faceMesh;
let faces = [];

let strawberryMask;
let bananaMask;
let currentMask = "strawberry";

let btnStrawberry;
let btnBanana;

function preload() {
  // 載入水果臉譜圖片
  strawberryMask = loadImage("assets/strawberry.png");
  bananaMask = loadImage("assets/banana.png");

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

  // 顯示鏡頭畫面
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();

  // 加一層暗色，讓臉譜更明顯
  fill(0, 80);
  noStroke();
  rect(0, 0, width, height);

  if (faces.length > 0) {
    drawFruitMask(faces[0]);
  } else {
    drawWaitingText();
  }

  drawTitle();
}

function gotFaces(results) {
  faces = results;
}

function drawFruitMask(face) {
  let keypoints = face.keypoints;

  // 取臉部左右與上下位置
  let leftFace = keypoints[234];
  let rightFace = keypoints[454];
  let topFace = keypoints[10];
  let chin = keypoints[152];

  if (!leftFace || !rightFace || !topFace || !chin) return;

  let faceCenterX = (leftFace.x + rightFace.x) / 2;
  let faceCenterY = (topFace.y + chin.y) / 2;

  let faceW = dist(leftFace.x, leftFace.y, rightFace.x, rightFace.y) * 1.45;
  let faceH = dist(topFace.x, topFace.y, chin.x, chin.y) * 1.45;

  // 根據左右臉頰算旋轉角度
  let angle = atan2(rightFace.y - leftFace.y, rightFace.x - leftFace.x);

  let maskImg;

  if (currentMask === "strawberry") {
    maskImg = strawberryMask;
    faceW *= 1.05;
    faceH *= 1.1;
  } else if (currentMask === "banana") {
    maskImg = bananaMask;
    faceW *= 0.95;
    faceH *= 1.25;
  }

  push();
  imageMode(CENTER);
  translate(faceCenterX, faceCenterY);
  rotate(angle);

  // 讓臉譜稍微上下浮動，有短劇變臉感
  let bounce = sin(frameCount * 0.05) * 4;

  image(maskImg, 0, bounce, faceW, faceH);
  pop();
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
  textAlign(CENTER, TOP);
  textSize(24);
  textStyle(BOLD);
  text("AI水果短劇變臉特效", width / 2, 24);

  textSize(14);
  textStyle(NORMAL);
  fill(255, 200);
  text("點下方按鈕切換水果臉譜", width / 2, 58);
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  if (video) {
    video.size(width, height);
  }

  btnStrawberry.position(20, height - 80);
  btnBanana.position(130, height - 80);
}