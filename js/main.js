/* global dat, facemesh, positionBufferData, requestAnimationFrame, Stats, THREE, triangulation, uvs */

let controls, drawTris, font, fontMaterial, glCanvas, positions, recognitionCanvas, stats, twoDCanvas, webcamEl;

function initWebPage (statsVisible, webcamVisible, twoDCanvasVisible) {
  glCanvas = document.getElementById('glcanvas');
  glCanvas.width = window.innerWidth;
  glCanvas.height = window.innerHeight;
  recognitionCanvas = document.getElementById('recognitioncanvas');
  recognitionCanvas.width = 480;
  recognitionCanvas.height = 320;

  twoDCanvas = document.getElementById('twodcanvas');
  twoDCanvas.width = window.innerWidth;
  twoDCanvas.height = window.innerHeight;

  webcamEl = document.getElementById('webcam');
  webcamEl.width = 480;
  webcamEl.height = 320;

  stats = new Stats();
  stats.showPanel(0);
  document.body.appendChild(stats.dom);

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
  recognitionCanvas.style.visibility = twoDCanvasVisible ? 'visible' : 'hidden';

  controls = new Controls(statsVisible, webcamVisible, twoDCanvasVisible, false, 4);
  const gui = new dat.GUI();
  const screenUI = gui.addFolder('Screen');
  screenUI.add(controls, 'fps').onChange((value) => { stats.dom.style.visibility = value ? 'visible' : 'hidden'; });
  screenUI.add(controls, 'webcam').onChange((value) => { webcamEl.style.visibility = value ? 'visible' : 'hidden'; });
  screenUI.add(controls, 'recognition').onChange((value) => { recognitionCanvas.style.visibility = value ? 'visible' : 'hidden'; });

  const recognitionUI = gui.addFolder('Recognition');
  recognitionUI.add(controls, 'tris').onChange((value) => { drawTris = value; });

  const sceneUI = gui.addFolder('Scene');
  sceneUI.add(controls, 'cameraZ', -20, 20);
  screenUI.open();
}

function initSpeechRecognition (onResultCallBack) {
  let recognition;

  try {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
  } catch (error) {
    console.error(error);
  }

  recognition.continuous = false;
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
    const result = event.results[0][0];
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
    console.log(`webcam ready: ${webcamEl.videoWidth}, ${webcamEl.videoHeight}`);
    webcamEl.setAttribute('autoplay', true);
    webcamEl.setAttribute('muted', true);
    webcamEl.setAttribute('playsinline', true);
    webcamEl.play();
  }

  navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(loadStream);

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
  camera.lookAt(
    halfW,
    halfH,
    0
  );
  camera.updateProjectionMatrix();

  const light = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
  scene.add(light);

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(triangulation);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positionBufferData, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();

  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load('img/original.jpg');
  // texture.encoding = THREE.sRGBEncoding;
  // texture.premultiplyAlpha = true;

  const material = new THREE.MeshPhongMaterial({
    map: texture,
    color: new THREE.Color(0xFF0000)
  });
  material.blending = THREE.CustomBlending;
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  function render () {
    requestAnimationFrame(render);
    if (positions == null || positions.length === 0) return;
    positionBufferData = positions.reduce((acc, pos) => acc.concat(pos), []);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positionBufferData, 3));
    geometry.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
  }
  render();
}

function initMLModel (webcam) {
  function loadModel () {
    facemesh.load({
      maxContinuousChecks: 5,
      detectionConfidence: 0.9,
      maxFaces: 1,
      iouThreshold: 0.3,
      scoreThreshold: 0.75
    }).then(predict);
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
    // populate the position variable with the Face landmark points( U,V ).
    positions = predictions[0].scaledMesh;
  }

  function renderFacePoints () {
    requestAnimationFrame(renderFacePoints);
    if (positions.length === 0) return;

    const ctx = recognitionCanvas.getContext('2d');
    ctx.clearRect(0, 0, recognitionCanvas.width, recognitionCanvas.height);
    ctx.save();
    ctx.scale(recognitionCanvas.width / webcam.videoWidth, recognitionCanvas.height / webcam.videoHeight);
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

function drawText (msg) {
  const ctx = twoDCanvas.getContext('2d');
  ctx.font = '48px serif';
  ctx.fillText(msg, twoDCanvas.width / 2, twoDCanvas.height * 0.7);
}

function init () {
  initWebPage(true, false, false);

  initScene();

  // initSpeechRecognition(function (transcript, confidence) {
  //   console.log(`Speech recognition result: ${transcript}`);
  //   console.log(`Speech recognition: Confidence: ${confidence}`);
  //   drawText(scene, transcript);
  // });

  drawText("hello world!");

  initWebCam(webcamEl).onloadeddata = (event) => {
    initMLModel(event.target);
  };
}

window.onload = function () {
  init();
};
