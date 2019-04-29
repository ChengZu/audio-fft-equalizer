function FFTEQ() {
	this.EQ_COUNT = 10;
	this.EQ_BAND_COUNT = 10;
	this.SAMPLE_COUNT = 4096;
	this.eq = [];
	this.selected_eq;
	this.canvas;
	this.ctx;
	this.AudioContext = window.AudioContext || window.webkitAudioContext;
	this.audioCtx;
	this.source;
	this.scriptNode;
	this.interval;
	this.fft = new FFT();
	this.waveR = new Array();
	this.waveI = new Array();
	this.waveComplete = false;
	this.onLoaded = function() {};
	this.audioFile = null;
	this.audioBuffer = null;
	this.paused = true;
	this.duration = 0;
	this.currentTime = 0;
	this.sampleRate = 48000;
}

FFTEQ.prototype.triangular_window = function(x) {
	return 1 - Math.abs(1 - 2 * x);
}

FFTEQ.prototype.cosine_window = function(x) {
	return Math.cos(Math.PI * x - Math.PI / 2);
}

FFTEQ.prototype.hamming_window = function(x) {
	return 0.54 - 0.46 * Math.cos(2 * Math.PI * x);
}

FFTEQ.prototype.hann_window = function(x) {
	return 0.5 * (1 - Math.cos(2 * Math.PI * x));
}

FFTEQ.prototype.window_ = function(buffer, size) {
	for (var i = 0; i < size; i++) {
		buffer[i] *= this.hamming_window(i / (size - 1));
		//buffer[i] *= this.triangular_window(i / (size - 1));
		//buffer[i] *= this.cosine_window(i / (size - 1));
		//buffer[i] *= this.hann_window(i / (size - 1));
	}
}

FFTEQ.prototype.butterworth_filter = function(x, n, d0) {
	return 1 / (1 + Math.pow(Math.abs(x) / d0, 2 * n));
}

FFTEQ.prototype.eq_filter = function(x) {
	var seq = this.eq[this.selected_eq];
	var sum = 1;
	for (var i = 0; i < this.EQ_BAND_COUNT; i++) {
		sum += seq[this.EQ_BAND_COUNT - 1 - i] * this.butterworth_filter(x * (2 << i) - 1, 2, 0.4);
	}
	return sum;
}

FFTEQ.prototype.triangular_window = function(x) {
	return 1 - Math.abs(1 - 2 * x);
}

FFTEQ.prototype.db_to_mag = function(db) {
	return Math.pow(10, db / 10);
}

FFTEQ.prototype.mag_to_db = function(mag) {
	return 10 * (Math.log(mag) / Math.log(10));
}

FFTEQ.prototype.hsvToRgb = function(h, s, v) {
	var r, g, b;

	var i = Math.floor(h * 6);
	var f = h * 6 - i;
	var p = v * (1 - s);
	var q = v * (1 - f * s);
	var t = v * (1 - (1 - f) * s);

	switch (i % 6) {
	case 0:
		r = v,
		g = t,
		b = p;
		break;
	case 1:
		r = q,
		g = v,
		b = p;
		break;
	case 2:
		r = p,
		g = v,
		b = t;
		break;
	case 3:
		r = p,
		g = q,
		b = v;
		break;
	case 4:
		r = t,
		g = p,
		b = v;
		break;
	case 5:
		r = v,
		g = p,
		b = q;
		break;
	}

	return [parseInt(r * 255), parseInt(g * 255), parseInt(b * 255)];
}

FFTEQ.prototype.audioprocess = function(event) {
	this.waveComplete = false;
	// The input buffer is a song we loaded earlier
	var inputBuffer = event.inputBuffer;
	// The output buffer contains the samples that will be modified and played
	var outputBuffer = event.outputBuffer;

	for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
		var inputData = inputBuffer.getChannelData(channel);
		var outputData = outputBuffer.getChannelData(channel);

		//window_(inputData, inputData.length);
		this.waveR[channel] = new Array();
		this.waveI[channel] = new Array();

		var waveR2 = new Array();
		var waveI2 = new Array();
		for (var sample = 0; sample < inputBuffer.length; sample++) {
			waveR2[sample] = inputData[sample];
			waveI2[sample] = 0;
		}

		this.fft.fft(waveR2, waveI2, this.SAMPLE_COUNT, 1);

		for (var k = 1; k < this.SAMPLE_COUNT; k++) {
			var f = this.eq_filter((k - 1) / (this.SAMPLE_COUNT - 1));
			waveR2[k] *= f;
			waveI2[k] *= f;
		}

		this.waveR[channel] = waveR2.concat();
		this.waveI[channel] = waveI2.concat();

		this.fft.fft(waveR2, waveI2, this.SAMPLE_COUNT, -1);

		for (var sample = 0; sample < inputBuffer.length; sample++) {
			outputData[sample] = waveR2[sample];
		}

	}
	this.waveComplete = true;
}

