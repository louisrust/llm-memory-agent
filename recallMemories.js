// Script to recall memories from storage to be provided to an LLM

import fs from "fs"
import { formatMemories, formatMemoriesSimple, loadMemories } from "./src/memories.js"
import { runQuery } from "./src/llm.js"
import { isJSONValid } from "./src/functions.js"

let memories = loadMemories()

// generate prompt for LLM
const promptStart = fs.readFileSync("./prompts/prompt-memoryRecall.txt").toString()
function buildPrompt(memories, userPrompt) {
    let str = promptStart

    // add tailing whitespace if needed
    if (promptStart[promptStart.length-1].charCodeAt() != 10) { str += "\n" }

    str += "\n==== BEGIN USER MEMORIES\n"
    str += formatMemories(memories)
    str += "==== END USER MEMORIES\n\n"

    str += "==== BEGIN USER PROMPT\n"
    str += userPrompt
    if (userPrompt[userPrompt.length-1].charCodeAt() != 10) { str += "\n" }
    str += "==== END USER PROMPT"

    return str
}

function getMemoriesForPrompt(memories, prompt) {
    let agentPrompt = buildPrompt(memories, prompt)

    runQuery(agentPrompt).then((response) => {
        if (!isJSONValid(response)) {
            console.error("Invalid response from LLM:")
            console.log(response)
        } else {
            console.log(response)

            let ids = JSON.parse(response)
            let relevantMemories = memories.filter(x => {
                return ids.includes(x.id)
            })

            console.log(formatMemoriesSimple(relevantMemories))
        }
    })
}

let testPrompt = "I'm studying for my test on Javascript and I'm a bit confused on how references work. Can you help me?"
getMemoriesForPrompt(memories, testPrompt)