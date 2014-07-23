
var fs = require('fs');
var stripJsonComments = require('strip-json-comments');
var clc = require('cli-color');

const 
	ENV_VAR_KEY = 'SWB_CONF_FILE',
	CONF_FILE = process.env[ENV_VAR_KEY] || (__dirname + '/swbConfig.json'),
	// Console text styling
	errorStyle = clc.red.bold,
	headerStyle = clc.yellow.bold,
	fileStyle = clc.blueBright,
	confFileStyle = clc.cyan,
	portStyle = clc.greenBright,
	proxyStyle = clc.magenta,
	delayTimeStyle = clc.red,
	featureStyle = clc.yellow,
	boldStyle = clc.bold;

console.log("\nEnvironment variable " + ENV_VAR_KEY + " is " + (process.env[ENV_VAR_KEY] ? "defined." : "missing!") +
	"\nReading configuration from file: " + confFileStyle(CONF_FILE));

var conf;
try {
	conf = JSON.parse(stripJsonComments(fs.readFileSync(CONF_FILE, 'utf8')));
}
catch (e) {}

if (!conf || !Array.isArray(conf.servers) || !conf.servers.length) {
	console.error(errorStyle("\nError: Problem parsing servers configuration file." +
	"\nPlease check it and run again."));
	return;
}

var express = require('express');
var httpProxy = require('http-proxy');

var proxy = httpProxy.createProxyServer();

var getDelayCheckRequestHandler = function(pathRegExp, delay) {
	return function(req, res, next) {
		if (pathRegExp.test(req.url)) {
			setTimeout(next, delay);
		}
		else {
			next();
		}
	};
};
var getFixtureCheckRequestHandler = function(fixtures) {
	return function(req, res, next) {
		if (!fixtures.some(function(fixture) {
			if (fixture.methodRegExp.test(req.method) && fixture.pathRegExp.test(req.url)) {
				res.json(fixture.response.status, fixture.response.body);
				return true;
			}
		})) {
			next();
		}
	};
};
var getProxyCheckRequestHandler = function(pathRegExp, proxyHost, proxyPort) {
	return function(req, res, next) {
		if (pathRegExp.test(req.url)) {
			proxy.web(req, res, {
				target: {
					host: proxyHost,
					port: proxyPort
				}
			});
		}
		else {
			next();
		}
	};
};

conf.servers.forEach(function(serverConf) {
	var app = express(),
		pathRegExp,
		messages = "\n" + headerStyle("Serving ") + fileStyle(serverConf.srcDir) + " on port " + portStyle(serverConf.port);
	if (serverConf.delay) {
		pathRegExp = new RegExp("(?:" + serverConf.delay.pathPatterns.join(")|(?:") + ")");
		app.use(getDelayCheckRequestHandler(pathRegExp, serverConf.delay.time));
		messages += "\n" + featureStyle("Delay") + " of " + delayTimeStyle(serverConf.delay.time + " ms") + " is activated for path patterns: " + boldStyle(serverConf.delay.pathPatterns.join(", "));
	}
	if (serverConf.fixtures) {
		var activeFixtures = serverConf.fixtures.filter(function(fixture) {return fixture.active;});
		activeFixtures.forEach(function(fixture) {
			fixture.request.methods.forEach(function(method, i, methods) {
				methods[i] = method.toUpperCase();
			});
			fixture.methodRegExp = new RegExp("(?:" + fixture.request.methods.join(")|(?:") + ")");
			fixture.pathRegExp = new RegExp(fixture.request.pathPattern);
			messages += "\n" + featureStyle("Fixture") + " is enabled for methods " + boldStyle(fixture.request.methods.join(", ")) + " and path pattern " + boldStyle(fixture.request.pathPattern);
		});
		app.use(getFixtureCheckRequestHandler(activeFixtures));
	}
	if (serverConf.proxy) {
		pathRegExp = new RegExp("(?:" + serverConf.proxy.pathPatterns.join(")|(?:") + ")");
		app.use(getProxyCheckRequestHandler(pathRegExp, serverConf.proxy.host, serverConf.proxy.port));
		messages += "\n" + featureStyle("Redirecting") + " path patterns: " + boldStyle(serverConf.proxy.pathPatterns.join(", ")) + " to " + proxyStyle(serverConf.proxy.host + ":" + serverConf.proxy.port);
	}
	app.use(express.static(serverConf.srcDir)).listen(serverConf.port);
	console.log(messages);
});
