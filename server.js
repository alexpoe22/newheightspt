const path = require('path');
const express = require('express');
const stormpath = require('express-stormpath');
const bodyParser = require('body-parser');
const webpack = require('webpack');
const config = require('./webpack.config');
const app = express();
const compiler = webpack(config);
const Yelp = require('yelpv3');
require('dotenv').config();
var knex = require('knex')({
  client: 'pg',
  connection: process.env.DB_LINK
});
app.use(bodyParser.json());
app.use(require('webpack-dev-middleware')(compiler, {
  noInfo: true,
  publicPath: config.output.publicPath
}));
app.use(stormpath.init(app, {
  web: {
    produces: ['application/json']
  }
}));
var user; 
app.get('/profile', stormpath.getUser, function (req, res) {
   if (req.user) {
    user = req.user.email;
    console.log(user)
    res.end();
   } else {
     res.send('Not logged in');
   }

 });
app.get('/userdata', (req, res) => {
  knex('hoursportland').select('*').then((data) => {
    console.log('server', data);
    return res.status(200).json({data})
  })
})
//hits error block but works??
app.post('/userdata', (req, res) => {
  const body = req.body;
  knex.insert({
    pts           : body.pt,
    hourstotal    : body.hourstotal,
    clinichours   : body.clinichours,
    target        : body.target,
    visitsperhour : body.visitsperhour,
    target2       : body.target2

  }).into('hoursportland').then(id => {
    console.log(id);
    return res.status(201).json({})
  }).catch(e => {
    console.error(e);
    res.sendStatus(500);
  })
});
app.put('/userdata', (req, res) => {
  let body = req.body;
  console.log('server:' , body);
  knex('hoursportland').where({
    id            : body.id
  }).update({
    pts           : body.pt,
    hourstotal    : body.hourstotal,
    clinichours   : body.clinichours,
    target        : body.target,
    visitsperhour : body.visitsperhour,
    target2       : body.target2
  }).then(entry => {
    console.log('here',  entry);
    return res.status(200).json({message:"yay"})
  }).catch(e => {
    console.error(e);
    res.sendStatus(500);
  })
})
app.delete('/userdata', (req, res) => {
  const id = req.body.id;
  console.log(id);
  if (id) {
    return res.status(404).json({
      message: '#' + id + ': not found'
    })
  }
  knex('hoursportland').where({
    id: id
    }).del().then(row => {
      console.log(row);
      return res.status(200).json({
    message: '#' + id + ': deleted'
    }).catch(e => {
      console.error(e);
      res.sendStatus(500);
    })
  })
})
app.post('/me', stormpath.loginRequired, function (req, res) {
  function writeError(message) {
    res.status(400);
    res.json({ message: message, status: 400 });
    res.end();
  }
  function saveAccount () {
    req.user.givenName = req.body.givenName;
    req.user.surname = req.body.surname;
    req.user.email = req.body.email;
    req.user.save(function (err) {
      if (err) {
        return writeError(err.userMessage || err.message);
      }
      res.end();
    });
  }
  if (req.body.password) {
    var application = req.app.get('stormpathApplication');
    application.authenticateAccount({
      username: req.user.username,
      password: req.body.existingPassword
    }, function (err) {
      if (err) {
        return writeError('The existing password that you entered was incorrect.');
      }
      req.user.password = req.body.password;
      saveAccount();
    });
  } else {
    saveAccount();
  }
});
app.on('stormpath.ready', function () {
  app.listen(3000, 'localhost', function (err) {
    if (err) {
      return console.error(err);
    }
    console.log('Listening at http://localhost:3000');
  });
});
//============================== bootstrap 
app.use(express.static('build'));