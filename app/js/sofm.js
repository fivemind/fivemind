var FMGAIN = 0.70710678;

function fmdistance(vector1, vector2) {
  var distance = 0;

  for (var i = 0, ii = vector1.length; i < ii; i++) {
    distance += Math.pow((vector1[i] - vector2[i]), 2);
  }

  return Math.sqrt(distance);
}

function FMNeuron(weights) {
  this.weights = weights;
  this.winner = 0;
  this.life = 3;
  this.right = this;
  this.left = this;
}

FMNeuron.prototype.distance = function(vector) {
  return fmdistance(this.weights, vector);
};

FMNeuron.prototype.move = function(target, value) {
  var weights = this.weights;

  for (var i = 0, ii = weights.length; i < ii; i++) {
    weights[i] += value * (target[i] - weights[i]);
  }

};

FMNeuron.prototype.hopsTo = function(target, length) {
  var right = 0;
  var left = 0;
  var current = target;

  while (current != this) {
  	current = current.left;
    left++;
  }

  right = length - left;

  return (left < right) ? left : right;
};

function FMRing(start) {
	this.start = start;
	this.length = 1;
}

FMRing.prototype.moveAll = function(sample, gain) {
  var current = this.start;
  var best = this.minimum(sample);

  for (var i = 0, ii = this.length; i < ii; i++) {
    current.move(sample, this.regain(gain, best.hopsTo(current, this.length)));
    current = current.right;
  }

};

FMRing.prototype.minimum = function(sample) {
  var actual;
  var neuron = this.start;
  var best = neuron;
  var min = neuron.distance(sample);

  for (var i = 1, ii = this.length; i < ii; i++) {

    neuron = neuron.right;
    actual = neuron.distance(sample);

    if (actual < min) {
      min = actual;
      best = neuron;
    }

  }

  best.winner++;

  return best;
};

FMRing.prototype.delete = function(neuron) {
  var previous = neuron.left;
  var next = neuron.right;

  if (previous !== null) {
    previous.right = next;
  }
  if (next !== null) {
    next.left = previous;
  }
  if (next == neuron) {
    next = null;
  }
  if (this.start == neuron) {
    this.start = next;
  }

  this.length--;
};

FMRing.prototype.duplicate = function(neuron) {
  var copy = new FMNeuron(neuron.weights.slice(0));
  var next = neuron.left;

  next.right = copy;
  neuron.left = copy;

  copy.left = next;
  copy.right = neuron;

  this.length++;

};

FMRing.prototype.distance = function() {
  var dist = 0.0;
  var current = this.start;
  var previous = current.left;

  for (var i = 0, ii = this.length; i < ii; i++) {
    dist += fmdistance(current.weights, previous.weights);
    current = previous;
    previous = previous.left;
  }

  return dist;
};

FMRing.prototype.regain = function(gain, n) {
	return FMGAIN * Math.exp(-(n * n) / (gain * gain));
};

function FMTrainer(samples, config) {
  var cfg = config || {};

  this.neurons = null;

  this.cycle = 0;
  this.maxCycles = cfg.maxCycles || 1024;

  this.learningRate = cfg.learningRate || 0.05;
  this.gain = cfg.gain || 50.0;

  this.lastTourLength = null;

  this.running = false;

  this.cyclesPerDebug = 8;
  if (!cfg.debug) {
    this.debug = null;
  }

  this.scale = cfg.scale || 1;
  this.precision = Math.pow(10, cfg.precision) ||
    Math.pow(10, Math.ceil(Math.log(samples.length * samples[0].length) / Math.LN10) + 2);

  this.samples = samples;
  this.normSamples = this.duplicateSamples();

  this.randomiseSamples();

  this.cycleStartBound = this.cycleStart.bind(this);

}

FMTrainer.prototype.duplicateSamples = function() {
  var samples = this.samples.slice(0);

  for (var i = 0, ii = samples.length; i < ii; i++) {
    samples[i] = samples[i].slice(0);
  }

  return samples;
};

FMTrainer.prototype.randomiseSamples = function() {
  var j = 0;
  var scale = this.scale;
  var samples = this.samples;
  var jj = samples[0].length;
  var precision = this.precision;

  for (var i = 0, ii = samples.length; i < ii; i++) {
    for (j = 0; j < jj; j++) {
      samples[i][j] += Math.round(Math.random() * precision) / precision * scale;
      console.log( Math.round(Math.random() * precision) / precision * scale);
    }
  }

};

