/**
 * Created by yeshanshan on 2017/5/25.
 */
'use strict';

const helper = require('../utils/helper');
const retConfig = require('../config/retConfig');
const db = require('../utils/db');
const mysql = require('mysql');
const logger = helper.getLogger('model-investor', 'auto'); // , './logs/user-file.log'


const investorManage = {
    list: async(ctx) => {
        let data = ctx.request.body || {};
        let page = data['page'] || 1;
        let pageSize = parseInt(data['pageSize']) || 200;
        let offset = (page - 1) * pageSize;
        let searchType = data.search_type;
        let searchValue = data.search_value;
        let register_from = data.register_from;
        let register_to = data.register_to;
        let flag_search = 1;
        let condition = '';
        let conn = db.getConn();
        if (register_from) {
            condition += ' and create_time >= ' + mysql.escape(register_from + ' 00:00:00') + ' ';
        }

        if (register_to) {
            condition += ' and create_time <= ' + mysql.escape(register_to + ' 23:59:59') + ' ';

        }

        if (searchType && searchValue) {
            switch (parseInt(searchType)) {
                case 1:
                    condition += ' and name=' + mysql.escape(searchValue) + ' ';
                    break;
                case 2:
                    condition += ' and mobile=' + mysql.escape(searchValue) + ' ';
                    break;
                case 3:
                    let sql_search_recommender = `select id from t_customer where state = 1 and name = ${mysql.escape(searchValue)} ${condition} `;
                    let result_search_recommender = await helper.p(conn, conn.query, sql_search_recommender);
                    if (!result_search_recommender || !result_search_recommender.response) {
                        ctx.body = helper.getReturnObj(retConfig.defaultError, {
                            message: (result_search_recommender && result_search_recommender.error && result_search_recommender.error.message)
                        });
                        return false;
                    }
                    if (result_search_recommender.response && result_search_recommender.response.length) {
                        let search_recommender_id = [];
                        result_search_recommender.response.forEach(function (item) {
                            search_recommender_id.push('"' + item['id'] + '"');
                        })
                        condition += ' and recommender in (' + search_recommender_id.join(',') + ') ';
                    } else {
                        flag_search = 0;
                    }
                    break;
                default:
            }
        }

        if (flag_search) {
            let sql = `
              select
               name,
               id as investor_id, 
               mobile, 
               id_card_no as id_no, 
               recommender as recommender_id,
               recommend_type,
               status,
               date_format(create_time,'%Y-%m-%d %H:%i:%S') as register_time
              from t_customer 
              where role = 1 and state = 1 ${condition} 
              order by create_time desc 
              limit ${offset} , ${pageSize};`;
            sql += ` select count(id) as total from t_customer where role = '1' and state = 1 ${condition};`;

            let result = await helper.p(conn, conn.query, sql);

            if (!result || !result.response) {
                db.closeConn(conn);
                logger.error('investorManage.list error ' + JSON.stringify(result) + '; sql' + sql);
                ctx.body = helper.getReturnObj(retConfig.defaultError);
                return false;
            }

            let response = result.response;
            if (response && response[0] && response[0].length) {

                let customer_list = result.response[0];
                let recommender_id_list = [];

                customer_list.forEach(function (item, index) {

                    recommender_id_list.push('"' + item.recommender_id + '"');
                    if(item.id_no){
                        customer_list[index]['id_no'] = helper.setCodeToCardId(helper.setAESData(item.id_no));
                    }

                });

                let recommender_id_sql = `
              select id as recommender_id,name as recommender_name from t_customer where state = 1 and id in (${recommender_id_list.join(',')})  
            `;

                var result_recommender = await helper.p(conn, conn.query, recommender_id_sql);


                let response_recommender = result_recommender.response || [];
                let recommender_obj = {};

                if (response_recommender.length) {

                    for (let i = 0, len = response_recommender.length; i < len; i++) {
                        recommender_obj[response_recommender[i]['recommender_id']] = response_recommender[i]['recommender_name'];
                    }
                    if (response && response[0]) {
                        response[0].forEach(function (item, index) {
                            response[0][index]['recommender_name'] = recommender_obj[item['recommender_id']] || '';
                        });
                    }
                }
            }

            db.closeConn(conn);

            let total = (response && response[1] && response[1][0] && response[1][0]['total']) || 0;
            let totalPage = Math.ceil(total / pageSize) || 0;
            ctx.body = helper.getReturnObj({
                data: {
                    total: total,
                    totalPage: totalPage,
                    list: response[0]
                }
            });
        } else {
            ctx.body = helper.getReturnObj({
                data: {
                    total: 0,
                    totalPage: 0,
                    list: []
                }
            });
        }

    }

}

module.exports = investorManage;
