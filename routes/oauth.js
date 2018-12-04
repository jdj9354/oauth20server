

var express = require('express');
var router = express.Router();


var OAuth2Server  = require('oauth2-server');
var Request = OAuth2Server.Request;
var Response = OAuth2Server.Response;
var options = {
};

var model =  require('../oauth2_test_model');
var oauth = new OAuth2Server({
    model:model,
    allowBearerTokensInQueryString: true,
    accessTokenLifetime: 4 * 60 * 60
});

router.post('/authenticate', function(req, res, next) {
    var request = new Request(req);
    var response = new Response(res);
    return oauth.authenticate(request, response, options)
        .then(function(token) {
            res.json({token: token});
        })
        .catch(function(err) {
            next(err);
        });
});

router.post('/authorize',function(req, res, next) {
    var request = new Request(req);
    var response = new Response(res);
    var options = {"allowEmptyState" : true};
    return oauth.authorize(request, response, options)
        .then(function(code) {
            res.json({code: code.authorizationCode});
        })
        .catch(function(err) {
            next(err);
        });
});

router.post('/token',function(req, res, next) {
    var request = new Request(req);
    var response = new Response(res);
    return oauth.token(request, response, options)
        .then(function(token) {
            res.json({token: token});
        })
        .catch(function(err) {
            next(err);
        });
});

router.post('/register_user',function(req,res,next){
    if(model.registerUser(req)){
        res.send('success to register');
    } else {
        res.send(createError(400));
    }
});

router.post('/activate_user',function(req,res,next){
    if(model.activateUser(req)){
        res.send('success to activate');
    } else {
        res.send(createError(400));
    }
});

router.post('/register_client',function(req,res,next){
    if(model.registerClient(req)){
        res.send('success to register');
    } else {
        res.send(createError(400));
    }
});

module.exports = router;