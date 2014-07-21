# server-with-benefits

A static Node.js file web server with options for proxing requests and delaying/mocking responses. Useful for web development.

## Installation

```sh
$ npm install -g server-with-benefits
```

Then, edit serverConf.json that is placed inside the package to setup your server(s).
Alternatively, you can create your own configuration file anywhere you like, and set an environment variable named "SERVER_CONF_FILE"
with the file's full path as its value (e.g. SERVER_CONF_FILE=C:\dev\serverConf.json).

the configuration file should look like:

```json
{
	"servers": [
		{
//			"srcDir": "enter your path here", // path to your local server source directory
//			"port": 80, // the server listen port (default 80)
//			"proxy": { // (OPTIONAL) A proxy to a remote server for some path patterns
//				"host": "host name",
//				"port": 80,
//				"pathPatterns": [] // e.g. ["^/api/"]
//			},
//			"delay": { // (OPTIONAL) Adding delay to responses for some path patterns
//				"pathPatterns": [] // e.g. ["^/api/"],
//				"time": 2000 // the delay amount
//			}
		}
		// more servers...
	]
}
```

## Usage

```sh
$ server
```