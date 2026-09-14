import {ROOM_STATES,STROKE_EVENTS,GUESS_EVENTS , CHOOSE_WORD} from "../config/constants.js"
import { WebSocketServer , WebSocket } from "ws";

function startRound(room , playerId){
    //ROUND START LOGIC
    if(room.currentRounds > room.totalRounds){
        console.log("Game gas ended")
        return;
    }
        const connectedPlayers = room.players.filter(
            (player) => player.socket && 
                        player.socket.readyState === WebSocket.OPEN
        )
    
        const playersCount = connectedPlayers.length
        if(room.state === ROOM_STATES.waiting && playersCount >= 2){
            //ROUND STARTS
            room.strokes.length = 0
            room.currentRounds += 1
            //
            for(const player of room.players){
                player.hasGuessed = false
                
            }
        
            //here create a random word for sending to the players 
            // Give player 1 drawer rights 
            // rooms[roomId].state = ROOM_STATES.drawing
            room.drawer = connectedPlayers[0]
            room.state = ROOM_STATES.choosing_words // only after word has been choose room's state can be drawing 
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
            const candidateWordIndex1 = Math.floor(Math.random() * 10);
            const candidateWordIndex2 = Math.floor(Math.random() * 10);
             //add a check for if the candidate words are the fucking same
            while(candidateWordIndex2 === candidateWordIndex1){
                candidateWordIndex2 = Math.floor(Math.random() * 10)
            }
            const candidateWordIndex3 = Math.floor(Math.random() * 10);
            while(candidateWordIndex3 === candidateWordIndex2){
                candidateWordIndex3 = Math.floor(Math.random() * 10)
            }
            while(candidateWordIndex1 === candidateWordIndex3){
                candidateWordIndex3 = Math.floor(Math.random() * 10)
            }
            room.candidateArray = [
                {
                    wordId : candidateWordIndex1,
                    word : animals[candidateWordIndex1]
                },{
                    wordId : candidateWordIndex2,
                    word : animals[candidateWordIndex2]
                },{
                    wordId : candidateWordIndex3,
                    word : animals[candidateWordIndex3]
                }
            ]
           //sending these candidate words to the frontend
            const wordChoiceMessage = {
                type : "word_choice",
                words : room.candidateArray
            }
            // only drawer sees the word
            if(room.drawer.socket && room.drawer.socket.readyState === WebSocket.OPEN){
            room.drawer.socket.send(JSON.stringify(wordChoiceMessage))
            }

    
            
            
          
            //i think we hhave to take this block out of the if condition
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
            
    
            //Phase 3 starts 
            //T - 1 frtonend sends message , stroke events tell backend if drawing 
            
            
        }
}

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
            if(player.socket === socket){  
            player.socket = null
        }
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


function checkGuess(data , room, playerId ,drawerId  ,mesage){
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

function checkWord(room , playerId,drawer , message){
    // get the id of the word 
                // check it with prev one 
                //assign it to the room
                if(room.state !== ROOM_STATES.choosing_words){
                    console.log("Room's not in the choosing state man")
                    return;
                }
                if(playerId !== drawer.playerId){
                    console.log("Only drawer can select the word")
                    return; 
                }
                const theWord =  room.candidateArray.find(
                    (candidate) => message.wordId === candidate.wordId
                )
                if(!theWord){
                    console.log("Ayee you fucking bitch , no panga taking with me")
                    return;
                }
                room.word = theWord.word.trim().toLowerCase()
                room.state = ROOM_STATES.drawing
                timer(room) // timer should 
}
export {timer, disconnection , handleStrokes ,checkGuess , syncStrokes , startRound , checkWord}