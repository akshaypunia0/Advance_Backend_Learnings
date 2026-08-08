import express from "express"
import dotenv from "dotenv"
import Redis from "ioredis"
import connectDb from "./lib/db.js"
import User from "./model/user.model.js"
import rateLimiter from "./middleware/rateLimit.js"
dotenv.config()

const port  = process.env.PORT || 5000

const app = express()
export const redis = new Redis(process.env.REDIS_URL)

app.use(express.json())

app.get("/", (req, res) => {
    return res.status(200).json({message: "hello from redis phase 1"})
})

app.post("/create", async (req, res) => {

    await redis.del("user:all")
    const { name, email, password } = req.body

    const user = await User.create({
        name,
        email,
        password
    })

    return res.json(user)
})

app.get("/getUser", rateLimiter, async (req, res) => {
    
    const users = await User.find({})

    return res.json(users)
})

app.get("/get-with-redis", rateLimiter, async(req, res) => {
    const cashed = await redis.get("user:all")

    if(cashed){
        const data = JSON.parse(cashed)
        return res.json(data)
    }
    
    const users = await User.find({})

    await redis.set("user:all", JSON.stringify(users))

    return res.json(users)
})

app.post("/send-otp", async(req, res) => {
    const { email } = req.body

    const otp = Math.floor(100000 + Math.random()*900000).toString()

    await redis.set(`otp:${email}`, otp, "EX", 30)

    return res.json(otp)

})

app.post("/verify-otp", async(req, res) => {
    const { email, otp } = req.body

    const redis_otp = await redis.get(`otp:${email}`)

    if (!redis_otp){
        return res.status(400).json({message: "OTP not found or expired"})
    }

    if (otp != redis_otp) {
        return res.status(400).json({message: "OTP incorrect"})
    }

    await redis.del(`otp:${email}`)

    return res.status(200).json({message: "OTP verified"})
})

app.listen(port, () => {
    connectDb()
    console.log(`Server running on port: ${port}`);
    
})