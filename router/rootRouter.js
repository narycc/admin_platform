/**
 * Created by zpp on 2017/06/10.
 */
'use strict';

const Router = require('koa-router');
const helper = require('../utils/helper');

const addToRoot = (root, path, child) => {
  root.use(path, child.routes(), child.allowedMethods());
};

const rootRouter = new Router({
  prefix: '/api'
});

// 登录模块
const login = require('../model/login');

rootRouter.use('/', login.checkLogin(function (path) {

  // 下面这些接口不需要登录态就能访问
  let noNeedLoginApiList = [
    '/api/login/login',
    '/api/login/logout',
  ];
  return (noNeedLoginApiList.indexOf(path) > -1);

}));


const loginRouter = new Router();
loginRouter
  .post('/login', login.login)
  .post('/logout', login.logout);
addToRoot(rootRouter, '/login', loginRouter);

// 用户模块
const user = require('../model/user');
const userRouter = new Router();
userRouter
  .post('/delete', user.delete)
  .post('/create', user.create)
  .post('/list', user.list)
  .post('/reset', user.reset)
  .post('/search', user.search)
  .post('/getUserInfo', user.getUserInfo);


// 使用一个中间件去检查是否具备访问某个模块的权限
rootRouter.use('/user', user.checkPermission(function (path) {
  // 以下白名单即使不是管理员也能访问
  let whiteList = [
    '/api/user/getUserInfo',
  ];
  return whiteList.indexOf(path) > -1;
}));

addToRoot(rootRouter, '/user', userRouter);


//投资人管理模块

const investorManage = require('../model/investorManage');
const investorManageRouter = new Router();
investorManageRouter
    .post('/list',investorManage.list)
addToRoot(rootRouter, '/investors', investorManageRouter);

const investorDetail = require('../model/investorDetail');
const investorDetailRouter =  new Router();
investorDetailRouter
  .post('/get',investorDetail.getBaseInfo)
  .post('/get/account_property',investorDetail.accountProperty)
  .post('/get/invest_records',investorDetail.investRecords)
  .post('/get/fund_records',investorDetail.fundRecords)
  .post('/get/change_log',investorDetail.changeLog);

addToRoot(rootRouter,'/investors',investorDetailRouter);

// 投资交易模块
const investments = require('../model/investments');
const investmentsRouter = new Router();

investmentsRouter
  .post('/list',investments.list)
  .post('/get',investments.get);

addToRoot(rootRouter,'/investments',investmentsRouter);

// 资金流水模块
const funds = require('../model/funds');
const fundsRouter = new Router();

fundsRouter
  .post('/list',funds.list);

addToRoot(rootRouter,'/funds',fundsRouter);


// 理财计划
const plans = require('../model/plans');
const plansRouter = new Router();

plansRouter
  .post('/list',plans.list)
  .post('/detail',plans.detail)
  .post('/detail/list',plans.detailList)
  .post('/delete',plans.deletePlan)
  .post('/create',plans.createPlan)
  .post('/update',plans.updatePlan)
  .post('/product',plans.productInfo);

addToRoot(rootRouter,'/plans',plansRouter);



// 产品模块
const products = require('../model/products');
const productsRouter = new Router();

productsRouter
  .post('/detail',products.detail);

addToRoot(rootRouter,'/product',productsRouter);



module.exports = rootRouter;
