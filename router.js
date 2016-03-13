var HttpHashRouter = require('http-hash-router')

var Version = require('./routes/version')
var Projects = require('./routes/projects')

module.exports = function(config){

  if(!config.containerizer){
    throw new Error('need a containerizer function')
  }

  if(!config.authenticator){
    throw new Error('need a authenticator function')
  }

  var router = HttpHashRouter();

  router.set('/v1/projects/version', Version(config))

  var projectHandlers = Projects(config)

  router.set('/v1/projects', projectHandlers.index)
  router.set('/v1/projects/:projectid', projectHandlers.project)
  router.set('/v1/projects/:projectid/status', projectHandlers.status)

  function handler(req, res) {

    function onError(err) {
      if (err) {
        res.statusCode = err.statusCode || 500;
        res.end(err.message);
      }
    }

    // to use any of the projects api you must be logged in
    config.authenticator(req, function(err, result){

      if(result.is_authenticated){
        req.headers['x-jenca-user'] = result.email
        router(req, res, {}, onError);
      }
      else{
        res.statusCode = 401
        res.end('you must be logged in to use the projects service')
      }
      
    })

    
  }

  return {
    handler:handler
  }
}