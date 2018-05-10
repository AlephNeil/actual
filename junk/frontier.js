const _ = require('underscore')
const {promisify} = require('util')
const redis = require('redis')
const client = redis.createClient()
const getAsync = promisify(client.get).bind(client)
const setAsync = promisify(client.set).bind(client)
const saddAsync = promisify(client.sadd).bind(client)
const sremAsync = promisify(client.srem).bind(client)
const smembersAsync = promisify(client.smembers).bind(client)
const sismemberAsync = promisify(client.sismember).bind(client)
const hsetAsync = promisify(client.hset).bind(client)
const hgetAsync = promisify(client.hget).bind(client)
const hgetallAsync = promisify(client.hgetall).bind(client)

async function deleteWhere(setName, p) {
    var deletions = 0
    var members = await smembersAsync(setName)
    await Promise.all(members.map(async (k) => {
        if (!p(k)) return
        await sremAsync(setName, k)
        deletions++
    }))
    return deletions
}

module.exports = {
    async begin(newHorizon) {
        await setAsync('new-horizon', newHorizon.toISOString())
        return new Date(await getAsync('horizon'))
    },
    async commit() {
        await setAsync('horizon', await getAsync('new-horizon'))
    },

    async notAlreadyDone(entryID) {
        // var b = !(await sismemberAsync('thelist', entryID)) 
        // console.log(`notAlreadyDone: entryID = ${entryID} and b = ${b}`)
        return !(await sismemberAsync('thelist', entryID))
    },
    async markAsDone(entryID) {
        await saddAsync('thelist', entryID)
    },

    async registerCalendar(obj) {
        await hsetAsync('thenest', obj.name, JSON.stringify(obj))
    },
    async getCalendars() {
        var h = await hgetallAsync('thenest')
        return _.mapObject(h, val => JSON.parse(val))
    },

    async deletePastEntries(timestamp) {
        return await deleteWhere('thelist', k => {
            try {
                var [e, t] = JSON.parse(k)
                return t.getTime() + 60*1000 < timestamp.getTime()
            }
            catch (err) {
                return false
            }
        })
    }
}

if (require.main === module) {
    deleteWhere('thelist', k => {
        try {
            var [e, t] = JSON.parse(k)
            return false
        }
        catch (err) {
            return true
        }
    })
}
