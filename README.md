# forro

WTForms style form validation for node.js, using the excellent
[validator](https://github.com/chriso/node-validator) module
to handle the actual validation and casting.


[![Build Status](https://secure.travis-ci.org/exfm/node-forro.png)](http://travis-ci.org/exfm/node-forro)

## Express Example

    var express = require("express"),
        app = express(),
        forro = require('forro');

    // ... some code

    var AuthForm = forro({
        'username': forro.string().required().max(32),
        'password': forro.string().required().length(4, 25),
        'rememberMe': forro.boolean()
    });

    app.post("/login", AuthForm.middleware(), function(req, res){
        // Middleware already validated for us
        // and sent back a 400 error if validation failed.
        // now we can just call out authentication function with
        // req.form.val('username') and req.form.val('password')
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