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

var jenca_user_id = "banana-man"
var testing_port = 8060
var subject_project_index = 5


/*

  boot a test server for each test so the state from one
  does not affect another test
  
*/
function createServer(done){

  // keep the storage in memory for the tests
  var router = Router({
    memory:true
  })
  var server = http.createServer(router.handler)
  server.listen(testing_port, function(err){
    done(err, server)
  })
}

/*
  
  make a list of N projects
  
*/
function getProjectData(count){

  count = count || 10;
  
  var projectData = []
  for(i=1;i<=count;i++){
    projectData.push({
      name:"Testing Project "+i
    })
  }
  return projectData
}

/*

  post 10 projects to the test server
  return an array of the 10 projects as they exist on the server
  
*/
function populateData(projects, done){
  var projectData = []
  /*
  
    map the array of names onto an array of functions
    that will POST a project with that name
    
  */
  var createFunctions = projects.map(function(data){

    /*
    
      this is the async function that will run via async.series
      
    */
    return function(next){
      hyperrequest({
        url: "http://127.0.0.1:"+ testing_port +"/v1/projects",
        method: "POST",
        json: data,
        headers: {
            "x-jenca-user":jenca_user_id
        }
      }, function(err, resp){

        // always return errors so parent code is notified
        if(err) return next(err.toString())

        projectData.push(resp.body)

        next()
      })
    }
  })

  /*
  
    run over the project creation
    return the array of returned project data
    
  */
  async.series(createFunctions, function(err){
    if(err) return done(err)
    done(null, projectData)
  })
}

/*
  Test that the version of the module returns the correct string
*/
tape("GET /v1/version", function (t) {

  var config = require(path.join(__dirname, "package.json"))
  var server;

  async.series([

    // create the server
    function(next){
      createServer(function(err, s){
        if(err) return next(err)
        server = s
        next()
      })
    },

    // read the version from the API
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
      server.close()
      t.end()
      return
    }
    server.close()
    t.end()
  })

})


/*

  Query the api to check the projects we have saved are actually there
  
*/

tape("GET /v1/projects", function (t) {

  var projects;
  var server;

  async.series([

    // create the server
    function(next){
      createServer(function(err, s){
        if(err) return next(err)
        server = s
        next()
      })
    },
    
    // populate some projects
    function(next){
      var rawData = getProjectData(10)
      populateData(rawData, function(err, projectsReturned){
        if(err) return next(err)
        projects = projectsReturned;
        next()
      })
    },

    // test the length of projects matches
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
      server.close()
      t.end()
      return
    }
    server.close()
    t.end()
  })

})

/*

  seed the system with projects and retrieve one to check it's attributes

*/
tape("GET /v1/projects/:projectid", function (t) {

  var server;
  async.series([

    // create the server
    function(next){
      createServer(function(err, s){
        if(err) return next(err)
        server = s
        next()
      })
    },


    // populate some projects
    function(next){
      var rawData = getProjectData(10)
      populateData(rawData, function(err, projectsReturned){
        if(err) return next(err)
        projects = projectsReturned;
        next()
      })
    },

    // get a single project
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
      server.close()
      t.end()
      return
    }
    server.close()
    t.end()
  })

})

/*

  seed the system with projects and update one with known data to check it is updated

*/
tape("PUT /v1/projects/:projectid", function (t) {

  var projects;
  var server;

  async.series([

    // create the server
    function(next){
      createServer(function(err, s){
        if(err) return next(err)
        server = s
        next()
      })
    },

    // populate some projects
    function(next){
      var rawData = getProjectData(10)
      populateData(rawData, function(err, projectsReturned){
        if(err) return next(err)
        projects = projectsReturned;
        next()
      })
    },

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
      server.close()
      t.end()
      return
    }
    server.close()
    t.end()
  })

})


// seed the system with projects and delete one
tape("DELETE /v1/projects/:projectid", function (t) {

  var projects;
  var server;

  async.series([


    // create the server
    function(next){
      createServer(function(err, s){
        if(err) return next(err)
        server = s
        next()
      })
    },

    // populate some projects
    function(next){
      var rawData = getProjectData(10)
      populateData(rawData, function(err, projectsReturned){
        if(err) return next(err)
        projects = projectsReturned;
        next()
      })
    },

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
      server.close()
      t.end()
      return
    }
    server.close()
    t.end()
  })

})

/*

  unit test for the storage mechanism

*/
tape("jsonfile: create project", function(t){

  var storage = JSONFileStorage({
    memory:true
  })

  // create a project
  storage.create_project(jenca_user_id, {
    apples:10
  }, function(err){
    if(err) t.err(err.toString())
    var state = storage.get_state()

    var project_keys = Object.keys(state.users[jenca_user_id].projects)
    t.equal(project_keys.length, 1, "there is 1 project")

    var project_id = project_keys.pop()
    var project = state.users[jenca_user_id].projects[project_id]

    t.equal(project.apples, 10, "the project setting is set")
    t.deepEqual(project.containers, [], "there is an empty list of containers")

    t.end()
  })
})