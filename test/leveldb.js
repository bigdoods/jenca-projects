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



tape("leveldb test: create project", function(t){

  // this is a 'test-level' which gives us a fresh level API
  // this is a mock for the multilevel client which is also
  // the level API
  var db = level('tests');

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
  var client
  var server

  async.series([
    function(next){
      createLevelServer(function(err, con){
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



/*

  pass a LevelUP api of some kind to test
  the project creation / listing loop

*/

function runCreateProjectTest(t, db, done){
  
  var storage = levelDBStorageAPI(db)
  
  async.series([

    function(next){
      // create a project
      storage.create_project(jenca_user_id, {
        apples:"10"
      }, function(err, project){

        if(err){
          next(err)
          return
        }

        t.equal(typeof(project.id), 'string', 'the project id is a string')

        storage.list_projects(jenca_user_id, function(err, projects){
          if(err) return next(err)
          
          t.equal(projects.length, 1, "there is 1 project")


          var project = projects[0]

          t.equal(project.apples, "10", "the project setting is set")
          t.deepEqual(project.containers, [], "there is an empty list of containers")

          next()
        })
      })
    }
  ], done)
}

function createLevelServer(done){
  
  var db = level('multilevel-tests');
  
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

