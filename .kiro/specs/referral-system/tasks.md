# Implementation Plan

- [x] 1. 后端数据模型和基础API




  - [ ] 1.1 扩展Tenant模型，添加commissionRate和inviterId字段
    - 在server/index.js中更新TenantAccountSchema


    - 默认commissionRate为0.1（10%）
    - _Requirements: 3.4, 5.2_


  - [ ] 1.2 创建邀请关系和返佣记录的数据模型
    - 创建referrals集合Schema

    - 创建commissions集合Schema
    - _Requirements: 2.2, 3.3_
  - [x] 1.3 实现邀请码验证API




    - GET /api/referral/validate/:inviteCode
    - 验证邀请码是否对应有效租户
    - _Requirements: 2.2, 2.3_


  - [ ] 1.4 实现获取邀请信息API
    - GET /api/referral/:tenantId
    - 返回邀请码、邀请链接、返佣比例、统计数据




    - _Requirements: 1.1, 4.1_

- [ ] 2. 注册流程集成邀请码
  - [x] 2.1 修改注册API支持邀请码参数

    - 验证邀请码有效性

    - 创建邀请关系记录
    - 设置新用户的inviterId
    - _Requirements: 2.2, 2.3, 2.4_

  - [ ] 2.2 修改Login.tsx注册表单
    - 添加邀请码输入框（可选）
    - 从URL参数?ref=自动填充邀请码



    - 显示邀请码验证状态
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 3. 充值返佣逻辑
  - [x] 3.1 修改充值回调处理返佣


    - 在微信支付回调中检查邀请关系
    - 计算返佣金额（充值金额 × 邀请人返佣比例）
    - 增加邀请人账户余额
    - 创建返佣记录
    - _Requirements: 3.1, 3.2, 3.3_







- [ ] 4. 邀请统计和记录API
  - [x] 4.1 实现获取被邀请人列表API








    - GET /api/referral/:tenantId/invitees
    - 返回脱敏的被邀请人信息
    - _Requirements: 4.2_
  - [ ] 4.2 实现获取返佣记录API
    - GET /api/referral/:tenantId/commissions
    - 返回返佣明细列表
    - _Requirements: 4.3_

- [ ] 5. 前端邀请板块
  - [ ] 5.1 在api.ts中添加邀请相关API方法
    - referralApi.getInfo()
    - referralApi.getInvitees()
    - referralApi.getCommissions()
    - referralApi.validate()
    - _Requirements: 1.1, 4.1, 4.2, 4.3_
  - [ ] 5.2 在Billing.tsx中添加邀请板块UI
    - 显示邀请码和邀请链接
    - 一键复制功能
    - 邀请统计卡片
    - 被邀请人列表
    - 返佣记录列表
    - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3_

- [ ] 6. 超管后台扩展
  - [ ] 6.1 添加超管设置返佣比例API
    - PUT /api/super/tenant/:tenantId/commission-rate
    - _Requirements: 5.2_
  - [ ] 6.2 修改SuperAdmin.tsx用户编辑
    - 添加返佣比例编辑字段
    - 显示用户的邀请统计
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 7. 部署和测试
  - [ ] 7.1 构建前端并部署
  - [ ] 7.2 部署后端API
  - [ ] 7.3 测试完整流程
    - 注册时填写邀请码
    - 充值后检查返佣
    - 超管修改返佣比例
