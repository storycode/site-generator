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
		var documentPath = docpadInstance.config.srcPath + '/documents/';
		var projectsPath = documentPath + 'projects/';
		var apiPath = documentPath + 'api/';
		var dataPath = docpadInstance.config.rootPath + '/data/';

		// track related project meta (metaCategories). these turn into top-level sections.
		var projectMeta = {};

		
		/**
		 * Take string from Google Doc cell and return an array of items 
		 * with white space trimed from around each item. 
		 * If blank, return empty string. Transforms
		 * string in this form: 'Josh Williams, Meghan Louttit and Tyson Evans'
		 * to be used in YAML files as:
		 * 
		 * people
		 *	- Josh Williams
		 *	- Meghan Louttit
		 *	- Tyson Eans
		 * 
		 * Split stings on commas and 'and'
		 * 
		 * @param  {String} s Input from spreadseet
		 * @return {Array/Empty String}
		 */
		var yamlArrayMaker = function(s){
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

		
		/**
		 * Take a project's related meta info (categories, people, etc) 
		 * and keep track of slugs found, and number of projects associated
		 * with the item.
		 *
		 * For example, 
		 *
		 * // obj.metaCategory.slug.objOfInfo
		 * 
		 * projectMeta.[tools, organizations, people].josh-williams.{
		 *		title: Josh Williams,
		 *      slug: josh-williams,
		 *      count: 3, // number of projects related to this object
		 *      layout: 'person' // layouts/xxx.html.eco to render this asset
		 * }
		 * 
		 * @param  {String} metaCategory people,projects,tools,etc
		 * @param  {Object} data         { "slug": "people", "singular": "person", "plural": "people" }
		 */
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

		/**
		 * Write YAML file to disk
		 * @param  {String} path    full path
		 * @param  {String} yamlDoc Fromatted YAML document
		 */
		var writeYaml = function(path, yamlDoc){
			fs.writeFile(path, yamlDoc, function(err) {
				if (err) {
					return console.log(err.stack);
				}
			});
		};

		var writeJSON = function(path, jsonObject){
			fs.writeFile(path, JSON.stringify(jsonObject, null, '\t'), function(err) {
				if (err) {
					return console.log(err.stack);
				}
			});
		};


		// TODO - 
		
		/**
		 * wrapper around write json, to put filee
		 * in documents/api/metacategory/slug.json
		 * @param  {String} metaCategory    people,projects,tools,etc
		 * @param  {String} slug			slug, like josh-williams
		 * @param  {Object} jsonObject		relevant data
		 */
		var writeAPI = function(metaCategory, slug, jsonObject){

		};


		// 
		// collect meta info on each project
		var projects = [];
		row_data.forEach(function(project) {
			var signatureMaker = crypto.createHash('md5');
			var meta = {
				title: project.project.trim(),
				people: yamlArrayMaker(project.individuals),
				organizations: yamlArrayMaker(project.org),
				projectUrl: project.url.trim(),
				categories: yamlArrayMaker(project.type),
				tools: yamlArrayMaker(project.toolsused),
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

		
		// Generate all project YAML and data files for use in docpad and other scripts

		
		projects.forEach(function(project) {

			// convert project data, minus text field, into YAML block
			var yamlDoc = yaml.safeDump(_.omit(project,['text']));

			// Add text field below YAML header.
			// TODO: Make text a markdown document in Google Docs?
			yamlDoc = '---\n' + yamlDoc + '---\n\n' + project.text;

			// add to docpad project
			writeYaml(projectsPath + project.slug + '.html', yamlDoc);

			// write individual json file for this project
			writeJSON(dataPath + project.slug + '.json', project);
		});


		// write out each meta category's YAML and json files
		_.each(projectMeta, function(value, key){
			var docPath = documentPath + key + '/';
			_.each(value, function(obj,slug){

				var yamlDoc = yaml.safeDump(obj);
				yamlDoc = '---\n' + yamlDoc + '---\n\n   ';
				writeYaml(docPath + slug + '.html', yamlDoc);

				// write json file
				writeJSON(dataPath + slug + '.json', obj);
			});
		});

		// write out all project meta for use in other scrips
		writeJSON(dataPath+'projects.json', projects);
	});

});