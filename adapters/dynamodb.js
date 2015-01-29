'use strict';

var _ = require('lodash');
var AWS = require('aws-sdk');
var shortId = require('shortid');
var debug = require('debug')('kodels-dynamodb');
var assert = require('assert');
var util = require('util');

module.exports = DynamoDriver;
function DynamoDriver(params) {
  params = params || {};
  params.apiVersion = '2012-08-10';
  
  this.$params = params;
  this.$db = new AWS.DynamoDB(params);
}

DynamoDriver.prototype.collection = function(tableName) {
  return new Adapter(this.$db, tableName);
};

DynamoDriver.prototype.close = function() {
  this.$db.close();
};

DynamoDriver.ObjectId = function (t) { return t; };


/**
 * Adapter for DynamoDB Tables
 * ===========================
 */

function Adapter(db, tableName) {
  this.$db = db;
  this.$tableName = tableName;
}

/*
Adapter.prototype.findFiltered = function(expression, attributeValues) {
  return new Promise(function (resolve, reject) {
    
    this.$db.query({
      TableName: this.$tableName,
      AttributesToGet: projection,
    })
    
  });
};
*/


Adapter.prototype.scan = function(filter, projection, limit) {
  assert.equal(typeof filter, 'function', 'First argument to Adapter#scan should be a function, got ' + typeof filter);
  
  var that = this;
  var params = {
    TableName: this.$tableName
  };
  
  if (typeof projection !== 'undefined') { params.AttributesToGet = projection; }
  if (typeof limit !== 'undefined') { params.Limit = limit; }
  
  return new Promise(function (resolve, reject) {
    that.$db.scan(params, function (err, data) {
      if (err) reject(err);
      else resolve(_.filter(_.map(data.Items, _unpackTypes), filter));
    });
  });
  
};


Adapter.prototype.find = function(query, projection, limit) {
  assert.equal(typeof query, 'object', 'Parameter should be an object. Got ' + typeof query);
  
  if (_.isEqual(query, {})) {
    debug('Using Adapter#scan because query is empty');
    return this.scan(_.identity, projection, limit);
  }
  
  // var filterFn = query.filterFn;
  // try { delete query.filterFn; } catch (e) {}
  
  var cond = {};
  Object.keys(query).forEach(function (index) {
    // - ff string assume equals
    if (typeof query[index] === 'string') {
      cond[index] = { ComparisonOperator: 'EQ', AttributeValueList: [{ S: query[index] }] };
      
    } else if (typeof query[index] === 'object') {
      
      assert.equal(Object.keys(query[index]).length, 1, 'At this time, only exactly one ComparisonOperator is supported at a time.');
      
      if (query[index].hasOwnProperty('$gt')) {
        cond[index] = { ComparisonOperator: 'GT', AttributeValueList: [{ S: query[index] }] };
        
      } else if (query[index].hasOwnProperty('$ge')) {
        cond[index] = { ComparisonOperator: 'GE', AttributeValueList: [{ S: query[index] }] };
        
      } else if (query[index].hasOwnProperty('$lt')) {
        cond[index] = { ComparisonOperator: 'LT', AttributeValueList: [{ S: query[index] }] };
        
      } else if (query[index].hasOwnProperty('$le')) {
        cond[index] = { ComparisonOperator: 'LE', AttributeValueList: [{ S: query[index] }] };
        
      } else if (query[index].hasOwnProperty('$in')) {
        cond[index] = { ComparisonOperator: 'IN', AttributeValueList: [{ SS: query[index] }] };
        
      } else {
        throw new Error('Unsupported ComparisonOperator: ' + Object.keys(query[index]));
      }
      
    } else {
      throw new Error('Unsupported query attribute type: ' + typeof query[index]);
    }
    
  });
  
  
  debug('Built Condition: %s', _str(cond));
  var adapter = this;
  
  /*adapter.$db.createTable({
    TableName: 'events',
    KeySchema: [ // The type of of schema.  Must start with a HASH type, with an optional second RANGE.
        { // Required HASH type attribute
            AttributeName: '_id',
            KeyType: 'HASH',
        }
    ],
    AttributeDefinitions: [ // The names and types of all primary and index key attributes only
        {
            AttributeName: '_id',
            AttributeType: 'S', // (S | N | B) for string, number, binary
        }
    ],
    ProvisionedThroughput: { // required provisioned throughput for the table
        ReadCapacityUnits: 1, 
        WriteCapacityUnits: 1, 
    }}, function (err, data) {
    console.log(arguments);
  });

  adapter.$db.listTables({ Limit: 100 }, function () { console.log(arguments); });
  adapter.$db.scan({ TableName: this.$tableName }, function () { console.log('SCAN', _str(arguments)); });
  */
  
  var params = {
    TableName: adapter.$tableName,
    KeyConditions: cond,
    Limit: limit
  };
  
  if (typeof projection !== 'undefined') { params.AttributesToGet = projection; }
  if (typeof limit !== 'undefined') { params.Limit = limit; }
  
  return new Promise(function (resolve, reject) {
    adapter.$db.query(params, function (err, data) {
      if (err) reject(err);
      else resolve(_.map(data.Items, _unpackTypes));
    });
    
  });
};


Adapter.prototype.findOne = function(query) {
  assertHashRange(query);
  
  return new Promise(function (resolve, reject) {
    this.find(query, {}, 1).then(function (rows) {
      resolve(rows[1]);
    }, reject);
  });
};


Adapter.prototype.save = function(doc) {
  var that = this;
  
  if (!doc._id) {
    doc._id = shortId.generate();
  }
  
  var params = {
    TableName: this.$tableName,
    Key: {
      _id: { S: doc._id }
    },
    AttributeUpdates: {}
  };
  
  _.keys(doc).forEach(function (attrName) {
    if (attrName === '_id') return;
    
    params.AttributeUpdates[attrName] = {
      Action: 'PUT',
      Value: { S: doc[attrName] }
    };
  });
  
  debug('Insert %s', _str(params));
  
  return new Promise(function (resolve, reject) {
    that.$db.updateItem(params, function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
  
};


/**
 * Utils
 */

function assertHashRange(obj) {
  assert.equal(typeof obj, 'object', 'Parameter should be an object. Got ' + typeof obj);
  
  if (!obj.hasOwnProperty('hash')) {
    obj.hash = null;
  }
  
  if (!obj.hasOwnProperty('range')) {
    obj.range = null;
  }
  
  var ok = _.isEqual(_.keys(obj), ['hash', 'range']);
  assert(ok, 'Object can only have a hash and/or a range property.');
}

function _unpackTypes(obj) {
  return _.mapValues(obj, function (val) {
    return _.values(val)[0];
  });
}

function _str(obj) {
  return util.inspect(obj, { depth: 5 });
}
