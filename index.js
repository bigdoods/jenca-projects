var path = require('path')
var http = require('http')
var fs = require('fs')
var Router = require('./router')

var args = require('minimist')(process.argv, {
  alias:{
    p:'port',
    s:'storage',
    d:'datafile'
  },
  default:{
    port:process.env.PORT || 80,
    storage:process.env.STORAGE || 'jsonfile',
    datafile:process.env.DATAFILE || '/tmp/jencadata.json',
  }
})

var storage = require('storage/' + args.storage)(args)
var router = Router({
  storage:storage,
  datafile:datafile
})

var server = http.createServer(router.handler)

server.listen(args.port, function(err){
  if(err){
    console.error(err.toString())
    return
  }
  console.log('server listening on port: ' + args.port)
})