//States of the room
const ROOM_STATES = {
    waiting : "WAITING",
    drawing : "DRAWING",
    round_ended : "ROUND_ENDED"
}

//stroke events
const STROKE_EVENTS = {
    POINT : "stroke_point",
    END : "stroke_end"
}


const GUESS_EVENTS =  {    //checkign the type of incoming req and matching with this
    GUESS : "guess"
}


export {
    ROOM_STATES,
    STROKE_EVENTS,
    GUESS_EVENTS
}