FMTrainer.prototype.deleteAll = function() {
  if (this.neurons !== null) {
    while (this.neurons.start !== null) {
    	this.neurons.delete(this.neurons.start);
    }
    this.neurons = null;
  }
};

FMTrainer.prototype.debug = function() {
  var x;
  var i = 0;
  var j = 0;
  var ii = 0;
  var buf = '';
  var n = this.neurons.start;
  var jj = this.samples[0].length;

	console.log("cycle: " + this.cycle + " length: " + this.lastTourLength);

  for (i = 0, ii = this.samples.length; i < ii; i++) {

  	x = this.samples[i];

    buf = 'sample ' + i + ': ';

    for (j = 0; j < jj; j++) {
      buf += x[j] + ' ';
    }

    console.log(buf);

  }

  for (i = 0, ii = this.neurons.length; i < ii; i++) {

    buf = 'neuron ' + i + ': ';

    for (j = 0; j < jj; j++) {
      buf += n.weights[j] + ' ';
    }

    console.log(buf);

    n = n.right;

  }

};

FMTrainer.prototype.cancel = function() {

  this.running = false;

  this.deleteAll();

  if (!this.cb) {
    return;
  }

  this.cb(-1, null);

};

FMTrainer.prototype.train = function(cb) {

	this.cancel();

  this.setup();

  this.cb = cb;

  this.running = true;

  this.cycleStart();

};

FMTrainer.prototype.setup = function() {
  var weights = new Array(this.samples[0].length);

  for (var i = 0, ii = weights.length; i < ii; i++) {
    weights[i] = 0.5;
  }

  this.neurons = new FMRing(new FMNeuron(weights));

  this.lastTourLength = null;

  this.cycle = 0;

};

FMTrainer.prototype.cycleStart = function() {

  if (this.neurons !== null) {

    if (this.cycle < this.maxCycles && this.running) {

      if (!this.cycleRun()) {
        return setTimeout(this.cycleStartBound, 0);
      }

    }

    if (this.running) {

      if (this.debug) {
        this.debug();
      }

      this.running = false;

      if (!this.cb) {
        return;
      }

      this.cb(null, this.createIndex());

    }

  }

};

FMTrainer.prototype.cycleRun = function() {
  var done = false;

  if (this.neurons !== null) {
    for (var i = 0, ii = this.samples.length; i < ii; i++) {
      this.neurons.moveAll(this.samples[i], this.gain);
    }
  }

  this.cycleEnd();

  this.gain = this.gain * (1 - this.learningRate);

  if (this.cycle++ % this.cyclesPerDebug === 0) {

    var length = this.neurons.distance();

    if (this.debug) {
      this.debug();
    }

    if (length == this.lastTourLength) {
      done = true;
    }
    else {
      this.lastTourLength = length;
    }

  }

  return done;
};

FMTrainer.prototype.cycleEnd = function() {

  if (this.neurons === null) {
    return;
  }

  var neuron = this.neurons.start;

  for (var i = 0; i < this.neurons.length; i++) {

    switch (neuron.winner) {

      case 0:
        neuron.life--;
        if (neuron.life === 0) {
          this.neurons.delete(neuron);
        }
        break;

      case 1:
        neuron.life = 3;
        break;

      default:
        neuron.life = 3;
        this.neurons.duplicate(neuron);
        break;

    }

    neuron.winner = 0;

    neuron = neuron.right;

  }

};

FMTrainer.prototype.createIndex = function() {
  var weights;
  var j = 0;
  var n = this.neurons.start;
  var samples = this.samples;
  var normSamples = this.normSamples;
  var index = new Array(this.neurons.length);

  for (i = 0, ii = this.neurons.length; i < ii; i++) {

    weights = n.weights;

    for (j = 0; j < ii; j++) {
      if (fmdistance(weights, samples[j]) === 0) {
        index[i] = j;
        break;
      }
    }

    n = n.right;

  }

  return index;
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FMTrainer: FMTrainer
  };
}

var samples = [
  [138.6859130859375, -34.11635246997273],
  [139.1143798828125, -33.975253485075896],
  [139.5263671875, -34.089061315849946],
  [139.130859375, -34.347971491244955],
  [138.988037109375, -34.12999474582475],
  [140.1910400390625, -32.83344284664949]
];

var trainer = new FMTrainer(samples, {
  scale: 0.00001,
  debug: true
});

trainer.train(function(err, index) {
  console.log(index);
});
