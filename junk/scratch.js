
var trial = 'alpha abd\nbeta acd\ngamma\nacd delta\nepsilonabd'

var match
var ptrn = /a[bc]d$/igm

while (match = ptrn.exec(trial)) {
	console.log(match)
}
