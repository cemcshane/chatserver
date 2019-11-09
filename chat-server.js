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

io.sockets.on("connection", function(socket){
    // This callback runs when a new Socket.IO connection is established.
    socket.on('name_to_server', function(data) {
		// This callback runs when the server receives a new message from the client.
        console.log("nickname: "+data["nickname"]); // log it to the Node.JS output
        socket.nickname = data["nickname"];
        socket.join("Main Chat Room");
		io.sockets.emit("name_to_client",{nickname:data["nickname"] }); // broadcast the message to other users
    });
	socket.on('message_to_server', function(data) {
		// This callback runs when the server receives a new message from the client.
        console.log("message: "+data["message"]); // log it to the Node.JS output
		io.in(data["room"]).emit("message_to_client",{message:data["message"], user:socket.nickname}) // broadcast the message to other users
    });
    socket.on('room_to_server', function(data) {
        // This callback runs when the server receives a new message from the client.
        socket.join(data["newroom"]);
        socket.leave(data["curr"]);     
        console.log("Room joined: "+data["newroom"]); // log it to the Node.JS output
		io.sockets.emit("room_to_client",{room:data["newroom"], user:socket.nickname}) // broadcast the message to other users
        socket.emit("joinroom_to_client",{room:data["newroom"], user:socket.nickname})
    });
    socket.on('joinroom_to_server', function(data) {
        // This callback runs when the server receives a new message from the client.
        socket.join(data["joinroom"]);
        socket.leave(data["curr"]);      
        console.log("Room joined: "+data["joinroom"]); // log it to the Node.JS output
		socket.emit("joinroom_to_client",{room:data["joinroom"], user:socket.nickname}) // broadcast the message to other users
    });
});