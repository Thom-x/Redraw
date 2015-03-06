/*===============================
=            Require            =
===============================*/
var express = require("express");
var mustacheExpress = require('mustache-express');
var config = require('config');
var app = express();
var port = process.env.PORT || 80;
var url = process.env.URL || "127.0.0.1";

exports.port = port;
exports.url = url;


app.engine('html', mustacheExpress());          // register file extension mustache
app.set('view engine', 'html');                 // register file extension for partials
app.set('views', __dirname + '/');
app.get("/", function(req, res){
    res.render("index",{port : port, url : url});
});
app.use(express.static(__dirname + '/')); 
var io = require('socket.io').listen(app.listen(port));

console.log("listening on port " + port);

/*===================================
=            Global vars            =
===================================*/
var players = {};
var lobbies = {};
var lobbyCount = 0;
var interval;
var _modelCount = 4;

var _drawTime = config.get('timers.drawTime') || 5000;
var _compareTime = config.get('timers.compareTime') || 5000;
var _compareTimeOut = config.get('timers.compareTimeOut') || 1000;
var _waitReadyTimeout = config.get('timers.waitReadyTimeout') || 1000;

var _minPlayer = config.get('game.minPlayer') || 2;
var _gameCount = config.get('game.gameCount') || 10;

/*===================================
=            Watch a var            =
===================================*/
// object.watch
if (!Object.prototype.watch) {
	Object.defineProperty(Object.prototype, "watch", {
		enumerable: false,
		configurable: true,
		writable: false,
		value: function (prop, handler) {
			var
			oldval = this[prop],
			newval = oldval,
			getter = function () {
				return newval;
			},
			setter = function (val) {
				oldval = newval;
				newval = handler.call(this, prop, oldval, val);
				return newval;
			};
			
			if (delete this[prop]) { // can't watch constants
				Object.defineProperty(this, prop, {
					get: getter,
					set: setter,
					enumerable: true,
					configurable: true
				});
			}
		}
	});
}
 
// object.unwatch
if (!Object.prototype.unwatch) {
	Object.defineProperty(Object.prototype, "unwatch", {
		enumerable: false,
		configurable: true,
		writable: false,
		value: function (prop) {
			var val = this[prop];
			delete this[prop]; // remove accessors
			this[prop] = val;
		}
	});
}

io.set("heartbeat timeout", 1000);
io.set("heartbeat interval", 5000);


function count(object)
{
	var countTmp = 0;
	for (var k in object) {
	    if (object.hasOwnProperty(k)) {
	       ++countTmp;
	    }
	}	
	return countTmp;
}

/*===============================
=            Sockets            =
===============================*/
io.sockets.on('connect',function(socket) {
	console.log('new player %s',socket.id);

	players[socket.id] = {};
	players[socket.id].nickname = "Guest";
	players[socket.id].score = 0;

	lobbyfreeSlot = lobbyAvailable();

	if(lobbyfreeSlot < 0)
	{
		console.log('No free lobby, create one');
		players[socket.id].lobby = createLobby();
		lobbies[players[socket.id].lobby].players[socket.id] = players[socket.id];
	}
	else
	{
		console.log('Free lobby found');
		players[socket.id].lobby = lobbyfreeSlot;
		lobbies[players[socket.id].lobby].players[socket.id] = players[socket.id];
		lobbies[players[socket.id].lobby].full=1;
	}

	lobbies[players[socket.id].lobby].v = count(lobbies[players[socket.id].lobby].players);

	socket.on('drawed',function(data){
		data.nickname = players[socket.id].nickname;
		data.id = socket.id;
		data.match = ((1-data.misMatchPercentage/100)*100).toFixed();
		lobbies[players[socket.id].lobby].results.push(data);
	});

	socket.on('ready',function(data){
		lobbies[players[socket.id].lobby].players[socket.id].ready = true;
		getReady(players[socket.id].lobby);
	});

	socket.on('nickname',function(data){
		if(data.trim() !== "")
			players[socket.id].nickname = data.trim();
		else
			players[socket.id].nickname = "Guest";
	});

	socket.on('disconnect', function(){
		if(typeof(players[socket.id].lobby) != "undefined")
		{
	  		delete lobbies[players[socket.id].lobby].players[socket.id];
    		lobbies[players[socket.id].lobby].v = count(lobbies[players[socket.id].lobby].players);
		  	lobbies[players[socket.id].lobby].full = false;
		}
	  	delete players[socket.id];
  });
});

	
/*======================================
=            Game managment            =
======================================*/
/**
*
* Start new game
*
**/
var startGame = function(lobbyId)
{
	var currentLobby = lobbies[lobbyId];
	if(currentLobby.gameCount >= _gameCount)
	{
		currentLobby.gameCount = 0;
	}
	currentLobby.gameCount++;
	currentLobby.playing = true;
	currentLobby.results = [];
	console.log("lobby %s : start  ",lobbyId);
	var data = {};
	data.index = parseInt((Math.random()*(_modelCount-1)+1).toFixed());
	data.time = _drawTime/10-50;
	emitLobby(lobbyId,'start',data);
	currentLobby.intervalCompare = setTimeout(function()
	{
		console.log("lobby %s : compare ",lobbyId);
		emitLobby(lobbyId,'compare');
		currentLobby.intervalCompareSend = setTimeout(function()
		{
			currentLobby.score();
			if(currentLobby.results.length > 0)
				emitLobby(lobbyId,'results',{players : currentLobby.results});
		},_compareTimeOut);		
	},_drawTime);
};

