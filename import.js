/* global _, console */
var crypto = require('crypto');
var fs = require('fs');
var yaml = require('js-yaml');
var GoogleSpreadsheet = require("google-spreadsheet");
var _ = require("underscore");
_.str = require('underscore.string');
var docpadInstanceConfiguration = {};
var sheet = new GoogleSpreadsheet('0Ang1OfZPG6vydExDNzJncmJwZVlJVkhIOERKTUNnX0E');

console.log('Downloading spreadsheet');
sheet.getRows(1, function(err, row_data) {
	if (err) {
		return console.log(err.stack);
	}

	console.log('Found ' + row_data.length + ' projects ');

	var projects = [];
	var organizations = [];
	var people = [];
	var categories = [];
	var tools = [];

	row_data = [row_data[1079], row_data[1080],row_data[1011], row_data[79]];
	
	// take CSV string and return an array of
	// items with white space trimed from around
	// each item. If blank, return empty string.
	var listMaker = function(s){
		if (s) {
			s.trim();
			return _.map(s.split(','), function(item){
				return item.trim();
			});
		} else {
			return '';
		}
	};

	row_data.forEach(function(project) {
		var signatureMaker = crypto.createHash('md5');
		var meta = {
			title: project.project.trim(),
			people: listMaker(project.individuals),
			organizations: listMaker(project.org),
			projectUrl: project.url.trim(),
			categories: listMaker(project.type),
			tools: listMaker(project.toolsused),
			publishedDate: project.published,
			slug: _.str.slugify( _.str.prune(project.org.trim() + ' ' + project.project.trim(), 70) ), // contact org + project title, limit to 70 chars and slugify
			country: "United States",
			text: project.notes.trim()
		};

		// so we can see if the content has changed
		meta.signature = signatureMaker.update(JSON.stringify(meta)).digest("hex");
		meta.layout = "project";

		projects.push(meta);
	});

	require('docpad').createInstance(docpadInstanceConfiguration, function(err, docpadInstance) {
		if (err) {
			return console.log(err.stack);
		}

		var projectsPath = docpadInstance.config.srcPath + '/documents/projects/';
		var currentDatabase = docpadInstance.getDatabase();

		console.log(currentDatabase);

		projects.forEach(function(project) {

			// make sure project doesn't exist and hasn't changed



			// convert project data, minus text field, into YAML block
			// var yamlDoc = yaml.stringify( _.omit(project,['text']) );
			var yamlDoc = yaml.safeDump(_.omit(project,['text']));

			// Add text field below YAML header.
			// TODO: Make text a markdown document in Google Docs?
			yamlDoc = '---\n' + yamlDoc + '---\n\n' + project.text;

			// add to docpad project
			fs.writeFile(projectsPath + project.slug + '.md', yamlDoc, function(err) {
				if (err) {
					return console.log(err.stack);
				}
				console.log('wrote: ' + projectsPath + project.slug + '.md');
			});
		});

	});

});