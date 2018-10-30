const request = require('request');
const colors = require('colors');
const Q = require('q');
const configuration = require('../configuration/configuration.js');
const DAI = require('../DAI.js');

// HTTP-URI with domain name resolved to IoTtalk server which will be used,
// if the port used by IoTtalk API is not standard port, make sure the custom port is provided.
const hostURL = "";

// Attributes that registration procedure needs
const deviceName = "";
const deviceModelName = ""; // Model name used on IoTtalk server
const userName = "yb";
const isSimulation = false;
const deviceFeatureList = [""];
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
  options.timeout = 2000;
  request(options, (err, response, body) => {
    if (err) {
      console.log("Error:".red, err.code.red);
      console.log( err.connect === true ? "Connection timeout".red : "Other timeout error".red );
      process.exit(0);
    }
    else if(response.statusCode == 200) {
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

function registerOnIoTtalkUsingPromise() {
  registerOnIoTtalk()
    .then(
      (response) => {
        console.log("Remember to configure the IoTtalkp part so the voice control can be available".green);
        return "SUCCESS";
      },
      (response) => {
        console.log("Status code:", response.statusCode.toString().red);
        console.log("Please check the error messages below and restart this application".red);
        console.log("----------------Error Messages----------------".red);
        console.log("* ".red + response.error.red);
        console.log("----------------------end---------------------".red);
        return "ERROR";
      }
    )
    .done((message) => {DAI.setResponseToGoogle(message)});
}

function deRegisterOnIoTtalk() {
  let options = {};
  options.url = hostURL + "/" + configuration.getMacAddress();
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

function postDataToIoTtalk(requestData) {
  let qObject = Q.defer();
  let options = {};
  options.url = hostURL + "/" + configuration.getMacAddress() + "/" + deviceFeatureList[0];
  options.method = "PUT";
  options.json = true;
  options.body = {data: [ requestData ]};
  options.timeout = 2000;
  request(options, (err, response, body) => {
    let msg = [];
    if (err) {
      console.log("Seems timeout".red);
      msg.push("ERROR");
      msg.push("There are problems with IoTtalk server");
    }
    else if( response.statusCode === 200 ) {
      console.log("Post data to IoTtalk succeed".green);
      msg.push("SUCCESS");
      msg.push("Success");
    }
    else {
      console.log("status code,".red, response.statusCode.red);
      console.log("Post data to IoTtalk failed".red);
      msg.push("OFFLINE");
      msg.push(body);
    }
    qObject.resolve(msg);
  });
  return qObject.promise;
}

function requestSync(uid) {
  let options = {
    uri: configuration.requestSyncEndpoint + configuration.smartHomeApiKey,
    method: 'POST',
    json: true,
    body: {
      agentUserId: uid
    },
  }
  request(options, (error, response, body) => {
    if (response.ststusCode == 200) {
      console.log('Request sync successfully'.green);
    } else {
      console.log('Request sync failed'.red);
    }
  });
}

module.exports.registerOnIoTtalk = registerOnIoTtalkUsingPromise;
module.exports.deRegisterOnIoTtalk = deRegisterOnIoTtalk;
module.exports.postDataToIoTtalk = postDataToIoTtalk;
module.exports.requestSync = requestSync;
