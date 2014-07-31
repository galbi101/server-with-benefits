# server-with-benefits

A static Node.js file web server with options for proxing requests and delaying/mocking responses. Useful for web development.

## Installation

```sh
$ npm install -g server-with-benefits
```

Then, to setup your server(s), edit ___swbConfig.json__ that comes with the package and rename it to __swbConfig.json__.  
You can place this file anywhere you like, but make sure you then start the server (see [Usage](#usage)) from the directory where it's placed.    
Alternatively (and *preferably*), you can avoid this restriction by setting an environment variable named "SWB_CONF_FILE"
with the file's full path as its value (e.g. SWB_CONF_FILE=C:\dev\swbConfig.json).

The configuration file should be of the following format:

```javascript
{
	"servers": [
		{
			"srcDir": "enter/your/path/here", // path to your local server root source directory
			"paths": { // (OPTIONAL) define routes for specific paths, relative to the 'srcDir'
				"/": "/src", // i.e. http://<your_host_name>/ -> <srcDir>/src
				"/lib": "/lib" // i.e. http://<your_host_name>/lib -> <srcDir>/lib
			},
			"port": 80, // the server listen port (default 80)
			"proxy": { // (OPTIONAL) A proxy to a remote server for some path patterns
				"target": { // can be an object with host and port, or a full url string e.g. "http://myproxy:80"
					"host": "hostname",
					"port": 80
				},
				"pathPatterns": [] // e.g. ["^/api/"]
			},
			"delay": { // (OPTIONAL) Adding delay to responses for some path patterns
				"pathPatterns": [], // e.g. ["^/api/"],
				"time": 2000 // the delay amount
			},
			"fixtures": [ // (OPTIONAL) Fixture definitions
				{
					"active": true, // On/Off switch for this fixture
					"request": {
						"methods": ["GET"],
						"pathPattern": "^/api/rest/foo"
					},
					"response": {
						"status": 200,
						"body": {
							"hello": "Nice Fixture"
						}
					}
				}
				// more fixtures...
			]
		}
		// more servers...
	]
}
```

## Usage

```sh
$ swb
```
