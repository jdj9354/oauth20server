var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var connection = mongoose.createConnection('mongodb://localhost:27017/test');

connection.model('OAuthTokens', new Schema({
    refreshToken:{type:String},
    refreshTokenExpiresAt : {type:Date},
    accessToken : {type:String},
    accessTokenExpiresAt : {type:Date},
    scope : {type:String},
    client : {id : {type:String}},
    user : {id : {type:String}}
}));

connection.model('OAuthAuthCodes',new Schema({
    authorizationCode : {type:String},
    expiresAt : {type:Date},
    redirectUri : {type:String},
    scope : {type:String},
    client : {id : {type:String}},
    user : {id : {type:String}}
}));

connection.model('OAuthClients',new Schema({
    user      :   {id:{type:String}},
    id    :   {type:String},
    secret    :   {type:String},
    redirectUris    :   {type:Array},
    grants  :   {type:Array}
}));

connection.model('OAuthUsers',new Schema({
    email   :   {type:String, default:''},
    firstname   :   {type:String},
    lastname    :   {type:String},
    id    :   {type:String},
    password    :   {type:String},
    activated   :   {type:Boolean}
}));

var OAuthTokensModel = connection.model('OAuthTokens');
var OAuthAuthCodeModel = connection.model('OAuthAuthCodes');
var OAuthClientModel = connection.model('OAuthClients');
var OAuthUserModel = connection.model('OAuthUsers');

module.exports.registerClient = function(req){
    async function asyncQueryFunction(){
        var savePromise = new Promise(function(resolve,reject){
            var newClient = new OAuthClientModel();
            newClient.user = {id:req.user.id};
            newClient.id = req.client.id; //need to generate encoded clientid
            newClient.secret = req.secret; //need to generate encoded clientSecret
            newClient.redirectUris = req.redirectUris;
            newClient.grants = []
            newClient.save(function(err,result){
                if(err)
                    reject (err);
                else
                    resolve(result);
            })
        }).then(function(result){
            return result;
        }).catch(function(e){
            console.error(e);
            return;
        });
    }
    return asyncQueryFunction();
}

module.exports.registerUser = function(req){
    async function asyncQueryFunction(){
        var savePromise = new Promise(function(resolve,reject){
            var newUser = new OAuthUserModel();
            newUser.email = req.body.email;
            newUser.firstname = req.body.firstname;
            newUser.lastname = req.body.lastname;
            newUser.id = req.body.id;
            newUser.password = req.body.password;
            newUser.activated = false;
            newUser.save(function(err,result){
                if(err)
                    reject (err);
                else
                    resolve(result);
            })
        }).then(function(result){

            return result;
        }).catch(function(e){
           console.error(e);
           return;
        });
    }
    return asyncQueryFunction();
};

module.exports.activateUser = function(req){
    async function asyncQueryFunction(){
        var updatePromise = new Promise(function(resolve,reject){
            OAuthUserModel.update({id:req.body.id},{$set:{activated:true}},function(err,result){
                if(err)
                    reject(err);
                else
                    resolve(result);
            })
        }).then(function(result){
            return result;
        }).catch(function(e){
            console.error(e);
            return;
        });
    }
    return asyncQueryFunction();
};

module.exports.getAccessToken = function(bearerToken){
    async function asyncQueryFunction(){
        var tokenPromise = new Promise(function(resolve,reject) {
            OAuthTokensModel.findOne({accessToken: bearerToken}).lean().exec(function (err, doc) {
                if (err)
                    reject(err);
                else
                    resolve(doc);
            });
        }).then(function(token){
            return token;
        }).catch(function(e){
            console.error(e);
            return;
        });

        var token = await tokenPromise;

        if(!token)
            return null;

        var userPromise = new Promise(function(resolve,reject){
            OAuthUserModel.findOne({id:token.user.id}).lean().exec(function(err,user) {
                if (err)
                    reject(err);
                else
                    resolve(user);
            });
        }).then(function(user){
            return user;
        }).catch(function(e){
            console.error(e);
            return;
        });

        var user = await userPromise;

        if(!user)
            return null;

        var resultPromise = new Promise(function(resolve,reject){
            OAuthClientModel.findOne({id:token.client.id}).lean().exec(function(err,client) {
                if (err)
                    reject(err)
                else {
                    if (user && client) {
                        resolve( {
                            accessToken: token.accessToken,
                            accessTokenExpiresAt: new Date(token.accessTokenExpiresAt),
                            scope: token.scope,
                            client: client,
                            user: user
                        })
                    }
                    else{
                        reject();
                    }
                }
            });
        }).then(function(result){
            return result;
        }).catch(function(e){
            console.error(e);
            return;
        });

        return await resultPromise;
    }

    return asyncQueryFunction();
};

