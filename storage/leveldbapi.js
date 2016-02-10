var uuid = require('uuid');
var path = require('path');
var settings = require('../settings');
var dot = require('dot-object');
var Tools = require('./leveldbtools')

/*

   a general implementation of the jenca_projects
   storage interface

   it accepts any LevelUP instance to work with
  
*/
module.exports = function(db, opts){

  opts = opts || {}

  var tools = Tools(db)


  /*
  
    initialize a new id/container array for the project
    we write the project user a namespace for the userid
    
  */
  function create_project(userid, data, done){

    // initiate a project id
    var projectid = uuid.v1()
    data.id = projectid

    // initiate the container array with ids
    if(!data.containers) data.containers = [];
    data.containers.forEach(function(container){
      container.id = uuid.v1()
      container.host = data.project_host
    })

    // the indexes we write for projects live in the 
    // tools.writeProject -> tools.getProjectSaveBatch
    tools.writeProject(userid, projectid, data, done)
  }

  /*
  
    load the JSON blob and decode it as the project data
    
  */
  function get_project(userid, projectid, done){
    tools.get(tools.projectKey(userid, projectid), function(err, project){
      if(err) return done(err)
      done(null, JSON.parse(project))
    })
  }

  /*
  
    load a range of projects for the given user - decode each as JSON
    
  */
  function list_projects(userid, done){
    tools.get_range(tools.projectKey(userid), function(err, projects){
      if(err) return done(err)

      done(null, projects.map(function(result){
        return JSON.parse(result.value)
      }))
    })
  }

  /*
  
    remove a project for a user / id
    
  */
  function delete_project(userid, projectid, done){
    tools.deleteProject(userid, projectid, done)
  }

  /*
  
    write the given project data to storage
    this method assumes you have loaded the full data for the project first

    XXX: todo - write atomic updates at field level not record
    
  */
  function save_project(userid, projectid, data, done){
    tools.writeProject(userid, projectid, data, done)
  }

  return {
    create_project:create_project,
    get_project:get_project,
    list_projects:list_projects,
    delete_project:delete_project,
    save_project:save_project
  }
}