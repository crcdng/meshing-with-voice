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

recognition.onresult = function (event) {
  const result = event.results[0][0].transcript;
  console.log(`Speech recognition result: ${result}`);
  console.log(`Speech recognition: Confidence: ${event.results[0][0].confidence}`);
};

recognition.onnomatch = function (event) {
  console.log('Speech recognition: no match');
};

recognition.onerror = function (event) {
  console.log(`Error occurred in speech recognition: ${event.error}`);
};
