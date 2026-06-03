#!/bin/bash
export NEXT_TELEMETRY_DISABLED=1
export CI=false
cd "/Users/gabrieldiniz/Desktop/CODIGOS DEV/Sistema_upgrade-main/frontend"
./node_modules/.bin/next build
echo "EXIT: $?"
