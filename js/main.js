/* global dat, facemesh, requestAnimationFrame, Stats, THREE */

let font, fontMaterial, renderer;

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
  const webcam = document.querySelector(videoEL);

  function loadStream (stream) {
    webcam.srcObject = stream;
    webcam.onloadedmetadata = setCamParameters;
  }

  function setCamParameters () {
    webcam.height = webcam.videoHeight;
    webcam.width = webcam.videoWidth;
    webcam.setAttribute('autoplay', true);
    webcam.setAttribute('muted', true);
    webcam.setAttribute('playsinline', true);
    webcam.play();
  }

  navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(loadStream);

  return webcam;
}

function initScene (controls) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = controls.parameter1;
  camera.lookAt(scene.position);

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

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

  const stats = new Stats();
  stats.showPanel(0);
  document.body.appendChild(stats.dom);

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
  function predict (model) {
    model.estimateFaces(webcam)
      .then(console.log);
  }
  loadModel();
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

function init (controls) {
  const scene = initScene(controls);

  initSpeechRecognition(function (transcript, confidence) {
    console.log(`Speech recognition result: ${transcript}`);
    console.log(`Speech recognition: Confidence: ${confidence}`);
    drawText(scene, transcript);
  });

  initWebCam('#webcam').onloadeddata = (event) => {
    initMLModel(event.target);
  };
}

window.onload = function () {
  class Controls {
    constructor (parameter1) {
      this.cameraZ = parameter1;
    }
  }
  const controls = new Controls(5);
  const gui = new dat.GUI();
  gui.add(controls, 'cameraZ', 0, 10);

  init(controls);
};
