---
title: 本地开发
summary: 为本地开发设置 Paperclip
---

在本地运行 Paperclip。

> **本实例使用外部 PostgreSQL（Docker 容器），端口 4100。** 详见 [数据库](/部署/05%20数据库%20database.md)。

## 先决条件

- Node.js 20+
- pnpm 9+
- Docker（运行外部 PostgreSQL）

## 快速启动（一条龙）

```powershell
# PowerShell，仓库根目录
.\scripts\start-paperclip-dev-external.ps1
```

或手动逐步启动：

```sh
# 1. 确保 DB 容器在运行
docker start paperclip-routic-db

# 2. 设置环境变量并启动
export PORT=4100
export DATABASE_URL="postgres://routic:routic@127.0.0.1:5433/routic"
pnpm dev:once
```

这会启动：

- **API 服务器**在 `http://localhost:4100`
- **UI** 由 API 服务器在开发中间件模式下提供（同源）

## 启动开发服务器（嵌入式 PG）

如果不使用外部数据库，Paperclip 也可自动使用嵌入式 PostgreSQL：

```sh
pnpm install
pnpm dev
```

这会启动 `http://localhost:3100`（默认端口）。

## 单命令引导

对于首次安装：

```sh
pnpm paperclipai run
```

这会执行：

1. 如果配置缺失，自动入门
2. 运行 `paperclipai doctor` 并启用修复
3. 当检查通过时启动服务器

## 开发中的绑定预设

默认的 `pnpm dev` 保持在 `local_trusted` 模式，仅绑定到环回。

要打开 Paperclip 到私有网络并启用登录：

```sh
pnpm dev --bind lan
```

对于在检测到的 tailnet 地址上仅绑定 Tailscale：

```sh
pnpm dev --bind tailnet
```

传统别名仍然有效，并映射到较旧的广泛私有网络行为：

```sh
pnpm dev --tailscale-auth
pnpm dev --authenticated-private
```

允许其他私有主机名：

```sh
pnpm paperclipai allowed-hostname dotta-macbook-pro
```

有关完整设置和故障排除，请参阅 [Tailscale 私有访问](/部署/09%20Tailscale%20私有访问%20tailscale-private-access)。

## 运行状况检查

```sh
# 本实例端口 4100
curl http://localhost:4100/api/health
# -> {"status":"ok"}

curl http://localhost:4100/api/companies
# -> []
```

## 重置开发数据

**本实例使用外部 PostgreSQL，数据存储在 Docker 容器中。** 重置方式：

```sh
# 进入容器重置数据库
docker exec -it paperclip-routic-db psql -U routic -d routic -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
# 重新运行迁移
pnpm db:migrate
```

如果使用嵌入式 PostgreSQL，则：

```sh
rm -rf ~/.paperclip/instances/default/db
pnpm dev
```

## 数据位置

| 数据 | 路径 |
|------|------|
| 配置 | `~/.paperclip/instances/default/config.json` |
| 数据库（嵌入式） | `~/.paperclip/instances/default/db` |
| 数据库（外部 PG） | Docker 容器 `paperclip-routic-db`，端口 5433 |
| 存储 | `~/.paperclip/instances/default/data/storage` |
| 密钥密钥 | `~/.paperclip/instances/default/secrets/master.key` |
| 日志 | `~/.paperclip/instances/default/logs` |

通过环境变量覆盖：

```sh
PAPERCLIP_HOME=/custom/path PAPERCLIP_INSTANCE_ID=dev pnpm paperclipai run
```