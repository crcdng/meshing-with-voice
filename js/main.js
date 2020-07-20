/* global dat, facemesh, requestAnimationFrame, Stats, THREE */

let controls, ctx, font, fontMaterial, glCanvas, renderer, stats, webcam;

function initWebPage () {
  glCanvas = document.getElementById('glcanvas');
  glCanvas.width = window.width;
  glCanvas.height = window.height;
  const twoDCanvas = document.getElementById('twodcanvas');
  twoDCanvas.width = 480;
  twoDCanvas.height = 320;
  ctx = twoDCanvas.getContext('2d');

  webcam = document.getElementById('webcam');
  webcam.width = 480;
  webcam.height = 320;

  stats = new Stats();
  stats.showPanel(0);
  document.body.appendChild(stats.dom);

  class Controls {
    constructor (p1, p2, p3, p4) {
      this.fps = p1;
      this.webcam = p2;
      this.recognition = p3;

      this.cameraZ = p4;
    }
  }
  controls = new Controls(true, true, true, 50);
  const gui = new dat.GUI();

  const screen = gui.addFolder('Screen');
  screen.add(controls, 'fps').onChange((value) => { stats.dom.style.visibility = value ? 'visible' : 'hidden'; });
  screen.add(controls, 'webcam').onChange((value) => { webcam.style.visibility = value ? 'visible' : 'hidden'; });
  screen.add(controls, 'recognition').onChange((value) => { twoDCanvas.style.visibility = value ? 'visible' : 'hidden'; });

  const scene = gui.addFolder('Scene');
  scene.add(controls, 'cameraZ', -100, 100);
  screen.open();
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
    console.log('Speech recognition service has started');
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
}

function initWebCam (videoEL) {
  function loadStream (stream) {
    webcam.srcObject = stream;
    webcam.onloadedmetadata = setCamParameters;
  }

  function setCamParameters () {
    webcam.setAttribute('autoplay', true);
    webcam.setAttribute('muted', true);
    webcam.setAttribute('playsinline', true);
    webcam.play();
  }

  navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(loadStream);

  return webcam;
}

function initScene () {
  function onResizeWindow () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(glCanvas.width, glCanvas.height);
  }

  const scene = new THREE.Scene({
    canvas: glCanvas
  });
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = controls.parameter1;
  camera.lookAt(scene.position);

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(glCanvas.width, glCanvas.height);
  window.addEventListener('resize', onResizeWindow, false);

  const fontLoader = new THREE.FontLoader();
  fontLoader.load('font/FIGHTINGFORCE_Regular.json', (f) => {
    font = f;
    const color = 0xfffcfa;
    fontMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
  });

  function renderScene () {
    stats.begin();
    const text = scene.getObjectByName('text');
    if (text != null) {
      if (text.material.opacity <= 0) {
        scene.remove(text);
      } else {
        text.material.opacity -= 0.01;
      }
    }
    renderer.render(scene, camera);
    stats.end();
    requestAnimationFrame(renderScene);
  }

  renderScene();
  return scene;
}

function initMLModel (scene, webcam) {
  function loadModel () {
    facemesh.load({
      maxContinuousChecks: 5,
      detectionConfidence: 0.9,
      maxFaces: 1,
      iouThreshold: 0.3,
      scoreThreshold: 0.75
    }).then(predict);
  }

  function predict (model) {
    model.estimateFaces(webcam, false, true) // flip image for webcam
      .then(updatePredictions);
  }

  var positions = [];

  function updatePredictions (predictions) {
    if (predictions.length === 0) return;
    // populate the position variable with the Face landmark points( U,V ).
    positions = predictions[0].scaledMesh;
    renderFacePoints(scene, positions); // Called once on face detection.
  }

  loadModel();
}

function renderFacePoints (scene, positions) {
  // Check if a face is found on the webcam feed or not
  if (positions.length === 0) return;
  // loop through the position array
  console.log(positions[0], scene);
  for (const i of positions) {
    const x = i[0];
    const y = i[1];
    const z = i[2];

    // const material = new THREE.LineBasicMaterial({ color: 0xff00ff });
    // const points = [];
    // points.push(new THREE.Vector3(x, y, z));
    // points.push(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5));

    // var geometry = new THREE.BufferGeometry().setFromPoints(points);
    // var line = new THREE.Line(geometry, material);
    // scene.add(line);

    ctx.fillStyle = 'black';
    ctx.fillRect(x, y, 2, 2);
  }
}

function drawText (scene, msg) {
  const shapes = font.generateShapes(msg, 22);
  const geometry = new THREE.ShapeBufferGeometry(shapes);
  geometry.computeBoundingBox();
  const xMid = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
  geometry.translate(xMid, 0, 0);
  const text = new THREE.Mesh(geometry, fontMaterial);
  text.position.z = -150;
  text.name = 'text';
  scene.add(text);
}

function init () {
  initWebPage();

  const scene = initScene();

  initSpeechRecognition(function (transcript, confidence) {
    console.log(`Speech recognition result: ${transcript}`);
    console.log(`Speech recognition: Confidence: ${confidence}`);
    drawText(scene, transcript);
  });

  initWebCam('#webcam').onloadeddata = (event) => {
    initMLModel(scene, event.target);
  };
}

window.onload = function () {
  init();
};
