const http = require("http")
const fs = require("fs")
require("dotenv").config()

let memories = []

function createMemoryObject(memoryID, weight, decayRate, stepsAgo, memoryContent) {
    let memoryObject = {
        id: memoryID,
        weight: weight,
        decayRate: decayRate,
        stepsAgo: stepsAgo,
        content: memoryContent
    }

    return memoryObject
}

function getNextID() {
    // gets the max ID and returns that +1.
    // if a memory gets deleted, this function does not care.
    let max = 0;
    memories.forEach(memory => {
        if (memory.memoryID > max) {
            max = memory.memoryID
        }
    })

    return max+1
}

function isJSONValid(string) {
    try {
        JSON.parse(string)
        return true
    } catch (e) {
        return false
    }
}

const memoriesPath = "./data/memories.txt"
function loadMemories() {
    let savedMemories = fs.readFileSync(memoriesPath).toString()
    savedMemories.split("\n").forEach(line => {
        let tokens = line.split(" ")
        
        tokens.shift() // [ID:
        let memoryID = parseInt(tokens.shift().slice(0, -1))
        if (isNaN(memoryID)) throw new Error("Memory has invalid ID: " + line)
        
        tokens.shift() // [W: 
        let weight = parseFloat(tokens.shift().slice(0, -1))
        if (isNaN(weight)) throw new Error("Memory has invalid weight: " + line)
        
        tokens.shift() // [De: 
        let decayRate = parseFloat(tokens.shift().slice(0, -1))
        if (isNaN(decayRate)) throw new Error("Memory has invalid decay rate: " + line)
        
        tokens.shift() // [St: 
        let stepsAgo = parseInt(tokens.shift().slice(0, -1))
        if (isNaN(stepsAgo)) throw new Error("Memory has invalid steps ago value: " + line)

        let memoryContent = tokens.join(" ") // join remaining tokens
        if (memoryContent[memoryContent.length-1]=="\r") { // remove \r at end if found
            memoryContent = memoryContent.slice(0, -1)
        }

        // create memory object and add to internal database
        let memoryObject = createMemoryObject(memoryID, weight, decayRate, stepsAgo, memoryContent)
        memories.push(memoryObject)
    })
}

function formatMemories() {
    let stringOut = ""

    memories.forEach(memoryObject => {
        let {id, weight, decayRate, stepsAgo, content} = memoryObject
        let memoryString = `[ID: ${id}] [W: ${weight}] [De: ${decayRate}] [St: ${stepsAgo}] ${content}`
        stringOut += memoryString + "\n"
    })

    return stringOut
}

// #ADD
function addMemory(weight, decayRate, content) {
    let memoryObject = createMemoryObject(getNextID(), weight, decayRate, 1, content)
    memories.push(memoryObject)

    console.log(`Added memory with weight ${weight} and decay rate ${decayRate}: ${content}`)
}

// #BUMP
function bumpMemory(targetID, weightIncrement) {
    let memoryIndex = memories.findIndex(x => {
        return x.id == targetID
    })

    if (memoryIndex == -1) {
        console.log(`attempt to bump memory with id ${targetID} that does not exist`)
        return
    }

    memories[memoryIndex].weight += weightIncrement

    console.log(`Bumped memory with ID ${targetID} by ${weightIncrement}`)
}

// #UPDATE
function updateMemory(targetID, newContent) {
    let memoryIndex = memories.findIndex(x => {
        return x.id == targetID
    })

    if (memoryIndex == -1) {
        console.log(`attempt to update memory with id ${targetID} that does not exist`)
        return
    }

    memories[memoryIndex].content = newContent

    console.log(`Updated memory with ID ${targetID}: ${newContent}`)
}

// #DELETE
function deleteMemory(targetID) {
    let memoryIndex = memories.findIndex(x => {
        return x.id == targetID
    })

    if (memoryIndex == -1) {
        console.log(`attempt to update delete with id ${targetID} that does not exist`)
        return
    }

    delete memories[memoryIndex]

    console.log(`Deleted memory with ID ${targetID}`)
}

