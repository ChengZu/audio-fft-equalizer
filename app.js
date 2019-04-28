App = function() {
	var EQ_COUNT = 10;
	var EQ_BAND_COUNT = 10;
	var SAMPLE_COUNT = 4096;
	var eq = [];
	var selected_eq;
	var channels;
	var sample_rate;
	var fft_re = [];
	var fft_im = [];
	var canvas;
	var ctx;
	var fft;
	var AudioContext = window.AudioContext || window.webkitAudioContext;
	var audioCtx;
	var source;
	var scriptNode;
	var interval;
	var analyser;


	function triangular_window(x) {
		return 1 - Math.abs(1 - 2 * x);
	}

	function cosine_window(x) {
		return Math.cos(Math.PI * x - Math.PI / 2);
	}

	function hamming_window(x) {
		return 0.54 - 0.46 * Math.cos(2 * Math.PI * x);
	}

	function hann_window(x) {
		return 0.5 * (1 - Math.cos(2 * Math.PI * x));
	}

	function window_(buffer, size, stride, stride_offset) {
		for (var i = 0; i < size; i++) {
			buffer[i * stride + stride_offset] *= hamming_window(i / (size - 1));
			//buffer[i * stride + stride_offset] *= triangular_window(i / (size - 1));
			//buffer[i * stride + stride_offset] *= cosine_window(i / (size - 1));
			//buffer[i * stride + stride_offset] *= hann_window(i / (size - 1));
		}
	}

	function butterworth_filter(x, n, d0) {
		return 1 / (1 + Math.pow(Math.abs(x) / d0, 2 * n));
	}

	function eq_filter(x) {
		var seq = eq[selected_eq];
		var sum = 1;
		for (var i = 0; i < EQ_BAND_COUNT; i++) {
			sum += seq[EQ_BAND_COUNT - 1 - i] * butterworth_filter(x * (2 << i) - 1, 2, 0.4);
		}
		return sum;
	}

	function audioprocess(event) {
		// The input buffer is a song we loaded earlier
		var inputBuffer = event.inputBuffer;

		// The output buffer contains the samples that will be modified and played
		var outputBuffer = event.outputBuffer;

		for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
			var inputData = inputBuffer.getChannelData(channel);
			var outputData = outputBuffer.getChannelData(channel);
			
			//window_(inputData, inputData.length / channels, channels, channel);              

			fft.forward(inputData, channels, channel, fft_re[channel], fft_im[channel]);
			/*
			for (var k = 1; k < fft.size / 2; k++) {
				var f = eq_filter((k - 1) / (fft.size - 1));
				fft_re[channel][k] *= f;
				fft_im[channel][k] *= f;
				fft_re[channel][fft.size - k] *= f;
				fft_im[channel][fft.size - k] *= f;
			}
			*/
			for (var j = 0; j < channels; j++) {
				fft.inverse(fft_re[j], fft_im[j], inputData, channels, j);
			}
			

			for (var sample = 0; sample < inputBuffer.length; sample++) {
				outputData[sample] = inputData[sample];  
			}
			
		}
		
	}

	function hsvToRgb(h, s, v) {
		var r, g, b;

		var i = Math.floor(h * 6);
		var f = h * 6 - i;
		var p = v * (1 - s);
		var q = v * (1 - f * s);
		var t = v * (1 - (1 - f) * s);

		switch (i % 6) {
		case 0: r = v, g = t, b = p; break;
		case 1: r = q, g = v, b = p; break;
		case 2: r = p, g = v, b = t; break;
		case 3: r = p, g = q, b = v; break;
		case 4: r = t, g = p, b = v; break;
		case 5: r = v, g = p, b = q; break;
		}

		return [parseInt(r * 255), parseInt(g * 255), parseInt(b * 255)];
	}

	function drawSpectrum() {


		// FFT to completion buffer for spectrum drawing
		for (var i = 0; i < channels; i++) {
			//fft.forward(completion_buffer, channels, i, fft_re[i], fft_im[i]);
		}
		
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		var bar_width = 3;
		var bar_interval = 1;
		var scale = 100;

		for (var i = 0; i < fft.size / 2; i += 4) {
			var spectrum = 0;

			for (var j = 0; j < channels; j++) {
				var re = fft_re[j];
				var im = fft_im[j];
				for (var k = 0; k < 4; k++) {
					spectrum += Math.sqrt(re[i + k] * re[i + k] + im[i + k] * im[i + k]);
				}
				spectrum /= 4;
			}

			spectrum /= channels;
			spectrum *= scale;
			magnitude = spectrum * 256;

			var rgb = hsvToRgb(i / (fft.size / 2), 1, 1);

			ctx.fillStyle = "rgb(" + rgb.join(",") + ")";
			ctx.fillRect((bar_width + bar_interval) * i/4, canvas.height, bar_width, -magnitude);
		}
	}

	function loadedMetadata() {
		clearInterval(interval);
		channels = source.channelCount;
		sample_rate = source.context.sampleRate;    

		var bufferSize = SAMPLE_COUNT / channels;
		fft = new FFT(bufferSize);

		for (var i = 0; i < channels; i++) {
			fft_re[i] = new Float32Array(bufferSize);
			fft_im[i] = new Float32Array(bufferSize);
		}

		interval = setInterval(drawSpectrum, 1000 / 24);
	}
	
	function db_to_mag(db) {
		return Math.pow(10, db / 10);
	}

	function mag_to_db(mag) {
		return 10 * (Math.log(mag) / Math.log(10));
	}
	
	function loadFile(){
		var file = document.getElementById("file").files[0];
		if(file==undefined){
			alert("Select A Local File");
			return;
		}
		var reader = new FileReader();
		reader.readAsArrayBuffer(file);
		reader.onload=function(f){
			audioCtx.decodeAudioData(this.result, function(buffer) {
				source.buffer = buffer;
			},
			function(e){"Error with decoding audio data" + e.err});
		}
	}
