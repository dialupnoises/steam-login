const express = require('express');
const steam = require('./index');
const session = require('express-session');

const app = express();

app.use(session({ resave: false, saveUninitialized: false, secret: 'a secret' }));
app.use(steam.middleware({
	realm: 'http://localhost:3000/', 
	verify: 'http://localhost:3000/verify',
	apiKey: process.argv[2]
}));

app.get('/', function(req, res) {
	res.send(req.user == null ? 'not logged in' : 'hello ' + req.user.username).end();
});

app.get('/authenticate', steam.authenticate(), function(req, res) {
	res.redirect('/');
});

app.get('/verify', steam.verify(), function(req, res) {
	res.json({
		user: req.user,
		session: req.session,
		sessionID: req.sessionID,
		cookie: req.cookies
	});
});

app.get('/logout', steam.enforceLogin('/'), function(req, res) {
	req.logout();
	res.redirect('/');
});

app.listen(3000, () => {
	console.log('Listening');
});