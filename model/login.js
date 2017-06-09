/**
 * Created by wenbinzhang on 2017/01/26.
 */
'use strict';

const helper = require('../utils/helper');
const retConfig = require('../config/retConfig');
const db = require('../utils/db');
const mysql = require('mysql');

const logger = require('../utils/helper').getLogger('model-login', 'auto'); // , './logs/login-file.log'

const login = {

  login: async (ctx) => {
    let data = ctx.request.body || {};
    if (!data.password || !data.mobile) {
      let tips = '';
      if (!data.mobile) {
        tips = '请输入手机号';
      } else {
        tips = '请输入密码';
      }
      ctx.body = helper.getReturnObj(retConfig.paramError, {
        message: tips
      });
      return false;
    }

    let result = await login.getUserInfoByInfo({
      mobile: data.mobile
    }, ctx);

    let response = result.response;

    if (!response || !response[0] || response[0].password != data.password || !response[0].id) {
      let tips = '';
      if ((response && response.length == 0) || (response[0].password != data.password)) {
        tips = '用户或密码错误!';
      } else if (result && result.error) {
        if (result.error.message) {
          tips = result.error.message;
        } else {
          tips = '登录失败！error:' + JSON.stringify(result.error);
        }
      } else {
        tips = '登录服务出错!';
      }

      logger.error(tips + '; param:' + JSON.stringify(data));
      ctx.body = helper.getReturnObj(retConfig.defaultError, {
        message: tips
      });
      return false;
    }

    ctx.session.id = response[0].id;
    ctx.session.password = response[0].password;
    let tips = response[0]['name'] + ' 登录成功! user_id:' + response[0].id;
    logger.info(tips);
    ctx.body = helper.getReturnObj({
      data: {
        id: response[0].id,
        name: response[0].name
      }
    });
  },

  logout: async (ctx) => {

    if (ctx.state && ctx.state.userInfo) {
      logger.info(ctx.state.userInfo['name'] + ' 退出登录!');
    }
    ctx.session = null;
    ctx.body = helper.getReturnObj({
      message: '退出登录成功'
    });
  },

  checkLogin: (isWhiteList) => {

    return async (ctx, next) => {

      if (typeof isWhiteList == 'function' && isWhiteList(ctx.path)) {
        await next();
        return false;
      }

      if (!ctx.session || !ctx.session.id || !(parseInt(ctx.session.id) > 0)) {
        ctx.session = null;
        ctx.body = helper.getReturnObj(retConfig.noLogin);
        return false;
      }

      let result = await login.getUserInfoByInfo({
        id: ctx.session.id
      }, ctx);

      if (!result || !result.response || !result.response[0] || !result.response[0].name || result.response[0].password != ctx.session.password) {
        ctx.session = null;
        ctx.body = helper.getReturnObj(retConfig.noLogin, {
          message: '登录态失效，请重新登录'
        });
        return false;
      }

      ctx.state.userInfo = result.response[0];
      await next();
    }
  },

  getUserInfoByInfo: async (data, ctx) => {
    let sql = `
      select id, name, mobile, role, password,
        date_format(create_time,'%Y-%m-%d %H:%i:%S') as create_time,
        date_format(update_time,'%Y-%m-%d %H:%i:%S') as update_time 
      from t_admin_user
      where `;

    let condition = [];

    if (data && data.id) {
      condition.push(' id=' + mysql.escape(data.id));
    }

    if (data && data.mobile) {
      condition.push(' mobile=' + mysql.escape(data.mobile));
    }

    if (data && data.name) {
      condition.push(' name=' + mysql.escape(data.name));
    }

    if (condition.length == 0) {
      return null;
    }

    sql += condition.join(' and ');
    let conn = db.getConn();
    let result = await helper.p(conn, conn.query, sql);
    db.closeConn(conn);
    return result;
  }

};

module.exports = login;