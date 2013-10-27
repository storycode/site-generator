# The DocPad Configuration File
docpadConfig = {
	
	# =================================
	# Custom collections

	collections: 
		blogPosts: ->
			@getCollection("html").findAllLive({relativeOutDirPath: 'blog'})
		projects: ->
			@getCollection("html").findAllLive({relativeOutDirPath: 'projects'}).
				on "add", (model) ->
					model.setMetaDefaults({layout:'projects'});
		tools: ->
			@getCollection("html").findAllLive({relativeOutDirPath: 'tools'}).
				on "add", (model) ->
					model.setMetaDefaults({layout:'tools'});
		organizations: ->
			@getCollection("html").findAllLive({relativeOutDirPath: 'organizations'}).
				on "add", (model) ->
					model.setMetaDefaults({layout:'organizations'});
		people: ->
			@getCollection("html").findAllLive({relativeOutDirPath: 'people'}).
				on "add", (model) ->
					model.setMetaDefaults({layout:'people'});
		categories: ->
			@getCollection("html").findAllLive({relativeOutDirPath: 'categories'}).
				on "add", (model) ->
					model.setMetaDefaults({layout:'categories'});

	# =================================
	# Template Data
	# These are variables that will be accessible via our templates
	# To access one of these within our templates, refer to the FAQ: https://github.com/bevry/docpad/wiki/FAQ

	templateData:

		# Specify some site properties
		site:
			# The production url of our website
			url: "http://storyco.de"

			# Here are some old site urls that you would like to redirect from
			oldUrls: []

			# The default title of our website
			title: "Story Code"

			# The website description (for SEO)
			description: """
				The definitive compilation of interactive graphics, maps and multimedia projects.
				"""

			# The website keywords (for SEO) separated by commas
			keywords: """
				Story Code, StoryCode, multimedia, design, storytelling, journalism, immersive, web developement
				"""

		metaCategories: {
			"people":{
				"slug": "people",
				"singular": "person",
				"plural": "people"
			},
			"tools":{
				"slug": "tools",
				"singular": "tool",
				"plural": "tools"
			},
			"organizations":{
				"slug": "organizations",
				"singular": "organization",
				"plural": "organizations"
			},
			"categories":{
				"slug": "categories",
				"singular": "category",
				"plural": "categories"
			}
		}

		slugify: (string) ->
			_ = require("underscore")
			_.str = require('underscore.string')
			return _.str.slugify(string);

		getMetaCategoryUrl: (categorySlug, itemSlug) ->
			return '/' + categorySlug + '/' + itemSlug

		getMetaCategoryMeta: (categorySlug) ->
			return @metaCategories[categorySlug]

		# todo
		getDocumentsForMetaCategory: (categorySlug, itemSlug) ->
			qObject = {}
			qObject[categorySlug] = '$has: '+itemSlug;
			return @getCollection('documents').findAll(qObject)

		# -----------------------------
		# Expanded category info. 
		# TODO, still. 
		# see: http://stackoverflow.com/questions/14353716/how-to-query-documents-in-docpad-based-on-arrays-of-objects
		# specifically: 'Via Template Helpers and a global categories listing'
		
		getDocumentsForCategory: (categoryId) ->
			return @getCollection('documents').findAll(categories: $has: categoryId)

		getCategoriesForDocument: (document) ->
			document ?= @getDocument()
			categoryIds = document.get('categories')
			categories = @categories[categoryId]  for categoryId in categoryIds
			return categories

		# -----------------------------
		# Helper Functions

		# Get the prepared site/document title
		# Often we would like to specify particular formatting to our page's title
		# we can apply that formatting here
		getPreparedTitle: ->
			# if we have a document title, then we should use that and suffix the site's title onto it
			if @document.title
				"#{@document.title} | #{@site.title}"
			# if our document does not have it's own title, then we should just use the site's title
			else
				@site.title

		# Get the prepared site/document description
		getPreparedDescription: ->
			# if we have a document description, then we should use that, otherwise use the site's description
			@document.description or @site.description

		# Get the prepared site/document keywords
		getPreparedKeywords: ->
			# Merge the document keywords with the site keywords
			@site.keywords.concat(@document.keywords or []).join(', ')

		getGruntedStyles: ->
			_ = require 'underscore'
			styles = []
			gruntConfig = require('./grunt-config.json')
			_.each gruntConfig, (value, key) ->
				styles = styles.concat _.flatten _.pluck value, 'dest'
			styles = _.filter styles, (value) ->
				return value.indexOf('.min.css') > -1
			_.map styles, (value) ->
				return value.replace 'out', ''

		getGruntedScripts: ->
			_ = require 'underscore'
			scripts = []
			gruntConfig = require('./grunt-config.json')
			_.each gruntConfig, (value, key) ->
				scripts = scripts.concat _.flatten _.pluck value, 'dest'
			scripts = _.filter scripts, (value) ->
				return value.indexOf('.min.js') > -1
			_.map scripts, (value) ->
				return value.replace 'out', ''


	# =================================
	# DocPad Events

	# Here we can define handlers for events that DocPad fires
	# You can find a full listing of events on the DocPad Wiki
	events:

		# Server Extend
		# Used to add our own custom routes to the server before the docpad routes are added
		serverExtend: (opts) ->
			# Extract the server from the options
			{server} = opts
			docpad = @docpad

			# As we are now running in an event,
			# ensure we are using the latest copy of the docpad configuraiton
			# and fetch our urls from it
			latestConfig = docpad.getConfig()
			oldUrls = latestConfig.templateData.site.oldUrls or []
			newUrl = latestConfig.templateData.site.url

			# Redirect any requests accessing one of our sites oldUrls to the new site url
			server.use (req,res,next) ->
				if req.headers.host in oldUrls
					res.redirect(newUrl+req.url, 301)
				else
					next()

		# Write After
		# Used to minify our assets with grunt
		writeAfter: (opts,next) ->
			# Prepare
			docpad = @docpad
			rootPath = docpad.config.rootPath
			config = docpad.getConfig()
			balUtil = require 'bal-util'
			_ = require 'underscore'

			# Make site map
			sitemap = []
			sitemapPath = config.outPath+'/sitemap.txt'
			siteUrl = config.templateData.site.url
			
			# Get all the html files
			docpad.getCollection('html').forEach (document) ->
				if document.get('sitemap') isnt false and document.get('write') isnt false and document.get('ignored') isnt true and document.get('body')
					sitemap.push siteUrl+document.get('url')
 
 			balUtil.writeFile(sitemapPath, sitemap.sort().join('\n'), next)


			# Make sure to register a grunt `default` task
			command = ["#{rootPath}/node_modules/.bin/grunt", 'default']
			
			# Execute
			balUtil.spawn command, {cwd:rootPath,output:true}, ->
				src = []
				gruntConfig = require './grunt-config.json'
				_.each gruntConfig, (value, key) ->
					src = src.concat _.flatten _.pluck value, 'src'
				_.each src, (value) ->
					balUtil.spawn ['rm', value], {cwd:rootPath, output:false}, ->
				balUtil.spawn ['find', '.', '-type', 'd', '-empty', '-exec', 'rmdir', '{}', '\;'], {cwd:rootPath+'/out', output:false}, ->
				next()

			# Chain
			@
}

# Export our DocPad Configuration
module.exports = docpadConfig