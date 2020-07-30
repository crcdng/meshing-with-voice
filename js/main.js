/* global cancelAnimationFrame, dat, facemesh, positionBufferData, requestAnimationFrame, Stats, THREE, triangulation, uvs */

let controls,
  datGui,
  drawTris,
  glCanvas,
  positions,
  recognitionCanvas,
  stats,
  webcamEl;

class Point {
  constructor (x, y) {
    x = x || 0;
    y = y || x || 0;

    this.sX = x;
    this.sY = y;
    this.reset();
  }

  set (x, y) {
    x = x || 0;
    y = y || x || 0;

    this.sX = x;
    this.sY = y;
  }

  add (point) {
    this.x += point.x;
    this.y += point.y;
  }

  multiply (point) {
    this.x *= point.x;
    this.y *= point.y;
  }

  reset () {
    this.x = this.sX;
    this.y = this.sY;
    return this;
  }
}

class Particle {
  constructor (ctx, x, y, lifespan, frictionX, frictionY, directionX, directionY, extentX, extentY) {
    this.ctx = ctx;
    this.startPos = new Point(x, y);
    this.friction = new Point(frictionX, frictionY);
    this.directionX = directionX;
    this.directionY = directionY;
    this.extentX = extentX;
    this.extentY = extentY;
    this.lifespan = lifespan;
    this.v = new Point();
    this.a = new Point();
    this.reset();
  }

  reset (lifespan, frictionX, frictionY, directionX, directionY, extentX, extentY) {
    this.x = this.startPos.x;
    this.y = this.startPos.y;
    this.lifespan = lifespan;
    this.friction.x = frictionX;
    this.friction.y = frictionY;
    this.directionX = directionX;
    this.directionY = directionY;
    this.extentX = extentX;
    this.extentY = extentY;
    this.life = Math.round(Math.random() * this.lifespan);
    this.isActive = true;
    this.v.reset();
    this.a.reset();
  }

  tick () {
    if (!this.isActive) return;
    this.physics();
    this.checkLife();
    this.draw();
    return this.isActive;
  }

  checkLife () {
    this.life -= 1;
    this.isActive = (this.life >= 1);
  }

  draw () {
    this.ctx.fillRect(this.x, this.y, 2, 2);
  }

  physics () {
    this.a.x = (Math.random() - this.directionX) * this.extentX;
    this.a.y = (Math.random() - this.directionY) * this.extentY;

    this.v.add(this.a);
    this.v.multiply(this.friction);
    this.x += this.v.x;
    this.y += this.v.y;

    this.x = Math.round(this.x * 10) / 10;
    this.y = Math.round(this.y * 10) / 10;
  }
}

class ParticleText {
  constructor (canvas) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.clearLoopId = 0;
    this.animLoopId = 0;
    this.color = '#c46b2c';
    this.frictionX = 0.98;
    this.frictionY = 0.98;
    this.directionX = 0.5;
    this.directionY = 0.5;
    this.extentX = 0.5;
    this.extentY = 0.5;
    this.lifespan = 300;
  }

  checkAlpha (pixels, i) {
    return pixels[i * 4 + 3] > 0;
  }

  clearCanvas () {
    this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  createParticle (x, y) {
    this.particles.push(new Particle(this.ctx, x, y, this.lifespan, this.frictionX, this.frictionY, this.directionX, this.directionY, this.extentX, this.extentY));
  }

  resetParticles () {
    for (const p of this.particles) {
      p.reset(this.lifespan, this.frictionX, this.frictionY, this.directionX, this.directionY, this.extentX, this.extentY);
    }
  }

  init (text, font = 'bold 100px "Arial"', baseline = 'center', fillstyle = '#000') {
    this.ctx.font = font;
    this.ctx.textBaseline = baseline;
    this.ctx.fillStyle = fillstyle;
    const textSize = this.ctx.measureText(text);
    this.ctx.fillText(
      text,
      Math.round((this.canvas.width / 2) - (textSize.width / 2)),
      Math.round(this.canvas.height / 2)
    );

    const imageData = this.ctx.getImageData(1, 1, this.canvas.width, this.canvas.height);
    const pixels = imageData.data;
    const dataLength = imageData.width * imageData.height;

    for (let i = 0; i < dataLength; i++) {
      const currentRow = Math.floor(i / imageData.width);
      const currentColumn = i - Math.floor(i / imageData.height);

      if (currentRow % 2 || currentColumn % 2) {
        continue;
      }

      if (this.checkAlpha(pixels, i)) {
        const cy = ~~(i / imageData.width);
        const cx = ~~(i - (cy * imageData.width));

        this.createParticle(cx, cy);
      }
    }
  }

  start () {
    const clearLoop = () => {
      this.clearCanvas();
      this.clearLoopId = requestAnimationFrame(clearLoop);
    };

    const animLoop = () => {
      this.ctx.fillStyle = this.color;
      let isAlive = false;
      for (const p of this.particles) {
        if (p.tick()) { isAlive = true; }
      }
      if (!isAlive) {
        this.resetParticles();
        setTimeout(() => {
          requestAnimationFrame(animLoop);
        }, 1750);
        return;
      }
      this.animLoopId = requestAnimationFrame(animLoop);
    };

    clearLoop();
    animLoop();
  }

  stop () {
    cancelAnimationFrame(this.clearLoopId);
    cancelAnimationFrame(this.animLoopId);
  }
}

