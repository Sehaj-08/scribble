import {rooms} from "../store/roomStore.js"
import {ROOM_STATES,STROKE_EVENTS,GUESS_EVENTS} from "../config/constants.js"

function generateRoomId(){
    return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function create_room(req,res){
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
            strokes : [],
            totalRounds : 5 ,
            currentRounds : 0,
            alreadyMadeDrawers : [] ,
            roomDeleteTimer: null
        } 

        //here we can make first player join
        const playerId = Math.random().toString(36).substring(2, 10);
    
        // storing player isn the player array
        rooms[roomId].players.push({
            playerId,
            socket: null,
            hasGuessed: false,
            lastStrokeId: 0,
            score: 0
        })
    //return room id
    return res.status(201).json({
        roomId,
        playerId,
    })
}

//VERY IMP AND GOOD LOGICAL improvements done in this function please see this 
function join_room(req,res){
    // check if rooms exists 
        const {room_id} = req.params
        //Player id for reconnection  
        const incomingPlayerId = req.query.playerId
        const room = rooms[room_id]

        console.log(room_id)
        if (!room){
            return res.status(400).json("Room no longer exists")
        }
        //Both cases will be sending diff playerId to frontend 
        //so use let player;
        let player;
        //Logic for sending the same id with which player joined earlier for reconnection 
        if(incomingPlayerId){
            player = room.players.find(
                (player) => player.playerId === incomingPlayerId
            )
            if(!player){
                return res.status(404).json({
                    message : "Player doesnt exist"
                })
            }
        }else
          {
            const playerId = Math.random().toString(36).substring(2, 10);
        
          
        // storing player isn the player array
        player = {
            playerId,
            hasGuessed: false,
            socket: null,
            lastStrokeId: 0,
            score: 0
        }
        room.players.push(player) 
    }
    // return all players
        return res.status(201).json({
            message : "Player Entered the fucking room",
            playerId : player.playerId,
            roomId : room_id
        })
    
}

function get_current_room(req,res){
    return res.status(200).json({
        rooms
    })
}

export{
    create_room,
    join_room,
    get_current_room
}

