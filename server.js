
var fs = require('fs');
var stripJsonComments = require('strip-json-comments');

const confFile = process.env.SERVER_CONF_FILE || (__dirname + '/serverConf.json');

console.log("\nReading configuration from file: " + confFile);

var conf;
try {
	conf = JSON.parse(stripJsonComments(fs.readFileSync(confFile, 'utf8')));
}
catch (e) {}

if (!conf || !Array.isArray(conf.servers) || !conf.servers.length) {
	console.error("\nError: Problem parsing servers configuration file." +
	"\nPlease check it and run again.");
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
		messages = "\nServing '" + serverConf.srcDir + "' on port " + serverConf.port;
	if (serverConf.delay) {
		pathRegExp = new RegExp("(?:" + serverConf.delay.pathPatterns.join(")|(?:") + ")");
		app.use(getDelayCheckRequestHandler(pathRegExp, serverConf.delay.time));
		messages += "\nDelay is activated for path patterns: " + serverConf.delay.pathPatterns.join(", ");
	}
	if (serverConf.proxy) {
		pathRegExp = new RegExp("(?:" + serverConf.proxy.pathPatterns.join(")|(?:") + ")");
		app.use(getProxyCheckRequestHandler(pathRegExp, serverConf.proxy.host, serverConf.proxy.port));
		messages += "\nRedirecting path patterns: " + serverConf.proxy.pathPatterns.join(", ") + " to " + serverConf.proxy.host + ":" + serverConf.proxy.port;
	}
	app.use(express.static(serverConf.srcDir)).listen(serverConf.port);
	console.log(messages+="\n");
});
