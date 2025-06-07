import { loadConversations, formatConversation } from "./src/conversations.js"

let conversations = loadConversations()

let index = process.argv[2]
if (index==null) console.error("Index not provided!")

console.log(formatConversation(conversations[(conversations.length-1)-index]))