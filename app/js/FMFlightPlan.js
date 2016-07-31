function FMFlightPlan() {

  this.tplItem = Handlebars.compile($('#tpl-flight-plan-item').html());
  this.tplExport = Handlebars.compile($('#tpl-flight-plan-export').html());

  this.tplAwmMissionHeader= Handlebars.compile($('#tpl-awm-mission-header').html());
  this.tplAwmMissionWaypoint = Handlebars.compile($('#tpl-awm-mission-waypoint').html());
  this.tplAwmMissionFooter = Handlebars.compile($('#tpl-awm-mission-footer').html());

}

FMFlightPlan.prototype.update = function(waypoints) {

  if (!waypoints.length) {
    console.log('no waypoints');
    return;
  }

  if (this.trainer) {
    this.trainer.cancel();
  }

  $('#flight-plan-items').empty();

  var self = this;

  var trainer = this.trainer = new FMTrainer(waypoints, {
    scale: 0.00001
  });

  trainer.train(function(err, index) {

    if (err) {
      return;
    }

    self.waypoints = waypoints;

    self.index = index;

    self.render(index, waypoints);

  });

};

FMFlightPlan.prototype.render = function(index, waypoints) {

  for (var i = 0, ii = index.length; i < ii; i++) {
    this.renderItem( waypoints[index[i]] );
  }

  $('#flight-plan-items').append(this.tplExport({}));

};

FMFlightPlan.prototype.renderItem = function(waypoint) {

  $('#flight-plan-items').append(this.tplItem({lat: waypoint[1], lng: waypoint[0]}));

};

FMFlightPlan.prototype.export = function() {
  var waypoint;
  var index = this.index;
  var waypoints = this.waypoints;

  var buf = '<?xml version="1.0"?>\n';

  buf += this.tplAwmMissionHeader({});

  for (var i = 0, ii = index.length; i < ii; i++) {

    waypoint = waypoints[index[i]];

    buf += this.tplAwmMissionWaypoint({
      latitude: waypoint[1],
      longitude: waypoint[0],
      altitude: 100,
      speed: 12,
      timeLimit: 50,
      yawDegree: 360,
      holdTime: 3,
      startDelay: 0,
      period: 0,
      repeatTime: 0,
      repeatDistance: 0,
      turnMode: 'StopAndTurn'
    });

  }

  buf += this.tplAwmMissionFooter({});

  var blob = new Blob([buf], {type: "text/xml;charset=utf-8"});

  saveAs(blob, "mission.awm");

};
