# 笔记

## 安装环境
> 如果numpy有问题: `pip3 install --user "numpy<2.0"`
- pip3 install --user ultralytics opencv-python
- 添加到~/.bash_profile中 `export PATH="$HOME/Library/Python/3.9/bin:$PATH"`,并 `source ~/.bash_profile`

### 标注
- 预剪裁: 标注的目标（蚊子）主体，最好能占据整张图片面积的 5% ~ 20%
- 安装标注软件: python3 -m pip install --user labelimg
- 终端打开软件: labelimg

### 训练
> 必须有train和val!
- 运行训练命令: `./train.sh`

### 测试
- python3 detect_video.py