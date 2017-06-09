>  api文档模板，请拷贝使用 `每一行后面两个空格千万别删掉, markdown 语法`


>  author: zhongpingping


>
`下文中所有分页的参数请修改为： 传参： page, pageSize`

>
`返回的data 格式一致如下：`

```
      data: {
        total: total,
        totalPage: totalPage,
        list: response[0]
      }
```


## 惠理财管理后台: 投资人管理 ##

* * * * *

### 1. 投资人列表接口 ###

>
`接口说明 : 根据搜索条件展示投资人信息 对应数据库表t_customer`


---

>
CGI URL : `/api/investors/list` 惠理财投资人列表接口

Method : GET

---
>
`请求参数 : `

```
   {
       `search_type`:'1, 投资人姓名； 2, 投资人手机 3, 理财师姓名 4, 推荐人',  #t_customer表role=1表示投资人
       `search_value`:'输入框内容',
       `register_from`:'2015-01-01 注册日期搜索起始时间',
       `register_to`:'2016-12-12 注册日期搜索结束时间',
       `page`:'1',
       `pageSize`:'20'

    }
```

>> 特殊说明： 一些特殊说明

---
>
`返回数据 :`

```
    {
      code: 0,（0: 成功；非0，获取失败）
      message: '成功 或者 失败原因'
      data:{
        list : [{
                   investor_id:'投资人的唯一id',
                   name:'姓名',
                   mobile:'手机号',
                   id_no:'身份证',
                   register_time:'注册时间',  #create_time
                   planner_name:'理财师姓名', #根据financial_planner查询 name字段
                   planner_id:'理财师id', #financial_planner
                   recommender_name:'推荐人姓名',
                   recommender_id:'推荐人id'
                 }],
        total : 124(总条目数),
        totalPage : 29（总页数）
      }
    }
```

* * * * *

### 2. 投资人基本信息 ###

>
`接口说明 : 根据投资人id 查找投资人基本信息 对应数据库表t_customer`
---

>
CGI URL : `/api/investors/get`

Method : GET

---
>
`请求参数 : `

```
   {
       `investor_id`:'1234'
    }
```

---
>
`返回数据 :`

```
    {
      code: 0, // 0: 成功；非0，获取失败
      message: '成功 或者 失败原因'
      data:{
        investor_id:'用户id',
        name:'姓名 李静波',
        mobile:'手机号码',
        id_no:'身份证',
        bank_card_no:'银行卡号', #与t_bank_card 根据customer_id 关联查找card_no 字段
        gender:'性别', ##根据身份证识别
        age:'年龄', ##根据身份证识别
        account_status:'账户状态 0 正常 1 冻结',
        last_login_time:'最后登录时间', #last_accesst_time
        last_invest_time:'最后投资时间' #在t_invest表取某个人按invest_success_time降序，取第一条记录的invest_success_time时间
      }
    }
```

* * * * *

### 3. 投资人信息: 账号及资产 ###

>
`接口说明 : 根据投资人id 查找投资人账号及资产信息 对应数据库表t_customer`
---

>
CGI URL : `/api/investors/get/account_property`

Method : GET

---
>
`请求参数 : `

```
   {
       `investor_id`:'1234'
    }
```

---
>
`返回数据 :`

```
    {
      code: 0, // 0: 成功；非0，获取失败
      message: '成功 或者 失败原因'
      data:{
        accounts: [{
            planner_name:'理财师姓名',
            planner_id:'理财师id',
            recommender_name:'推荐人姓名',
            recommender_id:'推荐人id',
            belong_to:'归属架构' ## waiting-for-check， 暂时置空
        }],
        property:[{
            property_total:'', #t_wallet 表 balance
            invest_nums:'', #根据customer_id 查出 t_invest的条目数，t_invest表中status为3、5、6、7、9、10状态的数据
            invest_ammout_total:'累计投资金额', ##t_invest表中status为3、5、6、7、9、10状态的数据
            invest_profit_total:'累计收益', #t_wallet interest_total
            invest_current_total:'在投资金', #t_wallet principal_wait
            invest_frozen_total:'冻结资金' #t_wallet lock_amt
      }
    }
```

* * * * *

### 4. 投资人信息: 投资记录 ###

>
`接口说明 : 根据投资人id 查找投资人投资记录 对应数据库表t_invest`
---

>
CGI URL : `/api/investors/get/invest_records`

Method : GET

---
>
`请求参数 : `

```
   {
       `investor_id`:'1234',
       `trade_type`:'0,预约中 1,预约成功 2,预约失败 3,匹配中（就是预约成功的状态） 4,回款中 5,已回款', #投资状态(0=预约中|1=预约成功|2=预约失败|3=投资成功|4=投资失败|5=申请赎回|6=转账中|7=已赎回)
       `page`:'1',
       `pageSize`:'20'
    }
```

