# Windows 构建说明

## 使用方法

### 方法 1: 通过 GitHub Actions UI 手动触发

1. 进入 GitHub 仓库
2. 点击 **Actions** 标签页
3. 选择 **Build Windows** workflow
4. 点击 **Run workflow** 按钮
5. 选择要构建的版本：
   - **Edition**: 选择 `trial`（试用版）或 `release`（正式版）
   - **Trial duration**: 如果选择试用版，输入试用期时长（默认：5）
   - **Trial unit**: 如果选择试用版，选择时间单位（seconds/minutes/hours/days，默认：minutes）
6. 点击 **Run workflow** 开始构建

### 方法 2: 通过 Git Push 自动触发

- **Push 到 main/master 分支**：自动构建正式版（release edition）
- **创建 Tag（v*）**：自动构建正式版并创建 Release

### 方法 3: 通过 Pull Request 触发

- 创建 PR 到 main/master 分支时会自动构建正式版进行测试

## 构建配置示例

### 构建试用版（5分钟）
- Edition: `trial`
- Trial duration: `5`
- Trial unit: `minutes`

### 构建试用版（30秒，用于快速测试）
- Edition: `trial`
- Trial duration: `30`
- Trial unit: `seconds`

### 构建试用版（7天）
- Edition: `trial`
- Trial duration: `7`
- Trial unit: `days`

### 构建正式版（无限制）
- Edition: `release`
- （其他参数不需要）

## 构建产物

构建完成后，可以在 **Actions** 页面下载构建产物：
- `.exe` - Windows 安装程序
- `.zip` - 便携版压缩包
- `.blockmap` - 更新检查文件

产物命名格式：`windows-installer-{edition}-{commit-sha}`

## 注意事项

1. **试用版限制**：
   - 有试用期限制（可配置）
   - 绑定到首次运行的设备
   - 过期后无法使用

2. **正式版**：
   - 无任何限制
   - 可以安装到任意设备

3. **环境变量**：
   - 构建时通过环境变量注入版本信息
   - 主进程在运行时读取这些变量进行验证
