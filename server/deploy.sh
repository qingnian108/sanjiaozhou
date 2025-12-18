#!/bin/bash

echo "========================================="
echo "  三角洲员工系统 - 服务器部署脚本"
echo "========================================="

# 安装 MongoDB
echo "正在安装 MongoDB..."
cat > /etc/yum.repos.d/mongodb-org-6.0.repo << 'EOF'
[mongodb-org-6.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/$releasever/mongodb-org/6.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-6.0.asc
EOF

yum install -y mongodb-org

# 启动 MongoDB
systemctl start mongod
systemctl enable mongod

echo "MongoDB 安装完成"

# 安装 Node.js 16 (兼容 CentOS 7)
echo "正在安装 Node.js..."
curl -fsSL https://rpm.nodesource.com/setup_16.x | bash -
yum install -y nodejs

echo "Node.js 安装完成"
node -v
npm -v

# 创建后端目录
mkdir -p /www/wwwroot/sanjiaozhou-api
cd /www/wwwroot/sanjiaozhou-api

echo "请将 server 文件夹中的 package.json 和 index.js 上传到 /www/wwwroot/sanjiaozhou-api/"
echo "然后执行: cd /www/wwwroot/sanjiaozhou-api && npm install && npm start"
