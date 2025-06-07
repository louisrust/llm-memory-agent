export function promiseDelay(ms) {
    return new Promise((resolve,reject) => {
        setTimeout(() => {
            resolve()
        }, ms)
    })
}