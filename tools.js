module.exports = function(config){
  // e.g. http://1.2.3.4/v1/check
  var authenticate_route = config.authenticate

  // e.g. http://1.2.3.4/v1/authorize
  var authorize_route = config.authorize

  // connect to the authenticate service
  // check the status
  // write the X-JENCA-USER header
  function authenticate(data, done){

    var headers = Object.assign({}, data.headers, {
      'Content-Type': 'application/json'
    })

    var req = hyperquest(authenticate_route, {
      method:'GET',
      headers:headers
    })

    req.pipe(concat(function(result){
      console.log('have result from authenticate call:')
      console.log(result.toString())
      try {
        result = JSON.parse(result.toString())
      } catch (e){
        return done(e.toString())
      }
      
      done(null, result)
    }))

    req.on('error', function(err){
      console.error('authenticate call error:')
      console.error(err.toString())
      done(err.toString())
    })
  }

  // pass the headers from the front-end request
  // and the data passed back from the authentication servicoe
  // to the authorization service to decide if the user
  // can proceed with their request
  // we also pass the URL of the request (so it can decide)
  // the response is a JSON object with an "error" field
  // if the error field is set, then the request is denied
  function authorize(data, done){
    var req = hyperquest(authorize_route, {
      method:'POST',
      headers:data.headers
    })

    var sourceStream = from2(JSON.stringify(data))
    var destStream = concat(function(result){
      console.log('have result from authorize call:')
      console.log(result.toString())
      try{
        result = JSON.parse(result.toString())  
      } catch (e){
        return done(e.toString())
      }

      done(null, result)
    })

    sourceStream.pipe(req).pipe(destStream)

    req.on('error', function(err){
      done(err.toString())
    })
  }

  return {
    authenticate:authenticate,
    authorize:authorize
  }
}
