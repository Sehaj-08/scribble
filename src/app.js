import "dotenv/config"
import {WebSocketServer , WebSocket} from "ws"
import http from "http"

import express from "express"
import { clearInterval } from "timers"
const app = express()
const port = process.env.PORT || 8000
const rooms  = {}  // why Object not ARRAY CAUSE --> Searching iin object is easier no need for looping direct search happend TC is O(1) 
app.use(express.json())

//States of the room
const ROOM_STATES = {
    waiting : "WAITING",
    drawing : "DRAWING",
    round_ended : "ROUND_ENDED"
}

const STROKE_EVENTS = {
    POINT : "stroke_point",
    END : "stroke_end"
}

app.get("/" , (req,res) => {
    res.send("yo yo")
})
function generateRoomId(){
    return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function timer(room){
    let time = 10
    room.timer = setInterval(() => {
        for(const player of room.players){
            if(player.socket && player.socket.readyState === WebSocket.OPEN){
                player.socket.send(JSON.stringify({
                    type : "time-ticking",
                    time : time
                }))
            }
        }
        time--
        if(time<=0){
            clearInterval(room.timer)
            room.state = ROOM_STATES.round_ended
            for(const player of room.players){
                if(player.socket && player.socket.readyState === player.playerId){
                    player.socket.send(JSON.stringify({
                        message : "Aye kya rheee lawdee!!",
                        word : "apple"
                    }))
                }
            }
        }

    }, 1000);
}
// function timer(player,roomId){
//     // others see the timer and msg that game has stated
//             let time = 10;
//             const timer = setInterval(() => {
//             console.log(time);
//             player.socket.send(JSON.stringify({
//                 time    
//             }))
//             time--;

//             if(time<=0){
//                 clearInterval(timer);
//                 player.socket.send(JSON.stringify({
//                     message : "Times up mate!!!",
//                     word : "apple"
//             }))
//             }
//         }, 1000);
//         rooms[roomId].state = ROOM_STATES.round_ended
// }
app.get("/rooms" , (req,res) => {
    //for storing multiple rooms create a js object   
    // for current room making generate a unique id
    let  roomId = generateRoomId()
    // check if the id exists for enyother room
    while(rooms[roomId]){
        roomId = generateRoomId()
    } 
    // create playes for that rooom
    rooms[roomId] = {
        players : [],
        state : ROOM_STATES.waiting,
        strokes : []
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

app.get("/get_all_rooms/:current_room_id" , (req,res) => {
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
    //2+ Players then start the game
    

    socket.on("close" , () => {
        console.log(`Player with id ${playerId} has disconnected from room ${roomId}`)
        const player = room.players.find(
            (player) => player.playerId === playerId
        )//DONT DELETE PERSON IMM AFTER DISCONNECTION GIVE CHANCE TO RECONNECT
        // if(playerIndex !== -1){
        //     room.players.splice(playerIndex , 1)
        // }
        if(!player){
            return;
        }        
        player.socket = null

        const recalculatingConnectedPlayers = room.players.filter(
        (player) => player.socket && 
                    player.socket.readyState === WebSocket.OPEN
    )
        if(recalculatingConnectedPlayers.length <= 1){
            clearInterval(room.timer)
            room.timer = null
            console.log(room.timer)
            room.state = ROOM_STATES.round_ended;
            for(const player of room.players){
                if(player.socket && player.socket.readyState === WebSocket.OPEN){
                    player.socket.send(JSON.stringify({
                        message : "Round ended fuck you"
                    }))
                }   
            }
        }
    })
    

    // for(const player of room.players){
    //     if(player.socket && player.socket.readyState === WebSocket.OPEN){

    //     }
    // }
    const connectedPlayers = room.players.filter(
        (player) => player.socket && 
                    player.socket.readyState === WebSocket.OPEN
    )

    const playersCount = connectedPlayers.length
    if(rooms[roomId].state === ROOM_STATES.waiting && playersCount >= 2){
        // Give player 1 drawer rights 
        rooms[roomId].state = ROOM_STATES.drawing
        const drawer = connectedPlayers[0]
        // only he sees the word
        drawer.socket.send(JSON.stringify({
            word : "apple"
        }))
        
        for(const player of room.players){
                if(player.socket && player.socket.readyState === WebSocket.OPEN){
                    if(player.playerId !== playerId){
                        player.socket.send(JSON.stringify({
                        message : "Game has fucking started"
                    }))}
            }
          console.log("Its not what a person says its who is saying that")  
        }
        console.log("Hum pe toh hai hi nooo!!")
        timer(room)

        //Phase 3 starts 
        //T - 1 frtonend sends message , stroke events tell backend if drawing 
        socket.on("message", (data) =>{
            //Authorizing the drawer    
            if(playerId !== drawer.playerId){
                console.log("Only drawer has the permission")
                return
                }
            if(room.strokes.length > 0){
                for(const m of room.strokes){
                    player.socket.send(JSON.stringify(msg))
                }
            }
            
            const message = JSON.parse(data)
            if(message.type !== STROKE_EVENTS.POINT){
                return;
            }
            //storing the messages for later users 
        room.strokes.push(message)
        //Should i apply nested loop here ?
        for(const player of room.players){
            if(player.socket &&
                player.socket.readyState === WebSocket.OPEN &&
                 player.playerId !== drawer.playerId){
                    player.socket.send(JSON.stringify(message))
                
            }
        }
    
        })
        
    }

    
    


// others see the timer and msg that game has stated
})


server.listen(port ,() =>{
    console.log("Server has started you little brattt!!!")
} )
export {app}


