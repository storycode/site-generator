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

	// track related project meta. these
	// turn into top-level sections
	var projectMeta = {
		people: [],
		organizations: [],
		categories: [],
		tools: []
	};

	row_data = [row_data[1079], row_data[1080],row_data[1011], row_data[79], row_data[1143], row_data[1144], row_data[1145], row_data[1146]];
	
	// take CSV string and return an array of
	// items with white space trimed from around
	// each item. If blank, return empty string.
	var listMaker = function(s){
		if (s) {
			s.trim();
			return _.flatten(_.map(s.split(','), function(item){

				// sometimes there's an "X and Y" construction
				return _.map(item.split(' and '), function(i){
					return i.trim();
				});
			}));
		} else {
			return '';
		}
	};

	// take a global list (category, people, etc) and 
	// a project's related list entries. add project
	// values to global value, and only keep unqiues.
	var metaTracker = function(list, listMaker){
		if (listMaker) {
			listMaker.forEach(function(v){
				projectMeta[list].push(v);
			});
			projectMeta[list] = _.uniq(projectMeta[list]);
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

		metaTracker('people', meta.people);
		metaTracker('organizations', meta.organizations);
		metaTracker('tools', meta.tools);
		metaTracker('categories', meta.categories);

		projects.push(meta);
	});

	console.log(projectMeta);

	require('docpad').createInstance(docpadInstanceConfiguration, function(err, docpadInstance) {
		if (err) {
			return console.log(err.stack);
		}

		// TODO -- make sure project doesn't exist and hasn't changed
		// var resultCollection = docpadInstance.getCollection('html').findAllLive({relativeOutDirPath: 'projects'});

		var projectsPath = docpadInstance.config.srcPath + '/documents/projects/';
		projects.forEach(function(project) {

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