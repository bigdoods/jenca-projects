var HttpHashRouter = require('http-hash-router')

var Version = require('./routes/version')

module.exports = function(config){

  var router = HttpHashRouter();

  router.set('/v1/version', Version(config))

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