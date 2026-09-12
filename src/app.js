import "dotenv/config"


import express from "express"
import { clearInterval } from "timers"
import {rooms} from "./store/roomStore.js"
import room_router from "./routes/room.routes.js"
import http from "http"
import {initWebSockets} from "./sockets/socketManager.js"
const app = express()
const port = process.env.PORT || 8000

//req parsing
app.use(express.json())

//using routes
app.use("/api/rooms",room_router)



//Websockets connection 
const server = new http.createServer(app)
initWebSockets(server)


//server listening
server.listen(port ,() =>{
    console.log("Server has started you little brattt!!!")
} )
export {app}


