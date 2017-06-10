/**
 * Created by zpp on 2017/06/10.
 */
'use strict';
const retConfig = require('../config/retConfig');
const log4js = require('koa-log4');
const path = require('path');
const db = require('./db');
const dateformat = require('dateformat');
const CryptoJS = require("crypto-js");
const NodeRSA = require("node-rsa");

const helper = {

  checkMobile: function (mobile) {
    return /^1(3[0-9]|4[57]|5[0-35-9]|7[0135678]|8[0-9])\d{8}$/.test(parseInt(mobile));
  },

  getLogger: (name='app', level='auto', filepath) => {

    if(filepath){
      log4js.loadAppender('file');
      log4js.addAppender(log4js.appenders.file(path.resolve(filepath)), name);
    }else{
      log4js.loadAppender('console');
    }
    let logger = log4js.getLogger(name);
    logger.setLevel(level);
    return logger;
  },

  getReturnObj: (...params) => {
    return Object.assign.apply(null, [{}, retConfig.default, ...params]);
  },

  p: (ctx, fn, ...params) => {

    if (typeof fn != 'function') {
      let tips = 'helper.p fn arguments error, second param must be a function';
      return {
        error: tips
      };
    }

    return new Promise((resolve, reject) => {
      const cb = (error, response, ...others) => {
        if (error) {
          resolve({
            error
          });
        } else {
          resolve({
            response,
            others
          });
        }
      };
      params.push(cb);
      fn.apply(ctx, params);
    });

  },

  csp: (ctx, fn, ...params) => {

    if (typeof fn != 'function') {
      let tips = 'helper.p fn arguments error, second param must be a function';
      return {
        error: tips
      };
    }

    return new Promise((resolve, reject) => {
      const cb = (error, response, ...others) => {
        if (error) {
          reject({
            error
          });
        } else {
          resolve({
            response,
            others
          });
        }
      };
      params.push(cb);
      fn.apply(ctx, params);
    });

  },

  query: async function (sql) {
    let conn = db.getConn();
    let result = await helper.p(conn, conn.query, sql);
    db.closeConn(conn);
    return result;
  },

  createRandomNum: (len) => {
    len = parseInt(len) || 6;
    let str = '';
    for (let i = 0; i < len; i++) {
      str += parseInt(Math.random() * 10) || 1;
    }
    return str;
  },

  getSecond: function (date) {
    date = date || new Date();
    return parseInt((+ date)/1000);
  },

  getMysqlDate: function (date) {
    date = date || new Date();
    return dateformat(date, 'yyyy-mm-dd HH-MM-ss');
  },

  setCodeToCardId:function(card_id){
    if(card_id){
      let s_head = card_id.slice(0,4);
      let s_foot = card_id.slice(-4);
      return s_head + '****' + s_foot;
    }else{
      return '';
    }
  },
  setCodeToMobile:function(mobile){
    if(mobile){
      let s_head = mobile.slice(0,3);
      let s_foot = mobile.slice(-4);
      return s_head + '****' + s_foot;
    }else{
      return '';
    }
  },
  getSexByCardId:function(card_id){
    if(card_id){
      let len = card_id.length;
      let n_sex = card_id.slice(len-2,len-1);
      let s_sex = (n_sex % 2)?'男':'女';
      return s_sex;
    }else{
      return '';
    }
  },
  getBirthdayByCardId:function(card_id){
    if(card_id){
      let birthday = card_id.slice(6,14);
      return birthday;
    }else{
      return '';
    }
  },
  getAgeByCardId:function(card_id){
    let birthday = helper.getBirthdayByCardId(card_id);
    let bir_year = parseInt(birthday.slice(0,4));
    if(birthday){
      let date = new Date();
      let year = parseInt(date.getFullYear());
      return (year - bir_year);
    }else{
      return '';
    }
  },
  setAESData:function(data){
    let key = CryptoJS.enc.Utf8.parse("abcdefghhgfedcba");
    let iv  = CryptoJS.enc.Utf8.parse('hgfedcbaabcdefgh');
    let bytes  = CryptoJS.AES.decrypt(data.toString(),key,{ iv: iv,mode:CryptoJS.mode.CBC,padding: CryptoJS.pad.Pkcs7});
    let plaintext = bytes.toString(CryptoJS.enc.Utf8);
    return plaintext;
  },

  generateRSACipher : function (params) {
    let public_key = '-----BEGIN PUBLIC KEY-----\n'
                  + 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC81szNatpNfepRp5MHXKJ+sMpHLV6mpVZBRYrLKz2HfYs8uzhxI6Wy3GtlYl8Q5PKVR1zCRP5mJj7JrCr5kt2PshO/nAzP4McrN/yqz0YBGH/Xuj6KT2MHA1jLzdOfybPo4gm1046sQgEFqgs9mbJb25VjsklQEgapz2XqPTP+/QIDAQAB'
                  +'-----END PUBLIC KEY-----';
    let key = new NodeRSA('-----BEGIN PRIVATE KEY-----MIICdwIBADANBgkqhkiG9w0BAQEFAASCAmEwggJdAgEAAoGBALzWzM1q2k196lGnkwdcon6wykctXqalVkFFissrPYd9izy7OHEjpbLca2ViXxDk8pVHXMJE/mYmPsmsKvmS3Y+yE7+cDM/gxys3/KrPRgEYf9e6PopPYwcDWMvN05/Js+jiCbXTjqxCAQWqCz2ZslvblWOySVASBqnPZeo9M/79AgMBAAECgYA0VoRk2pyupZtwDjXd8HrJCk7F83ksTt7dMF0LemyPROh2aJ14Hh0quZS6gM1AbXQek6zN2zl3Llpwots2WNI3K3rU+M3NVUeZEpUX8jfhmlT8kTZFkbY1X+4kNU6sbpXyTk5yOBfBcYXELUp03U3TDPhLfMQMI8G22P7fym1XAQJBAOPtNouEB85tXHgUnUuA8EK0TLmdETw+czF+SBXy4MZBnGVUfPahW3z1xoCQ+vpBhEJu81gA+Abdtz/Lp2NropECQQDUGRyajuV0xNTARUMGR+pMtdqhNC2ziJmYo7dAxdSk0Lb59o26dDMnmVhDJcediuHukWBTv+cu4C/NenRUcHOtAkEAm/PxQGDknoABp0AjqEffHSUU4mPwKRJp61GGrU30MnMuOb8nifE6EjRw0ANjVtyBTJtx8aMoEjqeag5EyCgboQJAIhxXyVOp+3mcbb+149C1Edk9bCekIfeaHD5YPoaSiF84zkKk0JPXlkrHMyVkUSYA6AlhYJbAa32KspU7GEltkQJBALu1XhEFqNKglxEQp6p+7F21pZI8zLV9WiPOOUUpnsMamEnjyG8pZHY6y+o1BgDpBOxg0EV+9/YhFDJZ4wbEklo=-----END PRIVATE KEY-----');
    key.importKey(public_key,'public');

    return key.encrypt(params,'base64');
  },

  generateRSASign : function(cipher){

    let public_key = '-----BEGIN PUBLIC KEY-----\n'
      + 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC81szNatpNfepRp5MHXKJ+sMpHLV6mpVZBRYrLKz2HfYs8uzhxI6Wy3GtlYl8Q5PKVR1zCRP5mJj7JrCr5kt2PshO/nAzP4McrN/yqz0YBGH/Xuj6KT2MHA1jLzdOfybPo4gm1046sQgEFqgs9mbJb25VjsklQEgapz2XqPTP+/QIDAQAB'
      +'-----END PUBLIC KEY-----';

    let private_key = '-----BEGIN PRIVATE KEY-----\n'
      + 'MIICdwIBADANBgkqhkiG9w0BAQEFAASCAmEwggJdAgEAAoGBALzWzM1q2k196lGnkwdcon6wykctXqalVkFFissrPYd9izy7OHEjpbLca2ViXxDk8pVHXMJE/mYmPsmsKvmS3Y+yE7+cDM/gxys3/KrPRgEYf9e6PopPYwcDWMvN05/Js+jiCbXTjqxCAQWqCz2ZslvblWOySVASBqnPZeo9M/79AgMBAAECgYA0VoRk2pyupZtwDjXd8HrJCk7F83ksTt7dMF0LemyPROh2aJ14Hh0quZS6gM1AbXQek6zN2zl3Llpwots2WNI3K3rU+M3NVUeZEpUX8jfhmlT8kTZFkbY1X+4kNU6sbpXyTk5yOBfBcYXELUp03U3TDPhLfMQMI8G22P7fym1XAQJBAOPtNouEB85tXHgUnUuA8EK0TLmdETw+czF+SBXy4MZBnGVUfPahW3z1xoCQ+vpBhEJu81gA+Abdtz/Lp2NropECQQDUGRyajuV0xNTARUMGR+pMtdqhNC2ziJmYo7dAxdSk0Lb59o26dDMnmVhDJcediuHukWBTv+cu4C/NenRUcHOtAkEAm/PxQGDknoABp0AjqEffHSUU4mPwKRJp61GGrU30MnMuOb8nifE6EjRw0ANjVtyBTJtx8aMoEjqeag5EyCgboQJAIhxXyVOp+3mcbb+149C1Edk9bCekIfeaHD5YPoaSiF84zkKk0JPXlkrHMyVkUSYA6AlhYJbAa32KspU7GEltkQJBALu1XhEFqNKglxEQp6p+7F21pZI8zLV9WiPOOUUpnsMamEnjyG8pZHY6y+o1BgDpBOxg0EV+9/YhFDJZ4wbEklo='
      +'-----END PRIVATE KEY-----';
    let key = new NodeRSA('-----BEGIN PRIVATE KEY-----MIICdwIBADANBgkqhkiG9w0BAQEFAASCAmEwggJdAgEAAoGBALzWzM1q2k196lGnkwdcon6wykctXqalVkFFissrPYd9izy7OHEjpbLca2ViXxDk8pVHXMJE/mYmPsmsKvmS3Y+yE7+cDM/gxys3/KrPRgEYf9e6PopPYwcDWMvN05/Js+jiCbXTjqxCAQWqCz2ZslvblWOySVASBqnPZeo9M/79AgMBAAECgYA0VoRk2pyupZtwDjXd8HrJCk7F83ksTt7dMF0LemyPROh2aJ14Hh0quZS6gM1AbXQek6zN2zl3Llpwots2WNI3K3rU+M3NVUeZEpUX8jfhmlT8kTZFkbY1X+4kNU6sbpXyTk5yOBfBcYXELUp03U3TDPhLfMQMI8G22P7fym1XAQJBAOPtNouEB85tXHgUnUuA8EK0TLmdETw+czF+SBXy4MZBnGVUfPahW3z1xoCQ+vpBhEJu81gA+Abdtz/Lp2NropECQQDUGRyajuV0xNTARUMGR+pMtdqhNC2ziJmYo7dAxdSk0Lb59o26dDMnmVhDJcediuHukWBTv+cu4C/NenRUcHOtAkEAm/PxQGDknoABp0AjqEffHSUU4mPwKRJp61GGrU30MnMuOb8nifE6EjRw0ANjVtyBTJtx8aMoEjqeag5EyCgboQJAIhxXyVOp+3mcbb+149C1Edk9bCekIfeaHD5YPoaSiF84zkKk0JPXlkrHMyVkUSYA6AlhYJbAa32KspU7GEltkQJBALu1XhEFqNKglxEQp6p+7F21pZI8zLV9WiPOOUUpnsMamEnjyG8pZHY6y+o1BgDpBOxg0EV+9/YhFDJZ4wbEklo=-----END PRIVATE KEY-----');
    key.importKey(public_key,'public');

    return key.sign(cipher,'base64');
  },
  
  generateRSADecrypt : function (buf) {
    let public_key = '-----BEGIN PUBLIC KEY-----\n'
      + 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC81szNatpNfepRp5MHXKJ+sMpHLV6mpVZBRYrLKz2HfYs8uzhxI6Wy3GtlYl8Q5PKVR1zCRP5mJj7JrCr5kt2PshO/nAzP4McrN/yqz0YBGH/Xuj6KT2MHA1jLzdOfybPo4gm1046sQgEFqgs9mbJb25VjsklQEgapz2XqPTP+/QIDAQAB'
      +'-----END PUBLIC KEY-----';
    let private_key = '-----BEGIN PRIVATE KEY-----\n'
      + 'MIICdwIBADANBgkqhkiG9w0BAQEFAASCAmEwggJdAgEAAoGBALzWzM1q2k196lGnkwdcon6wykctXqalVkFFissrPYd9izy7OHEjpbLca2ViXxDk8pVHXMJE/mYmPsmsKvmS3Y+yE7+cDM/gxys3/KrPRgEYf9e6PopPYwcDWMvN05/Js+jiCbXTjqxCAQWqCz2ZslvblWOySVASBqnPZeo9M/79AgMBAAECgYA0VoRk2pyupZtwDjXd8HrJCk7F83ksTt7dMF0LemyPROh2aJ14Hh0quZS6gM1AbXQek6zN2zl3Llpwots2WNI3K3rU+M3NVUeZEpUX8jfhmlT8kTZFkbY1X+4kNU6sbpXyTk5yOBfBcYXELUp03U3TDPhLfMQMI8G22P7fym1XAQJBAOPtNouEB85tXHgUnUuA8EK0TLmdETw+czF+SBXy4MZBnGVUfPahW3z1xoCQ+vpBhEJu81gA+Abdtz/Lp2NropECQQDUGRyajuV0xNTARUMGR+pMtdqhNC2ziJmYo7dAxdSk0Lb59o26dDMnmVhDJcediuHukWBTv+cu4C/NenRUcHOtAkEAm/PxQGDknoABp0AjqEffHSUU4mPwKRJp61GGrU30MnMuOb8nifE6EjRw0ANjVtyBTJtx8aMoEjqeag5EyCgboQJAIhxXyVOp+3mcbb+149C1Edk9bCekIfeaHD5YPoaSiF84zkKk0JPXlkrHMyVkUSYA6AlhYJbAa32KspU7GEltkQJBALu1XhEFqNKglxEQp6p+7F21pZI8zLV9WiPOOUUpnsMamEnjyG8pZHY6y+o1BgDpBOxg0EV+9/YhFDJZ4wbEklo='
      +'-----END PRIVATE KEY-----';

    let key = new NodeRSA('-----BEGIN PRIVATE KEY-----MIICdwIBADANBgkqhkiG9w0BAQEFAASCAmEwggJdAgEAAoGBALzWzM1q2k196lGnkwdcon6wykctXqalVkFFissrPYd9izy7OHEjpbLca2ViXxDk8pVHXMJE/mYmPsmsKvmS3Y+yE7+cDM/gxys3/KrPRgEYf9e6PopPYwcDWMvN05/Js+jiCbXTjqxCAQWqCz2ZslvblWOySVASBqnPZeo9M/79AgMBAAECgYA0VoRk2pyupZtwDjXd8HrJCk7F83ksTt7dMF0LemyPROh2aJ14Hh0quZS6gM1AbXQek6zN2zl3Llpwots2WNI3K3rU+M3NVUeZEpUX8jfhmlT8kTZFkbY1X+4kNU6sbpXyTk5yOBfBcYXELUp03U3TDPhLfMQMI8G22P7fym1XAQJBAOPtNouEB85tXHgUnUuA8EK0TLmdETw+czF+SBXy4MZBnGVUfPahW3z1xoCQ+vpBhEJu81gA+Abdtz/Lp2NropECQQDUGRyajuV0xNTARUMGR+pMtdqhNC2ziJmYo7dAxdSk0Lb59o26dDMnmVhDJcediuHukWBTv+cu4C/NenRUcHOtAkEAm/PxQGDknoABp0AjqEffHSUU4mPwKRJp61GGrU30MnMuOb8nifE6EjRw0ANjVtyBTJtx8aMoEjqeag5EyCgboQJAIhxXyVOp+3mcbb+149C1Edk9bCekIfeaHD5YPoaSiF84zkKk0JPXlkrHMyVkUSYA6AlhYJbAa32KspU7GEltkQJBALu1XhEFqNKglxEQp6p+7F21pZI8zLV9WiPOOUUpnsMamEnjyG8pZHY6y+o1BgDpBOxg0EV+9/YhFDJZ4wbEklo=-----END PRIVATE KEY-----');
    key.importKey(public_key,'public');

    return key.decrypt(buf);
  }

};

module.exports = helper;