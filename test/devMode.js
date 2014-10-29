/* Test for developmentMode flags doing what they should */
var Lab = require('lab');
var prodServer, devServer, jsPath, cssPath;
var async = require('async');
var Hapi = require('hapi');
var Moonboots = require('moonboots');
var MoonbootsHapi = require('..');
var prod_options = {
    appPath: '/app',
    moonboots: {
        jsFileName: 'moonboots-hapi-js',
        cssFileName: 'moonboots-hapi-css',
        main: __dirname + '/../sample/app/app.js',
        stylesheets: [
            __dirname + '/../sample/stylesheets/style.css'
        ]
    }
};

var dev_options = {
    appPath: '/app',
    developmentMode: true,
    moonboots: {
        jsFileName: 'moonboots-hapi-js',
        cssFileName: 'moonboots-hapi-css',
        main: __dirname + '/../sample/app/app.js',
        stylesheets: [
            __dirname + '/../sample/stylesheets/style.css'
        ]
    }
};

//Mirror the above moonboots configs to get filenames for testing requests
var devMoonboots = new Moonboots({
    developmentMode: true,
    jsFileName: 'moonboots-hapi-js',
    cssFileName: 'moonboots-hapi-css',
    main: __dirname + '/../sample/app/app.js',
    stylesheets: [
        __dirname + '/../sample/stylesheets/style.css'
    ]
});
var prodMoonboots = new Moonboots({
    jsFileName: 'moonboots-hapi-js',
    cssFileName: 'moonboots-hapi-css',
    main: __dirname + '/../sample/app/app.js',
    stylesheets: [
        __dirname + '/../sample/stylesheets/style.css'
    ]
});

Lab.experiment('developmentMode flag properly affects caching', function () {
    Lab.before(function (done) {
        prodServer = new Hapi.Server('localhost', 3001);
        devServer = new Hapi.Server('localhost', 3002);
        async.parallel({
            prod: function (next) {
                prodServer.pack.register([{
                    plugin: MoonbootsHapi,
                    options: prod_options
                }], next);
            },
            dev: function (next) {
                devServer.pack.register([{
                    plugin: MoonbootsHapi,
                    options: dev_options
                }], next);
            }
        }, function (err) {
            if (err) {
                process.stderr.write('Unable to setUp tests', err, '\n');
                process.exit(1);
            }
            done();
        });
    });
    Lab.test('app path cache header', function (done) {
        devServer.inject({
            method: 'GET',
            url: '/app',
        }, function _devApp(res) {
            Lab.expect(res.headers['cache-control'], 'cache-control header').to.equal('no-store');
            done();
        });
    });
    Lab.test('js path cache header', function (done) {
        devServer.inject({
            method: 'GET',
            url: '/' + devMoonboots.jsFileName()
        }, function _devJs(res) {
            Lab.expect(res.headers['cache-control'], 'cache-control header').to.equal('no-cache');
            done();
        });
    });
    Lab.test('css path cache header', function (done) {
        devServer.inject({
            method: 'GET',
            url: '/' + devMoonboots.cssFileName()
        }, function _devCss(res) {
            Lab.expect(res.headers['cache-control'], 'cache-control header').to.equal('no-cache');
            done();
        });
    });
    Lab.test('production app cache header', function (done) {
        prodServer.inject({
            method: 'GET',
            url: '/app'
        }, function _prodApp(res) {
            Lab.expect(res.headers['cache-control'], 'cache-control header').to.equal('no-store');
            done();
        });
    });
    Lab.test('prodJs', function (done) {
        prodServer.inject({
            method: 'GET',
            url: '/' + prodMoonboots.jsFileName()
        }, function _prodJs(res) {
            Lab.expect(res.headers['cache-control'], 'cache-control header').to.equal('max-age=31104000, must-revalidate');
            done();
        });
    });
    Lab.test('prodCss', function (done) {
        prodServer.inject({
            method: 'GET',
            url: '/' + prodMoonboots.cssFileName()
        }, function _prodCss(res) {
            Lab.expect(res.headers['cache-control'], 'cache-control header').to.equal('max-age=31104000, must-revalidate');
            done();
        });
    });

    Lab.test('in development mode, simultaneous requests should all get same code', function (done) {
        var result1, result2;
        var getJS = function (done) {
            devServer.inject({
                method: 'GET',
                url: '/' + devMoonboots.jsFileName()
            }, function _devJs(res) {
                done(null, res.payload);
            });
        };

        async.parallel([
            getJS,
            getJS,
            getJS
        ], function (err, results) {
            Lab.expect(results[0].length).to.equal(results[1].length, 'Should be same code');
            Lab.expect(results[0].length).to.equal(results[2].length, 'Should be same code');
            done();
        });
    });
});
