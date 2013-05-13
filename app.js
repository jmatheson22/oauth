var express = require('express')
  , passport = require('passport')
  , util = require('util')
  , Sequelize = require('sequelize')
  , GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

//  set up database
var sequelize = new Sequelize('loginTest', 'root', 'root', {port: 8889});

var User = sequelize.define('User', {
  // define schema
  email: Sequelize.STRING,
  name: Sequelize.STRING,
  picture: Sequelize.STRING
})


// API Access link for creating client ID and secret:
// https://code.google.com/apis/console/
var GOOGLE_CLIENT_ID = "777993728481-buafnolpemqmfobgefchlrd2ek9v4s10.apps.googleusercontent.com";
var GOOGLE_CLIENT_SECRET = "Eo4W2jv606_Hzkx20774Retg";


// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Google profile is
//   serialized and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


// Use the GoogleStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Google
//   profile), and invoke a callback with a user object.
passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/oauth2callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // To keep the example simple, the user's Google profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Google account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }
));


var app = express();

// configure Express
app.set('view engine', 'ejs');
app.use(express.logger());
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.session({ secret: 'keyboard cat' }));
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(__dirname + '/public'));


app.get('/', function(req, res){
  res.render('index', { user: req.user });
});

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user });
});

// GET /auth/google
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Google authentication will involve
//   redirecting the user to google.com.  After authorization, Google
//   will redirect the user back to this application at /auth/google/callback
app.get('/auth/google',
  passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/userinfo.profile',
                                            'https://www.googleapis.com/auth/userinfo.email'] }),
  function(req, res){
    // The request will be redirected to Google for authentication, so this
    // function will not be called.
  });

// GET /auth/google/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/oauth2callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // this has lots of user info, including email, photos and more...
    // we will want to write parts of this to the database with a findOrCreate call from sequelize
    console.log(req.user);
    /*
        { provider: 'google',
      id: '104088215828645127325',
      displayName: 'James Matheson',
      name: { familyName: 'Matheson', givenName: 'James' },
      emails: [ { value: 'jmatheson12@gmail.com' } ],
      _raw: '{\n "id": "104088215828645127325",\n "email": "jmatheson12@gmail.com",\n "verified_email": true,\n "name": "James Matheson",\n "given_name": "James",\n "family_name": "Matheson",\n "link": "https://plus.google.com/104088215828645127325",\n "picture": "https://lh3.googleusercontent.com/-kbCQu9Br178/AAAAAAAAAAI/AAAAAAAAAAA/GJgDjCaZn3E/photo.jpg",\n "gender": "male",\n "birthday": "0000-07-03",\n "locale": "en"\n}\n',
      _json: 
       { id: '104088215828645127325',
         email: 'jmatheson12@gmail.com',
         verified_email: true,
         name: 'James Matheson',
         given_name: 'James',
         family_name: 'Matheson',
         link: 'https://plus.google.com/104088215828645127325',
         picture: 'https://lh3.googleusercontent.com/-kbCQu9Br178/AAAAAAAAAAI/AAAAAAAAAAA/GJgDjCaZn3E/photo.jpg',
         gender: 'male',
         birthday: '0000-07-03',
         locale: 'en' } 
        }
     */
     var user = req.user._json;
    User.findOrCreate(
      {email: user.email}, //find
      {name: user.name, picture: user.picture}    //creates
    ).success(function(user){
      res.json(user);
    });

    
  });



app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.listen(3000);


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
}
