
var fs = require('fs');
var stripJsonComments = require('strip-json-comments');
var clc = require('cli-color');
var p = require('path');
var cwd = process.cwd();

const
	ENV_VAR_KEY = 'SWB_CONF_FILE',
	CONF_FILE = (process.argv[2] && p.resolve(cwd, process.argv[2])) || process.env[ENV_VAR_KEY] || p.resolve(cwd, './swbConfig.json'),
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
var bodyParser = require('body-parser');
var httpProxy = require('http-proxy');
var _ = require('underscore');

var proxy = httpProxy.createProxyServer();
proxy.on('error', function (err, req, res) {
	res.writeHead(500, {
		'Content-Type': 'text/plain'
	});
	res.end("SWB: Error occurred when trying to reach proxy server");
});

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
				if (fixture.payload && _.contains(['POST', 'PUT', 'OPTIONS'], req.method)) {
					if (!_.isEqual(_.pick(req.body, _.keys(fixture.payload)), fixture.payload)) {
						return false;
					}
				}
				res.json(fixture.response.status, fixture.response.body || {});
				return true;
			}
		})) {
			next();
		}
	};
};
var getProxyCheckRequestHandler = function(pathRegExp, proxyTarget, hostRegExp, pathRewrite) {
	return function(req, res, next) {
		if (pathRegExp.test(req.url)) {
			var target = proxyTarget;
			if (pathRewrite != null) {
				req.url = req.url.replace(new RegExp(pathRegExp), pathRewrite);
			}
			if (hostRegExp) {
				var resArr = hostRegExp.exec(req.hostname);
				if (resArr) {
					target = {
						host: resArr[resArr.length - 1],
						port: proxyTarget.port
					};
				}
			}
			proxy.web(req, res, {
				target: target
			});
		}
		else {
			next();
		}
	};
};

conf.servers.forEach(function(serverConf) {
	var app = express(),
		messages = "\n" + headerStyle("Serving ") + (serverConf.static && serverConf.static.srcDir ? fileStyle(serverConf.static.srcDir) + " " : "") + "on port " + portStyle(serverConf.port);
	if (serverConf.delay) {
		app.use(getDelayCheckRequestHandler(new RegExp("(?:" + serverConf.delay.pathPatterns.join(")|(?:") + ")"), serverConf.delay.time));
		messages += "\n" + featureStyle("Delay") + " of " + delayTimeStyle(serverConf.delay.time + " ms") + " is activated for path patterns: " + boldStyle(serverConf.delay.pathPatterns.join(", "));
	}
	if (serverConf.fixtures) {
		var activeFixtures = serverConf.fixtures.filter(function(fixture) {return fixture.active;}),
			useBodyParser = false;
		activeFixtures.forEach(function(fixture) {
			fixture.request.methods.forEach(function(method, i, methods) {
				methods[i] = method.toUpperCase();
			});
			fixture.methodRegExp = new RegExp("(?:" + fixture.request.methods.join(")|(?:") + ")");
			fixture.pathRegExp = new RegExp(fixture.request.pathPattern);
			if (fixture.request.payload) {
				useBodyParser = true;
				fixture.payload = fixture.request.payload;
			}
			messages += "\n" + featureStyle("Fixture") + " is enabled for methods " + boldStyle(fixture.request.methods.join(", ")) + " and path pattern " + boldStyle(fixture.request.pathPattern);
			fixture.request.payload && (messages += " with payload " + JSON.stringify(fixture.request.payload));
		});
		useBodyParser && app.use(bodyParser.json());
		app.use(getFixtureCheckRequestHandler(activeFixtures));
	}
	if (serverConf.proxy) {
		serverConf.proxy.forEach(function(proxy) {
			var simplePaths = [];
			var pathRewrites = [];
			var hostRegExp = proxy.hostPattern && new RegExp(proxy.hostPattern);
			proxy.pathPatterns.forEach(function(path) {
				(typeof path == 'string' ? simplePaths : pathRewrites).push(path);
			});
			if (simplePaths.length) {
				app.use(getProxyCheckRequestHandler(new RegExp("(?:" + simplePaths.join(")|(?:") + ")"), proxy.target, hostRegExp));
				messages += "\n" + featureStyle("Redirecting") + " path patterns: " + boldStyle(simplePaths.join(", ")) + " to "
					+ proxyStyle((typeof proxy.target == 'string' ? proxy.target : (proxy.target.host + ":" + proxy.target.port)) + " (same path)");
			}
			pathRewrites.forEach(function(pathObj) {
				var pathRegExp = Object.keys(pathObj)[0];
				var pathRewrite = pathObj[pathRegExp];
				app.use(getProxyCheckRequestHandler(new RegExp(pathRegExp), proxy.target, hostRegExp, pathRewrite));
				messages += "\n" + featureStyle("Redirecting") + " path patterns: " + boldStyle(pathRegExp) + " to "
					+ proxyStyle((typeof proxy.target == 'string' ? proxy.target : (proxy.target.host + ":" + proxy.target.port)) + "/" + pathRewrite);
			});
		});

	}
	if (serverConf.webpack) {
		app.use(require('webpack-dev-middleware')(require('webpack')(require(p.resolve(cwd, serverConf.webpack.confFile)))));
	}
	else if (serverConf.static && serverConf.static.srcDir) {
		if (serverConf.static.paths) {
			for (var path in serverConf.paths) {
				app.use(path, express.static(p.resolve(cwd, serverConf.static.srcDir + serverConf.static.paths[path])));
			}
		}
		app.use(express.static(p.resolve(cwd, serverConf.static.srcDir)));
	}
	app.listen(serverConf.port);
	console.log(messages);
});
