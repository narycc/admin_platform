/**
 * Created by zpp on 2017/06/10.
 */
'use strict';
const mysql = require('mysql');
const config = require('../config/config');
const helper = require('../utils/helper');

let pool_config = Object.assign({},config.mysql,{connectionLimit: 10});
let pool =  mysql.createPool(pool_config);

pool.on('connection', function (connection) {

  console.log('OK ,connection');

});


pool.on('acquire', function (connection) {

  console.log('OK ,acquire');

});

pool.on('enqueue', function (connection) {

  console.log('OK ,enqueue');

});

pool.on('release', function (connection) {

  console.log('OK ,release');

});


const db = {

  // 创建mysql 连接池
  getPool : () =>{
    return pool;
  },

  getConn: (user_config) => {

    let mysql_config = Object.assign({}, config.mysql, user_config);
    let conn = mysql.createConnection({
      host: mysql_config.host,
      user: mysql_config.user,
      password: mysql_config.password,
      database: mysql_config.database,
      port: mysql_config.port||3306,
      multipleStatements: true
    });

    conn.connect(function (err) {
      if (err) {
        console.error("connect error happened", err);
        return false;
      }
      console.log('mysql connection success id ' + conn.threadId);
    });

    conn.on('error', function (err) {
      console.error(arguments, conn.threadId);
    });
    return conn;
  },

  closeConn: (conn) => {
    if (conn && typeof conn.end == 'function' && conn.threadId) {
      console.log('close mysql connection id ' + conn.threadId);
      conn.end();
    }
  },



  execSingleTransaction : (conn,sql) =>{
    return new Promise( (resolve,reject)=>{
      conn.query(sql,function (err, result) {
          if(err){
            conn.rollback(function(err){
              reject(err);
            });
          }else{
            conn.commit(function(err){
              if(err){
                  conn.rollback(function(err){
                      reject(err);
                  });
              }else{
                resolve(result);
              }
            })
          }
      })
    })
  },

  execStartTransaction : (conn,sqlEntities)=>{

    return new Promise( (resolve,reject) =>{
      return conn.beginTransaction( async (err)=>{

        let result_arr = [];
        if(err){
          reject(err);
        }else{

          let rs;
          for(let sql of sqlEntities){
            try{
              rs = await db.execSingleTransaction(conn,sql).then((result)=>{
                console.log('sql 执行结果：'+JSON.stringify(result));
                return result;
              },(err)=>{
                console.log('sql 执行报错，将回退：' +JSON.stringify(err));
              });

              result_arr.push(rs);
            }catch(e){

              reject(e);
            }
          }

          resolve(result_arr);
        }
      });

    })
  } ,




  doTransaction: (conn, callback) => {
    if (conn && typeof conn.query == 'function') {
      return new Promise(async function doTransaction (resolve, reject) {
        if (typeof callback === 'function') {
          try{
            await helper.p(conn, conn.query, 'START TRANSACTION');
            let result = await callback(conn);
            resolve(result);
          }catch (e){
            resolve({
              error: e
            });
          }
        }
      }).catch(error => {
        resolve({
          error
        });
      });
    } else {
      return {
        error: {
          message: 'first param is not a mysql connection!'
        }
      }
    }
  }

};

module.exports = db;