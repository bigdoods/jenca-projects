var path = require('path')
var JSONFileStorage = require('../storage/jsonfile')

var storage = JSONFileStorage({
  memory:true
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

        var post_body = '';
        req.on('data', function(chunk) {
          post_body += chunk.toString()
        });

        req.on('end', function() {
          storage.create_project(req.headers['x-jenca-user'], JSON.parse(post_body), function(err, data){
            res.end(JSON.stringify(data))
          })
        });

      }

    }
  },
  show:function(){
    return {
      GET:function(req, res, opts, cb){
        res.setHeader('content-type', 'application/json')
        storage.get_project(req.headers['x-jenca-user'], 1, function(err, data){
          res.end(data)
        })
      }
    }
  }
}