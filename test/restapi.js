var tape = require("tape")
var async = require("async")
var Router = require("../router")
var path = require("path")
var http = require("http")
var from2 = require("from2-string")
var hyperquest = require("hyperquest")
var hyperrequest = require("hyperrequest")
var concat = require("concat-stream")
var settings = require('../settings')


var jenca_user_id = "banana-man"
var testing_port = 8060
var subject_project_index = 5


/*

  boot a test server for each test so the state from one
  does not affect another test

*/
function createServer(opts, done){

  // allow no options to be passed just
  // the callback
  if(arguments.length==1){
    done = opts
    opts = {}
  }

  // keep the storage in memory for the tests
  var router = Router({
    memory:true,
    // a mock authenticator function
    // it returns immediately with a fixed user
    authenticator:function(req, done){
      if(opts.authenticatorSpy){
        opts.authenticatorSpy(req)
      }
      done(null, {
        email:jenca_user_id,
        is_authenticated:true
      })
    },
    // a mock containerizer function
    // it returns immediately with some fixture data
    containerizer:function(req, done){
      // allows a test to see what requests
      // were sent to the containerizer
      if(opts.containerizerSpy){
        opts.containerizerSpy(req)
      }
      switch(req.action) {
        case 'start':
          done(null, {
            // put the data the containerizer would return for a start
          })
          break;
        case 'stop':
          done(null, {
            // put the data the containerizer would return for a start
          })
          break;
        default:
          done('un recognized containerizer action: ' + req.action)
      }
    }
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
        json: data
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
tape("GET /v1/projects/version", function (t) {

  var config = require(path.join(__dirname, '..', "package.json"))
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
      var req = hyperquest("http://127.0.0.1:"+testing_port+"/v1/projects/version", {
        method:"GET"
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
        method:"GET"
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
        method:"GET"
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
        json:projects[subject_project_index]
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
        method:"GET"
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
        method:"DELETE"
      }, function(err, resp){
        if(err) return subnext(err)

        t.equal(resp.statusCode, 200, "The status code == 200")
        next()
      });

    },

    function(next){
      hyperrequest({
        "url":"http://127.0.0.1:"+ testing_port +"/v1/projects",
        method:"GET"
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


// seed the system with projects and start one then stop it
tape("PUT /v1/projects/:projectid/status", function (t) {

  var projects;
  var server;

  var containerizerRequests = []

  async.series([


    // create the server
    function(next){
      createServer({
        containerizerSpy:function(req){
          console.log('-------------------------------------------');
          console.log('containerizer spy')
          console.dir(req)
          containerizerRequests.push(req)
        }
      }, function(err, s){
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
        "url":"http://127.0.0.1:"+testing_port+"/v1/projects/"+ projects[subject_project_index].id + "/status",
        method:"PUT",
        json:{
          running:true
        }
      }, function(err, resp){
        if(err) return subnext(err)

        t.equal(resp.statusCode, 200, "The status code == 200")
        t.equal(containerizerRequests.length, 1, "There is 1 containerizer request")
        t.equal(containerizerRequests[0].action, "start", "It is a start request")
        next()
      });

    },

    function(next){
      
      var req = hyperrequest({
        "url":"http://127.0.0.1:"+testing_port+"/v1/projects/"+ projects[subject_project_index].id + "/status",
        method:"PUT",
        json:{
          running:false
        }
      }, function(err, resp){
        if(err) return subnext(err)

        t.equal(resp.statusCode, 200, "The status code == 200")
        t.equal(containerizerRequests.length, 2, "There are 2 containerizer requests")
        t.equal(containerizerRequests[1].action, "stop", "It is a stop request")
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



