/* global dat, facemesh, requestAnimationFrame, Stats, THREE, TRIANGULATION */

let controls, ctx, drawTris, font, fontMaterial, glCanvas, renderer, stats, twoDCanvas, webcam;

function initWebPage () {
  glCanvas = document.getElementById('glcanvas');
  glCanvas.width = window.innerWidth;
  glCanvas.height = window.innerHeight;
  twoDCanvas = document.getElementById('twodcanvas');
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
    constructor (p1, p2, p3, p4, p5) {
      this.fps = p1;
      this.webcam = p2;
      this.recognition = p3;

      this.tris = p4;

      this.cameraZ = p5;
    }
  }
  controls = new Controls(true, true, true, false, 4);
  const gui = new dat.GUI();

  const screenUI = gui.addFolder('Screen');
  screenUI.add(controls, 'fps').onChange((value) => { stats.dom.style.visibility = value ? 'visible' : 'hidden'; });
  screenUI.add(controls, 'webcam').onChange((value) => { webcam.style.visibility = value ? 'visible' : 'hidden'; });
  screenUI.add(controls, 'recognition').onChange((value) => { twoDCanvas.style.visibility = value ? 'visible' : 'hidden'; });

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
    console.log(`Webcam ready: ${webcam.videoWidth}, ${webcam.videoHeight}`);
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

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  camera.position.x = window.innerWidth / 2 + 200;
  camera.position.y = window.innerHeight / 2 + 50;
  camera.position.z = 10; // controls.p5;
  camera.lookAt(0, 0, 0); // controls.p5;

  renderer = new THREE.WebGLRenderer({
    canvas: glCanvas
  });
  renderer.setSize(glCanvas.width, glCanvas.height);
  
  window.addEventListener('resize', onResizeWindow, false);

  var axes = new THREE.AxisHelper(500);
  scene.add(axes);

  const light = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.2);
  scene.add(light);
  
  var cubeGeometry = new THREE.BoxGeometry(100, 100, 100)
  var cubeMaterial = new THREE.MeshLambertMaterial({color: 0xff0000, wireframe: false});
  var cube = new THREE.Mesh(cubeGeometry, cubeMaterial);

  cube.position.x = 0;
  cube.position.y = 0;
  cube.position.z = 0;

  scene.add(cube);

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
    requestAnimationFrame(renderScene);
    stats.begin();
    // const text = scene.getObjectByName('text');
    // if (text != null) {
    //   if (text.material.opacity <= 0) {
    //     scene.remove(text);
    //   } else {
    //     text.material.opacity -= 0.01;
    //   }
    // }
    renderer.render(scene, camera);
    stats.end();
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

  let facemeshModel;

  function predict (model) {
    if (!facemeshModel) {
      facemeshModel = model;
    }
    model.estimateFaces(webcam).then(updatePredictions);
  }

  let positions = [];

  function updatePredictions (predictions) {
    predict(facemeshModel);
    if (predictions.length === 0) return;
    // populate the position variable with the Face landmark points( U,V ).
    positions = predictions[0].scaledMesh;
  }

  function renderFacePoints () {
    requestAnimationFrame(renderFacePoints);
    // console.log(`Rendering Face points: ${positions.length}`);
    if (positions.length === 0) return;
    ctx.clearRect(0, 0, twoDCanvas.width, twoDCanvas.height);
    ctx.save();
    ctx.scale(twoDCanvas.width / webcam.videoWidth, twoDCanvas.height / webcam.videoHeight);
    ctx.fillStyle = 'black';

    if (drawTris) {
      ctx.fillStyle = 'olive';
      for (let i = 0; i < TRIANGULATION.length; i += 3) {
        const i1 = TRIANGULATION[i];
        const i2 = TRIANGULATION[i + 1];
        const i3 = TRIANGULATION[i + 2];
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

function drawText (scene, msg) {
  const shapes = font.generateShapes(msg, 22);
  const geometry = new THREE.ShapeBufferGeometry(shapes);
  geometry.computeBoundingBox();
  const xMid = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
  geometry.translate(xMid, 0, 0);
  const text = new THREE.Mesh(geometry, fontMaterial);
  text.position.z = 0;
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
