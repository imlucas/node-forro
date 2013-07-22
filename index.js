"use strict";

var util = require('util'),
    check = require('validator').check,
    sanitize = require('validator').sanitize;

exports = function(decl, opts){
    // constructor called by new.
    // middleware will call this for every request
    // so 1 instance of a form = 1 request
    var inst = function factory(){
        var f = new Form(decl, opts);
        return f;
    };

    // return middleware handler for express
    inst.middleware = function(){
        return function(req, res, next){
            req.form = new Form(decl, opts);
        };
    };
};

// exports.form = function(F){
//     return function(req, res, next){
//         req.form = new F(req, res);
//         next();
//     };
// };

function Form(decl, opts){
    opts = opts || {};
    this.fields = decl;
    this.errors = [];

    this.fieldOpts = {};
    if(opts.required !== undefined){
        this.fieldOpts.required = opts.required;
    }
}

Form.prototype.field = function(name){
    return this.fields[name];
};

Form.prototype.validate = function(){
    for(var f in this.fields){
        try{
            this.field(f).validate();
        } catch(e){
            if(e.constructor === ValidationError){
                this.errors.push({
                    'field': this.field(f),
                    'message': e.message
                });
            }
            else{
                throw e;
            }
        }
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
Form.prototype.set = function(){};

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

function ValidationError(msg){
    this.name = 'ValidationError';
    this.message = msg;
    ValidationError.super_.call(this, msg);
}
util.inherits(ValidationError, Error);

function Field(opts){
    opts = opts || {};
    this.isRequired = false;
    this.isRequired = false;

    if(opts.required !== undefined){
        this.isRequired = opts.required;
    }
    else if(opts.optional !== undefined){
        this.isOptional = opts.optional;
        if(opts.optional === true){
            this.isRequired = false;
        }
        else{
            this.isRequired = true;
        }
    }
    this.name = undefined;
    this.defaultValue = opts['default'] || undefined;
    this.message = 'required';
}

Field.prototype.required = function(){
    this.isRequired = true;
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
// @todo (lucas) refactor from getter.
Field.prototype['default'] = function(){
    if(typeof this.defaultValue === 'function'){
        return this.defaultValue();
    }
    return this.defaultValue;
};

Field.prototype.required = function(){
    this.validators.push('notEmpty');
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

// No way.  A String!
function StringField(opts){
    StringField.super_.call(this, opts);
}
util.inherits(StringField, Field);

StringField.prototype.validate = function(){
    if(this.required && (!this.value || this.value.length === 0)){
        throw new ValidationError(this.message);
    }
    return this;
};

function NumberField(opts){
    NumberField.super_.call(this, opts);
}
util.inherits(NumberField, Field);

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

DateField.prototype.validate = function(){
    return this;
};

module.exports = exports;
// prodide short hand field types for export.
var types = {
    'string': StringField,
    'date': DateField,
    'number': NumberField
};
Object.keys(types).map(function(type){
    module.exports[type] = function(){
        return new types[type]();
    };
});

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
