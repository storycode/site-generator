/* global _, console */
var fs = require('graceful-fs');
var yaml = require('js-yaml');
var _ = require("underscore");
// var config = require('./docpad.js');
_.str = require('underscore.string');


var webshot = require('webshot');


webshot('google.com', 'google.png', function(err) {
  // screenshot now saved to google.png
});