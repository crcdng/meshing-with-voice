/* global THREE, requestAnimationFrame */

let camera, font, fontMaterial, renderer, scene;

function initRecognition (onResultCallBack) {
  let recognition;

  try {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
  } catch (error) {
    console.error(error);
  }

  recognition.continuous = false;
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.start();

  recognition.onresult = function (event) {
    const result = event.results[0][0];
    console.log("Speech recognition: result");
    onResultCallBack(result.transcript, result.confidence);
  };

  recognition.onnomatch = function (event) {
    console.log("Speech recognition: no match");
  };

  recognition.onerror = function (event) {
    console.log(`Error occurred in speech recognition: ${event.error}`);
  };
}

function initScene () {
  scene = new THREE.Scene();
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
  loader.load("font/FIGHTINGFORCE_Regular.json", function (f) {
    font = f;
    const color = 0x006699;
    fontMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
  });
}

function drawText (msg) {
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

function animate () {
  requestAnimationFrame(animate);
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

initScene();

initRecognition(function (transcript, confidence) {
  console.log(`Speech recognition result: ${transcript}`);
  console.log(`Speech recognition: Confidence: ${confidence}`);
  drawText(transcript);
});

animate();
