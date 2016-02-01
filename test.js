var tape = require("tape")
var async = require("async")
var Router = require("./router")
var JSONFileStorage = require("./storage/jsonfile")
var path = require("path")
var http = require("http")
var from2 = require("from2-string")
var hyperquest = require("hyperquest")
var hyperrequest = require("hyperrequest")
var concat = require("concat-stream")

var storage = JSONFileStorage({
  memory:true
})

var jenca_user_id = "banana-man"
var testing_port = 8060


tape("GET /v1/version", function (t) {

  var config = require(path.join(__dirname, "package.json"))
  var router = Router({})
  var server = http.createServer(router.handler)

  async.series([
    function(next){
      server.listen(testing_port, next)
    },
    function(next){
      var req = hyperquest("http://127.0.0.1:"+testing_port+"/v1/version", {
        method:"GET",
        headers:{
          "x-jenca-user":jenca_user_id
        }
      })

      var destStream = concat(function(result){

        t.equal(result.toString(), config.version.toString(), "the version is correct")

        next()
      })

      req.pipe(destStream)

      req.on("response", function(res){
        t.equal(res.statusCode, 200, "The status code == 200")
      })

      req.on("error", function(err){
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



tape("GET /v1/projects", function (t) {

  var config = require(path.join(__dirname, "package.json"))
  var router = Router({})
  var server = http.createServer(router.handler)

  var projects = []

  for(i=1;i<=10;i++)
    storage.create_project(jenca_user_id, {
      name:"Testing Project "+i
    }, function(err, data){
      projects.push(data)
    })

  async.series([
    function(next){
      server.listen(testing_port, next)
    },

    function(next){
      var fns = projects.map(function(data){
        return function(subnext){
          hyperrequest({
            url: "http://127.0.0.1:"+testing_port+"/v1/projects", // The path to request including `http://`. Alternative keys : `uri` or `path`
            method: "POST", // http method
            json: data,
            headers: { // http headers object
                "Content-type": "application/json",
                "x-jenca-user":jenca_user_id
            },
          }, function(err, resp){
            if(err) return subnext(err)
            subnext()
          })
        }
      })

      async.series(fns, next)
    },
    function(next){
      var req = hyperquest("http://127.0.0.1:"+testing_port+"/v1/projects", {
        method:"GET",
        headers:{
          "x-jenca-user":jenca_user_id
        }
      })

      var destStream = concat(function(result){
        // t.equal(result.toString(), config.version.toString(), "the version is correct")
        next()
      })

      req.pipe(destStream)

      req.on("response", function(res){
        t.equal(res.statusCode, 200, "The status code == 200")
      })

      req.on("error", function(err){
        next(err.toString())
      })

      var response_body = "";
      req.on("data", function(chunk) {
        response_body += chunk.toString()
      });

      req.on("end", function() {
        t.equal(JSON.parse(response_body).length, projects.length, "the number of projects matches")
      });

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




tape("jsonfile: create project", function(t){

  // create a project
  storage.create_project(jenca_user_id, {
    apples:10
  }, function(err){
    if(err) t.err(err.toString())
    var state = storage.get_state()

    var projects = state.users[jenca_user_id].projects
    var projectKeys = Object.keys(projects)
    t.equal(projectKeys.length, 1, "there is one project")

    var projectKey = projectKeys[0]
    var project = projects[projectKey]

    t.equal(project.apples, 10, "the project setting is set")
    t.deepEqual(project.containers, [], "there is an empty list of containers")

    t.end()
  })
})
