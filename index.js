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
  return this.toObject().toString();
};

ModelInstance.prototype.toObject = function() {
  return this.$attributeValues;
};



function validateAttributeDefinition(attributeName, attributeDefinition) {
  // type: String, required: true, defaultValue: 'foo', validate: notBar 
  assert(attributeName && attributeName.indexOf('$') !== 0, 'Attribute name is illegal.');
  assert(attributeDefinition.type, 'Type property is required for attribute ' + attributeName);
  assert.doesNotThrow(function () { new attributeDefinition.type(); }, 'Type does not name a type');
  assert.notEqual(typeof attributeDefinition.defaultValue, 'undefined');
  
  if (typeof attributeDefinition.required !== 'undefined') {
    assert.equal(typeof attributeDefinition.required, 'boolean');
  } else {
    attributeDefinition.required = false;
  }
  
  if (typeof attributeDefinition.validate !== 'undefined') {
    assert(Array.isArray(attributeDefinition.validate));
  }
}



module.exports = {
  
  createModel: function (properties) {
    assert(typeof properties.$meta === 'object', 'Missing Model metas');
    assert(typeof properties.$meta.name === 'string', 'Missing Model name in $meta');
    
    var proto = {
      
      // properties are available from $model inside objects
      $meta: properties.$meta,
      $fns: properties.$fns,
      $attributeDefinitions: _.omit(properties, ['$statics', '$meta', '$fns']),
      
      $validateAttributeValue: function validateAttributeValue(name, value) {
        var def = this.$attributeDefinitions[name];
        var validators = def.validate;
        
        if (def.required === true && (typeof value === 'undefined' || value === null)) {
          throw new Error('cannot unset required attribute.');
        }
        
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
            
            if (prop.indexOf('$') === 0) {
              return instance[prop];
            }
            
            if (typeof instance.$model.$fns[prop] === 'function') {
              return instance.$model.$fns[prop];
            }            
            
            if (instance.$model.$attributeDefinitions.hasOwnProperty(prop)) {
              if (typeof instance.$attributeValues[prop] !== 'undefined') {
                return instance.$attributeValues[prop];
              } else {
                if (instance.$model.$attributeDefinitions[prop].required !== true) {
                  return instance.$model.$attributeDefinitions[prop].defaultValue;  //  or default value if not set
                } else {
                  console.error('No value for required field (this should be only an internal error, file a bug if you see this).');
                  return undefined;
                }
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
          return typeof instanceProxy[name] !== 'undefined';
        });
        
        if (!requiredAttributesOk) {
          throw new Error('Missing required attribute(s).');
        }
        
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
