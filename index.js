const openid  = require('openid');
const axios = require('axios');

var relyingParty, apiKey, useSession = true;

const OPENID_CHECK = {
  ns: 'http://specs.openid.net/auth/2.0',
  op_endpoint: 'https://steamcommunity.com/openid/login',
  claimed_id: 'https://steamcommunity.com/openid/id/',
  identity: 'https://steamcommunity.com/openid/id/',
};


function middleware(opts) {
	relyingParty = new openid.RelyingParty(
		opts.verify,
		opts.realm,
		true,
		true,
		[]
	);

	apiKey = opts.apiKey;
	useSession = true;
	if(opts.useSession !== undefined) {
		useSession = opts.useSession;
	}

	return function(req, res, next) {
		if(req.session && req.session.steamUser) {
			req.user = req.session.steamUser;
			req.logout = logout(req);
		}

		next();
	};
}

function enforceLogin(redirect) {
	return function(req, res, next) {
		if(!req.user)
			return res.redirect(redirect);
		next();
	};
}

function verify() {
	return function(req, res, next) {
		if (query['openid.ns'] !== OPENID_CHECK.ns)	return next('Claimed identity is not valid.');
		if (query['openid.op_endpoint'] !== OPENID_CHECK.op_endpoint)	return next('Claimed identity is not valid.');
		if (!query['openid.claimed_id']?.startsWith(OPENID_CHECK.claimed_id))	return next('Claimed identity is not valid.');
		if (!query['openid.identity']?.startsWith(OPENID_CHECK.identity))	return next('Claimed identity is not valid.');
		
		relyingParty.verifyAssertion(req, function(err, result) {
			
			if(err) 
				return next(err.message);
			if(!result || !result.authenticated) 
				return next('Failed to authenticate user.');
			if(!/^https?:\/\/steamcommunity\.com\/openid\/id\/\d+$/.test(result.claimedIdentifier))
				return next('Claimed identity is not valid.');
			fetchIdentifier(result.claimedIdentifier)
				.then(function(user) {
					req.user = user;
					if(useSession) {
						req.session.steamUser = req.user;
						req.logout = logout(req);
					}
					next();
				})
				.catch(function(err) {
					next(err);
				});
		});
	};
}

function authenticate() {
	return function(req, res, next) {
		relyingParty.authenticate('https://steamcommunity.com/openid', false, function(err, authURL) {
			if(err) {
				console.log(err);
				return next('Authentication failed: ' + err);

			}
			if(!authURL)
				return next('Authentication failed.');
			res.redirect(authURL);
		});
	};
}

function fetchIdentifier(openid) {
	// our url is http://steamcommunity.com/openid/id/<steamid>
	steamID = openid.replace('https://steamcommunity.com/openid/id/', '');
	return axios.get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamID}`)
		.then(({data}) => {
			let players = data.response.players;
			if(players.length == 0)
				throw new Error('No players found for the given steam ID.');
			let player = players[0];
			return ({
				_json: player,
				openid,
				steamid: steamID,
				username: player.personaname,
				name: player.realname,
				profile: player.profileurl,
				avatar: {
					small: player.avatar,
					medium: player.avatarmedium,
					large: player.avatarfull
				}
			});
		});
}

function logout(req) {
	return function() {
		delete req.session.steamUser;
		req.user = null;
	}
}

module.exports = { authenticate, verify, enforceLogin, middleware };