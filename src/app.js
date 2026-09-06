import express from "express"
const app = express()
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

export {app}