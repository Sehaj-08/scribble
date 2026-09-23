import {ROOM_STATES,STROKE_EVENTS,GUESS_EVENTS , CHOOSE_WORD} from "../config/constants.js"
import { WebSocketServer , WebSocket } from "ws";
import { rooms } from "../store/roomStore.js";


function startRound(room){
    //ROUND START LOGIC
    if(room.currentRounds >= room.totalRounds){
        console.log("Game gas ended")
        room.alreadyMadeDrawers.length = 0
        for(const players of room.players){
            if(players.socket && players.socket.readyState === WebSocket.OPEN){
                players.socket.send(JSON.stringify({
                    type : "Players score",
                    score : players.score
            }))
            }
        }
        return;
    }
        console.log("Calculating connected players")
        const connectedPlayers = room.players.filter(
            (player) => player.socket && 
                        player.socket.readyState === WebSocket.OPEN
        )
    
        const playersCount = connectedPlayers.length
               // 
        if((room.state === ROOM_STATES.waiting || room.state === ROOM_STATES.starting_new_round) && playersCount >= 2){
            //ROUND STARTS
            console.log("Round started")
            room.strokes.length = 0
            room.currentRounds += 1

            //HEY GPT is this correct way to tell all what round it is 
            for(const players of room.players){
                if(players.socket && players.socket.readyState === WebSocket.OPEN){
                    players.socket.send(JSON.stringify({
                        type: "round_started",
                        round: room.currentRounds

                    }))
                }
            }
            
            //
            for(const player of room.players){
                player.hasGuessed = false
                player.lastStrokeId = 0  
                
            }
            //these 2 if statements make sure each round a different players becomes a drawer
            //Below is P5T1T8 -- phase 5 , task 1 , track 1 
            if(room.currentRounds>1){
                console.log("Rounds greated than 1")
                // room.alreadyMadeDrawers.push(room.drawer)  //pushing drawer of previous round
                
                // // const remainingDrawers = connectedPlayers
                // // .concat(alreadyMadeDrawers)
                // // .filter(item => !connectedPlayers.includes(item) || !alreadyMadeDrawers.includes(item))
                // //Line below solves the rotation problem (Task10 notion)
                // if(room.alreadyMadeDrawers.length === playersCount){
                //     console.log("alredy made drawers was reset")
                //     room.alreadyMadeDrawers.length = 0
                // }
                // const remainingDrawers = connectedPlayers.filter(
                //     (player) => !room.alreadyMadeDrawers.includes(player)
                // )
                // // if(remainingDrawers.length === 0){

                // // }

                // let drawIndex = Math.floor(Math.random() * remainingDrawers.length)
                // room.drawer = remainingDrawers[drawIndex]
                const previousDrawer = room.drawer;

room.alreadyMadeDrawers.push(previousDrawer);

let remainingDrawers = connectedPlayers.filter(
    player => !room.alreadyMadeDrawers.includes(player)
);

if (remainingDrawers.length === 0) {

    console.log("All connected players have been drawers. Resetting drawer history.");

    room.alreadyMadeDrawers.length = 0;

    // Prevent immediate repeat across cycle boundary
    remainingDrawers = connectedPlayers.filter(
        player => player.playerId !== previousDrawer.playerId
    );
}

const drawIndex = Math.floor(
    Math.random() * remainingDrawers.length
);

room.drawer = remainingDrawers[drawIndex];
            }
            if(room.currentRounds === 1){
                console.log("First round started")
            let drawerIndex = Math.floor(Math.random() * playersCount)
            room.drawer = connectedPlayers[drawerIndex]
            }
            //here create a random word for sending to the players 
            // Give player 1 drawer rights 
            // rooms[roomId].state = ROOM_STATES.drawing
            console.log("Drawers information",room.drawer.playerId)
            console.log(room.currentRounds)
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
            let candidateWordIndex1 = Math.floor(Math.random() * 10);
            let candidateWordIndex2 = Math.floor(Math.random() * 10);
             //add a check for if the candidate words are the fucking same
            while(candidateWordIndex2 === candidateWordIndex1){
                candidateWordIndex2 = Math.floor(Math.random() * 10)
            }
            let candidateWordIndex3 = Math.floor(Math.random() * 10);
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
           console.log("Sending choose word message")
            const wordChoiceMessage = {
                type : "word_choice",
                words : room.candidateArray
            }
            // only drawer sees the word
            console.log("Sending drawer candidate words")
            if(room.drawer.socket && room.drawer.socket.readyState === WebSocket.OPEN){
            room.drawer.socket.send(JSON.stringify(wordChoiceMessage))
            }
            //HEY GPT check if this is correct way of telling others who drawer is ??
            //Broadcasting message to all about who is the drawer
            for(const otherplayers of connectedPlayers){
                if(otherplayers.playerId !== room.drawer.playerId){
                    otherplayers.socket.send(JSON.stringify({
                        message : "This is our drawer's Id",
                        drawerId : room.drawer.playerId
                    }))
                }
            }
            room.state = ROOM_STATES.choosing_words

    
            
            
          
            //i think we hhave to take this block out of the if condition
        
            console.log("Hum pe toh hai hi nooo!!")
            
    
            //Phase 3 starts 
            //T - 1 frtonend sends message , stroke events tell backend if drawing 
            
            
        }
}

