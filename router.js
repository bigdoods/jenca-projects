var HttpHashRouter = require('http-hash-router')

var Version = require('./routes/version')
var Projects = require('./routes/projects')

module.exports = function(config){

  var router = HttpHashRouter();

  router.set('/v1/projects/version', Version(config))

  var projectHandlers = Projects(config)

  router.set('/v1/projects', projectHandlers.index)
  router.set('/v1/projects/:projectid', projectHandlers.project)
  router.set('/v1/projects/:projectid/status', projectHandlers.status)


  function handler(req, res) {

    // XXX: this is a horrible hack - change it
    req.headers['x-jenca-user'] = 1
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