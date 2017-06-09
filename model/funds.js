/**
 * Created by zhongpingping on 2017/6/2.
 */

'use strict';

const helper = require('../utils/helper');
const retConfig = require('../config/retConfig');
const db = require('../utils/db');
const mysql = require('mysql');

const funds = {

  listSqlGenerator: (search_type, search_value, fund_status, min_amount, max_amount, create_time_from, create_time_to, offset, pageSize) => {

    let conditions = ' WHERE i.state=1 AND c.state=1 ';

    if (search_type && search_value) {
      switch (search_type) {
        case '1':
          conditions += ' AND c.name=' + mysql.escape(search_value);
          break;
        case '2':
          conditions += ' AND c.mobile=' + mysql.escape(search_value);
          break;
        case '3':
          conditions += ' AND i.order_no=' + mysql.escape(search_value);
          break;
        default:
      }
    }


    if (fund_status) {
      conditions += ' AND i.type=' + mysql.escape(fund_status);
    }

    if (min_amount) {
      conditions += ' AND i.amt >=' + mysql.escape(min_amount * 100);
    }
    if (max_amount) {
      conditions += ' AND i.amt <=' + mysql.escape(max_amount * 100);
    }

    if (create_time_from) {
      conditions += ' AND i.create_time >=' + mysql.escape(create_time_from);
    }
    if (create_time_to) {
      conditions += ' AND i.create_time <=' + mysql.escape(create_time_to);
    }


    let sql = `
      SELECT
        i.order_no AS order_no,
        i.customer_id AS investor_id,
        c.name AS investor_name,
        c.mobile AS mobile,
        if(!i.create_time, '' ,DATE_FORMAT(i.create_time,'%Y-%m-%e %h:%i:%S')) AS invest_create_time,
        i.type AS fund_status,
        i.amt AS amount,
        i.balance_before AS amount_before_deal,
        i.balance_after AS amount_after_deal,
        i.status AS status,
        i.error_msg AS remark
      FROM t_trade_record i
        LEFT JOIN t_customer c
          ON c.id = i.customer_id
      ${conditions} 
      ORDER BY i.id DESC LIMIT ${offset} , ${pageSize} ;
      `;

    let countSql = `
      SELECT 
        count(1) AS total
      FROM t_trade_record i
        LEFT JOIN t_customer c
          ON c.id = i.customer_id
      ${conditions} ;  
    `;

    return {
      sql: sql,
      countSql: countSql
    }

  },
  list: async (ctx) => {
    let params = ctx.request.body || {};

    let search_type = params.search_type; // 1, 投资人姓名 2，投资人手机号 3，交易号
    let search_value = params.search_value;

    // type 交易类型(1=充值|2=提现|3=投资|4=到期赎回|5=提前赎回|6=奖励|7=退款)
    let fund_status = params.fund_status;
    let min_amount = params.min_amount; // 交易金额上限
    let max_amount = params.max_amount; // 交易金额下限
    let create_time_from = params['from'];
    let create_time_to = params['to'];
    let page = params['page'] || 1;
    let pageSize = params['pageSize'] || 20;
    let offset = (page - 1) * pageSize;


    let sqlObject = funds.listSqlGenerator(search_type, search_value, fund_status, min_amount, max_amount, create_time_from, create_time_to, offset, pageSize);

    let pool = db.getPool();
    let result = [];

    try {
      result = await Promise.all([
        helper.csp(pool, pool.query, sqlObject.sql),
        helper.csp(pool, pool.query, sqlObject.countSql),
      ])
    } catch (e) {
      ctx.body = helper.getReturnObj(retConfig.defaultError, {
        message: JSON.stringify(e)
      });
      return false;
    }

    let list = result[0].response;
    let total = result[1].response[0]['total'] || 0;
    let totalPage = Math.ceil(total / pageSize) || 0;
    ctx.body = helper.getReturnObj({
      data: {
        total: total,
        totalPage: totalPage,
        list: list
      }
    });


  }
};

module.exports = funds;