var render = function() {
	canvas = document.getElementById('visualizer');
    ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#00d0ff";
    ctx.lineWidth = 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var dataArray = new Uint8Array(App.getanalyser().frequencyBinCount);
	
    App.getanalyser().getByteFrequencyData(dataArray);
    var step = Math.round(dataArray.length / 128);
	
	var bar_width = 4;
	var bar_interval = 1;

    for (var i = 0; i < 128; i++) {
		var spectrum = (dataArray[step * i] / 256.0) * 50;
		
        for (var j = 0; j < spectrum; j++) {
            ctx.beginPath();
            ctx.moveTo(bar_width * i + bar_interval, 256 - 4 * j);
            ctx.lineTo(bar_width * (i + 1) - bar_interval, 256 - 4 * j);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(bar_width * i + bar_interval, 256);
        ctx.lineTo(bar_width * (i + 1) - bar_interval, 256);
        ctx.stroke();
    }

    window.requestAnimationFrame(render);
}