function initMain (statsVisible, webcamVisible, recognitionCanvasVisible) {
  glCanvas = document.getElementById('glcanvas');
  glCanvas.width = window.innerWidth;
  glCanvas.height = window.innerHeight;
  recognitionCanvas = document.getElementById('recognitioncanvas');
  recognitionCanvas.width = 360;
  recognitionCanvas.height = 270;

  webcamEl = document.getElementById('webcam');
  webcamEl.width = 360;
  webcamEl.height = 270;

  const statsContainer = document.getElementById('statscontainer');
  stats = new Stats();
  stats.showPanel(0);
  statsContainer.appendChild(stats.dom);

  class Controls {
    constructor (p1, p2, p3, p4, p5) {
      this.fps = p1;
      this.webcam = p2;
      this.recognition = p3;

      this.tris = p4;

      this.cameraZ = p5;
    }
  }

  stats.dom.style.visibility = statsVisible ? 'visible' : 'hidden';
  webcamEl.style.visibility = webcamVisible ? 'visible' : 'hidden';
  recognitionCanvas.style.visibility = recognitionCanvasVisible ? 'visible' : 'hidden';

  controls = new Controls(
    statsVisible,
    webcamVisible,
    recognitionCanvasVisible,
    false,
    4
  );

  const screenUI = datGui.addFolder('Screen');
  screenUI.add(controls, 'fps').onChange((value) => {
    stats.dom.style.visibility = value ? 'visible' : 'hidden';
  });
  screenUI.add(controls, 'webcam').onChange((value) => {
    webcamEl.style.visibility = value ? 'visible' : 'hidden';
  });
  screenUI.add(controls, 'recognition').onChange((value) => {
    recognitionCanvas.style.visibility = value ? 'visible' : 'hidden';
  });

  const recognitionUI = datGui.addFolder('Recognition');
  recognitionUI.add(controls, 'tris').onChange((value) => {
    drawTris = value;
  });

  const sceneUI = datGui.addFolder('Scene');
  sceneUI.add(controls, 'cameraZ', -20, 20);
}

function initSpeechRecognition (onResultCallBack) {
  let recognition;
  let resultId = 0;

  try {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
  } catch (error) {
    console.error(error);
  }

  recognition.continuous = true;
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.start();

  recognition.onstart = function () {
    console.log('Speech recognition service started');
  };

  recognition.onsoundstart = function () {
    console.log('Some sound is being received');
  };

  recognition.onsoundend = function (event) {
    console.log('Sound has stopped being received');
  };

  recognition.onspeechstart = function () {
    console.log('Speech has been detected');
  };

  recognition.onspeechend = function () {
    console.log('Speech has stopped being detected');
  };

  recognition.onaudiostart = function () {
    console.log('Audio capturing started');
  };

  recognition.onaudioend = function () {
    console.log('Audio capturing ended');
  };

  recognition.onresult = function (event) {
    const result = event.results[resultId++][0];
    console.log('Speech recognition: result');
    onResultCallBack(result.transcript, result.confidence);
  };

  recognition.onnomatch = function (event) {
    console.log('Speech recognition: no match');
  };

  recognition.onerror = function (event) {
    console.log(`Error occurred in speech recognition: ${event.error}`);
  };

  recognition.onend = function () {
    console.log('Speech recognition service disconnected');
  };
}

function initWebCam (videoEL) {
  function loadStream (stream) {
    webcamEl.srcObject = stream;
    webcamEl.onloadedmetadata = setCamParameters;
  }

  function setCamParameters () {
    console.log(
      `webcam ready: ${webcamEl.videoWidth}, ${webcamEl.videoHeight}`
    );
    webcamEl.setAttribute('autoplay', true);
    webcamEl.setAttribute('muted', true);
    webcamEl.setAttribute('playsinline', true);
    webcamEl.play();
  }

  navigator.mediaDevices
    .getUserMedia({ video: true, audio: false })
    .then(loadStream);

  return webcamEl;
}

