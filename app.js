var connect = require('connect');
var serveStatic = require('serve-static');

var socketPort = 8042;
var players = {}
var lobbies = {}
var lobbyCount = 0;
var interval = undefined;
var _modelCount = 4;

var _drawTime = 5000;
var _compareTime = 5000;
var _compareTimeOut = 500;

var _minPlayer = 2;

connect().use(serveStatic("./")).listen(80);

// object.watch
if (!Object.prototype.watch) {
	Object.defineProperty(Object.prototype, "watch", {
		  enumerable: false
		, configurable: true
		, writable: false
		, value: function (prop, handler) {
			var
			  oldval = this[prop]
			, newval = oldval
			, getter = function () {
				return newval;
			}
			, setter = function (val) {
				oldval = newval;
				return newval = handler.call(this, prop, oldval, val);
			}
			;
			
			if (delete this[prop]) { // can't watch constants
				Object.defineProperty(this, prop, {
					  get: getter
					, set: setter
					, enumerable: true
					, configurable: true
				});
			}
		}
	});
}
 
// object.unwatch
if (!Object.prototype.unwatch) {
	Object.defineProperty(Object.prototype, "unwatch", {
		  enumerable: false
		, configurable: true
		, writable: false
		, value: function (prop) {
			var val = this[prop];
			delete this[prop]; // remove accessors
			this[prop] = val;
		}
	});
}

var http = require('http');

httpServer = http.createServer(function(req,res) {
  console.log('une nouvelle connexion');
});

httpServer.listen(socketPort);

var io = require('socket.io').listen(httpServer);
io.set("heartbeat timeout", 1000);
io.set("heartbeat interval", 5000);


function count(object)
{
	var count = 0;
	for (var k in object) {
	    if (object.hasOwnProperty(k)) {
	       ++count;
	    }
	}	
	return count;
}

io.sockets.on('connect',function(socket) {
	console.log('new player ' + socket.id);
	players[socket.id] = {};
	players[socket.id].nickname = "Guest";
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
		data.match = ((1-data.misMatchPercentage/100)*100).toFixed();
		lobbies[players[socket.id].lobby].results.push(data);
		// emitLobby(players[socket.id].lobby,'drawresults',data);
	});

	socket.on('nickname',function(data){
		if(data.trim() != "")
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

	

var startGame = function(lobbyId)
{
	lobbies[lobbyId].playing = true;
	lobbies[lobbyId].results = [];
	console.log("start  "+ lobbies[lobbyId].id);
	var data = {};
	data.index = parseInt((Math.random()*(_modelCount-1)+1).toFixed());
	data.time = _drawTime/10-50;
	emitLobby(lobbyId,'start',data);
	lobbies[lobbyId].intervalCompare = setTimeout(function()
	{
		console.log("compare " + lobbyId);
		emitLobby(lobbyId,'compare');
		lobbies[lobbyId].intervalCompareSend = setTimeout(function()
		{
			lobbies[lobbyId].winner();
			emitLobby(lobbyId,'results',{players : lobbies[lobbyId].results});
		},_compareTimeOut);		
	},_drawTime);
}

var stopGame = function(lobbyId)
{
	clearInterval(lobbies[lobbyId].interval);
	clearInterval(lobbies[lobbyId].intervalCompare);
	clearInterval(lobbies[lobbyId].intervalCompareSend);
	lobbies[lobbyId].interval = undefined;
	lobbies[lobbyId].intervalCompare = undefined;
	lobbies[lobbyId].intervalCompareSend = undefined;
	lobbies[lobbyId].playing = false;
	lobbies[lobbyId].full = false;
	console.log("stop " + lobbies[lobbyId].id);
	emitLobby(lobbyId,'stop');
}

function lobbyAvailable()
{
	var choosenLobbyId = -1;
	var choosenLobbyCount = -1;
	for(currentLobbyId in lobbies)
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

function lobbyWinner()
{
	var winner = undefined;
	var looser = undefined;
	var bestScore = 0;
	var worstScore = 999;
	for(currentPlayerIndex in this.results)
	{
		var currentPlayer = this.results[currentPlayerIndex];
		if(currentPlayer.match > bestScore)
		{
			winner = currentPlayer;
			bestScore = currentPlayer.match;
		}

		if(currentPlayer.match <= worstScore)
		{
			looser = currentPlayer;
			worstScore = currentPlayer.match;
		}
	}
	if(typeof(winner) != "undefined")
	{
		winner.won = true;
	}
	if(typeof(looser) != "undefined" && looser != winner)
	{
		looser.lose = true;
	}
}

function createLobby()
{
	console.log("create lobby " + lobbyCount);
	lobbies[lobbyCount] = {};
	lobbies[lobbyCount].id=lobbyCount;
	lobbies[lobbyCount].full = 0;
	lobbies[lobbyCount].playing = 0;
	lobbies[lobbyCount].v=0;
	lobbies[lobbyCount].players={};
	lobbies[lobbyCount].interval=undefined;
	lobbies[lobbyCount].intervalCompare=undefined;
	lobbies[lobbyCount].intervalCompareSend=undefined;
	lobbies[lobbyCount].winner=lobbyWinner;



	lobbies[lobbyCount].watch('v', function (id,oldval,val) {
		console.log("lobby " + this.id + " : " + oldval + " player to " + val);
		emitLobby(this.id,'playerChange',val);
		if(val >=_minPlayer && (oldval<_minPlayer || typeof(oldval) == "undefined"))
		{
			if(this.interval == undefined)
			{
				startGame(this.id);
				// new game
				this.interval = setInterval(function(that){
					startGame(that.id);
				}, _drawTime + _compareTime,this);
			}
		}
		else if(val >=_minPlayer && (oldval>=_minPlayer || typeof(oldval) == "undefined"))
		{
			// new player wait for new game
		}
		else
		{
			stopGame(this.id);
		}
		return val;
	});

	return lobbyCount++;
}

var emitLobby = function (lobbyId, command, data)
{
	try
	{
		for(currentPlayer in lobbies[lobbyId].players)
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
}