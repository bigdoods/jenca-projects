var uuid = require('uuid');
var path = require('path');
var settings = require('../settings');
var range = require('level-range');
var concat = require('concat-stream');

var KEY_DELIMITER = '~'

module.exports = function(db){

  /*
  
    low level set function that does not care for data type
    
  */
  function set(key, value, done){
    console.log("leveldb set "+ key + ":" + value)
    db.put(key, value, done)
  }

  /*
  
    low level get function
    
  */

  function get(key, done){
    db.get(key, function (err, value) {
      if (err){
        done(err)
        return
      }

      console.log("leveldb get "+ key + ":" + value)
      done(null, value)
    });
  }

  /*
  
    low level del function
    
  */
  function delkey(key, done){
    console.log("leveldb delkey "+ key)
    db.del(key, done)
  }

  /*
  
    low level range function - uses level-range
    
  */
  function get_range(key, done){

    console.log("leveldb range "+ key)
    range(db, key+KEY_DELIMITER)
      .on('error', function(err){
        done(err)
      })
      .pipe(concat(function(data){
        done(null, data)
      }))

  }


  function close(done){
    db.close()
    //con.close()
  }


  /*
  
    input: array of path chunks
    return: a full levelup key delimited by ~ (highest ascii value)
    
  */
  function levelKey(){
    var keys = Array.prototype.slice.call(arguments)
    return [settings.levelPrefix].concat(keys).join(KEY_DELIMITER)
  }

  /*
  
    typical key:

    projects~byuser~7838383~json~123 = {...}
    
  */
  function projectKey(userid, projectid, key){
    var args = ['byuser', userid]

    if(projectid){
      args.push('byproject')
      args.push(projectid)
    }

    if(key){
      args.push('keys')
      args.push(key)
    }

    return levelKey.apply(null, args)
  }

  /*
  
    a function to write a project to storage
    
  */
  function writeProject(userid, projectid, data, done){
    var batch = getProjectSaveBatch(userid, projectid, data)
    console.log('write project')
    console.dir(batch)
    db.batch(batch, function(err){
      if(err) return done(err)
      done(null, data)
    })
  }

  /*
  
    remove a project and it's indexes from storage
    
  */
  function deleteProject(userid, projectid, done){
    var batch = getProjectDeleteBatch(userid, projectid)
    db.batch(batch, done)
  }

  /*
  
    get the array of ops to update a project
    with the given id and JSON blob
    this is where to put hooks into indexes
    
  */
  function getProjectSaveBatch(userid, projectid, project){

    // at the moment we write a single JSON blob
    return [{
      type:'put',
      key:projectKey(userid, projectid),
      value:JSON.stringify(project)
    }]
  }

  /*
  
    get the array of ops to remove a project
    with the given id
    
  */
  function getProjectDeleteBatch(userid, projectid){

    // same just delete the JSON blob
    return [{
      type:'del',
      key:projectKey(userid, projectid)
    }]
  }

  return {
    get:get,
    set:set,
    get_range:get_range,
    delkey:delkey,
    close:close,
    levelKey:levelKey,
    projectKey:projectKey,
    getProjectSaveBatch:getProjectSaveBatch,
    getProjectDeleteBatch:getProjectDeleteBatch,
    writeProject:writeProject,
    deleteProject:deleteProject
  }
}