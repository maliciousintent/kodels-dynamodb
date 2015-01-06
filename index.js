'use strict';

var _ = require('lodash');
var assert = require('assert');


function ModelInstance(model) {
  this.$model = model;
  this.$attributeValues = {};
}

ModelInstance.prototype.save = function() {
  console.log('saving', this.toString());
};

ModelInstance.prototype.toString = function() {
  return this.toObject();
};

ModelInstance.prototype.toObject = function() {
  return this.$attributeValues;
};



function validateAttributeDefinition(attributeName, attributeDefinition) {
  if (typeof attributeDefinition === 'function') {
    // 'getters' are always OK
    return;
  }
  
  // type: String, required: true, defaultValue: 'foo', validate: notBar 
  assert(attributeName, 'Attribute name is illegal.');
  assert(attributeDefinition.type, 'Type property is required for attribute ' + attributeName);
  assert.doesNotThrow(function () { new attributeDefinition.type(); }, 'Type does not name a type');
  
  assert.equal(typeof attributeDefinition.required, 'boolean');
  assert.notEqual(typeof attributeDefinition.defaultValue, 'undefined');
  
  if (typeof attributeDefinition.validate !== 'undefined') {
    assert(Array.isArray(attributeDefinition.validate));
  }
}



module.exports = {
  
  createModel: function (properties) {
    var proto = {
      
      // properties are available from $model inside objects
      $meta: properties.$meta,
      $fns: properties.$fns,
      $attributeDefinitions: _.omit(properties, ['$statics', '$meta', '$fns']),
      
      $validateAttributeValue: function validateAttributeValue(name, value) {
        var validators = this.$attributeDefinitions[name].validate;
        
        if (!validators) {
          return;
        }
        
        validators.forEach(function (validatorFn) {
          var result = validatorFn(value);
          
          if (!result) {
            throw new Error('validator fails: ' + validatorFn.name);
          }
        });
      },
      
      create: function (attributeValues) {
        var instance = new ModelInstance(proto);
        var instanceProxy = Proxy.create({
          
          set: function _instanceProxySet(proxy, prop, value) {
            if (prop.indexOf('$') === 0) {
              throw new Error('Property ' + prop + ' is read-only.');
            }
            
            try {
              instance.$model.$validateAttributeValue(prop, value);
            } catch (validationError) {
              throw new Error('Attribute validation error for "' + prop + '" with message: ' + validationError.message);
            }
            
            instance.$attributeValues[prop] = value;
          },
          
          get: function (proxy, prop) {            
            if (typeof instance[prop] === 'function') {
              return instance[prop];
            }
            
            if (prop.indexOf('$') === 0) {
              return instance[prop];
            }
            
            if (typeof instance.$model.$fns[prop] === 'function') {
              return instance.$model.$fns[prop];
            }            
            
            if (instance.$model.$attributeDefinitions.hasOwnProperty(prop)) {
              return instance.$attributeValues[prop] ||     // return instance value
                instance.$model.$attributeDefinitions[prop].defaultValue;  //  or default value if not set
            }
            
            throw new Error('Model has no attribute or callable named ' + prop);
          }
        });

        Object.keys(attributeValues).forEach(function initialValues(attributeName) {
          instanceProxy[attributeName] = attributeValues[attributeName];
        });
        
        return instanceProxy;
      },
      
    };
    
    Object.keys(properties.$statics).forEach(function attachStaticFn(staticName) {
      assert.equal(typeof properties.$statics[staticName], 'function');
      proto[staticName] = properties.$statics[staticName];
    });
    
    Object.keys(proto.$attributeDefinitions).forEach(function attributeValidateIterator(attributeName) {
      validateAttributeDefinition(attributeName, proto.$attributeDefinitions[attributeName]);
    });
    
    return Object.create(proto);
  },
  
};
