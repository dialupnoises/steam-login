var express = require('express'),
    openid  = require('openid'),
    Promise = require('bluebird/js/main/promise')(),
    request = require('request-promise');

var relyingParty, apiKey, useSession = true;

module.exports.middleware = function(opts)
{
	relyingParty = new openid.RelyingParty(
		opts.verify,
		opts.realm,
		true,
		true,
		[]
	);

	apiKey = opts.apiKey;
	useSession = true;
	if(opts.useSession !== undefined)
	{
		useSession = opts.useSession;
	}

	return function(req, res, next) {
		if(req.session && req.session.steamUser)
		{
			req.user = req.session.steamUser;
			req.logout = logout(req);
		}

		next();
	};
}

module.exports.enforceLogin = function(redirect)
{
	return function(req, res, next) {
		if(!req.user)
			return res.redirect(redirect);
		next();
	};
}

module.exports.verify = function()
{
	return function(req, res, next) {
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
					if(useSession)
					{
						req.session.steamUser = req.user;
						req.logout = logout(req);
					}
					next();
				})
				.catch(function(err)
				{
					next(err);
				});
			
		});
	};
}

module.exports.authenticate = function()
{
	return function(req, res, next) {
		relyingParty.authenticate('http://steamcommunity.com/openid', false, function(err, authURL) {
			if(err) 
			{
				console.log(err);
				return next('Authentication failed: ' + err);
			}
			if(!authURL)
				return next('Authentication failed.');
			res.redirect(authURL);
		});
	};
}

function fetchIdentifier(steamID)
{
	// our url is http://steamcommunity.com/openid/id/<steamid>
	steamID = steamID.replace('http://steamcommunity.com/openid/id/', '');
	return request('http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key='+apiKey+'&steamids=' + steamID)
		.then(function(res) {
			var players = JSON.parse(res).response.players;
			if(players.length == 0)
				throw new Error('No players found for the given steam ID.');
			var player = players[0];
			return Promise.resolve({
				_json: player,
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

function logout(req)
{
	return function() {
		delete req.session.steamUser;
		req.user = null;
	}
}