FFTEQ.prototype.drawSpectrum = function() {
	this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	if (!this.waveComplete) return;

	this.ctx.font = "12px serif";

	var zerolevel = this.canvas.height - 12;
	var ts = this.canvas.width / this.SAMPLE_COUNT * 2;

	var dx = this.canvas.width / 22;
	for (var i = dx; i < this.canvas.width - dx; i += dx * 2) {
		this.ctx.fillText(Math.round(i / dx) + "kHz", i - 12, zerolevel + 12);
	}

	//freq=mousex * 22050 / width;
	//ctx.fillText(width - 50, 10, freq + "Hz");
	for (i = 1; i < this.SAMPLE_COUNT / 2; i++) {
		var rgb = this.hsvToRgb(i / (this.SAMPLE_COUNT / 2), 1, 1);
		var magnitude = Math.sqrt(this.waveR[0][i] * this.waveR[0][i] + this.waveI[0][i] * this.waveI[0][i]) / this.SAMPLE_COUNT * 256000;
		this.ctx.fillStyle = "rgb(" + rgb.join(",") + ")";
		this.ctx.fillRect(i * ts, zerolevel, 1, -magnitude);

	}

}

FFTEQ.prototype._onLoaded = function(buffer) {
	clearInterval(this.interval);
	this.audioBuffer = buffer;
	this.duration = buffer.duration;
	this.sampleRate = buffer.sampleRate;
	this.onLoaded(this);
}


FFTEQ.prototype.loadFile = function() {
	if (this.audioFile.files[0] == undefined) {
		alert("Select A Local File");
		return;
	}
	var audioCtx = new this.AudioContext();
	var _that = this;
	var reader = new FileReader();
	reader.readAsArrayBuffer(this.audioFile.files[0]);
	reader.onload = function(f) {
		audioCtx.decodeAudioData(this.result,
		function(buffer) {
			_that._onLoaded(buffer);
			audioCtx.close();
		},
		function(e) {
			throw "Error with decoding audio data" + e.err
		});
	}
}
FFTEQ.prototype.initAudioCtx = function(buffer) {
	if (this.audioCtx) {
		this.source.disconnect(this.scriptNode);
		this.scriptNode.disconnect(this.audioCtx.destination);
		this.scriptNode.removeEventListener('audioprocess', this.audioprocess);
		this.audioCtx.close();
	}

	this.audioCtx = new this.AudioContext();
	this.source = this.audioCtx.createBufferSource();

	// Create a ScriptProcessorNode with a bufferSize of 4096 and a single input and output channel
	this.scriptNode = this.audioCtx.createScriptProcessor(this.SAMPLE_COUNT, 2, 2);
	this.scriptNode.addEventListener('audioprocess', this.audioprocess.bind(this));

	// When the buffer source stops playing, disconnect everything
	this.source.onended = function() {
		clearInterval(this.interval);
	}
	this.source.connect(this.scriptNode);
	this.scriptNode.connect(this.audioCtx.destination);
	this.source.buffer = buffer;
}

FFTEQ.prototype.play = function(currentTime) {
	clearInterval(this.interval);
	if(currentTime == undefined) currentTime = this.currentTime;
	if(this.paused) this.initAudioCtx(this.audioBuffer);
	this.source.start(currentTime);
	this.paused = false;
	this.interval = setInterval(this.drawSpectrum.bind(this), 1000 / 24);
}

FFTEQ.prototype.pause = function() {
	clearInterval(this.interval);
	this.paused = true;
	this.currentTime = this.audioCtx.currentTime;
	this.source.stop();
}

FFTEQ.prototype.init = function() {

	this.eq[0] = [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00];
	this.eq[1] = [0.30, 0.30, 0.20, 0.05, 0.10, 0.10, 0.20, 0.25, 0.20, 0.10];
	this.eq[2] = [1.90, 1.80, 1.70, 1.35, 1.10, 0.50, 0.20, 0.25, 0.20, 0.10];
	this.eq[3] = [0.40, 0.30, 0.20, 0.00, 0.50, 0.30, 0.10, 0.20, 0.60, 0.70];
	this.eq[4] = [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00];
	this.eq[5] = [0.40, 0.30, 0.00, 0.30, 0.40, 0.20, 0.40, 0.50, 0.40, 0.50];
	this.eq[6] = [0.40, 0.20, 0.00, 0.40, 1.00, 1.00, 0.40, 0.00, -0.20, -0.40];
	this.eq[7] = [0.75, 0.65, 0.60, 0.50, 0.15, 0.25, 0.00, 0.25, 0.40, 0.54];
	this.eq[8] = [ - 1.00, -1.00, -1.00, -1.00, 0.00, 0.10, 0.20, 0.30, 0.10, -0.10];
	this.eq[9] = [0.20, 0.80, 0.80, 0.40, 0.80, 0.80, 0.40, 0.20, 0.00, -0.40];

	this.selected_eq = 0;
	var _that = this;
	for (var i = 0; i < this.EQ_BAND_COUNT; i++) {
		var createSlider = function(index) {
			$("#slider" + index).slider({
				min: -1.0,
				max: 2.0,
				step: 0.05,
				value: _that.eq[0][index],
				orientation: 'vertical',
				slide: function(event, ui) {
					_that.selected_eq = 0;
					_that.eq[0][index] = ui.value;
					$("#combobox-equalizer").val({
						value: 0
					});
				}
			});
		} (i);
	}

	$("#combobox-equalizer").val({
		value: 0
	}).change(function() {
		for (var i = 0; i < _that.EQ_COUNT; i++) {
			_that.selected_eq = _that.value;
			$("#slider" + i).slider({
				value: _that.eq[_that.selected_eq][i]
			});
		}
	});
	this.audioFile = document.getElementById("file");
	this.audioFile.onchange = function(e) {
		_that.loadFile();
	}
	this.canvas = document.getElementById("spectrum");
	this.ctx = this.canvas.getContext("2d");
}