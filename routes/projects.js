var path = require('path')
var JSONFileStorage = require('../storage/jsonfile')
var concat = require('concat-stream')

module.exports = function(config){

  var storage = JSONFileStorage(config)

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
    show:{
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
          storage.save_project(req.headers['x-jenca-user'], opts.params.projectid, JSON.parse(req.body), function(err, data){
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
    }
  }
}