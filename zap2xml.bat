@echo off
pushd "%~dp0"

node dist/index.js %*

popd
