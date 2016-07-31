var FMApp = function(db, config) {

  this.db = db;

  this.config = config;

  var leafletMap = L.map('map-tiles', { zoomControl: false }).setView([-34.34456994717239, 138.83697509765625], 5);

  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: '',
    maxZoom: 17,
    id: 'mapbox.satellite',
    accessToken: config.accessToken
  }).addTo(leafletMap);

  this.map = new FMMap(leafletMap, '#map-tiles', '#map-overlay', fmpoints);

  this.flightPlan = new FMFlightPlan();

  this.createLeftSidebar();
  this.createRightSidebar();

};

FMApp.prototype.createLeftSidebar = function() {

  var leftSidebar = this.leftSidebar = new FMSidebar('#left-sidebar', '#tpl-left-');

  leftSidebar.addSection('flight-plan', 'drone', 'flight plan');

};

FMApp.prototype.createRightSidebar = function() {

  //this.rightSidebar = new FMSidebar('#right-sidebar', '#tpl-right-');

};
