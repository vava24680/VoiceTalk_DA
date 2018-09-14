const colors = require('colors');
const configuration = require('./configuration/configuration.js');
const dataStore = require('./data/data.js');
const DAN = require('./DAN/DAN.js');
const authProvider = require('./oauth2/oauth2.js');

let _repostToGoogle = "SUCCESS";

function DAI(app) {
  console.log("smarthome app registerAgent");
  app.get('/labdevices', (request, response) => {
    console.log(dataStore.getDevices());
    response.status(200).render('devices', {devices: dataStore.getDevices()});
  });
  app.get('/labdevicesinjson', (request, response) => {
    response.status(200).json( {devices: dataStore.labDevices} );
  })

  app.post('/smarthome', (request, response) => {
    let requestData = request.body;

    let accessToken = authProvider.getAccessTokenFromHeader(request);
    console.log("accessToken, ", accessToken);
    let uid = dataStore.authorizationData.tokens[accessToken].uid;
    if (!requestData.inputs) {
      response.status(401).set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }).json({"error": "missing inputs"});
    }
    console.log("Payload sent by Google Assistant".green);
    console.log(JSON.stringify(requestData).green);
    for(let i = 0; i < requestData.inputs.length; i++) {
      let inputData = requestData.inputs[i];
      let intent = inputData.intent;
      if(!intent){
        response.status(401).set({
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }).json({"error": "missing inputs"});
        continue;
      }

      switch(intent) {
        case "action.devices.SYNC":
          console.log("This is a SYNC request".green);
          sync({
            requestId: requestData.requestId
          }, response, uid);
          break;
        case "action.devices.QUERY":
          console.log("This is a QUERY request".green);
          query({
            requestId: requestData.requestId
          }, response);
          /*
          query({
            uid: uid,
            auth: authToken,
            requestId: requestData.requestId,
            devices: requestData.inputsData.payload.devices
          }, response);
          */
          break;
        case "action.devices.EXECUTE":
          console.log("This is a EXECUTE request".green);
          if (configuration.isIoTtalkUsing) {
            DAN.postDataToIoTtalk(inputData, "GoogleSmarthomeJsonReceiver");
          }
          exec({
            requestId: requestData.requestId,
            commands: inputData.payload.commands
          }, response);
          break;
        case "action.devices.DISCONNECT":
          console.log("This is a DISCONNECT request".green);
          disconnect(response);
        break;
      }
    }
  });

  /**
   * @param data:
   * {
   *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf"
   * }
   *
   */
  function sync(data, response, uid){
    console.log("Inside sync function body".green);
    let responseBody = {};
    responseBody.requestId = data.requestId;
    responseBody.payload = {};
    responseBody.payload.agentUserId = uid; // This value need to be filled
    responseBody.payload.devices = dataStore.labDevices;
    console.log(JSON.stringify(responseBody).green);
    response.status(200).json(responseBody);
  }

  /**
   * @param data
   * {
   *   "reuestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
   *   "uid": "0001",
   *   "auth": "bearer xxx",
   *   "devices": [{
   *     "id": "123",
   *     "customData": {
   *       "fooValue": 74,
   *       "barValue": true,
   *       "bazValue": "foo"
   *     }
   *   },{
   *     "id": "456",
   *     "customData": {
   *       "fooValue": 12,
   *       "barValue": false,
   *       "bazValue": "bar"
   *     }
   *   }]
   * }
   * @param response
   * @return {{}}
   * {
   *   "reuestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
   *   "payload": {
   *     "devices": {
   *       "123": {
   *         "on": true,
   *         "online": true
   *       },{
   *       "456": {
   *         "on": true,
   *         "online": true,
   *         "brightness": 80,
   *         "color": {
   *           "name": "cerulean",
   *           "spectrumRGB": 31655
   *         }
   *       }
   *       }
   *     }
   *   }
   * }
   */

  function query(data, response){
    console.log('query', JSON.stringify(data));
    response.status(200).json({title: "This is query intent"});
  }
  /**
   * @param data:
   * {
   *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
   *   "commands": [{
   *     "devices": [{
   *       "id": "123",
   *       "customData": {
   *         "fooValue": 74,
   *         "barValue": true,
   *         "bazValue": "sheepdip"
   *       }
   *     },{
   *       "id": "456",
   *       "customData": {
   *         "fooValue": 36,
   *         "barValue": false,
   *         "bazValue": "miarsheep"
   *       }
   *     }],
   *     "execution": [{
   *       "command": "action.devices.commands.OnOff",
   *       "params": {
   *         "on": true
   *       }
   *     }]
   *   }]
   * }
   *
   * @param response
   * @return {{}}
   * {
   *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
   *   "payload": {
   *     "commands: [{
   *       "ids": ["123"],
   *       "status": "SUCCESS",
   *       "states": {
   *         "on": true,
   *         "online": true
   *       }
   *     },{
   *       "ids": ["456"],
   *       "status": "SUCCESS",
   *       "states": {
   *         "on": true,
   *         "online": true
   *       }
   *     },{
   *       "ids": ["987"],
   *       "status": "OFFLINE",
   *       "states": {
   *         "online": false
   *       }
   *     }]
   *   }
   * }
   */ 
  function exec(data, response){
    let responseBody = {};
    console.log('exec', JSON.stringify(data));
    responseBody.requestId = data.requestId;
    responseBody.payload = {};
    for(let i = 0; i < data.commands.length; i++){
      let responseArray = data.commands[i].devices.map((element) => {
        let deviceReturnObject = {};
        deviceReturnObject.ids = [ element.id ];
        deviceReturnObject.status = "SUCCESS";
        return deviceReturnObject;
      });
      responseBody.payload["commands"] = responseArray;
    }
    console.log('exec response', JSON.stringify(responseBody));
    response.status(200).json(responseBody);
  }

  function disconnect(response){
    if (configuration.isIoTtalkUsing) {
      DAN.deRegisterOnIoTtalk();
    }
    response.status(200).json({});
  }
  /**
   * @param deveices
   * [{
   *   "id": "123"
   * },{
   *   "id": "234"
   * }]
   * @return {Array} ["123", "234"]
   */
  function getDeviceIds(devices){
    let deviceIdsArray = [];
    for(let i = 0; i < devices.length; i++){
      if (devices[i] && devices[i].id){
        deviceIdsArray.push(devices[i].id);
      }
    }
    return deviceIdsArray;
  }
}

// Return the response to google
function getResponseToGoogle() {
  return _responstToGoogle;
}

// set the response to google
function setResponseToGoogle(responseToGoogle) {
  _responseToGoogle = responseToGoogle;
}

module.exports.DAI = DAI;
module.exports.getResponseToGoogle = getResponseToGoogle;
module.exports.setResponseToGoogle = setResponseToGoogle;
