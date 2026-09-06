import express from "express"
const app = express()
const rooms  = {}  // why Object not ARRAY CAUSE --> Searching iin object is easier no need for looping direct search happend TC is O(1) 
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
export {app}