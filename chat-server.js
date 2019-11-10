// All foundational code from example code in Socket.io class wiki


// Require the packages we will use:
var http = require("http"),
	socketio = require("socket.io"),
	fs = require("fs");

// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html:
var app = http.createServer(function(req, resp){
	// This callback runs when a new connection is made to our HTTP server.
	
	fs.readFile("client.html", function(err, data){
		// This callback runs when the client.html file has been read from the filesystem.
		
		if(err) return resp.writeHead(500);
		resp.writeHead(200);
		resp.end(data);
	});
});
app.listen(3456);

// Do the Socket.IO magic:
var io = socketio.listen(app);
let mems = [[]];
let roomId = 0;
let map = new Map();
map.set("Main Chat Room", 0);
io.sockets.on("connection", function(socket){
    // This callback runs when a new Socket.IO connection is established.
    socket.on('name_to_server', function(data) {
		// This callback runs when the server receives a new message from the client.
        console.log("nickname: "+data["nickname"]); // log it to the Node.JS output
        socket.nickname = data["nickname"];
        socket.join("Main Chat Room");
        mems[0].push([data["nickname"]]);
		io.in("Main Chat Room").emit("name_to_client",{nickname:data["nickname"], users:mems[0]}); // broadcast the message to other users
    });
	socket.on('message_to_server', function(data) {
		// This callback runs when the server receives a new message from the client.
        console.log("message: "+data["message"]+" in "+data["room"]); // log it to the Node.JS output
		io.in(data["room"]).emit("message_to_client",{message:data["message"], user:socket.nickname}) // broadcast the message to other users
    });
    socket.on('room_to_server', function(data) {
        // This callback runs when the server receives a new message from the client.
        socket.join(data["newroom"]);
        socket.leave(data["curr"]);
        mems[map.get(data["curr"])] = mems[map.get(data["curr"])].filter(name => name!=socket.nickname);
        map.set(data["newroom"], (roomId+1));
        roomId++;
        let arry = [];
        arry.push(socket.nickname);
        mems.push(arry);
        console.log("Room joined: "+data["newroom"]); // log it to the Node.JS output
		io.sockets.emit("room_to_client",{room:data["newroom"], user:socket.nickname}) // broadcast the message to other users
        socket.emit("joinroom_to_client",{room:data["newroom"], change:"yes", user:socket.nickname, users:mems[map.get(data["newroom"])]});
        io.to(data["newroom"]).emit("joinroom_to_client",{room:data["newroom"], change:"no", user:socket.nickname, users:mems[map.get(data["newroom"])]});
        io.to(data["curr"]).emit("joinroom_to_client",{room:data["curr"], change:"no", user:socket.nickname, users:mems[map.get(data["curr"])]});
    });
    socket.on('joinroom_to_server', function(data) {
        // This callback runs when the server receives a new message from the client.
        socket.join(data["joinroom"]);
        socket.leave(data["curr"]);
        mems[map.get(data["curr"])] = mems[map.get(data["curr"])].filter(name => name!=socket.nickname);
        mems[map.get(data["joinroom"])].push(socket.nickname);
        console.log("Room joined: "+data["joinroom"]); // log it to the Node.JS output
		socket.emit("joinroom_to_client",{change:"yes", room:data["joinroom"], user:socket.nickname, users:mems[map.get(data["joinroom"])]}); // broadcast the message to other users
        io.to(data["joinroom"]).emit("joinroom_to_client",{room:data["joinroom"], change:"no", user:socket.nickname, users:mems[map.get(data["joinroom"])]});
        io.to(data["curr"]).emit("joinroom_to_client",{room:data["curr"], change:"no", user:socket.nickname, users:mems[map.get(data["curr"])]});
    });
});