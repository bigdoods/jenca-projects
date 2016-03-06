var path = require('path')
var http = require('http')
var fs = require('fs')
var Router = require('./router')
var settings = require('./settings')

var args = require('minimist')(process.argv, {
  alias:{
    p:'port',
    s:'storage',
    d:'datafile',
    lh:'levelhost',
    lp:'levelport'
  },
  default:{
    port:process.env.PORT || 80,
    storage:process.env.STORAGE || 'jsonfile',
    datafile:process.env.DATAFILE || settings.defaultFilePath,
    levelhost:process.env.LEVEL_HOST || '127.0.0.1',
    levelport:process.env.LEVEL_PORT || 80
  }
})

var storageoptions = {}

if(args.storage=='jsonfile'){
  storageoptions.datafile = args.datafile
}
else if(args.storage=='leveldb'){
  storageoptions.host = args.levelhost || ''
  if(storageoptions.host.indexOf('env:')){
    storageoptions.host = process.env[storageoptions.host.split(':')[1]]
  }
  storageoptions.port = args.levelport
}

var storage = require('./storage/' + args.storage)(storageoptions)
var router = Router({
  storage:storage,
  datafile:args.datafile
})

var server = http.createServer(router.handler)

server.listen(args.port, function(err){
  if(err){
    console.error(err.toString())
    return
  }
  console.log('server listening on port: ' + args.port)
})