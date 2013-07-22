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

    it('should support the simplest form', function(){
        var AuthForm = forro({
            'username': forro.string().required(),
            'password': forro.string().required()
        });

        assert(new AuthForm({'username': 'a', 'password':'b'}).validate());
    });

    it('should throw if a required field is not supplied', function(){
        var AuthForm = forro({
            'username': forro.string().required(),
            'password': forro.string().required()
        });
        assert.throws(function(){
            new AuthForm({'username': 'a'}).validate();
        }, Error);
    });

    it('should throw if a required field is just whitespace', function(){
        var AuthForm = forro({
            'username': forro.string().required(),
            'password': forro.string().required()
        });

        assert.throws(function(){
            new AuthForm({'username': '        ', 'password': 'ja'}).validate();
        }, Error);
    });

    it('should allow required and optional fields', function(){
        var AuthForm = forro({
            'username': forro.string().required(),
            'password': forro.string().required(),
            'rememberMe': forro.boolean()
        });

        assert(new AuthForm({'username': 'a', 'password':'b'}).validate());
    });

    it('should access actual field values correctly');

    it('should not automatically supply a default value if none specified');
});