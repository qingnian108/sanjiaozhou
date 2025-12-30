#!/bin/bash
mongosh sanjiaozhou --quiet --eval 'db.datas.updateOne({collection:"settings",tenantId:"6943b29b54fd48df6451fc7f"},{$set:{data:{employeeCostRate:12,defaultFeePercent:5,orderUnitPrice:60,initialCapital:10000}}})'
