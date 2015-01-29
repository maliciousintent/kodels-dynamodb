'use strict';

var _ = require('lodash');
var assert = require('assert');
var objectId = require('./adapters/mongo').ObjectId;

function ModelInstance(model, connection) {  
  this.$isKodelsInstance = true;
  this.$model = model;
  this.$attributeValues = {};
  this.$conn = connection;
}

ModelInstance.prototype.save = function() {
  return this.$conn.save(this.toObject());
};

ModelInstance.prototype.toString = function() {
  return this.toObject().toString();
};

ModelInstance.prototype.inspect = ModelInstance.prototype.toObject = function() {
  return this.$attributeValues;
};


function validateAttributeDefinition(attributeName, attributeDefinition) {
  // type: String, required: true, defaultValue: 'foo', validate: notBar 
  assert(attributeName && attributeName.indexOf('$') !== 0, 'Attribute name is illegal.');
  assert(attributeDefinition.type, 'Type property is required for attribute ' + attributeName);
  assert.doesNotThrow(function () { new attributeDefinition.type(); }, 'Type does not name a type');
  assert.notEqual(typeof attributeDefinition.defaultValue, 'undefined', 'Default value for ' + attributeName + ' must not be `undefined`.');
  
  if (typeof attributeDefinition.required !== 'undefined') {
    assert.equal(typeof attributeDefinition.required, 'boolean');
  } else {
    attributeDefinition.required = false;
  }
  
  if (typeof attributeDefinition.validate !== 'undefined') {
    assert(Array.isArray(attributeDefinition.validate));
  }
}


