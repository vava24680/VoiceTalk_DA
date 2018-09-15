const request = require('request');
const getMAC = require('getmac');
const colors = require('colors');
const Q = require('q');
const configuration = require('../configuration/configuration.js');

// HTTP-URI with domain name resolved to IoTtalk server which will be used,
// if the port used by IoTtalk API is not standard port, make sure the custom port is provided.
const hostURL = "";

// Attributes that registration procedure needs
const deviceName = "";
const deviceModelName = ""; // Model name used on IoTtalk server
const userName = "yb";
const isSimulation = false;
const deviceFeatureList = [""];
const macAddress = ""; // macaddress of the server that this application run on
const body = {
  "profile": {
    "d_name": deviceName,
    "dm_name": deviceModelName,
    "u_name": userName,
    "is_sim": isSimulation,
    "df_list": deviceFeatureList
  }
};

function registerOnIoTtalk() {
  let qObject = Q.defer();
  let options = {};
  options.uri = hostURL + "/" + configuration.getMacAddress();
  options.method = "POST";
  options.body = body;
  options.json = true;
  request(options, (err, response, body) => {
    if(response.statusCode === 200) {
      console.log("Registration succeed".green);
      qObject.resolve();
    }
    else {
      console.log("Registration failed".red);
      qObject.reject({statusCode: response.statusCode, error: body});
    }
  });
  return qObject.promise;
}

function deRegisterOnIoTtalk() {
  let options = {};
  options.url = hostURL + "/" + macAddress;
  options.method = "DELETE";
  request(options, (err, response, body) => {
    if(response.statusCode === 200) {
      console.log("DeRegister Successfully".green);
    }
    else {
      console.log("Error Body :".red, body.red);
    }
  });
}

function postDataToIoTtalk(requestData, idf) {
  let options = {};
  options.url = hostURL + "/" + macAddress + "/" + idf;
  options.method = "PUT";
  options.json = true;
  options.body = {data: [ requestData ]};
  request(options, (err, response, body) => {
    if(!err && response.statusCode === 200) {
      console.log("No error when sending data to IoTtalk".green);
    }
    else {
      console.log("statusCode".red, response.statusCode.red);
      console.log("Error when sending data to IoTtalk".red);
      console.log(JSON.stringify(err).red);
    }
  });
}

module.exports.registerOnIoTtalk = registerOnIoTtalk;
module.exports.deRegisterOnIoTtalk = deRegisterOnIoTtalk;
module.exports.postDataToIoTtalk = postDataToIoTtalk;
