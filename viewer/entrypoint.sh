#!/bin/bash

# BFF（FastAPI）と Streamlit を並行実行

# FastAPI サーバーをバックグラウンドで起動（ポート 8001）
API_PORT=8001 python -m viewer.api &
API_PID=$!

# Streamlit を起動（ポート $PORT）
streamlit run viewer/app.py \
  --server.port $PORT \
  --server.address 0.0.0.0 \
  --server.headless true

# 終了時に FastAPI プロセスも終了
trap "kill $API_PID" EXIT
