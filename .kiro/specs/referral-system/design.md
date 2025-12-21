# Design Document

## Overview

邀请返佣系统为现有的三角洲撞车系统增加推广功能。用户可以通过分享邀请码邀请新用户，当被邀请用户充值时，邀请人获得返佣奖励。系统采用一级返佣模式，默认比例10%，超管可针对每个账户单独调整。

## Architecture

系统基于现有架构扩展：
- 前端：React + TypeScript，在账户页面增加邀请板块
- 后端：Express.js，增加邀请相关API
- 数据库：MongoDB，新增邀请关系和返佣记录集合

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   Login     │  │   Billing   │  │   SuperAdmin    │  │
│  │ (邀请码输入) │  │ (邀请板块)  │  │ (返佣比例管理)  │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Backend API                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │  /api/referral/*  - 邀请相关接口                 │    │
│  │  /api/recharge/*  - 充值接口(增加返佣逻辑)       │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                     MongoDB                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   tenants    │  │  referrals   │  │ commissions  │   │
│  │(+返佣比例字段)│  │ (邀请关系)   │  │ (返佣记录)   │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### API Endpoints

#### 1. 获取邀请信息
```
GET /api/referral/:tenantId
Response: {
  inviteCode: string,        // 邀请码（用户名）
  inviteLink: string,        // 邀请链接
  commissionRate: number,    // 返佣比例
  stats: {
    inviteeCount: number,    // 邀请人数
    totalCommission: number  // 累计返佣
  }
}
```

#### 2. 获取被邀请人列表
```
GET /api/referral/:tenantId/invitees
Response: {
  invitees: [{
    username: string,        // 脱敏用户名
    createdAt: string        // 注册时间
  }]
}
```

#### 3. 获取返佣记录
```
GET /api/referral/:tenantId/commissions
Response: {
  commissions: [{
    inviteeUsername: string, // 脱敏用户名
    rechargeAmount: number,  // 充值金额
    commissionRate: number,  // 返佣比例
    commissionAmount: number,// 返佣金额
    createdAt: string        // 时间
  }]
}
```

#### 4. 验证邀请码
```
GET /api/referral/validate/:inviteCode
Response: {
  valid: boolean,
  inviterName: string        // 邀请人名称（脱敏）
}
```

#### 5. 超管设置返佣比例
```
PUT /api/super/tenant/:tenantId/commission-rate
Body: { commissionRate: number }
```

### Frontend Components

#### Billing.tsx 扩展
在账户页面增加"我的邀请"板块：
- 显示邀请码和邀请链接
- 一键复制功能
- 邀请统计（人数、累计返佣）
- 被邀请人列表
- 返佣记录列表

#### Login.tsx 扩展
注册表单增加：
- 邀请码输入框（可选）
- 从URL参数自动填充邀请码

#### SuperAdmin.tsx 扩展
用户编辑增加：
- 返佣比例设置字段
- 显示该用户的返佣统计

## Data Models

### Tenant 扩展字段
```javascript
{
  // 现有字段...
  commissionRate: Number,    // 返佣比例，默认0.1（10%）
  inviterId: ObjectId,       // 邀请人ID（如有）
}
```

### Referral Collection (邀请关系)
```javascript
{
  _id: ObjectId,
  inviterId: ObjectId,       // 邀请人租户ID
  inviteeId: ObjectId,       // 被邀请人租户ID
  inviteCode: String,        // 使用的邀请码
  createdAt: Date            // 绑定时间
}
```

### Commission Collection (返佣记录)
```javascript
{
  _id: ObjectId,
  inviterId: ObjectId,       // 邀请人租户ID
  inviteeId: ObjectId,       // 被邀请人租户ID
  rechargeOrderId: String,   // 关联的充值订单ID
  rechargeAmount: Number,    // 充值金额
  commissionRate: Number,    // 返佣比例
  commissionAmount: Number,  // 返佣金额
  createdAt: Date            // 返佣时间
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 邀请关系唯一性
*For any* 被邀请人，系统中最多只能存在一条邀请关系记录
**Validates: Requirements 2.4**

### Property 2: 返佣金额计算正确性
*For any* 充值记录，返佣金额应等于 充值金额 × 邀请人返佣比例
**Validates: Requirements 3.1**

### Property 3: 返佣余额一致性
*For any* 邀请人，其累计返佣金额应等于所有返佣记录金额之和
**Validates: Requirements 3.2, 4.1**

### Property 4: 邀请码有效性
*For any* 有效邀请码，必须对应一个存在的租户账户
**Validates: Requirements 2.2, 2.3**

## Error Handling

| 场景 | 处理方式 |
|------|----------|
| 邀请码不存在 | 提示无效但允许继续注册 |
| 自己邀请自己 | 拒绝，提示不能使用自己的邀请码 |
| 邀请人账户被禁用 | 正常建立关系，但不发放返佣 |
| 返佣计算失败 | 记录错误日志，不影响充值流程 |

## Testing Strategy

### 单元测试
- 返佣金额计算函数
- 邀请码验证逻辑
- 用户名脱敏函数

### 集成测试
- 注册时绑定邀请关系
- 充值时触发返佣
- 超管修改返佣比例
