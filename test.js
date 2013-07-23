"use strict";

var assert = require('assert'),
    forro = require('./'),
    StringField = forro.StringField,
    NumberField = forro.NumberField,
    DateField = forro.DateField,
    BooleanField = forro.BooleanField;

describe('forro', function(){
    it('is both a form library and a genre of north brazilian music', function(){
        assert.ok(true);
    });

    it('should support the simplest form', function(){
        var AuthForm = forro({
            'username': StringField.required(),
            'password': StringField.required()
        });

        assert(new AuthForm({'username': 'a', 'password':'b'}).validate());
    });

    it('should throw if a required field is not supplied', function(){
        var AuthForm = forro({
            'username': StringField.required(),
            'password': StringField.required()
        }), form =  new AuthForm({'username': 'a'}).validate();
        assert(form.errors.length > 0);
    });

    it('should throw if a required field is just whitespace', function(){
        var AuthForm = forro({
            'username': StringField.required(),
            'password': StringField.required()
        }), form = new AuthForm({'username': '        ', 'password': 'ja'}).validate();
        assert(form.errors.length > 0);
    });

    it('should allow required and optional fields', function(){
        var AuthForm = forro({
            'username': StringField.required(),
            'password': StringField.required(),
            'rememberMe': BooleanField
        });

        assert(new AuthForm({'username': 'a', 'password':'b'}).validate());
    });

    it('should run the simplest filters', function(){
        var AuthForm = forro({
            'username': StringField.required(),
            'password': StringField.required()
        }), form;

        form = new AuthForm({'username': '  a  ', 'password':'b'});
        form.validate();

        assert.equal(form.val('username'), 'a');
    });

    it('should cast numbers', function(){
        var PizzaForm = forro({
            'quantity': NumberField
        }), form;
        form = new PizzaForm({'quantity': '  1  '}).validate();
        assert.equal(form.val('quantity'), 1);
    });

    it('should cast booleans', function(){
        var PizzaForm = forro({
            'hasExtraToppings': BooleanField,
            'wantItNow': BooleanField,
            'breadsticks': BooleanField
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
            'orderPlaced': DateField
        }), form, when = new Date();

        form = new PizzaForm({
            'orderPlaced': when.toUTCString()
        }).validate();

        assert.equal(form.val('orderPlaced').toUTCString(), when.toUTCString());
    });

    it('should correctly cast Date fields from timestamps as strings', function(){
        var form, when = new Date();
        form = new forro({
            'orderPlaced': DateField
        })({'orderPlaced': when.getTime()}).validate();

        assert.equal(form.val('orderPlaced').toUTCString(), when.toUTCString());
    });

    it('should allow undefined dates', function(){
        var form = new forro({
                'orderPlaced': DateField
            })({}).validate();
        assert.equal(form.val('orderPlaced'), undefined);
    });

    it('should treat empty dates as undefined', function(){
        var form = new forro({
                'orderPlaced': DateField
            })({'orderPlaced': ''}).validate();
        assert.equal(form.val('orderPlaced'), undefined);
    });

    it('should allow setting datefield default to now', function(){
        var form = new forro({
            'orderPlaced': DateField.default(DateField.now)
        })({'orderPlaced': ''}).validate();
        assert(form.val('orderPlaced'));
    });

    it('should allow custom filters', function(){
        var form = new forro({
            'tags': StringField.use(function(str){
                return str.split(',').map(function(s){
                    return s.trim().toLowerCase();
                }).filter(function(s){
                    return s.length > 0;
                });
            })
        })({'tags': 'GoT, bearFight'}).validate();
        assert.deepEqual(form.val('tags'), ['got', 'bearfight']);
    });

    it('should expand static declarations to instances', function(){
        var Klass = forro({
            'username': StringField.required(),
            'full': BooleanField
        }), inst;

        inst = new Klass();

        assert.equal(typeof inst.fields.username, 'object');
        assert.equal(inst.fields.username.name, 'username');

        assert.equal(typeof inst.fields.full, 'object');
        assert.equal(inst.fields.full.name, 'full');
    });

    it('should be able to compose forms', function(){
        var PagableForm = forro({
                'results': NumberField.default(20).max(100),
                'start': NumberField.default(0)
            }),
            SearchForm = forro({
                'q': StringField.required().min(4)
            }).use(PagableForm),
            form = new SearchForm({'q': 'mogwai'}).validate();
        assert.equal(form.val('start'), 0);
        assert.equal(form.val('results'), 20);
        assert.equal(form.val('q'), 'mogwai');
    });

    it('should have nice error messages by default', function(){
        var SearchForm = forro({
            'q': StringField.required()
        });
        assert.deepEqual(new SearchForm({}).validate().errors[0],
            'q is required');
    });

    it('should allow supplying an error message for a validator', function(){
        var SearchForm = forro({
            'q': StringField.required('should be something to search for no?')
        });
        assert.deepEqual(new SearchForm({}).validate().errors[0],
            'q should be something to search for no?');
    });

    it('should allow supplying message formatting tokens', function(){
        var SearchForm = forro({
            'q': StringField.len(4, 20, 'must be between %s and %s characters')
        });

        assert.deepEqual(new SearchForm({'q': 'mog'}).validate().errors[0],
            'q must be between 4 and 20 characters');
    });

    describe('middleware', function(){
        var AuthForm = forro({
            'username': StringField.required(),
            'password': StringField.required()
        });

        function expressish(data, path, mid, fn, done){
            var req = {
                    'param': function(key){
                        return data[key];
                    }
                },
                res = {};

            mid(req, res, function(e){
                if(e){
                    return done(e);
                }
                fn(req, res);
            });
        }

        it('should set req.form', function(done){
            expressish({'username': 'lucas', 'password': 'password'}, '/login', AuthForm.middleware(), function(req, res){
                assert(req.form);
                assert.equal(req.form.val('username'), 'lucas');
                assert.equal(req.form.val('password'), 'password');
                done();
            }, done);
        });

        it('should pass an error to next', function(done){
            expressish({'username': 'lucas'}, '/login', AuthForm.middleware(), function(req, res){
                done(new Error('should have bailed before calling the actual controller'));
            }, function(e){
                done();
            });
        });
    });
});