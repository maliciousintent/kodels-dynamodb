/*jshint unused:false */
'use strict';

// var test = require('tape');

var models = require('./models');

var myEvent = new models.EventModel.create({
  title: 'App launch',
  eventDate: new Date() - 1000 * 60 * 10, // 10 minutes ago
  eventDateHuman: 'Starting from 2.50pm today!',
  abstract: 'Launching my wonderful mobile application <3'
});

console.log('title is', myEvent.displayTitle());
myEvent.title = 'xyz!';
myEvent.save();

myEvent.abstract = 'lot of bars';
myEvent.save();

myEvent.title = 'bara';
myEvent.save();

/*
var events = models.Event.find({ title: 'App launch' });
console.log('events', events);
*/

