from ultralytics import YOLO
import cv2

# 1. 加载你刚刚训练好的模型
model = YOLO('runs/detect/train/weights/best.pt')

# 2. 打开摄像头 (0 代表默认摄像头)
cap = cv2.VideoCapture(0)

while cap.isOpened():
    success, frame = cap.read()
    if not success:
        break

    # 3. 用模型进行预测
    results = model(frame, stream=True)

    # 4. 把检测结果画在画面上并显示
    for r in results:
        annotated_frame = r.plot()
        cv2.imshow('YOLOv8 Mosquito Detection', annotated_frame)

    # 5. 按 'q' 键退出
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()