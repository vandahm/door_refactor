const audit = require('./audit')
const SerialPort = require('serialport');
const datastore= require('./datastore');
//const MockBinding = require('@serialport/binding-mock');

// Decodes information from the arduino and keypad
function parseCommand(data) {
  return {
    keypad: data.slice(0,2), // R1 or R2
    door: data.slice(1,2), // 1 or 2, corresponding to the keypad
    command: data.slice(2,3), // C == keypress; T == tag read
    commandValue: data.slice(3) // keypad input or a derived tag number
  }
}

class SystemStatus {
  constructor() {
    // Time string from last status update
    this.lastStatusTime = "";

    // The state of each door. 1 == locked, 0 == unlocked
    this.doorState1 = 1;
    this.doorState2 = 1;
  }

  update(data) {
    if (data == undefined) {
      return;
    }
    this.doorState1 = data.slice(2,3);
    this.doorState2 = data.slice(3,4);
    if (data.length > 4) {
      this.lastStatusTime = data.slice(5);
    }
  }
}

// path = process.argv[2];
path = '/dev/ttyUSB0';

//SerialPort.Binding = MockBinding;
//MockBinding.createPort(path, { echo: true, record: true });

const port = new SerialPort(path, { baudRate: 9600, autoOpen: false });
var parser; //const parser = port.pipe(new SerialPort.parsers.Readline({ delimiter: '\r\n' }));
const status = new SystemStatus();
console.log('should expect port to open');

port.open(function(err) {
  if (err) {
    return audit.message('Port failed to open: ' + err.message);
  }
  console.log('port opened');
  setParserListener();
});

function setParserListener() {
  parser = port.pipe(new SerialPort.parsers.Readline({ delimiter: "\r\n" }));
  console.log('parser created');
  parser.on('data', function(data) {
  //parser = port.pipe(new SerialPort.parsers.Readline({ delimiter: "\r\n" }));
  audit.message("myPort: received " + data);

  let messageType = data.slice(0,2);
  if (messageType == 'ST') { status.update(); }

  var keypad = data.slice(0,2);  // R1 or R2
  var doorNumber = data.slice(1,2);    // 1 or 2, corresponding to the keypad
  var command = data.slice(2,3); // C == keypress; T == tag read
  var commandValue = data.slice(3);  // keypad input or derived tag number


  if (command == 'T') { datastore.getPriority(commandValue, doorNumber); }
});
}


module.exports.port = port;
module.exports.parser = parser;
module.exports.sendToSerial = function(data) {
  audit.message("sendToSerial: " + data);
  port.write(data + "\r\n");
}
