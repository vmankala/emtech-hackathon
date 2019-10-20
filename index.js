var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var fs = require('fs');
var csvWriter = require('csv-write-stream')
var csvReader = require('csv-parser')

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
    console.log('a user connected');
    fs.createReadStream('sleepdata.csv')
        .pipe(csvReader())
        .on('data', (row) => {
            socket.emit("display", row.Start, row.End, row.Hours, row.Quality)
        })
        .on('end', () => {
            console.log('table updated');
        });
    socket.on('disconnect', function () {
        console.log('user disconnected');
    });
    socket.on('add', function (start, end, quality) {
        var writer = csvWriter({ sendHeaders: false })
        writer.pipe(fs.createWriteStream('sleepdata.csv', { flags: 'a' }))
        writer.write({ start: new Date(Date.parse(start)).getHours() / 24 + new Date(Date.parse(start)).getMinutes() / 1440, end: new Date(Date.parse(end)).getHours() / 24 + new Date(Date.parse(end)).getMinutes() / 1440, dur: (Date.parse(end) - Date.parse(start)) / 86400000, qual: parseFloat(quality) })
        writer.end()
        console.log("received entry [" + Date.parse(start) + "," + Date.parse(end) + "," + quality + "]");
    });
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});