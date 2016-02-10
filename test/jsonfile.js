var tape = require("tape")
var async = require("async")
var JSONFileStorage = require("../storage/jsonfile")
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

  unit test for the storage mechanisms

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


