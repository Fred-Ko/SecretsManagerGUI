#!/bin/bash

# 테스트용 시크릿 생성
awslocal secretsmanager create-secret \
    --name "test/database" \
    --description "테스트용 데이터베이스 접속 정보" \
    --secret-string '{"username":"admin","password":"test1234","host":"localhost","port":5432,"dbname":"testdb"}'

awslocal secretsmanager create-secret \
    --name "test/api" \
    --description "테스트용 API 키" \
    --secret-string '{"api_key":"test_api_key_12345","api_secret":"test_api_secret_67890"}'

# 권한 설정
chmod +x /docker-entrypoint-initaws.d/01_init_secrets.sh
