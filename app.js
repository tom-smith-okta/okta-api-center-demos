// Okta API Access Management

////////////////////////////////////////////////////
require('dotenv').config();

require('./cfg.js');

const express = require('express');

const mustacheExpress = require('mustache-express')

var fs = require('fs');

var session = require("express-session");

///////////////////////////////////////////////////

// SET UP WEB SERVER
const app = express();

app.use(express.static('public'));

app.use(session({ secret: SESSION_SECRET, cookie: { maxAge: SESSION_MAX_AGE }}));

app.use(express.json());

app.engine('html', mustacheExpress())

app.set('view engine', 'html')


require('./routes.js')(app);

var port = process.env.PORT || 3090

app.listen(port, function () {
	console.log('App listening on port ' + port);
});