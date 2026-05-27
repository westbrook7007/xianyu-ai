"""Windows 控制台 UTF-8 输出修复"""

import io
import sys


def setup_utf8_console():
    """避免 Windows GBK 控制台无法打印特殊字符导致爬虫崩溃"""
    if sys.platform != "win32":
        return
    # Python 3.7+
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            try:
                stream.reconfigure(encoding="utf-8", errors="replace")
                continue
            except Exception:
                pass
        if hasattr(stream, "buffer"):
            try:
                wrapper = io.TextIOWrapper(
                    stream.buffer, encoding="utf-8", errors="replace", line_buffering=True
                )
                if stream is sys.stdout:
                    sys.stdout = wrapper
                else:
                    sys.stderr = wrapper
            except Exception:
                pass


def safe_print(*args, **kwargs):
    """安全打印，仅使用 ASCII 友好输出"""
    try:
        text = " ".join(str(a) for a in args)
        # 替换常见特殊符号，彻底避免 GBK 报错
        for old, new in (("\u2713", "[OK]"), ("\u2717", "[X]"), ("\u2192", "->"), ("\u00a5", "CNY")):
            text = text.replace(old, new)
        print(text, flush=True)
    except Exception:
        pass
