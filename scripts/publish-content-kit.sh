#!/usr/bin/env bash
# publish-content-kit.sh — 构建、校验并发布本包至私有 npm 制品库
#
# 配置单一事实源：包名 / 版本 / 发布目标均取自 package.json，本脚本不重复维护。
# 完整参数说明见 --help 或包根目录 README.md。
#
# 安全红线（与 publish-api-sdk.sh 一致）：
#   - 严禁在仓库内落盘明文 Token 或永久 .npmrc
#   - 严禁将 Token 作为命令行参数回显在进程树中
#   - 严禁开启 set -x，避免 CI 日志打印明文 Token
#   - 临时 .npmrc 由 trap 在任意退出路径清理，且不写入包目录
#
# 幂等：当前版本已存在于制品库时直接跳过（CI 沙箱没有本地发布状态文件，
# 旧实现依赖 .publish-state 去重，导致 tag 推送必然以 409 失败）。
set -euo pipefail

SCRIPT_DIR="$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SDK_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${SDK_DIR}/../.." && pwd)"
cd "$SDK_DIR"

PACKAGE_NAME=$(node -e "console.log(JSON.parse(require('fs').readFileSync('package.json','utf8')).name)")
SCOPE="${PACKAGE_NAME%%/*}"
REGISTRY_URL=$(node -e "console.log(JSON.parse(require('fs').readFileSync('package.json','utf8')).publishConfig?.registry || '')")

# 凭据变量名按优先级排列；环境变量探测与 .env 探测共用这一份清单。
TOKEN_VARS=(CNB_TOKEN CNB_NPM_TOKEN NPM_TOKEN TILO_REGISTRY_TOKEN)

usage() {
  cat <<EOF
用法: bash scripts/publish-content-kit.sh [选项]

构建、校验并发布 ${PACKAGE_NAME} 到私有 npm 制品库。

选项:
  --version=<版本>   指定发布版本，并同步 package.json 与包内版本常量；
                     省略时沿用 package.json 的当前版本
  --force            忽略「同版本已发布」的幂等跳过，强制尝试发布
  --help, -h         显示本帮助并退出（不产生任何构建或上传）

配置来源（以下信息不在帮助与文档中重复维护）:
  包名 / 当前版本      package.json 的 name / version
  发布目标 registry    package.json 的 publishConfig.registry
                     当前值: ${REGISTRY_URL}
  凭据变量（按优先级） ${TOKEN_VARS[*]}
  凭据来源             上述环境变量，或工作区各级 .env / .env.local
  私有源权限           由制品库侧授权决定，脚本不内置任何令牌

执行流程:
  版本解析 → CHANGELOG 版本段落门禁 → 凭据探测 → 制品库可达性与版本幂等预检
  → 依赖安装 → build → test → typecheck → api:check → npm publish
  凭据注入通过临时 .npmrc 完成，进程退出时清理；日志中令牌始终脱敏。
  版本遵循 SemVer 只增不覆盖。

常用命令（在包目录执行）:
  pnpm install
  pnpm build | pnpm test | pnpm typecheck | pnpm api:check | pnpm api:update
  pnpm usage                      # 等价 --help

消费方接入、入口说明与依赖边界见包根目录 README.md。
EOF
}

TARGET_VERSION=""
FORCE=false
for arg in "$@"; do
  case "$arg" in
    --version=*) TARGET_VERSION="${arg#*=}" ;;
    --force) FORCE=true ;;
    --help|-h) usage; exit 0 ;;
    *) echo "未知参数: ${arg} （使用 --help 查看用法）"; exit 1 ;;
  esac
done

if [ -z "$REGISTRY_URL" ]; then
  echo "✘ package.json 缺少 publishConfig.registry，无法确定发布目标"
  exit 1
fi

CURRENT_VERSION=$(node -e "console.log(JSON.parse(require('fs').readFileSync('package.json','utf8')).version)")
RESOLVED_VERSION="${TARGET_VERSION:-$CURRENT_VERSION}"

# CHANGELOG 门禁：每个对外版本必须有人写的变更说明（迁移/兼容信息无法由 commit 自动生成）。
# 必须在写回 package.json / version.ts 之前校验，避免中止时留下未发布的版本号。
if [ ! -f CHANGELOG.md ] || ! grep -qE "^## \[${RESOLVED_VERSION}\]" CHANGELOG.md; then
  echo "✘ CHANGELOG.md 缺少 ${RESOLVED_VERSION} 版本段落，发布中止（未修改任何文件）"
  echo "   请先补充 '## [${RESOLVED_VERSION}] - $(date +%F 2>/dev/null || echo YYYY-MM-DD)' 并记录对外可见变更"
  exit 1
fi

if [ -n "$TARGET_VERSION" ]; then
  node -e "
    const fs = require('fs');
    const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    p.version = process.argv[1];
    fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
    fs.writeFileSync('src/version.ts', 'export const CONTENT_KIT_VERSION = \'' + p.version + '\';\n');
  " "$TARGET_VERSION"
fi

echo ">> ${PACKAGE_NAME}@${RESOLVED_VERSION} -> ${REGISTRY_URL}"

AUTH_TOKEN=""
TOKEN_SOURCE=""
for var in "${TOKEN_VARS[@]}"; do
  val="${!var:-}"
  if [ -n "$val" ]; then AUTH_TOKEN="$val"; TOKEN_SOURCE="env:${var}"; break; fi
