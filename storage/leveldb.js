var multilevel = require('multilevel');
var net = require('net');
var uuid = require('uuid');
var path = require('path');
var settings = require('../settings');
var dot = require('dot-object');

module.exports = function(opts){

  opts = opts || {}

  var db = multilevel.client();
  var con = net.connect(settings.leveldbPort);
  con.pipe(db.createRpcStream()).pipe(con);

  function is(type, obj) {
      var clas = Object.prototype.toString.call(obj).slice(8, -1);
      return obj !== undefined && obj !== null && clas === type;
  }

  function save_data(prefix, o){
    Object.keys(o).forEach(function(key) {
      var val = o[key];

      switch(true){
        case is('Object', val):
          save_data(prefix+"."+key, val)
          break
        case is('Array', val):
          val.forEach(function(value, index) {
            set(prefix+"."+index, value, function(){})
          })
          break
        default:
          set(prefix+"."+key, val, function(){})
      }
    });
  }


  function create_project(userid, data, done){
    var projectid = uuid.v1()
    data.id = projectid
    if(!data.containers) data.containers = [];

    data.containers.forEach(function(container){
      container.id = uuid.v1()
      container.host = data.project_host
    })

    var user = {}
    user[userid] = {"projects":{}}
    user[userid]["projects"][projectid] = data

    save_data(settings.levelPrefix, {"users":user})
    done(null, data)
  }

  function project_running(userid, data, done){
    var user = get(settings.levelPrefix +".users."+userid)
    if(!user){
      done('there is no user with id: ' + userid)
      return
    }

    var project = user.projects[data.id]
    project.containers = data.containers
    save_data(settings.levelPrefix, {"users":user})
    done(null, project)
  }

  function get_project(userid, projectid, done){
    var user = get(settings.levelPrefix +".users."+userid)
    if(!user){
      done('there is no user with id: ' + userid)
      return
    }

    if(!user.projects[projectid]){
      done('there is no project with id: ' + projectid)
      return
    }

    var project = user.projects[projectid]
    done(null, project)
  }

  function list_projects(userid, done){
    var user = get(settings.levelPrefix +".users."+userid)
    if(!user){
      done('there is no user with id: ' + userid)
      return
    }

    var projects = Object.keys(user.projects).map(function(projectid){
      return user.projects[projectid]
    })
    done(null, projects)
  }

  function delete_project(userid, projectid, done){
    var user = get(settings.levelPrefix +".users."+userid)
    if(!user){
      done('there is no user with id: ' + userid)
      return
    }

    delkey(settings.levelPrefix +".users."+ userid +".projects."+ projectid +".*")
    done()
  }

  function save_project(userid, projectid, data, done){
    var user = get(settings.levelPrefix +".users."+userid)
    if(!user){
      done('there is no user with id: ' + userid)
      return
    }
    var project = user.projects[projectid]
    Object.keys(data).forEach(function(prop){
      project[prop] = data[prop]
    })
    save_data(settings.levelPrefix, {"users":user})
    done(null, project)
  }










  /* level db getters and setters */
  function set(key, value){
    console.log("leveldb set "+ key + ":" + value)
    db.put(key, value, function (err) {
      if (err) throw err;
    })
  }

  function delkey(key){
    console.log("leveldb delkey "+ key)
    db.del(key, function (err, value) {
      if (err) throw err;
    });
  }

  function get(key){
    // check for range key
    if(is("Object", key) || (is("String", key) && key.indexOf("*") >=0)){
      var found_values = {}

      client.db.createReadStream(key)
      .on('data', function (data) {
        found_values[data.key] = data.value
      })
      .on('error', function (err) {
        next(err)
      })
      .on('end', function () {
        console.log("leveldb get stream "+ key)
        console.dir(found_values)
        dot.object(found_values);
        return found_values
      })
    }else{
      var value = db.get(key, function (err, value) {
        if (err) throw err;
        console.log("leveldb get "+ key + ":" + value)
        return value
      });
    }
  }

/*  function get_default(key, default_value, cb){
    get(key, function (err, value) {
      console.dir(value)
      if(!value) // better check for a nonexistant key needed
        value = default_value

      cb(err, key, value, default_value)
    })
  }*/

  return {
    create_project:create_project,
    project_running:project_running,
    get_project:get_project,
    list_projects:list_projects,
    delete_project:delete_project,
    save_project:save_project,
  }
}