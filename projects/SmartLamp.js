// Unicode t0 HTML converter https://online-toolz.com/tools/unicode-html-entities-convertor.php

var utils = require("Utils");
var ledConnect = require('@amperka/led').connect;

var serial = getSerial();

// Общие настройки
var MQTT_DEVICE_TOPIC_RQ = 'smart-home-device-rq';
var MQTT_DEVICE_TOPIC_RS = 'smart-home-device-rs';
var MQTT_HEALTH_TOPIC_RQ = 'smart-home-health-check-rq';
var MQTT_HEALTH_TOPIC_RS = 'smart-home-health-check-rs';

// Настройки устройства
var DEVICE_TYPE = 'lamp';
var DEVICE_NAME = '&#1057;&#1074;&#1077;&#1090; &#1074; &#1075;&#1086;&#1089;&#1090;&#1080;&#1085;&#1086;&#1081;';  // Свет в гостиной

// Настройки подключения к WiFi
var WIFI_PSWD = 'i1111111';
var WIFI_SSID = 'Neffertum';

// Настройки подключения к брокеру
var MQTT_SRV_ADDRESS = '84.201.155.181';
var MQTT_OPTIONS = {
  keep_alive: 0,
  client_id: serial,
  clean_session: true,
};

var lamp = ledConnect(P9);

// Функции устройства
var methods = {
  turnOn: {
    name: '&#1042;&#1082;&#1083;&#1102;&#1095;&#1080;&#1090;&#1100;', // Включить
    arguments: [],
    condition: function() {
      return !lamp.isOn();
    },
    func: function() {
      lamp.turnOn();
    },
  },
  turnOff: {
    name: '&#1042;&#1099;&#1082;&#1083;&#1102;&#1095;&#1080;&#1090;&#1100;', // Выключить
    arguments: [],
    condition: function() {
      return lamp.isOn();
    },
    func: function() {
      lamp.turnOff();
    },
  },
};


var state = {
  isOn: {
    name: '&#1057;&#1086;&#1089;&#1090;&#1086;&#1103;&#1085;&#1080;&#1077;',  // Состояние
    value: function () {
      if (lamp.isOn()) {
        return '&#1042;&#1082;&#1083;&#1102;&#1095;&#1077;&#1085;&#1086;'; // Включено
      }
      return '&#1042;&#1099;&#1082;&#1083;&#1102;&#1095;&#1077;&#1085;&#1086;'; // Выключено
    }
  },
};


function getDeviceDescription() {
  return utils.getDeviceDescription(serial, DEVICE_TYPE, DEVICE_NAME, state, methods);
}


utils.setupWiFi(WIFI_SSID, WIFI_PSWD, function() {
  var client = utils.runMqttClient(
    MQTT_SRV_ADDRESS,
    MQTT_OPTIONS,
    function afterConnect(client) {
      client.subscribe(MQTT_DEVICE_TOPIC_RQ);
      client.subscribe(MQTT_HEALTH_TOPIC_RQ);
      utils.sendMessage(client, serial, MQTT_HEALTH_TOPIC_RS, getDeviceDescription());
    }
  );
  client.on('message', function (topic, msg) {
    var message = JSON.parse(msg);

    if (topic === MQTT_HEALTH_TOPIC_RQ) {
      utils.sendMessage(client, serial, MQTT_HEALTH_TOPIC_RS, getDeviceDescription());
    } else if (topic === MQTT_DEVICE_TOPIC_RQ) {
      if (message.to === serial) {
        methods[message.body.method].func();
        utils.sendMessage(client, serial, MQTT_DEVICE_TOPIC_RS, getDeviceDescription(), message.rquid);
      }
    }
  });
  client.connect();
});