---
>
`返回数据 :`

```
    {
      code: 0, // 0: 成功；非0，获取失败
      message: '成功 或者 失败原因'
      data:{
        list:[{
            deal_no:'交易号', #order_num
            product_type:'产品类型', #产品类型(1=活期|2=定期|3=定期智月升)
            freeze_days:'封闭期', #subscribe_success_time（预约成功时间）到redeem_date（赎回日）这段时间称为封闭期，单位（天）
            annual_profit_rate:'年化率', #year_interest_rate
            subscribe_time:'预约时间', #subscribe_success_time
            expired_time:'到期日期', #==回款日 repay_date
            principal_amount:'投资本金', #principal
            current_principal_amount:'在投本金', #match_principal
            current_profit_amount:'当前收益',  #interest
            trade_status:'交易状态 (0=预约中|1=预约成功|2=预约失败|3=投资成功|4=投资失败|5=申请赎回|6=申请赎回审核成功|7=申请赎回审核失败|8=已赎回|9=逾期|10=已回款)'
        }],
        total: 1234,
        totalPage: 20
    }
```

* * * * *

### 5. 投资人信息：资金流水 ###

>
`接口说明 : 根据投资人id 以及搜索条件 查找他的资金流水 t_trade_record`
---

>
CGI URL : `/api/investors/get/fund_records`

Method : GET

---
>
`请求参数 : `

```
   {
      `investor_id`:'1234',
      `fund_status`:'1,赎回 2,提前赎回 3,提现 4,充值 5,投资 6,退回', #对应type 字段交易类型(1=充值|2=提现|3=投资|4=到期赎回|5=提前赎回|6=奖励|7=退款)
      `invest_createtime_from`:'发起时间搜索起始日期', #create_time 的上边界
      `invest_create_to`:'发起时间搜索结束日期',
      `page`:'1',
      `pageSize`:'20'
   }
```

---
>
`返回数据 :`

```
    {
      code: 0, // 0: 成功；非0，获取失败
      message: '成功 或者 失败原因'
      data:{
        list : {
            order_no : '交易号', # order_no
            invest_create_time : '发起时间', #create_time
            fund_status:'1,赎回 2,提前赎回 3,提现 4,充值 5,投资 6,退回', # type 交易类型(1=充值|2=提现|3=投资|4=到期赎回|5=提前赎回|6=奖励|7=退款)
            amount:'金额', #交易金额 amt
            amount_before_deal:'交易前金额', #balance_before
            amount_after_deal:'交易后余额', #balance_after
            status:'1,申请中 2,已到账 3,冻结中 4,退款中 5,失败 6,', #status 交易状态(0=交易中，1=交易成功，2=交易失败)
            remark:'失败的情况下，失败的原因'  #
        },
        total : 1234,
        totalPage : 20
    }
```

* * * * *

### 6. 投资人信息：操作日志 ###

>
`接口说明 : 根据投资人id 获取操作日志 t_operate_log`
---

>
CGI URL : `/api/investors/get/change_log`

Method : GET

---
>
`请求参数 : `

```
   {
      `customer_id`:'1234',
      `page`:'1',
      `pageSize`:'20'
   }
```

---
>
`返回数据 :`

```
    {
      code: 0, // 0: 成功；非0，获取失败
      message: '成功 或者 失败原因'
      data:{
        list : {
            time : '时间',  #update_time
            issuse : '事件', #content
            state_before_change:'变更前', #before_value
            state_after_change:'变更后', #after_value
            operator_name:'操作人' #operator
        },
        total : 1234,
        totalPage : 20
    }
```

* * * * *

## 惠理财管理后台: 投资管理 ##


### 7. 投资交易列表 ###

>
`接口说明 : 根据投资搜索条件 获取投资交易列表 t_trade_record + t_invest + t_customer`
---

>
CGI URL : `/api/investments/list`

Method : GET

---
>
`请求参数 : `

```
   {
      `search_type`:'1, 投资人姓名 2，投资人手机号 3，交易号',
      `search_value`:'',
      `product_type`:'产品类型',
      `trade_status`:'交易状态 1,预约中 2,预约失败 3,匹配中 4,回款中 5,已回款',
      `date_type`:'1,预约时间 2,起投时间 3, 到期时间',
      `from`:'',
      `to`:'',
      `page`:'1',
      `pageSize`:'20'
   }
```

---
>
`返回数据 :`

