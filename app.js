var http = require('http');
var url = require('url');
var fs = require("fs");
var child = require('child_process');
var powerOff = require('power-off');
var MongoClient = require("mongodb").MongoClient;
var mongoose = require('mongoose');
var querystring = require('querystring');
var moment = require('moment');
require("moment-duration-format");

var uri = "mongodb://pvharmo:ydiorAeYdyBigjpr@timer-shard-00-00-n27uq.mongodb.net:27017,timer-shard-00-01-n27uq.mongodb.net:27017,timer-shard-00-02-n27uq.mongodb.net:27017/Timer?ssl=true&replicaSet=Timer-shard-0&authSource=admin";
var idleTimeTrigger = 5*60;
var idle = true;
var start = {};
var shutdown = false;


MongoClient.connect(uri, function(err, db) {
  db.createCollection("timer", function(err, res) {
    if (err) throw err;
    console.log("Collection created!");
  });
});

var insertDoc = function(start, end, time, user, db, callback) {
  var collection = db.collection('timer');
  startISO = new Date(start*1000).toISOString();
  endISO = new Date(end*1000).toISOString();
  collection.insertOne({
    start:new Date(startISO),
    end:new Date(endISO),
    time,
    user
  });
}

/*setInterval(function(){
  child.exec("xprintidle", function(error,res) {
    var idleTime = res/1000;

    if (error) {
      console.error(error);
    }

    //console.log(idleTime);
    //console.log(idle);

    if (idleTime > idleTimeTrigger && idle == false && !error) {

      var end = moment().format('X') - idleTimeTrigger;
      var time = end - start;
      console.log("time : " + time);
      MongoClient.connect(uri, function(err, db) {
        insertDoc(start, end, time, db, function() {
          console.log("Doc inserted!");
        });
      });
      idle = true;

    } else if (idleTime < idleTimeTrigger && idle == true && !error) {

      start = moment().format('X')
      idle = false;

    } else if (shutdown) {

      var end = moment().format();
      var time = end.diff(start, 'minutes');
      MongoClient.connect(uri, function(err, db) {
        insertDoc(start, end, time, db);
        console.log("Doc inserted !");
        db.close();
      });
      setTimeout(function(){
        powerOff();
      }, 1000);
    }
  });
},1000);*/

var app = http.createServer(function(req, res) {
  var pathname = url.parse(req.url).pathname;
  var params = querystring.parse(url.parse(req.url).query);
  if (pathname == "/start") {

    console.log("start");

    start[params['user']] = moment().format('X');

    res.writeHead(404);

  } else if (pathname == "/stop") {

    console.log("stop");

    var end = moment().format('X') - (Number(params['timeout'])/1000);
    var time = end - start[params['user']];
    var user = params['user'];

    MongoClient.connect(uri, function(err, db) {
      insertDoc(start[params['user']], end, time, user, db, function(error) {
        if (error) {
          console.error(error);
        } else {
          console.log("Doc inserted!");
        }
      });
    });

    res.writeHead(404);

  } else {

    var list = "";

    MongoClient.connect(uri, function(err, db) {

      db.collection('timer').aggregate(
        [{
          $match: {
            user:params['user']
          }
        },
        {
          $group: {
            _id: {
              day: {$dayOfMonth: "$start"},
              month: {$month: "$start"},
              year: {$year: "$start"}
            },
            time: {$sum: "$time"},
            start: {$first: "$start"}
          }
        }],
        function(err, docs) {
          if (err) {
            console.log(err);
          }
          console.log(docs);

          res.writeHead(200, {'Content-Type': 'text/html'});

          for (var i = 0; i < docs.length; i++) {
            var duration = moment.duration(docs[i].time, 'seconds');
            list += moment(docs[i].start).format("dddd D MMMM YYYY");
            list += " : ";
            list += duration.format("h[h] m[min] s[s]");
            list += "<br>";
          }

          res.end(list);
        }
      );

    });
  }
}).listen(8080);
