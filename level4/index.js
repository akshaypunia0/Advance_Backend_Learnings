import dotenv from "dotenv"
dotenv.config()

import express, { text } from "express"
import { ChatGroq } from "@langchain/groq";

const app = express()
const port = 5000

app.use(express.json())

const llm = new ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    maxTokens: 100,
    maxRetries: 2
})

app.post("/ai", async (req, res) => {

    const { input } = req.body

    const response = await llm.invoke([
        {
            role: "system",
            content: ""
        }
    ])

    return res.status(200).json({ Output: response.content })

})


app.get("/", (req, res) => {
    return req.json({ message: "Hello from level 4" })
})

app.listen(port, () => {
    console.log(`Server started at port: ${port}`);
})