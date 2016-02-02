var fs = require('fs');
var uuid = require('uuid');
var path = require('path');
var settings = require('../settings');

/*

  var state = {
    users:{
      user1:{
        projects:{
          56:{
            name:'test',
            containers:{
              test:{

              },
              bimserver:{

              }
            }
          }
        }
      }
    }
  }

*/

module.exports = function(opts){

  opts = opts || {}
  var state = {}

  var file = opts.datafile || settings.defaultFilePath
  if(!fs.existsSync(file)){
    save_data()
  }
  reset_state()

  function reset_state(){
    state = {
      users:{}
    }
  }

  function save_data(){
    if(opts.memory) return
    fs.writeFileSync(file, state, 'utf8', (err) => {
      if (err) throw err;
    })
  }

  function ensure_user(id){
    if(!state.users[id]){
      state.users[id] = {
        projects:{}
      }
    }
    return state.users[id]
  }

  function create_project(userid, data, done){
    var id = uuid.v1()
    var user = ensure_user(userid)
    user.projects[id] = data
    data.id = id
    if(!data.containers) data.containers = [];
    data.containers.forEach(function(container){
      container.id = uuid.v1()
      container.host = data.project_host
    })
    save_data()
    done(null, data)
  }

  function project_running(userid, data, done){
    if(!state.users[userid]){
      done('there is no user with id: ' + userid)
      return
    }
    var user = state.users[userid]
    var project = user.projects[data.id]
    project.containers = data.containers
    save_data()
    done(null, project)
  }

  function get_project(userid, projectid, done){
    if(!state.users[userid]){
      done('there is no user with id: ' + userid)
      return
    }

    if(!state.users[userid].projects[projectid]){
      done('there is no project with id: ' + projectid)
      return
    }

    var user = state.users[userid]
    var project = user.projects[projectid]
    done(null, project)
  }

  function list_projects(userid, done){
    if(!state.users[userid]){
      done('there is no user with id: ' + userid)
      return
    }
    var user = state.users[userid]

    var projects = Object.keys(user.projects).map(function(projectid){
      return user.projects[projectid]
    })
    done(null, projects)
  }

  function delete_project(userid, projectid, done){
    if(!state.users[userid]){
      done('there is no user with id: ' + userid)
      return
    }
    var user = state.users[userid]
    delete(user.projects[projectid])
    done()
  }

  function save_project(userid, projectid, data, done){
    if(!state.users[userid]){
      done('there is no user with id: ' + userid)
      return
    }
    var user = state.users[userid]
    var project = user.projects[projectid]
    Object.keys(data).forEach(function(prop){
      project[prop] = data[prop]
    })
    save_data()
    done(null, project)
  }

  function get_state(){
    return state
  }

  return {
    create_project:create_project,
    project_running:project_running,
    get_project:get_project,
    list_projects:list_projects,
    delete_project:delete_project,
    save_project:save_project,
    get_state:get_state,

    reset_state:reset_state
  }
}