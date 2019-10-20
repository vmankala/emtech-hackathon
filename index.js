var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var fs = require('fs');
var csvWriter = require('csv-write-stream')
var csvReader = require('csv-parser')
var synaptic = require('synaptic');
var Neuron = synaptic.Neuron,
    Layer = synaptic.Layer,
    Network = synaptic.Network,
    Trainer = synaptic.Trainer,
    Architect = synaptic.Architect;

function Perceptron(input, hidden, output) {
    var inputLayer = new Layer(input);
    var hiddenLayer = new Layer(hidden);
    var outputLayer = new Layer(output);

    inputLayer.project(hiddenLayer);
    hiddenLayer.project(outputLayer);

    this.set({
        input: inputLayer,
        hidden: [hiddenLayer],
        output: outputLayer
    });
}

// extend the prototype chain
Perceptron.prototype = new Network();
Perceptron.prototype.constructor = Perceptron;

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
    console.log('a user connected');
    socket.on('disconnect', function () {
        console.log('user disconnected');
    });
    var qualityNetwork = new Perceptron(3, 9, 1);
    var qualityTrainer = new Trainer(qualityNetwork);
    var qualityTrainSet = [];
    fs.createReadStream('sleepdata.csv')
        .pipe(csvReader())
        .on('data', (row) => {
            socket.emit("display", row.Start, row.End, row.Hours, row.Quality)
            qualityTrainSet.push({input: [row.Start, row.End, row.Hours], output: [row.Quality]});
        })
        .on('end', () => {
            console.log('table updated');
        });
    qualityTrainer.train(qualityTrainSet);
    socket.on('add', function (start, end, quality) {
        var writer = csvWriter({ sendHeaders: false })
        writer.pipe(fs.createWriteStream('sleepdata.csv', { flags: 'a' }))
        writer.write({ start: new Date(Date.parse(start)).getHours() / 24 + new Date(Date.parse(start)).getMinutes() / 1440, end: new Date(Date.parse(end)).getHours() / 24 + new Date(Date.parse(end)).getMinutes() / 1440, dur: (Date.parse(end) - Date.parse(start)) / 86400000, qual: parseFloat(quality) })
        writer.end()
        console.log("received entry [" + Date.parse(start) + "," + Date.parse(end) + "," + quality + "]");
    });
    socket.on('qualityPredict', function(start, end) {
        var predictPoint = qualityNetwork.activate([new Date(Date.parse(start)).getHours() / 24 + new Date(Date.parse(start)).getMinutes() / 1440, new Date(Date.parse(end)).getHours() / 24 + new Date(Date.parse(end)).getMinutes() / 1440, (Date.parse(end) - Date.parse(start)) / 86400000]);
        socket.broadcast.emit("qualityDisplay", predictPoint);
        console.log("printing quality prediction: " + predictPoint);
    });
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});