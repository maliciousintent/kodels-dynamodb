'use strict';

var _ = require('lodash');
var AWS = require('aws-sdk');
var assert = require('assert');

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
module.exports = DynamoDriver;


/**
 * Adapter for DynamoDB Tables
 * ===========================
 */

function Adapter(db, tableName) {
  this.$db = db;
  this.$tableName = tableName;
}

Adapter.prototype.findFiltered = function(expression, attributeValues) {
  /*
  return new Promise(function (resolve, reject) {
    
    this.$db.query({
      TableName: this.$tableName,
      AttributesToGet: projection,
    })
    
  });
   */
};


Adapter.prototype.find = function(query, projection, limit) {
  assert.equal(typeof query, 'object', 'Parameter should be an object. Got ' + typeof query);
  projection = projection || [];
  limit = limit || 0;
  
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
  
  return new Promise(function (resolve, reject) {
    
    this.$db.query({
      TableName: this.$tableName,
      AttributesToGet: projection,
      KeyConditions: cond,
      Limit: limit
    }, function (err, data) {
      if (err) {
        reject(err);
        return;
      }
      
      // @FIXME @BUG unpack data types
      resolve(data.Items);
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
  
};


function assertHashRange(obj) {
  assert.equal(typeof obj, 'object', 'Parameter should be an object. Got ' + typeof obj);
  
  if (!obj.hasOwnProperty('hash')) {
    obj.hash = null;
  }
  
  if (!obj.hasOwnProperty('range')) {
    obj.range = null;
  }
  
  var ok = _.deepEquals(_.keys(obj), ['hash', 'range']);
  assert(ok, 'Object can only have a hash and/or a range property.');
}
