"""爬虫环境安装 - 使用国内镜像，实时输出进度"""
import os
import subprocess
import sys

PY = sys.executable
# 清华镜像，解决国内 pip 下载卡住
MIRROR = "https://pypi.tuna.tsinghua.edu.cn/simple"
HOST = "pypi.tuna.tsinghua.edu.cn"

PACKAGES = ["flask", "pyyaml", "python-dotenv", "playwright"]


def pip_install(pkg: str) -> bool:
    cmd = [
        PY, "-m", "pip", "install", pkg,
        "-i", MIRROR,
        "--trusted-host", HOST,
        "--timeout", "120",
    ]
    print(f"  正在下载 {pkg} ...", flush=True)
    proc = subprocess.run(cmd, capture_output=False)
    return proc.returncode == 0


def main():
    print("=" * 50)
    print("  闲鱼爬虫环境安装")
    print("  使用清华镜像（解决网络卡住）")
    print("=" * 50)

    total = len(PACKAGES) + 1
    for i, pkg in enumerate(PACKAGES, 1):
        pct = int(i / total * 100)
        filled = pct // 5
        bar = "#" * filled + "-" * (20 - filled)
        print(f"\n[{bar}] {pct}%  步骤 {i}/{total}: 安装 {pkg}", flush=True)
        if not pip_install(pkg):
            print(f"\n[错误] {pkg} 安装失败，请检查网络后重试", flush=True)
            sys.exit(1)
        print(f"  [OK] {pkg}", flush=True)

    print(f"\n[####################] 100%  步骤 {total}/{total}: 安装浏览器驱动", flush=True)
    print("  （约 1-3 分钟，请耐心等待）", flush=True)
    r = subprocess.run([PY, "-m", "playwright", "install", "chrome"])
    if r.returncode != 0:
        print("[错误] 浏览器驱动安装失败", flush=True)
        sys.exit(1)

    print("\n" + "=" * 50)
    print("  全部完成！可以启动爬虫了")
    print("=" * 50)


if __name__ == "__main__":
    main()
