'use strict';

var test = require('tape');
var async = require('async');
var _ = require('lodash');

var kodels = require('../');


var modelConfig = {
  
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


test('mongodb driver', function (t) {
  var MongoDriver = require('../adapters/mongo');
  var mongo, coll;
  
  t.doesNotThrow(function () {
    mongo = new MongoDriver('mongodb://127.0.0.1:27017/test');
  });
  
  t.doesNotThrow(function () {
    coll = mongo.collection('events');
  }, 'can create collection without errors');
  
  // cleanup
  coll.remove({}).done();
  
  t.ok(coll, 'method .collection returns a collection');
  t.equals(typeof coll.save, 'function', 'has methods');
  

  t.test('model creation', function (t) {
    var config_ = _.cloneDeep(modelConfig);
    var EventModel = kodels.createModel(config_, coll);
    
    t.deepEquals(EventModel.$meta, config_.$meta, 'loads meta');
    t.equals(EventModel.getPageTitle, modelConfig.$statics.getPageTitle, 'attaches static methods');
    t.equals(EventModel.getPageTitle(), 'My events', 'statics methods work');

    t.test('without name', function (tt) {
      var config_ = _.cloneDeep(modelConfig);
      delete config_.$meta.name;
      tt.throws(function () { kodels.createModel(config_, coll); }, 'throws');
      tt.end();
    });
    
    t.test('without meta', function (tt) {
      var config_ = _.cloneDeep(modelConfig);
      delete config_.$meta;
      tt.throws(function () { kodels.createModel(config_, coll); }, 'throws');
      tt.end();
    });
    
    t.test('with invalid attribute definition', function (tt) {
      var config_;
      
      config_ = _.cloneDeep(modelConfig);
      config_.title = { type: 'string', defaultValue: 'foo', validate: [notBar] };
      tt.throws(function () { kodels.createModel(config_, coll); }, 'throws if type is wrong');
      
      config_ = _.cloneDeep(modelConfig);
      config_.title = { type: String, validate: [notBar] };
      tt.throws(function () { kodels.createModel(config_, coll); }, 'throws if defaultValue is not set');
      
      config_ = _.cloneDeep(modelConfig);
      config_.title = { type: String, validate: notBar };
      tt.throws(function () { kodels.createModel(config_, coll); }, 'throws if validate is not an array');
      
      tt.end();
    });
    
    t.end();
  });


  t.test('instance creation', function (t) {
    var config_ = _.cloneDeep(modelConfig);
    var EventModel = kodels.createModel(config_, coll);
    var eventData = {
      title: 'App launch',
      eventDate: new Date() - 1000 * 60 * 10, // 10 minutes ago
      eventDateHuman: 'Starting from 2.50pm today!',
      abstract: 'Launching my wonderful mobile application <3'
    };
    var eventData_;
    
    eventData_ = _.cloneDeep(eventData);
    var myEvent = new EventModel.create(eventData_);
    
    t.deepEquals(myEvent.title, eventData_.title, 'correctly sets attributes');
    
    myEvent.title = 'xyz!';
    t.deepEquals(myEvent.title, 'xyz!', 'correctly updates attributes');
    t.throws(function () { myEvent.$meta = 'hacked'; }, 'but not reserved ones');
    
    t.throws(function () { myEvent.title = 'bar'; }, 'throws when violating validator');
    t.deepEquals(myEvent.title, 'xyz!', '...and does not change any value');
    
    t.equals(myEvent.displayTitle, config_.$fns.displayTitle, 'attaches instance methods');
    t.equals(myEvent.$model.$meta, config_.$meta, 'attaches reserved attributes');
    t.equals(typeof myEvent.save, 'function', 'attaches internal methods');
    t.throws(function () { return myEvent.cinema; }, 'throws when getting nonexistant attribute');
    
    eventData_.title = 'xyz!';
    t.deepEquals(myEvent.toObject(), eventData_, 'correctly implements .toObject');
    
    
    t.test('without some attributes', function (tt) {
      var eventData_;
      
      eventData_ = _.cloneDeep(eventData);
      delete eventData_.title;
      tt.throws(function () { new EventModel.create(eventData_); }, 'throws if attribute was required');
      
      eventData_ = _.cloneDeep(eventData);
      delete eventData_.abstract;
      var myEvent = new EventModel.create(eventData_);
      tt.equals(myEvent.abstract, modelConfig.abstract.defaultValue, 'uses default value');
      
      tt.throws(function () { delete myEvent.title; }, 'throws if attempting to delete a required one');
      tt.throws(function () { myEvent.title = undefined; }, 'throws if attempting to unset a required one');
      
      tt.doesNotThrow(function () { delete myEvent.abstract; }, 'does not throw if attempting to delete an optional one');
      tt.doesNotThrow(function () { myEvent.abstract = undefined; }, 'does not throw if attempting to unset an optional one');
      tt.equals(myEvent.abstract, modelConfig.abstract.defaultValue, 'and will get its default value');
      
      tt.end();
    });
    
    t.test('db operations', function (tt) {
      var saved_;
      
      async.series([
        
        function saveNew(next) {
          myEvent.save().done(function (saved) {
            saved_ = saved;
            tt.deepEquals(saved, myEvent.toObject(), 'saves new object without errors');
            next();
          });
        },
        
        
        function update(next) {
          myEvent.title = 'I have changed my mind';
          myEvent.save().done(function (saved) {
            tt.deepEquals(saved, myEvent.toObject(), 'updates object without errors');
            next();
          });
        },
        
        
        function saveOther(next) {        
          var eventData_ = _.cloneDeep(eventData);
          eventData_.title = 'hooray';
          
          var myOtherEvent = new EventModel.create(eventData_);
          myOtherEvent.save().done(function () {
            next();
          });
        },
        
        
        function findMany(next) {
          EventModel.find({ eventDateHuman: myEvent.eventDateHuman }).then(function (events) {
            tt.equals(events.length, 2, 'find all events');
            
            var allOk = _.every(events, function (event) {
              return event && kodels.isModelInstance(event);
            });
            
            tt.ok(allOk, 'find results is an array of ModelInstances');
            next();
          }, function (err) { next(err); });
        },
        
        
        function findAll(next) {
          EventModel.find().then(function (events) {
            tt.equals(events.length, 2, 'find all events if no query is provided');
            next();
          }, function (err) { next(err); });
        },
        
        
        function findAllWithSortLimitSkip(next) {
          EventModel.find({}, {}, { title: 1 }, 1, 1).then(function (events) {
            tt.equals(events.length, 1, 'find all events if no query is provided');
            next();
          }, function (err) { next(err); });
        },
      
      
        function findOne(next) {
          EventModel.findOne({ title: 'hooray' }).then(function (event) {
            tt.ok(kodels.isModelInstance(event), 'should return one model instance');
            next();
          }, function (err) { next(err); });
        },
        
      
        function findOneNonExistant(next) {
          EventModel.findOne({ title: 'baz baz zoo' }).then(function () {
            throw new Error('should not be here');
          }, function (err) {
            tt.equals(err.message, 'Document not found', 'should reject promise if doc does not exist');
            next();
          });
        },
        
        
        function findById(next) {
          
          EventModel.findById(saved_._id).then(function (event) {
            tt.ok(kodels.isModelInstance(event), 'should return one model instance by id');
            next();
          }, function (err) { next(err); });
        },
        
        
        function findById(next) {
          
          EventModel.findById('123456123456').then(function () {
            throw new Error('should not be here');
          }, function (err) {
            tt.equals(err.message, 'Document not found', 'should reject promise if doc does not exist');
            next();
          });
        },
        
        
      ], function (err) {
        if (err) {
          console.log('Error', err.stack);
          process.exit(1);
          return;
        }
        
        mongo.close();
        tt.end();
      });
      
    });
    
    t.end();
  });

  t.end();
});



/*
var myEvent = new EventModel.create({
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
*/

/*
var events = models.Event.find({ title: 'App launch' });
console.log('events', events);
*/



// Stuffs

function notBar(value) {
  return value !== 'bar';
}

