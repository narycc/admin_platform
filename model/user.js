/**
 * Created by zpp on 2017/06/10.
 */
'use strict';

const helper = require('../utils/helper');
const retConfig = require('../config/retConfig');
const db = require('../utils/db');
const mysql = require('mysql');
const logger = helper.getLogger('model-user', 'auto'); // , './logs/user-file.log'

const user = {

  checkPermission: (isWhiteList) => {

    return async (ctx, next) => {

      if (typeof isWhiteList == 'function' && isWhiteList(ctx.path)) {
        await next();
        return false;
      }

      if (!ctx.state || !ctx.state.userInfo || ctx.state.userInfo.role != 1) {
        ctx.body = helper.getReturnObj(retConfig.noPermission);
        return false;
      }
      await next();
    }

  },

  getUserInfo: async (ctx) => {
    let info = Object.assign({}, ctx.state.userInfo);
    delete info.password;
    ctx.body = helper.getReturnObj({
      data: info
    });
  },

  list: async (ctx) => {
    let data = ctx.request.body || {};
    let page = data['page'] || 1;
    let pageSize = parseInt(data['pageSize']) || 200;
    let offset = (page - 1) * pageSize;
    let searchType = data.searchType;
    let searchValue = data.searchValue;

    let condition = '';

    if (searchType && searchValue) {
      switch (parseInt(searchType)) {
        case 1:
          condition += ' where name=' + mysql.escape(searchValue) + ' ';
          break;
        case 2:
          condition += ' where mobile=' + mysql.escape(searchValue) + ' ';
          break;
        default:
      }
    }


    let sql = `
          select id, name, mobile, role, password,
          date_format(create_time,'%Y-%m-%d %H:%i:%S') as create_time,
          date_format(update_time,'%Y-%m-%d %H:%i:%S') as update_time
          from t_admin_user ${condition} order by id desc limit ${offset} , ${pageSize};`;
    sql += ` select count(id) as total from t_admin_user ${condition};`;

    let conn = db.getConn();
    let result = await helper.p(conn, conn.query, sql);
    db.closeConn(conn);
    if (!result || !result.response) {
      ctx.body = helper.getReturnObj(retConfig.defaultError, {
        message: (result && result.error && result.error.message)
      });
      return false;
    }

    let response = result.response;
    let total = (response && response[1] && response[1][0] && response[1][0]['total']) || 0;
    let totalPage = Math.ceil(total / pageSize) || 0;
    ctx.body = helper.getReturnObj({
      data: {
        total: total,
        totalPage: totalPage,
        list: response[0]
      }
    });

  },

  search: async (ctx) => {

    let body = ctx.request.body;

    if (!body.stype || !body.svalue) {

      ctx.body = helper.getReturnObj(retConfig.paramError);
      return false;
    }

    let queryUserSql = `
          select id, name, mobile, role,
          date_format(create_time,'%Y-%m-%d %H:%i:%S') as create_time,
          date_format(update_time,'%Y-%m-%d %H:%i:%S') as update_time
          from t_admin_user where `;

    switch (parseInt(body.stype)) {
      case 1:
        queryUserSql += 'name=' + mysql.escape(body.svalue);
        break;
      case 2:
        queryUserSql += 'mobile=' + mysql.escape(body.svalue);
        break;
      default:
        queryUserSql += 'name=' + mysql.escape(body.svalue);
    }

    let conn = db.getConn();
    let result = await helper.p(conn, conn.query, queryUserSql);
    db.closeConn(conn);

    if (result && result.response) {
      ctx.body = helper.getReturnObj(retConfig.defaultError, {
        message: (result && result.error && result.error.message)
      });
      return false;
    }

    ctx.body = helper.getReturnObj({
      data: result.response
    });
  },

  create: async (ctx) => {

    let data = ctx.request.body || {};
    data.role = parseInt(data.role) || 0;
    if (!data.name || !data.mobile) {
      ctx.body = helper.getReturnObj(retConfig.paramError);
      return false;
    }

    data.password = helper.createRandomNum(8);

    let conn = db.getConn();

    await helper.p(conn, conn.query, 'START TRANSACTION');
    let createSql = mysql.format('INSERT INTO t_admin_user (name, mobile, role, password) VALUES (?, ?, ?, ?);', [
      data.name,
      data.mobile,
      data.role,
      data.password
    ]);

    let create = await helper.p(conn, conn.query, createSql);
    if (!create || !create.response) {
      logger.error('创建用户失败 error: ' + JSON.stringify(create) + '; sql:' + createSql);
      await helper.p(conn, conn.rollback);
      ctx.body = helper.getReturnObj(retConfig.defaultError, {
        message: (create && create.error && create.error.message)
      });
    } else {
      let querySql = mysql.format('select * from t_admin_user where mobile=?;', [data.mobile]);
      let result = await helper.p(conn, conn.query, querySql);

      if (result && result.response && result.response.length) {
        await helper.p(conn, conn.commit);
        data.id = result.response[0].id;
        ctx.body = helper.getReturnObj({
          data: data
        });
        logger.info('创建用户成功 :' + JSON.stringify(result.response));
      } else {
        await helper.p(conn, conn.rollback);
        ctx.body = helper.getReturnObj(retConfig.defaultError, {
          message: (result && result.error && result.error.message)
        });
      }
    }
    db.closeConn(conn);
  },

  delete: async (ctx) => {
    let data = ctx.request.body;

    if (!data.id) {
      this.body = helper.getReturnObj(retConfig.paramError);
      return false;
    }

    let conn = db.getConn();
    let sql = mysql.format('delete from t_admin_user where id=?;', [data.id]);
    let result = await helper.p(conn, conn.query, sql);
    db.closeConn(conn);

    if (!result || !result.response || result.response.affectedRows == 0) {
      let tips = (result && result.error && result.error.message);
      if (result && result.response && result.response.affectedRows == 0) {
        tips = '用户不存在，删除失败！';
      }
      ctx.body = helper.getReturnObj(retConfig.defaultError, {
        message: tips
      });
      return false;
    }

    let tips = '删除用户成功 user_id :' + data.id;
    logger.info(tips);
    ctx.body = helper.getReturnObj({
      message: tips
    });
  },

  reset: async (ctx) => {
    let data = ctx.request.body;

    if (!data.id) {
      this.body = helper.getReturnObj(retConfig.paramError);
      return false;
    }

    let newPwd = helper.createRandomNum(8);

    let conn = db.getConn();
    let sql = mysql.format('update t_admin_user set password=? where id=?;', [newPwd, data.id]);
    let result = await helper.p(conn, conn.query, sql);
    db.closeConn(conn);
    if (!result || !result.response || result.response.affectedRows == 0) {
      let tips = (result && result.error && result.error.message);
      if (result && result.response && result.response.affectedRows == 0) {
        tips = '用户不存在！';
      }
      tips = '重置密码失败：' + tips;
      logger.error(tips);
      ctx.body = helper.getReturnObj(retConfig.defaultError, {
        message: tips
      });
      return false;
    }

    logger.info('重置密码成功 user_id :' + data.id + '; new password:' + newPwd);
    ctx.body = helper.getReturnObj({
      data: {
        id: data.id,
        password: newPwd
      }
    });

  },

};

module.exports = user;