module.exports.getRefreshToken = function(bearerToken){
    async function asyncQueryFunction(){
        var tokenPromise = new Promise(function(resolve,reject){
            OAuthTokensModel.findOne({refreshToken:bearerToken}).lean().exec(function(err,token){
                if(err)
                    reject(err);
                else
                    resolve(token);
            });
        }).then(function(token){
            return token;
        }).catch(function(e){
            console.error(e);
            return;
        });

        token = await tokenPromise;

        if(token){
            var userPromise = new Promise(function(resolve,reject){
                OAuthUserModel.findOne({id:token.user.id}).lean().exec(function(err,user){
                    if(err)
                        reject(err);
                    else
                        resolve(user);
                })
            }).then(function(user){
                return user;
            }).catch(function(e){
                console.error(e);
                return;
            });

            var user = await userPromise;

            var clientPromise = new Promise(function(resolve,reject){
                OAuthClientModel.findOne({id:token.client.id}).lean().exec(function(err,client){
                    if(err)
                        reject(err);
                    else
                        resolve(client);
                })
            }).then(function (client){
                return client;
            }).catch(function(e){
                console.error(e);
                return;
            });

            var client = await clientPromise;

            if(user && client){
                return {
                    refreshToken : token.refreshToken,
                    refreshTokenExpiresAt : token.refreshTokenExpiresAt,
                    scope : token.scope,
                    client : client,
                    user : user
                }
            }
        }
    }
    return asyncQueryFunction();
};

module.exports.getAuthorizationCode = function (authorizationCode) {
    async function asyncQueryFunction(){
        var authCodePromise = new Promise(function(resolve,reject){
            OAuthAuthCodeModel.findOne({authorizationCode:authorizationCode}).lean().exec(function(err,authCode){
                if(err)
                    reject(err);
                else
                    resolve(authCode);
            });
        }).then(function(authCode){
            return authCode;
        }).catch(function(e){
            console.error(e);
            return;
        });

        var authCode = await authCodePromise;

        if(authCode){
            var userPromise = new Promise(function(resolve,reject){
                OAuthUserModel.findOne({id:authCode.user.id}).lean().exec(function(err,user){
                    if(err)
                        reject(err);
                    else
                        resolve(user);
                });
            }).then(function(user){
                return user;
            }).catch(function(e){
                console.error(e);
                return;
            });

            var user = await userPromise;

            var clientPromise = new Promise(function(resolve,reject){
                OAuthClientModel.findOne({id:authCode.client.id}).lean().exec(function(err,client) {
                    if (err)
                        reject(err);
                    else {
                        if (user && client) {
                            resolve({
                                code: authCode.authorizationCode,
                                expiresAt: authCode.expiresAt,
                                redirectUri: authCode.redirectUri,
                                scope: authCode.scope,
                                client: client,
                                user: user
                            });
                        }
                    }
                });
            }).then(function (result){
                return result;
            }).catch(function(e){
                console.error(e);
                return;
            });

            return await clientPromise;
        }
    }
    return asyncQueryFunction();
}

module.exports.getClient = function(clientId, clientSecret){
    var params = {id:clientId};
    if(clientSecret){
        params.secret = clientSecret;
    }

   async function asyncQueryFunction(){
        var queryPromise = new Promise(function(resolve,reject) {
            OAuthClientModel.findOne(params).lean().exec(function (err, client) {
                if (err)
                    reject(err);
                else {
                    resolve(client)
                }
            });
        }).then(function(client){
            return client;
        }).catch(function(err){
            console.error(err);
            return;
        });
        return await queryPromise;
    }
    return asyncQueryFunction();



}

