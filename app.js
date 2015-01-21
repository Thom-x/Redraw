var connect = require('connect');
var serveStatic = require('serve-static');
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


var players = {}
var playersCount = {};
playersCount.v = 0;
var interval = undefined;

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
	playersCount.v = count(players);

	socket.emit('stop');

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
	if(val >=2 && (oldval<2 || typeof(oldval) == "undefined"))
	{
		startGame();
		// new game
		interval = setInterval(function(){
			startGame();
		}, 10000);
	}
	else if(val >=2 && (oldval>=2 || typeof(oldval) == "undefined"))
	{
		// new player wait for new game
	}
	else
	{
		clearInterval(interval);
		interval = undefined;
		io.sockets.emit('stop');
	}
	return val;
});

var startGame = function()
{
	io.sockets.emit('start',parseInt((Math.random()+1).toFixed()),450);
	console.log("Starting a new game ...")
	io.sockets.emit('start',parseInt((Math.random()+1).toFixed()),450);
	setTimeout(function()
	{
		console.log("Compare drawings ");
		io.sockets.emit('compare');
		
	},5000);
}