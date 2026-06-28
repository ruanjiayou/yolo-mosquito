import torch
print(torch.cuda.is_available())  # 必须输出 True
print(torch.cuda.get_device_name(0)) # 会显示你的显卡型号，例如 "NVIDIA H200"[citation:1]