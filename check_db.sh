#!/bin/bash
mongosh sanjiaozhou --quiet --eval 'db.datas.find({collection:"settings"}).forEach(printjson)'
