var path = require('path')
var http = require('http')
var fs = require('fs')
var Router = require('./router')
var settings = require('./settings')
var request = require('hyperrequest')

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
    levelport:process.env.LEVEL_PORT || 80,
    runtimehost:process.env.RUNTIME_HOST || '127.0.0.1',
    runtimeport:process.env.RUNTIME_PORT || 80,
    authhost:process.env.AUTH_HOST || '127.0.0.1',
    authport:process.env.AUTH_PORT || 80,
  }
})

function processArg(value){
  value = value || ''
  if(value.indexOf('env:')){
    value = process.env[value.split(':')[1]]
  }
  return value
}

var storageoptions = {}

if(args.storage=='jsonfile'){
  storageoptions.datafile = args.datafile
}
else if(args.storage=='leveldb'){
  storageoptions.host = processArg(args.levelhost || '')
  storageoptions.port = args.levelport
}

/*

  we will put an api call to the runtime service here
  
*/
function containerizer(opts, done){
  hyperrequest({
    url: "http://" + processArg(args.runtimehost) + ":"+ args.runtimeport +"/v1/" + opts.action,
    method: "POST",
    headers:{
      'x-jenca-user':opts.user,
      'Content-type':'application/json'
    },
    json:true,
    body:opts.project
  }, function(err, resp){

    if(err) return done(err.toString())

    done(null, resp.body)
  })
}

/*

  we will put an api call to the authentication service here
  
*/

function authenticator(req, done){
  hyperrequest({
    url: "http://" + processArg(args.authhost) + ":"+ args.authport +"/status",
    method: "GET",
    headers:{
      'set-cookie':req.headers['set-cookie'],
      'Content-type':'application/json'
    },
    json:true
  }, function(err, resp){

    if(err) return done(err.toString())

    done(null, resp.body)
  })
}

var storage = require('./storage/' + args.storage)(storageoptions)
var router = Router({
  storage:storage,
  datafile:args.datafile,
  containerizer:containerizer,
  authenticator:authenticator
})

var server = http.createServer(router.handler)

server.listen(args.port, function(err){
  if(err){
    console.error(err.toString())
    return
  }
  console.log('server listening on port: ' + args.port)
})