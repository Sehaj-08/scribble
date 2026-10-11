import {Router} from "express"
import {create_room, join_room, get_current_room} from "../controllers/room.controllers.js"
const router = Router()

router.post("/rooms" , create_room) 
router.post("/join_rooms/:room_id" , join_room) 
// router.get("/get_all_rooms/" , get_current_room) //can leak all rooms states 
 
export default router