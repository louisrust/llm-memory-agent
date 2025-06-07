// Script for generating memories about a user based on ChatGPT conversations.

import { loadConversations } from "./src/conversations.js"
import { loadMemories } from "./src/memories.js"
import { processConversations } from "./src/memoryBuilder.js"

// load memories from file
let memories = loadMemories()

// load conversations
let conversations = loadConversations()

let minIndex = 14
let maxIndex = 20
let skipIndexes = [0, 3, 12, 16, 17, 18]
processConversations(conversations, memories, minIndex, maxIndex, skipIndexes)