module.exports.getUser = function(userId,password){
    async function asyncQueryFunction(){
        var userPromise = new Promise(function(resolve,reject){
            OAuthUserModel.findOne({id:userId, password:password}).lean().exec(function(err,user){
                if(err)
                    reject(err);
                else
                    resolve(user);
            })
        }).then(function(user){
            return user;
        }).catch(function(err){
            console.error(err);
            return ;
        });

        return await userPromise;
    }
    return asyncQueryFunction();
};

module.exports.getUserFromClient = function(client){
    async function asyncQueryFunction(){
        var userPromise = new Promise(function(resolve,reject){
            OAuthUserModel.findOne({id:client.user.id}).lean().exec(function(err,user){
                if(err)
                    reject(err);
                else
                    resolve(user);
            })
        }).then(function(user){
            return user;
        }).catch(function(err){
            console.error(err);
            return;
        });

        return await userPromise;
    }
    return asyncQueryFunction();

    //return OAuthClientModel.findOne({id:client.clientId}).lean();
}

module.exports.saveToken = function(token,client,user){


    var accessToken = new OAuthTokensModel({
        accessToken             :   token.accessToken,
        accessTokenExpiresAt    :   token.accessTokenExpiresAt,
        refreshToken            :   token.refreshToken,
        refreshTokenExpiresAt   :   token.refreshTokenExpiresAt,
        scope                   :   token.scope,
        client                  :   {id :   client.id},
        user                    :   {id :   user.id}
    });

    async function asyncQueryFunction(){
        var savePromise = new Promise(function(resolve,reject){
            accessToken.save(function(err,data){
                if(err) reject(err);
                else resolve(data);
            });
        }).then(function(saveResult){
            saveResult = saveResult && typeof saveResult == 'object'  ? saveResult.toJSON() : saveResult;

            var data = new Object();

            for(var prop in saveResult)
                data[prop] = saveResult[prop];

            return data;
        }).catch(function (err){
            console.error(err);
            return;
        });

        return await savePromise;
    }

    return asyncQueryFunction();
}

module.exports.saveAuthorizationCode = function(code,client,user){
    var authCode = new OAuthAuthCodeModel({
        authorizationCode        :   code.authorizationCode,
        expiresAt                :   code.expiresAt,
        redirectUri              :   code.redirectUri,
        scope                    :   code.scope,
        client                   :   {id :   client.id},
        user                     :   {id :   user.id}
    });

    async function asyncQueryFunction(){
        var authCodePromise = new Promise(function(resolve,reject){
            authCode.save(function(err,data){
                if(err) reject(err);
                else resolve(data);
            });
        }).then(function(saveResult){
            saveResult = saveResult && typeof saveResult == 'object'  ? saveResult.toJSON() : saveResult;

            var data = new Object();

            for(var prop in saveResult)
                data[prop] = saveResult[prop];

            return data;
        }).catch(function (err){
            console.error(err);
            return;
        });

        return await authCodePromise;
    }

    return asyncQueryFunction();
};

module.exports.revokeToken = function(token){

    async function asyncQueryFunction() {
        var tokenPromise = new Promise(function (resolve, revoke) {
            OAuthTokensModel.deleteOne({refreshToken: token.refreshToken}, function (err) {
                if (err)
                    revoke(false);
                else
                    resolve(true);
            })
        }).then(function (saveResult) {
            return saveResult;
        }).catch(function (saveResult) {
            return saveResult;
        });

        return await tokenPromise;
    }
    return asyncQueryFunction();
}

module.exports.revokeAuthorizationCode = function(code){
    async function asyncQueryFunction(){
        var authCodePromise = new Promise(function(resolve,revoke){
            OAuthAuthCodeModel.deleteOne({authorizationCode:code.authorizationCode},function(err){
                if(err)
                    revoke(false);
                resolve(true);
            })
        }).then(function(saveResult){
            return saveResult;
        }).catch(function(saveResult){
            return saveResult;
        });

        return await authCodePromise;
    }
    return asyncQueryFunction();
}

module.exports.verifyScope = function(token,scope){
    if (!token.scope) {
        return false;
    }
    var requestedScopes = scope.split(' ');
    var authorizedScopes = token.scope.split(' ');
    return requestedScopes.every(function(s) {authorizedScopes.indexOf(s) >= 0});
}
