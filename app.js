/**
 * Created by zpp on 2017/06/10.
 */
'use strict';
const Koa = require('koa');
const convert = require('koa-convert');
const favicon = require('koa-favicon');
const session = require('koa-session');
const bodyParser = require('koa-bodyparser');
const log4js = require('koa-log4');
const app = new Koa();

const config = require('./config/config');
const rootRouter = require('./router/rootRouter');
const logger = require('./utils/helper').getLogger('model-app', 'auto');

app.guse = x => app.use.call(app, convert(x));

app.keys = ['zhlc_admin'];

app
  .use(favicon())
  .use(errorHandler)
  .guse(session({
    key: 'huilicai::sess',
    maxAge: 3600000 * 24,
  }, app))
  .use(log4js.koaLogger(log4js.getLogger('http'), {level: 'auto'}))
  .use(bodyParser())
  .use(rootRouter.routes())
  .use(rootRouter.allowedMethods());

async function errorHandler (ctx, next) {
  try {
    await next();
  } catch (err) {
    logger.error('message:' + err.message + '; err:' + JSON.stringify(err) + '; sta:'+ err.stack);
    ctx.body = {message: err.message};
    ctx.status = err.status || 500;
  }
}

app.listen(config.listen_port);