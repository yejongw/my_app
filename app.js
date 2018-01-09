var express  = require('express');
var app      = express();
var path     = require('path');
var mongoose = require('mongoose');
var session  = require('express-session');
var flash    = require('connect-flash');
var bodyParser     = require('body-parser');
var cookieParser   = require('cookie-parser');
var methodOverride = require('method-override');

// database
mongoose.connect("mongodb://test:testtest@ds019906.mlab.com:19906/my_db");
var db = mongoose.connection;
db.once("open",function () {
  console.log("DB connected!");
});
db.on("error",function (err) {
  console.log("DB ERROR :", err);
});

// view engine
app.set("view engine", 'ejs');

// middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(cookieParser());
app.use(methodOverride("_method"));
app.use(flash());
app.use(session({secret:'MySecret', resave: false, saveUninitialized:true}));
app.use(countVisitors);

// passport
var passport = require('./config/passport');
app.use(passport.initialize());
app.use(passport.session());

// routes
app.use('/', require('./routes/home'));
app.use('/users', require('./routes/users'));
app.use('/posts', checkQuery, require('./routes/posts'));

// start server
var port = process.env.PORT || 3000;
app.listen(port, function(){
  console.log('Server On!');
});

function countVisitors(req,res,next){
  if(!req.cookies.count&&req.cookies['connect.sid']){
    res.cookie('count', "", { maxAge: 3600000, httpOnly: true });
    var now = new Date();
    var date = now.getFullYear() +"/"+ now.getMonth() +"/"+ now.getDate();
    if(date != req.cookies.countDate){
      res.cookie('countDate', date, { maxAge: 86400000, httpOnly: true });

      var Counter = require('./models/Counter');
      Counter.findOne({name:"vistors"}, function (err,counter) {
        if(err) return next();
        if(counter===null){
          Counter.create({name:"vistors",totalCount:1,todayCount:1,date:date});
        } else {
          counter.totalCount++;
          if(counter.date == date){
            counter.todayCount++;
          } else {
            counter.todayCount = 1;
            counter.date = date;
          }
          counter.save();
        }
      });
    }
  }
  return next();
}

function checkQuery(req, res, next){
  if(req.originalMethod != "GET") return next();

  var path = req._parsedUrl.pathname;
  var queryString = req._parsedUrl.query?req._parsedUrl.query:"";
  if(queryString.indexOf("page=")<0){
    if(queryString.length !== 0 ) queryString += "&";
    queryString += "page=1";
  }
  if(queryString.indexOf("limit=")<0){
    queryString += "&limit=10";
  }
  if(queryString.indexOf("searchType=")<0){
    queryString += "&searchType=";
  }
  if(queryString.indexOf("searchText=")<0){
    queryString += "&searchText=";
  }

  if(queryString == req._parsedUrl.query){
    return next();
  } else {
    return res.redirect(path+"?"+queryString);
  }
}