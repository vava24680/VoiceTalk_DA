const express = require('express');
const util = require('util');
const session = require('express-session');
const getmac = require('getmac');
const Q = require('q');

const configuration = require('../configuration/configuration.js');
const authDataStore = require('../data/data.js').authorizationData;
const DAN = require('../DAN/DAN.js');
const DAI = require('../DAI.js');
let oauth2Model = {};
let auth = {};

// Generate Uid and return it
function generateUid() {
  let uid = Math.floor(Math.random() * 1000).toString();
  // If the gengerated uid repeated, re-generate it again
  while(authDataStore.users[uid]) {
    uid = generateUid();
  }
  return uid;
}

// Generate random string
function generateRandomString() {
  return Math.floor(Math.random() * 100000000000000000000000000000000000000000).toString(36);
}

auth.getAccessTokenFromHeader = function (request) {
  return request.headers.authorization ? request.headers.authorization.split(' ')[1] : null;
};

auth.getUid = function(request) {
  return request.headers.uid;
};

oauth2Model.generateUser = function(username, password) {
  let uid = generateUid();
  let token = generateRandomString();

  authDataStore.usernames[username] = uid;
  authDataStore.users[uid] = {
    uid: uid,
    name: username,
    password: password,
    tokens: [token]
  };
  authDataStore.tokens[token] = {
    uid: uid,
    accessToken: token,
    refreshToken: token
  };
};

oauth2Model.generateAuthorizationCode = function(uid, clientId) {
  let authorizationCode = generateRandomString();
  authDataStore.authorizationCodes[authorizationCode] = {
    type: "AUTHORIZATION_CODE",
    uid: uid,
    expireAt: new Date((Date.now() + 60 * 10000)), // 10-minute limit
    clientId: clientId
  };
  console.log("authDataStore.authorizationCodes ", JSON.stringify(authDataStore.authorizationCodes));
  return authorizationCode;
};

oauth2Model.getAccessToken = function(code) {
  let authorizationCode = authDataStore.authorizationCodes[code];
  if (!authorizationCode) {
    console.log("Invalid authorization code, ", code);
    return false;
  }

  if (new Date(authorizationCode.expireAt) < Date.now()) {
    console.log("The authorization code has expired, ", authorizationCode);
    return false;
  }

  let user = authDataStore.users[authorizationCode.uid];
  if (!user) {
    console.log("Can't find the user".red);
    return false;
  }

  let accessToken = user.tokens[0];
  console.log("accessToken, ", accessToken.green);

  if (!accessToken) {
    console.log("Can't find the access token".red);
  }

  let returnObject = {
    token_type: "bearer",
    access_token: accessToken,
    refresh_token: accessToken
  };

  console.log("Return object of getAccessToken function, ", JSON.stringify(returnObject));
  return returnObject;
};

oauth2Model.getClient = function(clientId, clientSecret) {
  console.log('getClient %s, %s', clientId, clientSecret);
  let client = authDataStore.clients[clientId];
  if(!client || (client.clientSecret != clientSecret)) {
    console.log("client doesn't match");
    return false;
  }

  console.log(`get client ${client.clientId} successfully`);
  return client;
};

oauth2Model.getUser = function(username, password) {
  console.log('getUser', username);
  let userId = authDataStore.usernames[username];
  if(!userId) {
    console.log(`${userId} is not a valid user`);
  }

  let user = authDataStore.users[userId];
  if(!user) {
    console.log(`${user} is not a valid user`);
  }
  if(user.password != password) {
    console.log("Password doesn't match".red);
    return false;
  }
  return user;
};

