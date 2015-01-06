'use strict';

var kodels = require('../');


function notBar(value) {
  return value !== 'bar';
}


var EventModel = kodels.createModel({
  
  $meta: {
    name: 'Event',
    ordering: ['eventDate'],
    collection: null,
  },
  
  title: { type: String, required: true, defaultValue: 'foo', validate: [notBar] },
  eventDate: { type: Date, required: true, defaultValue: Date.now },
  eventDateHuman: { type: Date, required: true, defaultValue: Date.now },
  abstract: { type: Date, required: true, defaultValue: Date.now },
  
  displayTitle: function () {
    return this.title.toUpperCase();
  },
  
  addAttendee: function () {
    return this.findAndModify(this._id, { attendees: { $add: 'Simone' }});
  },
  
  $statics: {
    getPageTitle: function () { return 'My events'; },
  },
  
});

module.exports.EventModel = EventModel;
