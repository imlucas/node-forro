"use strict";

var util = require('util'),
    check = require('validator').check,
    sanitize = require('validator').sanitize;

function ValidationError(msg){
    this.name = 'ValidationError';
    this.message = msg;
    ValidationError.super_.call(this, msg);
}
util.inherits(ValidationError, Error);

exports = function(decl){
    for(var name in decl){
        if(typeof decl[name] === 'function'){
            decl[name] = new decl[name]();
        }
        decl[name].name = name;
    }

    // constructor called by new.
    // middleware will call this for every request
    // so 1 instance of a form = 1 request
    var inst = function(data){
        return new Form(decl, data);
    };

    // return middleware handler for express
    inst.middleware = function(){
        return function(req, res, next){

            req.form = new Form(decl, {});
            Object.keys(req.form.fields).map(function(key){
                req.form.set(key, req.param(key));
            });
            try{
                req.form.validate();
                next();
            }
            catch(e){
                next(e);
            }
        };
    };
    return inst;
};

function Form(decl, data){
    decl = decl || {};
    this.data = data || {};

    this.fields = decl;
    this.set(this.data);
}

Form.prototype.field = function(name){
    return this.fields[name];
};

// validate all fields
//
// @throws {ValidationError}
Form.prototype.validate = function(){
    for(var f in this.fields){
        this.data[f] = this.field(f).validate(this.data[f]);
    }
    return this;
};

Form.prototype.validateOrAbort = function(){
    if(this.validate().errors.length > 0){
        this.res.send(400, this.errors);
    }
    return true;
};

// Take a list of field names and return a list of values.
//
// @param {Array} names
Form.prototype.vals = function(names){
    var self = this;
    return names.map(function(name){
        return self.val(name);
    });
};

// populate fields with data.
Form.prototype.set = function(key, value){
    if(typeof key === 'object' && !value){
        if(Object.keys(key).length < 1){
            return this;
        }
        var name, obj = key;
        for(name in obj){
            this.data[name] = obj[name];
        }
    }
    else {
        this.data[key] = value;
    }
    return this;
};

// get the validated and sanitized value for a field.
//
// @param {String} name
Form.prototype.val = function(name){
    if(Array.isArray(name)){
        var k, r = {};
        for(k in name){
            r[name[k]] = this.data[name[k]];
        }
        return r;
    }
    else{
        return this.data[name];
    }
};

// map of validator names to validator methods.
var validators = {
    'is': 'is',
    'not': 'not',
    'email': 'isEmail',
    'url': 'isUrl',
    'ip': 'isIP',
    'ipv4': 'isIPv4',
    'ipv6': 'isIPv6',
    'alpha': 'isAlpha',
    'alphanumeric': 'isAlphanumeric',
    'numeric': 'isNumeric',
    'hex': 'isHexadecimal',
    'hexColor': 'isHexColor',
    'int': 'isInt',
    'lowercase': 'isLowercase',
    'uppercase': 'isUppercase',
    'decimal': 'isDecimal',
    'float': 'isFloat',
    'notNull': 'notNull',
    'isNull': 'isNull',
    'notEmpty': 'notEmpty',
    'equals': 'equals',
    'contains': 'contains',
    'notContains': 'notContains',
    'regex': 'regex',
    'notRegex': 'notRegex',
    'length': 'len',
    'uuid': 'isUUID',
    'uuidv3': 'isUUIDv3',
    'uuidv4': 'isUUIDv4',
    'date': 'isDate',
    'after': 'isAfter',
    'before': 'isBefore',
    'in': 'isIn',
    'notIn': 'notIn',
    'min': 'min',
    'max': 'max',
    'creditCard': 'isCreditCard'
};

// base field that wraps node-validator.
function Field(){
    this.name = undefined;
    this.defaultValue = undefined;
    this.isDefaultValue = undefined;
    this.message = 'required';
    this.validators = [];
    this.filters = ['trim', 'xss'];
}

Object.keys(validators).map(function(meth){
    Field.prototype[meth] = function(){
        var args = Array.prototype.slice.call(arguments, 0);
        args.unshift(meth);
        this.validators.push(args);
        return this;
    };
});

// shortcut for adding a `notEmpty` validator
Field.prototype.required = function(){
    this.isRequired = true;
    this.validators.push(['notEmpty']);
    return this;
};

// Functions to call on the node-validator Validator instance
//
//     this.validators.push(validators.email);
Field.prototype.validators = [];

// Functions to call on the node-validator Filter instance
//
//     this.filters.push(filters.xss);
// Field.prototype.filters = ['trim', 'xss'];

// Setter for default value
Field.prototype['default'] = function(val){
    if(arguments.length === 0){
        if(typeof this.defaultValue === 'function'){
            return this.defaultValue();
        }
        return this.defaultValue;
    }
    else {
        this.defaultValue = val;
    }
    return this;
};

// Custom filter function to apply to an incoming field.
// should be called before or after native (ie toInt, toString)?
// callback-able?
Field.prototype.use = function(fn){
    this.filters.push(fn);
    return this;
};

Field.prototype.validate = function(val){
    var value = val || this.default(),
        checker,
        sanitizer = sanitize(value),
        self = this;

    this.filters.map(function(filter){
        if(typeof filter === 'function'){
            value = filter(value);
        }
        else {

            value = sanitizer[filter]();
        }
    });

    checker = check(value);

    this.validators.map(function(validatorArgs){
        if(validatorArgs.length === 0){
            return;
        }
        var args = validatorArgs.slice(0),
            method = args.pop();
        checker[method].apply(checker, args);
    });
    return value;
};

// No way.  A String!
function StringField(){
    StringField.super_.call(this);
}
util.inherits(StringField, Field);

function NumberField(){
    NumberField.super_.call(this);
    this.filters.push('toInt');
}
util.inherits(NumberField, Field);

function BooleanField(){
    BooleanField.super_.call(this);
    this.filters.push('toBoolean');
}
util.inherits(BooleanField, Field);

// Cast a field to a proper Date object.
// Doesn't matter if its a string format or epoch.
function DateField(){
    DateField.super_.call(this);
    this.filters.push(this.castDate.bind(this));
}
util.inherits(DateField, Field);

// For setting the default value to now
//
//     var forro = require('forro'),
//         myForm = forro({
//             'created_on': forro.DateField.default(forro.DateField.now)
//         });
DateField.now = function(){
    return new Date().getTime();
};

// Handle casting ms or timestamp string to a Date instance.
DateField.prototype.castDate = function(val){
    if(val){
        var ms = parseInt(val, 10);
        return new Date((isNaN(ms) ? val : ms));
    }
    else {
        val = undefined;
    }
    return val;
};

module.exports = exports;

// wrap a class to add static methods for all instance methods that merely
// created a new instance of a class and return calling the method
// using our new instance as the context.
function typeHolder(Prototype){
    var inst = Prototype,
        methods = Array.prototype.concat.call([],
            Object.keys(Prototype.super_.prototype),
            Object.keys(Prototype.prototype));

    methods.map(function(meth){
        inst[meth] = function(){
            var i = new Prototype();
            return i[meth].apply(i, Array.prototype.slice.call(arguments, 0));
        };
    });
    return inst;
}

// expose fields for typing
module.exports.StringField = typeHolder(StringField);
module.exports.BooleanField = typeHolder(BooleanField);
module.exports.DateField = typeHolder(DateField);
module.exports.NumberField = typeHolder(NumberField);