function registerAuthorization(app) {
  /**
   * Expecting something like the following:
   *
   * GET https://smarthome.sahaohao.info/oauth?\
   * client_id=GOOGLE_CLIENT_ID
   *    - The Google Client ID that registered with Google.
   * &redirect_uri=REDIRECT_URI
   *    - The URL to which to send the response to this request.
   * &state=STATE_STRING
   *    - A bookkeeping value that is passed back to Google unchanged in the result.
   * &response_type=code
   *    - The string code
   */
  app.get('/oauth', (request, response) => {
    console.log("GET OAuth".green);
    console.log("Authorization Request".red);
    console.log("session id, ", request.session.id);
    let clientId = request.query.client_id;
    let redirectURI = request.query.redirect_uri;
    let state = request.query.state;
    let responseType = request.query.response_type;
    let authorizationCode = request.query.code; // This field may not exist

    // Check the response_type is "code" or not
    if("code" != responseType) {
      return response.status(500).send(`response_type ${responseType} must equal "code"`);
    }

    // Check the clientId is registed or not
    // if not, response with status code 500 with "cliendId invalid" message
    if(!authDataStore.clients[clientId]) {
      return response.status(500).send(`client_id ${clientId} invalid`);
    }

    // Save the client information to session
    request.session.clientId = clientId;
    request.session.redirectURI = redirectURI;
    request.session.state = state;
    request.session.responseType = responseType;
    /*
    // If authCode is present, use that to redirect the client to pre-defined redirect-URL
    if(authCode) {
      response.redirect(util.format('%s?code=%s&state=%s',
        redirectURI, authorizationCode, state
      ));
    }
    */

    let user = request.session.user;
    console.log("user ".blue, user);

    // Check the user is provided or not
    // if not, redirect to login page
    if(!user) {
      return response.redirect(util.format('/login?client_id=%s&redirect_uri=%s&redirect=%s&state=%s',
      clientId, encodeURIComponent(redirectURI), request.path, state
      ));
    }

    // Authorization request and user authenitcation are complete
    // and user grants the access request issued by client
    console.log("Authorization is granted".red);
    console.log("User authentication is granted".red);

    // Generate authorization code
    authorizationCode = oauth2Model.generateAuthorizationCode(user.uid, clientId);

    if(authorizationCode) {
      console.log(`Authorzation code ${authorizationCode} generated successfully`);
      return response.redirect(util.format('%s?code=%s&state=%s',
        redirectURI, authorizationCode, state
      ));
    }

    response.status(400).send("Something went wrong");
  });

  //app.use('/login', express.static('./fronted/login.ejs'));

  // GET login
  app.get('/login', (request, response) => {
    console.log("session id", request.session.id.red);
    response.render('login', {message: ""});
  });
  // POST login
  app.post('/login', (request, response) => {
    console.log("This is login POST request");
    console.log("session id, ", request.session.id.red);
    let user = oauth2Model.getUser(request.body.username, request.body.password);

    // Check if the user data is correct
    // if not, redirect to login page with "登入失敗，請重新登入" message
    if(!user) {
      console.log("Not a user");
      return response.render('login', {message: "登入失敗，請重新登入"});
      /*
      return response.redirect(util.format('%s?client_id=%s&redirect_uri=%s&state=%s&response_type=code',
      "login", request.body.client_id, encodeURIComponent(request.body.redirect_uri), request.body.stete
      ));
      */
    }

    console.log("Logging ", user.name);

    // Save the user to session
    request.session.user = user;

    console.log("request.session.user, ", JSON.stringify(request.session.user));

    // Successful login should send the user back to /oauth.
    let path = decodeURIComponent(request.body.redirect) || '/login';

    console.log("login successful ", user.name);
    let authorizationCode = oauth2Model.generateAuthorizationCode(user.uid, request.session.clientId);

    if(authorizationCode) {
      console.log(`Authorzation code ${authorizationCode} generated successfully`);
      console.log(decodeURIComponent(request.session.redirectURI));
      //console.log(decodeURIComponent(request.body.redirect_uri));
      response.redirect(util.format('%s?code=%s&state=%s',
        decodeURIComponent(request.session.redirectURI), authorizationCode, request.session.state
        //decodeURIComponent(request.body.redirect_uri), authorizationCode, request.body.state
      ));
    }
    else {
      console.log("Generating authorization code failed");
      response.redirect(util.format('%s?client_id=%s&redirect_uri=%s&state=%s&response_type=code',
        path, request.session.clientId, encodeURIComponent(request.session.redirectURI), request.session.state
        //path, request.body.client_id, encodeURIComponent(request.body.redirect_uri), request.body.state
      ));
    }
  });

  /**
   * Expecting something like the following:
   *
   * POST https://smarthome.sahaohao.info/token
   * Authorization: Basic czZCaGRSa3F0MzpnWDFmQmF0M2JW
   * Content-Type: application/x-www-form-urlencoded
   *
   * client_id=GOOGLE_CLIENT_ID
   *    - The Google Client ID that registered with Google.
   * &client_secret=GOOGLE_CLIENT_SECRET
   *    - The secret string that registered with Google for your service
   * &grant_type=authorization_code
   *    - Defined in OAuth2 authorization code flow
   * &code=AUTHORIZATION_CODE
   *    - The authorization code issued by authorization server
   * 
   * or
   *
   * POST https://smarthome.sahaohao.info/token
   * Authorization: Basic czZCaGRSa3F0MzpnWDFmQmF0M2JW
   * Content-Type: application/x-www-form-urlencoded
   *
   * client_id=GOOGLE_CLIENT_ID
   *    - The Google Client ID that registered with Google.
   * &client_secret=GOOGLE_CLIENT_SECRET
   *    - The secret string that registered with Google for your service
   * &grant_type=refresh_token
   *    - Defined in OAuth2 authorization code flow
   * &refresh_token=REFRESH_TOKEN
   *    - The refresh token that Google received earilier.
   */

  app.all('/token', (request, response) => {
    console.log(request.method.red + " /token");
    console.log('/token query', request.query); // If the token exchange request is sent with GET
    console.log('/token body', request.body); // If the token exchange request is sent with POST
    let clientId = request.query.client_id
        ? request.query.client_id : request.body.client_id;
    let clientSecret = request.query.client_secret
        ? request.query.client_secret : request.body.client_secret;
    let grantType = request.query.grant_type
        ? request.query.grant_type : request.body.grant_type;

    // Check the client_id and client_secret is existing or not
    if (!clientId || !clientSecret) {
      console.log("missing required parameters");
      return response.status(400).send("missing required parameters");
    }

    let client = oauth2Model.getClient(clientId, clientSecret);
    console.log('client ', client);
    // Check the client is existing or not
    if (!client) {
      console.error("incorrect client data");
      return response.status(400).send("incorrect client data");
    }

    if ("authorization_code" == grantType) {
      return handleAccessToken(request, response);
    } else if ("refresh_token" == grantType) {
      return handleRefreshToken(request, response);
    } else {
      console.error(`grant_type ${grantType} is not supported`);
      return response.status(400).send(`grant_type ${grantType} is not supported`);
    }
  });
};
/**
   * @return {{}}
   * {
   *   token_type: "bearer",
   *   access_token: "ACCESS_TOKEN",
   *   refresh_token: "REFRESH_TOKEN"
   * }
   */
  function handleAccessToken(request, response) {
    console.log("issuing access token");
    let clientId = request.query.client_id
        ? request.query.client_id : request.body.client_id;
    let clientSecret = request.query.client_secret
        ? request.query.client_secret : request.body.client_secret;
    let authorizationCode = request.query.code ? request.query.code : request.body.code;

    let client = oauth2Model.getClient(clientId, clientSecret);

    // Check the authorization code is existing or not
    if (!authorizationCode) {
      console.error("missing authorization code");
      return response.status(400).send("missing authorization code");
    }

    // Check the client is existing or not
    if (!client) {
      console.error("client id %s or client secret %s is invalid", clientId, clientSecret);
      return response.status(400).send("invalid client id or client secret");
    }

    console.log(JSON.stringify(authDataStore.authorizationCodes));
    console.log(authorizationCode.red);
    let authorizationCodeDetail = authDataStore.authorizationCodes[authorizationCode];
    console.log("authorizationCodeDetail, ", JSON.stringify(authorizationCodeDetail));
    // Check the authorization code is existing or not
    if (!authorizationCodeDetail) {
      console.error("invalid authorization code");
      return response.status(400).send("invalid authorization code");
    }

    // Check the authorization code is expired or not
    if (new Date(authorizationCodeDetail.expireAt) < Date.now()) {
      console.error("expired authorization code");
      return response.status(400).send("expired authorization code");
    }

    // Check if this authorization code is owned by others
    if (authorizationCodeDetail.clientId != clientId) {
      console.log("invalid authorization code, client doesn't match".red);
      console.log("authorizationCodeDetail.clientId ".red, authorizationCodeDetail.clientId);
      console.log("clientId ".red, clientId);
      return response.status(400).send("invalid authorization code, client doesn't match");
    }

    let accessToken = oauth2Model.getAccessToken(authorizationCode);
    // Check the accessToken is existing or not
    if (!accessToken) {
      console.error("unable to generate an access token");
      return response.status(400).send("unable to generate an access token");
    }

    console.log("Get access token successfully".green);
    if (configuration.isIoTtalkUsing) {
      DAN.registerOnIoTtalk()
        .then(
          (response) => {
            console.log("Remember to configure the IoTtalk part so the voice controll can be availabe".green);
            return "SUCCESS";
          },
          (response) => {
            console.log("Status code:", response.statusCode.toString().red);
            console.log("Please check the error messages below and restart this application".red);
            console.log("----------------Error Messages----------------".red);
            console.log("*  ".red + response.error.red + "  *".red);
            console.log("----------------------end---------------------".red);
            return "ERROR"
          }
        )
        .done((message) => {DAI.setResponseToGoogle(message)});
    }
    return response.status(200).json(accessToken);
  }

  /**
   * @return {{}}
   * {
   *   token_type: "bearer",
   *   access_token: "ACCESS_TOKEN"
   * }
   */
  function handleRefreshToken(request, response) {
    let clientId = request.query.client_id
        ? request.query.client_id : request.body.client_id;
    let clientSecret = request.query.client_secret
        ? request.query.client_secret : request.body.client_secret;
    let refreshToken = request.query.refresh_token
        ? request.query.refresh_token : request.body.refresh_token;

    let client = oauth2Model.getClient(clientId, clientSecret);

    // Check the client is existing or not
    if (!client) {
      console.error("client id %s or client secret %s is invalid", clientId, clientSecret);
      return response.status(400).send("invalid client id or client secret");
    }

    // Check the refresh token is existing or not
    if (!refreshToken) {
      console.error("invalid refresh token");
      return response.status(400).send("invalid refresh token");
    }

    response.status(200).json({
      token_type: "bearer",
      access_token: refreshToken
    });
  }

module.exports.registerAuthorization = registerAuthorization;
module.exports.generateRandomString = generateRandomString;
module.exports.generateUid = generateUid;
module.exports.getAccessTokenFromHeader = auth.getAccessTokenFromHeader;
module.exports.getUid = auth.getUid;
