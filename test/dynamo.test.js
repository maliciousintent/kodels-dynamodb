
var test = require('tape');
var async = require('async');
var _ = require('lodash');

var kodels = require('../');
var modelConfig = require('./_fixtures').modelConfig;
var makeDynamo   = require('./_fixtures').makeDynamo;
var eventData   = require('./_fixtures').eventData;

test('foo', function (t) {
  t.skip('mock');
  t.end();
});

/*

test('dynamodb driver', function (t) {
  var MongoDriver = require('../adapters/dynamodb');
  var ddb, coll;
  
  t.doesNotThrow(function () {
    ddb = new MongoDriver({});
  });
  
  t.doesNotThrow(function () {
    coll = ddb.collection('events');
  }, 'can create collection without errors');
  
  t.doesNotThrow(function () {
    coll.find({ _id: 'aaa' }).then(function (data) {
      console.log('resolve', data);
    }, console.err);
  });
  
  t.end();
});

var DynamoDB = require('../adapters/dynamodb');
var ddb, coll;

ddb = new DynamoDB({
  endpoint: 'http://localhost:8000',
  region: 'eu-west-1',
  accessKeyId: 'asd',
  secretAccessKey: 'aaa'
});
coll = ddb.collection('events');


coll.save({
  _id: 'aaa',
  pino: 'ciao',
  ciao: 'pina',
})
.then(() => {

  console.log('create OK');

  coll.find({})
  .then(function (data) {
    console.log('query result', data);
    
  }, function (err) {
    console.log('find err', err.message, err.stack);
  });

}, function (err) {
  console.log('save err', err.message, err.stack);
});


*/