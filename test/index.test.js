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

    it('should run the simplest filters', function(){
        var AuthForm = forro({
            'username': forro.string().required(),
            'password': forro.string().required()
        }), form;

        form = new AuthForm({'username': '  a  ', 'password':'b'});
        form.validate();

        assert.equal(form.val('username'), 'a');
    });

    it('should cast numbers', function(){
        var PizzaForm = forro({
            'quantity': forro.number()
        }), form;
        form = new PizzaForm({'quantity': '  1  '}).validate();
        assert.equal(form.val('quantity'), 1);
    });

    it('should cast booleans', function(){
        var PizzaForm = forro({
            'hasExtraToppings': forro.boolean(),
            'wantItNow': forro.boolean(),
            'breadsticks': forro.boolean()
        }), form;

        form = new PizzaForm({
            'hasExtraToppings': '  1  ',
            'wantItNow': 'oh yeah',
            'breadsticks': 'false'
        }).validate();

        assert.deepEqual(form.val('hasExtraToppings'), true);
        assert.deepEqual(form.val('wantItNow'), true);
        assert.deepEqual(form.val('breadsticks'), false);
    });

    it('should correctly cast Date fields from strings', function(){
        var PizzaForm = forro({
            'orderPlaced': forro.date()
        }), form, when = new Date();

        form = new PizzaForm({
            'orderPlaced': when.toUTCString()
        }).validate();

        assert.equal(form.val('orderPlaced').toUTCString(), when.toUTCString());
    });

    it('should correctly cast Date fields from timestamps as strings', function(){
        var PizzaForm = forro({
            'orderPlaced': forro.date()
        }), form, when = new Date();

        form = new PizzaForm({
            'orderPlaced': when.getTime()
        }).validate();

        assert.equal(form.val('orderPlaced').toUTCString(), when.toUTCString());
    });

    it('should allow undefined dates');

    it('should allow setting datefield default to now');

    it('should allow custom filters');

    it('should handle type comparison in validators');
});