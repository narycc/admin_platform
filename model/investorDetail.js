/**
 * Created by yeshanshan on 2017/5/26.
 */
'use strict';

const helper = require('../utils/helper');
const retConfig = require('../config/retConfig');
const db = require('../utils/db');
const mysql = require('mysql');
const logger = helper.getLogger('model-user', 'auto'); // , './logs/user-file.log'

const investorDetail = {

  getBaseInfo: async(ctx) => {
    let data = ctx.request.body || {};
    let investor_id = data.investor_id;

    if (investor_id) {
      let result = [];
      let pool = db.getPool();
      let sql_info = `
                select
                  customer.id as investor_id,
                  customer.name,
                  customer.mobile,
                  customer.id_card_no as id_no,
                  customer.is_lock as account_status,
                  date_format(customer.last_access_time,'%Y-%m-%d %H:%i:%S') as last_login_time,
                  card.card_no as bank_card_no
                from t_customer customer
                LEFT JOIN t_bank_card card ON customer.id = card.customer_id 
                where customer.id = "${investor_id}";
            `;
      let sql_invest_time = `
                select date_format(invest_success_time,'%Y-%m-%d %H:%i:%S') as invest_success_time 
                from t_invest 
                where customer_id = "${investor_id}" order by invest_success_time desc;
            `;
      try {
        result = await Promise.all([
          helper.csp(pool, pool.query, sql_info),
          helper.csp(pool, pool.query, sql_invest_time)
        ])

      } catch (e) {
        ctx.body = helper.getReturnObj(retConfig.defaultError);
        return false;
      }

      if(result[0].response.length){
        var list = result[0].response[0];

        let invest_success_time = result[1].response[0] ? result[1].response[0]['invest_success_time'] : '';
        list['invest_success_time'] = invest_success_time;
        list['id_no'] = list['id_no']?helper.setAESData(list['id_no']):list['id_no'];
        list['gender'] = helper.getSexByCardId(list['id_no']);
        list['age'] = helper.getAgeByCardId(list['id_no']);
        list['id_no'] = helper.setCodeToCardId(list['id_no']);
        list['bank_card_no'] = list['bank_card_no']?helper.setAESData(list['bank_card_no']):list['bank_card_no'];
        list['bank_card_no'] = helper.setCodeToCardId(list['bank_card_no']);
      }else{
        var list = [];
      }

      ctx.body = helper.getReturnObj({
        data: list
      })
    } else {
      ctx.body = helper.getReturnObj({
        message: '投资人ID不能为空'
      });
      return false;
    }
  },

  accountProperty: async(ctx) => {
    let data = ctx.request.body || {};
    let investor_id = data.investor_id;
    if (investor_id) {
      let result = [];
      let pool = db.getPool();
      let sql_recommender = `
                select
                 a.recommender as recommender_id,
                 b.name as recommender_name
                from t_customer as a
                left join (
                 select id,name from t_customer
                ) b
                on a.recommender = b.id
                where a.id = "${investor_id}"
            `;
      let sql_account = `
                select
                 (a.balance+a.lock_amt) as property_total,
                 a.balance as available_balance,
                 a.lock_amt as invest_frozen_total,
                 a.principal_wait as invest_current_total,
                 a.interest_total as invest_profit_total,
                 a.principal_total as invest_ammout_total,
                 b.invest_nums
                from t_wallet a
                left join (select customer_id,count(*) as invest_nums from t_invest where customer_id = "${investor_id}" and status in ('3','5','6','7','9','10')) b
                on a.customer_id = b.customer_id
                where a.customer_id = "${investor_id}"
            `;

      try {
        result = await Promise.all([
          helper.csp(pool, pool.query, sql_recommender),
          helper.csp(pool, pool.query, sql_account)
        ])

      } catch (e) {
        ctx.body = helper.getReturnObj(retConfig.defaultError);
        return false;
      }

      let accounts = result[0].response;
      if (accounts[0]) {
        accounts[0]['belong_to'] = '';
      }
      let property = result[1].response;
      ctx.body = helper.getReturnObj({
        data: {
          accounts: accounts,
          property: property
        }
      })

    } else {
      ctx.body = helper.getReturnObj({
        message: '投资人ID不能为空'
      });
      return false;
    }
  },

  investRecords: async(ctx) => {
    let data = ctx.request.body || {};
    let page = data['page'] || 1;
    let pageSize = parseInt(data['pageSize']) || 200;
    let offset = (page - 1) * pageSize;
    let deal_no = data.deal_no || '';
    let trade_type = data.trade_type;
    let condition = '';
    let investor_id = data.investor_id;
    if (deal_no) {
      condition += ' and order_no = ' + mysql.escape(deal_no);
    }

    if (trade_type !== '') {
      switch (parseInt(trade_type)) {
        case 0 :
          condition += ' and status in ("0","1") ';//预约中，预约成功
          break;
        case 1:
          condition += ' and status = "2" ';
          break;
        case 2:
          condition += ' and status in("3","7") ';
          break;
        case 3:
          condition += ' and status = "10" ';
          break;
        case 4:
          condition += ' and status in ("5","6") ';
          break;
        case 5:
          condition += ' and status = "8" ';
          break;
        case 6:
          condition += ' and status = "4" ';
          break;
        default:
          break;
      }
    }
    if (investor_id) {
      investor_id = mysql.escape(investor_id);
      let result = [];
      let pool = db.getPool();
      let sql = `
            select
             order_no as deal_no,
             product_type,
             year_interest_rate as annual_profit_rate,
             date_format(redeem_date,'%Y-%m-%d') as redeem_date,
             date_format(subscribe_success_time,'%Y-%m-%d') as subscribe_time,
             date_format(repay_date,'%Y-%m-%d') as expired_time,
             principal as principal_amount,
             match_principal as current_principal_amount,
             interest as current_profit_amount,
             status as trade_status
            from t_invest 
            where customer_id = ${investor_id} ${condition} 
            limit ${offset} , ${pageSize};
            `;
      console.log(sql);
      let sql_total = ` select count(1) as total from t_invest where customer_id = ${investor_id} ${condition} `;

      try {
        result = await Promise.all([
          helper.csp(pool, pool.query, sql),
          helper.csp(pool, pool.query, sql_total)
        ])
      } catch (e) {
        ctx.body = helper.getReturnObj(retConfig.defaultError);
        return false;
      }

      let response = result[0].response;
      let response_total = result[1].response;
      let total = (response_total && response_total[0] && response_total[0]['total']) || 0;
      let totalPage = Math.ceil(total / pageSize) || 0;
      ctx.body = helper.getReturnObj({
        data: {
          list: response
        },
        totalPage: totalPage,
        total: total,
      })
    } else {
      ctx.body = helper.getReturnObj({
        message: '投资人ID不能为空'
      });
      return false;
    }

  },

  fundRecords: async(ctx) => {
    let data = ctx.request.body || {};
    let page = data['page'] || 1;
    let invest_create_to = data.invest_create_to;
    let invest_create_from = data.invest_create_from;
    let pageSize = parseInt(data['pageSize']) || 200;
    let offset = (page - 1) * pageSize;
    let fund_status = data.fund_status;
    let condition = '';
    let investor_id = data.investor_id;
    if (fund_status != '') {
      fund_status = parseInt(fund_status)
      switch (parseInt(fund_status)) {
        case 1:
          condition += ' and type = ' + mysql.escape(fund_status);
          break;
        case 2:
          condition += ' and type = ' + mysql.escape(fund_status);
          break;
        case 3:
          condition += ' and type = ' + mysql.escape(fund_status);
          break;
        case 4:
          condition += ' and type = ' + mysql.escape(fund_status);
          break;
        case 5:
          condition += ' and type = ' + mysql.escape(fund_status);
          break;
        case 6:
          condition += ' and type = ' + mysql.escape(fund_status);
          break;
        case 7:
          condition += ' and type = ' + mysql.escape(fund_status);
          break;
        default:
          break;
      }
    }

    if (invest_create_from) {
      condition += ' and create_time >= ' + mysql.escape(invest_create_from);
    }

    if (invest_create_to) {
      condition += ' and create_time <= ' + mysql.escape(invest_create_to);
    }

    if (investor_id) {
      investor_id = mysql.escape(investor_id);
      let result = [];
      let pool = db.getPool();
      let sql = `
          select 
            order_no,
            date_format(create_time,'%Y-%m-%d %H:%i:%S') as create_time,
            type as fund_status,
            amt as amount,
            balance_before as amount_before_deal,
            balance_after as amount_after_deal,
            status,
            error_msg as remark
          from t_trade_record
          where customer_id = ${investor_id} ${condition}
          limit ${offset} , ${pageSize};
        `;
      let sql_total = ` select count(1) as total from t_trade_record where customer_id = ${investor_id} ${condition} `;
      try {
        result = await Promise.all([
          helper.csp(pool, pool.query, sql),
          helper.csp(pool, pool.query, sql_total)
        ])
      } catch (e) {
        ctx.body = helper.getReturnObj(retConfig.defaultError);
        return false;
      }
      let response = result[0].response;
      let response_total = result[1].response;
      let total = (response_total && response_total[0] && response_total[0]['total']) || 0;
      let totalPage = Math.ceil(total / pageSize) || 0;
      ctx.body = helper.getReturnObj({
        data: {
          list: response
        },
        totalPage: totalPage,
        total: total,
      })
    } else {
      ctx.body = helper.getReturnObj({
        message: '投资人ID不能为空'
      });
      return false;
    }

  },

  changeLog: async(ctx) => {
    let data = ctx.request.body || {};
    let investor_id = data.investor_id;
    if (investor_id) {
      investor_id = mysql.escape(investor_id);
      let result = [];
      let pool = db.getPool();
      let sql = `
          select
            date_format(update_time,'%Y-%m-%d %H:%i:%S') as time,
            content as issues,
            before_value as state_before_change,
            after_value as state_after_change,
            operator as operator_name
          from t_operate_log
          where customer_id = ${investor_id} 
          ; 
        `;

      try {
        result = await helper.p(pool, pool.query, sql);
      } catch (e) {
        ctx.body = helper.getReturnObj(retConfig.defaultError);
        return false;
      }

      let response = result.response;
      ctx.body = helper.getReturnObj({
        data: {
          list: response
        }
      })

    } else {
      ctx.body = helper.getReturnObj({
        message: '投资人ID不能为空'
      });
      return false;
    }
  }
}

module.exports = investorDetail;