function getanalyser() {
	return analyser;
}
	function play() {
		if(audioCtx) {
			source.disconnect(scriptNode);
			scriptNode.disconnect(audioCtx.destination);
			scriptNode.removeEventListener('audioprocess', audioprocess);
			audioCtx.close();
		}
		
		audioCtx = new AudioContext();
		source = audioCtx.createBufferSource();
		
		analyser = audioCtx.createAnalyser();
		analyser.fftSize = 256;
		source.connect(analyser);
		analyser.connect(audioCtx.destination);
		

		// Create a ScriptProcessorNode with a bufferSize of 4096 and a single input and output channel
		scriptNode = audioCtx.createScriptProcessor(SAMPLE_COUNT, 2, 2);
		scriptNode.addEventListener('audioprocess', audioprocess);
		
		
		// When the buffer source stops playing, disconnect everything
		source.onended = function() {
			source.disconnect(scriptNode);
			scriptNode.disconnect(audioCtx.destination);
		}
		source.connect(scriptNode);
		scriptNode.connect(audioCtx.destination);
		source.start();
		loadFile();
		loadedMetadata();
	}
	
	function init() {
		

		

		eq[0] = [ 0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00];
		eq[1] = [ 0.30,  0.30,  0.20,  0.05,  0.10,  0.10,  0.20,  0.25,  0.20,  0.10];
		eq[2] = [ 1.90,  1.80,  1.70,  1.35,  1.10,  0.50,  0.20,  0.25,  0.20,  0.10];
		eq[3] = [ 0.40,  0.30,  0.20,  0.00,  0.50,  0.30,  0.10,  0.20,  0.60,  0.70];
		eq[4] = [ 0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00];
		eq[5] = [ 0.40,  0.30,  0.00,  0.30,  0.40,  0.20,  0.40,  0.50,  0.40,  0.50];
		eq[6] = [ 0.40,  0.20,  0.00,  0.40,  1.00,  1.00,  0.40,  0.00, -0.20, -0.40];
		eq[7] = [ 0.75,  0.65,  0.60,  0.50,  0.15,  0.25,  0.00,  0.25,  0.40,  0.54];
		eq[8] = [-1.00, -1.00, -1.00, -1.00,  0.00,  0.10,  0.20,  0.30,  0.10, -0.10];
		eq[9] = [ 0.20,  0.80,  0.80,  0.40,  0.80,  0.80,  0.40,  0.20,  0.00, -0.40];

		selected_eq = 0;

		for (var i = 0; i < EQ_BAND_COUNT; i++) {
			var createSlider = function(index) {
				$("#slider" + index).slider({
					min: -1.0, max: 2.0, step: 0.05, value: eq[0][index],
					orientation: 'vertical',
					slide: function(event, ui) { 
						selected_eq = 0;
						eq[0][index] = ui.value;
						$("#combobox-equalizer").val({value: 0}); 
					}
				});
			}(i);
		}

		$("#combobox-equalizer").val({value: 0}).change(function() { 
			for (var i = 0; i < EQ_COUNT; i++) {
				selected_eq = this.value;
				$("#slider" + i).slider({value: eq[selected_eq][i]});
			}
		});

		canvas = document.getElementById("spectrum");
		if (!canvas.getContext) {
			alert("Couldn't get canvas object !");
		}

		ctx = canvas.getContext("2d");
	}

	return { init: init, play:play, getanalyser:getanalyser};
}();