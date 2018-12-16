const moduleNet = require("net");
const moduleReadLine = require("readline");

/**
 * TODO:
 * Split server logic from displaying and colouring incoming messages. Dedicated class will be used for view.
 */

/**
 *  Class, which provides multisession shell server functionality.
 */
class ShellServer {
  /**
   * Class constructor
   * @param {integer} port - number of port to listen connection on
   */
  constructor(port) {
    this.readLine = moduleReadLine.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    /* dictionary containing all connected sessions identifiers */
    this.sessionsDict = {};

    /* server object */
    this.server = new moduleNet.Server();

    // number of all connected sessions (might already be disconnected)
    // each connected session has its own unique identifier
    this.maxSessionNumber = 1;

    // number of session to which commands from input line will be send
    this.activeSession = 0;

    this.server.on("connection", socket => this.onNewConnection(socket));
    this.readLine.on("line", line => this.onReadLine.call(this, line));

    this.server.listen(port);
    writeln(FgWhite + "Reverse Shell Server v1.1 - listening on port:" + port);
    writeln(
      "CmdLine - enter:\n@ - to list all connected sessions\n@n - to switch to session number\n@exit - to exit\n"
    );
    this.printInputReady();
  }

  /**
   *
   * @param {Socket} socket
   */
  onNewConnection(socket) {
    write(socket.remoteAddress);
    const sessionId = this.maxSessionNumber++;
    this.sessionsDict[sessionId] = socket;

    this.printSessionPrefix(FgGreen, sessionId);
    writeln(socket.remoteAddress + " " + socket.remotePort);

    // if no active sessions - connected session becomes active session_id
    if (this.activeSession == 0) this.activeSession = sessionId;

    socket.on("data", data => this.onReceivedData(sessionId, data));
    socket.on("close", () => this.onConnectionClosed(sessionId));
    socket.on("error", () => this.onConnectionError(sessionId));
  }

  /**
   *  Prints input ready mark containing active session id.
   */
  printInputReady() {
    this.printSessionPrefix(FgBlue, this.activeSession);
  }

  /**
   *
   * @param {string} line
   */
  onReadLine(line) {
    if (line === "@exit") {
      write(RESET);
      process.exit(0);
    }

    // no active sessions -> not necessary to interpret session listing and switching commands
    if (this.activeSession == 0) {
      this.printInputReady();
      return;
    }

    // no special command in input line
    if (!line.startsWith("@")) {
      this.sessionsDict[this.activeSession].write(line);
      return;
    }

    if (line === "@") {
      // list all sessions
      const sessionKeys = Object.keys(this.sessionsDict);
      write("Existing sessions:");
      sessionKeys.forEach(key => {
        write("[" + key + "]");
      });
      writeln();
    } else {
      // special command - starts with @ provided in input line
      const tempId = parseInt(line.substr(1));
      if (isNaN(tempId)) writeln("Invalid session number");
      else if (tempId in this.sessionsDict) this.activeSession = tempId;
      else writeln("No session number:" + tempId + " exists");
    }
    this.printInputReady();
  }

  /**
   * Print
   * @param {string} color
   * @param {integer} sessionId
   */
  printSessionPrefix(color, sessionId) {
    if (sessionId == 0) write(color + "[-no-sessions-] ");
    else write(color + "[" + sessionId.toString() + "] ");
  }
  /**
   * Called on socket received data
   * @param {integer} sessionId
   * @param {Buffer} data
   */
  onReceivedData(sessionId, data) {
    const lines = data.toString().split("\n");
    for (let index = 0; index < lines.length; index++) {
      this.printSessionPrefix(FgYellow, sessionId);
      // lines contains '\r' char inside - caret return, which might cause side effects
      process.stdout.write(lines[index].replace("\r", "") + "\n");
    }
    this.printInputReady();
  }

  /**
   *
   * @param {integer} sessionId
   */
  onConnectionError(sessionId) {
    if (sessionId == undefined) throw new Error("sessionId is undefined");
    writeln();
    this.printSessionPrefix(FgRed, sessionId);
    writeln("session error");
  }

  /**
   * Socket connection close event handler.
   * @param {*} sessionId
   */
  onConnectionClosed(sessionId) {
    this.printSessionPrefix(FgRed, sessionId);
    process.stdout.write("session disconnected\n");
    delete this.sessionsDict[sessionId];
    this.activeSession = this.findNextSession(sessionId);
    this.printInputReady();
  }
  /**
   *
   * @param {*} sessionId
   * @return {Integer}
   */
  findNextSession(sessionId) {
    if (sessionId == undefined) throw new Error("sessionId is undefined");

    // no more existing sessions
    if (Object.keys(this.sessionsDict).length == 0) return 0;

    // try to find next larger session number, than currently active
    for (let i = sessionId; i < this.maxSessionNumber; i++)
      if (i in this.sessionsDict) return i;

    // try to find available session_id
    for (let i = 1; i < sessionId; i++) if (i in this.sessionsDict) return i;

    throw new Error("sth went wrong");
  }
}

const RESET = "\x1b[0m";
const FgRed = "\x1b[31m";
const FgGreen = "\x1b[32m";
const FgYellow = "\x1b[33m";
const FgBlue = "\x1b[34m";
const FgWhite = "\x1b[37m";

/**
 *
 * @param {string} msg
 */
function write(msg) {
  process.stdout.write(msg);
}

/**
 *
 * @param {string} msg
 */
function writeln(msg) {
  process.stdout.write(msg + "\n");
}

const port = 10000;
new ShellServer(port);
