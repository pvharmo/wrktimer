#!/bin/bash

IDLE=false
STARTUP=true
PREV=0
run=true

while [ true ]; do
  IDLETIME=$(xprintidle)
  IDLETIMETRIGGER=$((5*60*1000))
  if [[ $STARTUP = true ]]; then
    if [[ $IDLETIME -lt $PREV ]]; then
      echo "Session started (startup)"
      CALL="curl -s --max-time 1 http://localhost:8080/start\?user=$(whoami)"
      STARTUP=false
      eval $CALL
    fi
    PREV=$IDLETIME
  elif [ $IDLETIME -gt $IDLETIMETRIGGER ]; then
    if [[ $IDLE = false ]]; then
      echo "You are now idle"
      CALL="curl -s --max-time 1 http://localhost:8080/stop\?user=$(whoami)\&timeout=$IDLETIMETRIGGER"
      IDLE=true
      eval $CALL
    fi
  elif [[ $IDLETIME -lt $IDLETIMETRIGGER ]]; then
    if [[ $IDLE = true ]]; then
      CALL="curl -s --max-time 1 http://localhost:8080/start\?user=$(whoami)"
      echo "Session started"
      IDLE=false
      eval $CALL
    fi
  fi

  function stop() {
    if [[ startup = false ]]; then
      CALL="curl -s --max-time 3 http://localhost:8080/stop\?user=$(whoami)\&timeout=$IDLETIMETRIGGER"
      eval $CALL
    fi
    echo "script stopped" >> log.log
    echo "script stopped"
  }
  trap stop EXIT

  sleep 1

done
