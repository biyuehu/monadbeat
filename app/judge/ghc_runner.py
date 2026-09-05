"""子进程调用 GHC 的封装。骨架阶段先占位,具体实现(临时文件、超时、
解析 stderr)留到接入判题逻辑时再写。"""

from app.config import settings


def ghc_typecheck(source: str) -> bool:
  """对一段 Haskell 源码做 -fno-code 类型检查。

  返回 (是否通过, 原始输出/报错信息)。
  TODO: 写临时 .hs 文件, subprocess 调用
  f"{settings.ghc_binary} -fno-code -fforce-recomp <tmpfile>",
  加超时 settings.ghc_timeout_sec。
  """
  raise NotImplementedError
