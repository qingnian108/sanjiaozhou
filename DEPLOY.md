# 腾讯云 CloudBase 部署指南

## 第一步：创建 CloudBase 环境

1. 访问 [腾讯云 CloudBase 控制台](https://console.cloud.tencent.com/tcb)
2. 点击「新建环境」，选择「按量计费」（有免费额度）
3. 记下你的 **环境 ID**（类似 `xxx-1234abcd`）

## 第二步：配置登录方式

1. 在 CloudBase 控制台，进入你的环境
2. 左侧菜单选择「登录授权」
3. 开启「匿名登录」（用于获取数据库访问权限）

## 第三步：创建数据库集合

1. 左侧菜单选择「数据库」
2. 点击「新建集合」，依次创建以下集合：
   - `purchases`
   - `orders`
   - `staff`
   - `config`
   - `kookChannels`
   - `cloudMachines`
   - `cloudWindows`

3. 为每个集合设置权限（点击集合名 → 权限设置）：
   - 选择「所有用户可读，仅创建者可写」或根据需要自定义

## 第四步：修改配置

打开 `cloudbase.ts` 文件，将 `your-env-id` 替换为你的环境 ID：

```typescript
const ENV_ID = 'your-env-id';  // 改成你的环境 ID
```

## 第五步：构建项目

```bash
npm run build
```

构建完成后会生成 `dist` 文件夹。

## 第六步：部署静态网站

### 方式一：CloudBase 静态托管（推荐）

1. 在 CloudBase 控制台，左侧选择「静态网站托管」
2. 点击「开通」
3. 上传 `dist` 文件夹中的所有文件
4. 访问提供的默认域名即可使用

### 方式二：使用 CLI 部署

```bash
# 安装 CloudBase CLI
npm install -g @cloudbase/cli

# 登录
tcb login

# 部署静态文件
tcb hosting deploy ./dist -e your-env-id
```

## 第七步：创建管理员账号

部署完成后：

1. 访问你的网站
2. 使用注册功能创建第一个账号（用户名 + 密码 + 姓名）
3. 在 CloudBase 数据库控制台，找到 `staff` 集合
4. 编辑你的用户记录，将 `role` 改为 `admin`

## 常见问题

### Q: 访问网站显示空白？
检查浏览器控制台是否有错误，确认环境 ID 配置正确。

### Q: 登录失败？
确认已在 CloudBase 控制台开启「匿名登录」，并检查用户名密码是否正确。

### Q: 数据库操作失败？
检查集合权限设置，确保已登录用户有读写权限。

## 费用说明

CloudBase 免费额度（每月）：
- 存储：2GB
- 数据库读取：5万次
- 数据库写入：3万次
- 云函数调用：4万次

小团队使用基本够用，超出后按量付费。
