import {WebSocketServer , WebSocket} from "ws"
import {rooms} from "../store/roomStore.js"
import {ROOM_STATES,STROKE_EVENTS,GUESS_EVENTS} from "../config/constants.js"
import {timer , disconnection ,  handleStrokes , checkGuess} from "../services/gameServices.js" 

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
            disconnection(playerId,room,roomId)
        })
        //ROUND START LOGIC
        const connectedPlayers = room.players.filter(
            (player) => player.socket && 
                        player.socket.readyState === WebSocket.OPEN
        )
    
        const playersCount = connectedPlayers.length
        if(rooms[roomId].state === ROOM_STATES.waiting && playersCount >= 2){
            //ROUND STARTS
            room.strokes.length = 0
            //
            for(const player of room.players){
                player.hasGuessed = false
                player.score = 0
            }
        
            //here create a random word for sending to the players 
            // Give player 1 drawer rights 
            rooms[roomId].state = ROOM_STATES.drawing
            const drawer = connectedPlayers[0]
            const animals = [
                    "Capybara",
                    "Axolotl",
                    "Pangolin",
                    "Meerkat",
                    "Wombat",
                    "Narwhal",
                    "Lemur",
                    "Platypus",
                    "Fennec",
                    "Quokka"
                            ];
            const animalIndex = Math.floor(Math.random() * 10);
    
            // only he sees the word
            const word = animals[animalIndex].trim().toLowerCase()
            room.word = word
            drawer.socket.send(JSON.stringify({
                word 
            }))
            
            //i think we hhave to take this block out of the if condition
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
            
            
        }
        socket.on("message", (data) =>{
            const message =  JSON.parse(data)
            if(!message){
                console.log("No message received")
            }
            
            if(message.type===STROKE_EVENTS.POINT){
                handleStrokes(room , playerId  ,drawer.playerId , message)
            //for checking if the word sent by the player matches
            }
            if(message.type === GUESS_EVENTS.GUESS) 
                checkGuess(data, room , playerId , drawer.playerId)
        
            })
    
        
        
    
    
    // others see the timer and msg that game has stated
    })
    


 }

 