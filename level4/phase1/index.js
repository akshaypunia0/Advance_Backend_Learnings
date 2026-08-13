import dotenv from "dotenv"
dotenv.config()

import express, { text } from "express"
import { ChatGroq } from "@langchain/groq";
import { Annotation, MemorySaver, MessagesAnnotation, StateGraph, StateSchema } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { TavilySearch } from "@langchain/tavily";

const app = express()
const port = 5000

app.use(express.json())


const webSearchTool = new TavilySearch({
    maxResults: 5,
    topic: "general"
});

const checkPointer = new MemorySaver()


const tools = [webSearchTool]

const toolNode = new ToolNode(tools)


const llm = new ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    maxTokens: 100,
    maxRetries: 2
}).bindTools(tools)


const callLLM = async (state) => {

    console.log("state:", state);

    const response = await llm.invoke([
        {
            role: "system",
            content: `You are Jarvis AI assistant. You have a memory to store convertation data.
            
            Use convertation memory first to answer personal questions. 
            
            Only use tools when answer requires external real-time data information like: Weather, news, web search, stock prices etc. 
            
            Do not call tools for simple convertations, memory-based questions, greetings or personal context.`
        },
        ...state.messages
    ])

    return { messages: [response] }

}

const shouldContinue = async (state) => {

    const lastMessage = state.messages[state.messages.length - 1]

    if (lastMessage.tool_calls.length > 0) {
        return "tools"
    }
    else {
        return "__end__"
    }

}

const graph = new StateGraph(MessagesAnnotation)
    .addNode("agent", callLLM)
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    .addEdge("tools", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .compile({ checkPointer: checkPointer })




app.post("/ai", async (req, res) => {

    const { input } = req.body

    const response = await graph.invoke({
        messages: [
            {
                role: "user",
                content: input
            }
        ]
    },
        {
            configurable: { thread_id: "user123" }
        }
    )

    console.log("ai: ", response);


    return res.status(200).json({ ai: response.messages[response.messages.length - 1].content })

})


app.get("/", (req, res) => {
    return req.json({ message: "Hello from level 4" })
})

app.listen(port, () => {
    console.log(`Server started at port: ${port}`);
})