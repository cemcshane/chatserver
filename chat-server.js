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
let pwds = new Map();
let prvs = new Map();
let roomId = 0;
let map = new Map();
let creators = new Map();
let ids = new Map();
let banned = new Map();
let rooms = [];
map.set("Main Chat Room", 0);
prvs.set("Main Chat Room", "no");
io.sockets.on("connection", function(socket){
    // This callback runs when a new Socket.IO connection is established.
    socket.on('name_to_server', function(data) {
		ids.set(socket.id, data["nickname"]);
        console.log("nickname: "+data["nickname"]); // log it to the Node.JS output
        socket.nickname = data["nickname"];
        socket.join("Main Chat Room");
        mems[0].push([data["nickname"]]);
        socket.emit("seename", {nickname:data["nickname"]});
		io.in("Main Chat Room").emit("name_to_client",{rms:rooms, nickname:data["nickname"], users:mems[0]}); // broadcast the message to other users
    });
	socket.on('message_to_server', function(data) {
		// This callback runs when the server receives a new message from the client.
        console.log("message: "+data["message"]+" in "+data["room"]); // log it to the Node.JS output
		io.in(data["room"]).emit("message_to_client",{message:data["message"], user:socket.nickname}) // broadcast the message to other users
    });
    socket.on('room_to_server', function(data) {
        creators.set(data["newroom"], socket.nickname);
        if(data["prv"]=="yes"){
            pwds.set(data["newroom"], data["pwd"]);
            prvs.set(data["newroom"], "yes");
        }
        else{
            prvs.set(data["newroom"], "no");
        }
        socket.join(data["newroom"]);
        socket.leave(data["curr"]);
        mems[map.get(data["curr"])] = mems[map.get(data["curr"])].filter(name => name!=socket.nickname);
        map.set(data["newroom"], (roomId+1));
        roomId++;
        let arry = [];
        arry.push(socket.nickname);
        mems.push(arry);
        rooms.push(data["newroom"]);
        console.log("Room joined: "+data["newroom"]); // log it to the Node.JS output
		io.sockets.emit("room_to_client",{room:data["newroom"], user:socket.nickname}) // broadcast the message to other users
        socket.emit("joinroom_to_client",{creator:"yes", room:data["newroom"], change:"yes", user:socket.nickname, users:mems[map.get(data["newroom"])]});
        io.to(data["newroom"]).emit("joinroom_to_client",{creator:"", room:data["newroom"], change:"no", user:socket.nickname, users:mems[map.get(data["newroom"])]});
        io.to(data["curr"]).emit("joinroom_to_client",{creator:"", room:data["curr"], change:"no", user:socket.nickname, users:mems[map.get(data["curr"])]});
    });
    socket.on('pass_to_server', function(data) {
        if(prvs.get(data["joinroom"])=="yes"){
            socket.emit("pass_to_client", {joinroom:data["joinroom"], curr:data["curr"]});
        }
        else{
		    socket.emit("canjoin", {joinroom:data["joinroom"], curr:data["curr"]}); // broadcast the message to other users
        }
    });
    socket.on("passcheck", function(data){
        let pw = data["guess"];
        if(pw==pwds.get(data["joinroom"])){
            socket.emit("canjoin", {joinroom:data["joinroom"], curr:data["curr"]});
        }
        else{
            socket.emit("incorrectpass");
        }
    });
    socket.on('joinroom_to_server', function(data) {
        let crtr;
        if(creators.get(data["joinroom"])==socket.nickname){
            crtr = "yes";
        }
        else{
            crtr = "no";
        }
        socket.join(data["joinroom"]);
        socket.leave(data["curr"]);
        mems[map.get(data["curr"])] = mems[map.get(data["curr"])].filter(name => name!=socket.nickname);
        mems[map.get(data["joinroom"])].push(socket.nickname);
        console.log("Room joined: "+data["joinroom"]); // log it to the Node.JS output
        console.log(`Leaving room: ${mems[map.get(data["curr"])]}`);
        console.log(`Joining room: ${mems[map.get(data["joinroom"])]}`);
		socket.emit("joinroom_to_client",{creator:crtr, change:"yes", room:data["joinroom"], user:socket.nickname, users:mems[map.get(data["joinroom"])]}); // broadcast the message to other users
        io.to(data["joinroom"]).emit("joinroom_to_client",{creator:"", room:data["joinroom"], change:"no", user:socket.nickname, users:mems[map.get(data["joinroom"])]});
        io.to(data["curr"]).emit("joinroom_to_client",{creator:"", room:data["curr"], change:"no", user:socket.nickname, users:mems[map.get(data["curr"])]});
    });
    socket.on("kick_to_server", function(data){
        for (let id in io.sockets.adapter.rooms[data["curr"]].sockets){
            if(ids.get(id)==data["name"]){
                io.to(`${id}`).emit("startkick", {name:data["name"], kickedroom:data["curr"]});
            } 
        }
    });
    socket.on("ban_to_server", function(data){
        for (let id in io.sockets.adapter.rooms[data["curr"]].sockets){
            if(ids.get(id)==data["name"]){
                if(banned.get(data["curr"])==null){
                    banned.set(data["curr"], [data["name"]]);
                }
                else{
                    banned.get(data["curr"]).push(data["name"]);
                }
                io.to(`${id}`).emit("startkick", {name:data["name"], kickedroom:data["curr"]});
            } 
        }
    });
    socket.on("bancheck", function(data){
        let ban = "no";
        if(banned.get(data["room"])!=null){
            banned.get(data["room"]).forEach(user => {
                if(user==data["name"]){
                    console.log("user is banned");
                    ban = "yes";
                    socket.emit("ban_return", {banned:"yes", room:data["room"]});
                }
                if(ban=="no"&&user==banned.get(data["room"])[banned.get(data["room"]).length-1]&&user!=data["name"]){
                    console.log("user not banned");
                    socket.emit("ban_return", {banned:"no", room:data["room"]});
                }
            });
        }
        else{
            console.log("not iterable");
            socket.emit("ban_return", {banned:"no", room:data["room"]});
        }
    });
});