
var test = require('tape');
var async = require('async');
var _ = require('lodash');

var kodels = require('../');
var modelConfig = require('./_fixtures').modelConfig;
var makeMongo   = require('./_fixtures').makeMongo;
var eventData   = require('./_fixtures').eventData;


test('mongodb driver', function (t) {
  var coll = makeMongo();
  
  t.ok(coll, 'method .collection returns a collection');
  t.equals(typeof coll.save, 'function', 'has methods');
  coll.remove({});
  
  var config_ = _.cloneDeep(modelConfig);
  var EventModel = kodels.createModel(config_, coll);
  var eventData_ = _.cloneDeep(eventData);
  var myEvent = new EventModel.create(eventData_);
  
  
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
      
      coll.__db.close();
      tt.end();
    });
    
  });
  
  t.end();
});

