const _ = require('underscore')
const redis = require('redis')
const {promisify} = require('util')
const client = redis.createClient()
const getAsync = promisify(client.get).bind(client)
const setAsync = promisify(client.set).bind(client)
const saddAsync = promisify(client.sadd).bind(client)
const smembersAsync = promisify(client.smembers).bind(client)
const sismemberAsync = promisify(client.sismember).bind(client)
const hsetAsync = promisify(client.hset).bind(client)
const hgetAsync = promisify(client.hget).bind(client)
const hgetallAsync = promisify(client.hgetall).bind(client)

module.exports = {
    async begin(newHorizon) {
        await setAsync('new-horizon', newHorizon.toISOString())
        return new Date(await getAsync('horizon'))
    },
    async commit() {
        await setAsync('horizon', await getAsync('new-horizon'))
    },

    async notAlreadyDone(entryID) {
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
    }
}
