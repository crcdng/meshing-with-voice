/* global facemesh, requestAnimationFrame, THREE */

let camera, font, fontMaterial, renderer;

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

function initScene () {
  const scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  camera.position.z = 5;

  var loader = new THREE.FontLoader();
  loader.load('font/FIGHTINGFORCE_Regular.json', function (f) {
    font = f;
    const color = 0xfffcfa;
    fontMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
  });
  console.log(scene);

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

function init () {
  const scene = initScene();

  initSpeechRecognition(function (transcript, confidence) {
    console.log(`Speech recognition result: ${transcript}`);
    console.log(`Speech recognition: Confidence: ${confidence}`);
    drawText(scene, transcript);
  });

  initWebCam('#webcam').onloadeddata = (event) => {
    initMLModel(event.target);
  };

  return scene;
}

function animate (scene) {
  console.log(scene);
  /// requestAnimationFrame((scene) => animate(scene));

  const text = scene.getObjectByName('text');
  if (text != null) {
    if (text.material.opacity <= 0) {
      scene.remove(text);
    } else {
      text.material.opacity -= 0.002;
    }
  }

  renderer.render(scene, camera);
}

window.onload = function () {
  const scene = init();
  animate(scene);
};
