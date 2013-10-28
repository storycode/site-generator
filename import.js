/* global _, console */
var crypto = require('crypto');
var fs = require('graceful-fs');
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
	row_data = [row_data[1079], row_data[1080],row_data[1011], row_data[79], row_data[1143], row_data[1144], row_data[1145], row_data[1146]];
	
	require('docpad').createInstance(docpadInstanceConfiguration, function(err, docpadInstance) {
		if (err) {
			return console.log(err.stack);
		}

		var config = docpadInstance.config;
		var metaCategories = config.templateData.metaCategories;

		// track related project meta (metaCategories). these turn into top-level sections.
		// projectMeta.[tools, organizations, people].josh-williams = {
		//	count: 3,
		//	slug: josh-williams,
		//	title: Josh Williams
		// }
		var projectMeta = {};

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

		// take project's related meta info (categories, people, etc)
		// and generate related list of posts for those enrties.
		var metaTracker = function(metaCategory, data){
			if (data) {
				
				// create the container obj for the 
				// category of meta information
				if (!projectMeta[metaCategory]) {
					projectMeta[metaCategory] = {};
				}
				// console.log(metaCategory);
				data.forEach(function(v){
					var slug = _.str.slugify(v);
					if (!projectMeta[metaCategory][slug]) {
						projectMeta[metaCategory][slug] = {
							title: v,
							slug: slug,
							layout: metaCategories[metaCategory].singular,
							count: 1
						};
					} else {
						projectMeta[metaCategory][slug].count ++;
					}
				});
			}
		};

		// write YAML string to path
		var writeYaml = function(path, yamlDoc){
			fs.writeFile(path, yamlDoc, function(err) {
				if (err) {
					return console.log(err.stack);
				}
				// console.log('wrote: ' + path);
			});
		};


		// collect meta info on each project
		var projects = [];
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
				country: "United States", // TODO
				industry: "News",
				text: project.notes.trim()
			};

			// so we can see if the content has changed
			meta.signature = signatureMaker.update(JSON.stringify(meta)).digest("hex");
			meta.layout = "project";

			// save project meta
			_.each(metaCategories, function(value, key){
				metaTracker(key, meta[key]);
			});

			// console.log(meta);
			projects.push(meta);
		});

		

		// TODO ? -- make sure project doesn't exist and hasn't changedc

		// Generate all project YAML files
		var documentPath = docpadInstance.config.srcPath + '/documents/';
		var projectsPath = documentPath + 'projects/';
		

		projects.forEach(function(project) {

			// convert project data, minus text field, into YAML block
			// var yamlDoc = yaml.stringify( _.omit(project,['text']) );
			var yamlDoc = yaml.safeDump(_.omit(project,['text']));

			// Add text field below YAML header.
			// TODO: Make text a markdown document in Google Docs?
			yamlDoc = '---\n' + yamlDoc + '---\n\n' + project.text;

			// add to docpad project
			writeYaml(projectsPath + project.slug + '.html', yamlDoc);
		});


		// write out each meta category's YAML files
		_.each(projectMeta, function(value, key){
			var path = documentPath + key + '/';
			_.each(value, function(obj,slug){
				var fileName = path + slug + '.html';
				var yamlDoc = yaml.safeDump(obj);
				yamlDoc = '---\n' + yamlDoc + '---\n\n   ';
				writeYaml(fileName, yamlDoc);
			});
		});

	});

});