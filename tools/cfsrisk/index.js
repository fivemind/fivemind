var FETCHTHROTTLE = 1000;
var CFSRISK_PATH = __dirname + '/data/cfsrisk.csv';
var NOMINATIM_URL = 'http://nominatim.openstreetmap.org/search?format=json&';

var stopPhrases = [
  'Adj'
];

var i = 0;
var fs = require('fs');
var http = require('http');
var csv = require('csv-parse/lib/sync');
var records = csv(fs.readFileSync(CFSRISK_PATH, 'utf8'), {columns: true});

function appendToFile(relPath, contents) {
  var file = fs.openSync(__dirname + relPath, 'a');
  fs.writeSync(file, contents);
  fs.closeSync(file);
}

function processData(name, risk, data) {
  if (!data || !data.length) {
    throw new Error('No Data for ' + name);
  }

  site = data[0];

  console.log('appended ' + name);

  appendToFile('/data/cfsrisk_geocoded.csv',
    '"' + name + '",' +
    '"' + risk + '",' +
    site.lat + ',' +
    site.lon + '\n'
  );

}

function removeStopPhrases(string) {
  var result = string;
  for (var i = 0, ii = stopPhrases.length; i < ii; i++) {
    result = result.replace(stopPhrases[i], '');
  }
  return result;
}

function fetch(i) {
  var record = records[i];

  var name = record.AssetName;

  var location = removeStopPhrases(record.AssetLocat).split(',');

  if (location.length < 2) {
    location[1] = location[0];
    location[0] = name;
  }

  var street = location[0].trim();
  var city = location[1].trim();
  var country = 'Australia';

  var risk = record.Risk.toLowerCase();

  var url = NOMINATIM_URL + 'street=' + street + '&city=' + city + '&country' + country;

  console.log('FETCH', url);

  var request = http.get(url, function(res) {
    var body = '';
    res.on('data', function(chunk) {
      body += chunk;
    });
    res.on('end', function() {

      try {
        processData(name, risk, JSON.parse(body));
      }
      catch(e) {
        console.log(e);
      }

      if (i >= records.length) {
        setTimeout(function() { fetch(i + 1); }, FETCHTHROTTLE);
      }

    });
  });
}

fetch(0);
