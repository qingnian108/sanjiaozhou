# 三角洲撞车系统

一个用于管理游戏代练业务的多租户系统，支持老板和员工两种角色。

## 功能概述

### 老板端（管理后台）

#### 1. 总览 Dashboard
- 显示全局统计数据：总采购、总收入、总利润、平均币价
- 每日统计：当日订单数、完成金额、员工成本
- 订单列表和管理

#### 2. 派单 Dispatch
- 创建新订单，分配给员工
- 选择窗口进行派单
- 查看进行中/暂停的订单
- 恢复暂停的订单，可转派给其他员工

#### 3. 云机管理 CloudMachines
- 添加云机（手机号 + 平台）
- 批量采购：一次性添加云机、窗口和采购记录
- 管理窗口：添加、删除、分配给员工
- 窗口转让：在员工之间转移窗口
- 采购记录管理

#### 4. 员工管理 StaffManager
- 添加/删除员工账号
- 查看员工订单统计
- 查看员工当前使用的窗口
- 释放/转让员工窗口

#### 5. 好友系统 Friends
- 搜索并添加其他老板为好友
- 窗口转让给好友（跨租户）
- 转让时自动计算价格（基于平均币价）
- 接收转让后自动创建采购记录

#### 6. Kook频道管理
- 添加/编辑/删除 Kook 频道信息
- 关联员工

#### 7. 设置 Settings
- 员工成本费率
- 订单单价
- 默认手续费比例
- 初始资金

### 员工端 StaffPortal
- 查看分配给自己的订单
- 完成订单：填写每个窗口的结束余额
- 暂停订单
- 查看自己的窗口和 Kook 信息
- 申请/释放窗口

## 核心概念

### 云机与窗口
- **云机**：一个载体/容器，代表一台云手机，包含手机号和平台信息
- **窗口**：云机上的具体账号/窗口，有独立的哈夫币余额
- 云机可以被多个租户的窗口共享（云机只是载体）
- 窗口是有价值的资产，只能属于一个租户

### 币价计算
- **平均币价** = 总采购成本 / 总采购哈夫币数量
- 单位：元/千万哈夫币
- 用于计算利润和转让价格

### 窗口转让逻辑
1. 只转移窗口，不转移云机
2. 转让时按转出方的平均币价计算默认价格
3. 接收方接收后：
   - 转出方记录一笔"转让收入"（负数采购）
   - 接收方记录一笔"采购支出"
4. 接收方可以通过窗口关联的 machineId 看到云机信息

### 订单流程
1. 老板创建订单，选择员工和窗口
2. 员工执行订单
3. 员工完成订单，填写每个窗口的结束余额
4. 系统计算消耗量和损耗
5. 窗口余额为0时自动删除

## 数据单位说明
- `order.amount`：订单金额，单位为**万**
- `order.loss`、`order.totalConsumed`：实际单位（非万）
- `window.goldBalance`：哈夫币余额，实际单位
- 显示时使用 `formatWan()` 函数转换

## 技术栈
- 前端：React + TypeScript + Vite + TailwindCSS
- 后端：Node.js + Express + MongoDB
- 部署：PM2 进程管理

## 本地开发

```bash
# 安装依赖
npm install

# 启动前端开发服务器
npm run dev

# 启动后端服务器
cd server && npm install && node index.js
```

## 部署

参考 [服务器部署教程.md](服务器部署教程.md) 和 [DEPLOY.md](DEPLOY.md)

## SSH 免密登录配置

为了方便部署和管理服务器，可以配置 SSH 密钥免密登录：

### Windows 配置步骤

1. 生成 SSH 密钥（如果没有）：
```powershell
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\id_ed25519" -N '""'
```

2. 查看公钥：
```powershell
Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub"
```

3. 将公钥添加到服务器（需要输入一次密码）：
```powershell
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@服务器IP "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

或者手动登录服务器后执行：
```bash
echo '你的公钥内容' >> ~/.ssh/authorized_keys
```

4. 测试免密登录：
```powershell
ssh root@服务器IP "echo 连接成功"
```

### 常用 SSH 命令

```bash
# 上传文件到服务器
scp 本地文件 root@服务器IP:/目标路径/

# 重启 API 服务
ssh root@服务器IP "pm2 restart sanjiaozhou-api"

# 查看服务日志
ssh root@服务器IP "pm2 logs sanjiaozhou-api"

# 执行 MongoDB 命令
ssh root@服务器IP "mongosh sanjiaozhou --quiet /tmp/script.js"
```