```
    {
      code: 0, // 0: 成功；非0，获取失败
      message: '成功 或者 失败原因'
      data:{
        list : {
            order_no:'交易号',
            investor_name:'投资人姓名', #根据交易号，去找t_invest 中的customer_id 再去t_customer中找名字
            investor_id:'投资人id', # t_invest 中的customer_id
            mobile:'手机号码', # t_invest 中找mobile
            product_title:'产品类型', # t_invest 中的product_title
            freeze_days:'封闭期', # t_invest subscribe_success_time（预约成功时间）到repay_date（回款日）这段时间称为封闭期，单位（天）
            annual_profit_rate:'年化率', #t_invest year_interest_rate
            subscribe_time:'预约时间', # t_invest subscribe_success_time
            expired_time:'到期日期', #repay_date 回款日
            principal_amount:'投资本金', #principal
            current_principal_amount:'在投本金', #match_principal
            trade_status:'交易状态 1,预约中 2,预约失败 3,匹配中 4,回款中=预约成功 5,已回款'  # 投资状态(0=预约中|1=预约成功|2=预约失败|3=投资成功|4=投资失败|5=申请赎回|6=申请赎回审核成功|7=申请赎回审核失败|8=已赎回|9=逾期|10=已回款)

        },
        total : 1234,
        totalPage : 20
    }
```

* * * * *



### 8. 投资详情 ###

>
`接口说明 : 根据交易号查找投资详情 t_invest + t_invest_loan + t_loan + t_invest_log`
---

>
CGI URL : `/api/investments/get/`

Method : GET

---
>
`请求参数 : `

```
   {
       `order_no`:'1234'
    }
```

---
>
`返回数据 :`

```
    {
      code: 0, // 0: 成功；非0，获取失败
      message: '成功 或者 失败原因'
      data:{
        summary : {
            investor_name: '姓名',
            mobile:'手机号',
            account_status:'账户状态',
            order_no : '交易号', #order_no
            product_type : '产品类型', # product_title
            product_id :'理财计划ID', # id
            freeze_days:'封闭期', #t_invest subscribe_success_time（预约成功时间）到repay_date 这段时间称为封闭期，单位（天）即：expired_time - subcribe_time
            annual_profit_rate:'年化率', #t_invest year_interest_rate
            trade_status:'交易状态', #交易状态 1,预约中 2,预约失败 3,匹配中 4,回款中=预约成功 5,已回款'  # 投资状态(0=预约中|1=预约成功|2=预约失败|3=投资成功|4=投资失败|5=申请赎回|6=申请赎回审核成功|7=申请赎回审核失败|8=已赎回|9=逾期|10=已回款
            principal_amount:'投资本金', #principal
            current_principal_amount:'在投本金', #match_principal
            profit_amount:'总收益', # t_wallet表 根据customer_id 获取 interest_total
            subscribe_time:'预约时间', # t_invest subscribe_success_time
            invest_begin_time:'起投时间', # t_invest invest_success_time
            expired_time:'到期时间' ## repay_date 回款日
        },
        financial_claims :[{
            borrower_name:'借款人',  #t_invest_loan 表根据loan_order_no 获取借款人姓名 t_loan name
            match_time:'匹配时间', # t_invest_loan invest_success_time
            match_amount:'匹配借款' #t_invest_loan amt
        }],
        investment_history:[{
            time : '时间',  #t_invest_log update_time
            issuse : '事件' #t_invest_log content
        }]
    }
```

* * * * *

### 9. 资金流水列表 ###

>
`接口说明 : 根据资金搜索条件 获取资金流水列表 t_trade_record`
---

>
CGI URL : `/api/funds/list`

Method : GET

---
>
`请求参数 : `

```
   {

      `search_type`:'1, 投资人姓名 2，投资人手机号 3，交易号',
      `search_value`:'',
      `fund_status`:'资金动态 1,赎回 2,提前赎回 3,提现 4,充值 5,投资 6,退回',
      `amount_floor`:'交易金额下限',
      `amount_cell`:'交易金额上限'
      `create_time_from`:'发起时间from',
      `create_time_to`:'发起时间to',
      `page`:'1',
      `pageSize`:'20'
   }
```

---
>
`返回数据 :`

```
    {
      code: 0, // 0: 成功；非0，获取失败
      message: '成功 或者 失败原因'
      data:{
        list : {
            order_no:'交易号',
            investor_name:'投资人姓名', #通过t_trade_record 中的customer_id 查找t_customer 表中的name
            investor_id:'投资人id', #customer_id
            mobile:'手机号码', ##通过t_trade_record 中的customer_id 查找t_customer 表中的mobile
            invest_create_time : '发起时间', #t_trade_record create_time
            fund_status:'1,赎回 2,提前赎回 3,提现 4,充值 5,投资 6,退回', # type 交易类型(1=充值|2=提现|3=投资|4=到期赎回|5=提前赎回|6=奖励|7=退款)
            amount:'金额', #交易金额 amt
            amount_before_deal:'交易前金额', ##balance_before
            amount_after_deal:'交易后余额', ##balance_after
            status:'0=交易中，1=交易成功，2=交易失败', #status 交易状态(0=交易中，1=交易成功，2=交易失败)
            remark:'失败的情况下，失败的原因'
        },
        total : 1234,
        totalPage : 20
    }
```

