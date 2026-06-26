from ultralytics import YOLO
import cv2

# 1. 加载你刚刚训练好的模型
model = YOLO('runs/detect/train/weights/best.pt')

# 2. 打开视频文件
cap = cv2.VideoCapture("./dataset/videos/videoplayback-3.mp4")

frame_count = 0
process_every_n_frames = 30 

while cap.isOpened():
    success, frame = cap.read()
    if not success:
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)  # 回到第一帧
        continue

    frame_count += 1
    
    # 只有当前帧是特定帧时才进行推理
    if frame_count % process_every_n_frames == 0:
        # 3. 用模型进行预测
        results = model(frame, stream=True)

        # 4. 把检测结果画在画面上并显示
        for r in results:
            annotated_frame = r.plot()
            cv2.imshow('YOLOv8 Mosquito Detection', annotated_frame)
    else:
        # 不进行推理，只显示原始帧或跳过显示以节省资源
        # 如果也想显示原始帧，可以取消下面一行的注释
        # cv2.imshow('YOLOv8 Detection', frame)
        pass

    # 5. 按 'q' 键退出
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()