/**
 * Created by zpp on 2017/06/10.
 */
'use strict';
const ReturnConfig = {

  default: {
    code: 0,
    message: 'success',
    data: null
  },

  paramError: {
    code: 401,
    message: '参数错误'
  },

  noPermission: {
    code: 403,
    message: '无权限'
  },

  noLogin: {
    code: -1,
    message: '未登录'
  },

  defaultError: {
    code: 500,
    message: '服务器错误'
  }

};

module.exports = ReturnConfig;