var FMSidebar = function(selSidebar, tplPrefix) {

  this.$elSidebar = $(selSidebar);

  this.sectionIndex = [];
  this.sections = {};

  //this.tplHeader = Handlebars.compile( $(tplPrefix + 'header').html() );
  this.tplSection = Handlebars.compile( $(tplPrefix + 'section').html() );
  //this.tplFooter = Handlebars.compile( $(tplPrefix + 'footer').html() );

};

FMSidebar.prototype.addSection = function(name, title, subTitle) {
  var section = this.sections[name];

  if (section) {

    section.title = title;
    section.subTitle = subTitle;

    section.redraw = true;

    return;
  }

  section = {
    name: name,
    title: title || '',
    subTitle: subTitle || '',
    redraw: true
  };

  section.index = this.sectionIndex.push(section) - 1;

  this.sections[name] = section;

  this.render();

};

FMSidebar.prototype.appendItem = function(sectionName, template, data) {
  var section = this.sections[sectionName];

  if (!section) {
    throw new Error(sectionName + ' does not exist');
  }

  section.items.push(data);

};

FMSidebar.prototype.render = function() {
  var section;
  var $elSection;
  var index = this.sectionIndex;

  for (var i = 0, ii = index.length; i < ii; i++) {

    section = index[i];

    $elSection = $('#' + section.name);

    if ($elSection.length) {
      this.renderSection($elSection, section);
    }
    else {
      this.renderSection($('<div />').appendTo(this.$elSidebar), section);
    }

  }

};

FMSidebar.prototype.renderSection = function($elSection, section) {

  $elSection.replaceWith(this.tplSection(section));

  section.redraw = false;

};
