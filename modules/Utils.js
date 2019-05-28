var mqtt = require("MQTT");
var wifiLib = require('@amperka/wifi');

var TO_SMART_SERVER = 'smart-server';

function checkError(prefix, err) {
  if (err) {
    console.log(prefix + ':', err);
    return 1;
  }
  return 0;
};

function runMqttClient(srvAddress, options, afterConnect) {
  var client = mqtt.create(srvAddress, options);
  client.on('connected', function() {
    console.log('MQTT Connected');
    if (afterConnect) {
      afterConnect(client);
    }
  });

  client.on('error', function(error) {
    console.log('MQTT Error:', error);
  });

  client.on('close', function() {
    console.log('MQTT Connection Closed');
  });

  client.on('disconnected', function() {
    console.log("MQTT disconnected... reconnecting.");
    setTimeout(client.connect.bind(client), 500);
  });

  return client;
};

function setupWiFi(ssid, pass, callback) {
  PrimarySerial.setup(115200);
  var wifi = wifiLib.setup(PrimarySerial, function (err) {
    if (checkError('WiFi Setup error', err)) return;

    wifi.connect(ssid, pass, function(err) {
      if (checkError('WiFi Connection error', err)) return;
      console.log('WiFi Connected');
      callback();
    });
  });
};

function sendMessage(client, from, topic, body, rquid) {
  var message = {
    to: TO_SMART_SERVER,
    from: from,
    body: body,
  };

  if (rquid) {
    message.rquid = rquid;
  }

  client.publish(topic, JSON.stringify(message));
}

function getDeviceDescription(id, type, name, state, methods) {
  var currentState = Object.keys(state).map(function (key) {
    return {
      id: key,
      name: state[key].name,
      value: state[key].value(),
    };
  });

  var currentMethods = Object.keys(methods)
    .filter(function (key) {
      return methods[key].condition();
    })
    .map(function (key) {
      return {
        id: key,
        name: methods[key].name,
        arguments: methods[key].arguments,
      };
  });

  return {
    id: id,
    type: type,
    name: name,
    state: currentState,
    methods: currentMethods,
  };
}

module.exports = {
  setupWiFi: setupWiFi,
  checkError: checkError,
  sendMessage: sendMessage,
  runMqttClient: runMqttClient,
  getDeviceDescription: getDeviceDescription,
};
