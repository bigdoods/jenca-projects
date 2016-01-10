var tape = require('tape')
var async = require('async')
var Router = require('./router')
var path = require('path')
var http = require('http')
var from2 = require('from2-string')
var hyperquest = require('hyperquest')
var concat = require('concat-stream')

tape('/v1/version', function (t) {

  var config = require(path.join(__dirname, 'package.json'))
  var router = Router({})
  var server = http.createServer(router.handler)

  async.series([
    function(next){
      server.listen(8060, next)
    },
    function(next){
      var req = hyperquest('http://127.0.0.1:8060/v1/version', {
        method:'GET',
        headers:{
          'x-jenca-user':'oranges'
        }
      })

      var destStream = concat(function(result){
        
        t.equal(result.toString(), config.version.toString(), 'the version is correct')
        
        next()
      })

      req.pipe(destStream)

      req.on('response', function(res){
        t.equal(res.statusCode, 200, 'The status code == 200')
      })

      req.on('error', function(err){
        next(err.toString())
      })
    },
    function(next){
      server.close(next)
    }
  ], function(err){
    if(err){
      t.error(err)
      t.end()
      return
    }
    t.end()
  })

})
