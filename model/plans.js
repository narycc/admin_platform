/**
 * Created by zhongpingping on 2017/5/25.
 */

'use strict';

const helper = require('../utils/helper');
const retConfig = require('../config/retConfig');
const db = require('../utils/db');
const mysql = require('mysql');
const config = require('../config/config');
const request = require('request');

const plans = {

  listSqlGenerator: (search_type, search_value, type ,status, d_from, d_to, offset, pageSize) => {

    let conditions = ' WHERE p.state=1 ';

    if (search_type && search_value) {
      switch (search_type) {
        case '1':
          conditions += ' AND p.title=' + mysql.escape(search_value);
          break;
        case '2':
          conditions += ' AND p.id=' + mysql.escape(search_value);
          break;
        default:
      }
    }

    if(type === 'online'){
      if (status) {
        conditions += ' AND p.status=' + mysql.escape(status);
      }else {
        conditions += ' AND (p.status=2 OR p.status=3) ' ;
      }
    }else{
      conditions += ' AND p.status=1 ' ;
    }


    if (d_from) {
      conditions += ' AND p.start_time >=' + mysql.escape(d_from);
    }

    if (d_to) {
      conditions += ' AND p.end_time <=' + mysql.escape(d_to);
    }


    let sql = `
      
      SELECT
        p.id,
        p.product_type,
        p.title AS product_title,
        p.min_year_interest_rate, p.max_year_interest_rate,
        p.loan_days AS freeze_days,
        if(!p.start_time, '' ,DATE_FORMAT(p.start_time,'%Y-%m-%e %h:%i:%S')) AS raise_from_time,
        if(p.end_time, '' ,DATE_FORMAT(p.end_time,'%Y-%m-%e %h:%i:%S')) AS raise_to_time,
        p.total_amt, p.sell_amt, p.status,
        p.operator_id, u.name
      
      FROM t_product p
      LEFT JOIN t_admin_user u
      ON u.id = p.operator_id
      ${conditions}
      ORDER BY p.id DESC LIMIT ${offset} , ${pageSize} ;
      `;

    let countSql = `
    SELECT 
        count(1) AS total
    FROM t_product p ${conditions}
    
    `;

    return {
      sql: sql,
      countSql: countSql
    }

  },
  list: async (ctx) => {
    let params = ctx.request.body || {};

    let type = params.type;
    let search_type = params.search_type; // 1, 产品类型 product_type 2，产品期数 id
    let search_value = params.search_value;

    // 计划状态 1,待上线 2,募集中 3,已结束

    let d_from = params['from'];
    let d_to = params['to'];
    let page = params['page'] || 1;
    let pageSize = params['pageSize'] || 20;
    let offset = (page - 1) * pageSize;

    let sqlObject = "";
    if(type === 'pending'){
      sqlObject = plans.listSqlGenerator(search_type, search_value,'pending', null, d_from, d_to, offset, pageSize);
    }else{
      let status = params.status;
      sqlObject = plans.listSqlGenerator(search_type, search_value,'online' ,status, d_from, d_to, offset, pageSize)
    }

    let pool = db.getPool();
    let result = [];


    try {
      result = await Promise.all([
        helper.csp(pool, pool.query, sqlObject.sql),
        helper.csp(pool, pool.query, sqlObject.countSql)
      ])
    } catch (e) {
      console.log(e);
      ctx.body = helper.getReturnObj(retConfig.defaultError);
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
    })

    /*let result = await Promise.all([
     helper.p(pool,pool.query,sqlObject.sql),
     helper.p(pool, pool.query,sqlObject.countSql)
     ]);

     if (!result || !result[0].response) {
     ctx.body = helper.getReturnObj(retConfig.defaultError, {
     message: (result[0] && result[0].error && result[0].error.message)
     });
     return false;
     }

     if (!result || !result[1].response) {
     ctx.body = helper.getReturnObj(retConfig.defaultError, {
     message: (result[1] && result[1].error && result[1].error.message)
     });
     return false;
     }*/

    /* try {
     result[0] = await helper.csp(pool, pool.query, sqlObject.sql);
     result[1] = await helper.csp(pool, pool.query, sqlObject.countSql);
     } catch (e) {
     console.log('xx');
     console.log(e);
     ctx.body = helper.getReturnObj(retConfig.defaultError);
     return false;
     }*/

    /*console.log((new Date()).getTime());
     let conn = db.getConn();

     let listResult = await helper.p(conn,conn.query,sqlObject.sql);
     if (!listResult || !listResult.response) {
     ctx.body = helper.getReturnObj(retConfig.defaultError, {
     message: (listResult && listResult.error && listResult.error.message)
     });
     return false;
     }

     let countResult = await helper.p(conn, conn.query,sqlObject.countSql);
     if (!countResult || !countResult.response) {
     ctx.body = helper.getReturnObj(retConfig.defaultError, {
     message: (countResult && countResult.error && countResult.error.message)
     });
     return false;
     }

     db.closeConn(conn);
     console.log((new Date()).getTime());


     let list = listResult.response;
     let total = countResult.response[0]['total'] || 0;
     let totalPage = Math.ceil(total / pageSize) || 0;
     ctx.body = helper.getReturnObj({
     data: {
     total: total,
     totalPage: totalPage,
     list: list
     }
     });*/


  },

  detail: async (ctx) => {
    let params = ctx.request.body || {};
    let id = params.id;
    if (!id) {
      tx.body = helper.getReturnObj(retConfig.paramError, {message: '缺少投资计划唯一id'});
      return false;
    }
    id = mysql.escape(id);

    let sql = `
      SELECT
        id, product_type,title AS product_title,loan_days AS freeze_days,
        max_invest_amt, min_invest_amt, total_amt, sell_amt, repay_way, status,
        start_time AS raise_from_time, end_time AS raise_to_time
      
      FROM t_product
      
      WHERE state = 1 AND id = ${id};
    `;

    let pool = db.getPool();
    let result = [];

    try {
      result = await helper.csp(pool, pool.query, sql);
    } catch (e) {
      ctx.body = helper.getReturnObj(retConfig.defaultError, {message: JSON.stringify(e)});
      return false;
    }

    ctx.body = helper.getReturnObj({
      data: result.response[0]
    });


  },

  detailList: async (ctx) => {

    let params = ctx.request.body || {};
    let id = params.id;
    if (!id) {
      tx.body = helper.getReturnObj(retConfig.paramError, {message: '缺少投资计划唯一id'});
      return false;
    }
    id = mysql.escape(id);

    let page = params['page'] || 1;
    let pageSize = params['pageSize'] || 20;
    let offset = (page - 1) * pageSize;

    let sql = `
    
      SELECT
        t.order_no AS order_no,
        t.customer_id AS investor_id,
        c.name AS investor_name,
        c.mobile AS investor_mobile,
        t.subscribe_success_time AS subscribe_success_time,
        t.repay_date AS repay_date,
        t.principal AS principal_amount,
        t.match_principal AS current_principal_amount,
        t.status AS trade_status
      FROM t_invest t
        LEFT JOIN t_customer c
        ON t.customer_id = c.id
      WHERE t.state=1 AND t.product_id = ${id} AND c.state=1
      ORDER BY t.id DESC LIMIT ${offset}, ${pageSize};
      
    `;

    let countSql = ` 
      SELECT count(1) AS total 
      FROM t_invest t
        LEFT JOIN t_customer c
        ON t.customer_id = c.id
      WHERE t.state=1 AND t.product_id = ${id} AND c.state=1  
    `;

    let pool = db.getPool();
    let result = [];

    try {
      result = await Promise.all([
        helper.csp(pool, pool.query, sql),
        helper.csp(pool, pool.query, countSql)
      ]);
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
    })

  },
  deletePlan : async(ctx) =>{



    let params = ctx.request.body || {};
    let productId = params.product_id;

    if (!productId) {
      tx.body = helper.getReturnObj(retConfig.paramError, {message: '缺少理财计划唯一id'});
      return false;
    }


    let operatorId = ctx.state && ctx.state.userInfo && ctx.state.userInfo.id;
    if (!operatorId) {
      tx.body = helper.getReturnObj(retConfig.paramError, {message: '登录信息获取失败'});
      return false;
    }

    let requestParams = {
      productId : productId,
      operatorId : operatorId
    };

    let url = config.backend_ip + '/huilicai/delete_product';
    /*let cipher = helper.generateRSACipher("operatorId="+operatorId+"&productId="+productId);
    let mySign = helper.generateRSASign(cipher);

    let decry = helper.generateRSADecrypt('JBuztt9i2Z2W/Z/q+2XbYf4MMitsyZ4J5+Vqb27YjTte929qKliec+3Vx03lY6cRY1gtzR4/LMBgpjqUAWFKYO83/JGcfjTixDmrU2zKajbpMbrRTpJms3JnQRm3QX/ZC4acotV/a1uXKfDXNbesOYDxvrdCkiB3pg67oO7F2II=');
    console.log(decry.toString('utf-8'));*/

    var options = {
      method: 'POST',
      url: url,
      body: requestParams,
      json: true,
      /*headers: {
        'cipher': cipher,
        'sign': mySign
      }*/
    };

    console.log(options);


    let result;
    try {

      result = await helper.p(null,request,options);


    } catch (e) {
      console.log(JSON.stringify(e));
      ctx.body = helper.getReturnObj(retConfig.defaultError);
      return false;
    }

    ctx.body = helper.getReturnObj({
      data: JSON.stringify(result)
    })

  },

  createPlan : async(ctx) =>{

    let params = ctx.request.body || {};
    /*
    * let operatorId = params.operatorId;
    * if (!operatorId) {
     tx.body = helper.getReturnObj(retConfig.paramError, {message: '缺少操作人id'});
     return false;
     }
     let requestParams = {
     "productTemplate": 1, //理财计划模版
     "startTime": 1595713555000, //开始时间
     "totalAmt": 1000000000000000, //总金额
     "endTime": 1595713999000, //结束时间
     "operatorId": 1
     };
    * */
    let productTemplate = params.productTemplate;
    let startTime = params.startTime;
    let endTime = params.endTime;
    let totalAmt = params.totalAmt;


    if (!productTemplate) {
      tx.body = helper.getReturnObj(retConfig.paramError, {message: '缺少理财产品类型'});
      return false;
    }

    if (!startTime) {
      tx.body = helper.getReturnObj(retConfig.paramError, {message: '缺少计划发布时间'});
      return false;
    }
    if (!endTime) {
      tx.body = helper.getReturnObj(retConfig.paramError, {message: '缺少截至投资时间'});
      return false;
    }
    if (!totalAmt) {
      tx.body = helper.getReturnObj(retConfig.paramError, {message: '缺少可预约投资总额'});
      return false;
    }
    let requestParams = {
      "productTemplate": productTemplate, //理财计划模版
      "startTime": new Date(startTime).getTime(), //开始时间
      "totalAmt": totalAmt, //总金额
      "endTime": new Date(endTime).getTime(), //结束时间
      "operatorId": 1
    };



    let url = config.backend_ip + '/huilicai/create_product';

    let options = {
      method: 'POST',
      url: url,
      body: requestParams,
      json: true,
    };


    let result;
    try {

      result = await helper.p(null,request,options);

    } catch (e) {
      ctx.body = helper.getReturnObj(retConfig.defaultError,{message: JSON.stringify(e)});
      return false;
    }

    ctx.body = helper.getReturnObj({
      data: result && result.response && result.response.body&& result.response.body.data
    })
  },
  updatePlan : async(ctx) =>{

    let params = ctx.request.body || {};
    /*
     let productId = params.productId;
     let productTemplate = params.productTemplate;
     let startTime = params.startTime;
     let endTime = params.endTime;
     let totalAmt = params.totalAmt;
     let operatorId = params.operatorId;

     if (!productId) {
     tx.body = helper.getReturnObj(retConfig.paramError, {message: '缺少理财产品id'});
     return false;
     }

     if (!productTemplate) {
     tx.body = helper.getReturnObj(retConfig.paramError, {message: '缺少理财产品类型'});
     return false;
     }
     if (!operatorId) {
     tx.body = helper.getReturnObj(retConfig.paramError, {message: '缺少操作人id'});
     return false;
     }
     if (!startTime) {
     tx.body = helper.getReturnObj(retConfig.paramError, {message: '缺少计划发布时间'});
     return false;
     }
     if (!endTime) {
     tx.body = helper.getReturnObj(retConfig.paramError, {message: '缺少截至投资时间'});
     return false;
     }
     if (!totalAmt) {
     tx.body = helper.getReturnObj(retConfig.paramError, {message: '缺少可预约投资总额'});
     return false;
     }
     let requestParams = {
     "productTemplate": productTemplate, //理财计划模版
     "startTime": startTime, //开始时间
     "totalAmt": totalAmt, //总金额
     "endTime": endTime, //结束时间
     "operatorId": operatorId
     };
     */

    let requestParams = {
      "productId":91,
      "productTemplate": 1, //理财计划模版
      "startTime": 1595713555000, //开始时间
      "totalAmt": 8888888, //总金额
      "endTime": 1595713999000, //结束时间
      "operatorId": 1
    };

    let url = config.backend_ip + '/huilicai/update_product';

    let options = {
      method: 'POST',
      url: url,
      body: requestParams,
      json: true,
    };


    let result;
    try {

      result = await helper.p(null,request,options);

    } catch (e) {
      ctx.body = helper.getReturnObj(retConfig.defaultError,{message: JSON.stringify(e)});
      return false;
    }

    let rawRes = result.response.body;

    if(rawRes.code === 0){
      ctx.body = helper.getReturnObj({
        data: rawRes.data
      })
    }else{
      tx.body = helper.getReturnObj(retConfig.defaultError, {message: '请求出错'+rawRes.message});
    }

  },

  productInfo : async(ctx) =>{
    let params = ctx.request.body || {};
    if(!params.product_id){
      tx.body = helper.getReturnObj(retConfig.paramError, {message: '缺少产品product_id'});
      return false;
    }

    let sql = `
      SELECT label_type,total_amt,
      if(!start_time, '' ,DATE_FORMAT(start_time,'%Y-%m-%e %h:%i:%S')) AS start_time,
      if(!end_time, '' ,DATE_FORMAT(end_time,'%Y-%m-%e %h:%i:%S')) AS end_time 
      FROM t_product 
      WHERE id=${params.product_id};
    `;

    let conn = db.getConn();

    let listResult = await helper.p(conn,conn.query,sql);
    if (!listResult || !listResult.response) {
      ctx.body = helper.getReturnObj(retConfig.defaultError, {
        message: (listResult && listResult.error && listResult.error.message)
      });
      return false;
    }

    db.closeConn(conn);


    let list = listResult.response[0];

    ctx.body = helper.getReturnObj({
      data: list
    });
  }

};

module.exports = plans;