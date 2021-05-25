// Okta API Access Management

require('dotenv').config()

const express = require('express')

const mustacheExpress = require('mustache-express')

var session = require("express-session")

///////////////////////////////////////////////////

const app = express();

app.use(session({
	secret: process.env.SESSION_SECRET,
	cookie: { maxAge: parseInt(process.env.SESSION_MAX_AGE)}
}))

app.use(express.json());

app.engine('html', mustacheExpress())

app.set('view engine', 'html')

require('./routes.js')(app);

var port = process.env.PORT || 3090

app.listen(port, function () {
	console.log('App listening on port ' + port);
});