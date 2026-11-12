#!/usr/bin/env bash
# GitHub ↔ CNB 双仓镜像同步执行层。
#
# .github/workflows/sync-to-cnb.yml 与 .cnb.yml 共用本脚本，避免两侧同步规则漂移。
#
# 环境变量：
#   SYNC_TARGET    目标仓完整地址（必填）。CI 用 https://<host>/<org>/<repo>.git；
#                  本地演练可用绝对路径或 file:// 地址（此时不需要凭据）。
#   SYNC_AUTH_USER https 目标仓的 Basic 用户名：CNB 用 cnb，GitHub 用 x-access-token。
#   SYNC_TOKEN     https 目标仓访问令牌（由 CI 密钥注入，禁止写入仓库）。
#   SYNC_BRANCH    要同步的分支名；与 SYNC_TAG 至少填一个。
#   SYNC_TAG       要同步的标签名；与 SYNC_BRANCH 至少填一个。
#
# 前置鉴权：先用一个必然不存在的 ref 探测目标端，凭据被拒时立刻以可诊断的信息退出。
#           否则 401 会被下游 ls_remote 吞成「ref 不存在」，报错只剩 git 的 terminal prompts disabled。
# 防回环：先比对目标端 ref 的 commit SHA，一致就不推送；对端不会因此产生 push 事件，
#         所以「A 推 B → B 回推 A」链路在第二次必然收敛。
# 凭据安全：http(s) 目标通过单次 git 命令的 http.extraheader 传 Basic 认证，
#           token 不进入 URL、.git/config 或 git 的报错文本。
#
# 边界：分支用 --force 对齐镜像（两侧分叉时后写覆盖）；Tag 已存在且指向不同 commit
#       时拒绝覆盖并报错，需人工确认；分支删除不同步。

set -euo pipefail

: "${SYNC_TARGET:?SYNC_TARGET 未设置（目标仓地址）}"
SYNC_BRANCH="${SYNC_BRANCH:-}"
SYNC_TAG="${SYNC_TAG:-}"
if [ -z "$SYNC_BRANCH" ] && [ -z "$SYNC_TAG" ]; then
  echo "ERROR: SYNC_BRANCH / SYNC_TAG 至少设置一个" >&2
  exit 1
fi

