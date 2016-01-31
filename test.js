var tape = require('tape')
var async = require('async')
var Router = require('./router')
var JSONFileStorage = require('./storage/jsonfile')
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

tape('jsonfile: create project', function(t){
  var storage = JSONFileStorage({
    memory:true
  })

  // create a project
  storage.create_project(67, {
    apples:10
  }, function(err){
    if(err) t.err(err.toString())
    var state = storage.get_state()

    var projects = state.users['67'].projects
    var projectKeys = Object.keys(projects)
    t.equal(projectKeys.length, 1, 'there is one project')

    var projectKey = projectKeys[0]
    var project = projects[projectKey]

    t.equal(project.apples, 10, 'the project setting is set')
    t.deepEqual(project.containers, [], 'there is an empty list of containers')

    t.end()
  })
})