done
if [ -z "$AUTH_TOKEN" ]; then
  for cand in "$ROOT_DIR/.env.local" "$ROOT_DIR/.env" "$ROOT_DIR/frontend-v2/.env.local" "$ROOT_DIR/frontend-v2/.env"; do
    [ -f "$cand" ] || continue
    for var in "${TOKEN_VARS[@]}"; do
      val=$(grep -E "^[[:space:]]*${var}[[:space:]]*=" "$cand" | head -n1 | cut -d= -f2- | tr -d '\r' | xargs || true)
      if [ -n "$val" ]; then AUTH_TOKEN="$val"; TOKEN_SOURCE="${cand}:${var}"; break 2; fi
    done
  done
fi
if [ -z "$AUTH_TOKEN" ]; then
  echo "✘ 未检测到发布令牌（${TOKEN_VARS[*]}）"
  exit 1
fi
echo ">> 凭证来源: ${TOKEN_SOURCE}（长度 ${#AUTH_TOKEN}，已脱敏）"

# 认证键必须写在 registry 的**完整路径**上：CNB 私有源按路径前缀匹配，
# 只写 //host/:_authToken 时 npm view 可匿名读通，但 npm publish 会报 ENEEDAUTH。
# REGISTRY_URL 以 / 结尾，拼出的键形如 //npm.cnb.cool/tilo-work/repo/-/packages/:_authToken
REGISTRY_PATH_KEY="//${REGISTRY_URL#*://}"
# 临时凭据文件放在包目录之外，避免污染工作区与被误提交
TEMP_NPMRC="$(mktemp "${TMPDIR:-/tmp}/tilo-content-kit-npmrc.XXXXXX")"
cleanup() { rm -f "$TEMP_NPMRC"; }
trap cleanup EXIT INT TERM
cat > "$TEMP_NPMRC" <<EOF
${SCOPE}:registry=${REGISTRY_URL}
registry=${REGISTRY_URL}
${REGISTRY_PATH_KEY}:_authToken=${AUTH_TOKEN}
always-auth=true
EOF

# 幂等预检：npm view 命中当前版本即视为已发布（CI 与本地行为一致）
PRECHECK=$(npm view "${PACKAGE_NAME}@${RESOLVED_VERSION}" version --registry "$REGISTRY_URL" --userconfig "$TEMP_NPMRC" 2>&1 || true)
PRECHECK_TRIMMED=$(printf '%s' "$PRECHECK" | tr -d '[:space:]')
if [ "$PRECHECK_TRIMMED" = "$RESOLVED_VERSION" ]; then
  if [ "$FORCE" != true ]; then
    echo ">> ${PACKAGE_NAME}@${RESOLVED_VERSION} 已存在于制品库，跳过（--force 可强制）"
    exit 0
  fi
  echo ">> 当前版本已存在，但指定了 --force，继续尝试发布"
fi
if echo "$PRECHECK" | grep -qE 'E401|E403|Unauthorized|not authorized'; then
  echo "✘ 凭据未通过制品库认证（401/403）：当前令牌不具备 ${REGISTRY_URL} 的读写权限"
  echo "   请确认 ${TOKEN_VARS[0]} 具备该制品库的发布权限"
  exit 1
fi
if echo "$PRECHECK" | grep -qi 'registry not found'; then
  echo "✘ 制品库未找到 npm registry（404 registry not found）"
  echo "   请确认该制品库已启用 npm 类型，并核对页面给出的 registry 地址"
  exit 1
fi

# 写权限预检：私有源允许匿名 npm view，因此「能读到版本」不等于「能发布」。
# 提前用 whoami 验证身份，避免 build/test/typecheck 全跑完才在 npm publish 处 ENEEDAUTH。
WHOAMI=$(npm whoami --registry "$REGISTRY_URL" --userconfig "$TEMP_NPMRC" 2>&1 || true)
if [ -z "$WHOAMI" ] || echo "$WHOAMI" | grep -qiE 'need auth|ENEEDAUTH|E401|E403|Unauthorized|not authorized'; then
  echo "✘ 凭据未通过制品库写权限校验（npm whoami 失败）"
  echo "   请确认 ${TOKEN_VARS[0]} 对 ${REGISTRY_URL} 具备发布权限，且未被轮换"
  exit 1
fi
echo ">> 制品库身份校验通过（$(printf '%s' "$WHOAMI" | head -n1 | tr -d '\r')）"

PM=pnpm
command -v pnpm >/dev/null 2>&1 || PM=npm
if [ ! -d node_modules ]; then
  if [ -f pnpm-lock.yaml ]; then "$PM" install --frozen-lockfile; else "$PM" install; fi
fi
"$PM" run build
"$PM" run test
"$PM" run typecheck
"$PM" run api:check

set +e
UPLOAD_OUTPUT=$(npm publish --registry "$REGISTRY_URL" --userconfig "$TEMP_NPMRC" --access restricted 2>&1)
UPLOAD_STATUS=$?
set -e
cleanup
trap - EXIT INT TERM

if [ "$UPLOAD_STATUS" -eq 0 ]; then
  echo "✔ 发布成功: ${PACKAGE_NAME}@${RESOLVED_VERSION}"
  exit 0
fi

ESCAPED_TOKEN="${AUTH_TOKEN//\//\\/}"
if echo "$UPLOAD_OUTPUT" | grep -qE '409|Conflict|already exists|cannot overwrite'; then
  echo "✘ 版本 ${RESOLVED_VERSION} 在制品库中已存在；SemVer 只增不覆盖，请递增版本"
else
  echo "$UPLOAD_OUTPUT" | sed "s/${ESCAPED_TOKEN}/*******/g"
fi
exit "$UPLOAD_STATUS"
