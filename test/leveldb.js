var tape = require("tape")
var async = require("async")
var levelDBStorage = require("../storage/leveldb")
var levelDBStorageAPI = require("../storage/leveldbapi")
var path = require("path")
var concat = require("concat-stream")
var settings = require('../settings')
var multilevel = require('multilevel');
var net = require('net');

var level = require('level-test')()


var jenca_user_id = "banana-man"
var testing_port = 8060
var subject_project_index = 5



tape("leveldb memory: create project", function(t){

  // this is a 'test-level' which gives us a fresh level API
  // this is a mock for the multilevel client which is also
  // the level API
  var db = level('memory-test1');

  runCreateProjectTest(t, db, function(err){
    if(err){
      t.error(err)
      db.close()
      return
    }
    db.close()
    t.end()
  })
})

tape("leveldb multilevel: create project", function(t){

  // this is a 'test-level' which gives us a fresh level API
  // this is a mock for the multilevel client which is also
  // the level API
  var db = level('multilevel-test1');
  var client
  var server

  async.series([
    function(next){
      createLevelServer(db, function(err, con){
        if(err) return next(err)
        server = con
        next()
      })
    },

    function(next){
      createLevelClient(function(err, cl){
        if(err) return next(err)
        client = cl
        next()
      })
    },

    function(next){
      runCreateProjectTest(t, client, next)
    }
  ], function(err){
    client.close()
    server.close()
    if(err){
      t.error(err)
      return
    }
    t.end()
  })
})


tape("leveldb memory: create/list/delete projects", function(t){

  // this is a 'test-level' which gives us a fresh level API
  // this is a mock for the multilevel client which is also
  // the level API
  var db = level('memory-test2');

  runMultipleProjectsTest(t, db, function(err){
    if(err){
      t.error(err)
      db.close()
      return
    }
    db.close()
    t.end()
  })
})

tape("leveldb multilevel: create/list/delete projects", function(t){

  // this is a 'test-level' which gives us a fresh level API
  // this is a mock for the multilevel client which is also
  // the level API
  var db = level('multilevel-test2');
  var client
  var server

  async.series([
    function(next){
      createLevelServer(db, function(err, con){
        if(err) return next(err)
        server = con
        next()
      })
    },

    function(next){
      createLevelClient(function(err, cl){
        if(err) return next(err)
        client = cl
        next()
      })
    },

    function(next){
      runMultipleProjectsTest(t, client, next)
    }
  ], function(err){
    client.close()
    server.close()
    if(err){
      t.error(err)
      return
    }
    t.end()
  })
})

/*

  make a single project and check we can load it again

*/

function runCreateProjectTest(t, db, done){
  
  var storage = levelDBStorageAPI(db)
  
  async.waterfall([

    function(next){
      // create a project
      storage.create_project(jenca_user_id, {
        apples:"10"
      }, next)

    },

    function(project, next){

      t.equal(typeof(project.id), 'string', 'the project id is a string')

      storage.list_projects(jenca_user_id, function(err, projects){
        if(err) return next(err)
        
        t.equal(projects.length, 1, "there is 1 project")


        var project = projects[0]

        t.equal(project.apples, "10", "the project setting is set")
        t.deepEqual(project.containers, [], "there is an empty list of containers")

        next()
      })
    
    }

  ], done)
}


/*

  insert projects from different users and then check we have them in a list
  
*/
function runMultipleProjectsTest(t, db, done){

  /*
  
    some data we will insert against each user
    
  */
  var data = [{
    user:'bob',
    project:{
      name:'Apples'
    }
  },{
    user:'alice',
    project:{
      name:'Oranges'
    }
  },{
    user:'bob',
    project:{
      name:'Pears'
    }
  },{
    user:'alice',
    project:{
      name:'Peaches'
    }
  },{
    user:'alice',
    project:{
      name:'Lemons'
    }
  }]

  var deleteProject = null
  
  var storage = levelDBStorageAPI(db)
  
  async.series([

    /*
    
      insert the project data
      
    */
    function(next){
      async.series(data.map(function(d){
        return function(next_project){
          storage.create_project(d.user, d.project, next_project)
        }
      }), next)
    },

    /*
    
      check that alice has 3 projects
      
    */
    function(next){
     
      storage.list_projects('alice', function(err, projects){
        if(err) return next(err)
        
        t.equal(projects.length, 3, "there are 3 projects")

        deleteProject = projects[1]

        t.equal(deleteProject.name, "Peaches", "the project setting is set")

        next()
      })
      
    },


    /*
    
      check we can read a project by its id
      
    */
    function(next){
      storage.get_project('alice', deleteProject.id, function(err, project){
        if(err) return next(err)

        t.equal(project.name, "Peaches")
        next()
      })
    },

    /*
    
      delete the project
      
    */
    function(next){
      storage.delete_project('alice', deleteProject.id, next)
    },

    /*
    
      check alice has 2 projects
      
    */
    /*
    
      check that alice has 3 projects
      
    */
    function(next){
     
      storage.list_projects('alice', function(err, projects){
        if(err) return next(err)
        
        t.equal(projects.length, 2, "there are 2 projects")

        next()
      })
      
    },


  ], done)
}

function createLevelServer(db, done){
  
  var server = net.createServer(function (connection) {
    connection.pipe(multilevel.server(db)).pipe(connection);
  })

  server.listen(8889, function(){
    console.log('multilevel server listening')
    done(null, server)
  });

}

function createLevelClient(done){

  var db = multilevel.client();
  var con = net.connect(8889);
  con.pipe(db.createRpcStream()).pipe(con);

  done(null, db)

}

