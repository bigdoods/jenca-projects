var path = require('path')
var JSONFileStorage = require('../storage/jsonfile')
var concat = require('concat-stream')

module.exports = function(config){

  var storage = config.storage || JSONFileStorage(config)
  var containerizer = config.containerizer

  if(!containerizer){
    throw new Error('the projects router needs a containerizer function')
  }

  return {
    index:{
      GET:function(req, res, opts, cb){
        res.setHeader('content-type', 'application/json')
        storage.list_projects(req.headers['x-jenca-user'], function(err, data){
          if(err){
            res.statusCode = 500;
            res.end(err.toString());
            return;
          }

          res.end(JSON.stringify(data))
        })
      },
      POST:function(req, res, opts, cb){
        res.setHeader('content-type', 'application/json')

        req.pipe(concat(function(body){
          body = JSON.parse(body.toString())

          storage.create_project(req.headers['x-jenca-user'], body, function(err, data){
            if(err){
              res.statusCode = 500;
              res.end(err.toString());
              return;
            }

            // trigger build and upload of kubernetes manifest
            res.statusCode = 201
            res.end(JSON.stringify(data))
          })
        }))

      }

    },
    project:{
      GET:function(req, res, opts, cb){
        res.setHeader('content-type', 'application/json')
        storage.get_project(req.headers['x-jenca-user'], opts.params.projectid, function(err, data){
          if(err){
            res.statusCode = 500;
            res.end(err.toString());
            return;
          }
          res.end(JSON.stringify(data))
        })
      },
      PUT:function(req, res, opts, cb){
        res.setHeader('content-type', 'application/json')

        req.pipe(concat(function(body){
          body = JSON.parse(body.toString())
          storage.save_project(req.headers['x-jenca-user'], opts.params.projectid, body, function(err, data){
            if(err){
              res.statusCode = 500;
              res.end(err.toString());
              return;
            }
            // trigger build and upload of updated kubernetes manifest
            res.end(JSON.stringify(data))
          })
        }))
       
      },
      DELETE:function(req, res, opts, cb){
        res.setHeader('content-type', 'application/json')
        storage.delete_project(req.headers['x-jenca-user'], opts.params.projectid, function(err, data){
          if(err){
            res.statusCode = 500;
            res.end(err.toString());
            return;
          }
          // trigger kubernetes to kill of relevant containers
          res.end()
        })
      }
    },
    status:{
      GET:function(req, res, opts, cb){
        res.setHeader('content-type', 'application/json')

        storage.get_project(req.headers['x-jenca-user'], opts.params.projectid, function(err, project){
          if(err){
            res.statusCode = 500;
            res.end(err.toString());
            return;
          }

          res.end(JSON.stringify({
            running:project.running,
            runState:project.runState
          }))
        })
      },
      PUT:function(req, res, opts, cb){
        res.setHeader('content-type', 'application/json')

        req.pipe(concat(function(body){

          body = JSON.parse(body.toString())

          storage.get_project(req.headers['x-jenca-user'], opts.params.projectid, function(err, project){
            if(err){
              res.statusCode = 500;
              res.end(err.toString());
              return;
            }

            // this is a no-op
            if(body.running == project.running){
              res.statusCode = 200
              res.end({
                running:project.running
              })
              return
            }

            var containerizerAction = body.running ? 'start' : 'stop'

            containerizer({
              user:req.headers['x-jenca-user'],
              action:containerizerAction,
              project:project
            }, function(err, runState){
              if(err){
                res.statusCode = 500
                res.end(err.toString())
                return
              }
              project.running = body.running
              project.runState = runState
              storage.save_project(req.headers['x-jenca-user'], opts.params.projectid, project, function(err, data){
                if(err){
                  res.statusCode = 500
                  res.end(err.toString())
                  return
                }
                res.end(JSON.stringify(runState))
              })
            })
            

          })

        }))
      }
    }
  }
}