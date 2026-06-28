from ultralytics import YOLO
import cv2

# 1. 加载你刚刚训练好的模型
model = YOLO('runs/detect/train-2/weights/best.pt')

# 2. 打开视频文件
cap = cv2.VideoCapture("./dataset/videos/videoplayback-3.mp4")

frame_count = 0
process_every_n_frames = 8 
# 获取视频总帧数和帧率，用于计算时长
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
fps = cap.get(cv2.CAP_PROP_FPS)
total_duration = total_frames / fps  # 总时长（秒）

while cap.isOpened():
    success, frame = cap.read()
    if not success:
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)  # 回到第一帧
        continue

    frame_count += 1
     # 获取当前帧索引并计算已播放时间
    current_frame = int(cap.get(cv2.CAP_PROP_POS_FRAMES))
    current_time = current_frame / fps  # 已播放时间（秒）
    # 格式化时间为 mm:ss 或 HH:mm:ss
    def format_time(seconds):
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        if hours > 0:
            return f"{hours:02d}:{minutes:02d}:{secs:02d}"
        return f"{minutes:02d}:{secs:02d}"

    progress_text = f"{format_time(current_time)} / {format_time(total_duration)}"

    # 只有当前帧是特定帧时才进行推理
    if frame_count % process_every_n_frames == 0:
        # 3. 用模型进行预测
        results = model(frame, stream=True, conf=0.4)

        # 4. 把检测结果画在画面上并显示
        for r in results:
            annotated_frame = r.plot()
            # 在画面左上角绘制进度文本
            cv2.putText(annotated_frame, progress_text, (10, 30), cv2.FONT_HERSHEY_DUPLEX, 0.8, (0, 255, 0), 2)
            cv2.imshow('YOLOv8 Mosquito Detection', annotated_frame)
    else:
        # 不进行推理，只显示原始帧或跳过显示以节省资源
        # 如果也想显示原始帧，可以取消下面一行的注释
        # cv2.imshow('YOLOv8 Detection', frame)
        pass

    # 5. 按 'q' 键退出
    key = cv2.waitKey(1) & 0xFF
    if key == ord('q') or key == 27:
        break

cap.release()
cv2.destroyAllWindows()