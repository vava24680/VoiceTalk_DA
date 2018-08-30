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

exports.productionPort = config.productionPort;
exports.smartHomeGoogleClientID = config.smartHomeGoogleClientID;exports.smartHomeGoogleClientSecret = config.smartHomeGoogleClientSecret;
exports.smartHomeApiKey = config.smartHomeApiKey;
exports.isIoTtalkUsing = config.isIoTtalkUsing;