/**
*
* Stop current game
*
**/
var stopGame = function(lobbyId,val)
{
	var currentLobby = lobbies[lobbyId];
	clearInterval(currentLobby.interval);
	clearInterval(currentLobby.intervalCompare);
	clearInterval(currentLobby.intervalCompareSend);
	currentLobby.interval = undefined;
	currentLobby.intervalCompare = undefined;
	currentLobby.intervalCompareSend = undefined;
	currentLobby.playing = false;
	currentLobby.full = false;
	console.log("lobby %s : stop ",lobbyId);
	emitLobby(lobbyId,'stop',_minPlayer-val);
};

/**
*
* Check lobby available
*
**/
function lobbyAvailable()
{
	var choosenLobbyId = -1;
	var choosenLobbyCount = -1;
	for(var currentLobbyId in lobbies)
	{
		if(!lobbies[currentLobbyId].playing && !lobbies[currentLobbyId].full)
		{
			if(lobbies[currentLobbyId].v > choosenLobbyCount)
			{
				choosenLobbyId = lobbies[currentLobbyId].id;
				choosenLobbyCount = lobbies[currentLobbyId].v;
			}
		}
	}
	return choosenLobbyId;
}

/**
*
* Calculate lobby score/winner...
*
**/
function lobbyScore()
{
	var winner;
	var looser;
	var bestScore = 0;
	var worstScore = 999;

	var gameWinner;
	var gameLooser;
	var gameBestScore = 0;
	var gameWorstScore = _gameCount;
	for(var currentPlayerIndex in this.results)
	{
		var currentPlayer = this.results[currentPlayerIndex];
		if(this.gameCount == 1)
		{
			players[currentPlayer.id].score = 0;
		}
		if(currentPlayer.match > bestScore)
		{
			winner = currentPlayer;
			bestScore = currentPlayer.match;
		}

		if(currentPlayer.match < worstScore)
		{
			looser = currentPlayer;
			worstScore = currentPlayer.match;
		}
		currentPlayer.score = players[currentPlayer.id].score;
	}
	if(typeof(winner) != "undefined")
	{
		winner.won = true;
		players[winner.id].score++;
		winner.score = players[winner.id].score;
	}
	if(typeof(looser) != "undefined" && looser != winner)
	{
		looser.lose = true;
	}
	if(this.gameCount == _gameCount)
	{
		for(var currentPlayerIndex2 in this.results)
		{
			var currentPlayer2 = this.results[currentPlayerIndex2];
			if(currentPlayer2.score > gameBestScore)
			{
				gameBestScore = currentPlayer2.score;
				gameWinner = currentPlayer2;
			}

			if(currentPlayer2.score < gameWorstScore)
			{
				gameWorstScore = currentPlayer2.score;
				gameLooser = currentPlayer2;
			}
		}
	}
	if(typeof(gameWinner) != "undefined")
	{
		gameWinner.gameWon = true;
	}
	if(typeof(gameLooser) != "undefined" && gameWinner != gameLooser)
	{
		gameLooser.gameLose = true;
	}

}

