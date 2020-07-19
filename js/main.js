/* global THREE, requestAnimationFrame */

let camera, renderer, scene;

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
}

function animate () {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

initScene();
initRecognition(
  function (transcript, confidence) {
    console.log(`Speech recognition result: ${transcript}`);
    console.log(
      `Speech recognition: Confidence: ${confidence}`
    );
  } 
);
animate();