function timer(room,playerId){
    room.time = 60
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
            //CRITICAL BUG FIX 03
            // THis line is added to stop 2 diff callbacks from running the same endround logic 
            //if the round is already ended by another call back its state owuld be round_ended 
            // so this line below would stop same round to end one more time 
            if (room.state !== ROOM_STATES.drawing) return;

            clearInterval(room.timer)
            room.timer = null
            room.state = ROOM_STATES.round_ended
            for(const player of room.players){
                if(player.socket && player.socket.readyState === WebSocket.OPEN){
                    player.socket.send(JSON.stringify({
                        message : "Aye kya rheee lawdee!!",
                        word : room.word
                    }))
                }
            }
            //Logic responsible for starting next round or ending the game (MAKE THIS A SEPETATE FUNCTION)
            if(room.currentRounds <= room.totalRounds){
                const playersLeft = room.players.filter(
                    (player) => player.socket &&
                            player.socket.readyState === WebSocket.OPEN
                )
                if(playersLeft.length === 1){
                    console.log("We have less players so wait")
                    room.state = ROOM_STATES.waiting
                }
                if(playersLeft.length > 1){
                    console.log("Rounds remain and players enough so start next round")
                    room.state = ROOM_STATES.starting_new_round
                    startRound(room)
                }
            }else{
                console.log("Timer Ended, Game has fuckign ended you fuckign little bitch!!!")
                //Broadacasting score
                for(const players of room.players){
                if(players.socket && players.socket.readyState === WebSocket.OPEN){
                    players.socket.send(JSON.stringify({
                        type : "Players score",
                        score : players.score
                }))
            }
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

function disconnection(playerId , room , roomId,socket){
    console.log(`[BACKEND gameServices] disconnection() called for Player=${playerId}, socket #${socket.connId}`)
    const player = room.players.find(
        (player) => player.playerId === playerId
    )
    if(!player){
        console.log(`[BACKEND gameServices] player not found in room`)
        return;
    }   
    
    if(player.socket && player.socket !== socket){
        const currentPlayerSocketId = player.socket.connId
        console.log(`[BACKEND gameServices] player.socket (is #${currentPlayerSocketId}) !== disconnecting socket #${socket.connId}. Ignoring stale disconnection.`)
        return;
    }
    
    player.socket = null;
    console.log(`[BACKEND gameServices] player.socket set to null for Player=${playerId}`)

        //CRITICLA BUG 04 exists on line 277 
        //SOlved in line 277
        //if one player is in room -- room is waiting -- no drawer selected -- no room.drawer exists
        //of not room.drawer exists them room.drawer.playerId is undefined which will cause server crash 
        // if(!room.drawer){
        //     console.log('Les end the round!!')
        //     return
        // }  //INSTEAD OF ADDING ABOVE CODE WHICH CALLED RETURN TOO EARLY BLOCKIGN FROM ROOM DELETION WE MODIFIED THE ORIGINAL LINE BELOW 
        if(room.drawer && playerId === room.drawer.playerId){
                room.state = ROOM_STATES.round_ended
                clearInterval(room.timer)
                
                for(const players of room.players){
                    if(players.socket && players.socket.readyState === WebSocket.OPEN){
                        players.socket.send(JSON.stringify("Drawer humara kayar tha leave krr gya bitch!!!"))
                    }
                }//if drawer lefts mid round ONLY then check this 
                //for normal players leaving this is not needed thats why we put this code in the if drawer left block 
                //Logic responsible for starting next round or ending the game
                    if(room.currentRounds < room.totalRounds){
                        const playersLeft = room.players.filter(
                            (player) => player.socket &&
                                    player.socket.readyState === WebSocket.OPEN
                        )
                        if(playersLeft.length === 1){
                            console.log("We have less players so wait")
                            room.state = ROOM_STATES.waiting
                        }
                        if(playersLeft.length > 1){
                            console.log("Rounds remain and players enough so start next round")
                            room.state = ROOM_STATES.starting_new_round
                            startRound(room)
                        }
                    }else{
                        console.log("Game has fuckign ended you fuckign little bitch!!!")
                        //Broadcasting Score
                        for(const players of room.players){
                            if(players.socket && players.socket.readyState === WebSocket.OPEN){
                                players.socket.send(JSON.stringify({
                                    type : "Players score",
                                    score : players.score
                     }))
            }
        }
                    } 
            } 
            
            const recalculatingConnectedPlayers = room.players.filter(
            (player) => player.socket && 
                        player.socket.readyState === WebSocket.OPEN
        )
        if(recalculatingConnectedPlayers.length === 0){
            console.log(`[BACKEND gameServices] 0 players left in room=${roomId}, starting grace period timer`)
            if(!room.roomDeleteTimer){
                room.roomDeleteTimer = setTimeout(() => {
                    const currentRoom = rooms[roomId]
                    if (!currentRoom) return; // Already deleted

                    const currentlyConnectedPlayers = currentRoom.players.filter(
                        (player) => player.socket &&
                                    player.socket.readyState === WebSocket.OPEN
                    )                  

                    if(currentlyConnectedPlayers.length === 0){
                        console.log(`[BACKEND gameServices] Grace period ended. Deleting room=${roomId}`)
                        if (currentRoom.timer) {
                            clearInterval(currentRoom.timer)
                        }
                        delete rooms[roomId]
                    }
                    currentRoom.roomDeleteTimer = null
                }, 5000);
            }
            return ;     
        }
            if(recalculatingConnectedPlayers.length === 1){
                //CRITICAL BUG 05 SOLVED HERE
                //When waiting for other players -- waiting for round to start yet -- so timer should not be running in waiting state
                clearInterval(room.timer)
                room.timer = null
                console.log(room.timer)
                room.state = ROOM_STATES.waiting;
                for(const player of room.players){
                    if(player.socket && player.socket.readyState === WebSocket.OPEN){
                        player.socket.send(JSON.stringify({
                            message : "Waiting for players to fucking join"
                        }))
                    }   
                }
            }
            //here i think we should the condition for clearing the state when zero players are left 
            
}

// function drawerDisconnected(){
//     console.log("drawer is gone cry bitches cry ")
//     room.state = ROOM_STATES.round_ended
//     clearInterval(room.timer)
    
// }
// function syncStrokes(room, player){
//     if(room.state !== ROOM_STATES.drawing){
//         console.log("Round not started yet so no strokes")
//         return;
//     }
//     if(room.strokes.length === 0){
//         console.log("No stroke made by drawer yet")
//         return; 
//     }
//     //for now i am assuming id of first stroke will alwas be 1
//     console.log("syncstroke started")
//     // find the strokeId he has currently
//     // let currentPlayerStroke = player.lastStrokeId   
//     // throught the id find the index 
//     const currentStrokeIndex = room.strokes.findIndex(
//         (stroke) => stroke.strokeId === player.lastStrokeId
//     )
//     // //all elements before that index are what the late commer needs
    
//     let count = room.strokes.length - 1 
//     for(let i = currentStrokeIndex ; i<=count; i++){
//         if(player.socket && player.socket.readyState === WebSocket.OPEN){
//             player.socket.send(JSON.stringify(room.strokes[i]))
//         }
//     }
//     // const lastStroke = room.strokes[count].strokeId
//     // // const lastStroke = room.strokes.length
//     // console.log(lastStroke)
//     // if(lastStroke !== player.lastStrokeId){
//     //     console.log("calculating missing strokes")
//     //     const missingStrokes = room.strokes.filter(
//     //     (stroke) => stroke.strokeId > player.lastStrokeId  //this condition is wrong 
//     // )
//     // console.log(missingStrokes)
//     // for(const stroke of missingStrokes){
//     //     if(player.socket && player.socket.readyState === WebSocket.OPEN){
//     //         player.socket.send(JSON.stringify(stroke))
//     //         player.lastStrokeId = stroke.strokeId  
//     //     }
//     // }
//     // }
    
// }

function syncStrokes(room, player) {

    if (room.state !== ROOM_STATES.drawing) {
        console.log("Round not started yet so no strokes");
        return;
    }

    if (room.strokes.length === 0) {
        console.log("No stroke made by drawer yet");
        return;
    }

    console.log("syncstroke started");

    const missingStrokes = room.strokes.filter(
        stroke => stroke.strokeId > player.lastStrokeId
    );

    for (const stroke of missingStrokes) {

        if (
            player.socket &&
            player.socket.readyState === WebSocket.OPEN
        ) {
            player.socket.send(JSON.stringify(stroke));
            player.lastStrokeId = stroke.strokeId;
        }
    }
}

function handleStrokes(room , playerId , drawerId , message){
    if(room.state !== ROOM_STATES.drawing){
        console.log("Round not started yet so no strokes")
        return;
    }
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
                        player.lastStrokeId = message.strokeId
                    
                }
            }
}

function checkGuess(data , room, playerId ,drawerId  ,message){

    if(message.type === GUESS_EVENTS.GUESS){
                //first check if the room even exists or not 
                if(room.state === ROOM_STATES.round_ended){
                        console.log("Round has already ended")
                        return
                    } 
                    //CRITICAL BUG 06 
                    //ONLY ALLOW GUESS WORDS AFTER DRAWER HAS SELECTED THE MAIN WORD
                    if(room.state !== ROOM_STATES.drawing){
                        console.log("Room's not allowing drawing yet so stop fucking guess you stupid little fagot!!!")
                    }
                // 
                if(!message.text || drawerId === playerId){
                    console.log("No message received or drawer guessing the word in not allowed")
                    return
                }
                const guess = message.text.trim().toLowerCase();
                const currentWord = room.word
                // find player so that if word is correct we can add an indentifier to him 
                const player = room.players.find(
                    (player) => player.playerId === playerId
                )
                console.log("Before guessing" , player.hasGuessed)
                if(guess === currentWord){
                    //stopping player from guessing more than one time
                    if(player.hasGuessed){
                        console.log("You have already guessed the word")
                        return; 
                    }
                    console.log("After guessing",player.hasGuessed)
                    player.hasGuessed = true
                    console.log("Correct guess",player.hasGuessed)
                    //broadcast the correc guess message to all 
                    for(const players of room.players){
                        if(players.socket && players.socket.readyState === WebSocket.OPEN){
                            players.socket.send(JSON.stringify({
                                type : "correct_guess",
                                player : playerId
                            }))
                           
                        }
                    }

                    //check whether everyone has guessed correctly or not
                    let allguesses = true
                    for(const player of room.players){
                        if(player.socket && player.socket.readyState === WebSocket.OPEN){
                            if(player.playerId !== drawerId){
                                if(!player.hasGuessed){
                                    allguesses = false
                                    break
                                }
                            }
                        }
                    } 

    
                    //Scoring rules 
                    let points = room.time
                    player.score += points
                    console.log(player.score)
                    console.log(
    "GUESS STATUS:",
    room.players.map(p => ({
        playerId: p.playerId,
        isDrawer: p.playerId === drawerId,
        connected: !!(
            p.socket &&
            p.socket.readyState === WebSocket.OPEN
        ),
        hasGuessed: p.hasGuessed
    }))
);

console.log("ALL GUESSES =", allguesses);
                    if(allguesses){
                        //CRITICAL BUG FIX 03
                        //very important line to add 
                        if (room.state !== ROOM_STATES.drawing) return;

                        room.state = ROOM_STATES.round_ended
                        clearInterval(room.timer)
                        
                        //Logic responsible for starting next round or ending the game

                        if(room.currentRounds < room.totalRounds){
                                const playersLeft = room.players.filter(
                                    (player) => player.socket &&
                                            player.socket.readyState === WebSocket.OPEN
                                )
                                if(playersLeft.length === 1){
                                    console.log("We have less players so wait")
                                    room.state = ROOM_STATES.waiting
                                }
                                if(playersLeft.length > 1){
                                    console.log("Rounds remain and players enough so start next round")
                                    room.state = ROOM_STATES.starting_new_round
                                    startRound(room)
                                }
                            }else{
                                console.log("Game has fuckign ended you fuckign little bitch!!!")
                                //Broadcasting score
                                for(const players of room.players){
                                    console.log("Scoring")
                                  if(players.socket && 
                                    players.socket.readyState === WebSocket.OPEN  
                                    ){
                                    console.log("connection open")
                                        players.socket.send(JSON.stringify({
                                            type : "Players score",
                                            score : players.score
                                    }))
                                    }
                                }
                                                }
                    }
    
                    
                }else{
                    console.log("Wrong guess")
                    for(const player of room.players){
                        if(player.socket && player.socket.readyState === WebSocket.OPEN && !player.hasGuessed){
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
                console.log("Checking Room state")
                if(room.state !== ROOM_STATES.choosing_words){
                    console.log("Room's not in the choosing state man")
                    return;
                }
                console.log("Checking if player is only drawer")
                if(playerId !== drawer.playerId){
                    console.log("Only drawer can select the word")
                    return; 
                }
                console.log("Below we will talk about theWord")
                const theWord =  room.candidateArray.find(
                    (candidate) => message.wordId === candidate.wordId
                )
                console.log(theWord)
                if(!theWord){
                    console.log("Ayee you fucking bitch , no panga taking with me")
                    return;
                }
                room.word = theWord.word.trim().toLowerCase()
                room.state = ROOM_STATES.drawing
                timer(room, playerId) // timer should 
                //broadcasting msg too all about the start of the round
//CRITICAL BUG 06 HERE I THIING WE SHOULD CHANGE THE STATE OF THE ROOM FROM CHOOSING WORD TO DRAWING AND THEN CHECK IN GUESS WORD IF ROOM IS IN DRAWEING STATE 
//Changin the state to drawing which act as a valiator to check if client is alowed to guess or not                 
room.state = ROOM_STATES.drawing
                for(const player of room.players){
                    if(player.socket && player.socket.readyState === WebSocket.OPEN){
                        if(player.playerId !== playerId){
                            player.socket.send(JSON.stringify({
                            message : "Game has fucking started"
                        }))}
                }
              console.log("Word choosen")  
            }
                
}
export {timer, disconnection ,syncStrokes, handleStrokes ,checkGuess  , startRound , checkWord }


//what we want to implement 
//select differnt drawers for each round and no one player can become drawer more than 1 time 
// got a drawer or this round 
// for next round got a random index generated 
// get the player at that index for being the next drawer 
// PROB --  but what if the same player became drawer ins the next round too 
// for this 
// use filter where player.playerId !== drawer.playerId (this is prev drawer)
// this will give an array of people who havent became drawers yet 
// now select from that array the next drawer and repeat the random index code 

//PROB -- what if a playre joined in between the round
// he will be in connectedplayers array but not in our selecting drawers array ??
// due to this eh willl not get the change of becoming drawer any time ???

//ok THE FINAL SOLUTION 
// connectedPlayers == will have connected players 
// the moment round starts we assign drawers 
// for the next round we will stroe this current drawer in an array alreadtMadeDrawers 
// next round starts 
// we will check the connectedPlayrs again get all the connected players 
// compare the connectedPlayers with alreadyMadeDrawers 
// eliminate playrs who hare in alreadyMadeDrawers 
// select next drawer from remaining once

//TASK - end round early if all have guessed correcctly     