/**
*
* Initiate "getReady" screen for players
*
**/
function getReady(lobbyId)
{
	var currentLobby = lobbies[lobbyId];
	var playerCount = 0;
	var playerReady = 0;
	for(var currentPlayerIndex in currentLobby.players)
	{
		var currentPlayer = currentLobby.players[currentPlayerIndex];
		playerCount++;
		if(currentPlayer.ready)
		{
			playerReady++;
		}
		var ready = [];
		for(var currentPlayerIndex2 in currentLobby.players)
		{
			var currentPlayer2 = currentLobby.players[currentPlayerIndex2];
			var currentPlayerObject = {};
			if(currentPlayerIndex2 === currentPlayerIndex)
			{
				currentPlayerObject.you = true;
			}
			else
			{
				currentPlayerObject.you = false;
			}
			currentPlayerObject.nickname = currentPlayer2.nickname;
			currentPlayerObject.ready = currentPlayer2.ready;
			ready.push(currentPlayerObject);
		}
		try{
			io.sockets.connected[currentPlayerIndex].emit('getReady',{players : ready});
		}catch(e)
		{
		}
	}
	console.log("lobby %s : %s players ready over %s",lobbyId, playerReady, playerCount);
	setTimeout(function(){
		if(playerCount > 0 && playerCount === playerReady)
		{
			if(currentLobby.interval === undefined)
			{
				for(var currentPlayerIndex in currentLobby.results)
				{
					try
					{
						var currentPlayer = currentLobby.results[currentPlayerIndex];
						players[currentPlayer.id].score = 0;
						currentPlayer.score = players[currentPlayer.id].score;
					}catch(e){}
				}
				startGame(currentLobby.id);
				// new game
				currentLobby.interval = setInterval(function(that){
					startGame(that.id);
				}, _drawTime + _compareTime,currentLobby);
			}
		}
	},_waitReadyTimeout);
}


/**
*
* Create new lobby
*
**/
function createLobby()
{
	console.log("lobby %s : create",lobbyCount);
	lobbies[lobbyCount] = {};
	lobbies[lobbyCount].id=lobbyCount;
	lobbies[lobbyCount].full = 0;
	lobbies[lobbyCount].playing = 0;
	lobbies[lobbyCount].v=0;
	lobbies[lobbyCount].players={};
	lobbies[lobbyCount].interval=undefined;
	lobbies[lobbyCount].intervalCompare=undefined;
	lobbies[lobbyCount].intervalCompareSend=undefined;
	lobbies[lobbyCount].score=lobbyScore;
	lobbies[lobbyCount].gameCount=0;
	lobbies[lobbyCount].results = [];

	lobbies[lobbyCount].watch('v', function (id,oldval,val) {
		console.log("lobby %s : %s players to %s",this.id, oldval, val);
		emitLobby(this.id,'playerChange',val);
		if(val >=_minPlayer && (oldval<_minPlayer || typeof(oldval) == "undefined"))
		{
			for(var currentPlayerIndex in this.players)
			{
				try
				{
					this.players[currentPlayerIndex].ready = false;
				}catch(e){}
			}
			getReady(this.id);
		}
		else if(val >=_minPlayer && (oldval>=_minPlayer || typeof(oldval) == "undefined"))
		{
			// new player wait for new game
		}
		else
		{
			stopGame(this.id,val);
		}
		return val;
	});

	return lobbyCount++;
}

/**
*
* Emit socket event to a specified lobby
*
**/
var emitLobby = function (lobbyId, command, data)
{
	try
	{
		for(var currentPlayer in lobbies[lobbyId].players)
		{
			try{
				io.sockets.connected[currentPlayer].emit(command,data);
			}catch(e)
			{
			}
		}
	}catch(e)
	{
		
	}
};