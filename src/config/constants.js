//States of the room
const ROOM_STATES = {
    waiting : "WAITING",
    drawing : "DRAWING",
    round_ended : "ROUND_ENDED",
    choosing_words : "CHOOSING_WORD"    
}

//stroke events
const STROKE_EVENTS = {
    POINT : "stroke_point",
    END : "stroke_end"
}


const GUESS_EVENTS =  {    //checkign the type of incoming req and matching with this
    GUESS : "guess"
}

const CHOOSE_WORD = {
    WORD : "choose_word"
}

export {
    ROOM_STATES,
    STROKE_EVENTS,
    GUESS_EVENTS,
    CHOOSE_WORD
}