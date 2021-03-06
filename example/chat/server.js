'use strict';

/*global TimeOutError, FunctionNotFoundError, LeaseExpiredError, NoConnectionError, SerializationError, DeserializionError*/
/*global NoAuthorError, EmptyMessageError, ContentNotAllowedError, UsernameNotAllowedError*/

var express = require('express'),
    app = express(),
    ServerRpc = require('../../../RPCT/index.js');

require('../../lib/nodeHandling.js'),
require('./generated/genServerNodes.js'),
require('./error.js');


app.use('/rpc', express.static(__dirname + '/../../../RPCT/client/'));
app.use('/handling', express.static(__dirname + '/../../'));
app.use('/', express.static(__dirname + '/'));
app.use('/generated', express.static(__dirname + '/../../'));



///////////////////////////////////////////////////////////////////////


var options = {
    pingTimeout: 8000,
    pingInterval: 2500,
    defaultRpcTimeout: Infinity
};

var myServer = new ServerRpc(app, 3000, options);

var fp = makeFailureProxy(myServer);

var myServerA = fp(SLeafA);
var myServerB = fp(SLeafB);

///////////////////////////////////////////////////////////////////////
var usernames = {};

var deleteById = function (id) {
    for (var i in usernames) {
        if (usernames[i] === id)
            delete usernames[i];
    }
};

var findUsername = function (id) {
    for (var i in usernames) {
        if (usernames[i] === id)
            return i;
    }
    return false;
};


///////////////////////////////////////////////////////////////////////


myServer.expose({
    'newChatMsg': function (user, message, callback) {

        //ApplicationErrors
        if (!user || !findUsername(user)) throw new NoAuthorError('Message is missing an author.');
        if (!message) throw new EmptyMessageError('Empty messages are not allowed.');

        //broadcast
        myServerA.rpc('addChatMessage', findUsername(user), message);
    },
    'setName': function (client, name, callback) {

        //ApplicationErrors
        if (!name) throw new ContentNotAllowedError('No empty username allowed.');
        //just for debugging atm.
        if (name === 'test' || name === 'test0' || (usernames[name] && usernames[name] !== client)) throw new UsernameNotAllowedError(name + ' is already in use.');


        var oldName = findUsername(client);
        var msg;

        if (!oldName) {
            msg = name + ' joined.';
        } else {
            deleteById(client);
            msg = oldName + ' is now known as ' + name + '.';
        }

        //broadcast
        myServerB.rpc('addInformationMessage', msg);
        usernames[name] = client;

        callback(undefined, name);

    }
});

//Expose functions to be called from client