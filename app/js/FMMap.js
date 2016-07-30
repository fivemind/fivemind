var FMMap = function(leafletMap, selTiles, selCanvas, points) {
  this._init(leafletMap, selTiles, selCanvas, points);
};

(function(FMMap) {

var COLR_BACKGROUND = 'rgb(4, 4, 6)';

var COLR_GRID_MAJOR = 'rgba(232, 250, 174, 0.3)';
var COLR_GRID_MINOR = 'rgba(105, 203, 212, 0.1)';

var COLR_RISK_EXTREME = 'rgb(194,0,0)';
var COLR_RISK_VERYHIGH = 'rgb(242,70,58)';
var COLR_RISK_HIGH = 'rgb(165,51,61)';
var COLR_RISK_MEDIUM = 'rgb(240,141,74)';
var COLR_RISK_LOW = 'rgb(27,183,170)';

var ctx;

var map;

var tree;

var cellsWide = 13 * 4;
var cellsHigh = 9 * 4;
var cellBuffer = new Array(cellsWide * cellsHigh);

var ratio = 432 / 624;

var $canvasElement;
var canvasWidth = 624;
var canvasHeight = 432;

var borderWidth = 2;

var renderWidth = canvasWidth;
var renderHeight = ratio * renderWidth;
var cellSize = renderWidth / cellsWide;

var northEdge = [
  4,4,4,3, // 1
  3,3,3,4, // 2
  4,3,2,2, // 3
  2,1,1,1, // 4
  2,2,2,1, // 5
  1,1,1,1, // 6
  1,1,2,2, // 7
  2,3,3,3, // 8
  3,3,3,3, // 9
  3,2,2,1, // 10
  1,1,1,2, // 11
  2,2,2,2, // 12
  2,3,3,3  // 13
];

var southEdge = [
  3,3,3,3, // 1
  3,3,3,2, // 2
  1,2,1,1, // 3
  3,3,3,3, // 4
  4,3,3,3, // 5
  4,4,3,3, // 6
  2,1,1,2, // 7
  2,1,1,1, // 8
  1,1,1,2, // 9
  2,3,3,3, // 10
  3,4,3,3, // 11
  4,4,3,3, // 12
  3,3,4,4, // 13
];

var eastEdge = [
  2,2,2,2, // -
  2,2,2,1, // A
  1,1,2,1, // B
  1,1,1,1, // C
  2,2,1,1, // D
  1,2,3,2, // E
  2,2,2,3, // F
  2,2,2,3, // G
  3,3,3,3  // -
];

var westEdge = [
  3,3,3,2, // -
  3,2,2,1, // A
  1,1,2,3, // B
  3,3,3,3, // C
  3,3,3,1, // D
  1,2,1,1, // E
  1,1,2,1, // F
  1,2,1,1, // G
  2,2,2,2  // -
];

var gridVert = [
  [0,0,0,1,0,1,1,0,0,0,1,0,0],  // 1
  [0,1,1,1,1,1,1,1,1,1,1,1,1],  // 2
  [1,1,1,1,1,1,1,1,1,1,1,1,1],  // 3
  [1,1,1,1,1,1,1,1,1,1,1,1,1],  // 4
  [1,1,1,1,1,1,1,1,1,1,1,1,0],  // 5
  [1,1,1,1,1,1,1,1,1,1,1,1,1],  // 6
  [1,1,1,1,1,1,1,1,1,1,1,1,1],  // 7
  [0,1,1,1,1,1,1,1,1,1,1,1,1],  // 8
  [0,1,1,1,1,1,1,1,1,1,1,1,0],  // 9
  [0,0,1,0,0,0,1,1,1,0,0,0,0]   // 10
];

var gridHorz = [
  [0,0,1,0,1,1,0,0,0],  // 1
  [0,1,1,1,1,1,1,1,0],  // 2
  [0,1,1,1,1,1,1,1,1],  // 3
  [1,1,1,1,1,1,1,1,1],  // 4
  [1,1,1,1,1,1,1,1,0],  // 5
  [1,1,1,1,1,1,1,1,0],  // 6
  [1,1,1,1,1,1,1,1,1],  // 7
  [1,1,1,1,1,1,1,1,1],  // 8
  [0,1,1,1,1,1,1,1,1],  // 9
  [0,1,1,1,1,1,1,1,1],  // 10
  [1,1,1,1,1,1,1,1,0],  // 11
  [1,1,1,1,1,1,1,1,0],  // 12
  [0,1,1,1,1,1,1,1,0],  // 13
  [0,1,1,0,0,1,1,0,0]   // 14
];

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

function updateCellBuffer() {
  var i = 0;
  var n = 0;
  var risk = 0;
  var greatest;
  var selected;
  var cellMid = cellSize / 2;
  var centerLatLng = map.getCenter();
  var centerPoint = map.latLngToLayerPoint(centerLatLng);
  var point = L.point(centerPoint.x + cellSize, centerPoint.y);
  var originX = centerPoint.x - renderWidth / 2;
  var originY = centerPoint.y - renderHeight / 2;
  var filter = Math.max(1, distance(centerLatLng, map.layerPointToLatLng(point)));

  for (var x = 0; x < cellsWide; x++) {
    for (var y = 0; y < cellsHigh; y++) {

      point.x = originX + cellMid + x * cellSize;
      point.y = originY + cellMid + y * cellSize;

      nearest = tree.nearest(map.layerPointToLatLng(point), 5, filter);

      if (!nearest || !nearest[0]) {
        cellBuffer[cellsWide * y + x] = undefined;
      }
      else {

        risk = -1;

        for (i = 0, ii = nearest.length; i < ii; i++) {

          n = nearest[i][0];

          if (n.risk >= risk) {
            cellBuffer[cellsWide * y + x] = n;
            risk = n.risk;
          }

        }

      }

    }
  }

}

function crisp(n, dispR, dispL, off) {
  if (dispR) {
    return Math.ceil(n + off) - 0.5;
  }
  else if (dispL) {
    return Math.ceil(n - off) - 0.5;
  }
  else {
    return Math.ceil(n) - 0.5;
  }
}

function drawMajorGridVert() {
  var d = 0;
  var w = 0;

  for (var y = 0, yy = gridVert.length, yyl = yy - 1; y < yy; y++) {

    d = 0;
    w = 0;

    ctx.moveTo(0, crisp(y * cellSize * 4, !y, y === yyl, 1));

    for (var x = 0, xx = gridVert[y].length; x < xx; x++) {

      if (gridVert[y][x]) {

        w++;

        continue;
      }

      if (w) {

        ctx.lineTo(crisp((d + w) * cellSize * 4), crisp(y * cellSize * 4, !y, y === yyl, 1));

        w = 0;

      }

      d = x + 1;

      ctx.moveTo(crisp(d * cellSize * 4), crisp(y * cellSize * 4, !y, y === yyl, 1));

    }

    if (w) {

      ctx.lineTo(crisp((d + w) * cellSize * 4), crisp(y * cellSize * 4, !y, y === yyl, 1));

    }

  }

}

function drawMajorGridHorz() {
  var d = 0;
  var h = 0;

  for (var x = 0, xx = gridHorz.length, xxl = xx - 1; x < xx; x++) {

    d = 0;
    h = 0;

    ctx.moveTo(crisp(x * cellSize * 4, !x, x === xxl, 1), 0);

    for (var y = 0, yy = gridHorz[x].length; y < yy; y++) {

      if (gridHorz[x][y]) {

        h++;

        continue;
      }

      if (h) {

        ctx.lineTo(crisp(x * cellSize * 4, !x, x === xxl, 1), crisp((d + h) * cellSize * 4));

        h = 0;

      }

      d = y + 1;

      ctx.moveTo(crisp(x * cellSize * 4, !x, x === xxl, 1), crisp(d * cellSize * 4));

    }

    if (h) {

      ctx.lineTo(crisp(x * cellSize * 4, !x, x === xxl, 1), crisp((d + h) * cellSize * 4));

    }

  }

}

function drawMinorGrid() {

  ctx.beginPath();

  for (var x = 1; x < cellsWide; x++) {

    ctx.moveTo(crisp(x * cellSize), 0);
    ctx.lineTo(crisp(x * cellSize), renderHeight);

  }

  for (var y = 1; y < cellsHigh; y++) {

    ctx.moveTo(0, crisp(y * cellSize));
    ctx.lineTo(renderWidth, crisp(y * cellSize));

  }

  ctx.lineWidth = 1;
  ctx.strokeStyle = COLR_GRID_MINOR;
  ctx.stroke();

}

function drawMajorGrid() {

  ctx.beginPath();

  drawMajorGridVert();
  drawMajorGridHorz();

  ctx.lineWidth = 1;
  ctx.strokeStyle = COLR_GRID_MAJOR;
  ctx.stroke();

}

function drawBorderCell(x, y, width, height, rgb) {
  ctx.fillStyle = rgb;
  ctx.fillRect(
    crisp(x * cellSize - 1),
    crisp(y * cellSize - 1),
    crisp(width * cellSize + 1),
    crisp(height * cellSize + 1)
  );
}

function drawBorder() {
  var i = 0;

  for (i = 0; i < northEdge.length; i++) {
    drawBorderCell(i, 0, 1, northEdge[i], COLR_BACKGROUND);
  }

  for (i = 0; i < southEdge.length; i++) {
    drawBorderCell(i, cellsHigh - southEdge[i], 1, southEdge[i], COLR_BACKGROUND);
  }

  for (i = 0; i < eastEdge.length; i++) {
    drawBorderCell(0, i, eastEdge[i], 1, COLR_BACKGROUND);
  }

  for (i = 0; i < westEdge.length; i++) {
    drawBorderCell(cellsWide - westEdge[i], i, westEdge[i], 1, COLR_BACKGROUND);
  }

}

function hatchRect(x1, y1, dx, dy, delta, color){

  ctx.beginPath();

  var majorAxe = Math.max(dx, dy);

  for (var n = -1 * majorAxe; n < majorAxe; n += delta) {
    ctx.moveTo(n + x1, y1);
    ctx.lineTo(dy + n + x1 , y1 + dy);
  }

  ctx.strokeStyle = color;

  ctx.stroke();

}

function clipActiveCells(risk, cb) {
  var rx = 0;
  var ry = 0;

  var x2 = 0;
  var y2 = 0;

  var x1 = renderWidth;
  var y1 = renderHeight;

  var point;

  ctx.save();

  for (var x = 0; x < cellsWide; x++) {
    for (var y = 0; y < cellsHigh; y++) {

      point = cellBuffer[cellsWide * y + x];

      if (!point || point.risk !== risk) {
        continue;
      }

      rx = x * cellSize;
      ry = y * cellSize;

      ctx.rect(x * cellSize, y * cellSize, cellSize, cellSize);

      x1 = rx < x1 ? rx : x1;
      y1 = ry < y1 ? ry : y1;

      rx += cellSize;
      ry += cellSize;

      x2 = rx > x2 ? rx : x2;
      y2 = ry > y2 ? ry : y2;

    }
  }

  ctx.clip();

  cb(x1, y1, x2 - x1, y2 - y1);

  ctx.restore();

}

function drawExtremeRiskCells(x, y, dx, dy) {
  hatchRect(x, y, dx, dy, 1.45 + Math.floor((frame / 4.5) % 3), COLR_RISK_EXTREME);
}

function drawVeryHighRiskCells(x, y, dx, dy) {
  hatchRect(x, y, dx, dy, 3, COLR_RISK_VERYHIGH);
}

function drawHighRiskCells(x, y, dx, dy) {
  hatchRect(x, y, dx, dy, 3, COLR_RISK_HIGH);
}

function drawMediumRiskCells(x, y, dx, dy) {
  hatchRect(x, y, dx, dy, 3, COLR_RISK_MEDIUM);
}

function drawLowRiskCells(x, y, dx, dy) {
  hatchRect(x, y, dx, dy, 3, COLR_RISK_LOW);
}

function drawFrame() {

  ctx.clearRect(0, 0, renderWidth, renderHeight);

  drawMinorGrid();

  clipActiveCells(4, drawExtremeRiskCells);
  clipActiveCells(3, drawVeryHighRiskCells);
  clipActiveCells(2, drawHighRiskCells);
  clipActiveCells(1, drawMediumRiskCells);
  clipActiveCells(0, drawLowRiskCells);

  drawBorder();

  drawMajorGrid();

}

var now;
var delta;
var fps = 30;
var frame = 0;
var past = Date.now();
var interval = 1000 / fps;

function nextFrame() {

  requestAnimationFrame(nextFrame);

  now = Date.now();

  delta = now - past;

  if (delta > interval) {

    past = now - (delta % interval);

    drawFrame();

    frame++;

  }

}

function resize() {
  var elCanvas = $canvasElement[0];

  canvasWidth = $tilesElement.width();

  renderWidth = canvasWidth;
  renderHeight = ratio * renderWidth;

  $tilesElement.height(canvasHeight = renderHeight);

  cellSize = renderWidth / cellsWide;

  elCanvas.width = canvasWidth;
  elCanvas.height = canvasHeight;

  $canvasElement.parent().width(canvasWidth);
  $canvasElement.parent().height(canvasHeight);

  $canvasElement.css('border-right-width', canvasWidth - Math.floor(canvasWidth) + 'px');
  $canvasElement.css('border-bottom-width', canvasHeight - Math.floor(canvasHeight) + 'px');

  map.invalidateSize();

  updateCellBuffer();

  drawFrame();

}

FMMap.prototype._init = function(leafletMap, selTiles, selCanvas, points) {

  map = leafletMap;

  map.attributionControl.setPrefix('');

  tree = new kdTree(points, distance, ["lat", "lng"]);

  $canvasElement = $(selCanvas);

  $tilesElement = $(selTiles);

  ctx = $canvasElement[0].getContext("2d");

  $(window).resize(resize);

  //map.on('click', function(e) {
  //  console.log('click', e.latlng);
  //});

  map.on('move', updateCellBuffer);

  resize();

  nextFrame();

};

})(FMMap);
