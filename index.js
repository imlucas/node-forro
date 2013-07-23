"use strict";

var util = require('util'),
    check = require('validator').check,
    sanitize = require('validator').sanitize;

module.exports = function composeForm(schema){
    // go through our schema and setup the actual fields.
    // if the field was just a static declaration, we can speed things up
    // later by just instantiating it now.
    // we can also decorate field names for easier debuging.
    Object.keys(schema).map(function(name){
        if(typeof schema[name] === 'function'){
            schema[name] = new schema[name]();
        }
        schema[name].name = name;
    });

    // the constructor should return a new form instance.
    var Composer = function(data){
        return new Form(Composer.schema, data);
    };

    // stash our schema on the composer if anyone wants to build on us.
    Composer.schema = schema;

    // return middleware handler for express
    //
    // example:
    //
    //    var forro = require('forro'),
    //        auth = module.exports = express(),
    //        AuthForm = forro({
    //            'username': forro.StringField.required(),
    //            'password': forro.StringField.required()
    //        });
    //
    //    auth.post('/login', AuthForm.middleware(), function(req, res){
    //        // use req.form.val('username') and req.form.val('password')
    //        // to authenticate the user.
    //    });
    //
    // @return {Function}
    Composer.middleware = function(){
        return function(req, res, next){
            req.form = new Form(schema);
            Object.keys(req.form.fields).map(function(key){
                req.form.set(key, req.param(key));
            });
            req.form.validate();

            if(req.form.errors.length === 0){
                return next();
            }
            next(new Error(req.form.errors[0]));
        };
    };

    // copy schema of otherComposer onto this one.
    // allows for form inheritance.
    //
    // example
    //     var forro = require('forro'),
    //         PageableForm = forro({
    //             'start': forro.NumberField.default(0),
    //             'results': forro.NumberField.default(20).max(100)
    //         }),
    //         SearchForm = forro({
    //             'q': forro.StringField.required().min(4)
    //         }).use(PageableForm);
    //
    // @param {Composer} otherComposer
    // @returns {Composer}
    Composer.use = function(otherComposer){
        if(!otherComposer.schema){
            throw new TypeError('i dont know what to do with this.');
        }
        Object.keys(otherComposer.schema).map(function(key){
            Composer.schema[key] = otherComposer.schema[key];
        });
        return Composer;
    };
    return Composer;
};

// forms are mutable and designed for one time use.
// they have fields and data added to them.
// running validate goes through all fields and
// validates and filters data where the data key is the field name.
//
// @param {Object} fields map of keys to Field instances
// @param {Object} data input data to validate and filter
function Form(fields, data){
    this.data = data || {};
    this.errors = [];
    this.fields = fields || {};
}

