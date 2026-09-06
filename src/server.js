import {app} from "./app.js"
import "dotenv/config"

const port = process.env.PORT || 8000

app.get("/" , (req,res) => {
    res.send("yo yo")
})
app.listen(port , () => {
    console.log("Fuck you bitch")
})