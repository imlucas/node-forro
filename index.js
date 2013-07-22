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
        decl[name].name = name;
    }

    // constructor called by new.
    // middleware will call this for every request
    // so 1 instance of a form = 1 request
    return function(data){
        return new Form(decl, data);
    };

    // // return middleware handler for express
    // inst.middleware = function(){
    //     return function(req, res, next){
    //         req.form = new Form(decl, opts);
    //         req.form.fields.map(function(field){
    //             req.form.set(field.name, req.param(field.name));
    //         });

    //         try{
    //             req.validate();
    //             next();
    //         }
    //         catch(e){
    //             next(e);
    //         }
    //     };
    // };
    // return inst;
};

function Form(decl, data){
    data = data || {};
    this.fields = decl;
    this.set(data);
}

Form.prototype.field = function(name){
    return this.fields[name];
};

// validate all fields
//
// @throws {ValidationError}
Form.prototype.validate = function(){
    for(var f in this.fields){
        this.field(f).validate();
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
Form.prototype.set = function(obj){
    for(var name in obj){
        if(this.fields.hasOwnProperty(name)){
            this.fields[name].set(obj[name]);
        }
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
            r[name[k]] = this.val(name[k]);
        }
        return r;
    }
    else{
        return this.field(name).val();
    }
};

// base field that wraps node-validator.
function Field(){
    this.name = undefined;
    this.defaultValue = undefined;
    this.message = 'required';
    this.validators = [];
}

// shortcut for adding a `notEmpty` validator
Field.prototype.required = function(){
    this.isRequired = true;
    this.validators.push(['notEmpty']);
    return this;
};

// Set like this.checker = check(this.value);
Field.prototype.checker = null;

// Functions to call on the checker
//
//     this.validators.push(validators.email);
Field.prototype.validators = [];

// node-validator to run sanitizer on
//
//     this.sanitizer = sanitize(this.value);
Field.prototype.sanitizer = null;

// Functions to call on the sanitizer
//
//     this.filters.push(filters.xss);
Field.prototype.filters = ['trim', 'xss'];

// Setter for default value
Field.prototype['default'] = function(val){
    if(typeof val === 'function'){
        this.defaultValue = val();
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


// Gets the sanitized value.
Field.prototype.val = function(){
    return this.value;
};

// @todo (lucas) Set raw value and run validators and filters here?
Field.prototype.set = function(val){
    this.value = val;
    return this;
};

Field.prototype.validate = function(){
    var checker = check(this.value),
        sanitizer = sanitize(this.value),
        self = this;

    this.validators.map(function(validatorArgs){
        if(validatorArgs.length === 0){
            return;
        }
        var method = validatorArgs.pop();
        checker[method].apply(checker, validatorArgs);
    });

    this.filters.map(function(filter){
        if(typeof filter === 'function'){
            self.value = filter(self.value);
        }
        else {
            self.value = sanitizer[filter]();
        }
    });
};

// No way.  A String!
function StringField(opts){
    StringField.super_.call(this, opts);
}
util.inherits(StringField, Field);

function NumberField(opts){
    NumberField.super_.call(this, opts);
}
util.inherits(NumberField, Field);

function BooleanField(opts){
    BooleanField.super_.call(this, opts);
}
util.inherits(BooleanField, Field);

// Cast a field to a proper Date object.
// Doesn't matter if its a string format or epoch.
function DateField(opts){
    DateField.super_.call(this, opts);
}
util.inherits(DateField, Field);

DateField.prototype.set = function(val){
    this.value = new Date(Number(val));
    return this;
};

module.exports = exports;

// prodide short hand field types for export.
var types = {
    'string': StringField,
    'date': DateField,
    'number': NumberField,
    'boolean': BooleanField
};
Object.keys(types).map(function(type){
    module.exports[type] = function(){
        return new types[type]();
    };
});

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

// Examples.
// var forro = require('forro'),
//     Dot = require('./model'),
//     api = require('./api'),
//     myForm = forro({
//         'boe': forro.string().required(),
//         'bax': forro.string().required(),
//         'moe': forro.string(),
//         'french': forro.string().in(['mustard', 'fries', 'wine'])
//     }),
//     dotForm = forro({
//         'sentiment': forro.number().required().in([1, -1]),
//         'hashtags': forro.string().required().use(Dot.tokenizeHashtags),
//         'created_on': forro.date().default('now')
//     });

// api.post('/', myForm.middleware(), function(req, res){
//     req.form.boe.val();
//     req.form.val('boe');
//     req.form.val('boe', 'bax');  // object or array?
// });

// // as a middleware, should process and sanitize.
// // if there are validation errors, automatically call next with form errors.
// api.post('/dot', myForm.middleware(), function(req, res, next){
//     Dot.create(req.form.sentiment.val(), req.form.hashtags.val(), req.form.created_on.val(), function(err, dot){
//         if(err) return next(err);
//         res.send(dot);
//     });
// });


// // as a middleware, should process and sanitize.
// // if there are validation errors, automatically call next with form errors.
// api.post('/dot', function(req, res, next){
//     // Call a Function, with field values as args and last arg as the callback function
//     req.form.call(Dot.create, ['sentiment', 'hashtags', 'created_on'], function(err, dot){
//         if(err) return next(err);
//         res.send(dot);
//     });
// }).form(myForm);
