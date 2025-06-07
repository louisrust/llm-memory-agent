// functions for building memories from ChatGPT conversations
// @ts-check
import fs from "fs"
import { formatMemories, addMemory, bumpMemory, updateMemory, deleteMemory, stepMemories, decayMemories, flushMemories } from "./memories.js"
import { runQuery } from "./llm.js"
import { promiseDelay } from "./functions.js"
import { formatConversation } from "./conversations.js"

const promptStart = fs.readFileSync("./prompt.txt").toString()
function buildPrompt(memories, userPrompt) {
    let str = promptStart

    // add tailing whitespace if needed
    if (promptStart[promptStart.length-1].charCodeAt() != 10) { str += "\n" }

    str += "\n==== BEGIN MEMORIES\n"
    str += formatMemories(memories)
    str += "==== END MEMORIES\n\n"

    str += "==== BEGIN USER CONVERSATION"
    str += userPrompt
    if (userPrompt[userPrompt.length-1].charCodeAt() != 10) { str += "\n" }
    str += "\n==== END USER CONVERSATION\n"

    if (fs.existsSync("./debug/prompt-last.txt")) {
        fs.writeFileSync("./debug/prompt-last.txt", str)
    }

    return str
}

function handleResponse(memories, response) {
    console.log(response)

    response.split("\n").forEach(line => {
        let tokens = line.split(" ")
        let command = tokens.shift()

        if (command == "#ADD") {
            let weightToken = tokens.shift()
            let weightValue = parseFloat(weightToken.slice(1, -1))

            let decayRateToken = tokens.shift()
            let decayRateValue = parseFloat(decayRateToken.slice(1, -1))

            let memoryContent = tokens.join(" ")

            addMemory(memories, weightValue, decayRateValue, memoryContent)
        } else if (command == "#BUMP") {
            let idToken = tokens.shift()
            let memoryID = parseInt(idToken.slice(1, -1))

            let weightIncrementToken = tokens.shift()
            let weightIncrementValue = parseFloat(weightIncrementToken.slice(1, -1))

            bumpMemory(memories, memoryID, weightIncrementValue)
        } else if (command == "#UPDATE") {
            let idToken = tokens.shift()
            let memoryID = parseInt(idToken.slice(1, -1))

            let newMemoryContent = tokens.join(" ")

            updateMemory(memories, memoryID, newMemoryContent)
        } else if (command == "#DELETE") {
            let idToken = tokens.shift()
            let memoryID = parseInt(idToken.slice(1, -1))

            deleteMemory(memories, memoryID)
        }
    })
}

function buildMemories(memories, conversationFormatted) {
    return new Promise((resolve,reject) => {
        console.log(conversationFormatted)

        // step memories
        stepMemories(memories)

        // decay memories
        decayMemories(memories)

        // generate prompt
        let agentPrompt = buildPrompt(memories, conversationFormatted)

        // run query
        runQuery(agentPrompt).then((response) => {
            handleResponse(memories, response)
            console.log(formatMemories(memories))
            resolve()
        })
    })
}

export async function processConversations(conversations, memories, minIndex, maxIndex, skipIndexes) {
    let conversationIndex = minIndex
    while (conversationIndex <= maxIndex) {
        if (skipIndexes.includes(conversationIndex)) {
            console.log("Skipping conversation with index", conversationIndex)
        } else {
            let conversationFormatted = formatConversation(conversations[(conversations.length-1) - conversationIndex])
            await buildMemories(memories, conversationFormatted)
            flushMemories(memories)
        }
        console.log("processed conversation", conversationIndex)

        conversationIndex++
        await promiseDelay(4000)
    }
}