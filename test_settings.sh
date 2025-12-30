#!/bin/bash
echo "保存设置 defaultFeePercent=3..."
curl -s -X POST "http://localhost:3000/api/settings/6943b29b54fd48df6451fc7f" \
  -H "Content-Type: application/json" \
  -d '{"employeeCostRate":12,"defaultFeePercent":3,"orderUnitPrice":60,"initialCapital":10000}'
echo ""
echo "读取设置..."
curl -s "http://localhost:3000/api/settings/6943b29b54fd48df6451fc7f"
