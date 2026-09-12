import {Router} from "express"
import {create_room, join_room, get_current_room} from "../controllers/room.controllers.js"
const router = Router()

router.get("/rooms" , create_room) 
router.post("/join_rooms/:room_id" , join_room) 
router.get("/get_all_rooms/:current_room_id" , get_current_room) 
 
export default router