/**
 * Example Model backed by DynamoDB
 * =================================
 */

var co = require('co');
var kodels = require('../');
var DynamoDB = require('../adapters/dynamodb');

co(function* () {

  // 1. setup dynamodb
  //   uses DynamoDB Local for testing. Remove ```endpoint``` when using AWS
  var ddb = new DynamoDB({
    endpoint: 'http://localhost:8000',
    region: 'eu-west-1',
    accessKeyId: 'asd',
    secretAccessKey: 'aaa'
  });


  // 1b. you may want to create the table, the first time
  // by default will be created with the following parameters:
  //     KeySchema:            [{ AttributeName: '_id', KeyType: 'HASH'       }],
  //     AttributeDefinitions: [{ AttributeName: '_id', AttributeType: 'S'    }],
  //     ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
  // note that the _id primary hash key is mandatory
  //     
  // yield ddb.createTable('events2', { /* ... properties merged into AWS params ... */ });


  // 2. get a reference to the ```events``` table
  var eventsCollection = ddb.collection('events2');


  // 3. create a model
  var EventModel = kodels.createModel({
    
    $meta: {
      name: 'Event', // human-readable name for this model
      ordering: ['eventDate'] // default ordering for list results
    },
    
    _id: kodels.IdField, // every model must have an _id attribute
    title: { type: String, required: true, defaultValue: 'foo', validate: [validateTitle] },
    eventDate: { type: Number, required: true, defaultValue: 0 },
    abstract: { type: String, defaultValue: 'bar bar bar' },
    
    $fns: {
      // these functions will be attached to each instance,
      // with "this" bound to such instance
      displayTitle: function () {
        return this.title.toUpperCase();
      },
    },
    
    $statics: {
      // static methods attached to the model
      // with "this" bound to the database adapter
      findWithEvenTimestamp: function () {        
        return this.scan(function (doc) {
          return parseInt(doc.eventDate, 10) % 2 === 0;
        });
      },
    },
    
  }, eventsCollection);


  // -- validation helpers
  function validateTitle(title, modelAttributes) {
    // validate: title should be different from abstract
    return title !== modelAttributes.abstract;
  }


  // 4. create a new event instance
  var myEvent = EventModel.create({
    title: 'App launch',
    eventDate: new Date() - 1000 * 60 * 10, // 10 minutes ago
    abstract: 'Launching my wonderful mobile application <3'
  });

  console.log('My event:', myEvent);

  
  // 5. save the event
  yield myEvent.save();
  
  // 6. update some fields
  myEvent.title = 'App dinner';
  yield myEvent.save();
  
  // my saved event, note that myEvent how have have an _id attribute
  console.log('My event after 6.:', myEvent);
  
  // 7. update violating a validator
  //    this will raise an Error!
  // myEvent.title = myEvent.abstract + '';
  
  // 8. find all events
  var events = yield EventModel.find({});
  console.log('Found events in DB:', events);
  
  // 9. find a specific object
  var lastEvent = yield EventModel.find({ _id: myEvent._id });
  console.log('Last inserted event in DB:', lastEvent);
  
  // 10. find with filter
  var evenEvents = yield EventModel.findWithEvenTimestamp();
  console.log('These events have an even timestamp', evenEvents);
  
})
.then(function () {
  console.log('Done!');
})
.catch(function (err) {
  console.log('Error', err.stack);
});

