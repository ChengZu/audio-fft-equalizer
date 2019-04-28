function FFT() {}

FFT.prototype.fft = function(/*double* */br, /*double* */bi, n, ity)
//ity>0 forward ,ity<0 backward
//n=pow(2,m);
//Here brt and bi start from 0.
{
	var ct = new Float64Array(n);
	var st = new Float64Array(n);
	var il = new Float64Array(n);

	if (n <= 0) return;

	var invsqrtn = 1.0 / Math.sqrt(n); //double
	this.cstab(st, ct, n, ity);
	this.brtab(il, n);
	this.fft1(br, bi, n, st, ct);
	this.binrv(br, n, il);
	this.binrv(bi, n, il);

	for (var i = 0; i < n; i++) {
		br[i] *= invsqrtn;
		bi[i] *= invsqrtn;
	}
}
FFT.prototype.cstab = function(/*double* */st, /*double* */ct, il, ity) {
	var yy = -Math.PI * 2.0 / il;
	if (ity < 0) yy = -yy;
	var ang = 0.0;
	for (var l = 0; l < il; l++) {
		st[l] = Math.sin(ang);
		ct[l] = Math.cos(ang);
		ang += yy;
	}
}

FFT.prototype.brtab = function(/*int*  */lbr, il) {
	var is = il >> 1;
	var mpx = 0;
	while (is) {
		is >>= 1;
		mpx++;
	}

	for (var ln = 0; ln < il; ln++) {
		var j1 = ln;
		var ibord = 0;
		for (var k = 0; k < mpx; k++) {
			var j2 = j1 >> 1;
			ibord = ibord * 2 + (j1 - 2 * j2);
			j1 = j2;
		}
		lbr[ln] = ibord + 1;
	}
}

FFT.prototype.binrv = function(/*double* */bc, il,/*const int* */lb) {
	var is = il - 1;
	for (var i = 1; i < is; i++) {
		var ig = lb[i] - 1;
		if (ig <= i) continue;
		var xx = bc[i];
		bc[i] = bc[ig];
		bc[ig] = xx;
	}
}

FFT.prototype.fft1 = function(/*double* */br, /*double* */bi, il, /*const double* */st, /*const double* */ct) {
	//the size of br,bi should be equal to il.
	//and size of st and ct no less than il.
	var is = il >> 1;
	var mpx = 0;
	var ic = 1;

	while (is) {
		is >>= 1;
		mpx++;
	}

	is = il;

	for (var ia = 0; ia < mpx; ia++) {
		var ka = 0;
		is >>= 1;
		for (var ib = 0; ib < ic; ib++) {
			for (var k = 0,
			index = 0; k < is; k++) {
				var j1 = ka + k;
				var j2 = j1 + is;
				var xr = br[j1];
				var xi = bi[j1];
				var yr = br[j2];
				var yi = bi[j2];
				br[j1] = xr + yr;
				bi[j1] = xi + yi;
				xr -= yr;
				xi -= yi;
				br[j2] = xr * ct[index] - xi * st[index];
				bi[j2] = xr * st[index] + xi * ct[index];

				index += ic;
			}

			ka += is << 1;
		}

		ic <<= 1;
	}
}