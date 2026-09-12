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
        strokes : []
    } 
    //return room id
    return res.status(201).json({
        roomId
    })
}

function join_room(req,res){
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

