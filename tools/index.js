var CFSRISKGEO_PATH = __dirname + '/cfsrisk/data/cfsrisk_geocoded.csv';
var SOFMDATA_PATH = '../app/data/fmpoints.js';

var fs = require('fs');
var mgrs = require('mgrs');
var csv = require('csv-parse/lib/sync');
var sofm = require('../app/js/sofm.js');
var kdtree = require('../app/js/KdTree-min.js');

var risk = null;

function distance(a, b) {
  var lat1 = a.lat;
  var lng1 = a.lng;
  var lat2 = b.lat;
  var lng2 = b.lng;
  var rad = Math.PI / 180;

  var dLat = (lat2 - lat1)*rad;
  var dLng = (lng2 - lng1)*rad;

  lat1 = lat1 * rad;
  lat2 = lat2 * rad;

  var x = Math.sin(dLat / 2);
  var y = Math.sin(dLng / 2);

  var i = x*x + y*y * Math.cos(lat1) * Math.cos(lat2);

  return Math.atan2(Math.sqrt(i), Math.sqrt(1 - i)) * 6371 * 2;
}

function loadCfsRiskData() {
  var record;
  var records = csv(fs.readFileSync(CFSRISKGEO_PATH, 'utf8'), {columns: true});

  risk = new kdtree.kdTree([], distance, ['lng', 'lat']);

  for (var i = 0, ii = records.length; i < ii; i++) {

    record = records[i];

    record.lat = parseFloat(record.lat);
    record.lng = parseFloat(record.lng);

    risk.insert(record);

  }

}

loadCfsRiskData();

var poi;
var lngLat;
var riskLevel;
var coord = {
  lng: 0,
  lat: 0
};

var samples = [];

var prefix = mgrs.forward([138.83697509765625, -34.34456994717239], 1);

for (var y = 0; y < 10; y++) {
  for (var x = 0; x < 10; x++) {

    lngLat = mgrs.toPoint(prefix + '' + x + '' + y);

    coord.lng = lngLat[0];
    coord.lat = lngLat[1];

    poi = risk.nearest(coord, 1, 1);

    if (!poi || !poi[0]) {
      continue;
    }

    poi = poi[0][0];

    switch(poi.risk) {
      case 'extreme':
        riskLevel = 4.0;
        break;
      case 'very high':
        riskLevel = 3.0;
        break;
      case 'high':
        riskLevel = 2.0;
        break;
      case 'medium':
        riskLevel = 1.0;
        break;
      case 'low':
        riskLevel = 0.0;
        break;
      default:
        riskLevel = -1.0;
    }

    samples.push([ lngLat[0], lngLat[1], riskLevel ]);

  }
}

var trainer = new sofm.FMTrainer(samples, {
  scale: 0.00001,
  debug: true
});

trainer.train(function(err, index) {
  var sample;
  var data = [];

  for (var i = 0, ii = index.length; i < ii; i++) {

    sample = samples[index[i]];

    data.push({
      lng: sample[0],
      lat: sample[1],
      risk: sample[2]
    });

  }

  fs.writeFile(SOFMDATA_PATH, 'var fmpoints = ' + JSON.stringify(data) + ';', function(err) {
    if (err) {
      console.log(err);
    }
  });

});
