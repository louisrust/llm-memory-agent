// functions for dealing with conversation data from ChatGPT

import fs from "fs"

const conversationErrorPath = "./debug/conversation-error.json"
if (fs.existsSync(conversationErrorPath)) fs.unlinkSync(conversationErrorPath)

// load conversations from file and return as JSON
export function loadConversations() {
    return JSON.parse(fs.readFileSync("./data/conversations.json").toString())
}

// extracts main conversation as plain text from conversation tree
export function formatConversation(c) {
    let stringOut = ""

    let currentNodeID = c.current_node
    let rootFound = false
    while (!rootFound) {
        let currentNodeMapping = c.mapping[currentNodeID]
        if (currentNodeMapping.message == null || currentNodeMapping.parent==null) {
            rootFound = true
        } else {
            if (currentNodeMapping.message.content == null) {
                console.error("currentNodeMapping.message has invalid data", currentNodeMapping.message)
                fs.writeFileSync(conversationErrorPath, JSON.stringify(c))
            }
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
    }

    return stringOut
}