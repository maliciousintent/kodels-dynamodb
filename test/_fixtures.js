
var kodels = require('../');

module.exports.modelConfig = {
  
  $meta: {
    name: 'Event',
    ordering: ['eventDate'],
    collection: null,
  },
  
  _id: kodels.IdField,
  title: { type: String, required: true, defaultValue: 'foo', validate: [notBar] },
  eventDate: { type: Date, required: true, defaultValue: Date.now },
  eventDateHuman: { type: Date, required: true, defaultValue: Date.now },
  abstract: { type: Date, defaultValue: 'bar bar bar' },
  
  $fns: {
    displayTitle: function () {
      return this.title.toUpperCase();
    },
    
    addAttendee: function () {
      return this.findAndModify(this._id, { attendees: { $add: 'Simone' }});
    },
  },
  
  $statics: {
    getPageTitle: function () { return 'My events'; },
  },
  
};

module.exports.eventData = {
  title: 'App launch',
  eventDate: new Date() - 1000 * 60 * 10, // 10 minutes ago
  eventDateHuman: 'Starting from 2.50pm today!',
  abstract: 'Launching my wonderful mobile application <3'
};


module.exports.makeMongo = function () {
  var MongoDriver = require('../adapters/mongo');
  var ddb = new MongoDriver({});
  var coll = ddb.collection('events');
  coll.__db = ddb;
  
  return coll;
};


module.exports.makeDynamo = function () {
  var DynamoDriver = require('../adapters/dynamodb');
  var ddb = new DynamoDriver({});
  var coll = ddb.collection('events');
  coll.__db = ddb;
  
  return coll;
};


function notBar(value) {
  return value !== 'bar';
}
