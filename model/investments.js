/**
 * Created by zhongpingping on 2017/5/24.
 *
 * 使用promise all + connection pool
 */
'use strict';

const helper = require('../utils/helper');
const retConfig = require('../config/retConfig');
const db = require('../utils/db');
const mysql = require('mysql');

const investments = {

  listSqlGenerator : (search_type,search_value,product_type,trade_status,min_amount,max_amount,date_type,d_from,d_to,offset,pageSize) =>{

    let conditions = ' WHERE i.state=1 AND c.state=1 ';

    if(search_type && search_value){
      switch(search_type){
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

    if(product_type){
      conditions += ' AND i.product_type=' + mysql.escape(product_type);
    }

    if(trade_status){
      conditions += ' AND i.status=' + mysql.escape(trade_status);
    }

    if(min_amount){
      conditions += ' AND i.principal >=' + mysql.escape(min_amount * 100);
    }

    if(max_amount){
      conditions += ' AND i.principal <=' + mysql.escape(max_amount * 100);
    }

    if(d_from){
      switch (date_type){
        case '1':
          conditions += ' AND i.subscribe_success_time >= ' + mysql.escape(d_from);
          break;
        case '2':
          conditions += ' AND i.repay_date >= ' + mysql.escape(d_from);
          break;
        default:
      }
    }

    if(d_to){
      switch (date_type){
        case '1':
          conditions += ' AND i.subscribe_success_time <= ' + mysql.escape(d_to);
          break;
        case '2':
          conditions += ' AND i.repay_date <= ' + mysql.escape(d_to);
          break;
        default:
      }
    }


    let sql = `
      SELECT
        i.order_no AS order_no,
        i.customer_id AS investor_id,
        c.name AS investor_name,
        c.mobile AS mobile,
        i.product_title AS product_title,
        i.product_type AS product_type,
        if(!i.repay_date, '' ,DATE_FORMAT(i.repay_date,'%Y-%m-%e %h:%i:%S')) AS expired_time,
        if(!i.subscribe_success_time, '',DATE_FORMAT(i.subscribe_success_time,'%Y-%m-%e %h:%i:%S')) AS subscribe_time,
        i.year_interest_rate AS annual_profit_rate,
        i.principal AS principal_amount,
        i.match_principal AS current_principal_amount,
        i.status AS trade_status
      FROM t_invest i
        LEFT JOIN t_customer c
          ON c.id = i.customer_id
      ${conditions} 
      ORDER BY i.id DESC LIMIT ${offset} , ${pageSize} ;
      `;

    let countSql = `
      SELECT 
        count(1) AS total
      FROM t_invest i
        LEFT JOIN t_customer c
          ON c.id = i.customer_id
      ${conditions} ;  
    `;

    return {
      sql : sql,
      countSql : countSql
    }

  },
  list : async (ctx) =>{
    let params = ctx.request.body || {};

    console.log(params);
    let search_type = params.search_type; // 1, 投资人姓名 2，投资人手机号 3，交易号
    let search_value = params.search_value;
    let product_type = params.product_type;

    // 0=预约中|1=预约成功|2=预约失败|3=投资成功|4=投资失败|5=申请赎回|6=申请赎回审核成功|7=申请赎回审核失败|8=已赎回|9=逾期|10=已回款
    let trade_status = params.trade_status;
    let min_amount = params.min_amount;
    let max_amount = params.max_amount;
    let date_type = params.date_type; // 1,预约时间 2，到期时间
    let d_from = params['from'];
    let d_to = params['to'];
    let page = params['page'] || 1;
    let pageSize = params['pageSize'] || 20;
    let offset = (page -1) * pageSize;


    let sqlObject = investments.listSqlGenerator(search_type,search_value,product_type,trade_status,min_amount,max_amount,date_type,d_from,d_to,offset,pageSize);

    let pool = db.getPool();
    let result = [];

    try{
      result = await Promise.all([
        helper.csp(pool,pool.query, sqlObject.sql),
        helper.csp(pool,pool.query, sqlObject.countSql),
      ])
    }catch(e){
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


  },

  get : async (ctx) =>{
    let params = ctx.request.body || {};

    let order_no = params.order_no || '';

    if(!order_no){
      ctx.body = helper.getReturnObj(retConfig.paramError,{message:'缺少交易单号'});
      return false;
    }

    order_no = mysql.escape(order_no);

    let summarySql = `
    
      SELECT
        c.name AS investor_name,
        c.mobile AS mobile,
        c.is_lock AS account_status,
        i.order_no AS order_no,
        i.product_title AS product_title,
        i.product_type AS product_type,
        i.product_id AS product_id,
        if(!i.repay_date, '' ,DATE_FORMAT(i.repay_date,'%Y-%m-%e %h:%i:%S')) AS expired_time,
        if(!i.subscribe_success_time, '' ,DATE_FORMAT(i.subscribe_success_time,'%Y-%m-%e %h:%i:%S')) AS subscribe_time,
        if(!i.invest_success_time, '' ,DATE_FORMAT(i.invest_success_time,'%Y-%m-%e %h:%i:%S')) AS invest_begin_time,
        i.year_interest_rate AS annual_profit_rate,
        i.principal AS principal_amount,
        i.match_principal AS current_principal_amount,
        w.interest_total AS profit_amount,
        i.status AS trade_status
      FROM t_invest i
        LEFT JOIN t_customer c
          ON c.id = i.customer_id
        LEFT JOIN t_wallet w
          ON w.customer_id = i.customer_id
      WHERE i.order_no = ${order_no};
    
    `;

    let financialClaimSql = `
      SELECT
        t.name AS borrower_name,
        if(!f.success_time, '' ,DATE_FORMAT(f.success_time,'%Y-%m-%e %h:%i:%S')) AS match_time,
        f.amt AS match_amount
      FROM t_invest_loan f
      
        LEFT JOIN t_loan t
        ON f.loan_customer_id = t.customer_id AND f.loan_order_no=t.order_no
      
      WHERE f.invest_order_no = ${order_no};

    `;


    let investmentHistorySql = `
      SELECT
        if(!g.update_time, '' ,DATE_FORMAT(g.update_time,'%Y-%m-%e %h:%i:%S')) AS update_time, g.content
      FROM 
        t_invest_log g
        
        LEFT JOIN t_invest i
        ON i.order_no = g.invest_order_no
      WHERE i.order_no =${order_no}; 
    `;


    let pool = db.getPool();
    let result = [];

    try{
      result = await Promise.all([
        helper.csp(pool, pool.query, summarySql),
        helper.csp(pool, pool.query, financialClaimSql),
        helper.csp(pool, pool.query, investmentHistorySql)]);
    }catch(e){
      ctx.body = helper.getReturnObj(retConfig.defaultError, {
        message: JSON.stringify(e)
      });
      return false;
    }

    let summary = result[0].response;
    let financialClaims = result[1].response;
    let investmentHistory = result[2].response;
    ctx.body = helper.getReturnObj({
      data: {
        summary: summary,
        financialClaims: financialClaims,
        investmentHistory: investmentHistory
      }
    });

  }
};

module.exports = investments;