function initScene () {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    canvas: glCanvas
  });
  const scene = new THREE.Scene();
  const halfW = glCanvas.width * 0.5;
  const tfX = 130;
  const halfH = glCanvas.height * 0.5;
  const tfY = -150;
  const near = 1;
  const far = 1000;

  const camera = new THREE.OrthographicCamera(
    halfW + tfX,
    -halfW + tfX,
    -halfH + tfY,
    halfH + tfY,
    near,
    far
  );
  camera.position.x = halfW;
  camera.position.y = halfH;
  camera.position.z = -60;
  camera.zoom = 2;
  camera.lookAt(halfW, halfH, 0);
  camera.updateProjectionMatrix();

  const light = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
  scene.add(light);

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(triangulation);
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positionBufferData, 3)
  );
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();

  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load('img/original.jpg');
  // texture.encoding = THREE.sRGBEncoding;
  // texture.premultiplyAlpha = true;

  const material = new THREE.MeshPhongMaterial({
    map: texture,
    color: new THREE.Color(0xff0000)
  });
  material.blending = THREE.CustomBlending;
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  function render () {
    requestAnimationFrame(render);
    if (positions == null || positions.length === 0) return;
    positionBufferData = positions.reduce((acc, pos) => acc.concat(pos), []);
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positionBufferData, 3)
    );
    geometry.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
  }
  render();
}

function initMLModel (webcam) {
  function loadModel () {
    facemesh
      .load({
        maxContinuousChecks: 5,
        detectionConfidence: 0.9,
        maxFaces: 1,
        iouThreshold: 0.3,
        scoreThreshold: 0.75
      })
      .then(predict);
  }

  let facemeshModel;

  function predict (model) {
    if (!facemeshModel) {
      facemeshModel = model;
    }
    model.estimateFaces(webcam).then(updatePredictions);
  }

  positions = [];

  function updatePredictions (predictions) {
    predict(facemeshModel);
    if (predictions.length === 0) return;
    positions = predictions[0].scaledMesh;
  }

  function renderFacePoints () {
    requestAnimationFrame(renderFacePoints);
    if (positions.length === 0) return;

    const ctx = recognitionCanvas.getContext('2d');
    ctx.clearRect(0, 0, recognitionCanvas.width, recognitionCanvas.height);
    ctx.save();
    ctx.scale(
      recognitionCanvas.width / webcam.videoWidth,
      recognitionCanvas.height / webcam.videoHeight
    );
    ctx.fillStyle = 'black';

    if (drawTris) {
      ctx.fillStyle = 'olive';
      for (let i = 0; i < triangulation.length; i += 3) {
        const i1 = triangulation[i];
        const i2 = triangulation[i + 1];
        const i3 = triangulation[i + 2];
        ctx.beginPath();
        ctx.moveTo(positions[i1][0], positions[i1][1]);
        ctx.lineTo(positions[i2][0], positions[i2][1]);
        ctx.lineTo(positions[i3][0], positions[i3][1]);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      ctx.fillStyle = 'black';

      for (const i of positions) {
        const x = i[0];
        const y = i[1];
        ctx.fillRect(x, y, 2, 2);
      }
    }
    ctx.restore();
  }
  loadModel();
  renderFacePoints();
}

function initTextArea (canvasId) {
  const textCanvas = document.getElementById(canvasId);
  textCanvas.width = window.innerWidth; // TODO
  textCanvas.height = window.innerHeight; // TODO
  const ctx = textCanvas.getContext('2d');
  ctx.clearRect(0, 0, textCanvas.width, textCanvas.height);
  return textCanvas;
}

function drawText (canvas, msg, x, y) {
  const ctx = canvas.getContext('2d');
  console.log(msg, x, y);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '48px serif';
  ctx.fillText(msg, x, y);
}

function init () {
  initMain(false, false, false);

  initScene();

  const textCanvas = initTextArea('textcanvas');

  initWebCam(webcamEl).onloadeddata = (event) => {
    initMLModel(event.target);
  };

  initSpeechRecognition(function (transcript, confidence) {
    console.log(`Speech recognition result: ${transcript}`);
    console.log(`Speech recognition: Confidence: ${confidence}`);
    drawText(textCanvas, transcript, textCanvas.width / 2, textCanvas.height * 0.7);
  });
}

window.onload = function () {
  function showMain () {
    particleText.stop(); // stop animation loops
    document.getElementById('loader').style.display = 'none';
    document.getElementById('main').style.display = 'block';
  }

  const guiContainer = document.getElementById('datguicontainer');
  datGui = new dat.GUI({ autoPlace: false });
  guiContainer.appendChild(datGui.domElement);

  const loadingCanvas = document.getElementById('loadingcanvas');
  loadingCanvas.width = window.innerWidth;
  loadingCanvas.height = window.innerHeight;

  const particleText = new ParticleText(loadingCanvas);
  particleText.init('loading...');
  particleText.start();

  const loadingUI = datGui.addFolder('Loading Text');

  loadingUI.addColor(particleText, 'color');
  loadingUI.add(particleText, 'frictionX', 0, 5);
  loadingUI.add(particleText, 'frictionY', 0, 5);
  loadingUI.add(particleText, 'directionX', 0, 1);
  loadingUI.add(particleText, 'directionY', 0, 1);
  loadingUI.add(particleText, 'extentX', 0, 1);
  loadingUI.add(particleText, 'extentY', 0, 1);
  loadingUI.add(particleText, 'lifespan', 30, 1500);
  datGui.remember(particleText);

  init();

  setTimeout(showMain, 12000);
};
