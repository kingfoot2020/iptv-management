#!/bin/bash
log_file="C:\design\next-js-iptv\data\logs\4c094f4a-5699-4435-b111-06ab6a9e240d.log"
input_url="http://line.pro-iptv.cc:80/246413/25A419/1478742"
rtmp_url="rtmp://p.koora.cloud:1935/dalbouh/b1"
bitrate="1000k"
resolution="854x480"

while true; do
  ffmpeg -re -i "$input_url" -vcodec libx264 -preset veryfast -tune zerolatency -s "$resolution" \
    -b:v "$bitrate" -maxrate "$bitrate" -acodec aac -b:a 56k -sc_threshold 0 -g 48 \
    -keyint_min 48 -x264opts no-scenecut -ar 48000 -bufsize 1600k -ab 96k \
    -f flv "$rtmp_url" >> "$log_file" 2>&1
  
  # Wait a bit before retrying to avoid CPU overload on constant failures
  sleep 1
done