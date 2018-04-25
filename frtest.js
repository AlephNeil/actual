var frontier = require('./junk/frontier')


async function main() {
    var newHorizon = new Date()
    newHorizon.setDate(newHorizon.getDate() + 1)

    var t = await frontier.begin(newHorizon)
    console.log(t.toISOString())
	await frontier.commit()
}

if (require.main === module) {
    main()
}
