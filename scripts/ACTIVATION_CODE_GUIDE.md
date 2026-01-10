# 激活码生成和使用指南

## 概述

本系统使用**设备绑定激活码**机制来激活 Release 版本的软件。每个激活码基于设备指纹生成，**只能在一台设备上使用**，确保激活码的唯一性和安全性。

## 工作流程

### 步骤 1：用户获取设备指纹

用户需要在安装软件前获取设备指纹。有两种方式：

#### 方式 1：使用独立工具（推荐，无需安装软件）

**使用 Node.js 脚本（跨平台）：**

```bash
# 如果用户有 Node.js
node scripts/get-device-fingerprint.js

# 或者使用 npx（不需要安装 Node.js）
npx -y node scripts/get-device-fingerprint.js

# 或者使用 npm 脚本
pnpm run get:device-fingerprint
```

**使用 PowerShell 脚本（仅 Windows，无需 Node.js）：**

```powershell
# 在命令提示符（CMD）或 PowerShell 中运行
powershell -ExecutionPolicy Bypass -File scripts\get-device-fingerprint.ps1
```

**⚠️ 重要提示**：
- 脚本必须保存为文件并作为文件运行
- **不要**将脚本内容直接粘贴到 PowerShell 命令行中
- PowerShell 脚本会自动将设备指纹复制到剪贴板

#### 方式 2：从激活界面获取（需要先安装软件）

1. 用户安装软件（可以是通用安装包，不需要激活码）
2. 软件启动后显示激活界面
3. 激活界面会显示**设备指纹**（可以点击"显示"查看）
4. 用户复制设备指纹并发送给管理员

**⚠️ 设备指纹说明**

设备指纹是一个 64 位十六进制字符串（SHA-256 哈希），基于以下信息生成：
- 主机名（hostname）
- 平台和架构（platform, arch）
- MAC 地址列表（macAddresses）
- CPU ID（Windows 特有）
- Machine GUID（Windows 特有）

**设备指纹不是 Windows 的 Machine GUID**，而是综合多个设备信息的哈希值。

### 步骤 2：管理员生成设备绑定的激活码

管理员收到用户的设备指纹后，使用以下命令生成激活码：

```bash
# 使用设备指纹生成激活码
node scripts/generate-device-bound-code.js <设备指纹>

# 示例
node scripts/generate-device-bound-code.js abc123def4567890abcdef1234567890abcdef1234567890abcdef1234567890ab
```

输出示例：

```
============================================================
Device-Bound Activation Code
============================================================
Device Fingerprint: abc123def4567890...ef1234567890ab
Activation Code: A1B2-C3D4-E5F6-G7H8
============================================================
```

### 步骤 3：构建安装包

管理员使用生成的激活码构建安装包：

#### 本地构建

```bash
# 使用设备绑定的激活码构建
VITE_ACTIVATION_CODE=A1B2-C3D4-E5F6-G7H8 pnpm run build:release:win:activate
```

#### GitHub Actions 构建

1. 进入 GitHub 仓库的 **Actions** 页面
2. 选择 **Build Windows** workflow
3. 点击 **Run workflow**
4. 填写参数：
   - **Edition**: 选择 `release`
   - **Device fingerprint**: 输入用户的设备指纹（64 位十六进制字符串）
   - **Activation code**: 留空（会自动生成）
5. 点击 **Run workflow** 开始构建

**注意**：如果同时提供了设备指纹和激活码，会优先使用手动提供的激活码。

### 步骤 4：用户激活

1. 管理员将生成的安装包和激活码发送给用户
2. 用户安装软件
3. 软件启动后显示激活界面
4. 用户在激活界面输入激活码
5. 系统验证激活码是否匹配当前设备的指纹
6. 如果匹配，激活成功；如果不匹配，提示错误

## 安全特性

- ✅ **激活码唯一性**：每个激活码只能激活一台设备
- ✅ **设备绑定**：激活码基于设备指纹生成，无法在其他设备上使用
- ✅ **防止分享**：即使用户分享安装包和激活码，也无法在其他设备上激活
- ✅ **存储加密**：激活信息使用 AES-256-GCM 加密存储

## 故障排查

### 激活码输入后提示"激活码错误"

- 检查构建时是否正确设置了 `VITE_ACTIVATION_CODE` 环境变量
- 确认输入的激活码与构建时使用的激活码完全一致（包括大小写和分隔符）
- 检查是否有额外的空格或特殊字符
- **确认激活码是为当前设备的指纹生成的**

### 提示"设备不匹配"或"激活码与此设备不匹配"

- 激活码是为其他设备的指纹生成的
- 当前设备的硬件信息发生了变化（如更换网卡、CPU 等）
- **需要联系管理员，使用当前设备的指纹重新生成激活码**

### 激活码验证失败

- 确认构建时使用的是 Release 版本（`VITE_EDITION=release`）
- 检查激活码格式是否正确（应为 `XXXX-XXXX-XXXX-XXXX`）
- 查看应用日志获取详细错误信息

## 相关文件

- `scripts/generate-device-bound-code.js` - 设备绑定激活码生成脚本
- `scripts/get-device-fingerprint.js` - 设备指纹获取脚本（Node.js）
- `scripts/get-device-fingerprint.ps1` - 设备指纹获取脚本（PowerShell，Windows）
- `src/main/license/licenseValidator.ts` - 激活码验证逻辑
- `src/main/license/deviceFingerprint.ts` - 设备指纹生成
- `.github/workflows/build-windows.yml` - GitHub Actions 构建配置
