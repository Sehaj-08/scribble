import {WebSocketServer , WebSocket} from "ws"
import {rooms} from "../store/roomStore.js"
import {ROOM_STATES,STROKE_EVENTS,GUESS_EVENTS , CHOOSE_WORD , CURRENT_STATE_SNAPSHOT} from "../config/constants.js"
import {timer , disconnection ,syncStrokes,  startRound,handleStrokes , checkGuess , checkWord} from "../services/gameServices.js" 
import  {validator} from "../services/message.validator.js"
let backendConnCounter = 0
//Do one correctlion think of applying rate limiting only on guess messages 
const MAX_MESSAGES_PER_SECOND = 10000

export function initWebSockets(server){
    const wss = new WebSocketServer({server})
    wss.on("connection" , (socket,request)=> {
        backendConnCounter++;
        socket.connId = backendConnCounter;
        
        console.log(`[BACKEND socketManager] Websocket connection #${socket.connId} established`)
        const url = new URL(request.url , "http://localhost:3000")
        const roomId = url.searchParams.get("roomId")
        const playerId = url.searchParams.get("playerId")
        console.log(`[BACKEND socketManager] Room ID: ${roomId}, Player ID: ${playerId}`)

        const room = rooms[roomId]
        if(!room){
            console.log(`[BACKEND socketManager] Connection #${socket.connId} closing (1008): Room not found. Room exists: false`)
            socket.close(1008 , "Room not found")
            return;
        }
        console.log("Chck1")
        const player = room.players.find(
            (player) => player.playerId === playerId
        ) 
        // || room.waitingPlayers.find(
        //     (player) => player.playerId === playerId
        // )
        console.log("Chck2")
        //FIRST PRENEVTION -- this prevents players from entering if room is full
        if(!player){
            console.log(`[BACKEND socketManager] Connection #${socket.connId} closing (1008): Player doesn't belong to this room`)
            socket.close(1008 , "Player doesnt belongs to this room")
            return 
        }
//THIRD PREVENTION -- ALLOWS PLAYER TO RECONNECT THE ROOM
// IMPT -- this will check if can is within time range to reconnect or not
//the fact that deadline i.e player.reconnect... started tells player disconnecterd some time 
//casue this playerreconn only triggeres when player disconnects not when new joined
        const isValidReconnect =
    player.socket === null &&
    player.reconnectExpiresAt &&
    Date.now() <= player.reconnectExpiresAt;
    console.log("Status is reconnection valid: ", isValidReconnect)
    //if this is false meaning either reconn tim gone or a new player trying to join whioch not alloews 
    //if th9is is not false that is its true then  
    
    //SECOND PREVENTION -- if a new player tries to join a ongoing game with vacant seat (someon left) then ths code will stop casue room was locked the moment game started
    console.log("#$#$#$#$#$#$")
    if(room.roomLocked && !isValidReconnect){
            console.log("Room is locked no one can enter")
            socket.send(JSON.stringify({
                type : ROOM_STATES.room_locked,
                message: 'laadfle, This room is full and the game has already started. Please join another room.'
            }))
            return 
        }
        // Close stale socket before assigning the new one to prevent disconnecting the new connection
        if(player.socket && player.socket.readyState === WebSocket.OPEN){
            console.log(`[BACKEND socketManager] Player reconnecting. Closing stale socket. Room=${roomId}, Player=${playerId}`)
            player.socket.close(1008, "Replaced by new connection");
        }
        
        console.log("Chck3")
        // player.score = 0
        player.socket = socket
      
        
        //THIRD PREVENTION --   LETTING ONLY RECONNECTION WALE PLAYERS TO REJOIN 
        //If roomDeleteTimre is already running stop it casue new player joined 
        if(room.roomDeleteTimer){
            clearTimeout(room.roomDeleteTimer)
            room.roomDeleteTimer = null
        }
        
        console.log(`[BACKEND socketManager] Player ${playerId} socket set to Connection #${socket.connId} in room ${roomId}`)
        // Sending new player joined message
        console.log("#$#$#$#$#$#$#$#$#$#$#$#" , room.players.length)
        if(room.players.length <=4){
        for (const player of room.players){
            console.log("Sending player jonied message to all")
            if(player.playerId !== playerId){
            if(player.socket && player.socket.readyState === WebSocket.OPEN){
                player.socket.send(JSON.stringify({
                    type : "player_joined", // this type is responsible for telling frontend who has entered which will the recerve the current game status 
                    playerId : playerId
                }))
            }
            }
        }
    }
        //HEY GPT is this correct way of sending list of already connecred player to recently joined player 
        //Sending the currently joined player list of all the connected players 
        const connectedPlayersToSend = room.players.filter(
            (p) => p.socket && p.socket.readyState === WebSocket.OPEN && p.playerId !== playerId
        )
        player.socket.send(JSON.stringify({
            all_connectedPlayers_list : connectedPlayersToSend
        }))
        
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
        let messageCount = 0
        let windowStart = Date.now()
        //Disconnection logic 
        console.log("See if syncStrokes is gettign triggered")
        syncStrokes(room , player)
        socket.on("close" , () => {
            console.log(`[BACKEND socketManager] socket.on("close") triggered for Connection #${socket.connId}, Player=${playerId}, Room=${roomId}`)
            // if(playerId === room.drawer.playerId){
            //     drawerDisconnected()
            // }
            disconnection(playerId,room,roomId,socket)
        })
        //VERY HUGE BUG SOLVED lines 66-72  (See notion for solution Task 6 soln)
        if(player.socket && player.socket.readyState === WebSocket.OPEN && room.players.length === 4){
            if(room.state === ROOM_STATES.waiting){
                room.roomLocked = true;
                startRound(room ,player)
        }else{
            console.log(room.state)
            const current_state = {
                type : CURRENT_STATE_SNAPSHOT.CURRENT_STATE_SNAPSHOT,
                state : room.state,
                currentRounds : room.currentRounds,
                drawerId: room.drawer?.playerId ?? null,
                // room_drawerId : room.drawer.playerId,
                timer : room.time,
                
            }
            player.socket.send(JSON.stringify(current_state))
            console.log("New player joined the same game")
        }
        }else{
            console.log("Romo is full you little fucking folish weasel")
        }

        socket.on("message", (data) =>{
            //applying ratte limiting 
            const now = Date.now()

    if (now - windowStart >= 1000) {
        messageCount = 0
        windowStart = now
    }

    if (messageCount >= MAX_MESSAGES_PER_SECOND) {
        console.log(`Rate limit exceeded for player ${playerId}`)
        return
    }

    messageCount++
            const message =  JSON.parse(data)
            const result = validator(message)
            if(!result.valid){
                console.log("message didnt pass the validation")
                return
            }
            
            if(message.type===STROKE_EVENTS.POINT){
                if(room.state === ROOM_STATES.drawing){ //check if this condition is even needed or fucking not !!!!
                console.log("Stroke message arrived")
                                  
                    handleStrokes(room , playerId  ,room.drawer.playerId , message)
            //for checking if the word sent by the player matches
                 } }
            if(message.type === GUESS_EVENTS.GUESS) {
                checkGuess(data, room , playerId , room.drawer.playerId , message)
            }
            if(message.type === CHOOSE_WORD.WORD){
                console.log("check Word function has been started or we can say initiated")
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

 