/**
 * Created by zhongpingping on 2017/5/25.
 *
 * 获取产品的详情；
 */

'use strict';

const helper = require('../utils/helper');
const retConfig = require('../config/retConfig');
const db = require('../utils/db');
const mysql = require('mysql');

const products = {


  detail : async (ctx) =>{
    let params = ctx.request.body || {};

    let product_template = params.product_template; // 1, 产品类型

    if(!product_template){
      ctx.body = helper.getReturnObj(retConfig.paramError,{message:'缺少产品类型号'});
      return false;
    }

    product_template = mysql.escape(product_template);

    let sql = `
    
      SELECT * FROM t_product_introduce WHERE state='1' AND product_template=${product_template};
    
    `;


    let pool = db.getPool();
    let result = [];

    try{
      result = await helper.csp(pool,pool.query,sql);
    }catch (e){
      ctx.body = helper.getReturnObj(retConfig.defaultError, {
        message: JSON.stringify(e)
      });
      return false;
    }

    let list = result.response;

    ctx.body = helper.getReturnObj({
      data: {
        list: list
      }
    });


  }

};

module.exports = products;