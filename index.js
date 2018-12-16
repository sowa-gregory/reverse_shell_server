const net = require("net");
const readline = require('readline');

const rl = readline.createInterface(
{
  input: process.stdin,
  output:process.stdout
});

var server = new net.Server();

var sessions = {};
var session_number = 1;
var current_session = 1;

Reset = "\x1b[0m"
Bright = "\x1b[1m"
Dim = "\x1b[2m"
Underscore = "\x1b[4m"
Blink = "\x1b[5m"
Reverse = "\x1b[7m"
Hidden = "\x1b[8m"

FgBlack = "\x1b[30m"
FgRed = "\x1b[31m"
FgGreen = "\x1b[32m"
FgYellow = "\x1b[33m"
FgBlue = "\x1b[34m"
FgMagenta = "\x1b[35m"
FgCyan = "\x1b[36m"
FgWhite = "\x1b[37m"




server.on("connection", function(socket) {
    
  console.log(socket.remoteAddress);
  var session = session_number;
  sessions[session_number++] = socket;

  printSessionPrefix(FgGreen, current_session);
  console.log(socket.remoteAddress+" "+socket.remotePort );
    
  printInputReady(session);
  socket.on("data", data => {
    receivedData(session, data);
  });
  socket.on("close", () => {
    connClosed(session);
  });
  socket.on("error", () => {
    connClosed(session);
  });
});

rl.on("line", (line)=>
{
  console.log("#"+line);
  printInputReady();
});

function printInputReady()
{
    printSessionPrefix( FgBlue, current_session);
    process.stdout.write( Bright );
}

function printSessionPrefix( color, session_number)
{
    process.stdout.write(color+"["+session_number.toString() + "]  ");
}

function receivedData(session_number, data) {
    printSessionPrefix(FgWhite, session_number);
    process.stdout.write( Bright+data.toString());
    printInputReady();
}

function connClosed(session_number) {
  var prefix = "[" + session_number.toString() + "]";
  console.log(prefix + "disconn");
}

server.listen(20000);
