
var fs = require('fs');
var stripJsonComments = require('strip-json-comments');
//var conf = require('./serverConf.json');

const confFile = './serverConf.json';

var conf;
try {
	conf = JSON.parse(stripJsonComments(fs.readFileSync(confFile, 'utf8')));
}
catch (e) {}

if (!conf || !Array.isArray(conf.servers) || !conf.servers.length) {
	console.log("Problem parsing servers configuration from file: " + confFile +
	"\nPlease check it and run again.");
	return;
}

var express = require('express');
var httpProxy = require('http-proxy');

var proxy = httpProxy.createProxyServer();

var getProxyCheckRequestHandler = function(proxyHost, proxyPort, proxyRegExp) {
	return function(req, res, next) {
		if (proxyRegExp.test(req.url)) {
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
	var app = express();
	if (serverConf.proxy) {
		var proxyRegExp = new RegExp("(?:" + serverConf.proxy.pathPatterns.join(")|(?:") + ")");
		app.use(getProxyCheckRequestHandler(serverConf.proxy.host, serverConf.proxy.port, proxyRegExp));
	}
	app.use(express.static(serverConf.srcDir)).listen(serverConf.port);
	console.log("Serving '" + serverConf.srcDir + "' on port " + serverConf.port);
});
