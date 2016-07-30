var WMOID = '94681'; // NURIOOTPA PIRSA
var LEVEL = 'surface';
var BOMURL = 'ftp://ftp2.bom.gov.au/anon/gen/fwo/IDS60920.xml';

var ftp = require('ftp-get');
var libxmljs = require('libxmljs');

function fetchWeatherData(url, wmoId, level, cb) {

  console.log('FETCH', url, (new Date()).toLocaleTimeString());

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

fetchWeatherData(BOMURL, WMOID, LEVEL, function(err, observ) {
  console.log(observ);
});
