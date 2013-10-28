var docpadConfig,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

docpadConfig = {

  /**
   * Custom collections
   */
  collections: {
    
    blogPosts: function() {
      return this.getCollection("html").findAllLive({
        relativeOutDirPath: 'blog'
      });
    },
    
    projects: function() {
      return this.getCollection("html").findAllLive({
        relativeOutDirPath: 'projects'
      });
    },
    
    tools: function() {
      return this.getCollection("html").findAllLive({
        relativeOutDirPath: 'tools'
      });
    },
    
    organizations: function() {
      return this.getCollection("html").findAllLive({
        relativeOutDirPath: 'organizations'
      });
    },
    
    people: function() {
      return this.getCollection("html").findAllLive({
        relativeOutDirPath: 'people'
      });
    },

    categories: function() {
      return this.getCollection("html").findAllLive({
        relativeOutDirPath: 'categories'
      });
    },
    
    // categories: function(database) {
    //   return database.findAllLive({
    //     relativeOutDirPath: 'categories'
    //   }).on("add", function(model) {
    //     return model.setMetaDefaults({
    //       layout: 'category'
    //     });
    //   });
    // },
    
    // josh: function(database) {
    //   return database.findAllLive({
    //     relativeOutDirPath: 'projects'
    //   }, [
    //     {
    //       filename: 1
    //     }
    //   ]);
    // }
  },

  /**
   * Template Data
   * These are variables that will be accessible via our templates
   * To access one of these within our templates, refer to the FAQ: https://github.com/bevry/docpad/wiki/FAQ
   */
  templateData: {
    
    // Specify some site properties
    site: {

      // The production url of our website
      url: "http://storyco.de",

      // Here are some old site urls that you would like to redirect from
      oldUrls: [],

      // The default title of our website
      title: "Story Code",

      // The website description (for SEO)
      description: "The definitive compilation of interactive graphics, maps and multimedia projects.",

      // The website keywords (for SEO) separated by commas
      keywords: "Story Code, StoryCode, multimedia, design, storytelling, journalism, immersive, web developement"
    },

    metaCategories: {
      "people": {
        "slug": "people",
        "singular": "person",
        "plural": "people"
      },
      "tools": {
        "slug": "tools",
        "singular": "tool",
        "plural": "tools"
      },
      "organizations": {
        "slug": "organizations",
        "singular": "organization",
        "plural": "organizations"
      },
      "categories": {
        "slug": "categories",
        "singular": "category",
        "plural": "categories"
      }
    },
    

    /**
     * Helper Functions
     */
    

    slugify: function(string) {
      var _;
      _ = require("underscore");
      _.str = require('underscore.string');
      return _.str.slugify(string);
    },
    
    getMetaCategoryUrl: function(categorySlug, itemSlug) {
      return '/' + categorySlug + '/' + itemSlug;
    },
    
    getMetaCategoryMeta: function(categorySlug) {
      return this.metaCategories[categorySlug];
    },
    
    getDocumentsForMetaCategory: function(categorySlug, itemSlug) {
      var qObject;
      qObject = {};
      qObject[categorySlug] = '$has: ' + itemSlug;
      return this.getCollection('documents').findAll(qObject);
    },
    
    getDocumentsForCategory: function(categoryId) {
      return this.getCollection('documents').findAll({
        categories: {
          $has: categoryId
        }
      });
    },
    
    getCategoriesForDocument: function(document) {
      var categories, categoryId, categoryIds, _i, _len;
      if (document == null) {
        document = this.getDocument();
      }
      categoryIds = document.get('categories');
      for (_i = 0, _len = categoryIds.length; _i < _len; _i++) {
        categoryId = categoryIds[_i];
        categories = this.categories[categoryId];
      }
      return categories;
    },
    
    // Get the prepared site/document title Often we would like 
    // to specify particular formatting to our page's title 
    // we can apply that formatting here
    getPreparedTitle: function() {
      if (this.document.title) {
        return "" + this.document.title + " | " + this.site.title;
      } else {
        return this.site.title;
      }
    },
    
    // Get the prepared site/document description
    getPreparedDescription: function() {
      return this.document.description || this.site.description;
    },
    
    // Get the prepared site/document keywords
    getPreparedKeywords: function() {
      return this.site.keywords.concat(this.document.keywords || []).join(', ');
    },
    
    getGruntedStyles: function() {
      var gruntConfig, styles, _;
      _ = require('underscore');
      styles = [];
      gruntConfig = require('./grunt-config.json');
      _.each(gruntConfig, function(value, key) {
        return styles = styles.concat(_.flatten(_.pluck(value, 'dest')));
      });
      styles = _.filter(styles, function(value) {
        return value.indexOf('.min.css') > -1;
      });
      return _.map(styles, function(value) {
        return value.replace('out', '');
      });
    },
    
    getGruntedScripts: function() {
      var gruntConfig, scripts, _;
      _ = require('underscore');
      scripts = [];
      gruntConfig = require('./grunt-config.json');
      _.each(gruntConfig, function(value, key) {
        return scripts = scripts.concat(_.flatten(_.pluck(value, 'dest')));
      });
      scripts = _.filter(scripts, function(value) {
        return value.indexOf('.min.js') > -1;
      });
      return _.map(scripts, function(value) {
        return value.replace('out', '');
      });
    }
  },


  /**
   * DocPad Events
   */

  events: {

    // Used to add our own custom routes to the server before the docpad routes are added
    serverExtend: function(opts) {
      var docpad, latestConfig, newUrl, oldUrls, server;
      server = opts.server;
      docpad = this.docpad;
      latestConfig = docpad.getConfig();
      oldUrls = latestConfig.templateData.site.oldUrls || [];
      newUrl = latestConfig.templateData.site.url;
      return server.use(function(req, res, next) {
        var _ref;
        if (_ref = req.headers.host, __indexOf.call(oldUrls, _ref) >= 0) {
          return res.redirect(newUrl + req.url, 301);
        } else {
          return next();
        }
      });
    },

    // Used to minify our assets with grunt
    writeAfter: function(opts, next) {
      var balUtil, command, config, docpad, rootPath, siteUrl, sitemap, sitemapPath, _;
      docpad = this.docpad;
      rootPath = docpad.config.rootPath;
      config = docpad.getConfig();
      balUtil = require('bal-util');
      _ = require('underscore');
      sitemap = [];
      sitemapPath = config.outPath + '/sitemap.txt';
      siteUrl = config.templateData.site.url;
      docpad.getCollection('html').forEach(function(document) {
        if (document.get('sitemap') !== false && document.get('write') !== false && document.get('ignored') !== true && document.get('body')) {
          sitemap.push(siteUrl + document.get('url'));
        }
        return balUtil.writeFile(sitemapPath, sitemap.sort().join('\n'), next);
      });
      command = ["" + rootPath + "/node_modules/.bin/grunt", 'default'];
      balUtil.spawn(command, {
        cwd: rootPath,
        output: true
      }, function() {
        var gruntConfig, src;
        src = [];
        gruntConfig = require('./grunt-config.json');
        _.each(gruntConfig, function(value, key) {
          return src = src.concat(_.flatten(_.pluck(value, 'src')));
        });
        _.each(src, function(value) {
          return balUtil.spawn(['rm', value], {
            cwd: rootPath,
            output: false
          }, function() {});
        });
        balUtil.spawn(['find', '.', '-type', 'd', '-empty', '-exec', 'rmdir', '{}', '\;'], {
          cwd: rootPath + '/out',
          output: false
        }, function() {});
        return next();
      });
      return this;
    }
  }
};

module.exports = docpadConfig;
