export function promiseDelay(ms) {
    return new Promise((resolve,reject) => {
        setTimeout(() => {
            resolve()
        }, ms)
    })
}

// return true if JSON can be parsed, false otherwise.
export function isJSONValid(string) {
    try {
        JSON.parse(string)
        return true
    } catch (e) {
        return false
    }
}