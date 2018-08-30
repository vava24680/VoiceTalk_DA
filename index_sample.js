const bodyParser = require('body-parser');
const express = require('express');
const fetch = require('node-fetch');
const morgan = require('morgan');
const session = require('express-session');
const fs = require('fs');
const https = require('https');
const http = require('http');
const colors = require('colors');
const util = require('util');
const randomstring = require('randomstring');
const request = require('request');

const configuration = require('./configuration/configuration.js');
const smartHomeApp = require('./DAI.js');
const authProvider = require('./oauth2/oauth2.js');

const requestSyncEndpoint = "https://homegraph.googleapis.com/v1/devices:requestSync?key=";
const keyCertPath = ""; // The path where the certificate is
const ca = fs.readFileSync(keyCertPath + ""); // Filled with chain file name
const privateKey = fs.readFileSync(keyCertPath + ""); // Filled with private key file name
const certificate = fs.readFileSync(keyCertPath + ""); // Filled with certificate file name
const credentials = {
  "ca": ca,
  "key": privateKey,
  "cert": certificate
};

// express and morgan setting
const app = express();
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
//app.set('trust proxy', 1); // trust first proxy, used in when ngrok is enabled*
app.set('views', __dirname + '/fronted');
app.set('view engine', 'ejs');
app.use(session({
  genid: (request) => {
    return authProvider.generateRandomString();
  },
  secret: randomstring.generate(),
  saveUninitialized: true,
  resave: true,
  cookie: {secure: true}
}));

/**
 *Create https server
 */
let httpsServer = https.createServer(credentials, app);
httpsServer.listen(configuration.productionPort, () => {
  console.log("HTTPS server has been created successfully".green);
});

app.use('/fronted', express.static('./fronted'));

app.get('/', (request, response) => {
  console.log("Index page");
  console.log("session id, ", request.session.id);
  response.redirect(util.format('/login?client_id=%s&redirect_uri=/fronted&state=pcslab'
    ,configuration.smartHomeGoogleClientID));
});

app.requestSync = function(uid) {
  const apiKey = configuration.smartHomeApiKey;
  let options = {
    uri: requestSyncEndpoint + apiKey,
    method: "POST",
    json: true,
    bodt: {
      agentUserId: uid
    }
  };
  request(options, (err, response, body) => {
    if(response.statusCode === 200) {
      console.log("Request Sync successfully".green);
    }
    else {
      console.log("Request Sync Failed".red);
      console.log("Error body".red, JSON.stringify(body).red);
    }
  });
}

function registerAgent(app) {
  smartHomeApp.DAI(app);
}
function registerAuthorization(app) {
  authProvider.registerAuthorization(app);
}

registerAgent(app);
registerAuthorization(app);

console.log("\n\nRegistered routes:");
app._router.stack.forEach((r) => {
  if(r.route && r.route.path){
    console.log(r.route.path.cyan);
  }
});
