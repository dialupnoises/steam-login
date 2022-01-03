const openid = require('openid');
const axios = require('axios');

let relyingParty, apiKey, useSession;

const middleware = opts => {
	relyingParty = new openid.RelyingParty(
		opts.verify,
		opts.realm,
		true,
		true,
		[]
	);

	apiKey = opts.apiKey;
	
	useSession = (opts.useSession == undefined || opts.useSession == true) ? true : false;

	return (req, res, next) => {
		if(req.session && req.session.steamUser) {
			req.user = req.session.steamUser;
			req.logout = logout(req);
		}

		next();
	};
}

const enforceLogin = redirect => {
	return (req, res, next) => {
		if(!req.user)
			return res.redirect(redirect);
		next();
	};
}

const verify = () => {
	return (req, res, next) => {
		relyingParty.verifyAssertion(req, (err, result) => {
			if(err) 
				return next(err.message);
			if(!result || !result.authenticated) 
				return next('Failed to authenticate user.');
			if(!/^https?:\/\/steamcommunity\.com\/openid\/id\/\d+$/.test(result.claimedIdentifier))
				return next('Claimed identity is not valid.');
			fetchIdentifier(result.claimedIdentifier)
				.then(user => {
					req.user = user;
					if(useSession) {
						req.session.steamUser = req.user;
						req.logout = logout(req);
					}
					next();
				})
				.catch(err => next(err));
		});
	};
}

const authenticate = () => {
	return (req, res, next) => {
		relyingParty.authenticate('https://steamcommunity.com/openid', false, (err, authURL) => {
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

const fetchIdentifier = openid => {
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

const logout = req => {
	return () => {
		delete req.session.steamUser;
		req.user = null;
	}
}

module.exports = { authenticate, verify, enforceLogin, middleware };