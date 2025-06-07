import fs from "fs"

const memoriesPath = "./data/memories.txt"

export function flushMemories(memories) {
    fs.writeFileSync(memoriesPath, formatMemories(memories))
}

// create a memory object and return it
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

// load memories from text file - returns memories as JSON
export function loadMemories() {
    let memories = []

    let savedMemories = fs.readFileSync(memoriesPath).toString()
    savedMemories.split("\n").forEach(line => {
        let tokens = line.split(" ")
        if (tokens.length<2) return // something wrong with this line (most likely empty)
        
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

    return memories
}

// converts memory object to text format for LLM
export function formatMemories(memories) {
    let stringOut = ""

    memories.forEach(memoryObject => {
        let {id, weight, decayRate, stepsAgo, content} = memoryObject
        let memoryString = `[ID: ${id}] [W: ${weight}] [De: ${decayRate}] [St: ${stepsAgo}] ${content}`
        stringOut += memoryString + "\n"
    })

    return stringOut
}

// gets the max ID and returns that +1.
// if a memory gets deleted, this function does not care.
function getNextID(memories) {
    let max = 0;
    memories.forEach(memory => {
        if (memory.id > max) {
            max = memory.id
        }
    })

    return max+1
}

// functions for commands from LLM - ADD, BUMP, UPDATE, DELETE (unused)
// #ADD
export function addMemory(memories, weight, decayRate, content) {
    let memoryObject = createMemoryObject(getNextID(memories), weight, decayRate, 1, content)
    memories.push(memoryObject)

    console.log(`Added memory with weight ${weight} and decay rate ${decayRate}: ${content}`)
}

// #BUMP
export function bumpMemory(memories, targetID, weightIncrement) {
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
export function updateMemory(memories, targetID, newContent) {
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
export function deleteMemory(memories, targetID) {
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

// increase stepCount by 1 for all memories
export function stepMemories(memories) {
    for (let i=0; i<memories.length; i++) {
        memories[i].stepsAgo += 1
    }
}

// decay all memories by respective decayRate
export function decayMemories(memories) {
    for (let i=0; i<memories.length; i++) {
        let m = memories[i]
        m.weight -= m.decayRate // apply decay
        // round weight
        m.weight = Math.round(m.weight * 100) / 100

        // if weight has fallen below 0, delete it
        if (m.weight < 0) {
            console.log("Deleting memory: ", m)
            delete memories[i]
        }
    }
}