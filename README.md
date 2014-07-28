# server-with-benefits

A static Node.js file web server with options for proxing requests and delaying/mocking responses. Useful for web development.

## Installation

```sh
$ npm install -g server-with-benefits
```

Then, edit swbConfig.json that is placed inside the package to setup your server(s).
Alternatively, you can create your own configuration file anywhere you like, and set an environment variable named "SWB_CONF_FILE"
with the file's full path as its value (e.g. SWB_CONF_FILE=C:\dev\swbConfig.json).

the configuration file should look like:

```javascript
{
	"servers": [
		{
			"srcDir": "enter/your/path/here", // path to your local server source directory
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
