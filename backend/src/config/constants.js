//States of the room
const ROOM_STATES = {
    waiting : "WAITING",
    drawing : "DRAWING",
    round_ended : "ROUND_ENDED",
    choosing_words : "CHOOSING_WORD"    ,
    starting_new_round : "STARTING_NEW_ROUND"
}

const  DRAWER_LEFT = {
    DRAWER_LEFT_WAITING : 'drawer_left_waiting',
    DRAWER_LEFT_NEW_ROUND : "drawer_left_new_round"
}
//stroke events
const STROKE_EVENTS = {
    POINT : "stroke_point",
    END : "stroke_end"
}


const GUESS_EVENTS =  {    //checking the type of incoming req and matching with this
    GUESS : "guess"
}

const CHOOSE_WORD = {
    WORD : "choose_word"
}

const CURRENT_STATE_SNAPSHOT = {
    CURRENT_STATE_SNAPSHOT : "current_state_snapshot"
}

export {
    ROOM_STATES,
    STROKE_EVENTS,
    GUESS_EVENTS,
    CHOOSE_WORD,
    CURRENT_STATE_SNAPSHOT,
    DRAWER_LEFT
}