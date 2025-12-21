# 三角洲撞车系统

一个用于管理游戏代练业务的多租户 SaaS 系统。

## 技术栈

- **前端**: React + TypeScript + Vite + TailwindCSS
- **后端**: Node.js + Express + MongoDB
- **部署**: PM2 + Nginx

## 功能模块

### 老板端
- **总览 Dashboard** - 统计数据、利润分析、订单管理
- **派单 Dispatch** - 创建订单、分配员工
- **云机管理** - 云机/窗口管理、批量采购
- **员工管理** - 员工账号、窗口分配
- **好友系统** - 好友添加、窗口/云机转让
- **Kook 频道** - 频道信息管理
- **账户中心** - 充值、购买服务、邀请返佣
- **系统设置** - 参数配置、客服管理

### 员工端
- 查看/完成订单
- 窗口申请/释放
- 查看 Kook 信息

### 客服端
- 派单管理
- 窗口分配
- 无财务数据权限

### 超级管理员
- 租户管理
- 手动充值
- 返佣比例设置
- 利润统计

## 本地开发

```bash
# 安装依赖
npm install

# 启动前端
npm run dev

# 启动后端
cd server && node index.js
```

## 部署

详见 [服务器部署教程.md](服务器部署教程.md)

### 快速部署命令
```bash
# 前端
npm run build
scp -r dist/* root@101.43.70.216:/www/wwwroot/sanjiaozhou/

# 后端
scp server/index.js root@101.43.70.216:/www/wwwroot/sanjiaozhou-api/
ssh root@101.43.70.216 "pm2 restart sanjiaozhou-api"
```

## 核心概念

### 云机与窗口
- **云机**: 载体/容器，代表一台云手机
- **窗口**: 云机上的具体账号，有独立余额

### 币价计算
```
平均币价 = 总采购成本 / 总采购哈夫币数量
单位: 元/千万哈夫币
```

### 利润计算
```
收入 = (订单金额/1000) × 单价
成本 = ((订单金额+损耗)/1000) × 平均币价
人工 = (订单金额/1000) × 员工成本率
利润 = 收入 - 成本 - 人工
```

## 计费模式

- **基础月费**: 50元/月
- **窗口费用**: 10元/窗口/月
- **试用期**: 7天
- **邀请返佣**: 默认10%

## 用户角色

| 角色 | 说明 |
|------|------|
| super | 超级管理员 |
| admin | 老板 |
| staff | 员工 |
| dispatcher | 客服 |

## 数据库

MongoDB 数据库: `sanjiaozhou`

主要集合:
- `users` - 用户
- `tenantaccounts` - 租户账户
- `datas` - 通用数据（云机、窗口、订单等）
- `friends` - 好友关系
- `transfers` / `machinetransfers` - 转让记录
- `referrals` / `commissions` - 邀请返佣

## 环境变量

```env
# 微信支付
WECHAT_MCHID=商户号
WECHAT_APPID=应用ID
WECHAT_API_V3_KEY=APIv3密钥
WECHAT_CERT_SERIAL=证书序列号
WECHAT_NOTIFY_URL=回调地址
```

## 默认配置

- 员工成本率: 12 元/千万
- 订单单价: 60 元/千万
- 默认手续费: 5%
