import {WebSocketServer , WebSocket} from "ws"
import {rooms} from "../store/roomStore.js"
import {ROOM_STATES,STROKE_EVENTS,GUESS_EVENTS , CHOOSE_WORD} from "../config/constants.js"
import {timer , disconnection ,  startRound,handleStrokes , checkGuess , syncStrokes , checkWord} from "../services/gameServices.js" 

export function initWebSockets(server){
    const wss = new WebSocketServer({server})
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
        // Sending new player joined message
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
        
        //Disconnection logic 
        socket.on("close" , () => {
            // if(playerId === room.drawer.playerId){
            //     drawerDisconnected()
            // }
            disconnection(playerId,room,roomId,socket)
        })
        //VERY HUGE BUG SOLVED lines 66-72  (See notion for solution Task 6 soln)
        if(player.socket && player.socket.readyState === WebSocket.OPEN){
            if(room.state === ROOM_STATES.waiting)
            startRound(room ,player)
        }else{
            console.log("New player joined the same game")
        }

        socket.on("message", (data) =>{
            const message =  JSON.parse(data)
            if(!message){
                console.log("No message received")
            }
            
            if(message.type===STROKE_EVENTS.POINT){
                syncStrokes(room , player)
                handleStrokes(room , playerId  ,room.drawer.playerId , message)
            //for checking if the word sent by the player matches
            }
            if(message.type === GUESS_EVENTS.GUESS) {
                checkGuess(data, room , playerId , room.drawer.playerId , message)
            }
            if(message.type === CHOOSE_WORD.WORD){
                checkWord(room,playerId ,room.drawer ,message)
            }
            })
    
        
        
    
    
    // others see the timer and msg that game has stated
    })
    


 }

 

 //We want multiple rounds === One game and total score in the end 

 //1 Remove the player.scroe reset after every round
 //2 set and number of rounds after which game ends and total score has been provided
 //3 set a condition that after certain number of rounds game ends 
 //4 After game ended broadcast the total of each player to all 


 //implementing 
 //1) how do i link total numberof rounds with the room 
 //i think by room.totalRounds = 3
 //room.currentRound = 1 then increment this as things come 

 //2) trigger the start of next round 

 