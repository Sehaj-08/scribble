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
                        word : room.word
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

function disconnection(playerId , room , roomId ){
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
}
function syncStrokes(room, player){
    if(room.strokes.length === 0){
        return;
    }
    let count = room.strokes.length - 1
    const lastStroke = room.strokes[count].strokeId
    if(lastStroke !== player.lastStrokeId){
        const missingStrokes = room.strokes.filter(
        (stroke) => stroke.strokeId > player.lastStrokeId
    )
    for(const stroke of missingStrokes){
        if(player.socket && player.socket.readyState === WebSocket.OPEN){
            player.socket.send(JSON.stringify(stroke))
            player.lastStrokeId = stroke.strokeId  
        }
    }
    }
    
}


function handleStrokes(room , playerId , drawerId , message){
    //Authorizing the drawer    
                if(playerId !== drawerId){
                    console.log("Only drawer has the permission")
                    return
                    }
            
                // let count = room.strokes.length - 1
                // let lastStroke = room.strokes[count].strokeId
                // if(lastStroke !== player.lastStrokeId){
                //     const missingStrokes = room.strokes.filter(
                //         (stroke) => stroke.strokeId > player.lastStrokeId
                //     )
                // for(const stroke of missingStrokes){
                //     if(player.socket && player.socket.readyState === WebSocket.OPEN){
                //         player.lastStrokeId = stroke.strokeId
                //         player.socket.send(JSON.stringify(stroke))
                //     }
                // }
                // }
                
       
                    
                
                //storing the messages for later users 
            room.strokes.push(message)
            //Should i apply nested loop here ?
            for(const player of room.players){
                if(player.socket &&
                    player.socket.readyState === WebSocket.OPEN &&
                     player.playerId !== drawerId){
                        player.socket.send(JSON.stringify(message))
                    
                }
            }
}


function checkGuess(data , room, playerId ,drawerId ){
    const message = JSON.parse(data)

    if(message.type === GUESS_EVENTS.GUESS){
                //first check if the room even exists or not 
                if(room.state === ROOM_STATES.round_ended){
                        console.log("Round has already ended")
                        return
                    }
                // 
                if(!message.text || drawerId === playerId){
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
                                player : playerId
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
}
export {timer, disconnection , handleStrokes ,checkGuess , syncStrokes}