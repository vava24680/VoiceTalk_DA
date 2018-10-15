const randomstring = require('randomstring');
const cheerio = require('cheerio');
const request = require('request');
const Q = require('q');
const labDevices = [];
const config = require('../configuration/configuration.js');
const deviceTypesURL = 'https://developers.google.com/actions/smarthome/guides/';
const deviceTraitsURL = 'https://developers.google.com/actions/smarthome/traits/';

/*
 * Authorization Data.
 * These data are all fake and harcoded.
 * Not support new users login right now
 */
let authorizationData = {};
/*
 * Array stores all device types
 * crawled from Google smarthome guide
 */
let deviceTypesArray = [];
/*
 * Array stores all device traits
 * crawled from Google smarthome guide
 */
let deviceTraitsArray = [];
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

// Return labDevices object
function getDevices() {
  return labDevices;
}

/**
 * use `request` to crawl the pages containing
 * all device types and use `cheerio` to get desired
 * data and then save them to promise object
 * @return {promise} promise object with an array
 *     containing all device types
 */
function _crawlTypes() {
  let qObject = Q.defer();
  let options = {
    url: deviceTypesURL,
    method: 'GET',
  };
  request(options, (err, response, body) => {
    if (err) {
      qObject.reject("failed");
    } else {
      let $ = cheerio.load(body);
      let trArray = $('table tr');
      let deviceTypesArray = [];
      for (let i = 1; i < trArray.length; ++i) {
        // First way to crawl each type
        deviceTypesArray.push(trArray.eq(i).attr('id'));
        // Second way to crawl each type
        /*
         * let tdArray = trArray.eq(i).find('td);
         * deviceTypesArray.push(tdArray.eq(1).text());
         */
      }
    }
  });
  return qObject.promise;
}

/**
 * set the value of variable `deviceTypesArray`
 * @param {Array} an array contains all device types
 * @return {void}
 */
function _setDeviceTypesArray(typesArray) {
  deviceTypesArray = typesArray;
}

/**
 * return an array with all device types
 * @return {Array} an array contains all device types
 */
function getDeviceTypesArray(typesArray) {
  return deviceTypesArray;
}

/**
 * crawl all device types by calling
 * function `_crawlTypes` and
 * save them into an array by using
 * function `_setDeviceTypesArray`
 * @return {void}
 */
function crawlTypes() {
  _crawlTypes()
      .done(
        (typesArray) => {
          _setDeviceTypesArray(typesArray);
        },
        (failMessage) => {
          console.log(failMessage);
        }
      );
}

/**
 * use `request` to crawl the pages containing
 * all device traits and use `cheerio` to get desired
 * data and then save them to promise object
 * @return {promise} promise object with an array
 *     containing all device traits
 */
function _crawlTraits() {
  let qObject = Q.defer();
  let options = {
    url: deviceTraitsURL,
    method: 'GET',
  };
  request(options, (err, response, body) => {
    if (err) {
      qObject.reject("failed");
    } else {
      let $ = cheerio.load(body);
      let trArray = $('table tr');
      let deviceTraitsArray = [];
      for (let i = 1; i < trArray.length; ++i) {
        // First way to crawl each trait
        deviceTraitsArray.push(trArray.eq(i).attr('id'));
        // Second way to crawl each trait
        /*
         * let tdArray = trArray.eq(i).find('td);
         * deviceTraitsArray.push(tdArray.eq(1).text());
         */
      }
    }
  });
  return qObject.promise;
}

/**
 * set the value of variable `deviceTraitsArray`
 * @param {Array} an array contains all device traits
 * @return {void}
 */
function _setDeviceTraitsArray(traitsArray) {
  deviceTraitsArray = traitsArray;
}

/**
 * return an array with all device traits
 * @return {Array} an array contains all device traits
 */
function getDeviceTraitsArray() {
  return deviceTraitsArray;
}

/**
 * crawl all device traits by calling
 * function `_crawlTraits` and
 * save them into an array by using
 * function `_setDeviceTraitsArray`
 * @return {void}
 */
function crawlTraits() {
  _crawlTraits()
      .done(
        (traitsArray) => {
          _setDeviceTraitsArray(traitsArray);
        },
        (failMessage) => {
          console.log(failMessage);
        }
      );
}

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
module.exports.getDevices = getDevices;
module.exports.crawlTypes = crawlTypes;
module.exports.crawlTraits = crawlTraits;
module.exports.getDeviceTypesArray = getDeviceTypesArray;
module.exports.getDeviceTraitsArray = getDeviceTraitsArray;
