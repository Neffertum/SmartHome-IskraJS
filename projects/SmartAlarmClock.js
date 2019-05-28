// Unicode t0 HTML converter https://online-toolz.com/tools/unicode-html-entities-convertor.php

var utils = require("Utils");
var buzzerConnect = require('@amperka/buzzer').connect;

var serial = getSerial();

// Общие настройки
var MQTT_DEVICE_TOPIC_RQ = 'smart-home-device-rq';
var MQTT_DEVICE_TOPIC_RS = 'smart-home-device-rs';
var MQTT_HEALTH_TOPIC_RQ = 'smart-home-health-check-rq';
var MQTT_HEALTH_TOPIC_RS = 'smart-home-health-check-rs';

// Настройки устройства
var DEVICE_TYPE = 'alarm-clock';
var DEVICE_NAME = '&#1041;&#1091;&#1076;&#1080;&#1083;&#1100;&#1085;&#1080;&#1082;';  // Будильник

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

var time = null;
var timeout = null;
var buzzer = buzzerConnect(P3);

// Состояние устройства
var state = {
  isOn: {
    name: '&#1057;&#1086;&#1089;&#1090;&#1086;&#1103;&#1085;&#1080;&#1077;',  // Состояние
    value: function () {
      if (timeout) {
        return '&#1042;&#1082;&#1083;&#1102;&#1095;&#1077;&#1085;'; // Включен
      }
      return '&#1042;&#1099;&#1082;&#1083;&#1102;&#1095;&#1077;&#1085;'; // Выключен
    }
  },
  time: {
    name: '&#1042;&#1088;&#1077;&#1084;&#1103;',  // Время
    value: function () {
      if (timeout) {
        return time;
      }
      return '&#1042;&#1099;&#1082;&#1083;&#1102;&#1095;&#1077;&#1085;'; // Выключен
    }
  }
};

// Функции устройства
var methods = {
  turnOn: {
    name: '&#1042;&#1082;&#1083;&#1102;&#1095;&#1080;&#1090;&#1100;', // Включить
    arguments: [{
      name: '&#1042;&#1088;&#1077;&#1084;&#1103;', // Время
      type: 'datetime',
    }],
    condition: function() {
      return !timeout;
    },
    func: function(args) {
      time = args.time;
      timeout = setTimeout(function () {
        buzzer.beep(0.5, 0.5);
        setTimeout(function () {
          time = null;
          timeout = null;
          buzzer.turnOff();
        }, 10000);
      }, args.timeout);
    },
  },
  turnOff: {
    name: '&#1042;&#1099;&#1082;&#1083;&#1102;&#1095;&#1080;&#1090;&#1100;', // Выключить
    arguments: [],
    condition: function() {
      return !!timeout;
    },
    func: function() {
      clearTimeout(timeout);
      time = null;
      timeout = null;
      buzzer.turnOff();
    },
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
        methods[message.body.method].func(message.body.arguments);
        utils.sendMessage(client, serial, MQTT_DEVICE_TOPIC_RS, getDeviceDescription(), message.rquid);
      }
    }
  });
  client.connect();
});
