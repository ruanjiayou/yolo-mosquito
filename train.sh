#!/bin/bash
CURRENT_DIR="R:/yolo-mosquito"

> "$CURRENT_DIR/mosquito_data.yaml"

echo "path: $CURRENT_DIR/dataset
train: images/train
val: images/val
nc: 1
names: ['mosquito']" >> "$CURRENT_DIR/mosquito_data.yaml"

# yolo detect train data="$CURRENT_DIR/mosquito_data.yaml" model=yolov8n.pt epochs=50 imgsz=640
# yolo detect train data="$CURRENT_DIR/mosquito_data.yaml" model=yolov8s.pt epochs=100 imgsz=640 batch=16 patience=10 warmup_epochs=3 optimizer=AdamW lr0=0.002 momentum=0.937 weight_decay=0.0005
# 使用cuda patience=10 
yolo detect train data="$CURRENT_DIR/mosquito_data.yaml" model=yolov8s.pt epochs=100 imgsz=640 batch=8 device=0 workers=4 warmup_epochs=3 optimizer=AdamW lr0=0.002 momentum=0.937 weight_decay=0.0005

echo "✅ 训练完成！"
