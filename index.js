"use strict";

var util = require('util');

exports = function(decl, opts){
    return function(req, res){
        var f = new Form(req, res, decl, opts);
        return f;
    };
};

exports.form = function(F){
    return function(req, res, next){
        req.form = new F(req, res);
        next();
    };
};

function Form(req, res, decl, opts){
    opts = opts || {};
    this.req = req;
    this.res = res;
    this.fields = decl;
    this.errors = [];

    this.fieldOpts = {};
    if(opts.required !== undefined){
        this.fieldOpts.required = opts.required;
    }

    for(var f in this.fields){
        if(typeof this.field(f) === 'function'){
            this.fields[f] = new this.fields[f](this.fieldOpts);
        }
        this.fields[f].name = f;
        this.field(f).set(req.param(f, this.fields[f]['default']()));
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

Form.prototype.val = function(key){
    if(Array.isArray(key)){
        var k, r = {};
        for(k in key){
            r[key[k]] = this.val(key[k]);
        }
        return r;
    }
    else{
        return this.field(key).val();
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
    this.required = false;
    this.optional = false;

    if(opts.required !== undefined){
        this.required = opts.required;
    }
    else if(opts.optional !== undefined){
        this.optional = opts.optional;
        if(opts.optional === true){
            this.required = false;
        }
        else{
            this.required = true;
        }
    }
    this.name = undefined;
    this.defaultValue = opts['default'] || null;
    this.message = 'required';
}

Field.prototype['default'] = function(){
    if(typeof this.defaultValue === 'function'){
        return this.defaultValue();
    }
    return this.defaultValue;
};

Field.prototype.val = function(){
    return this.value;
};

// No way.  A String!
function StringField(opts){
    StringField.super_.call(this, opts);
}
util.inherits(StringField, Field);

StringField.prototype.set = function(val){
    this.value = val;
};

StringField.prototype.validate = function(){
    if(this.required && (!this.value || this.value.length === 0)){
        throw new ValidationError(this.message);
    }
    return this;
};

exports.StringField = StringField;

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

exports.DateField = DateField;

module.exports = exports;