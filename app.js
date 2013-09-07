//*********__MODULE DEPENDENCIES__**************
var	express			= require('express'),
	filesystem		= require('fs'),
	http 			= require('http'),
	socket 			= require('socket.io')

clients = {}

//*********__CONFIGURATIONS__******************
var env 		= process.env.NODE_ENV || 'development',
	mongoose	= require('mongoose')

//*********__BOOTSTRAPPERS__*******************
//-//__Bootstrap mongoose and establish a connection
mongoose.connect('mongodb://localhost/yahooHack')

//-//__Express Stuff
var app = express();
var cookieParser = express.cookieParser('yahoo-hack')
require('./config/express')(app, cookieParser)

//-//__Socket.io Config
var server 	= http.createServer(app)
var io 		= socket.listen(server)

//-//__Bootstrap all the respective models
var models_path = __dirname + '/app/models'
filesystem.readdirSync(models_path).forEach(function (file) {
	require(models_path+'/'+file)
})

//-//__Router Config
require('./config/routes')(app, io)

//-//__Start the server
var port = process.env.PORT || 3000
server.listen(port)
console.log('listening on port '+port)

//EXPOSE APPLICATION
exports = module.exports = app