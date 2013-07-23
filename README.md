# forro

WTForms style form validation for node.js, using the excellent
[validator](https://github.com/chriso/node-validator) module
to handle the actual validation and casting.


[![Build Status](https://secure.travis-ci.org/exfm/node-forro.png)](http://travis-ci.org/exfm/node-forro)

## Express Example

    var express = require("express"),
        app = express(),
        forro = require('forro'),
        StringField = forro.StringField,
        BooleanField = forro.BooleanField,
        DateField = forro.DateField;

    // ... some code

    var AuthForm = forro({
        'username': StringField.required().max(32),
        'password': StringField.required().length(4, 25),
        'remember_me': BooleanField
    });

     var BookmarkForm = forro({
        'url': StringField.required().url(),
        'tags': StringField.required().use(function tokenize(str){
            return str.split(',').map(function(s){
                return s.trim().toLowerCase();
            }).filter(function(s){
                return s.length > 0;
            });
        }),
        'created_on': DateField.default('now')
    });

    app.post("/login", AuthForm.middleware(), function(req, res){
        // Middleware already validated for us
        // and sent back a 400 error if validation failed.
        // now we can just call out authentication function with
        // req.form.val('username') and req.form.val('password')
    });

    app.post("/bookmark", BookmarkForm.middleware(), function(req, res){
        saveBookmark(req.form.val('url'), req.form.val('tags'), req.form.val('created_on'), function(err, bookmark){
            if(err) return next(err);
            res.send(bookmark);
        });
    });

    // ... some more code



## Install

     npm install node-forro

## Testing

    git clone
    npm install
    mocha

## License

MIT