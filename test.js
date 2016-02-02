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
var subject_project_index = 5

// seed some projects
var projects = []
for(i=1;i<=10;i++)
  storage.create_project(jenca_user_id, {
    name:"Testing Project "+i
  }, function(err, data){

    hyperrequest({
      url: "http://127.0.0.1:"+ testing_port +"/v1/projects", // The path to request including `http://`. Alternative keys : `uri` or `path`
      method: "POST", // http method
      json: data,
      headers: { // http headers object
          "x-jenca-user":jenca_user_id
      },
    }, function(err, resp){
      if(err){
        console.log(err)
        return
      }

      // update the projects array with saved data
      projects.push(resp.body)
    })

  })

var router = Router({})
var server = http.createServer(router.handler)
server.listen(testing_port)

/*
  Test that the version of the module returns the correct string
*/
tape("GET /v1/version", function (t) {

  var config = require(path.join(__dirname, "package.json"))


  async.series([
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
  ], function(err){
    if(err){
      t.error(err)
      t.end()
      return
    }
    t.end()
  })

})


/*
  Seed the system with projects against a user and query the API to check they are all returned
*/
tape("GET /v1/projects", function (t) {

  var config = require(path.join(__dirname, "package.json"))

  async.series([
    function(next){
      hyperrequest({
        "url":"http://127.0.0.1:"+ testing_port +"/v1/projects",
        method:"GET",
        headers:{
          "x-jenca-user":jenca_user_id
        }
      }, function(err, resp){
        if(err) return next(err)
        t.equal(resp.statusCode, 200, "The status code == 200")
        t.equal(resp.body.length, projects.length, "the number of projects matches")

        next()
      })

    },
  ], function(err){
    if(err){
      t.error(err)
      t.end()
      return
    }
    t.end()
  })

})


/*
  seed the system with projects and retrieve one to check it's attributes
*/
tape("GET /v1/projects/:projectid", function (t) {

  var config = require(path.join(__dirname, "package.json"))

  async.series([
    function(next){

      hyperrequest({
        "url": "http://127.0.0.1:"+testing_port+"/v1/projects/"+ projects[subject_project_index].id,
        method:"GET",
        headers:{
          "x-jenca-user":jenca_user_id
        }
      }, function(err, resp){
        if(err) return subnext(err)

        t.equal(resp.statusCode, 200, "The status code == 200")
        t.equal(resp.body.name, projects[subject_project_index].name, "the requested project's name matches")

        next()
      })
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



/*
  seed the system with projects and update one with known data to check it is updated
*/
tape("PUT /v1/projects/:projectid", function (t) {

  var config = require(path.join(__dirname, "package.json"))

  async.series([
    function(next){

      projects[subject_project_index].name = "A totally different name"

      var req = hyperrequest({
        "url":"http://127.0.0.1:"+testing_port+"/v1/projects/"+ projects[subject_project_index].id,
        method:"PUT",
        json:projects[subject_project_index],
        headers:{
          "x-jenca-user":jenca_user_id
        }
      }, function(err, resp){
        if(err) return subnext(err)

        t.equal(resp.statusCode, 200, "The status code == 200")
        t.equal(resp.body.name, projects[subject_project_index].name, "the requested project's name matches")

        next()
      });

    },

    function(next){
      var req = hyperrequest({
        "url":"http://127.0.0.1:"+testing_port+"/v1/projects/"+ projects[subject_project_index].id,
        method:"GET",
        headers:{
          "x-jenca-user":jenca_user_id
        }
      }, function(err, resp){
        if(err) return subnext(err)

        t.equal(resp.statusCode, 200, "The status code == 200")
        t.equal(resp.body.name, projects[subject_project_index].name, "the requested project's name matches")

        next()
      });

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



/*
  seed the system with projects and delete one
*/
tape("DELETE /v1/projects/:projectid", function (t) {

  var config = require(path.join(__dirname, "package.json"))

  async.series([
    function(next){

      var req = hyperrequest({
        "url":"http://127.0.0.1:"+testing_port+"/v1/projects/"+ projects[subject_project_index].id,
        method:"DELETE",
        headers:{
          "x-jenca-user":jenca_user_id
        }
      }, function(err, resp){
        if(err) return subnext(err)

        t.equal(resp.statusCode, 200, "The status code == 200")
        next()
      });

    },

    function(next){
      hyperrequest({
        "url":"http://127.0.0.1:"+ testing_port +"/v1/projects",
        method:"GET",
        headers:{
          "x-jenca-user":jenca_user_id
        }
      }, function(err, resp){
        if(err) return next(err)
        t.equal(resp.statusCode, 200, "The status code == 200")
        t.equal(resp.body.length, (projects.length-1), "the number of projects is less one")

        next()
      })

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


/*
  unit test for the storage mechanism
*/
tape("jsonfile: create project", function(t){

  // create a project
  storage.create_project(jenca_user_id, {
    apples:10
  }, function(err){
    if(err) t.err(err.toString())
    var state = storage.get_state()

    var project_keys = Object.keys(state.users[jenca_user_id].projects)
    t.equal(project_keys.length, (projects.length+1), "there are "+ (projects.length+1)+" projects")

    var project_id = project_keys.pop()
    var project = state.users[jenca_user_id].projects[project_id]

    t.equal(project.apples, 10, "the project setting is set")
    t.deepEqual(project.containers, [], "there is an empty list of containers")

    t.end()
    server.close()
  })
})