function createModel(properties, connection) {
  assert(typeof properties.$meta === 'object', 'Missing Model metas');
  assert(typeof properties.$meta.name === 'string', 'Missing Model name in $meta');
  assert(typeof connection === 'object', 'Second parameter to createModel must be a promised-mongo connection, got ' + typeof connection);
  
  var proto = {
    
    // properties are available from $model inside objects
    $meta: properties.$meta,
    $fns: properties.$fns,
    $attributeDefinitions: _.omit(properties, ['$statics', '$meta', '$fns']),
    
    $validateAttributeValue: function validateAttributeValue(name, value, props) {
      var def = this.$attributeDefinitions[name];
      assert.equal(typeof def, 'object', 'Attribute is not in model definition: ' + name);
      
      var validators = def.validate;
      
      if (def.required === true && (typeof value === 'undefined' || value === null)) {
        throw new Error('cannot unset required attribute.');
      }
      
      if (!validators) {
        return;
      }
      
      validators.forEach(function (validatorFn) {
        var result = validatorFn(value, props);
        
        if (!result) {
          throw new Error('validator fails: ' + validatorFn.name);
        }
      });
    },
    
    
    find: function (query, projection, sort, limit, skip) {
      assert.equal(typeof query, 'object', 'First parameter should be an object, got ' + typeof query);
      
      var cursor = connection.find(query, projection);
      // if (sort) { cursor = cursor.sort(sort); }
      // if (limit) { cursor = cursor.limit(limit); }
      // if (skip) { cursor = cursor.skip(skip); }
      
      return new Promise(function (resolve, reject) {
        cursor.then(function (docs) {
          
          docs = _.map(docs, function _buildInstance(doc) {
            try {
              return proto.create(doc);
            } catch (e) {
              reject(new Error('Cannot create instance from document with _id `' + doc._id + '`, please update either your model or document, accordingly: ' + e.message));
              return null;
            }
          });
          resolve(docs);
          
        }, reject);
      });
    },
    

    findById: function (idStr) {
      
      return new Promise(function (resolve, reject) {
        connection.findOne({ _id: objectId(idStr) }).then(function (doc) {
          
          if (!doc) {
            reject(new Error('Document not found'));
          } else {
            try {
              resolve(proto.create(doc));
            } catch (e) {
              reject(new Error('Cannot create instance from document with _id `' + doc._id + '`, please update either your model or document, accordingly: ' + e.message));
              return null;
            }
          }
          
        }, reject);
      });
    },
    

    findOne: function (query) {
      
      return new Promise(function (resolve, reject) {
        connection.findOne(query).then(function (doc) {
          
          if (!doc) {
            reject(new Error('Document not found'));
          } else {
            try {
              resolve(proto.create(doc));
            } catch (e) {
              reject(new Error('Cannot create instance from document with _id `' + doc._id + '`, please update either your model or document, accordingly: ' + e.message));
              return null;
            }
          }
          
        }, reject);
      });
    },
    
    
    create: function (attributeValues) {
      var instance = new ModelInstance(proto, connection);
      var instanceProxy = Proxy.create({
        
        set: function _instanceProxySet(proxy, prop, value) {
          if (prop.indexOf('$') === 0) {
            throw new Error('Property ' + prop + ' is read-only.');
          }
          
          try {
            instance.$model.$validateAttributeValue(prop, value, instance.$attributeValues);
          } catch (validationError) {
            throw new Error('Attribute validation error for "' + prop + '" with message: ' + validationError.message);
          }
          
          instance.$attributeValues[prop] = value;
        },
        
        'delete': function (prop) {
          if (instance.$model.$attributeDefinitions[prop].required === true) {
            throw new Error('Cannot delete required attribute');
          } else {
            delete instance.$attributeValues[prop];
            return true;
          }
        },
        
        get: function (proxy, prop) {            
          if (typeof instance[prop] === 'function') {
            return instance[prop];
          }
          
          if (prop.indexOf('$') === 0 || 
              ['prototype', 'then'].indexOf(prop) !== -1) {
            return instance[prop];
          }
          
          if (typeof instance.$model.$fns[prop] === 'function') {
            return instance.$model.$fns[prop];
          }            
          
          if (instance.$model.$attributeDefinitions.hasOwnProperty(prop)) {
            if (typeof instance.$attributeValues[prop] !== 'undefined') {
              return instance.$attributeValues[prop];
            } else {
              return instance.$model.$attributeDefinitions[prop].defaultValue;  //  or default value if not set
            }
          }
          
          throw new Error('Model has no attribute or callable named ' + prop);
        }
      });

      Object.keys(attributeValues).forEach(function initialValues(attributeName) {
        instanceProxy[attributeName] = attributeValues[attributeName];
      });
      
      var requiredAttributes = Object.keys(instance.$model.$attributeDefinitions).filter(function (name) {
        return instance.$model.$attributeDefinitions[name].required === true;
      });
      
      var requiredAttributesOk = _.all(requiredAttributes, function (name) {
        // @warning we need to bypass proxy here, otherwise the default value is returned
        // and this will never fail
        return typeof instance.$attributeValues[name] !== 'undefined';
      });
      
      if (!requiredAttributesOk) {
        throw new Error('Missing one of required attribute(s): ' + requiredAttributes.join(', '));
      }
      
      return instanceProxy;
    },
    
  };
  
  Object.keys(properties.$statics).forEach(function attachStaticFn(staticName) {
    assert.equal(typeof properties.$statics[staticName], 'function');
    proto[staticName] = properties.$statics[staticName].bind(connection);
  });
  
  Object.keys(proto.$attributeDefinitions).forEach(function attributeValidateIterator(attributeName) {
    validateAttributeDefinition(attributeName, proto.$attributeDefinitions[attributeName]);
  });
  
  return Object.create(proto);
}


function isModelInstance(obj) {
  return obj.$isKodelsInstance === true;
}


var IdField = { type: String, required: false, defaultValue: null, validate: [] }; // default attribute configuration for ObjectIds


module.exports = {
  
  MongoDriver: require('./adapters/mongo'),
  createModel: createModel,
  isModelInstance: isModelInstance,
  IdField: IdField,
  
};
