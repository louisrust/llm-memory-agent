// functions for running queries through LLMs.

import http from "http"

// return true if JSON can be parsed, false otherwise.
function isJSONValid(string) {
    try {
        JSON.parse(string)
        return true
    } catch (e) {
        return false
    }
}

// run query through ollama
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

// run query through Google API
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
                if (data.error) {
                    if (data.error.status=="RESOURCE_EXHAUSTED") {
                        console.log("Rate limit exceeded, retrying in 10s...")
                        setTimeout(() => {
                            runQueryRemote(query).then(resolve).catch(reject)
                        }, 10000)
                    } else {
                        console.error("Error returned from remote query:")
                        console.log(data)
                        reject(data)
                    }
                }
                if (data.candidates==null || data.candidates.length==0) {
                    reject(data)
                }
                resolve(data.candidates[0].content.parts[0].text)
            })
        })
    })
}

// send query to LLM
export function runQuery(query) {
    return runQueryRemote(query)
}