var path = require('path')
module.exports = function(config){
  var config = require(path.join(__dirname, '..', 'package.json'))
  return {
    GET:function(req, res, opts, cb){
      
      res.setHeader('content-type', 'text/plain')
      res.end(config.version)

    }
  }
}