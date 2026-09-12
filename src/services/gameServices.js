function timer(room){
    room.time = 10
    room.timer = setInterval(() => {
        for(const player of room.players){
            if(player.socket && player.socket.readyState === WebSocket.OPEN){
                player.socket.send(JSON.stringify({
                    type : "time-ticking",
                    time : room.time
                }))
            }
        }
        room.time--
        if(room.time<=0){
            clearInterval(room.timer)
            room.state = ROOM_STATES.round_ended
            for(const player of room.players){
                if(player.socket && player.socket.readyState === WebSocket.OPEN){
                    player.socket.send(JSON.stringify({
                        message : "Aye kya rheee lawdee!!",
                        word : "apple"
                    }))
                }
            }
        }

    }, 1000);
}


// function timer(player,roomId){
//     // others see the timer and msg that game has stated
//             let time = 10;
//             const timer = setInterval(() => {
//             console.log(time);
//             player.socket.send(JSON.stringify({
//                 time    
//             }))
//             time--;

//             if(time<=0){
//                 clearInterval(timer);
//                 player.socket.send(JSON.stringify({
//                     message : "Times up mate!!!",
//                     word : "apple"
//             }))
//             }
//         }, 1000);
//         rooms[roomId].state = ROOM_STATES.round_ended
// }


export {timer}