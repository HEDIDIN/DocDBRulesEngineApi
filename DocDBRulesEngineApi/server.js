


var http = require("http");
var port = process.env.port || 1337;

var bodyParser = require("body-parser");

var baseHost = process.env.WEBSITE_HOSTNAME || "localhost";
var express = require("express");

var app = express();
var jsonParser = bodyParser.json();

var vm = require("vm");

var server = http.createServer(app);
var swaggerize = require('swaggerize-express');
var path = require('path');


app.use(bodyParser.json());

app.use(swaggerize({
    api: require('./api.json'),
    docspath: '/swagger',
    handlers: path.resolve( './handlers')
}));

app.get('/ apiapp.json', function (req, res) {
    
    res.json(window.apiapp);
});

app.get('/', function (req, res) {
    
    res.setHeader('Content-Type', 'text / plain; charset = utf-8');
    res.end('Hello World.');
});


server.listen(port, 'localhost', function () {
    app.swagger.api.host = server.address().address + ':' + server.address().port;
    console.log("Server started ..");
});