function runQueryLocal(query) {
    console.log("Running query...")

    return new Promise((resolve,reject) => {
        let responseString = ""

        const postData = JSON.stringify({
            "model": `hf.co/unsloth/gemma-3-4b-it-GGUF:Q4_K_M`,
            "prompt": query
        })

        const options = {
            hostname: "127.0.0.1",
            port: 11434,
            path: "/api/generate",
            method: "POST",
            headers: {
                "Content-type": "application/json",
                "Content-length": Buffer.byteLength(postData)
            }
        }

        const request = http.request(options, (res) => {
            res.setEncoding('utf8')

            let jsonPart = ""
            res.on('data', (chunk) => {
                jsonPart += chunk
                if (isJSONValid(jsonPart)) {
                    let data = JSON.parse(jsonPart)
                    responseString += data.response
                    jsonPart = ""
                    
                    process.stdout.write(data.response) // print while receiving
                }
            })

            res.on('end', () => {
                resolve(responseString)
            })
        })

        request.write(postData)
        request.end()
    })
}

function runQueryRemote(query) {
    const geminiModel = "gemma-3-27b-it"
    let url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${process.env.GEMINI_KEY}`

    return new Promise((resolve,reject) => {
        fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents:{
                    parts: [
                        { "text": query }
                    ]
                }
            })
        }).then(res => {
            res.json().then(data =>{
                resolve(data.candidates[0].content.parts[0].text)
            })
        })
    })
}

function runQuery(query) {
    return runQueryRemote(query)
}

const promptStart = fs.readFileSync("./prompt.txt").toString()
function buildPrompt(userPrompt) {
    let str = promptStart

    // add tailing whitespace if needed
    if (promptStart[promptStart.length-1].charCodeAt() != 10) { str += "\n" }

    str += "\n==== BEGIN MEMORIES\n"
    str += formatMemories()
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

function handleResponse(response) {
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

            addMemory(weightValue, decayRateValue, memoryContent)
        } else if (command == "#BUMP") {
            let idToken = tokens.shift()
            let memoryID = parseInt(idToken.slice(1, -1))

            let weightIncrementToken = tokens.shift()
            let weightIncrementValue = parseFloat(weightIncrementToken.slice(1, -1))

            bumpMemory(memoryID, weightIncrementValue)
        } else if (command == "#UPDATE") {
            let idToken = tokens.shift()
            let memoryID = parseInt(idToken.slice(1, -1))

            let newMemoryContent = tokens.join(" ")

            updateMemory(memoryID, newMemoryContent)
        } else if (command == "#DELETE") {
            let idToken = tokens.shift()
            let memoryID = parseInt(idToken.slice(1, -1))

            deleteMemory(memoryID)
        }
    })
}

function loadConversations() {
    return JSON.parse(fs.readFileSync("./data/conversations.json").toString())
}
function formatConversation(c) {
    let stringOut = ""

    let currentNodeID = c.current_node
    let rootFound = false
    while (!rootFound) {
        let currentNodeMapping = c.mapping[currentNodeID]
        let content = currentNodeMapping.message.content
        let author = currentNodeMapping.message.author.role

        if (content.content_type == "text" && author.toUpperCase!="SYSTEM") {
            let message = currentNodeMapping.message.content.parts.join("")
            
            if (message.length > 0) { // ignore empty messages
                stringOut = `\n=== ${author.toUpperCase()}\n${message}\n${stringOut}`
            }
        }
        
        currentNodeID = currentNodeMapping.parent
        if (currentNodeID == "client-created-root") {
            rootFound = true
        }
    }

    return stringOut
}

// load memories from file
loadMemories()

// load conversations
let conversations = loadConversations()
let conversationFormatted = formatConversation(conversations[1])

// build prompt
let agentPrompt = buildPrompt(conversationFormatted)
// console.log(agentPrompt)

// run query
runQuery(agentPrompt).then(handleResponse)