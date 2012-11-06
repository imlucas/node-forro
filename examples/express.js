"use strict";

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
    if(req.form.validateOrAbort()){
        res.send(req.form.val(['username', 'artist', 'album', 'title']));
    }
});

app.listen(8080);