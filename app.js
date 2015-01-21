var connect = require('connect');
var serveStatic = require('serve-static');

var players = {}
var playersCount = {};
var playing = false;
var interval = undefined;
var _modelCount = 4;

var _drawTime = 5000;
var _compareTime = 5000;

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

httpServer.listen(8080);

var io = require('socket.io').listen(httpServer);

playersCount.v = 0;
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
	console.log('New player');
	players[socket.id] = {};
	players[socket.id].nickname = "Guest";
	if(playing)
	{
		socket.emit('wait');
	}
	else
	{
		socket.emit('stop');
	}

	playersCount.v = count(players);


	socket.on('drawed',function(data){
		data.nickname = players[socket.id].nickname;
		players[socket.id].nickname
		io.sockets.emit('drawresults',data);
	});

	socket.on('nickname',function(data){
		if(data != "")
			players[socket.id].nickname = data;
		else
			players[socket.id].nickname = "Player";
	});

	socket.on('disconnect', function(){
      delete players[socket.id];
      playersCount.v = count(players);
  });
});

playersCount.watch('v', function (id,oldval,val) {
	console.log("Game change from " + oldval + " player to " + val + " player");
	io.sockets.emit('playerChange',val);
	if(val >=2 && (oldval<2 || typeof(oldval) == "undefined"))
	{
		if(interval == undefined)
		{
			startGame();
			// new game
			interval = setInterval(function(){
				startGame();
			}, _drawTime + _compareTime);
		}
	}
	else if(val >=2 && (oldval>=2 || typeof(oldval) == "undefined"))
	{
		// new player wait for new game
	}
	else
	{
		clearInterval(interval);
		interval = undefined;
		playing = false;
		console.log("Stoping game ...")
		io.sockets.emit('stop');
	}
	return val;
});

var startGame = function()
{
	playing = true;
	console.log("Starting a new game ...")
	io.sockets.emit('start',parseInt((Math.random()*(_modelCount-1)+1).toFixed()),_drawTime/10-50);
	setTimeout(function()
	{
		console.log("Compare drawings ");
		io.sockets.emit('compare');
		
	},_drawTime);
}