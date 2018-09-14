let config = {};

// Port setting
config.productionPort = "";
// Cleint ID that assigned to Google Assistant Project Console in Account Linking
config.smartHomeGoogleClientID = "";
// Client secret that assigned to Google Assistant Projection Console in Account Linking
config.smartHomeGoogleClientSecret = "";
// API key issued from Google API console
config.smartHomeApiKey = "";
/*
 * false means that no IoTtalk service is used for controlling devices
 * true means that the IoTtalk service if used for controlling devices
 */
config.isIoTtalkUsing = false;
// Network interface that the machine user
config.iface = "";

// Set the macaddress to config object
function setMacAddress(macAddress) {
  config._macAddress = macAddress;
}

// Return the macaddress of config object
function getMacAddress() {
  return config._macAddress || null;
}

exports.productionPort = config.productionPort;
exports.smartHomeGoogleClientID = config.smartHomeGoogleClientID;exports.smartHomeGoogleClientSecret = config.smartHomeGoogleClientSecret;
exports.smartHomeApiKey = config.smartHomeApiKey;
exports.isIoTtalkUsing = config.isIoTtalkUsing;
module.exports.iface = iface;
module.exports.setMacAddress = setMacAddress;
module.exports.getMacAddress = getMacAddress;
