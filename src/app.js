import "dotenv/config"
import {WebSocketServer , WebSocket} from "ws"
import http from "http"

import express from "express"
const app = express()
const port = process.env.PORT || 8000
const rooms  = {}  // why Object not ARRAY CAUSE --> Searching iin object is easier no need for looping direct search happend TC is O(1) 
app.use(express.json())
app.get("/" , (req,res) => {
    res.send("yo yo")
})
function generateRoomId(){
    return Math.random().toString(36).substring(2, 7).toUpperCase();
}
app.get("/rooms" , (req,res) => {
    //for storing multiple rooms create a js object   
    // for current room making generate a unique id
    const roomId = generateRoomId()
    // check if the id exists for enyother room
    while(rooms[roomId]){
        roomId = generateRoomId()
    } 
    // create playes for that rooom
    rooms[roomId] = {
        players : []
    } 
    //return room id
    return res.status(201).json({
        roomId
    }) 
})  

// a post endpoint where user sends the roomId he wants to enter adn his name 
app.post("/join_rooms/:room_id" , (req,res) => {
// check if rooms exists
    const {room_id} = req.params
    
    console.log(room_id)
    if (!rooms[room_id]){
        return res.status(400).json("Room no longer exists")
    }
    const playerId = Math.random().toString(36).substring(2, 10);

    // storing player isn the player array
    rooms[room_id].players.push({
        playerId
    }) 
// return all players
    return res.status(201).json("Player Entered the fucking room")

})

app.get("/get_all_rooms" , (req,res) => {
    return res.status(200).json({
        rooms
    })
})

const server = new http.createServer(app)
const wss = new WebSocketServer({
    server
})
wss.on("connection" , (socket,request)=> {
    console.log("Websocket connection established")
    const url = new URL(request.url , "http://localhost:3000")
    const roomId = url.searchParams.get("roomId")
    const playerId = url.searchParams.get("playerId")
    console.log("WebSockets connection")
    console.log("Room ID" , roomId)
    console.log("Player ID" , playerId)

    const room = rooms[roomId]
    if(!room){
        socket.close(1008 , "Room not found")
        return;
    }
    console.log("Chck1")
    const player = room.players.find(
        (player) => player.playerId == playerId
    )
    console.log("Chck2")
    if(!player){
        socket.close(1008 , "Player doesnt belongs to this room")
        return 
    }
    console.log("Chck3")

    player.socket = socket
    console.log(`Player ${playerId} has joined the room ${roomId}`)

    for (const player of room.players){
        if(player.playerId !== playerId){
        if(player.socket && player.socket.readyState === WebSocket.OPEN){
            player.socket.send(JSON.stringify({
                type : "player_joined",
                playerId : playerId
            }))
        }
        }
    }
    // socket.on("close" , (socket,request) => {
    //     const url = new URL(request.url , "http://localhost:3000")
    //     const roomId = url.searchParams.get("roomId")
    //     const playerId = url.searchParams.get("playerId")
    //     const room = rooms[roomId]
    //     const player = room.players.find(
    //         (player) => player.playerId === playerId
    //     )
    //     console.log("Hey you lill fuck!!" , player)
    // })
    socket.on("close" , () => {
        console.log(`Player with id ${playerId} has disconnected from room ${roomId}`)
        const playerIndex = room.players.findIndex(
            (player) => player.playerId == playerId
        )
        if(playerIndex !== -1){
            room.players.splice(playerIndex , 1)
        }
    })
})

server.listen(port ,() =>{
    console.log("Server has started you little brattt!!!")
} )
export {app}