import "dotenv/config"

import cors from "cors"
import express from "express"
import { clearInterval } from "timers"
import {rooms} from "./store/roomStore.js"
import room_router from "./routes/room.routes.js"
import http from "http"
import {initWebSockets} from "./sockets/socketManager.js"
import { cleanupRoomTimers } from "./services/gameServices.js"
const app = express()
const port = process.env.PORT || 8000




app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173"
}));

//req parsing
app.use(express.json())

//using routes
app.use("/api/rooms",room_router)



//Websockets connection 
const server = new http.createServer(app)
const wss = initWebSockets(server)


//server listening
server.listen(port ,() =>{
    console.log(`Server has started on port ${port} you little brattt!!!`)
} )

//code below IS FOR GRACEFULL SHUTDOWN USING SIGINT AND SIGTERM 

let isShuttingDown = false;

function shutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    cleanupRoomTimers();

    console.log(`[SHUTDOWN] ${signal} received. Starting graceful shutdown.`);

    // Stop accepting new HTTP connections and close the HTTP server.
    server.close((error) => {
        if (error) {
            console.error("[SHUTDOWN] HTTP server close error:", error);
            process.exitCode = 1;
        }

        console.log("[SHUTDOWN] HTTP server closed.");
    });
    // Stop accepting new WebSocket connections.
    wss.close((error) => {
        if (error) {
            console.error("[SHUTDOWN] WebSocket server close error:", error);
            process.exitCode = 1;
        }

        console.log("[SHUTDOWN] WebSocket server closed.");
    });

    // Close currently connected WebSocket clients.
    for (const socket of wss.clients) {
        socket.close(1001, "Server shutting down");
    }

    // Temporary deadline so shutdown cannot wait forever.
    const forceShutdownTimer = setTimeout(() => {
        console.error("[SHUTDOWN] Deadline reached. Forcing exit.");
        process.exit(1);
    }, 10000);

    forceShutdownTimer.unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

export {app}


