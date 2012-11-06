# forro

WTForms style form validataion for node.js

## Express Example

    var express = require("express"),
        app = express(),
        forro = require('forro'),
        StringField = forro.StringField;


    var EditForm = forro({
        'username': StringField,
        'artist': StringField,
        'album': StringField,
        'title': StringField
    }, {'required': true}); // Require all fields


    app.use(express.bodyParser());

    app.all("/:id/edit", forro.form(EditForm), function(req, res){
        // Middle ware already validated for us
        // and sent back a 400 error if validation failed.
        res.send(req.form.val(['username', 'artist', 'album', 'title']));
    });

app.listen(8080);


## Install

     npm install node-forro

## Testing

    git clone
    npm install
    mocha
