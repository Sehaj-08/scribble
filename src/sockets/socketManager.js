import {WebSocketServer , WebSocket} from "ws"
import {rooms} from "../store/roomStore.js"
import {ROOM_STATES,STROKE_EVENTS,GUESS_EVENTS} from "../config/constants.js"
import {timer} from "../services/gameServices.js" 

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
                    for(const msg of room.strokes){
                        player.socket.send(JSON.stringify(msg))
                    }
                }
                
                const message = JSON.parse(data)
                if(message.type !== STROKE_EVENTS.POINT){
                 
                
                //storing the messages for later users 
            room.strokes.push(message)
            //Should i apply nested loop here ?
            for(const player of room.players){
                if(player.socket &&
                    player.socket.readyState === WebSocket.OPEN &&
                     player.playerId !== drawer.playerId){
                        player.socket.send(JSON.stringify(message))
                    
                }
            }}
            //for checking if the word sent by the player matches 
            if(message.type === GUESS_EVENTS.GUESS){
                //first check if the room even exists or not 
                if(room.state === ROOM_STATES.round_ended){
                        console.log("Round has already ended")
                        return
                    }
                // 
                if(!message.text || drawer.playerId === playerId){
                    console.log("No message received")
                    return
                }
                const guess = message.text.trim().toLowerCase();
                const currentWord = room.word
                // find player so that if word is correct we can add an indentifier to him 
                const player = room.players.find(
                    (player) => player.playerId === playerId
                )
                if(guess === currentWord){
                    //stopping player from guessing more than one time
                    if(player.hasGuessed){
                        console.log("You have already guessed the word")
                        return; 
                    }
                    
                    player.hasGuessed = true
                    //broadcast the correc guess message to all 
                    for(const players of room.players){
                        if(players.socket && players.socket.readyState === WebSocket.OPEN){
                            players.socket.send(JSON.stringify({
                                type : "correct_guess",
                                player : players.playerId
                            }))
                        }
                    }
    
                    //Scoring rules 
                    let points = room.time
                    player.score += points
    
                    console.log("Correct guess")
                }else{
                    console.log("Wrong guess")
                    for(const player of room.players){
                        if(player.socket && player.socket.readyState === WebSocket.OPEN){
                            player.socket.send(JSON.stringify({
                                type : "chat",
                                text : guess ,
                                playerId : player.playerId                       
                            }))
                        }
                    }
                }
             
            }
        
            })
            
        }
    
        
        
    
    
    // others see the timer and msg that game has stated
    })
    


 }

 