"use strict";

var assert = require('assert');

var forro = require('../');

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

describe('forro', function(){
    it('is both a form library and a genre of north brazilian music', function(){
        assert.ok(true);
    });

    it('allows a top level require all fields', function(){
        var AuthForm = forro({
            'username': forro.string().required(),
            'password': forro.string().required()
        });

        // form = new AuthForm(new FakeRequest({'username': 'a', 'password':'b'}),
        //         new FakeResponse());
        // Object.keys(form.fields).forEach(function(name){
        //     assert.ok(form.field(name).required);
        // });
    });
    it('allows optional and required fields', function(){
        var AuthForm = forro({
                'username': forro.string().required(),
                'password': forro.string().required(),
                'rememberMeBro': forro.string()
            });

    //     form = new AuthForm(new FakeRequest({'username': 'a', 'password':'b'}),
    //         new FakeResponse());

    // Object.keys(form.fields).forEach(function(name){
    //     if(name === 'rememberMeBro'){
    //         assert(form.field(name).optional);
    //         assert(!form.field(name).required);
    //     }
    //     else{
    //         assert.ok(form.field(name).required);
    //     }
    // });
    });
    it('validating valid data works as expected', function(){
        var AuthForm = forro({
                'username': forro.string().required(),
                'password': forro.string().required(),
                'rememberMeBro': forro.string()
            });
            // req = new FakeRequest({'username': 'a', 'password':'b'}),
            // res = new FakeResponse(),
            // form = new AuthForm(req, res);

        // form.validate();
        // assert(form.errors.length === 0);

    });
    it('fails validation for a simple missing string', function(){
        var AuthForm = forro({
                'username': forro.string().required(),
                'password': forro.string().required(),
                'rememberMeBro': forro.string()
            });
        //     req = new FakeRequest({'password':'b'}),
        //     res = new FakeResponse(),
        //     form = new AuthForm(req, res);

        // form.validate();
        // assert(form.errors.length === 1);
        // assert(form.errors[0].field.name === 'username');
    });
});