// validate all fields
//
// @todo (lucas) catch validation error messages and put on a stack.
//
// @returns {Form}
Form.prototype.validate = function(){
    for(var f in this.fields){
        try{
            this.data[f] = this.fields[f].validate(this.data[f]);
        }
        catch(e){
            this.errors.push(f + ' ' + e.message);
        }
    }
    return this;
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
//
// @param {String} key the field name
// @param {Object} value value to give the field to validate
// @returns {Form}
Form.prototype.set = function(key, value){
    this.data[key] = value;
    return this;
};

// get the validated and sanitized value for a field.
//
// @param {String} name
// @returns {Object} validated and filtered data
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


// base field that wraps node-validator to validate and filter a value.
function Field(){
    // a decoration name that will be added if this field is composed into
    // a form.
    this.name = undefined;

    // default value or function to call when validating if no user
    // input provided
    this.defaultValue = undefined;

    // functions to call on the node-validator Validator instance
    this.validators = [];

    // holder for validation vfailure messages
    this.messages = [];

    // default filtering methods to apply to all incoming input
    this.filters = ['trim', 'xss'];
}

// map of validator names to node-validator methods.
var validatorMap = {
    'is': ['is', 1, 'match %s'],
    'not': ['not', 1, 'match %s'],
    'email': ['isEmail', 0, 'be a valid email address'],
    'url': ['isUrl', 0, 'be a valid URL'],
    'ip': ['isIP', 0, 'be a valid IP address'],
    'numeric': ['isNumeric', 0, 'be numeric'],
    'hex': ['isHexadecimal', 0, 'be a hexidecimal'],
    'hexColor': ['isHexColor', 0, 'be a hex color code'],
    'int': ['isInt', 0, 'be an integer'],
    'float': ['isFloat', 0, 'be a float'],
    'notNull': ['notNull', 0, 'be null'],
    'isNull': ['isNull', 0, 'be null'],
    'notEmpty': ['notEmpty', 0, 'be empty'],
    'equals': ['equals', 1, 'equal %s'],
    'contains': ['contains', 1, 'contain %s'],
    'notContains': ['notContains', 1, 'contain %s'],
    'regex': ['regex', 1, 'match  %'],
    'notRegex': ['notRegex', 1, 'match  %'],
    'len': ['len', 1, 'have a length between %s and %s'],
    'uuid': ['isUUID', 0, 'be a UUID'],
    'date': ['isDate', 0, 'be a Date'],
    'after': ['isAfter', 1, 'be a Date after %s'],
    'before': ['isBefore', 1, 'be a Date before %s'],
    'in': ['isIn', 1, 'be one of %s'],
    'notIn': ['notIn', 1, 'be one of %s'],
    'min': ['min', 1, 'be longer than %s characters'],
    'max': ['max', 1, 'be no longer than %s characters'],
    'creditCard': ['isCreditCard', 0, 'be a valid credit card number'],
    'required': ['notEmpty', 0, 'be empty']
};


// add pass through methods.
Object.keys(validatorMap).map(function(meth){
    // adds a Field#{validator} method that will add to the
    // chain of node-validator methods to run when validating the form.
    //
    // @returns {Field}
    Field.prototype[meth] = function(){
        var args = Array.prototype.slice.call(arguments, 0),
            not = validatorMap[meth][0].indexOf('not') > -1 ? 'not ' : '',
            condition = 'must ' + not + validatorMap[meth][2];

        // message passed in as last argument
        if(args.length > validatorMap[meth][1]){
            condition = args.pop();
        }

        if(condition === 'must not be empty'){
            condition = 'is required';
        }

        if(args.length > 0){
            condition = util.format(condition, args[0], args[1]);
        }

        this.messages.push(condition);

        args.unshift(validatorMap[meth][0]);
        this.validators.push(args);
        return this;
    };
    Field.prototype[meth].name = 'forroToValidator' + meth;
});

// setter/getter for default value
//
// don't use `defineProperty` for better composition api.
// @returns {Filter} if setting, defaultValue or result of defaultValue callable.
Field.prototype['default'] = function(val){
    if(arguments.length === 0){
        if(typeof this.defaultValue === 'function'){
            return this.defaultValue();
        }
        return this.defaultValue;
    }
    this.defaultValue = val;
    return this;
};

// custom filter function to apply to an incoming field.
// @returns {Filter}
Field.prototype.use = function(fn){
    this.filters.push(fn);
    return this;
};

// filter any kind of input through some sanitization
// and throw if any validation functions fail.
//
// @param {Object} val any kind of input
// @returns {Object} sanitized value
// @throws {Error}
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
    this.validators.map(function(validatorArgs, index){
        if(validatorArgs.length === 0){
            return;
        }
        var args = validatorArgs.slice(0),
            method = args.shift();
        try{
            checker[method].apply(checker, args);
        }
        catch(e){
            throw new Error(self.messages[index]);
        }
    });
    return value;
};

// wrap a class to add static methods for all instance methods that merely
// created a new instance of a class and return calling the method
// using our new instance as the context.
//
// @param {Field} FieldConstructor
// @returns {Field} extended Prototype with statics that expand to instance methds.
Field.compose = function fieldComposer(FieldConstructor){
    var inst = FieldConstructor,
        methods = Array.prototype.concat.call([],
            Object.keys(FieldConstructor.super_.prototype),
            Object.keys(FieldConstructor.prototype));

    methods.map(function(meth){
        inst[meth] = function(){
            var i = new FieldConstructor();
            return i[meth].apply(i, Array.prototype.slice.call(arguments, 0));
        };
    });
    return inst;
};

// ## Fields
//
// pre-can some filters.  allows us to easily add new field types that handle
// different casting / deserialization scenarios.
//
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
//
// @param {Number|String} val time in ms or a valid date string
// @returns {Date}
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

// expose built-in field types wrapped in fieldComposer.
// if you are adding custom fields, please do this.
//
// example:
//
//     // my-json-field.js
//     var forro = require('forro'),
//         util = require('util');
//     function MyJsonField(){
//         MyJsonField.super_.call(this);
//         this.filters.push(this.parse.bind(this));
//     }
//     MyJsonField.prototype.parse = function(str){
//         return JSON.parse(str);
//     };
//     module.exports = Field.compose(MyJsonField);
//
module.exports.StringField = Field.compose(StringField);
module.exports.BooleanField = Field.compose(BooleanField);
module.exports.DateField = Field.compose(DateField);
module.exports.NumberField = Field.compose(NumberField);
