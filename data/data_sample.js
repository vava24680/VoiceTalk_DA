const labDevices = [];
const config = require('../configuration/configuration.js');
const randomstring = require('randomstring');

/*
 * Authorization Data.
 * These data are all fake and harcoded.
 * Not support new users login right now
 */
let authorizationData = {};
/*
 * Structure of user
 * uid: {
 *  uid: uid,
 *  name: UserName,
 *  password: UserPassword,
 *  tokens: []
 * }
 */
authorizationData.users = {
};

authorizationData.usernames = {};
Object.entries(authorizationData.users).forEach((value) => {
  authorizationData.usernames[value[1].name] = value[1].uid;
});

// Generate the access token and refresh token
authorizationData.tokens = {};
Object.keys(authorizationData.users).forEach((value) => {
  let token = randomstring.generate({
    length: 28,
  });
  authorizationData.users[value].tokens.push(token);
  authorizationData.tokens[token] = {
    uid: value,
    accessToken: token,
    refreshToken: token,
    userId: value
  };
});

// clientId that google needs
/* 
 * Structure of client
 * <clientID>: {
 *  "clientId": <clientID>,
 *  "clientSecret": <clientSecret>
 * }
 */
authorizationData.clients = {
};

// Authorization code
authorizationData.authorizationCodes = {};
/*
 * Structure of labDevices
 * [
 *   {
 *     "id": "device_id",
 *     "type": <device type>,
 *     "traits": [<device trait>,...],
 *     "name": {
 *       "name": <device name>,
 *       "nicknames": [<nickname>,...]
 *     }
 *   },{
 *     "id": "device_id",
 *     "type": <device type>,
 *     "traits": [<device trait>,...],
 *     "name": {
 *       "name": <device name>,
 *       "nicknames": [<nickname>,...]
 *     }
 *   }
 * ]
 */
// use push method to construct the labDevices this array

module.exports.labDevices = labDevices;
module.exports.authorizationData = authorizationData;
