# yolo v8 识别蚊子

## 安装环境
> 如果numpy有问题: `pip3 install --user "numpy<2.0"`
- pip3 install --user ultralytics
- (pip3 install opencv-python==4.10.0.84)
- 添加到~/.bash_profile中 `export PATH="$HOME/Library/Python/3.9/bin:$PATH"`,并 `source ~/.bash_profile`
### windows
- 提示yolo不存在或ultralytics有问题就重装ultralytics
- `CURRENT_DIR=$(pwd)`在window里有问题换为`CURRENT_DIR="R:/yolo-mosquito"`
- 安装cuda: `pip install torch==2.0.0+cu118 torchvision==0.15.0+cu118 torchaudio==2.0.0+cu118 -f https://download.pytorch.org/whl/cu118/torch_stable.html`,或（）`pip install torch==2.0.0+cu118 torchvision==0.15.0+cu118 torchaudio==2.0.0+cu118 --index-url https://download.pytorch.org/whl/cu118 --timeout 1000`
- 测试cuda: `python -c "import torch; print(torch.__version__); print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0))"`

### 标注
> 增加空标注样本,尽可能贴近你的实际部署场景,多拍不同角度不同光线的背景图
> 务必标注所有的蚊子,漏标影响很大

- 预剪裁: 标注的目标（蚊子）主体，最好能占据整张图片面积的 5% ~ 20%
- 安装标注软件: python3 -m pip install --user labelimg
- 终端打开软件: labelimg

### 训练
> 必须有train和val!
- 运行训练命令: `./train.sh`

### 测试
- python3 detect_video.py

### 训练参数
> 练流程控制

| 参数     | 类型     | 默认值 | 说明                                                                                                                  |
| -------- | -------- | ------ | --------------------------------------------------------------------------------------------------------------------- |
| epochs   | int      | 100    | 训练轮数。根据你的小数据集（106张图），建议设置100-200轮，并配合patience使用。                                        |
| batch    | int      | -1     | (自动)	批次大小。-1表示根据显存自动适配。你的Mac建议手动设置为4或8。                                                  |
| imgsz    | int      | 640    | 输入图片尺寸。你已设置为640，这也是官方推荐的平衡点。                                                                 |
| patience | int      | 100    | 早停耐心值。这个参数对你尤其重要。如果验证集精度连续patience轮没有提升，训练会自动停止，避免无效计算。建议设为20-50。 |
| device   | str      | None   | 训练设备。你的Mac默认会使用CPU，若要尝试使用AMD显卡加速，可设为device=mps。                                           |
| workers  | int      | 8      | 数据加载线程数。CPU训练时可适当减小，如workers=4，以减轻CPU负担。                                                     |
| resume   | bool/str | False  | 恢复训练。设为True或指定last.pt路径，可从断点继续训练。                                                               |

> 优化器与学习率

| 参数          | 类型  | 默认值 | 说明                                                                                      |
| ------------- | ----- | ------ | ----------------------------------------------------------------------------------------- |
| optimizer     | str   | 'auto' | 优化器。可选SGD, Adam, AdamW等。auto会根据模型自动选择。对于小数据集，AdamW可能收敛更快。 |
| lr0           | float | 0.01   | 初始学习率。这是最重要的参数之一。建议从0.001~0.01之间开始尝试。                          |
| lrf           | float | 0.01   | 最终学习率比例。最终学习率 = lr0 × lrf。配合余弦退火调度使用。                            |
| momentum      | float | 0.937  | 动量因子。SGD优化器的常用参数，保持默认即可。                                             |
| weight_decay  | float | 0.0005 | 权重衰减系数。L2正则化，用于防止过拟合。如果模型过拟合，可适当增大此值。                  |
| warmup_epochs | float | 3.0    | 预热轮数。学习率在最初几轮线性增加，帮助训练稳定。                                        |

> 数据增强

| 参数         | 类型  | 默认值 | 说明                                                                      |
| ------------ | ----- | ------ | ------------------------------------------------------------------------- |
| mosaic       | float | 1.0    | Mosaic增强概率。将4张图拼接成1张训练，对小目标检测极有帮助，建议保持1.0。 |
| mixup        | float | 0.0    | MixUp增强概率。将两张图按比例混合，可提升泛化性。建议尝试0.1-0.2。        |
| copy_paste   | float | 0.0    | 复制粘贴增强概率。将目标复制到同一张图的其他位置。对密集场景有帮助。      |
| scale        | float | 0.5    | 缩放增强系数。图像缩放范围，建议0.5（即0.5~1.5倍）。                      |
| fliplr       | float | 0.5    | 水平翻转概率。建议0.5（50%概率翻转）。                                    |
| hsv_h        | float | 0.015  | 色调（Hue）增强范围。建议0.015。                                          |
| hsv_s        | float | 0.7    | 饱和度（Saturation）增强范围。建议0.7。                                   |
| hsv_v        | float | 0.4    | 明度（Value）增强范围。建议0.4。                                          |
| degrees      | float | 0.0    | 旋转角度。默认不旋转，可尝试5-10度。                                      |
| close_mosaic | int   | 10	最  | 后N轮禁用Mosaic增强。在训练末期禁用，有助于模型学习更稳定的特征。         |

> 损失函数权重

| 参数 | 类型  | 默认值 | 说明                 |
| ---- | ----- | ------ | -------------------- |
| box  | float | 7.5    | 边界框回归损失权重。 |
| cls  | float | 0.5    | 分类损失权重。       |
| dfl  | float | 1.5    | 分布焦点损失权重。   |

