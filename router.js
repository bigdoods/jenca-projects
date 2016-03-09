var HttpHashRouter = require('http-hash-router')

var Version = require('./routes/version')
var Projects = require('./routes/projects')

module.exports = function(config){

  var router = HttpHashRouter();

  router.set('/v1/projects/version', Version(config))

  var projectHandlers = Projects(config)

  // fish out user id from headers
  router.set('/v1/projects', projectHandlers.index)
  router.set('/v1/projects/:projectid', projectHandlers.show)


  function handler(req, res) {
    router(req, res, {}, onError);

    function onError(err) {
      if (err) {
        res.statusCode = err.statusCode || 500;
        res.end(err.message);
      }
    }
  }

  return {
    handler:handler
  }
}