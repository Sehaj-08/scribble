import {
    STROKE_EVENTS,
    GUESS_EVENTS,
    CHOOSE_WORD 
} from "../config/constants.js"

function strokeValidation(message){
    if(!Number.isInteger(message.strokeId)){
        console.log("stroke idf not an integer")
        return {
            valid: false,
            reason: "Stroke id should be a number"
        }
    }
    if(typeof message.x !== "number" || !Number.isFinite(message.x)){
        console.log("x coordinat eerror")
        return {
            valid: false,
            reason: "x coordinate not fucking found"
        }
    }
    if(typeof message.y !== "number" || !Number.isFinite(message.y)){
        console.log("y coordinat eerror")
        return {
            valid: false,
            reason: "y coordinate not fucking found"
        }
    }
    if (typeof message.newStroke !== "boolean") {
        console.log("new stroke error")
        return {
            valid: false,
            reason: "newStroke must be a boolean"
        }
    }

    if (message.x < 0 || message.x > 800) {
        console.log("x coordinat out of canvas")
        return {
            valid: false,
            reason: "x coordinate is outside canvas bounds"
        }
    }

    if (message.y < 0 || message.y > 600) {
        console.log("y coordinat is oputside of canvas")
        return {
            valid: false,
            reason: "y coordinate is outside canvas bounds"
        }
    }

    return {
        valid: true
    }
}

function guessValidation(message){
    const MAX_WORD_LENGTH = 14
    if(typeof message.text !== "string"){
        console.log("wordlength")
        return {
            valid: false,
            reason: "Guess can nly be a string nothing else bro"
        }
    }
    if (message.text.trim().length === 0) {
        console.log("length msg 0")
        return {
            valid: false,
            reason: "guess text cannot be empty"
        }
    }
    if(message.text.trim().length > MAX_WORD_LENGTH){
        console.log("exceed wordlengh")
        return {
            valid: false,
            reason: "Message is exceeding the max word limit"
        }
    }

    return {
        valid: true
    }
}

function wordValidation(message){
    
    if(!Number.isInteger(message.wordId)){
        console.log("word id not integer")
        return {
            valid: false,
            reason: "Word Id should be a number"
        }
    }
    return{
        valid: true
    }
}
export function validator(message){
    //Arrays aer technically objects in js so we also 
    if(!message || typeof message !== 'object' || Array.isArray(message)){
        console.log("m,sg is not an object")
        return {
            valid: false,
            reason: "Message not received ot is an object"
        }
    }

    if(!message.type || typeof message.type !== "string"){
        console.log("typoe of msg is not string")
        return {
            valid: false,
            reason: "no message type or its not string"
        }
    }

    switch (message.type){
        case STROKE_EVENTS.POINT:
            return strokeValidation(message)
            
        case GUESS_EVENTS.GUESS:
            return guessValidation(message)
            
        case CHOOSE_WORD.WORD:
            return wordValidation(message)
            
        default:
            console.log("deefault error")
            return {
                valid: false,
                reason : `Unknown message type ${message.type}`
        }

    }
    
}