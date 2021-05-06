
var request = require('request');

var session = require("express-session");

//*******************************************/

const config = require('./config.json');

gateways_list = []

for (gateway in config.gateways) {
	g = {
		...{short_name: gateway},
		...config.gateways[gateway]
	}
	gateways_list.push(g)
}

config.gateways_list = gateways_list

console.dir(config)

//*******************************************/

module.exports = function (app) {

	app.get('/favicon.ico', function(req, res, next) {
		res.sendStatus(200)
	})

	app.get('/', function(req, res, next) {

		params = config
		params.home = true
		params.title = "Okta API Center"
		res.render('main', params)
	})

	app.get('/:gateway', function(req, res, next) {

		const gateway = req.params.gateway

		console.log("the gateway is: " + gateway)

		if (!(gateway_is_valid(gateway))) {
			res.json({msg: "sorry, that is not a valid url."})
			return
		}

		params = {
			...config,
			...config.gateways[gateway]
		}

		params.demo = true
		params.gateway = gateway
		params.home = false
		params.password = process.env.PASSWORD
		params.redirect_uri = process.env.APP_URL + "/" + gateway
		params.title = "Okta integrations: " + params.gateways[gateway].gateway_name

		console.dir(params)

		res.render('main', params)
	})

	app.post('/getAccessToken', function(req, res, next) {

		const code = req.body.code
		const gateway = req.body.gateway

		console.log("the authorization code is: " + code)
		console.log("the gateway is: " + gateway)

		// exchange the authorization code
		// for an access token

		const url = config.okta_issuer + "/v1/token"

		const redirect_uri = process.env.APP_URL + "/" + gateway

		var options = {
			method: 'POST',
			url: url,
			qs: {
				grant_type: 'authorization_code',
				code: code,
				redirect_uri: redirect_uri
			},
			headers: {
				'cache-control': 'no-cache',
				authorization: 'Basic ' + getBasicAuthString(req.session.partner),
				'content-type': 'application/x-www-form-urlencoded'
			}
		}

		request(options, function (error, response, body) {
			if (error) throw new Error(error)

			console.log(body)

			var obj = JSON.parse(body)

			if (obj.hasOwnProperty("access_token")) {
				req.session.access_token = obj.access_token;
				console.log("the access token is: " + req.session.access_token);
			}
			if (obj.hasOwnProperty("id_token")) {
				req.session.id_token = obj.id_token;
			}

			// send the access token to the introspection endpoint
			// (for illustration purposes only)

			const url = config.okta_issuer + "/v1/introspect"

			var options = {
				method: 'POST',
				url: url,
				qs: { token: req.session.access_token },
				headers: {
					'cache-control': 'no-cache',
					authorization: 'Basic ' + getBasicAuthString(),
					accept: 'application/json',
					'content-type': 'application/x-www-form-urlencoded'
				}
			};

			request(options, function (error, response, body) {
				if (error) throw new Error(error)

				console.log("response from Okta: ")
				console.log(body)

				var data = {
					access_token_introsp_response: body,
					access_token: req.session.access_token
				}

				res.json(data)
			})
		})
	})

	app.post('/getData', function(req, res, next) {

		const endpoint = req.body.endpoint;
		const gateway = req.body.gateway;

		const url = config.gateways[gateway].gateway_url + "/" + req.body.endpoint;

		var options = {
			method: 'GET',
			url: url,
			headers: {
				'cache-control': 'no-cache',
				authorization: "Bearer " + req.session.access_token,
				accept: 'application/json',
				'content-type': 'application/x-www-form-urlencoded'
			}
		}

		request(options, function (error, response, body) {
			if (error) throw new Error(error)

			console.log("******\nresponse from API gateway: ")
			console.log("the status code is: " + response.statusCode)

			console.log("the body is:")
			console.log(body)

			if (response.statusCode == 403) {
				res.json({message: 'forbidden'})
				console.log("the request is forbidden")
			}
			else if (response.statusCode == 401) {
				res.json({ message: 'unauthorized' })
				console.log("the request is unauthorized")
			}
			else {
				res.json(body)
			}
		})
	})

	app.post('/killSession', function(req, res, next) {
		req.session.destroy(function(err) {
			if (err) {
				console.log("unable to destroy session.")
			}
			else {
				console.log("successfully destroyed session.")
			}
			res.send("OK")
		})
	})
}

function getBasicAuthString() {

	var x = config.okta_client_id + ":" + process.env.OKTA_CLIENT_SECRET

	var y = new Buffer(x).toString('base64')

	return y
}

function gateway_is_valid(gateway) {

	for (g in config.gateways) {
		if (gateway == g) {
			return true
		}
	}
	return false
}
