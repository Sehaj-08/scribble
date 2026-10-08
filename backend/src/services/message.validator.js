import {
    STROKE_EVENTS,
    GUESS_EVENTS,
    CHOOSE_WORD 
} from "../config/constants.js"

function strokeValidation(message){
    if(!Number.isInteger(message.strokeId)){
        return {
            valid: false,
            reason: "Stroke id should be a number"
        }
    }
    if(typeof message.x !== "number" || !Number.isFinite(message.x)){
        return {
            valid: false,
            reason: "x coordinate not fucking found"
        }
    }
    if(typeof message.y !== "number" || !Number.isFinite(message.y)){
        return {
            valid: false,
            reason: "y coordinate not fucking found"
        }
    }
    if (typeof message.newStroke !== "boolean") {
        return {
            valid: false,
            reason: "newStroke must be a boolean"
        }
    }

    if (message.x < 0 || message.x > 800) {
        return {
            valid: false,
            reason: "x coordinate is outside canvas bounds"
        }
    }

    if (message.y < 0 || message.y > 600) {
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
        return {
            valid: false,
            reason: "Guess can nly be a string nothing else bro"
        }
    }
    if (message.text.trim().length === 0) {
        return {
            valid: false,
            reason: "guess text cannot be empty"
        }
    }
    if(message.text.trim().length > MAX_WORD_LENGTH){
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
        return {
            valid: false,
            reason: "Message not received ot is an object"
        }
    }

    if(!message.type || typeof message.type !== "string"){
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
            return {
                valid: false,
                reason : `Unknown message type ${message.type}`
        }

    }
    
}