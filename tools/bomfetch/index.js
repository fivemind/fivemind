var WEATHER_STATIONS_PATH = __dirname + '/data/weather_stations.csv';

var LEVEL = 'surface';
var BOMURL = 'ftp://ftp2.bom.gov.au/anon/gen/fwo/IDS60920.xml';

var fs = require('fs');
var ftp = require('ftp-get');
var csv = require('csv-parse/lib/sync');
var libxmljs = require('libxmljs');
var kdtree = require('../../app/js/KdTree-min.js');

var stations = null;

function distance(a, b) {
  var lat1 = a.Lat;
  var lng1 = a.Lon;
  var lat2 = b.Lat;
  var lng2 = b.Lon;
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

function loadStationData() {
  var record;
  var wmoid = 0;
  var records = csv(fs.readFileSync(WEATHER_STATIONS_PATH, 'utf8'), {columns: true});

  stations = new kdtree.kdTree([], distance, ['Lon', 'Lat']);

  for (var i = 0, ii = records.length; i < ii; i++) {

    record = records[i];

    wmoid = parseInt(record.WMO);

    if (isNaN(wmoid)) {
      continue;
    }

    record.WMO = wmoid;
    record.Lat = parseFloat(record.Lat);
    record.Lon = parseFloat(record.Lon);

    stations.insert(record);

  }

}

function fetchWeatherData(url, wmoId, level, cb) {

  console.log('FETCH', url, wmoId, (new Date()).toLocaleTimeString());

  ftp.get(url, function(err, data) {

    if (err) {
      return cb(err);
    }

    var periods;
    var levels;
    var elements;

    var k = 0;
    var kk = 0;
    var observ = {};
    var xmlDoc = libxmljs.parseXmlString(data);
    var stations = xmlDoc.find('observations/station');

    for (var i = 0, ii = stations.length; i < ii; i++) {
      if (stations[i].attr('wmo-id').value() === wmoId) {
        break;
      }
    }

    if (i === stations.length) {
      return cb(new Error('Malformed XML: missing station'));
    }

    periods = stations[i].find('period');

    for (var j = 0, jj = periods.length; j < jj; j++) {

      levels = periods[j].find('level');

      for (k = 0, kk = levels.length; k < kk; k++) {
        if (levels[k].attr('type').value() === level) {
          break;
        }
      }

      if (k < levels.length) {
        break;
      }

    }

    if (j === periods.length) {
      return cb(new Error('Malformed XML: missing level'));
    }

    elements = levels[k].find('element');

    for (var l = 0, ll = elements.length; l < ll; l++) {
      observ[elements[l].attr('type').value()] = parseFloat(elements[l].text()) || elements[l].text();
    }

    cb(null, observ);

  });

}

loadStationData();

var poi = stations.nearest({Lon: 138.83697509765625, Lat: -34.34456994717239}, 1);

fetchWeatherData(BOMURL, '' + poi[0][0].WMO, LEVEL, function(err, observ) {
  console.log(observ);
});
