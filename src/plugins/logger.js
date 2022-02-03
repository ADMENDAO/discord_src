const colors = require('colors/safe');
const logger = require('tracer').colorConsole({
  filters: [
     colors.white,
    {
      trace: colors.white,
      debug: colors.blue,
      info: colors.green,
      warn: colors.yellow,
      error: [colors.red.bold]
     }
	]
})
module.exports = logger;