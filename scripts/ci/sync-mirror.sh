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
case "$SYNC_TARGET" in
  https://*|http://*)
    : "${SYNC_AUTH_USER:?SYNC_AUTH_USER 未设置（https 目标仓必填）}"
    : "${SYNC_TOKEN:?SYNC_TOKEN 未设置（CI 密钥未注入）}"
    AUTH_B64="$(printf '%s:%s' "$SYNC_AUTH_USER" "$SYNC_TOKEN" | base64 | tr -d '\n')"
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

ls_remote() {
  run_git ls-remote "$REMOTE" "$1" 2>/dev/null || true
}

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
