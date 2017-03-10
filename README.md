# steam-login

Steam-only OpenID authentication provider, for simplicity. Think of it as a mini-[Passport](http://passportjs.org/), but only for Steam.

## Installation
You can install this library via npm:
```
npm install steam-login
```
You will need some sort of session library, like [express-session](https://github.com/expressjs/session).

## Example Usage

```js
var express = require('express'),
    steam   = require('steam-login');

var app = express();

app.use(require('express-session')({ resave: false, saveUninitialized: false, secret: 'a secret' }));
app.use(steam.middleware({
	realm: 'http://localhost:3000/', 
	verify: 'http://localhost:3000/verify',
	apiKey: process.argv[2]}
));

app.get('/', function(req, res) {
	res.send(req.user == null ? 'not logged in' : 'hello ' + req.user.username).end();
});

app.get('/authenticate', steam.authenticate(), function(req, res) {
	res.redirect('/');
});

app.get('/verify', steam.verify(), function(req, res) {
	res.send(req.user).end();
});

app.get('/logout', steam.enforceLogin('/'), function(req, res) {
	req.logout();
	res.redirect('/');
});

app.listen(3000);
console.log('listening');
```

## License

The MIT License (MIT)

Copyright (c) 2017 Andrew Rogers

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
