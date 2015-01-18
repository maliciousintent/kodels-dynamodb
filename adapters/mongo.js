'use strict';

var pmongo = require('promised-mongo');

function MongoDriver(connString) {
  this.$connString = connString;
  this.$db = pmongo(connString);
}

MongoDriver.prototype.collection = function(collName) {
  return this.$db.collection(collName);
};

MongoDriver.prototype.close = function() {
  this.$db.close();
};

MongoDriver.ObjectId = pmongo.ObjectId;
module.exports = MongoDriver;
