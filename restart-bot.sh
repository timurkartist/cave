#!/bin/bash
pm2 restart cave-game-bot --update-env
sleep 2
pm2 list
