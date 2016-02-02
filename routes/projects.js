var path = require('path')
var JSONFileStorage = require('../storage/jsonfile')

var storage = JSONFileStorage({
  memory:false
})

module.exports = {
  index:function(){
    return {
      GET:function(req, res, opts, cb){
        res.setHeader('content-type', 'application/json')
        storage.list_projects(req.headers['x-jenca-user'], function(err, data){
          res.end(JSON.stringify(data))
        })
      },
      POST:function(req, res, opts, cb){
        res.setHeader('content-type', 'application/json')

        req.body = '';
        req.on('data', function(chunk) {
          req.body += chunk.toString()
        });

        req.on('end', function() {
          storage.create_project(req.headers['x-jenca-user'], JSON.parse(req.body), function(err, data){
            if(err) return
            res.statusCode = 201
            res.end(JSON.stringify(data))
          })

          // trigger build and upload of kubernetes manifest
        });

      }

    }
  },
  show:function(){
    return {
      GET:function(req, res, opts, cb){
        res.setHeader('content-type', 'application/json')
        storage.get_project(req.headers['x-jenca-user'], opts.params.projectid, function(err, data){
          res.end(JSON.stringify(data))
        })
      },
      PUT:function(req, res, opts, cb){
        res.setHeader('content-type', 'application/json')

        req.body = '';
        req.on('data', function(chunk) {
          req.body += chunk.toString()
        });

        req.on('end', function() {
          storage.save_project(req.headers['x-jenca-user'], opts.params.projectid, JSON.parse(req.body), function(err, data){
            res.end(JSON.stringify(data))
          })

          // trigger build and upload of updated kubernetes manifest
        })
      },
      DELETE:function(req, res, opts, cb){
        res.setHeader('content-type', 'application/json')
        storage.delete_project(req.headers['x-jenca-user'], opts.params.projectid, function(err, data){
          res.end()
        })

        // trigger kubernetes to kill of relevant containers
      }
    }
  }
}