AUTH_B64=""
TOKEN_SHAPE=""
case "$SYNC_TARGET" in
  https://*|http://*)
    : "${SYNC_AUTH_USER:?SYNC_AUTH_USER 未设置（https 目标仓必填）}"
    : "${SYNC_TOKEN:?SYNC_TOKEN 未设置（CI 密钥未注入）}"
    # 密钥文件用块标量或多行写法时，令牌末尾常带换行；拼进 Basic 凭据照样「合法」，但目标端只会回 401。
    # 这里裁掉首尾空白并显式告知，避免把配置问题查成令牌过期。
    TRIMMED_TOKEN="$(printf '%s' "$SYNC_TOKEN" | tr -d '\r\n' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    if [ -z "$TRIMMED_TOKEN" ]; then
      echo "ERROR: SYNC_TOKEN 去掉空白后为空" >&2
      exit 1
    fi
    if [ "$TRIMMED_TOKEN" != "$SYNC_TOKEN" ]; then
      echo ">> SYNC_TOKEN 含首尾空白或换行，已自动裁剪（常见于密钥文件多行写法）" >&2
    fi
    SYNC_TOKEN="$TRIMMED_TOKEN"
    AUTH_B64="$(printf '%s:%s' "$SYNC_AUTH_USER" "$SYNC_TOKEN" | base64 | tr -d '\n')"
    case "$SYNC_TOKEN" in
      ghp_*) TOKEN_SHAPE="经典 PAT（ghp_ 前缀）" ;;
      github_pat_*) TOKEN_SHAPE="细粒度 PAT（github_pat_ 前缀）" ;;
      *) TOKEN_SHAPE="非 GitHub PAT 常见前缀，确认密钥是否贴错" ;;
    esac
    ;;
  /*|file://*) ;;
  *)
    echo "ERROR: SYNC_TARGET 必须是 https(s) URL、绝对路径或 file:// 地址" >&2
    exit 1
    ;;
esac

run_git() {
  if [ -n "$AUTH_B64" ]; then
    git -c "http.extraheader=AUTHORIZATION: Basic ${AUTH_B64}" "$@"
  else
    git "$@"
  fi
}

REMOTE="mirror"
trap 'git remote remove "$REMOTE" >/dev/null 2>&1 || true' EXIT
git remote remove "$REMOTE" >/dev/null 2>&1 || true
git remote add "$REMOTE" "$SYNC_TARGET"
export GIT_TERMINAL_PROMPT=0

# 探测目标端：必然不存在的 ref 在「可达且有权限」时返回 0 且无输出，非 0 即鉴权被拒或网络不可达。
probe_remote() {
  local detail
  if ! detail="$(run_git ls-remote "$REMOTE" refs/cnb-mirror-probe/probe 2>&1)"; then
    {
      if [ -n "$AUTH_B64" ]; then
        echo "ERROR: 无法访问 ${SYNC_TARGET}：目标端拒绝鉴权或网络不可达。"
        echo "       排查项：SYNC_TOKEN 是否过期、是否对目标仓有写权限、SYNC_AUTH_USER 是否与令牌类型匹配。"
        echo "       令牌形态：${#SYNC_TOKEN} 字符，${TOKEN_SHAPE}（仅供定位配置问题，不输出令牌内容）"
      else
        echo "ERROR: 无法访问 ${SYNC_TARGET}：目标仓不存在或不可达。"
      fi
      echo "       目标端返回："
      printf '%s\n' "$detail" | sed 's/^/         /'
    } >&2
    exit 1
  fi
}

ls_remote() {
  run_git ls-remote "$REMOTE" "$1" 2>/dev/null || true
}

probe_remote

if [ -n "$SYNC_BRANCH" ]; then
  LOCAL_SHA="$(git rev-parse HEAD)"
  TARGET_REF="refs/heads/${SYNC_BRANCH}"
  REMOTE_SHA="$(ls_remote "$TARGET_REF" | awk -v r="$TARGET_REF" '$2 == r {print $1; exit}')"
  if [ "$REMOTE_SHA" = "$LOCAL_SHA" ]; then
    echo ">> 跳过分支同步：${SYNC_TARGET} ${TARGET_REF} 已是 ${LOCAL_SHA:0:8}（回环保护）"
  else
    echo ">> 同步分支 ${SYNC_BRANCH}: ${REMOTE_SHA:-<不存在>} -> ${LOCAL_SHA:0:8}"
    run_git push "$REMOTE" "HEAD:${TARGET_REF}" --force
  fi
fi

if [ -n "$SYNC_TAG" ]; then
  TARGET_REF="refs/tags/${SYNC_TAG}"
  REMOTE_OUT="$(ls_remote "$TARGET_REF")"
  REMOTE_SHA="$(printf '%s\n' "$REMOTE_OUT" | awk -v peeled="${TARGET_REF}^{}" -v plain="$TARGET_REF" \
    '$2 == peeled {p = $1} $2 == plain {q = $1} END {print (p ? p : q)}')"

  if git rev-parse -q --verify "$TARGET_REF" >/dev/null; then
    LOCAL_SHA="$(git rev-parse "${TARGET_REF}^{}")"
    TAG_SRC="$TARGET_REF"
  else
    LOCAL_SHA="$(git rev-parse HEAD)"
    TAG_SRC="HEAD"
  fi

  if [ -n "$REMOTE_SHA" ]; then
    if [ "$REMOTE_SHA" = "$LOCAL_SHA" ]; then
      echo ">> 跳过 Tag 同步：${SYNC_TARGET} ${TARGET_REF} 已是 ${LOCAL_SHA:0:8}（回环保护）"
    else
      echo "ERROR: ${SYNC_TARGET} 已存在 ${TARGET_REF}，指向 ${REMOTE_SHA:0:8}（本地 ${LOCAL_SHA:0:8}）；Tag 不可覆盖，请人工确认" >&2
      exit 1
    fi
  else
    echo ">> 同步 Tag ${SYNC_TAG}: ${LOCAL_SHA:0:8}"
    run_git push "$REMOTE" "${TAG_SRC}:${TARGET_REF}"
  fi
fi

echo ">> 镜像同步完成"
