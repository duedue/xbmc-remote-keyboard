// Generated by CoffeeScript 1.6.3
(function() {
  var Base, Keyboard, Program, Ui, fs, program, url,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  fs = require('fs');

  program = require('commander');

  Ui = require('./Ui').Ui;

  Base = require('./Base').Base;

  Keyboard = require('./Keyboard').Keyboard;

  url = require('url');

  Program = (function(_super) {
    __extends(Program, _super);

    function Program(options) {
      var _base;
      this.options = options != null ? options : {};
      this.run = __bind(this.run, this);
      this.close = __bind(this.close, this);
      this.setupHandlers = __bind(this.setupHandlers, this);
      this.initUi = __bind(this.initUi, this);
      this.initKeyboard = __bind(this.initKeyboard, this);
      this.initXbmc = __bind(this.initXbmc, this);
      this.saveOptions = __bind(this.saveOptions, this);
      this.parseOptions = __bind(this.parseOptions, this);
      this.initCommander = __bind(this.initCommander, this);
      Program.__super__.constructor.apply(this, arguments);
      this.debug("constructor");
      if ((_base = this.options).name == null) {
        _base.name = 'xbmc-remote-keyboard';
      }
      this.initCommander();
      return this;
    }

    Program.prototype.initCommander = function() {
      var default_config;
      this.debug('initCommander');
      default_config = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'] + '/.xbmc-remote-keyboard.json';
      program.name = this.options.name;
      return program.version(Program.getVersion()).usage('[options] hostname/ip[:port]').option('-v, --verbose', 'verbose').option('-d, --debug', 'debug').option('-c, --config <file>', 'config file', default_config).option('-u, --username <username>', 'username').option('-P, --password <password>', 'password').option('-s, --host <host>', 'hostname/ip').option('-w, --save', 'save config file').option('-p, --port <port>', 'port', 9090).option('-S, --silent', 'do not send message').option('-a, --agent <agent>', 'user agent', 'Remote Keyboard');
    };

    Program.prototype.parseOptions = function() {
      var arg, config, e, target, _ref;
      this.debug('parseOptions');
      program.parse(process.argv);
      __extends(this.options, program);
      try {
        config = require(this.options.config);
        __extends(this.options, config);
      } catch (_error) {
        e = _error;
        this.debug('No such config file:', this.options.config);
      }
      if (this.options.args[0] != null) {
        arg = this.options.args[0];
        if (arg.indexOf('://') !== 0) {
          arg = "http://" + arg;
        }
        target = url.parse(arg);
        if (target['port'] != null) {
          this.options['port'] = parseInt(target['port']);
        }
        if (target['hostname']) {
          this.options['host'] = target['hostname'];
        }
        if (target['auth'] != null) {
          _ref = target['auth'].split(':'), this.options.username = _ref[0], this.options.password = _ref[1];
        }
      }
      if (this.options.save) {
        this.saveOptions();
        process.exit(0);
      }
      if (this.options.host == null) {
        return program.help();
      }
    };

    Program.prototype.saveOptions = function() {
      var config, key, _i, _len, _ref;
      this.debug('saveOptions');
      process.stdout.write("Writing config file (" + this.options.config + ")... ");
      config = {};
      _ref = ['host', 'port'];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        key = _ref[_i];
        config[key] = this.options[key];
      }
      fs.writeFileSync(this.options.config, JSON.stringify(config));
      return console.log("Done.");
    };

    Program.prototype.initXbmc = function(fn) {
      var TCPConnection, XbmcApi, _ref,
        _this = this;
      if (fn == null) {
        fn = null;
      }
      this.debug('initXbmc');
      _ref = require('xbmc'), TCPConnection = _ref.TCPConnection, XbmcApi = _ref.XbmcApi;
      this.xbmcConnection = new TCPConnection({
        host: this.options.host,
        port: this.options.port,
        verbose: this.options.debug
      });
      this.xbmcApi = new XbmcApi({
        connection: this.xbmcConnection,
        verbose: this.options.debug,
        username: this.options.username,
        password: this.options.password,
        agent: this.options.agent || 'Remote Keyboard',
        silent: this.options.silent
      });
      this.xbmcApi.on('connection:open', function() {
        _this.debug('xbmcApi:connection:open');
        if (fn) {
          return fn(false);
        }
      });
      return this.xbmcApi.on('connection:error', function(e) {
        _this.debug('xbmcApi:connection:error', e);
        if (fn) {
          return fn(true, e);
        }
      });
    };

    Program.prototype.initKeyboard = function(fn) {
      if (fn == null) {
        fn = null;
      }
      this.debug('initKeyboard');
      this.keyboard = new Keyboard(this.options);
      this.keyboard.start();
      if (fn) {
        return fn(false);
      }
    };

    Program.prototype.initUi = function(fn) {
      if (fn == null) {
        fn = null;
      }
      this.debug('initUi');
      this.ui = new Ui(this.options);
      this.ui.start();
      if (fn) {
        return fn(false);
      }
    };

    Program.prototype.setupHandlers = function() {
      var _this = this;
      this.debug('setupHandlers');
      this.ui.on('input', function(human, c, i) {
        _this.debug('ui:input', human, c, i);
        return _this.keyboard.emit('input', human, c, i);
      });
      this.ui.on('quit', function() {
        _this.debug('ui:quit');
        return _this.close();
      });
      this.keyboard.on('quit', function() {
        _this.debug('keyboard:quit');
        return _this.close();
      });
      this.keyboard.on('apiSendInput', function(method, args) {
        if (args == null) {
          args = null;
        }
        _this.debug('keyboard:apiSendInput', method, args);
        return _this.xbmcApi.input[method](args);
      });
      this.keyboard.on('api.Input.ExecuteAction', function(method, args) {
        if (args == null) {
          args = null;
        }
        _this.debug('keyboard:api.Input.ExecuteAction', method, args);
        return _this.xbmcApi.input.ExecuteAction(method, args);
      });
      this.keyboard.on('unknownInput', function(c, i) {
        _this.debug('keyboard:unknownInput', c, i);
        return _this.log("Unknown input", c, i);
      });
      this.keyboard.on('sendText', function(text) {
        _this.debug('keyboard:sendText', text);
        return _this.xbmcApi.input.SendText(text);
      });
      this.xbmcApi.on('api:Input.OnInputRequested', function() {
        _this.debug('xbmcApi:api:Input.OnInputRequested');
        return _this.keyboard.emit('setInputMode', 'text');
      });
      return this.xbmcApi.on('api:Input.OnInputFinished', function() {
        _this.debug('api:Input.OnInputFinished');
        return _this.keyboard.emit('setInputMode', 'action');
      });
    };

    Program.prototype.close = function(reason) {
      if (reason == null) {
        reason = '';
      }
      this.debug('close', reason);
      console.log(reason ? "Exiting (" + reason + ")" : "closing");
      if (this.ui) {
        this.ui.close();
      }
      return process.exit(1);
    };

    Program.prototype.run = function() {
      var _this = this;
      this.debug('run');
      this.parseOptions();
      return this.initXbmc(function(err, reason) {
        if (reason == null) {
          reason = null;
        }
        if (err) {
          return _this.close(reason);
        }
        return _this.initUi(function(err, reason) {
          if (reason == null) {
            reason = null;
          }
          if (err) {
            return _this.close(reason);
          }
          return _this.initKeyboard(function(err, reason) {
            if (reason == null) {
              reason = null;
            }
            if (err) {
              return _this.close(reason);
            }
            return _this.setupHandlers();
          });
        });
      });
    };

    Program.getVersion = function() {
      return JSON.parse(fs.readFileSync("" + __dirname + "/../package.json", 'utf8')).version;
    };

    Program.create = function(options) {
      if (options == null) {
        options = {};
      }
      return new Program(options);
    };

    Program.run = function() {
      return (Program.create()).run();
    };

    return Program;

  })(Base);

  module.exports = {
    Program: Program,
    run: Program.run,
    create: Program.create,
    getVersion: Program.getVersion
  };

}).call(this);