* * * * *


## 惠理财管理后台: 理财计划管理 ##


### 1. 理财计划列表 ###

>
`接口说明 : 根据理财计划搜索条件 获取理财计划列表t_product 表`
---

>
CGI URL : `/api/plans/list`

Method : POST

---
>
`请求参数 : `

```
   {
      `search_type`:'1, 产品类型 product_type 2，产品期数 id',
      `search_value`:'',
      `status`:'计划状态 1,待上线 2,募集中 3,已结束 ',
      `from`:'募集开始时间 start_time',
      `to`:'募集结束时间 end_time',
      `page`:'1',
      `pageSize`:'20'
   }
```

---
>
`返回数据 :`

```
    {
      code: 0, // 0: 成功；非0，获取失败
      message: '成功 或者 失败原因'
      data:{
        list : {
            id:'产品期数',
            product_type:'产品类型 product_type',
            product_title:'产品名称 title',
            min_year_interest_rate:'最小年利率 min_year_interest_rate',
            max_year_interest_rate:'最大年率 max_year_interest_rate',
            freeze_days:'封闭期 loan_days',
            raise_from_time:'募集开始时间 start_time',
            raise_to_time:'募集结束时间 end_time',
            total_amt:'可投总额 total_amt'

        },
        total : 1234,
        totalPage : 20
    }
```

* * * * *

### 2. 理财计划详情：计划详情概览 ###

>
`接口说明 : 根据理财计划唯一编号 获取理财计详情 t_product 表`
---

>
CGI URL : `/api/plans/detail`

Method : POST

---
>
`请求参数 : `

```
   {
      `id`:'产品期数 id'
   }
```

---
>
`返回数据 :`

```
    {
      code: 0, // 0: 成功；非0，获取失败
      message: '成功 或者 失败原因'
      data:{

        id:'产品期数',
        product_type:'产品类型 product_type',
        product_title:'产品名称 title',
        freeze_days:'封闭期 loan_days',
        max_invest_amt:'单笔投资上限 max_invest_amt',
        min_invest_amt:'起投金额 min_invest_amt',
        total_amt:'可预约额度 total_amt',
        sell_amt :'目前预约金额 sell_amt',
        sell_percent:'募集程度 sell_amt / total_amt',
        repay_way:'还款方式 repay_way',
        status :'计划状态 status',
        raise_from_time:'募集开始时间 start_time',
        raise_to_time:'募集结束时间 end_time',
        total_amt:'可投总额 total_amt'

    }
```

* * * * *

### 3. 理财计划详情：投资列表 ###

>
`接口说明 : 根据理财计划唯一编号 获取理财计详情关联的投资列表 t_invest.product_id 查找`
---

>
CGI URL : `/api/plans/detail/list`

Method : POST

---
>
`请求参数 : `

```
   {
      `id`:'产品期数 id',
      `page`:'1',
      `pageSize`:'20'
   }
```

---
>
`返回数据 :`

```
    {
      code: 0, // 0: 成功；非0，获取失败
      message: '成功 或者 失败原因'
      data:{

        list : [{
            order_no:'交易号',
            investor_id:'投资人id  customer_id ',
            investor_name:'投资人名 关联 t_customer.id = t_invest.customer_id',
            investor_mobile:'手机号 t_customer.mobile',
            subscribe_success_time:'预约时间 subscribe_success_time',
            repay_date :'到期时间 repay_date',
            principal_amount :'投资本金 principal',
            current_principal_amount :'在投本金 match_principal',
            trade_status :'交易状态 status'
        }],
        total : 1234,
        totalPage : 20
    }
```

* * * * *

### 4. 理财产品详情 ###

>
`接口说明 : 根据产品类型，获取产品详情 t_product_introduce`
---

>
CGI URL : `/api/product/detail`

Method : POST

---
>
`请求参数 : `

```
   {
      `product_type`:'产品名称 或者产品类型',
   }
```

---
>
`返回数据 :`

```
    {
      code: 0, // 0: 成功；非0，获取失败
      message: '成功 或者 失败原因'
      data:{
        list : [{
            index:'产品属性索引 index',
            key:'产品属性名称 key',
            value:'产品属性值 value'
        }],
    }
```

* * * * *



