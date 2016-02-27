var multilevel = require('multilevel');
var net = require('net');
var api = require('./leveldbapi')

module.exports = function(opts){

  opts = opts || {}

  var db = multilevel.client();
  var con = net.connect(opts.port, opts.host);
  con.pipe(db.createRpcStream()).pipe(con);

  return api(db, opts)
}