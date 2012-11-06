"use strict";

var assert = require('assert');


var forro = require('../'),
    StringField = forro.StringField;

// var Form = forro({
//     'username': new StringField([
//         new forro.Required({'message': 'Username is required'}),
//         new forro.Length({
//             'message': 'Music be between 1 and 3 characters',
//             'min': 1,
//             'max': 3
//         })
//     ]),
//     'password': new StringField()
// });

function FakeRequest(data){
    this.params = {};
    for(var key in data){
        this.params[key] = data[key];
    }
}

FakeRequest.prototype.param = function(name){
    return this.params[name];
};

function FakeResponse(){
    this.code = -1;
    this.data = {};
}
FakeResponse.prototype.send = function(code, data){
    this.code = code;
    this.data = data;
};

describe('FORRO', function(){
    it('is both a form library and a genre of north brazilian music', function(){
        assert.ok(true);
    });

    it('allows a top level require all fields', function(){
        var AuthForm = forro({
            'username': StringField,
            'password': StringField
        }, {'required': true}),
            form = new AuthForm(new FakeRequest({'username': 'a', 'password':'b'}),
                new FakeResponse());

        Object.keys(form.fields).forEach(function(name){
            assert.ok(form.field(name).required);
        });
    });
    it('allows optional and required fields', function(){
        var AuthForm = forro({
                'username': new StringField({'required': true}),
                'password': new StringField({'required': true}),
                'rememberMeBro': new StringField({'optional': true})
            }),
            form = new AuthForm(new FakeRequest({'username': 'a', 'password':'b'}),
                new FakeResponse());

        Object.keys(form.fields).forEach(function(name){
            if(name === 'rememberMeBro'){
                assert(form.field(name).optional);
                assert(!form.field(name).required);
            }
            else{
                assert.ok(form.field(name).required);
            }
        });
    });
    it('validating valid data works as expected', function(){
        var AuthForm = forro({
                'username': new StringField({'required': true}),
                'password': new StringField({'required': true}),
                'rememberMeBro': new StringField({'optional': true})
            }),
            req = new FakeRequest({'username': 'a', 'password':'b'}),
            res = new FakeResponse(),
            form = new AuthForm(req, res);

        form.validate();
        assert(form.errors.length === 0);

    });
    it('fails validation for a simple missing string', function(){
        var AuthForm = forro({
                'username': new StringField({'required': true}),
                'password': new StringField({'required': true}),
                'rememberMeBro': new StringField({'optional': true})
            }),
            req = new FakeRequest({'password':'b'}),
            res = new FakeResponse(),
            form = new AuthForm(req, res);

        form.validate();
        assert(form.errors.length === 1);
        assert(form.errors[0].field.name === 'username');
    });
});